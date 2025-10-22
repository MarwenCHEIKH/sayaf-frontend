import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MapService } from '../../services/map-service/map.service';
import { MarkerData, MapMoveEvent } from '../../models/map.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #mapContainer class="map-container"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .map-container {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        overflow: hidden;
      }
    `,
  ],
})
export class MapComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  @Input() markers: MarkerData[] = [];
  @Input() selectedMarkerId?: number;
  @Input() interactive = true;
  @Input() center?: { lat: number; lng: number };
  @Input() zoom = 13;
  @Input() enableClustering = true;

  @Output() mapMoved = new EventEmitter<MapMoveEvent>();
  @Output() markerClicked = new EventEmitter<number>();

  private mapService = inject(MapService);
  private platformId = inject(PLATFORM_ID);

  private map?: any;
  private markersLayer?: any;
  private markerInstances = new Map<number, any>();
  private mapMoveSubject = new Subject<void>();

  // Flags to prevent feedback loops
  private isInitialLoad = true;
  private isProgrammaticMove = false;
  private shouldIgnoreNextMove = false;

  // Track last center to avoid unnecessary moves
  private lastSetCenter?: { lat: number; lng: number };

  ngOnInit(): void {
    // Only emit events for user-initiated moves
    this.mapMoveSubject.pipe(debounceTime(300)).subscribe(() => {
      if (!this.isProgrammaticMove && !this.isInitialLoad) {
        this.emitMapMoveEvent();
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const L = await import('leaflet');
      await import('leaflet.markercluster');

      this.initMap();

      setTimeout(() => {
        this.map?.invalidateSize();
        this.isInitialLoad = false;
      }, 100);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['markers'] && !changes['markers'].firstChange) {
      this.updateMarkers();
    }

    if (
      changes['selectedMarkerId'] &&
      !changes['selectedMarkerId'].firstChange
    ) {
      this.updateSelectedMarker();
    }

    // Only update map view if center actually changed significantly
    if (
      changes['center'] &&
      !changes['center'].firstChange &&
      this.map &&
      changes['center'].currentValue
    ) {
      const newCenter = changes['center'].currentValue;

      // Check if center changed significantly (> 0.001 degrees ~= 100m)
      if (this.hasCenterChangedSignificantly(newCenter)) {
        this.shouldIgnoreNextMove = true;
        this.isProgrammaticMove = true;

        this.map.setView([newCenter.lat, newCenter.lng], this.zoom, {
          animate: false,
        });

        this.lastSetCenter = { ...newCenter };

        // Reset flag after map settles
        setTimeout(() => {
          this.isProgrammaticMove = false;
          this.shouldIgnoreNextMove = false;
        }, 100);
      }
    }
  }

  ngOnDestroy(): void {
    this.mapMoveSubject.complete();
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const L = (window as any).L;
    if (!L) return;

    const initialCenter = this.center || { lat: 36.8065, lng: 10.1815 };
    this.lastSetCenter = { ...initialCenter };

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: this.zoom,
      zoomControl: true,
      dragging: this.interactive,
      touchZoom: this.interactive,
      scrollWheelZoom: this.interactive,
      doubleClickZoom: this.interactive,
      boxZoom: this.interactive,
      keyboard: this.interactive,
      tapHold: this.interactive,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(this.map);

    if (this.interactive) {
      this.map.on('moveend', () => this.handleMapMoveEnd());
      this.map.on('zoomend', () => this.handleMapMoveEnd());
    }

    this.initMarkersLayer();
    this.updateMarkers();
  }

  private handleMapMoveEnd(): void {
    // Ignore if this is initial load or programmatic move
    if (this.isInitialLoad || this.shouldIgnoreNextMove) {
      return;
    }

    // Only trigger subject for user-initiated moves
    if (!this.isProgrammaticMove) {
      this.mapMoveSubject.next();
    }
  }

  private hasCenterChangedSignificantly(newCenter: {
    lat: number;
    lng: number;
  }): boolean {
    if (!this.lastSetCenter) return true;

    const latDiff = Math.abs(this.lastSetCenter.lat - newCenter.lat);
    const lngDiff = Math.abs(this.lastSetCenter.lng - newCenter.lng);

    // Threshold: 0.001 degrees (~100 meters)
    return latDiff > 0.001 || lngDiff > 0.001;
  }

  private initMarkersLayer(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const L = (window as any).L;
    if (!L || !this.map) return;

    if (this.markersLayer) {
      this.map.removeLayer(this.markersLayer);
    }

    if (this.enableClustering && this.interactive) {
      this.markersLayer = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 18,
        iconCreateFunction: (cluster: any) => {
          // Recursively count all actual markers (not sub-clusters)
          const count = this.countAllMarkersRecursive(cluster);

          console.log('Cluster created:', {
            count,
            childCount: cluster.getChildCount(),
            getAllChildMarkers: cluster.getAllChildMarkers()?.length,
            zoom: this.map?.getZoom(),
          });

          // Dynamic sizing based on count
          let size = 40;
          let fontSize = '14px';
          if (count >= 100) {
            size = 50;
            fontSize = '16px';
          } else if (count >= 50) {
            size = 45;
            fontSize = '15px';
          }

          return L.divIcon({
            html: `<div style="
              background: #2196F3;
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: ${fontSize};
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">${count}</div>`,
            className: 'marker-cluster-custom',
            iconSize: [size, size],
          });
        },
      });
    } else {
      this.markersLayer = L.layerGroup();
    }

    this.markersLayer.addTo(this.map);
  }

  /**
   * Recursively count all markers within a cluster, drilling through nested clusters
   */
  private countAllMarkersRecursive(cluster: any): number {
    let count = 0;
    const children = cluster.getAllChildMarkers
      ? cluster.getAllChildMarkers()
      : [];

    // If getAllChildMarkers works, use it
    if (children.length > 0) {
      return children.length;
    }

    // Otherwise, manually traverse the cluster tree
    const childClusters = cluster.getChildClusters
      ? cluster.getChildClusters()
      : [];

    if (childClusters.length === 0) {
      // This is a leaf cluster with only markers
      return cluster.getChildCount();
    }

    // Recursively count markers in child clusters
    childClusters.forEach((childCluster: any) => {
      count += this.countAllMarkersRecursive(childCluster);
    });

    return count;
  }

  private updateMarkers(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const L = (window as any).L;
    if (!L || !this.map || !this.markersLayer) return;

    console.log('📍 Updating markers, total count:', this.markers.length);

    // Clear existing markers
    this.markersLayer.clearLayers();
    this.markerInstances.clear();

    // Batch add all markers
    const markersToAdd: any[] = [];

    this.markers.forEach((markerData) => {
      const isSelected = markerData.id === this.selectedMarkerId;
      const icon = this.mapService.createMarkerIcon(
        L,
        markerData.type,
        isSelected
      );
      if (!icon) return;

      const marker = L.marker([markerData.lat, markerData.lng], { icon });
      marker.bindPopup(this.mapService.createPopupContent(markerData), {
        maxWidth: 250,
        className: 'custom-popup',
      });

      if (this.interactive) {
        marker.on('click', () => this.markerClicked.emit(markerData.id));
      }

      this.markerInstances.set(markerData.id, marker);
      markersToAdd.push(marker);
    });

    console.log('📍 Adding markers to layer:', markersToAdd.length);

    // Add all markers at once for better clustering
    if (this.enableClustering && this.interactive) {
      this.markersLayer.addLayers(markersToAdd);
    } else {
      markersToAdd.forEach((marker) => this.markersLayer.addLayer(marker));
    }

    // Open popup for selected marker
    if (
      this.selectedMarkerId &&
      this.markerInstances.has(this.selectedMarkerId)
    ) {
      const selectedMarker = this.markerInstances.get(this.selectedMarkerId)!;
      selectedMarker.openPopup();
    }
  }

  private updateSelectedMarker(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const L = (window as any).L;
    if (!L || !this.map) return;

    this.markerInstances.forEach((marker, id) => {
      const markerData = this.markers.find((m) => m.id === id);
      if (!markerData) return;

      const isSelected = id === this.selectedMarkerId;
      const icon = this.mapService.createMarkerIcon(
        L,
        markerData.type,
        isSelected
      );
      if (!icon) return;

      marker.setIcon(icon);

      if (isSelected) {
        marker.openPopup();
        // Don't pan to marker here - let container handle flyTo
      } else {
        marker.closePopup();
      }
    });
  }

  private emitMapMoveEvent(): void {
    if (!this.map || !this.interactive || this.isProgrammaticMove) return;

    const center = this.map.getCenter();
    const bounds = this.mapService.calculateBounds(this.map);

    this.mapMoved.emit({
      bounds,
      center: { lat: center.lat, lng: center.lng },
      zoom: this.map.getZoom(),
    });
  }

  /**
   * Fly to a location - marks as programmatic move to prevent feedback loop
   */
  flyTo(lat: number, lng: number, zoom: number = 16): void {
    if (!this.map) return;

    this.isProgrammaticMove = true;
    this.shouldIgnoreNextMove = true;

    this.map.flyTo([lat, lng], zoom, {
      duration: 1.5,
    });

    this.lastSetCenter = { lat, lng };

    // Wait for animation to complete
    setTimeout(() => {
      this.openPopupAtLocation(lat, lng);

      // Reset flags after animation and popup open
      setTimeout(() => {
        this.isProgrammaticMove = false;
        this.shouldIgnoreNextMove = false;
      }, 200);
    }, 1600);
  }

  getBounds(): {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null {
    if (!this.map) return null;

    const bounds = this.map.getBounds();
    if (!bounds) return null;

    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }

  private openPopupAtLocation(lat: number, lng: number): void {
    if (!this.map) return;

    const markerData = this.markers.find((m) => {
      if (!m) return false;
      return Math.abs(m.lat - lat) < 0.0001 && Math.abs(m.lng - lng) < 0.0001;
    });

    if (markerData && this.markerInstances.has(markerData.id)) {
      const markerInstance = this.markerInstances.get(markerData.id);
      if (markerInstance) {
        if (
          this.enableClustering &&
          this.markersLayer &&
          typeof this.markersLayer.zoomToShowLayer === 'function'
        ) {
          this.markersLayer.zoomToShowLayer(markerInstance, () => {
            markerInstance.openPopup();
          });
        } else {
          markerInstance.openPopup();
        }
      }
    }
  }
}

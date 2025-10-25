// src/app/features/map/map.component.ts
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
import { ClusterMarker } from '../../services/listing-service/listing.service';

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

      /* Modern marker hover effects */
      :host ::ng-deep .modern-marker:hover > div > div:first-child,
      :host ::ng-deep .modern-cluster:hover > div {
        transform: scale(1.1);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.4);
      }

      /* Custom popup styling */
      :host ::ng-deep .leaflet-popup-content-wrapper {
        border-radius: 12px;
        padding: 0;
        overflow: hidden;
      }

      :host ::ng-deep .leaflet-popup-content {
        margin: 0;
      }

      :host ::ng-deep .leaflet-popup-tip {
        border-radius: 2px;
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
  @Input() clusters: ClusterMarker[] = [];
  @Input() selectedMarkerId?: number;
  @Input() interactive = true;
  @Input() center?: { lat: number; lng: number };
  @Input() zoom = 13;
  @Input() enableClustering = true;

  @Output() mapMoved = new EventEmitter<MapMoveEvent>();
  @Output() markerClicked = new EventEmitter<number>();
  @Output() clusterClicked = new EventEmitter<ClusterMarker>();

  private mapService = inject(MapService);
  private platformId = inject(PLATFORM_ID);

  private map?: any;
  private markersLayer?: any;
  private markerInstances = new Map<number, any>();
  private mapMoveSubject = new Subject<void>();

  private isInitialLoad = true;
  private isProgrammaticMove = false;
  private shouldIgnoreNextMove = false;
  private lastSetCenter?: { lat: number; lng: number };

  ngOnInit(): void {
    this.mapMoveSubject.pipe(debounceTime(500)).subscribe(() => {
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

    if (changes['clusters'] && !changes['clusters'].firstChange) {
      this.updateMarkers();
    }

    if (
      changes['selectedMarkerId'] &&
      !changes['selectedMarkerId'].firstChange
    ) {
      this.updateSelectedMarker();
    }

    if (
      changes['center'] &&
      !changes['center'].firstChange &&
      this.map &&
      changes['center'].currentValue
    ) {
      const newCenter = changes['center'].currentValue;

      if (this.hasCenterChangedSignificantly(newCenter)) {
        this.shouldIgnoreNextMove = true;
        this.isProgrammaticMove = true;

        this.map.setView([newCenter.lat, newCenter.lng], this.zoom, {
          animate: false,
        });

        this.lastSetCenter = { ...newCenter };

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
    if (!isPlatformBrowser(this.platformId)) return;
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

    // Modern, clean map tiles
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(this.map);

    if (this.interactive) {
      this.map.on('moveend', () => this.handleMapMoveEnd());
      this.map.on('zoomend', () => this.handleZoomEnd());
    }

    this.initMarkersLayer();
    this.updateMarkers();
  }

  private handleMapMoveEnd(): void {
    if (this.isInitialLoad) return;

    if (this.shouldIgnoreNextMove) {
      this.shouldIgnoreNextMove = false;
      return;
    }

    if (!this.isProgrammaticMove) {
      this.mapMoveSubject.next();
    }
  }

  private handleZoomEnd(): void {
    if (this.isInitialLoad) return;

    console.log('🔍 Zoom changed to:', this.map.getZoom());

    if (this.shouldIgnoreNextMove) {
      this.shouldIgnoreNextMove = false;
    }

    if (!this.isProgrammaticMove) {
      this.mapMoveSubject.next();
    } else {
      setTimeout(() => {
        if (!this.isProgrammaticMove) {
          this.emitMapMoveEvent();
        }
      }, 100);
    }
  }

  private hasCenterChangedSignificantly(newCenter: {
    lat: number;
    lng: number;
  }): boolean {
    if (!this.lastSetCenter) return true;

    const latDiff = Math.abs(this.lastSetCenter.lat - newCenter.lat);
    const lngDiff = Math.abs(this.lastSetCenter.lng - newCenter.lng);

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
        // Use our custom cluster icon
        iconCreateFunction: (cluster: any) => {
          const count =
            cluster.getAllChildMarkers()?.length || cluster.getChildCount();
          return this.mapService.createClusterIcon(L, count, false);
        },
      });
    } else {
      this.markersLayer = L.layerGroup();
    }

    this.markersLayer.addTo(this.map);
  }

  private updateMarkers(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const L = (window as any).L;
    if (!L || !this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.markerInstances.clear();

    // Render backend clusters if present (STATE/COUNTRY tier)
    if (this.clusters && this.clusters.length > 0) {
      this.renderBackendClusters();
    } else {
      // Render individual markers (CITY tier or zoomed in)
      this.renderIndividualMarkers();
    }
  }

  private renderBackendClusters(): void {
    const L = (window as any).L;
    if (!L) return;

    console.log(
      '🎨 Rendering',
      this.clusters.length,
      'backend clusters with modern icons'
    );

    this.clusters.forEach((cluster) => {
      const icon = this.mapService.createClusterIcon(L, cluster.count, true);

      const marker = L.marker([cluster.lat, cluster.lng], { icon });

      // Show count in popup on hover
      const popupContent = this.mapService.createClusterPopupContent(
        cluster.count,
        cluster.name
      );

      marker.bindPopup(popupContent, {
        maxWidth: 200,
        className: 'cluster-popup',
      });

      if (this.interactive) {
        marker.on('click', () => {
          this.clusterClicked.emit(cluster);
        });
      }

      this.markersLayer.addLayer(marker);
      this.markerInstances.set(cluster.id, marker);
    });
  }

  private renderIndividualMarkers(): void {
    const L = (window as any).L;
    if (!L) return;

    console.log(
      '🎨 Rendering',
      this.markers.length,
      'individual markers with modern icons'
    );

    const markersToAdd: any[] = [];

    this.markers.forEach((markerData) => {
      const isSelected = markerData.id === this.selectedMarkerId;

      // ✅ Extract a single string from markerData.type (since it's string[])
      const markerType =
        Array.isArray(markerData.type) && markerData.type.length > 0
          ? markerData.type[0]
          : 'default'; // fallback if array empty or missing

      const icon = this.mapService.createMarkerIcon(L, markerType, isSelected);

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

    if (this.enableClustering && this.interactive) {
      this.markersLayer.addLayers(markersToAdd);
    } else {
      markersToAdd.forEach((marker) => this.markersLayer.addLayer(marker));
    }

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

      // ✅ Safely extract a single string from the array
      const markerType =
        Array.isArray(markerData.type) && markerData.type.length > 0
          ? markerData.type[0]
          : 'default'; // fallback if array empty

      const icon = this.mapService.createMarkerIcon(L, markerType, isSelected);

      marker.setIcon(icon);
      isSelected ? marker.openPopup() : marker.closePopup();
    });
  }

  private emitMapMoveEvent(): void {
    if (!this.map || !this.interactive || this.isProgrammaticMove) return;

    const center = this.map.getCenter();
    const bounds = this.mapService.calculateBounds(this.map);
    const zoom = this.map.getZoom();

    console.log('📤 Emitting map move event:', {
      zoom,
      bounds,
      center: { lat: center.lat, lng: center.lng },
    });

    this.mapMoved.emit({
      bounds,
      center: { lat: center.lat, lng: center.lng },
      zoom,
    });
  }

  flyTo(lat: number, lng: number, zoom: number = 16): void {
    if (!this.map) return;

    this.isProgrammaticMove = true;
    this.shouldIgnoreNextMove = true;

    this.map.flyTo([lat, lng], zoom, {
      duration: 1.5,
    });

    this.lastSetCenter = { lat, lng };

    setTimeout(() => {
      this.openPopupAtLocation(lat, lng);

      setTimeout(() => {
        this.isProgrammaticMove = false;
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

    const result = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };

    console.log('📦 Current map bounds:', result);

    return result;
  }

  getCurrentZoom(): number {
    return this.map?.getZoom() || this.zoom;
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

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
  NgZone, // ✅ REFACTOR: Import NgZone
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators'; // ✅ REFACTOR: Import takeUntil
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
  private ngZone = inject(NgZone); // ✅ REFACTOR: Inject NgZone

  private map?: any;
  private individualMarkersLayer?: any;
  private backendClustersLayer?: any;

  private markerInstances = new Map<number, any>();
  private mapMoveSubject = new Subject<void>();
  private destroy$ = new Subject<void>(); // ✅ REFACTOR: For automatic unsubscription
  private resizeObserver?: ResizeObserver;
  private isInitialLoad = true;
  private isProgrammaticMove = false;
  private shouldIgnoreNextMove = false;
  private lastSetCenter?: { lat: number; lng: number };

  ngOnInit(): void {
    this.mapMoveSubject
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$) // ✅ REFACTOR: Auto-unsubscribe
      )
      .subscribe(() => {
        if (!this.isProgrammaticMove && !this.isInitialLoad) {
          this.emitMapMoveEvent();
        }
      });
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // ✅ REFACTOR: Run all heavy map init outside Angular's zone
      this.ngZone.runOutsideAngular(async () => {
        const L = await import('leaflet');
        await import('leaflet.markercluster');

        this.initMap(); // This will now run outside the zone

        setTimeout(() => {
          this.map?.invalidateSize();
          this.isInitialLoad = false;
        }, 100);

        const mapContainerEl = this.mapContainer.nativeElement;
        if (mapContainerEl && this.map) {
          this.resizeObserver = new ResizeObserver(() => {
            this.map?.invalidateSize({ animate: false });
          });
          this.resizeObserver.observe(mapContainerEl);
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return; // ✅ REFACTOR: Guard against calls before map is ready

    // ✅ REFACTOR: Run all map updates outside the zone
    this.ngZone.runOutsideAngular(() => {
      if (
        (changes['markers'] && !changes['markers'].firstChange) ||
        (changes['clusters'] && !changes['clusters'].firstChange)
      ) {
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
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(); // ✅ REFACTOR: Trigger unsubscription
    this.destroy$.complete(); // ✅ REFACTOR: Complete the subject

    this.resizeObserver?.disconnect();

    // ✅ REFACTOR: Full map cleanup
    if (this.map) {
      this.ngZone.runOutsideAngular(() => {
        try {
          // Explicitly remove listeners
          this.map.off('moveend');
          this.map.off('zoomend');
          // Remove layers
          if (this.individualMarkersLayer) {
            this.map.removeLayer(this.individualMarkersLayer);
          }
          if (this.backendClustersLayer) {
            this.map.removeLayer(this.backendClustersLayer);
          }
          // Finally, remove the map
          this.map.remove();
        } catch (e) {
          // Suppress errors during destruction
        }
        this.map = undefined;
      });
    }
  }

  private initMap(): void {
    // This method is called from within runOutsideAngular
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

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(this.map);

    if (this.interactive) {
      // These listeners are now set outside Angular's zone
      this.map.on('moveend', () => this.handleMapMoveEnd());
      this.map.on('zoomend', () => this.handleZoomEnd());
    }

    this.initLayers(); // This will also run outside the zone
    this.updateMarkers(); // This will also run outside the zone
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

  private initLayers(): void {
    // This method is called from within runOutsideAngular
    if (!isPlatformBrowser(this.platformId)) return;
    const L = (window as any).L;
    if (!L || !this.map) return;

    // ✅ REFACTOR: Add error handling for layer removal
    try {
      if (this.backendClustersLayer) {
        this.map.removeLayer(this.backendClustersLayer);
      }
    } catch (e) {
      /* Suppress error */
    }
    this.backendClustersLayer = L.layerGroup();
    this.backendClustersLayer.addTo(this.map);

    try {
      if (this.individualMarkersLayer) {
        this.map.removeLayer(this.individualMarkersLayer);
      }
    } catch (e) {
      /* Suppress error */
    }

    if (this.enableClustering && this.interactive) {
      this.individualMarkersLayer = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
        disableClusteringAtZoom: 18,
        animate: true,
        animateAddingMarkers: true,
        spiderfyDistanceMultiplier: 1.5,
        iconCreateFunction: (cluster: any) => {
          const count =
            cluster.getAllChildMarkers()?.length || cluster.getChildCount();
          return this.mapService.createClusterIcon(L, count);
        },
      });

      this.individualMarkersLayer.on('clusterclick', (e: any) => {
        if (!this.interactive) return;
        L.DomEvent.stopPropagation(e);

        const cluster = e.layer;
        const latLng = cluster.getLatLng();

        const syntheticCluster: ClusterMarker = {
          id: cluster._leaflet_id,
          lat: latLng.lat,
          lng: latLng.lng,
          count: cluster.getChildCount(),
          name: 'Cluster',
          type: '',
        };
        // ✅ REFACTOR: Emit will re-enter the zone if needed (e.g., via async pipe)
        this.clusterClicked.emit(syntheticCluster);
      });
    } else {
      this.individualMarkersLayer = L.layerGroup();
    }

    this.individualMarkersLayer.addTo(this.map);
  }

  private updateMarkers(): void {
    // This method is called from within runOutsideAngular
    if (
      !isPlatformBrowser(this.platformId) ||
      !this.map ||
      !this.individualMarkersLayer ||
      !this.backendClustersLayer
    )
      return;

    const L = (window as any).L;
    if (!L) return;

    // ✅ REFACTOR: Add error handling
    try {
      this.individualMarkersLayer.clearLayers();
      this.backendClustersLayer.clearLayers();
    } catch (e) {
      /* Suppress error */
    }
    this.markerInstances.clear();

    if (this.clusters && this.clusters.length > 0) {
      this.renderBackendClusters();
    } else {
      this.renderIndividualMarkers();
    }
  }

  private renderBackendClusters(): void {
    // This method is called from within runOutsideAngular
    const L = (window as any).L;
    if (!L || !this.backendClustersLayer) return;

    this.clusters.forEach((cluster) => {
      const icon = this.mapService.createClusterIcon(L, cluster.count);
      const marker = L.marker([cluster.lat, cluster.lng], { icon });

      if (this.interactive) {
        marker.on('click', () => {
          this.ngZone.run(() => {
            this.clusterClicked.emit(cluster);
          });
        });
      }

      this.backendClustersLayer.addLayer(marker);
    });
  }

  private renderIndividualMarkers(): void {
    // This method is called from within runOutsideAngular
    const L = (window as any).L;
    if (!L || !this.individualMarkersLayer) return;

    const markersToAdd: any[] = [];

    this.markers.forEach((markerData) => {
      const isSelected = markerData.id === this.selectedMarkerId;
      const markerType =
        Array.isArray(markerData.type) && markerData.type.length > 0
          ? markerData.type[0]
          : 'default';
      const icon = this.mapService.createMarkerIcon(L, markerType, isSelected);
      const marker = L.marker([markerData.lat, markerData.lng], { icon });

      marker.bindPopup(this.mapService.createPopupContent(markerData), {
        maxWidth: 250,
        className: 'custom-popup',
      });

      if (this.interactive) {
        marker.on('click', () => {
          this.ngZone.run(() => {
            this.markerClicked.emit(markerData.id);
          });
        });
      }

      this.markerInstances.set(markerData.id, marker);
      markersToAdd.push(marker);
    });

    try {
      if (this.enableClustering && this.interactive) {
        this.individualMarkersLayer.addLayers(markersToAdd);
      } else {
        markersToAdd.forEach((marker) =>
          this.individualMarkersLayer.addLayer(marker)
        );
      }
    } catch (e) {
      /* Suppress error */
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
    // This method is called from within runOutsideAngular
    if (!isPlatformBrowser(this.platformId) || !this.map) return;
    const L = (window as any).L;
    if (!L) return;

    this.markerInstances.forEach((marker, id) => {
      const markerData = this.markers.find((m) => m.id === id);
      if (!markerData) return;

      const isSelected = id === this.selectedMarkerId;
      const markerType =
        Array.isArray(markerData.type) && markerData.type.length > 0
          ? markerData.type[0]
          : 'default';
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

    this.mapMoved.emit({
      bounds,
      center: { lat: center.lat, lng: center.lng },
      zoom,
    });
  }

  public forceResize(): void {
    if (!this.map) return;

    // ✅ REFACTOR: Run outside zone
    this.ngZone.runOutsideAngular(() => {
      this.map.invalidateSize({ animate: false });
      setTimeout(() => {
        this.map?.invalidateSize({ animate: false });
      }, 100);
    });
  }

  flyToMarker(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;

    const disableClusterZoom = 18;
    let targetZoom = zoom !== undefined ? zoom : disableClusterZoom;

    if (this.enableClustering && targetZoom < disableClusterZoom) {
      targetZoom = disableClusterZoom;
    }

    this.isProgrammaticMove = true;
    this.shouldIgnoreNextMove = true;

    // ✅ REFACTOR: Run animation logic outside zone
    this.ngZone.runOutsideAngular(() => {
      this.map.invalidateSize({ animate: false });

      const performFly = () => {
        if (!this.map) return;
        const size = this.map.getSize();

        if (size.x === 0 || size.y === 0) {
          this.map.setView([lat, lng], targetZoom);
          this.lastSetCenter = { lat, lng };

          setTimeout(() => {
            this.openPopupAtLocation(lat, lng);
            this.isProgrammaticMove = false;
          }, 100);
          return;
        }

        this.map.closePopup();

        const currentCenter = this.map.getCenter();
        const currentZoom = this.map.getZoom();
        const distance = this.map.distance(currentCenter, [lat, lng]);

        if (distance < 100 && currentZoom === targetZoom) {
          this.openPopupAtLocation(lat, lng);
          this.isProgrammaticMove = false;
          return;
        }

        let flyCompleted = false;
        const onFlyComplete = () => {
          if (flyCompleted) return;
          flyCompleted = true;
          this.map?.off('flyend', onFlyComplete);
          this.map?.off('moveend', onFlyComplete);
          this.openPopupAtLocation(lat, lng);
          setTimeout(() => {
            this.isProgrammaticMove = false;
          }, 100);
        };

        this.map.once('flyend', onFlyComplete);
        this.map.once('moveend', onFlyComplete);

        try {
          this.map.flyTo([lat, lng], targetZoom, {
            duration: 1.0,
          });
          this.lastSetCenter = { lat, lng };
        } catch (error) {
          onFlyComplete(); // Fallback on error
        }
      };

      requestAnimationFrame(() => {
        if (!this.map) return;
        performFly();
      });
    });
  }

  flyToCluster(lat: number, lng: number, zoom: number): void {
    if (!this.map) return;

    this.isProgrammaticMove = true;
    this.shouldIgnoreNextMove = true;

    // ✅ REFACTOR: Run animation logic outside zone
    this.ngZone.runOutsideAngular(() => {
      const performFly = () => {
        if (!this.map) return;

        let flyCompleted = false;
        const onFlyComplete = () => {
          if (flyCompleted) return;
          flyCompleted = true;
          this.map?.off('flyend', onFlyComplete);
          this.map?.off('moveend', onFlyComplete);
          setTimeout(() => {
            this.isProgrammaticMove = false;
          }, 50);
        };

        this.map.once('flyend', onFlyComplete);
        this.map.once('moveend', onFlyComplete);

        try {
          this.map.flyTo([lat, lng], zoom, { duration: 1.0 });
          this.lastSetCenter = { lat, lng };
        } catch (error) {
          onFlyComplete(); // Fallback on error
        }
      };
      requestAnimationFrame(() => performFly());
    });
  }

  private openPopupAtLocation(lat: number, lng: number): void {
    if (!this.map) return;

    // ✅ REFACTOR: Run popup logic outside zone
    this.ngZone.runOutsideAngular(() => {
      const markerData = this.markers.find((m) => {
        if (!m) return false;
        const latMatch = Math.abs(m.lat - lat) < 0.0001;
        const lngMatch = Math.abs(m.lng - lng) < 0.0001;
        return latMatch && lngMatch;
      });

      if (!markerData || !this.markerInstances.has(markerData.id)) {
        return;
      }

      const markerInstance = this.markerInstances.get(markerData.id);
      if (!markerInstance) return;

      if (
        this.enableClustering &&
        this.individualMarkersLayer &&
        typeof this.individualMarkersLayer.zoomToShowLayer === 'function'
      ) {
        try {
          const visibleLayer =
            this.individualMarkersLayer.getVisibleParent(markerInstance);

          if (visibleLayer === markerInstance) {
            markerInstance.openPopup();
          } else {
            this.individualMarkersLayer.zoomToShowLayer(markerInstance, () => {
              requestAnimationFrame(() => {
                if (
                  markerInstance &&
                  typeof markerInstance.openPopup === 'function'
                ) {
                  markerInstance.openPopup();
                  if (this.map && markerInstance.getPopup()) {
                    const popupLatLng = markerInstance.getLatLng();
                    this.map.panTo(popupLatLng, {
                      animate: true,
                      duration: 0.2,
                    });
                  }
                }
              });
            });
          }
        } catch (error) {
          // Fallback on cluster error
          setTimeout(() => {
            if (
              markerInstance &&
              typeof markerInstance.openPopup === 'function'
            ) {
              markerInstance.openPopup();
            }
          }, 500);
        }
      } else {
        if (markerInstance && typeof markerInstance.openPopup === 'function') {
          markerInstance.openPopup();
        }
      }
    });
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

  getCurrentZoom(): number {
    return this.map?.getZoom() || this.zoom;
  }
}

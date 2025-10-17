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
  private isInitialLoad = true;

  ngOnInit(): void {
    this.mapMoveSubject
      .pipe(debounceTime(300))
      .subscribe(() => this.emitMapMoveEvent());
  }

  async ngAfterViewInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Load Leaflet dynamically in the browser
      const L = await import('leaflet');
      await import('leaflet.markercluster'); // registers globally on window.L

      // Use global Leaflet instance with plugin attached
      this.initMap();

      setTimeout(() => {
        this.map.invalidateSize(); // forces Leaflet to recalc container size
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
    if (
      changes['center'] &&
      !changes['center'].firstChange &&
      this.map &&
      changes['center'].currentValue
    ) {
      this.map.setView(
        [
          changes['center'].currentValue.lat,
          changes['center'].currentValue.lng,
        ],
        this.zoom
      );
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    if (this.interactive) {
      this.map.on(
        'moveend',
        () => !this.isInitialLoad && this.mapMoveSubject.next()
      );
      this.map.on(
        'zoomend',
        () => !this.isInitialLoad && this.mapMoveSubject.next()
      );
    }

    this.initMarkersLayer();
    this.updateMarkers();

    setTimeout(() => (this.isInitialLoad = false), 1000);
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
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="
              background: #2196F3;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">${count}</div>`,
            className: 'marker-cluster-custom',
            iconSize: [40, 40],
          });
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
      this.markersLayer.addLayer(marker);
    });

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
        this.map.panTo(marker.getLatLng());
      } else {
        marker.closePopup();
      }
    });
  }

  private emitMapMoveEvent(): void {
    if (!this.map || !this.interactive) return;

    const center = this.map.getCenter();
    const bounds = this.mapService.calculateBounds(this.map);

    this.mapMoved.emit({
      bounds,
      center: { lat: center.lat, lng: center.lng },
      zoom: this.map.getZoom(),
    });
  }
}

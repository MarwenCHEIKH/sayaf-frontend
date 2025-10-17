import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { ListingsActions } from '../../store/listings/listings.actions';
import {
  selectListings,
  selectListingsLoading,
  selectSelectedListingId,
  selectHasMoreListings,
} from '../../store/listings/listings.selectors';
import { selectCurrentLocation } from '../../store/location/location.selectors';
import { MarkerData, MapMoveEvent } from '../../models/map.model';
import { ListingWithPhotos } from '../../models/listing.model';
import { MapComponent } from '../../features/map/map.component';
import { ListingsComponent } from '../../features/listings/listings.component';
import { LocationPickerComponent } from '../../shared/location-picker/location-picker.component';
import { MapService } from '../../services/map-service/map.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-listings-map-container',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    ListingsComponent,
    LocationPickerComponent,
    RouterModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './listings-map.component.html',
  styleUrls: ['./listings-map.component.scss'],
})
export class ListingsMapContainerComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private mapService = inject(MapService);
  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID);

  listings = signal<ListingWithPhotos[]>([]);
  markers = signal<MarkerData[]>([]);
  loading = signal(false);
  selectedId = signal<number | undefined>(undefined);
  hasMore = signal(true);
  mapCenter = signal({ lat: 36.8065, lng: 10.1815 });
  isMobile = signal(false);

  panelExpanded = signal(false);
  previewListings = signal<ListingWithPhotos[]>([]);

  private touchStartY = 0;
  private touchCurrentY = 0;
  private resizeListener?: () => void;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize on browser only
      this.isMobile.set(window.innerWidth <= 768);

      // Keep a reference so we can remove it later
      this.resizeListener = () => {
        this.isMobile.set(window.innerWidth <= 768);
      };
      window.addEventListener('resize', this.resizeListener);
    }

    // Subscribe to location changes
    this.store
      .select(selectCurrentLocation)
      .pipe(takeUntil(this.destroy$))
      .subscribe((location) => {
        if (!location) return;
        this.mapCenter.set({ lat: location!.lat, lng: location!.lng });
        this.store.dispatch(
          ListingsActions.loadListings({
            filters: { location: { lat: location!.lat, lng: location!.lng } },
            reset: true,
          })
        );
      });

    // Subscribe to listings state
    combineLatest([
      this.store.select(selectListings),
      this.store.select(selectListingsLoading),
      this.store.select(selectSelectedListingId),
      this.store.select(selectHasMoreListings),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([listings, loading, selectedId, hasMore]) => {
        this.listings.set(listings);
        this.loading.set(loading);
        this.selectedId.set(selectedId);
        this.hasMore.set(hasMore);
        this.updateMarkers(listings);
        this.updatePreviewListings(listings);
      });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateMarkers(listings: ListingWithPhotos[]): void {
    const markers: MarkerData[] = listings
      .reduce<MarkerData[]>((acc, listing) => {
        const coords = this.mapService.parsePostGISPoint(
          listing.location_point
        );
        if (!coords) return acc; // skip this listing

        acc.push({
          id: listing.id,
          name: listing.name,
          lat: coords.lat,
          lng: coords.lng,
          type: listing.type,
          photo: listing.photoUrls?.[0],
        });

        return acc;
      }, [])
      .slice(0, 20); // Limit markers

    this.markers.set(markers); // ✅ now fully MarkerData[]
  }

  private updatePreviewListings(listings: ListingWithPhotos[]): void {
    this.previewListings.set(listings.slice(0, 5));
  }

  onMapMoved(event: MapMoveEvent): void {
    this.store.dispatch(
      ListingsActions.updateMapBounds({ bounds: event.bounds })
    );
  }

  onMarkerClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));
  }

  onListingClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));
  }

  onLoadMore(): void {
    this.store.dispatch(ListingsActions.loadMoreListings());
  }

  togglePanel(): void {
    this.panelExpanded.update((v) => !v);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchMove(event: TouchEvent): void {
    this.touchCurrentY = event.touches[0].clientY;
  }

  onTouchEnd(): void {
    const deltaY = this.touchStartY - this.touchCurrentY;

    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        this.panelExpanded.set(true);
      } else {
        this.panelExpanded.set(false);
      }
    }
  }

  trackById(_: number, item: ListingWithPhotos): number {
    return item.id;
  }
}

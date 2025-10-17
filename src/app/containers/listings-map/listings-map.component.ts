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
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
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

  // Store data
  allListings = signal<ListingWithPhotos[]>([]);
  displayedListings = signal<ListingWithPhotos[]>([]);
  markers = signal<MarkerData[]>([]);
  loading = signal(false);
  selectedId = signal<number | undefined>(undefined);
  hasMore = signal(true);
  mapCenter = signal({ lat: 36.8065, lng: 10.1815 });
  isMobile = signal(false);

  // Mobile panel state
  panelExpanded = signal(false);
  previewListings = signal<ListingWithPhotos[]>([]);

  // Filter and sort state
  private searchQuery = signal('');
  private selectedTypes = signal<string[]>([]);
  private minReviewScore = signal(0);
  private sortBy = signal<'rating' | 'price' | 'reviewScore'>('reviewScore');
  private sortOrder = signal<'asc' | 'desc'>('desc');

  // Search subject for debouncing
  private searchSubject$ = new Subject<string>();

  private touchStartY = 0;
  private touchCurrentY = 0;
  private resizeListener?: () => void;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);

      this.resizeListener = () => {
        this.isMobile.set(window.innerWidth <= 768);
      };
      window.addEventListener('resize', this.resizeListener);
    }

    this.setupSearchDebounce();
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.applyFiltersAndSort();
      });
  }

  private subscribeToStore(): void {
    // Subscribe to location changes
    this.store
      .select(selectCurrentLocation)
      .pipe(takeUntil(this.destroy$))
      .subscribe((location) => {
        if (!location) return;
        this.mapCenter.set({ lat: location.lat, lng: location.lng });
        this.store.dispatch(
          ListingsActions.loadListings({
            filters: { location: { lat: location.lat, lng: location.lng } },
            reset: true,
          })
        );
      });

    // Subscribe to listings state
    this.store
      .select(selectListings)
      .pipe(takeUntil(this.destroy$))
      .subscribe((listings) => {
        // const listingsWithPhotos = listings.filter(
        //   (listing: ListingWithPhotos) =>
        //     listing.photoUrls &&
        //     listing.photoUrls.length > 0 &&
        //     listing.photoUrls.some((url) => !!url && url.trim() !== '')
        // );
        this.allListings.set(listings);
        this.applyFiltersAndSort();
      });

    this.store
      .select(selectListingsLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        this.loading.set(loading);
      });

    this.store
      .select(selectSelectedListingId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((selectedId) => {
        this.selectedId.set(selectedId);
      });

    this.store
      .select(selectHasMoreListings)
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasMore) => {
        this.hasMore.set(hasMore);
      });
  }

  private applyFiltersAndSort(): void {
    let filtered = [...this.allListings()];

    // Apply search filter
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (listing) =>
          listing.name.toLowerCase().includes(query) ||
          listing.type.some((t) => t.toLowerCase().includes(query)) ||
          listing.vicinity?.toLowerCase().includes(query) ||
          listing.formatted_address?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    const types = this.selectedTypes();
    if (types.length > 0) {
      filtered = filtered.filter((listing) =>
        listing.type.some((type) => types.includes(type))
      );
    }

    // Apply review score filter
    const minScore = this.minReviewScore();
    if (minScore > 0) {
      filtered = filtered.filter(
        (listing) => this.calculateReviewScore(listing) >= minScore
      );
    }

    // Apply sorting
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();

    if (sortBy === 'reviewScore') {
      filtered.sort((a, b) => {
        const scoreA = this.calculateReviewScore(a);
        const scoreB = this.calculateReviewScore(b);
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return sortOrder === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      });
    }

    this.displayedListings.set(filtered);
    this.updateMarkers(filtered);
    this.updatePreviewListings(filtered);
  }

  private updateMarkers(listings: ListingWithPhotos[]): void {
    const markers: MarkerData[] = listings
      .reduce<MarkerData[]>((acc, listing) => {
        const coords = this.mapService.parsePostGISPoint(
          listing.location_point
        );
        if (!coords) return acc;

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
      .slice(0, 50); // Limit markers for performance

    this.markers.set(markers);
  }

  private updatePreviewListings(listings: ListingWithPhotos[]): void {
    this.previewListings.set(listings.slice(0, 5));
  }
  //added
  private calculateReviewScore(listing: ListingWithPhotos): number {
    const rating = listing.rating ?? 0;
    const reviewCount = listing.user_ratings_total ?? 0;
    return rating * Math.log10(1 + reviewCount);
  }

  //added
  onSearchChange(query: string): void {
    this.searchSubject$.next(query);
  }
  //added
  onTypeFilterChange(types: string[]): void {
    this.selectedTypes.set(types);
    this.applyFiltersAndSort();
  }
  //added
  onSortChange(event: {
    sortBy: 'rating' | 'price' | 'reviewScore';
    order: 'asc' | 'desc';
  }): void {
    this.sortBy.set(event.sortBy);
    this.sortOrder.set(event.order);
    this.applyFiltersAndSort();
  }
  //added
  onReviewScoreChange(score: number): void {
    this.minReviewScore.set(score);
    this.applyFiltersAndSort();
  }

  onMapMoved(event: MapMoveEvent): void {
    this.store.dispatch(
      ListingsActions.updateMapBounds({ bounds: event.bounds })
    );
  }

  onMarkerClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));

    if (this.isMobile() && this.panelExpanded()) {
      this.scrollToListing(id);
    }
  }

  onListingClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));
  }

  onLoadMore(): void {
    this.store.dispatch(ListingsActions.loadMoreListings());
  }

  private scrollToListing(id: number): void {
    // Implementation depends on your template structure
    // This is a placeholder for scrolling to the selected listing
    setTimeout(() => {
      const element = document.querySelector(`[data-listing-id="${id}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  // Mobile panel handlers
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

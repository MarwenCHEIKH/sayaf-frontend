import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
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
export class ListingsMapComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private mapService = inject(MapService);
  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID);

  // Raw data from store (all listings)
  private allListings = signal<ListingWithPhotos[]>([]);

  // Filter and sort state (local)
  // private searchQuery = signal('');
  private selectedTypes = signal<string[]>([]);
  private minReviewScore = signal(0);
  private sortBy = signal<'rating' | 'price' | 'reviewScore'>('reviewScore');
  private sortOrder = signal<'asc' | 'desc'>('desc');

  // Pagination state (local)
  private displayCount = signal(10); // How many items to show
  private readonly ITEMS_PER_LOAD = 10;

  // Search subject for debouncing
  private searchSubject$ = new Subject<string>();

  // Computed: filtered and sorted listings (all matches, not paginated)
  private filteredAndSortedListings = computed(() => {
    let listings = [...this.allListings()];

    // Apply type filter
    const types = this.selectedTypes();
    if (types.length > 0) {
      listings = listings.filter((listing) =>
        listing.type.some((type) => types.includes(type))
      );
    }

    // Apply review score filter
    const minScore = this.minReviewScore();
    if (minScore > 0) {
      listings = listings.filter(
        (listing) => this.calculateReviewScore(listing) >= minScore
      );
    }

    // Apply sorting
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();

    if (sortBy === 'reviewScore') {
      listings.sort((a, b) => {
        const scoreA = this.calculateReviewScore(a);
        const scoreB = this.calculateReviewScore(b);
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    } else if (sortBy === 'rating') {
      listings.sort((a, b) => {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return sortOrder === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      });
    }

    return listings;
  });

  // Computed: paginated listings (what's actually displayed)
  displayedListings = computed(() => {
    const filtered = this.filteredAndSortedListings();
    const count = this.displayCount();
    return filtered.slice(0, count);
  });

  // Computed: markers (limited to displayed listings for performance)
  markers = computed(() => {
    const listings = this.filteredAndSortedListings();
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
      .slice(0, 100); // Show more markers than displayed listings

    return markers;
  });

  // Computed: preview listings for mobile
  previewListings = computed(() => {
    return this.displayedListings().slice(0, 5);
  });

  // Computed: whether there are more items to load
  hasMore = computed(() => {
    const total = this.filteredAndSortedListings().length;
    const displayed = this.displayCount();
    return displayed < total;
  });

  onScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const scrollPosition = container.scrollTop + container.clientHeight;
    const scrollThreshold = container.scrollHeight - 200; // 200px before bottom

    if (
      this.hasMore() &&
      !this.loading() &&
      scrollPosition >= scrollThreshold
    ) {
      this.onLoadMore();
    }
  }

  // Store data
  loading = this.store.selectSignal(selectListingsLoading);
  selectedId = this.store.selectSignal(selectSelectedListingId);
  mapCenter = signal({ lat: 36.8065, lng: 10.1815 });
  isMobile = signal(false);

  // Mobile panel state
  panelExpanded = signal(false);

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

    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToStore(): void {
    // Subscribe to location changes
    this.store
      .select(selectCurrentLocation)
      .pipe(takeUntil(this.destroy$))
      .subscribe((location) => {
        if (!location) return;
        this.mapCenter.set({ lat: 36.8065, lng: 10.1815 });
        this.store.dispatch(
          ListingsActions.loadListings({ filters: {}, reset: true })
        );
        this.store.dispatch(
          ListingsActions.loadListings({
            filters: { location: { lat: location.lat, lng: location.lng } },
            reset: true,
          })
        );
      });

    // Subscribe to listings from store (raw data)
    this.store
      .select(selectListings)
      .pipe(takeUntil(this.destroy$))
      .subscribe((listings) => {
        this.allListings.set(listings);
        // Reset pagination when new data arrives
        this.resetPagination();
      });
  }

  private resetPagination(): void {
    this.displayCount.set(this.ITEMS_PER_LOAD);
  }

  private calculateReviewScore(listing: ListingWithPhotos): number {
    const rating = listing.rating ?? 0;
    const reviewCount = listing.user_ratings_total ?? 0;
    return rating * Math.log10(1 + reviewCount);
  }

  // Event handlers
  onSearchChange(query: string): void {
    this.searchSubject$.next(query);
  }

  onTypeFilterChange(types: string[]): void {
    this.selectedTypes.set(types);
    this.resetPagination();
  }

  onSortChange(event: {
    sortBy: 'rating' | 'price' | 'reviewScore';
    order: 'asc' | 'desc';
  }): void {
    this.sortBy.set(event.sortBy);
    this.sortOrder.set(event.order);
    this.resetPagination();
  }

  onReviewScoreChange(score: number): void {
    this.minReviewScore.set(score);
    this.resetPagination();
  }

  onMapMoved(event: MapMoveEvent): void {
    // Optionally update store with new bounds
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
    // Simply increase the display count
    this.displayCount.update((count) => count + this.ITEMS_PER_LOAD);
  }

  private scrollToListing(id: number): void {
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

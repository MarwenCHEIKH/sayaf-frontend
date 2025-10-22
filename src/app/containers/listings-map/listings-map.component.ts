import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { combineLatest, of, Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ListingsActions } from '../../store/listings/listings.actions';
import {
  selectListings,
  selectListingsHasMore,
  selectListingsLoading,
  selectSelectedListingId,
} from '../../store/listings/listings.selectors';
import { selectCurrentLocationFilters } from '../../store/location/location.selectors';
import { MarkerData, MapMoveEvent } from '../../models/map.model';
import { ListingWithPhotos } from '../../models/listing.model';
import { MapComponent } from '../../features/map/map.component';
import { ListingsComponent } from '../../features/listings/listings.component';
import { MapService } from '../../services/map-service/map.service';
import { RouterModule } from '@angular/router';
import { bounds } from 'leaflet';

@Component({
  selector: 'app-listings-map-container',
  standalone: true,
  imports: [CommonModule, MapComponent, ListingsComponent, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './listings-map.component.html',
  styleUrls: ['./listings-map.component.scss'],
})
export class ListingsMapComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private mapService = inject(MapService);
  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID);
  private shouldRecenter = true;

  @ViewChild(MapComponent) mapComponent?: MapComponent;

  // Store signals - single source of truth
  displayedListings = this.store.selectSignal(selectListings);
  loading = this.store.selectSignal(selectListingsLoading);
  hasMore = this.store.selectSignal(selectListingsHasMore);
  selectedId = this.store.selectSignal(selectSelectedListingId);

  // UI state
  mapCenter = signal({ lat: 36.8065, lng: 10.1815 });
  isMobile = signal(false);
  panelExpanded = signal(false);
  searchAsMapMoves = signal(false);

  // Computed: markers synced with displayed listings
  markers = computed(() => {
    const listings = this.displayedListings();
    const markers: MarkerData[] = listings.reduce<MarkerData[]>(
      (acc, listing) => {
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
          photo: listing.photoUrls?.[0] || 'assets/images/poster.jpg',
        });
        return acc;
      },
      []
    );

    return markers;
  });

  // Computed: preview listings for mobile (first 5)
  previewListings = computed(() => {
    return this.displayedListings().slice(0, 5);
  });

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

  // Event handlers
  onTypeFilterChange(types: string[]): void {
    this.store.dispatch(
      ListingsActions.updateFilters({
        filters: { type: types },
      })
    );
  }

  onSortChange(event: {
    sortBy: 'rating' | 'price' | 'reviewScore';
    order: 'asc' | 'desc';
  }): void {
    // Handle sorting in the component or dispatch to store if needed
    // For now, sorting can remain client-side in the listings component
  }

  onReviewScoreChange(score: number): void {
    // Add review score filter to store if needed
    console.log('Review score filter:', score);
  }

  onSearchChange(query: string): void {
    this.store.dispatch(
      ListingsActions.updateFilters({
        filters: { query },
      })
    );
  }

  onMapMoved(event: MapMoveEvent): void {
    // Only update bounds if "Search as map moves" is enabled
    if (this.searchAsMapMoves()) {
      this.store.dispatch(
        ListingsActions.updateMapBounds({ bounds: event.bounds })
      );
      console.log({ bounds: event.bounds });
    }
  }
  toggleSearchAsMapMoves(): void {
    this.searchAsMapMoves.update((v) => !v);

    // // If enabling, immediately search with current map bounds
    // if (this.searchAsMapMoves() && this.mapComponent) {
    //   const bounds = this.mapComponent.getBounds();
    //   if (bounds) {
    //     this.store.dispatch(ListingsActions.updateMapBounds({ bounds }));
    //   }
    // }
  }
  onMarkerClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));

    if (this.isMobile() && this.panelExpanded()) {
      this.scrollToListing(id);
    }
  }

  onListingClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));

    // Find the listing and fly to its location
    const listing = this.displayedListings().find((l) => l.id === id);
    if (listing) {
      const coords = this.mapService.parsePostGISPoint(listing.location_point);
      if (coords && this.mapComponent) {
        // Fly to the listing location
        console.log(coords);
        this.mapComponent.flyTo(coords.lat, coords.lng, 16);
      }
    }

    // Scroll to listing on mobile
    if (this.isMobile()) {
      this.scrollToListing(id);
    }
  }

  onScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const scrollPosition = container.scrollTop + container.clientHeight;
    const scrollThreshold = container.scrollHeight - 200;

    if (
      this.hasMore() &&
      !this.loading() &&
      scrollPosition >= scrollThreshold
    ) {
      this.onLoadMore();
    }
  }

  onLoadMore(): void {
    if (this.loading() || !this.hasMore()) return;

    const filters = this.store.selectSignal(selectCurrentLocationFilters)();
    if (!filters) return;

    console.log('📜 Load more triggered');

    if (this.searchAsMapMoves()) {
      // Fetch all listings in bounds at once
      this.store.dispatch(
        ListingsActions.loadListings({
          filters,
          reset: true, // reset makes sure we replace any previous incomplete list
          limit: 0, // convention: 0 or undefined = fetch all
        })
      );
    } else {
      // Normal infinite scroll behavior
      this.store.dispatch(
        ListingsActions.loadListings({
          filters,
          reset: false,
          limit: 20,
        })
      );
    }
  }

  //utility function to Compute centroid from displayed listings
  private computeListingsCenter(
    listings: ListingWithPhotos[]
  ): { lat: number; lng: number } | null {
    if (!listings || listings.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    for (const listing of listings) {
      const coords = this.mapService.parsePostGISPoint(listing.location_point);
      if (!coords) continue;

      sumLat += coords.lat;
      sumLng += coords.lng;
      count++;
    }

    if (count === 0) return null;

    return {
      lat: sumLat / count,
      lng: sumLng / count,
    };
  }

  private subscribeToStore(): void {
    this.store
      .select(selectCurrentLocationFilters)
      .pipe(
        distinctUntilChanged((prev, curr) => {
          const prevBounds = prev?.bounds;
          const currBounds = curr?.bounds;

          if (!prevBounds && !currBounds) return true;
          if (!prevBounds || !currBounds) return false;

          return (
            prevBounds.north === currBounds.north &&
            prevBounds.south === currBounds.south &&
            prevBounds.east === currBounds.east &&
            prevBounds.west === currBounds.west
          );
        }),
        switchMap((filters) => {
          if (!filters || !filters.bounds) {
            console.warn('⚠️ Invalid filters:', filters);
            return of<
              [
                ListingWithPhotos[],
                { north: number; south: number; east: number; west: number }
              ]
            >([
              [],
              {
                north: 0,
                south: 0,
                east: 0,
                west: 0,
              },
            ]);
          }

          this.store.dispatch(
            ListingsActions.loadListings({
              filters,
              reset: true,
              limit: this.searchAsMapMoves() ? 0 : 20,
            })
          );

          return combineLatest([
            this.store.select(selectListings),
            of(filters.bounds!),
          ]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(([listings, bounds]) => {
        // Only auto-center when "Search as map moves" is disabled
        if (!this.searchAsMapMoves()) {
          const center = this.computeListingsCenter(listings);

          if (center) {
            this.mapCenter.set(center);
          } else if (bounds) {
            this.mapCenter.set({
              lat: (bounds.north + bounds.south) / 2,
              lng: (bounds.east + bounds.west) / 2,
            });
          }
        }
      });
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

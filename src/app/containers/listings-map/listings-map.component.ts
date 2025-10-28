// src/app/containers/listings-map/listings-map.component.ts
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
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import { combineLatest, of, Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ListingsActions } from '../../store/listings/listings.actions';
import {
  selectListings,
  selectClusters,
  selectListingsTier,
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
import { ClusterMarker } from '../../services/listing-service/listing.service';
import { RouterModule } from '@angular/router';

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

  @ViewChild(MapComponent) mapComponent?: MapComponent;

  displayedListings = this.store.selectSignal(selectListings);
  displayedClusters = this.store.selectSignal(selectClusters);
  currentTier = this.store.selectSignal(selectListingsTier);
  loading = this.store.selectSignal(selectListingsLoading);
  hasMore = this.store.selectSignal(selectListingsHasMore);
  selectedId = this.store.selectSignal(selectSelectedListingId);

  mapCenter = signal({ lat: 36.8065, lng: 10.1815 });
  isMobile = signal(false);
  panelExpanded = signal(false);
  searchAsMapMoves = signal(false);

  markers = computed(() => {
    const listings = this.displayedListings();
    const tier = this.currentTier();

    // Only show individual markers at CITY tier (zoomed in)
    if (tier === 'COUNTRY' || tier === 'STATE') {
      return [];
    }

    const markers: MarkerData[] = listings.reduce<MarkerData[]>(
      (acc, listing) => {
        const coords = listing.location_point
          ? this.mapService.parsePostGISPoint(listing.location_point)
          : null;

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

  clusters = computed(() => {
    return this.displayedClusters();
  });

  previewListings = computed(() => {
    return this.displayedListings().slice(0, 5);
  });

  infiniteScrollEnabled = computed(() => !this.searchAsMapMoves());

  private touchStartY = 0;
  private touchCurrentY = 0;
  private resizeListener?: () => void;
  private resizeTimeout?: any;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);

      this.resizeListener = () => {
        const wasMobile = this.isMobile();
        const nowMobile = window.innerWidth <= 768;

        this.isMobile.set(nowMobile);

        // If layout changed, give map time to resize
        if (wasMobile !== nowMobile) {
          console.log(
            'Layout changed from',
            wasMobile ? 'mobile' : 'desktop',
            'to',
            nowMobile ? 'mobile' : 'desktop'
          );

          // Clear any existing timeout
          if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
          }

          // Wait for Angular to re-render, then invalidate map size
          this.resizeTimeout = setTimeout(() => {
            if (this.mapComponent) {
              console.log('Invalidating map size after layout change');
              this.mapComponent.forceResize();
            }
          }, 100);
        }
      };

      window.addEventListener('resize', this.resizeListener);
    }

    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

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
    console.log('Sort changed:', event);
  }

  onReviewScoreChange(score: number): void {
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
    if (!this.searchAsMapMoves()) return;

    const filters = this.store.selectSignal(selectCurrentLocationFilters)();
    if (!filters) return;

    console.log('🗺️ Map moved event received:', {
      zoom: event.zoom,
      bounds: event.bounds,
      center: event.center,
    });

    this.store.dispatch(
      ListingsActions.loadListings({
        filters: { ...filters, bounds: event.bounds },
        reset: true,
        limit: 0,
        zoom: event.zoom,
      })
    );
  }

  toggleSearchAsMapMoves(): void {
    const newValue = !this.searchAsMapMoves();
    this.searchAsMapMoves.set(newValue);

    console.log('🔄 Search as map moves:', newValue ? 'ENABLED' : 'DISABLED');

    if (newValue && this.mapComponent) {
      const bounds = this.mapComponent.getBounds();
      const zoom = this.mapComponent.getCurrentZoom();
      const filters = this.store.selectSignal(selectCurrentLocationFilters)();

      if (bounds && filters) {
        this.store.dispatch(
          ListingsActions.loadListings({
            filters: { ...filters, bounds },
            reset: true,
            limit: 0,
            zoom,
          })
        );
      }
    }
  }

  onMarkerClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));

    if (this.isMobile() && this.panelExpanded()) {
      this.scrollToListing(id);
    }
  }

  onClusterClick(cluster: ClusterMarker): void {
    console.log('🎯 Cluster clicked, zooming in:', cluster);

    if (!this.mapComponent) return;

    const currentZoom = this.mapComponent.getCurrentZoom();
    let targetZoom: number;
    let nextTier: 'COUNTRY' | 'STATE' | 'CITY';

    const currentTier = this.currentTier();

    // Determine next tier and zoom based on current zoom
    if (currentTier === 'COUNTRY') {
      targetZoom = currentZoom < 10 ? 10 : 12; // if already >=10, zoom further
      nextTier = 'STATE';
    } else if (currentTier === 'STATE') {
      targetZoom = currentZoom < 14 ? 14 : 16;
      nextTier = 'CITY';
    } else {
      targetZoom = currentZoom + 2; // just zoom in more
      nextTier = 'CITY';
    }

    // Fly to cluster
    this.mapComponent.flyTo(cluster.lat, cluster.lng, targetZoom);

    // Wait for animation to complete
    setTimeout(() => {
      if (this.searchAsMapMoves() && this.mapComponent) {
        const bounds = this.mapComponent.getBounds();
        const zoom = this.mapComponent.getCurrentZoom();
        const filters = this.store.selectSignal(selectCurrentLocationFilters)();

        if (bounds && filters) {
          console.log('📍 Cluster zoom complete, loading with new bounds:', {
            bounds,
            zoom,
            tier: nextTier,
          });

          this.store.dispatch(
            ListingsActions.loadListings({
              filters: { ...filters, bounds },
              reset: true,
              limit: 0,
              zoom,
            })
          );

          // Optionally, update current tier in the store if you track it
          this.store.dispatch(
            ListingsActions.setCurrentTier({ tier: nextTier })
          );
        }
      }
    }, 1700);
  }

  onListingClick(id: number): void {
    this.store.dispatch(ListingsActions.selectListing({ id }));

    const listing = this.displayedListings().find((l) => l.id === id);
    if (listing) {
      const coords = listing.location_point
        ? this.mapService.parsePostGISPoint(listing.location_point)
        : null;

      console.log('Listing coords:', coords?.lat, coords?.lng);

      if (
        coords &&
        !isNaN(coords.lat) &&
        !isNaN(coords.lng) &&
        this.mapComponent
      ) {
        // Convert to numbers to be safe
        const lat = Number(coords.lat);
        const lng = Number(coords.lng);

        if (!isNaN(lat) && !isNaN(lng)) {
          // Small delay on mobile to ensure map is ready
          if (this.isMobile()) {
            setTimeout(() => {
              this.mapComponent?.flyTo(lat, lng, 16);
            }, 50);
          } else {
            this.mapComponent.flyTo(lat, lng, 16);
          }
        }
      }
    }
  }

  onScroll(event: Event): void {
    if (this.searchAsMapMoves()) {
      console.log('⚠️ Infinite scroll disabled (search as map moves is ON)');
      return;
    }

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

    if (this.searchAsMapMoves()) {
      console.log('⚠️ Load more disabled (search as map moves is ON)');
      return;
    }

    const filters = this.store.selectSignal(selectCurrentLocationFilters)();
    if (!filters) return;

    console.log('📜 Loading more listings (infinite scroll)');

    this.store.dispatch(
      ListingsActions.loadListings({
        filters,
        reset: false,
        limit: 20,
      })
    );
  }

  private computeListingsCenter(
    listings: ListingWithPhotos[]
  ): { lat: number; lng: number } | null {
    if (!listings || listings.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    for (const listing of listings) {
      const coords = listing.location_point
        ? this.mapService.parsePostGISPoint(listing.location_point)
        : null;

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

          const limit = this.searchAsMapMoves() ? 0 : 20;
          const zoom =
            this.searchAsMapMoves() && this.mapComponent
              ? this.mapComponent.getCurrentZoom()
              : undefined;

          console.log(
            `🔄 Filters changed, loading listings (limit: ${
              limit === 0 ? 'ALL' : limit
            }${zoom ? ', zoom: ' + zoom : ''})`
          );

          this.store.dispatch(
            ListingsActions.loadListings({
              filters,
              reset: true,
              limit,
              zoom,
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

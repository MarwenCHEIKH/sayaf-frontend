// src/app/store/listings/listings.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { ListingsActions } from './listings.actions';
import { ListingsState, initialListingsState } from './listings.state';

export const listingsReducer = createReducer(
  initialListingsState,

  on(
    ListingsActions.loadListings,
    (state, { filters, reset }): ListingsState => ({
      ...state,
      loading: true,
      error: null,
      filters: { ...state.filters, ...filters },
      page: reset ? 1 : state.page,
      items: reset ? [] : state.items,
      clusters: reset ? [] : state.clusters,
    })
  ),

  on(
    ListingsActions.loadListingsSuccess,
    (state, { listings, clusters, tier, total, append }): ListingsState => {
      const existingIds = new Set(state.items.map((item) => item.id));
      const newListings =
        append && listings
          ? listings.filter((listing) => !existingIds.has(listing.id))
          : listings || [];

      const newItems = append
        ? [...state.items, ...newListings]
        : listings || [];

      return {
        ...state,
        items: newItems,
        clusters: clusters || [],
        tier,
        total,
        page: append ? state.page + 1 : 1,
        loading: false,
        error: null,
        hasMore: newItems.length < total,
      };
    }
  ),

  on(
    ListingsActions.loadListingsFailure,
    (state, { error }): ListingsState => ({
      ...state,
      loading: false,
      error,
    })
  ),

  on(
    ListingsActions.updateFilters,
    (state, { filters }): ListingsState => ({
      ...state,
      filters: { ...state.filters, ...filters },
      page: 1,
      items: [],
      clusters: [],
      hasMore: true,
    })
  ),

  on(
    ListingsActions.updateMapBounds,
    (state, { bounds }): ListingsState => ({
      ...state,
      filters: { ...state.filters, bounds },
      page: 1,
      items: [],
      clusters: [],
      hasMore: true,
    })
  ),

  on(
    ListingsActions.selectListing,
    (state, { id }): ListingsState => ({
      ...state,
      selectedListingId: id,
    })
  ),

  on(
    ListingsActions.clearSelection,
    (state): ListingsState => ({
      ...state,
      selectedListingId: undefined,
    })
  ),

  on(ListingsActions.resetListings, (): ListingsState => initialListingsState),
  on(ListingsActions.setCurrentTier, (state, { tier }) => ({
    ...state,
    currentTier: tier,
  }))
);

import { createReducer, on } from '@ngrx/store';
import { ListingsActions } from './listings.actions';
import { ListingsState, initialListingsState } from './listings.state';

export const listingsReducer = createReducer(
  initialListingsState,

  on(
    ListingsActions.loadListings,
    (state, { filters, reset }): ListingsState => {
      console.log('🔄 Reducer - loadListings:', {
        reset,
        currentPage: state.page,
      });

      return {
        ...state,
        loading: true,
        error: null,
        filters: { ...state.filters, ...filters },
        // Reset page to 1 if resetting, otherwise keep current page
        page: reset ? 1 : state.page,
        // Clear items if resetting
        items: reset ? [] : state.items,
      };
    }
  ),

  on(
    ListingsActions.loadListingsSuccess,
    (state, { listings, total, append }): ListingsState => {
      // Avoid duplicates when appending
      const existingIds = new Set(state.items.map((item) => item.id));
      const newListings = append
        ? listings.filter((listing) => !existingIds.has(listing.id))
        : listings;

      const newItems = append ? [...state.items, ...newListings] : listings;

      console.log('📦 Reducer - loadListingsSuccess:', {
        append,
        previousCount: state.items.length,
        newListingsCount: listings.length,
        filteredNewCount: newListings.length,
        finalCount: newItems.length,
        previousPage: state.page,
        newPage: append ? state.page + 1 : 1,
        total,
        hasMore: newItems.length < total,
      });

      return {
        ...state,
        items: newItems,
        total,
        // Increment page when appending successfully
        page: append ? state.page + 1 : 1,
        loading: false,
        error: null,
        hasMore: newItems.length < total,
      };
    }
  ),

  on(ListingsActions.loadListingsFailure, (state, { error }): ListingsState => {
    console.error('❌ Reducer - loadListingsFailure:', error);

    return {
      ...state,
      loading: false,
      error,
    };
  }),

  on(
    ListingsActions.updateFilters,
    (state, { filters }): ListingsState => ({
      ...state,
      filters: { ...state.filters, ...filters },
      // Reset pagination when filters change
      page: 1,
      items: [],
      hasMore: true,
    })
  ),

  on(
    ListingsActions.updateMapBounds,
    (state, { bounds }): ListingsState => ({
      ...state,
      filters: { ...state.filters, bounds },
      // Reset pagination when bounds change
      page: 1,
      items: [],
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

  on(ListingsActions.resetListings, (): ListingsState => initialListingsState)
);

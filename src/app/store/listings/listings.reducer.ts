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
    })
  ),

  on(
    ListingsActions.loadListingsSuccess,
    (state, { listings, total, append }): ListingsState => ({
      ...state,
      items: append ? [...state.items, ...listings] : listings,
      total,
      loading: false,
      error: null,
      hasMore: (append ? state.items.length : 0) + listings.length < total,
    })
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
    ListingsActions.loadMoreListings,
    (state): ListingsState => ({
      ...state,
      page: state.page + 1,
      loading: true,
    })
  ),

  on(
    ListingsActions.updateFilters,
    (state, { filters }): ListingsState => ({
      ...state,
      filters: { ...state.filters, ...filters },
    })
  ),

  on(
    ListingsActions.updateMapBounds,
    (state, { bounds }): ListingsState => ({
      ...state,
      filters: { ...state.filters, bounds },
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

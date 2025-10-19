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
      items: reset ? [] : state.items,
    })
  ),

  on(ListingsActions.loadListingsSuccess, (state, { listings }) => ({
    ...state,
    items: listings,
    loading: false,
    error: null,
  })),

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

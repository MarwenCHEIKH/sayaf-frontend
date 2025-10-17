// src/app/store/listings/listings.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ListingsState } from './listings.state';

export const selectListingsState =
  createFeatureSelector<ListingsState>('listings');

// All listings from API (raw data)
export const selectListings = createSelector(
  selectListingsState,
  (state) => state.items
);

export const selectListingsLoading = createSelector(
  selectListingsState,
  (state) => state.loading
);

export const selectListingsError = createSelector(
  selectListingsState,
  (state) => state.error
);

export const selectListingsFilters = createSelector(
  selectListingsState,
  (state) => state.filters
);

export const selectSelectedListingId = createSelector(
  selectListingsState,
  (state) => state.selectedListingId
);

export const selectListingsTotal = createSelector(
  selectListingsState,
  (state) => state.total
);

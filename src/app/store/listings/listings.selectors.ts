// src/app/store/listings/listings.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ListingsState } from './listings.state';

export const selectListingsState =
  createFeatureSelector<ListingsState>('listings');

export const selectListings = createSelector(
  selectListingsState,
  (state) => state.items
);

export const selectClusters = createSelector(
  selectListingsState,
  (state) => state.clusters
);

export const selectListingsTier = createSelector(
  selectListingsState,
  (state) => state.tier
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

export const selectListingsPage = createSelector(
  selectListingsState,
  (state) => state.page
);

export const selectListingsHasMore = createSelector(
  selectListingsState,
  (state) => state.hasMore
);

export const selectSelectedListingId = createSelector(
  selectListingsState,
  (state) => state.selectedListingId
);

export const selectListingsTotal = createSelector(
  selectListingsState,
  (state) => state.total
);

export const selectMapBounds = createSelector(
  selectListingsState,
  (state) => state.filters.bounds
);

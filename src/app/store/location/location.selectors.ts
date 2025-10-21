// location.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LocationState } from './location.state';
import { ListingsFilters } from '../listings/listings.state';

export const selectLocationState =
  createFeatureSelector<LocationState>('location');

export const selectCurrentLocationFilters = createSelector(
  selectLocationState,
  (state): ListingsFilters | null => {
    // Check if current exists and has required properties
    if (!state.current || !state.current.bounds) {
      console.warn('⚠️ Location state missing bounds:', state.current);
      return null;
    }

    return {
      locationName: state.current.locationName || 'Unknown',
      bounds: state.current.bounds,
      type: [],
      query: '',
    };
  }
);

export const selectLocationLoading = createSelector(
  selectLocationState,
  (state) => state.loading
);

export const selectCurrentLocation = createSelector(
  selectLocationState,
  (state) => state.current
);

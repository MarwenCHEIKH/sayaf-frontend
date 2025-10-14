import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LocationState } from './location.state';

export const selectLocationState =
  createFeatureSelector<LocationState>('location');

/**
 * Ensures we return a new object whenever the state updates.
 * This guarantees Angular change detection and async pipe updates.
 */
export const selectCurrentLocation = createSelector(
  selectLocationState,
  (state) => {
    if (!state.current) return null;

    // Return a *new object* each time (important for change detection)
    return {
      lat: state.current.lat,
      lng: state.current.lng,
      city: state.current.city,
      detected: state.current.detected,
    };
  }
);

export const selectLocationLoading = createSelector(
  selectLocationState,
  (state) => state.loading
);

export const selectLocationError = createSelector(
  selectLocationState,
  (state) => state.error
);

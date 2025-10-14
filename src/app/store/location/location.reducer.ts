import { createReducer, on } from '@ngrx/store';
import { LocationActions } from './location.actions';
import { LocationState, initialLocationState } from './location.state';

export const locationReducer = createReducer(
  initialLocationState,
  on(
    LocationActions.loadCurrentLocation,
    (state): LocationState => ({
      ...state,
      loading: true,
      error: null,
    })
  ),
  on(
    LocationActions.loadCurrentLocationSuccess,
    (state, { location }): LocationState => ({
      ...state,
      current: location,
      loading: false,
      error: null,
    })
  ),
  on(
    LocationActions.loadCurrentLocationFailure,
    (state, { error }): LocationState => ({
      ...state,
      loading: false,
      error,
    })
  ),
  on(
    LocationActions.setManualLocation,
    (state, { location }): LocationState => ({
      ...state,
      current: { ...location, detected: false },
      error: null,
    })
  )
);

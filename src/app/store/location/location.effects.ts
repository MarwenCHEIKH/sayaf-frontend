import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { LocationActions } from './location.actions';
import { tap, switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { LocationService } from '../../services/location-service/location.service';

export const loadCurrentLocation = createEffect(
  (actions$ = inject(Actions), locationService = inject(LocationService)) => {
    return actions$.pipe(
      ofType(LocationActions.loadCurrentLocation),
      switchMap(() =>
        locationService.getCurrentLocation().pipe(
          map((location) =>
            LocationActions.loadCurrentLocationSuccess({ location })
          ),
          catchError((error) =>
            of(
              LocationActions.loadCurrentLocationFailure({
                error: error.message || 'Failed to load location',
              })
            )
          )
        )
      )
    );
  },
  { functional: true }
);

export const setManualLocation = createEffect(
  (actions$ = inject(Actions), locationService = inject(LocationService)) => {
    return actions$.pipe(
      ofType(LocationActions.setManualLocation),
      tap(({ location }) => {
        locationService.setManualLocation(location);
        console.log('Manual location set:', location);
      })
    );
  },
  { functional: true, dispatch: false }
);

export const locationEffects = {
  loadCurrentLocation,
  setManualLocation,
};

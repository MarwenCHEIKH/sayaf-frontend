// src/app/store/listings/listings.effects.ts
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ListingsActions } from './listings.actions';
import { map, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ListingService } from '../../services/listing-service/listing.service';

// Load listings from API
export const loadListings = createEffect(
  (actions$ = inject(Actions), listingService = inject(ListingService)) => {
    return actions$.pipe(
      ofType(ListingsActions.loadListings),
      switchMap(() => {
        return listingService.getListings().pipe(
          map((listings) =>
            ListingsActions.loadListingsSuccess({
              listings,
            })
          ),
          catchError((error) =>
            of(
              ListingsActions.loadListingsFailure({
                error: error.message || 'Failed to load listings',
              })
            )
          )
        );
      })
    );
  },
  { functional: true }
);

// Trigger load when map bounds change
export const updateMapBounds = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(ListingsActions.updateMapBounds),
      map(({ bounds }) =>
        ListingsActions.loadListings({
          filters: { bounds },
          reset: true,
        })
      )
    );
  },
  { functional: true }
);

export const listingsEffects = {
  loadListings,
  updateMapBounds,
};

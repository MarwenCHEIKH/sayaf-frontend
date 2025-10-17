// src/app/store/listings/listings.effects.ts
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ListingsActions } from './listings.actions';
import {
  selectListingsPage,
  selectListingsFilters,
} from './listings.selectors';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { ListingService } from '../../services/listing-service/listing.service';

export const loadListings = createEffect(
  (
    actions$ = inject(Actions),
    listingService = inject(ListingService),
    store = inject(Store)
  ) => {
    return actions$.pipe(
      ofType(ListingsActions.loadListings),
      withLatestFrom(store.select(selectListingsPage)),
      switchMap(([{ filters, reset }, page]) => {
        const pageToLoad = reset ? 1 : page;
        return listingService.getListingsWithFilters(filters, pageToLoad).pipe(
          map((response) =>
            ListingsActions.loadListingsSuccess({
              listings: response.listings,
              total: response.total,
              append: !reset && pageToLoad > 1,
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

export const loadMoreListings = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) => {
    return actions$.pipe(
      ofType(ListingsActions.loadMoreListings),
      withLatestFrom(store.select(selectListingsFilters)),
      map(([, filters]) =>
        ListingsActions.loadListings({ filters, reset: false })
      )
    );
  },
  { functional: true }
);

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
  loadMoreListings,
  updateMapBounds,
};

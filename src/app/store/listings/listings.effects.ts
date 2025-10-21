// src/app/store/listings/listings.effects.ts
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ListingsActions } from './listings.actions';
import {
  map,
  catchError,
  switchMap,
  withLatestFrom,
  tap,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { ListingService } from '../../services/listing-service/listing.service';
import { Store } from '@ngrx/store';
import { selectListingsPage } from './listings.selectors';

export const loadListings = createEffect(
  (
    actions$ = inject(Actions),
    listingService = inject(ListingService),
    store = inject(Store)
  ) => {
    return actions$.pipe(
      ofType(ListingsActions.loadListings),
      withLatestFrom(store.select(selectListingsPage)),
      switchMap(([{ filters, reset }, currentPage]) => {
        // ✅ CRITICAL FIX: When not resetting, load the NEXT page
        const pageToLoad = reset ? 1 : currentPage + 1;

        console.log('🔥 Effect triggered:', {
          reset,
          currentPage,
          pageToLoad,
          filters,
        });

        return listingService
          .getListingsWithBBox(filters.bounds!, pageToLoad, 20, {
            type: filters.type,
            query: filters.query,
            locationName: filters.locationName,
          })
          .pipe(
            map((response) => {
              console.log('✅ API Response:', {
                listingsCount: response.listings.length,
                listingIds: response.listings.map((l) => l.id),
                total: response.total,
                pageLoaded: pageToLoad,
                append: !reset,
              });

              return ListingsActions.loadListingsSuccess({
                listings: response.listings,
                total: response.total,
                append: !reset,
              });
            }),
            catchError((error) => {
              console.error('❌ API Error:', error);
              return of(
                ListingsActions.loadListingsFailure({
                  error: error.message || 'Failed to load listings',
                })
              );
            })
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

// src/app/store/listings/listings.effects.ts
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ListingsActions } from './listings.actions';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';
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
      switchMap(([{ filters, reset, limit }, currentPage]) => {
        // Determine page and limit
        const isFullFetch = limit === 0; // convention: limit=0 means fetch all
        const pageToLoad = isFullFetch || reset ? 1 : currentPage + 1;
        const fetchLimit = isFullFetch ? undefined : limit ?? 20;

        return listingService
          .getListingsWithBBox(filters.bounds!, pageToLoad, fetchLimit, {
            type: filters.type,
            query: filters.query,
            locationName: filters.locationName,
          })
          .pipe(
            map((response) =>
              ListingsActions.loadListingsSuccess({
                listings: response.listings,
                total: response.total,
                append: !reset && !isFullFetch, // append only for paginated scroll
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

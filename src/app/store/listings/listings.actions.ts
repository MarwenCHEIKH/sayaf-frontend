// src/app/store/listings/listings.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Listing } from '../../models/listing.model';
import { ListingsFilters } from './listings.state';
import { MapBounds } from '../../models/map.model';

export const ListingsActions = createActionGroup({
  source: 'Listings',
  events: {
    'Load Listings': props<{
      filters: Partial<ListingsFilters>;
      reset?: boolean;
    }>(),
    'Load Listings Success': props<{
      listings: Listing[];
      total: number;
      append: boolean;
    }>(),
    'Load Listings Failure': props<{ error: string }>(),
    'Load More Listings': emptyProps(),
    'Update Filters': props<{ filters: Partial<ListingsFilters> }>(),
    'Update Map Bounds': props<{ bounds: MapBounds }>(),
    'Select Listing': props<{ id: number }>(),
    'Clear Selection': emptyProps(),
    'Reset Listings': emptyProps(),
  },
});

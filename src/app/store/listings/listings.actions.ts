// src/app/store/listings/listings.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Listing } from '../../models/listing.model';
import { ListingsFilters } from './listings.state';
import { MapBounds } from '../../models/map.model';

export const ListingsActions = createActionGroup({
  source: 'Listings',
  events: {
    // Load listings from API
    'Load Listings': props<{
      filters: Partial<ListingsFilters>;
      reset?: boolean;
    }>(),
    'Load Listings Success': props<{
      listings: Listing[];
    }>(),
    'Load Listings Failure': props<{ error: string }>(),

    // Update API-level filters
    'Update Filters': props<{ filters: Partial<ListingsFilters> }>(),
    'Update Map Bounds': props<{ bounds: MapBounds }>(),

    // Selection
    'Select Listing': props<{ id: number }>(),
    'Clear Selection': emptyProps(),

    // Reset
    'Reset Listings': emptyProps(),
  },
});

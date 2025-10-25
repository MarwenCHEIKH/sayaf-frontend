// src/app/store/listings/listings.actions.ts
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Listing } from '../../models/listing.model';
import { ListingsFilters } from './listings.state';
import { MapBounds } from '../../models/map.model';
import { ClusterMarker } from '../../services/listing-service/listing.service';

export const ListingsActions = createActionGroup({
  source: 'Listings',
  events: {
    'Load Listings': props<{
      filters: Partial<ListingsFilters>;
      reset?: boolean;
      limit?: number;
      zoom?: number; // NEW: optional zoom for tier-based fetching
    }>(),
    'Load Listings Success': props<{
      listings?: Listing[];
      clusters?: ClusterMarker[];
      tier?: 'COUNTRY' | 'STATE' | 'CITY';
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

// src/app/store/listings/listings.state.ts
import { ListingWithPhotos } from '../../models/listing.model';

export interface ListingsFilters {
  locationName: string; // Name of the selected location (city, village, state)

  // Optional bounding box (used when "search as map moves" is ON)
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  // Filters applied on listings
  type?: string[];
  query?: string;
}

export interface ListingsState {
  items: ListingWithPhotos[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: ListingsFilters;
  page: number;
  hasMore: boolean;
  selectedListingId?: number;
}

export const initialListingsState: ListingsState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  filters: {
    locationName: 'Tunis',
    // Bounding box for Tunis (optional: used if search-as-map-moves is ON)
    bounds: {
      north: 36.9430196,
      south: 36.6925111,
      east: 10.3548099,
      west: 10.0037899,
    },
    type: [], // default: no type filter
    query: '', // default: empty search
  },
  page: 1,
  hasMore: true,
};

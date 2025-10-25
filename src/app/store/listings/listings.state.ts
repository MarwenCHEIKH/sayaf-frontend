// src/app/store/listings/listings.state.ts
import { ListingWithPhotos } from '../../models/listing.model';
import { ClusterMarker } from '../../services/listing-service/listing.service';

export interface ListingsFilters {
  locationName: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  type?: string[];
  query?: string;
}

export interface ListingsState {
  items: ListingWithPhotos[];
  clusters: ClusterMarker[]; // NEW: for STATE/COUNTRY tiers
  tier?: 'COUNTRY' | 'STATE' | 'CITY'; // NEW: current tier
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
  clusters: [],
  tier: undefined,
  total: 0,
  loading: false,
  error: null,
  filters: {
    locationName: 'Tunis',
    bounds: {
      north: 36.9430196,
      south: 36.6925111,
      east: 10.3548099,
      west: 10.0037899,
    },
    type: [],
    query: '',
  },
  page: 1,
  hasMore: true,
};

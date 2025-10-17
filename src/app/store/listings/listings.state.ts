// src/app/store/listings/listings.state.ts
import { Listing } from '../../models/listing.model';

export interface ListingsFilters {
  location: { lat: number; lng: number };
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  type?: string[];
  query?: string;
  radius?: number; // in km
}

export interface ListingsState {
  items: Listing[]; // All listings from API
  total: number; // Total count from API
  loading: boolean;
  error: string | null;
  filters: ListingsFilters; // API-level filters
  selectedListingId?: number;
}

export const initialListingsState: ListingsState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  filters: {
    location: { lat: 36.8065, lng: 10.1815 },
    radius: 10,
  },
};

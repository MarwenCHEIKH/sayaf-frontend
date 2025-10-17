export interface Listing {
  id: number;
  name: string;
  type: string[];
  vicinity?: string;
  formatted_address?: string;
  location_point?: string;
  price?: number;
  rating?: number | undefined;
  user_ratings_total: number;
  phone_number?: string;
  website?: string;
  opening_hours?: any;
  images: string[];
  photo_references: string[];
  google_place_id: string;
}
export interface ListingWithPhotos extends Listing {
  photoUrls?: string[];
}

export interface ListingsResponse {
  listings: ListingWithPhotos[];
  total: number;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
  city?: string;
  detected?: boolean;
}

export interface LocationSearchResult {
  city: string;
  lat: number;
  lng: number;
  displayName: string;
}

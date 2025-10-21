export interface LocationCoordinates {
  locationName: string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  lat?: number;
  lng?: number;
  detected: boolean;
}

export interface LocationSearchResult {
  locationName: string;
  lat?: number;
  lng?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  displayName: string;
  type?: string;
}

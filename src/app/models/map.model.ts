export interface MarkerData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string[];
  photo?: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapMoveEvent {
  bounds: MapBounds;
  center: { lat: number; lng: number };
  zoom: number;
}

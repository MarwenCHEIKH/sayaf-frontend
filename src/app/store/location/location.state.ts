import { LocationCoordinates } from '../../models/location.model';

export interface LocationState {
  current: LocationCoordinates;
  loading: boolean;
  error: string | null;
}

export const initialLocationState: LocationState = {
  current: {
    lat: 36.8065,
    lng: 10.1815,
    city: 'Tunis',
    detected: false,
  },
  loading: false,
  error: null,
};

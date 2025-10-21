import { LocationCoordinates } from '../../models/location.model';

export interface LocationState {
  current: LocationCoordinates | null;
  loading: boolean;
  error: string | null;
}

export const initialLocationState: LocationState = {
  current: {
    locationName: 'Tunis',
    bounds: {
      north: 36.9430196,
      south: 36.6925111,
      east: 10.3548099,
      west: 10.0037899,
    },
    detected: false,
  },
  loading: false,
  error: null,
};

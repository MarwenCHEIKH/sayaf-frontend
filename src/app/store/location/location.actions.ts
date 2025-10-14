import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { LocationCoordinates } from '../../models/location.model';

export const LocationActions = createActionGroup({
  source: 'Location',
  events: {
    'Load Current Location': emptyProps(),
    'Load Current Location Success': props<{ location: LocationCoordinates }>(),
    'Load Current Location Failure': props<{ error: string }>(),
    'Set Manual Location': props<{ location: LocationCoordinates }>(),
  },
});

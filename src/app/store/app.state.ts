// src/app/store/app.state.ts
import { LanguageState } from './i18n/language.reducer';
import { ListingsState } from './listings/listings.state';
import { LocationState } from './location/location.state';

export interface AppState {
  location: LocationState;
  language: LanguageState;
  listings: ListingsState;
}

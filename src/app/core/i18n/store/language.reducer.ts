import { createReducer, on } from '@ngrx/store';
import { setLanguage } from './language.actions';

export interface LanguageState {
  currentLanguage: string;
}

export const initialState: LanguageState = {
  currentLanguage: 'en', // default language
};

export const languageReducer = createReducer(
  initialState,
  on(setLanguage, (state, { language }) => ({
    ...state,
    currentLanguage: language,
  }))
);

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LanguageState } from './language.reducer';

export const selectLanguageState =
  createFeatureSelector<LanguageState>('language');

export const selectCurrentLanguage = createSelector(
  selectLanguageState,
  (state) => state.currentLanguage
);

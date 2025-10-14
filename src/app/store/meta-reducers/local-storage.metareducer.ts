import { ActionReducer, MetaReducer } from '@ngrx/store';
import { AppState } from '../app.state';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { inject } from '@angular/core';

const STORAGE_KEY = 'locationState';

export function localStorageSyncReducer(
  reducer: ActionReducer<AppState>
): ActionReducer<AppState> {
  // We can't inject PLATFORM_ID directly in a MetaReducer factory
  // So we check for window/localStorage existence instead
  return (state, action) => {
    const nextState = reducer(state, action);

    // Only persist in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (nextState && nextState.location) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState.location));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
      }
    }

    return nextState;
  };
}

export function getInitialLocationState() {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : undefined;
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return undefined;
    }
  }

  // Return undefined for SSR
  return undefined;
}

export const metaReducers: MetaReducer<AppState>[] = [localStorageSyncReducer];

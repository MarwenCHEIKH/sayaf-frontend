import {
  ApplicationConfig,
  provideZoneChangeDetection,
  PLATFORM_ID,
  provideAppInitializer,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { languageInterceptor } from './core/i18n/language.interceptor';
import { LanguageService } from './core/i18n/language.service';
import { routes } from './app.routes';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { provideStore } from '@ngrx/store';
import { languageReducer } from './store/i18n/language.reducer';
import { locationReducer } from './store/location/location.reducer';
import { provideEffects } from '@ngrx/effects';
import { locationEffects } from './store/location/location.effects';
import { listingsEffects } from './store/listings/listings.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import {
  getInitialLocationState,
  metaReducers,
} from './store/meta-reducers/local-storage.metareducer';
import { AppState } from './store/app.state';
import { listingsReducer } from './store/listings/listings.reducer';

let fs: any;
try {
  fs = require('fs');
} catch {
  fs = null;
}

export class PlatformAwareTranslateLoader implements TranslateLoader {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  getTranslation(lang: string): Observable<any> {
    if (isPlatformBrowser(this.platformId)) {
      return this.http.get(`/assets/i18n/${lang}.json`).pipe(
        tap({
          next: () => console.log(`[TranslateLoader] ${lang}.json loaded ✅`),
          error: (err) =>
            console.error(`[TranslateLoader] ${lang}.json failed ❌`, err),
        })
      );
    }

    if (isPlatformServer(this.platformId) && fs) {
      const filePath = `dist/browser/assets/i18n/${lang}.json`;
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        return of(JSON.parse(data));
      } catch (e) {
        console.error(`[SSR TranslateLoader] ${lang}.json failed ❌`, e);
        return of({});
      }
    }

    return of({});
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptors([languageInterceptor])),
    provideStore<AppState>(
      {
        language: languageReducer,
        location: locationReducer,
        listings: listingsReducer,
      },
      {
        metaReducers,
        initialState: {
          location: getInitialLocationState(),
        },
      }
    ),

    provideEffects(locationEffects, listingsEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideTranslateService({
      fallbackLang: 'en',
      loader: {
        provide: TranslateLoader,
        useClass: PlatformAwareTranslateLoader,
      },
    }),
    provideAppInitializer(() => {
      const langService = inject(LanguageService);
      return langService.initialize(); // must return a Promise
    }),
  ],
};

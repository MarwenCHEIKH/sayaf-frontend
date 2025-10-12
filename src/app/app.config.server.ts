import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

// Custom loader that returns empty translations for SSR
export class ServerTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideTranslateService({
      fallbackLang: 'en',
      loader: {
        provide: TranslateLoader,
        useClass: ServerTranslateLoader,
      },
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

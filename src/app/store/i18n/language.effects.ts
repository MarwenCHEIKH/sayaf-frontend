// src/app/core/i18n/store/language.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { setLanguage } from './language.actions';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class LanguageEffects {
  private actions$ = inject(Actions);
  private translate = inject(TranslateService);

  // Sync NgRx state changes with TranslateService
  syncLanguage$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(setLanguage),
        tap(({ language }) => {
          // Only update if different from current
          if (this.translate.getCurrentLang() !== language) {
            this.translate.use(language);
          }
        })
      ),
    { dispatch: false }
  );
}

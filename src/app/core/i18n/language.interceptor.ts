import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandler,
} from '@angular/common/http';
import { Store } from '@ngrx/store';
import { selectCurrentLanguage } from './store/language.selectors';
import { take } from 'rxjs/operators';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  let lang = 'en';

  // Use take(1) to get the current language synchronously
  store
    .select(selectCurrentLanguage)
    .pipe(take(1))
    .subscribe((l) => (lang = l));

  const cloned = req.clone({
    setHeaders: { 'Accept-Language': lang },
  });

  return next(cloned);
};

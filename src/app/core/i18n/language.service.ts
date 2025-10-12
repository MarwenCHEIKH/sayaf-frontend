import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { setLanguage } from './store/language.actions';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  mapBrowserLanguage,
} from './language.config';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);
  private store = inject(Store);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private initialized = false;

  constructor() {
    // Don't initialize in constructor - use APP_INITIALIZER instead
    this.translate.addLangs(SUPPORTED_LANGUAGES.map((l) => l.code));
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const initialLang = this.getInitialLanguage();

    try {
      // Load translation before using it
      await firstValueFrom(this.translate.use(initialLang));
    } catch (error) {
      console.error('❌ Failed to load translations:', error);
      // Fallback to default language if loading fails
      await firstValueFrom(this.translate.use(DEFAULT_LANGUAGE));
    }

    if (this.isBrowser) {
      this.applyTextDirection(initialLang);
    }

    // Store initial language in NgRx AFTER translations are loaded
    this.store.dispatch(setLanguage({ language: initialLang }));

    this.initialized = true;
    if (this.isBrowser) {
      document.body.classList.add('translations-ready');
    }
  }

  public async setLanguage(lang: string): Promise<void> {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === lang)) {
      lang = DEFAULT_LANGUAGE;
    }

    // Wait for translation to load
    await firstValueFrom(this.translate.use(lang));

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, lang);
    }

    this.applyTextDirection(lang);
    this.store.dispatch(setLanguage({ language: lang }));
  }

  public getCurrentLanguage(): string {
    return this.translate.currentLang || DEFAULT_LANGUAGE;
  }

  private getInitialLanguage(): string {
    if (!this.isBrowser) {
      return DEFAULT_LANGUAGE;
    }

    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
      return stored;
    }

    const browserLang = mapBrowserLanguage(
      this.translate.getBrowserLang() || ''
    );

    localStorage.setItem(STORAGE_KEY, browserLang);

    return browserLang;
  }

  private applyTextDirection(lang: string): void {
    const dir =
      SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.direction || 'ltr';
    if (this.isBrowser) {
      document.documentElement.dir = dir;
      document.body.classList.remove('ltr', 'rtl');
      document.body.classList.add(dir);
    }
  }
}

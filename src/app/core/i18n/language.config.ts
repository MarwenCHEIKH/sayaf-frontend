// src/app/core/i18n/language.config.ts

export interface LanguageOption {
  code: string;
  label: string;
  direction: 'ltr' | 'rtl';
  flag?: string; // Optional emoji or icon class
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', direction: 'ltr', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', direction: 'ltr', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', direction: 'rtl', flag: '🇹🇳' },
  // To add Tounsi later, simply add:
  // { code: 'aeb-TN', label: 'تونسي', direction: 'rtl', flag: '🇹🇳' }
];

export const DEFAULT_LANGUAGE = 'en';
export const STORAGE_KEY = 'app_language';

/**
 * Maps browser language codes to supported languages
 * Handles variations like 'en-US' -> 'en', 'ar-TN' -> 'ar'
 */
export function mapBrowserLanguage(browserLang: string): string {
  if (!browserLang) return DEFAULT_LANGUAGE;

  const normalizedLang = browserLang.toLowerCase();

  // Check for exact match first
  if (SUPPORTED_LANGUAGES.some((lang) => lang.code === normalizedLang)) {
    return normalizedLang;
  }

  // Check for language prefix (e.g., 'en-US' -> 'en')
  const prefix = normalizedLang.split('-')[0];
  const matchedLang = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.startsWith(prefix) || prefix === lang.code.split('-')[0]
  );

  return matchedLang ? matchedLang.code : DEFAULT_LANGUAGE;
}

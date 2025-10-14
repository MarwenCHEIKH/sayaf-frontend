// src/app/core/i18n/components/language-switcher/language-switcher.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ClickOutsideDirective } from '../../../../directives/clickOutside/click-outside.directive';
import { LanguageService } from '../../language.service';
import { Store } from '@ngrx/store';
import { selectCurrentLanguage } from '../../../../store/i18n/language.selectors';
import { Observable } from 'rxjs';
import { LanguageOption, SUPPORTED_LANGUAGES } from '../../language.config';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule, ClickOutsideDirective],
  templateUrl: './language-switcher.component.html',
  styleUrls: ['./language-switcher.component.scss'],
})
export class LanguageSwitcherComponent {
  languages: LanguageOption[] = SUPPORTED_LANGUAGES;
  currentLanguage$: Observable<string>;
  isDropdownOpen = false;

  private store = inject(Store);
  private languageService = inject(LanguageService);

  constructor() {
    this.currentLanguage$ = this.store.select(selectCurrentLanguage);
  }

  switchLanguage(langCode: string): void {
    // Use service method which properly handles TranslateService
    this.languageService.setLanguage(langCode);
    this.isDropdownOpen = false;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }
}

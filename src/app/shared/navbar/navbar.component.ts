// src/app/components/navbar/navbar.component.ts
import {
  Component,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  Router,
  NavigationEnd,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { HasRoleDirective } from '../../directives/hasRole/has-role.directive';
import { LanguageSwitcherComponent } from '../../core/i18n/components/language-switcher/language-switcher.component';
import { Store } from '@ngrx/store';
import { selectCurrentLanguage } from '../../core/i18n/store/language.selectors';
import { Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    HasRoleDirective,
    TranslateModule,
    LanguageSwitcherComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class Navbar implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  private store = inject(Store);

  isMobileMenuOpen = false;
  isDropdownOpen = false;
  isHomePage = false;
  currentLang: string | undefined;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Listen to route changes
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.isHomePage = event.urlAfterRedirects === '/';
      });

    // Subscribe to language changes
    this.store
      .select(selectCurrentLanguage)
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        this.currentLang = lang;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.isMobileMenuOpen ? 'hidden' : '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.dropdown');
    if (!dropdown && this.isDropdownOpen) {
      this.closeDropdown();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (
      typeof window !== 'undefined' &&
      window.innerWidth > 968 &&
      this.isMobileMenuOpen
    ) {
      this.closeMobileMenu();
    }
  }

  logout() {
    this.authService.logout();
  }
}

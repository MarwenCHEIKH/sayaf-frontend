// ============= auth.guard.ts =============
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

// ============= admin.guard.ts =============
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (authService.isAdmin()) {
    return true;
  }

  // User is authenticated but not admin
  router.navigate(['/unauthorized']);
  return false;
};
export const roleGuard = (
  allowedRoles: Array<'user' | 'admin'>
): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const userRole = authService.getUserRole();
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    console.warn(`Access denied: Required roles: ${allowedRoles.join(', ')}`);
    router.navigate(['/unauthorized']);
    return false;
  };
};

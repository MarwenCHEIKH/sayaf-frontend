import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import {
  adminGuard,
  authGuard,
  roleGuard,
} from './core/auth/guards/auth.guard';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./core/auth/oauth-callback/oauth-callback.component').then(
        (m) => m.OAuthCallbackComponent
      ),
  },

  // ADMIN ONLY - Dashboard
  {
    path: 'dashboard',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },

  // USER ONLY - Add Listing (regular users, not admins)
  {
    path: 'add-listing',
    canActivate: [roleGuard(['user'])], // Only users with role 'user'
    loadComponent: () =>
      import('./features/add-listing/add-listing.component').then(
        (m) => m.AddListingComponent
      ),
  },
  //display listings
  {
    path: 'listings',
    loadComponent: () =>
      import('./features/listings/listings.component').then(
        (m) => m.ListingsComponent
      ),
  },

  {
    path: 'location-picker',
    loadComponent: () =>
      import('./shared/location-picker/location-picker.component').then(
        (m) => m.LocationPickerComponent
      ),
  },
];

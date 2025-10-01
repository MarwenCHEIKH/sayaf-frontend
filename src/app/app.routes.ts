import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: { prerender: true }, // public landing page
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  // protected routes
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  { path: '**', redirectTo: '' }, // fallback
];

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/services/auth.service';
import { HasRoleDirective } from '../../directives/has-role.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, HasRoleDirective],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class Navbar {
  authService = inject(AuthService);

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  logout() {
    this.authService.logout();
  }
}

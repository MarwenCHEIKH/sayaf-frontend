import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  onLogin() {
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.access_token);
        this.router.navigate(['/dashboard']);
      },
      error: (err) =>
        alert('Login failed: ' + (err.error?.message || err.message)),
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      const error = params['error'];
      const provider = params['provider'];

      if (token) {
        localStorage.setItem('jwt', token);
        this.router.navigate(['/home']);
      } else if (provider === 'facebook') {
        this.router.navigate(['/complete-profile']);
      } else if (error) {
        alert('Authentication failed. Please try again.');
      }
    });
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google/redirect`;
  }
  loginWithFacebook() {
    window.location.href = `${environment.apiUrl}/auth/facebook/redirect`;
  }
}

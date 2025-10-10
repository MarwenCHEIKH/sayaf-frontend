import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"
        ></div>
        <p class="mt-4 text-gray-600">{{ message }}</p>
      </div>
    </div>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  message = 'Processing authentication...';

  ngOnInit() {
    // Only run browser-dependent code in browser
    if (!isPlatformBrowser(this.platformId)) {
      this.message = 'Preparing authentication...';
      return;
    }

    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      const token = params['token'];
      const provider = params['provider'];
      const error = params['error'];
      const isNewUser = params['new_user'] === 'true';
      const needsEmailVerification = params['verify_email'] === 'true';
      const needsProfileCompletion = params['complete_profile'] === 'true';

      if (error) {
        this.message = 'Authentication failed. Redirecting...';
        console.error(`${provider} OAuth error:`, error);

        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { error: 'oauth_failed' },
          });
        }, 2000);
        return;
      }

      if (token) {
        try {
          // AuthService should be SSR-safe internally
          this.authService.handleOAuthCallback(token, provider);

          // Handle post-login scenarios
          if (needsProfileCompletion) {
            this.message = 'Please complete your profile...';
            setTimeout(() => {
              this.router.navigate(['/profile/complete'], {
                queryParams: { reason: 'missing_email' },
              });
            }, 1500);
          } else if (needsEmailVerification) {
            this.message = 'Please verify your email...';
            setTimeout(() => {
              this.router.navigate(['/verify-email']);
            }, 1500);
          } else if (isNewUser) {
            this.message = 'Welcome! Setting up your account...';
            setTimeout(() => {
              this.router.navigate(['']); // changed from /welcome
            }, 1500);
          } else {
            this.message = 'Login successful! Redirecting...';
            setTimeout(() => {
              this.router.navigate(['/']);
            }, 1500);
          }
        } catch (err) {
          console.error('Error processing OAuth callback:', err);
          this.router.navigate(['/login'], {
            queryParams: { error: 'token_invalid' },
          });
        }
      } else {
        this.router.navigate(['/login'], {
          queryParams: { error: 'no_token' },
        });
      }
    });
  }
}

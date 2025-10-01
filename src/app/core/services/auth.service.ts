import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  private apiUrl = 'http://localhost:3000'; // your NestJS backend

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<{ access_token: string }>(`${this.apiUrl}/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem('token', res.access_token);
        })
      );
  }

  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register`, {
      name,
      email,
      password,
    });
  }

  isAuthenticated(): boolean {
    // ✅ Only access localStorage in browser
    if (isPlatformBrowser(this.platformId)) {
      return !!localStorage.getItem('token');
    }
    return false; // server-side: assume not authenticated
  }
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  setToken(token: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
  }
  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
  }
}

import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable, BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface DecodedToken {
  sub: string; // user ID
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeUser();
  }

  private apiUrl = 'http://localhost:3000';

  // Observable for reactive role checking
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private initializeUser() {
    const token = this.getToken();
    if (token) {
      const decoded = this.decodeToken(token);
      if (decoded && !this.isTokenExpired(decoded)) {
        this.currentUserSubject.next({
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        });
      } else {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<any> {
    return this.http
      .post<{ access_token: string }>(`${this.apiUrl}/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((res) => {
          this.setToken(res.access_token);
          this.initializeUser();
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

  /**
   * Handle OAuth callback - call this from your callback component
   */
  handleOAuthCallback(token: string, provider: string) {
    this.setToken(token);
    this.initializeUser();

    const user = this.currentUserSubject.value;
    console.log(`${provider} login successful for ${user?.email}`);
  }

  isAuthenticated(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getToken();
      if (!token) return false;

      const decoded = this.decodeToken(token);
      return decoded ? !this.isTokenExpired(decoded) : false;
    }
    return false;
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
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Decode JWT token without verification (verification happens on backend)
   */
  private decodeToken(token: string): DecodedToken | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(decoded: DecodedToken): boolean {
    const expirationDate = new Date(decoded.exp * 1000);
    return expirationDate < new Date();
  }

  /**
   * Get current user info
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get user role
   */
  getUserRole(): 'user' | 'admin' | null {
    const user = this.currentUserSubject.value;
    return user?.role || null;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  /**
   * Check if user is regular user
   */
  isUser(): boolean {
    return this.getUserRole() === 'user';
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'user' | 'admin'): boolean {
    return this.getUserRole() === role;
  }
}

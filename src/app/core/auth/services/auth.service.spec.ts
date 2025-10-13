import { TestBed } from '@angular/core/testing';
import { AuthService, DecodedToken, User } from './auth.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mock localStorage for browser environment
    const store: Record<string, string> = {};
    spyOn(window.localStorage, 'getItem').and.callFake(
      (key: string) => store[key] || null
    );
    spyOn(window.localStorage, 'setItem').and.callFake(
      (key: string, value: string) => (store[key] = value)
    );
    spyOn(window.localStorage, 'removeItem').and.callFake(
      (key: string) => delete store[key]
    );
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should store and retrieve token', () => {
    service.setToken('abc123');
    expect(service.getToken()).toBe('abc123');
  });

  it('should remove token on logout and navigate to /login', () => {
    service.setToken('abc123');
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should decode valid token', () => {
    const mockPayload = {
      sub: '1',
      email: 'a@a.com',
      role: 'user',
      iat: 1,
      exp: 9999999999,
    };
    const token = `header.${btoa(JSON.stringify(mockPayload))}.sig`;
    const decoded = (service as any).decodeToken(token);
    expect(decoded?.email).toBe('a@a.com');
    expect(decoded?.role).toBe('user');
  });

  it('should detect expired token', () => {
    const decoded: DecodedToken = {
      sub: '1',
      email: 'a@a.com',
      role: 'user',
      iat: 1,
      exp: 1, // long expired
    };
    const isExpired = (service as any).isTokenExpired(decoded);
    expect(isExpired).toBeTrue();
  });

  it('should call login API and set token', () => {
    const mockResponse = { access_token: 'jwt.token.here' };
    service.login('test@test.com', '1234').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'token',
      mockResponse.access_token
    );
  });

  it('should call register API', () => {
    const mockResponse = { id: 1, email: 'x@test.com' };
    service.register('x', 'x@test.com', '1234').subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('http://localhost:3000/users/register');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should update currentUserSubject after login with valid token', () => {
    const payload = {
      sub: '1',
      email: 'u@a.com',
      role: 'user',
      iat: 1,
      exp: 9999999999,
    };
    const token = `h.${btoa(JSON.stringify(payload))}.s`;

    // manually simulate token already set
    service.setToken(token);
    (service as any).initializeUser();

    const user = service.getCurrentUser();
    expect(user?.email).toBe('u@a.com');
    expect(user?.role).toBe('user');
  });

  it('should return false for unauthenticated user', () => {
    window.localStorage.removeItem('token');
    expect(service.isAuthenticated()).toBeFalse();
  });
});

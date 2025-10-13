import { TestBed } from '@angular/core/testing';
import { HasRoleDirective } from './has-role.directive';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/auth/services/auth.service';
import { Component } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';

// Create a test component to host the directive
@Component({
  template: `
    <div *appHasRole="'admin'" id="admin-content">Admin Content</div>
    <div *appHasRole="['user', 'admin']" id="multiple-roles">
      Multiple Roles Content
    </div>
  `,
  standalone: true,
  imports: [HasRoleDirective],
})
class TestHostComponent {}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let authService: any;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(() => {
    currentUserSubject = new BehaviorSubject({
      id: '1',
      email: 'test@test.com',
      role: 'admin',
    });

    const authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      getUserRole: jasmine.createSpy('getUserRole').and.returnValue('admin'),
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({
        id: '1',
        email: 'test@test.com',
        role: 'admin',
      }),
    };

    TestBed.configureTestingModule({
      imports: [TestHostComponent, HasRoleDirective],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    authService = TestBed.inject(AuthService);
  });

  it('should display admin content for admin role', () => {
    fixture.detectChanges();
    const adminContent = fixture.nativeElement.querySelector('#admin-content');
    expect(adminContent).toBeTruthy();
    expect(adminContent.textContent).toContain('Admin Content');
  });

  it('should display multiple roles content for admin role', () => {
    fixture.detectChanges();
    const multiContent = fixture.nativeElement.querySelector('#multiple-roles');
    expect(multiContent).toBeTruthy();
    expect(multiContent.textContent).toContain('Multiple Roles Content');
  });

  it('should hide admin content when user role is not allowed', () => {
    authService.getUserRole.and.returnValue('user');
    currentUserSubject.next({ id: '1', email: 'test@test.com', role: 'user' });
    fixture.detectChanges();

    const adminContent = fixture.nativeElement.querySelector('#admin-content');
    expect(adminContent).toBeNull();
  });

  it('should hide admin content when user is null', () => {
    authService.getUserRole.and.returnValue(null);
    currentUserSubject.next(null);
    fixture.detectChanges();

    const adminContent = fixture.nativeElement.querySelector('#admin-content');
    expect(adminContent).toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Navbar } from './navbar.component';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ActivatedRoute } from '@angular/router';
import {
  TranslateModule,
  TranslateService,
  TranslateStore,
} from '@ngx-translate/core';
import { of, Subject } from 'rxjs';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Navbar,
        TranslateModule.forRoot(), // Import the full TranslateModule
      ],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideMockStore({
          initialState: {
            language: {
              currentLanguage: 'en',
            },
          },
        }),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } },
        },
        TranslateService,
        TranslateStore,
      ],
    }).compileComponents();

    // Get the TranslateService and set up mock translations
    const translateService = TestBed.inject(TranslateService);
    translateService.setDefaultLang('en');
    translateService.use('en');

    // Mock the translations
    translateService.setTranslation('en', {
      common: {
        signup: 'Sign Up',
        // Add other translations your component uses
      },
    });

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

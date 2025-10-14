# TunisiaHub.tn Frontend

TunisiaHub is a Tunisian directory platform for discovering restaurants, hotels, cafés and more ...  
This repository contains the **Angular 19 frontend**.

---

## **Tech Stack**

- Angular 19 (Standalone + NgRx)
- RxJS
- ngx-translate for i18n
- Authentication: Google + facebook
- NgRx for global state (language slice)
- Responsive UI with dynamic navbar and mobile menu
- Directives: `HasRole`, `ClickOutside`
- Testing: Karma + Jasmine (unit)

---

## **Current Features**

✅ Authentication:

- Login / Register (facebook + Google)
- AuthGuard for role-based access
- OAuthCallbackComponent for social login handling

✅ i18n:

- Nested JSON translation keys
- NgRx store for language management
- Browser language detection & localStorage persistence
- Dynamic RTL support for Arabic
- Language switcher component
- HTTP interceptor adds `Accept-Language` header

✅ UI Components:

- Dynamic, responsive navbar
- Listings component and service
- Add-listing component (partial)
- Home page
- Directives: `HasRole`, `ClickOutside`

---

## **Setup & Running Locally**

```bash
git clone https://github.com/yourusername/tunisiahub-frontend.git
cd tunisiahub-frontend
npm install
npm start
App runs at http://localhost:4200.

Testing
Run unit tests:
npm run test
```

# Architecture Overview

## Folder Structure

.
├── README.md
├── angular.json
├── package-lock.json
├── package.json
├── public
│   └── favicon.ico
├── src
│   ├── app
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.component.spec.ts
│   │   ├── app.component.ts
│   │   ├── app.config.server.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── core
│   │   │   ├── auth
│   │   │   │   ├── guards
│   │   │   │   │   ├── auth.guard.spec.ts
│   │   │   │   │   └── auth.guard.ts
│   │   │   │   ├── oauth-callback
│   │   │   │   │   ├── oauth-callback.component.html
│   │   │   │   │   ├── oauth-callback.component.scss
│   │   │   │   │   ├── oauth-callback.component.spec.ts
│   │   │   │   │   └── oauth-callback.component.ts
│   │   │   │   └── services
│   │   │   │   ├── auth.service.spec.ts
│   │   │   │   └── auth.service.ts
│   │   │   └── i18n
│   │   │   ├── components
│   │   │   │   └── language-switcher
│   │   │   ├── language.config.ts
│   │   │   ├── language.interceptor.ts
│   │   │   ├── language.service.ts
│   │   │   └── store
│   │   │   ├── language.actions.ts
│   │   │   ├── language.effects.ts
│   │   │   ├── language.reducer.ts
│   │   │   └── language.selectors.ts
│   │   ├── directives
│   │   │   ├── clickOutside
│   │   │   │   ├── click-outside.directive.spec.ts
│   │   │   │   └── click-outside.directive.ts
│   │   │   └── hasRole
│   │   │   ├── has-role.directive.spec.ts
│   │   │   └── has-role.directive.ts
│   │   ├── features
│   │   │   ├── add-listing
│   │   │   │   ├── add-listing.component.html
│   │   │   │   ├── add-listing.component.scss
│   │   │   │   ├── add-listing.component.spec.ts
│   │   │   │   └── add-listing.component.ts
│   │   │   ├── dashboard
│   │   │   │   ├── dashboard.component.html
│   │   │   │   ├── dashboard.component.scss
│   │   │   │   ├── dashboard.component.spec.ts
│   │   │   │   └── dashboard.component.ts
│   │   │   └── listings
│   │   │   ├── listings.component.html
│   │   │   ├── listings.component.scss
│   │   │   ├── listings.component.spec.ts
│   │   │   └── listings.component.ts
│   │   ├── models
│   │   │   └── listing.model.ts
│   │   ├── pages
│   │   │   ├── auth
│   │   │   │   ├── login
│   │   │   │   │   ├── login.component.html
│   │   │   │   │   ├── login.component.scss
│   │   │   │   │   ├── login.component.spec.ts
│   │   │   │   │   └── login.component.ts
│   │   │   │   └── register
│   │   │   │   ├── register.component.html
│   │   │   │   ├── register.component.scss
│   │   │   │   ├── register.component.spec.ts
│   │   │   │   └── register.component.ts
│   │   │   └── home
│   │   │   ├── home.component.html
│   │   │   ├── home.component.scss
│   │   │   ├── home.component.spec.ts
│   │   │   └── home.component.ts
│   │   ├── services
│   │   │   ├── listing.service.spec.ts
│   │   │   └── listing.service.ts
│   │   └── shared
│   │   ├── directives
│   │   │   └── lazy-load-video.directive.ts
│   │   └── navbar
│   │   ├── navbar.component.html
│   │   ├── navbar.component.scss
│   │   ├── navbar.component.spec.ts
│   │   └── navbar.component.ts
│   ├── assets
│   │   ├── i18n
│   │   │   ├── ar.json
│   │   │   ├── en.json
│   │   │   └── fr.json
│   │   ├── images
│   │   │   └── poster.jpg
│   │   └── videos
│   │   └── background.mp4
│   ├── environments
│   │   ├── environment.prod.ts
│   │   └── environment.ts
│   ├── index.html
│   ├── main.server.ts
│   ├── main.ts
│   ├── server.ts
│   ├── styles
│   │   └── theme.scss
│   └── styles.scss
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json

## **Explanation**

- **`src/app/core`**: Core application logic (auth, i18n, global services).
- **`src/app/features`**: Feature modules/components (dashboard, listings, add-listing).
- **`src/app/pages`**: Page-level components (home, auth/login, auth/register).
- **`src/app/services`**: Shared services for API interactions.
- **`src/app/shared`**: Reusable components and directives (navbar, lazy-loading directive).
- **`src/assets`**: Static assets (images, videos, translation files).
- **`src/environments`**: Environment-specific configuration files.
- **NgRx Store**:
  - `language` slice
  - Future slices: `user`, `listings`, etc.

## Routing & Guards

- `AuthGuard` for protected routes
- `HasRoleDirective` for role-based UI visibility
- OAuthCallbackComponent handles social login redirects

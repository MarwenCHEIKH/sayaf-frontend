# Feature: Map + Listings — Phase 1: Location Handling

## Overview

This phase implements location detection and management for the TunisiaHub frontend.

It includes:

- Location models and interfaces
- LocationService with geolocation, IP fallback, and caching
- NgRx state management for current location
- LocationPicker component for manual selection
- Integration with app store configuration

---

## 1. Location Models

**Purpose:** Define data structures for locations.

**Models:**

- `LocationCoordinates`: Represents a location with latitude, longitude, optional city, and detection flag.
- `LocationSearchResult`: Represents a search result from OpenStreetMap with city, coordinates, and display name.

**File:** `src/app/models/location.model.ts`

````typescript
export interface LocationCoordinates {
  lat: number;
  lng: number;
  city?: string;
  detected?: boolean;
}

export interface LocationSearchResult {
  city: string;
  lat: number;
  lng: number;
  displayName: string;
}

## 2. LocationService

**Purpose:** Retrieve and manage the user’s current location.

**Features:**

- Geolocation API detection
- IP-based fallback
- Caching in `localStorage` for 24 hours
- Manual location override

**File:** `src/app/services/location.service.ts`

```typescript
// LocationService implementation here
````

**Notes:**

Always cache locations to improve performance and user experience.

Fallback to IP ensures location is available even if geolocation is denied.

## 3. NgRx Location State

**Purpose:** Centralized management of the current location.

**Files:**

- `location.state.ts`: Defines the initial state
- `location.actions.ts`: Defines available actions for location updates
- `location.reducer.ts`: Handles state changes immutably
- `location.selectors.ts`: Provides selectors to read location state

**Notes:**

- Always return a new object in selectors to ensure Angular change detection triggers correctly.
- The reducer must replace the `current` object instead of mutating it directly.
- Effects handle asynchronous operations such as fetching the current location via geolocation or IP fallback.

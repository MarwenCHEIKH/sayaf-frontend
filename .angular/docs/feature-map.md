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

# Feature: Map + Listings — Phase 3: Map & Marker Integration

## Overview

This phase integrates interactive maps into the TunisiaHub frontend using **Leaflet** with support for:

- Dynamic marker rendering
- Marker clustering
- Custom marker icons with emoji indicators
- Popups with listing information
- Browser-only lazy loading to avoid SSR issues

This complements the location handling implemented in Phase 1.

---

## 1. MapService

**Purpose:** Encapsulate map-related logic and provide reusable utilities for markers, popups, and bounds.

**Features:**

- Lazy-load **Leaflet** and **leaflet.markercluster** on the browser to avoid SSR errors
- Generate **custom marker icons** using div icons and emoji
- Create popups with listing details (photo, name, type)
- Utility functions to calculate map bounds and check if a marker is in bounds
- PostGIS point parser for backend integration

**File:** `src/app/services/map-service/map.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class MapService {
  // Inject platformId for SSR-safe operations
  private platformId = inject(PLATFORM_ID);

  private async loadLeaflet() {
    if (isPlatformBrowser(this.platformId)) {
      const L = await import("leaflet");
      await import("leaflet.markercluster");
      return L;
    }
    return null;
  }

  createMarkerIcon(type: string[], isSelected = false): any {
    // Returns a Leaflet divIcon with an emoji and colored background
  }

  createPopupContent(marker: MarkerData): string {
    // Returns HTML string for marker popup
  }

  calculateBounds(map: any): MapBounds {
    // Returns north, south, east, west bounds
  }

  isMarkerInBounds(marker: MarkerData, bounds: MapBounds): boolean {
    // Checks if marker is inside map bounds
  }
}
```

**Notes:**

- Marker icons support different listing types (restaurant, cafe, hotel, etc.) with emoji indicators.

- Marker selection is visually highlighted with a color change.

- Lazy-loading Leaflet prevents dynamic require errors during SSR.

# 2. MapComponent

## Purpose

Display an interactive map with listings as markers.

## Features

- Accepts marker data, selected marker ID, center coordinates, and zoom level as inputs
- Emits `mapMoved` and `markerClicked` events
- Supports clustering with Leaflet.markercluster
- Uses `ChangeDetectionStrategy.OnPush` for performance
- Handles SSR safely by only loading Leaflet on the browser

## File

`src/app/components/map/map.component.ts`

```typescript
@Component({
  selector: "app-map",
  standalone: true,
  template: `<div #mapContainer class="map-container"></div>`,
  styles: [
    /* CSS omitted for brevity */
  ],
})
export class MapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() markers: MarkerData[] = [];
  @Input() selectedMarkerId?: number;
  @Input() center?: { lat: number; lng: number };
  @Input() zoom = 13;
  @Input() enableClustering = true;

  @Output() mapMoved = new EventEmitter<MapMoveEvent>();
  @Output() markerClicked = new EventEmitter<number>();

  ngAfterViewInit(): Promise<void> {
    // Lazy-load Leaflet and markercluster
    // Initialize map, tile layers, markers layer, and clustering
  }

  private initMarkersLayer(): void {
    // Sets up clustering or simple layer group
  }

  private updateMarkers(): void {
    // Adds markers to map with custom icons and popups
  }

  private updateSelectedMarker(): void {
    // Updates icon and popup for selected marker
  }
}
```

**Notes:**

- Clustering only runs when enableClustering is true and interactive mode is enabled.

- Popups display listing photo, name, and type.

- Map events moveend and zoomend emit the current bounds and center.

- MapService handles creation of marker icons and popups.

---

### **File 2: 3-MapTestComponent.md**

````markdown
# 3. MapTestComponent

## Purpose

Test component for displaying the map with sample markers.

## File

`src/app/components/map-test/map-test.component.ts`

```typescript
@Component({
  selector: "app-map-test",
  standalone: true,
  imports: [MapComponent],
  template: `
    <div style="height: 600px; padding: 20px;">
      <app-map [markers]="testMarkers" [center]="center" [zoom]="13" [enableClustering]="true" (mapMoved)="onMapMoved($event)" (markerClicked)="onMarkerClicked($event)" />
    </div>
  `,
})
export class MapTestComponent {
  center = { lat: 36.8065, lng: 10.1815 };
  testMarkers: MarkerData[] = [
    { id: 1, name: "Restaurant Dar El Jeld", lat: 36.7981, lng: 10.1709, type: ["restaurant"], photo: "..." },
    { id: 2, name: "Café des Délices", lat: 36.8465, lng: 10.3233, type: ["cafe"] },
    { id: 3, name: "Hotel Africa", lat: 36.8008, lng: 10.1817, type: ["hotel"] },
  ];

  onMapMoved(event: MapMoveEvent) {
    /* handle map moved */
  }
  onMarkerClicked(id: number) {
    /* handle marker clicked */
  }
}
```
````

---

### **File 3: 4-MapStylingSummary.md**

````markdown
# 4. Styling

## Global CSS

`src/styles.css`

```css
@import "leaflet/dist/leaflet.css";
@import "leaflet.markercluster/dist/MarkerCluster.css";
@import "leaflet.markercluster/dist/MarkerCluster.Default.css";

.custom-marker-icon {
  background: transparent;
  border: none;
}
.custom-popup .leaflet-popup-content-wrapper {
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
}
.custom-popup .leaflet-popup-content {
  margin: 12px;
}
.marker-cluster-custom {
  background: transparent;
  border: none;
}
```
````

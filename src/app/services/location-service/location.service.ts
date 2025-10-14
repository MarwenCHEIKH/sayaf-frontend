import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import {
  LocationCoordinates,
  LocationSearchResult,
} from '../../models/location.model';

const TUNIS_DEFAULT: LocationCoordinates = {
  lat: 36.8065,
  lng: 10.1815,
  city: 'Tunis',
  detected: false,
};

const LOCATION_CACHE_KEY = 'tunisiahub_location';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);

  getCurrentLocation(): Observable<LocationCoordinates> {
    const cached = this.getCachedLocation();
    if (cached) return of(cached);

    return new Observable((observer) => {
      if (!navigator.geolocation) {
        this.fallbackToIP().subscribe(observer);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location: LocationCoordinates = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            detected: true,
          };
          this.cacheLocation(location);
          observer.next(location);
          observer.complete();
        },
        () => {
          this.fallbackToIP().subscribe(observer);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  private fallbackToIP(): Observable<LocationCoordinates> {
    return this.http.get<any>('https://ipapi.co/json/').pipe(
      timeout(3000),
      map((res) => ({
        lat: res.latitude || TUNIS_DEFAULT.lat,
        lng: res.longitude || TUNIS_DEFAULT.lng,
        city: res.city || TUNIS_DEFAULT.city,
        detected: true,
      })),
      catchError(() => of(TUNIS_DEFAULT))
    );
  }

  searchLocations(query: string): Observable<LocationSearchResult[]> {
    if (!query.trim()) return of([]);

    return this.http
      .get<any>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )},Tunisia&format=json&limit=5`
      )
      .pipe(
        map((results) =>
          results.map((r: any) => ({
            city: r.display_name.split(',')[0],
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            displayName: r.display_name,
          }))
        ),
        catchError(() => of([]))
      );
  }

  private getCachedLocation(): LocationCoordinates | null {
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(LOCATION_CACHE_KEY);
        return null;
      }
      return parsed.location;
    } catch {
      return null;
    }
  }

  private cacheLocation(location: LocationCoordinates): void {
    try {
      localStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({
          location,
          timestamp: Date.now(),
        })
      );
    } catch {}
  }

  setManualLocation(location: LocationCoordinates): void {
    this.cacheLocation({ ...location, detected: false });
  }

  reverseGeocode(lat: number, lng: number): Observable<LocationCoordinates> {
    return this.http
      .get<any>(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      )
      .pipe(
        map((res) => ({
          lat,
          lng,
          city:
            res.address?.village ||
            res.address?.town ||
            res.address?.city ||
            res.address?.municipality ||
            res.address?.residential || // 🆕 add this
            res.address?.county || // 🆕 add this
            res.address?.state_district || // 🆕 add this
            res.address?.state || // 🆕 add this
            'Unknown',
          detected: true,
        })),
        catchError(() => of({ lat, lng, city: 'Unknown', detected: true }))
      );
  }
}

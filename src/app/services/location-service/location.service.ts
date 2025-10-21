import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import {
  LocationCoordinates,
  LocationSearchResult,
} from '../../models/location.model';

const TUNIS_DEFAULT: LocationCoordinates = {
  lat: 36.8065,
  lng: 10.1815,
  locationName: 'Tunis',
  detected: false,
  bounds: { north: 36.86, south: 36.8, east: 10.23, west: 10.15 },
};

const LOCATION_CACHE_KEY = 'tunisiaVibe_location';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);

  /** Get user location from cache, geolocation, or IP fallback */
  getCurrentLocation(): Observable<LocationCoordinates> {
    const cached = this.getCachedLocation();
    if (cached) return of(cached);

    return new Observable<LocationCoordinates>((observer) => {
      if (!navigator.geolocation) {
        this.fallbackToIP().subscribe(observer);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = this.buildLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            true
          );
          this.cacheLocation(location);
          observer.next(location);
          observer.complete();
        },
        () => this.fallbackToIP().subscribe(observer),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  /** Use IP-based geolocation if GPS is unavailable */
  private fallbackToIP(): Observable<LocationCoordinates> {
    return this.http.get<any>('https://ipapi.co/json/').pipe(
      timeout(3000),
      map((res) =>
        this.buildLocation(
          res.latitude || TUNIS_DEFAULT.lat,
          res.longitude || TUNIS_DEFAULT.lng,
          true,
          res.city
        )
      ),
      catchError(() => of(TUNIS_DEFAULT))
    );
  }

  /** Search locations using Nominatim */
  searchLocations(query: string): Observable<LocationSearchResult[]> {
    if (!query.trim()) return of([]);

    return this.http
      .get<any>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )},Tunisia&format=json&limit=5`
      )
      .pipe(
        tap((results) => console.log('🔍 Nominatim raw response:', results)),
        map((results) =>
          results.map((r: any) => ({
            locationName: r.display_name,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            city: this.extractCity(r),
            bounds: r.boundingbox
              ? {
                  north: parseFloat(r.boundingbox[1]),
                  south: parseFloat(r.boundingbox[0]),
                  east: parseFloat(r.boundingbox[3]),
                  west: parseFloat(r.boundingbox[2]),
                }
              : undefined,
            displayName: r.display_name,
          }))
        ),
        catchError((err) => {
          console.error('❌ Nominatim error:', err);
          return of([]);
        })
      );
  }

  /** Manually set location and cache it */
  setManualLocation(location: LocationCoordinates): void {
    this.cacheLocation({ ...location, detected: false });
  }

  /** Reverse geocode a coordinate to a city/state/village */
  reverseGeocode(lat: number, lng: number): Observable<LocationCoordinates> {
    return this.http
      .get<any>(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      )
      .pipe(
        map((res) =>
          this.buildLocation(
            lat,
            lng,
            true,
            res.address?.village ||
              res.address?.town ||
              res.address?.city ||
              res.address?.municipality ||
              res.address?.residential ||
              res.address?.county ||
              res.address?.state_district ||
              res.address?.state ||
              'Unknown'
          )
        ),
        catchError(() => of(this.buildLocation(lat, lng, true, 'Unknown')))
      );
  }

  /** Build a consistent location object for store / filters */
  private buildLocation(
    lat?: number,
    lng?: number,
    detected = false,
    locationName?: string,
    bounds?: { north: number; south: number; east: number; west: number }
  ): LocationCoordinates {
    return {
      lat,
      lng,
      detected,
      locationName: locationName || 'Unknown',
      bounds,
    };
  }

  /** Get cached location */
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

  /** Cache location in localStorage */
  private cacheLocation(location: LocationCoordinates): void {
    try {
      localStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({ location, timestamp: Date.now() })
      );
    } catch {}
  }

  /** Extract city from Nominatim result */
  private extractCity(r: any): string {
    return (
      r.address?.village ||
      r.address?.town ||
      r.address?.city ||
      r.address?.municipality ||
      r.address?.county ||
      'Unknown'
    );
  }
}

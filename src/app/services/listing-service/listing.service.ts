// src/app/services/listing.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { Listing, ListingWithPhotos } from '../../models/listing.model';

export interface ListingsResponse {
  tier?: 'COUNTRY' | 'STATE' | 'CITY';
  listings?: ListingWithPhotos[];
  clusters?: ClusterMarker[];
  total: number;
}

export interface ClusterMarker {
  id: number;
  lat: number;
  lng: number;
  count: number;
  type: string;
  name?: string;
}

interface CacheEntry {
  data: ListingsResponse;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ListingService {
  private http: HttpClient = Inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/listings`;
  private readonly CACHE_TTL = 300000; // 5 minutes

  private mapCache = new Map<string, CacheEntry>();

  private readonly ZOOM_TIERS = {
    COUNTRY: { min: 0, max: 7 },
    STATE: { min: 8, max: 11 },
    CITY: { min: 12, max: 22 },
  };

  constructor(
    private _http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  // ------------------------------------------------------
  // CRUD Methods
  // ------------------------------------------------------
  getListings(): Observable<ListingWithPhotos[]> {
    if (!isPlatformBrowser(this.platformId)) return of([]);
    return this._http.get<Listing[]>(this.apiUrl).pipe(
      map((listings) => listings.map((l) => this.processListing(l))),
      catchError(this.handleError)
    );
  }

  getListingById(id: number): Observable<ListingWithPhotos> {
    if (!isPlatformBrowser(this.platformId)) return of(null as any);

    const token = localStorage.getItem('token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this._http.get<Listing>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map((l) => this.processListing(l)),
      catchError(this.handleError)
    );
  }

  getTopListings(limit = 3): Observable<ListingWithPhotos[]> {
    return this.getListings().pipe(
      map((listings) =>
        listings
          .map((l) => ({
            ...l,
            score: (l.rating || 0) * Math.log(1 + (l.user_ratings_total || 0)),
          }))
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, limit)
      )
    );
  }

  sortListings(
    listings: ListingWithPhotos[],
    sortBy: 'rating' | 'price',
    order: 'asc' | 'desc' = 'desc'
  ): ListingWithPhotos[] {
    return [...listings].sort((a, b) => {
      const A = sortBy === 'rating' ? a.rating || 0 : a.price || 0;
      const B = sortBy === 'rating' ? b.rating || 0 : b.price || 0;
      return order === 'asc' ? A - B : B - A;
    });
  }

  // ------------------------------------------------------
  // Map BBOX Search with page + limit control
  // ------------------------------------------------------
  getListingsWithBBox(
    bounds: { north: number; south: number; east: number; west: number },
    page: number = 1,
    limit: number = 20,
    filters?: { type?: string[]; query?: string; locationName?: string },
    zoom?: number
  ): Observable<ListingsResponse> {
    if (!isPlatformBrowser(this.platformId)) return of({ total: 0 });

    const cacheKey = this.generateCacheKey(bounds, zoom, filters, page, limit);
    const cached = this.getFromCache(cacheKey);
    if (cached) return of(cached);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('north', bounds.north.toString())
      .set('south', bounds.south.toString())
      .set('east', bounds.east.toString())
      .set('west', bounds.west.toString());

    if (zoom !== undefined) params = params.set('zoom', zoom.toString());
    if (filters?.type?.length)
      params = params.set('type', filters.type.join(','));
    if (filters?.query) params = params.set('q', filters.query);
    if (filters?.locationName)
      params = params.set('locationName', filters.locationName);

    return this._http
      .get<ListingsResponse>(`${this.apiUrl}/bbox`, { params })
      .pipe(
        tap(() => {
          console.log(
            '%cHTTP GET Request:',
            'color: green; font-weight: bold;',
            `${this.apiUrl}/bbox?${params.toString()}`
          );
        }),
        map((response) => {
          if (response.listings) {
            response.listings = response.listings.map((l) =>
              this.processListing(l)
            );
          }
          return response;
        }),
        tap((response) => this.setCache(cacheKey, response)),
        catchError(this.handleError)
      );
  }

  // ------------------------------------------------------
  // Caching Helpers
  // ------------------------------------------------------
  clearCache(): void {
    this.mapCache.clear();
  }

  private generateCacheKey(
    bounds: any,
    zoom?: number,
    filters?: any,
    page?: number,
    limit?: number
  ): string {
    const rounded = {
      north: bounds.north.toFixed(4),
      south: bounds.south.toFixed(4),
      east: bounds.east.toFixed(4),
      west: bounds.west.toFixed(4),
    };

    const typeStr = filters?.type?.sort().join('-') || 'all';
    const queryStr = filters?.query || 'none';

    return `${zoom ?? 'Z'}:${rounded.north},${rounded.south},${rounded.east},${
      rounded.west
    }:${typeStr}:${queryStr}:${page}:${limit}`;
  }

  private getFromCache(key: string): ListingsResponse | null {
    const entry = this.mapCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.mapCache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: ListingsResponse): void {
    this.mapCache.set(key, {
      data,
      timestamp: Date.now(),
    });
    const firstKey = this.mapCache.keys().next().value;
    if (this.mapCache.size > 50) {
      if (firstKey) this.mapCache.delete(firstKey);
    }
  }

  // ------------------------------------------------------
  // Formatting Helpers
  // ------------------------------------------------------
  private processListing(listing: any): ListingWithPhotos {
    const photoUrls =
      listing.images?.map((img: string) =>
        img.startsWith('http') ? img : `${environment.apiUrl}${img}`
      ) ||
      listing.photos?.map((p: any) => p.photo_url) ||
      [];

    return { ...listing, photoUrls };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const msg = error.error?.message
      ? `Error: ${error.error.message}`
      : `Server returned code ${error.status}: ${error.message}`;
    console.error(msg);
    return throwError(() => new Error(msg));
  }
}

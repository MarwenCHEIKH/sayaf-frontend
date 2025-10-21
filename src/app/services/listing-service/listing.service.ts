import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  Listing,
  ListingsResponse,
  ListingWithPhotos,
} from '../../models/listing.model';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { ListingsFilters } from '../../store/listings/listings.state';

@Injectable({
  providedIn: 'root',
})
export class ListingService {
  private apiUrl = `${environment.apiUrl}/listings`;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}
  /**
   * Fetch all listings from the backend (SSR-safe)
   */
  getListings(): Observable<ListingWithPhotos[]> {
    // Skip API call on the server (SSR)
    if (!isPlatformBrowser(this.platformId)) {
      return of([]); // return empty array during SSR
    }

    // No Authorization header — public access
    return this.http.get<Listing[]>(this.apiUrl).pipe(
      map((listings) => this.processListings(listings)),
      catchError(this.handleError)
    );
  }

  /**
   * Fetch a single listing by ID (SSR-safe)
   */
  getListingById(id: number): Observable<ListingWithPhotos> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(null as any); // skip SSR
    }

    const token = localStorage.getItem('token') || '';
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<Listing>(`${this.apiUrl}/${id}`, { headers }).pipe(
      map((listing) => this.processListing(listing)),
      catchError(this.handleError)
    );
  }

  private processListings(listings: Listing[]): ListingWithPhotos[] {
    return listings.map((listing) => this.processListing(listing));
  }

  private processListing(listing: Listing): ListingWithPhotos {
    const photoUrls = this.generatePhotoUrls(listing);
    return { ...listing, photoUrls };
  }

  private generatePhotoUrls(listing: Listing): string[] {
    const urls: string[] = [];

    // ✅ Only use locally stored photos from images attribute
    if (listing.images?.length) {
      const resolved = listing.images.map((img) => {
        // If already a full URL, use as-is
        if (img.startsWith('http')) {
          return img;
        }
        return `${environment.apiUrl}${img}`;
      });
      urls.push(...resolved);
    }

    return urls;
  }
  sortListings(
    listings: ListingWithPhotos[],
    sortBy: 'rating' | 'price',
    order: 'asc' | 'desc' = 'desc'
  ): ListingWithPhotos[] {
    return [...listings].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'rating') comparison = (a.rating || 0) - (b.rating || 0);
      else if (sortBy === 'price') comparison = (a.price || 0) - (b.price || 0);
      return order === 'asc' ? comparison : -comparison;
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred while fetching listings.';
    if (error.error?.message) errorMessage = `Error: ${error.error.message}`;
    else
      errorMessage = `Server returned code ${error.status}: ${error.message}`;
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  getTopListings(limit: number = 3): Observable<ListingWithPhotos[]> {
    return this.getListings().pipe(
      map((listings) => {
        const scored = listings.map((l) => ({
          ...l,
          score: (l.rating || 0) * Math.log(1 + (l.user_ratings_total || 0)),
        }));

        const sorted = scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        return sorted.slice(0, limit);
      })
    );
  }
  getListingsWithBBox(
    bounds: { north: number; south: number; east: number; west: number },
    page: number = 1,
    limit: number = 20,
    filters?: { type?: string[]; query?: string; locationName?: string }
  ): Observable<ListingsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('north', bounds.north.toString())
      .set('south', bounds.south.toString())
      .set('east', bounds.east.toString())
      .set('west', bounds.west.toString());

    if (filters?.type && filters.type.length) {
      params = params.set('type', filters.type.join(','));
    }
    if (filters?.query) {
      params = params.set('q', filters.query);
    }
    if (filters?.locationName) {
      params = params.set('locationName', filters.locationName);
    }

    return this.http
      .get<ListingsResponse>(`${this.apiUrl}/bbox`, { params })
      .pipe(
        map((response) => ({
          listings: response.listings.map((listing) =>
            this.processListing(listing)
          ),
          total: response.total,
        }))
      );
  }
}

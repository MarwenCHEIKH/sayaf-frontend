import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Listing, ListingWithPhotos } from '../models/listing.model';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

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
    // Skip API call on the server to avoid invalid/missing JWT
    if (!isPlatformBrowser(this.platformId)) {
      return of([]); // return empty array during SSR
    }

    const token = localStorage.getItem('token') || '';
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;
    return this.http.get<Listing[]>(this.apiUrl, { headers }).pipe(
      tap((data) => console.log('🛰️ Raw backend response:', data)),
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
      tap((listingsWithPhotos) =>
        console.log('🖼️ Listings with photos:', listingsWithPhotos)
      ),
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
        // Use environment.apiUrl directly (which is http://localhost:3000)
        // NOT this.apiUrl (which is http://localhost:3000/listings)
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
}

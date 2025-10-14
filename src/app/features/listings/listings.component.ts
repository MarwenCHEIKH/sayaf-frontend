import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ListingService } from '../../services/listing-service/listing.service';
import { ListingWithPhotos } from '../../models/listing.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './listings.component.html',
  styleUrls: ['./listings.component.scss'],
})
export class ListingsComponent implements OnInit, OnDestroy {
  allListings: ListingWithPhotos[] = [];
  filteredListings: ListingWithPhotos[] = [];
  displayedListings: ListingWithPhotos[] = [];

  showFilters = false;
  loading = false;
  loadingMore = false;
  error: string | null = null;

  // Infinite scroll
  private itemsPerLoad = 10;
  private currentLoadedCount = 0;
  hasMoreItems = true;

  // Search and filter
  searchQuery = '';
  selectedTypes: string[] = [];
  availableTypes: string[] = [];

  // Sorting
  sortBy: 'rating' | 'price' | 'reviewScore' = 'reviewScore'; // Added reviewScore
  sortOrder: 'asc' | 'desc' = 'desc';

  // Review score filtering
  minReviewScore = 0;
  showReviewScoreFilter = false;

  // Image carousel tracking
  currentImageIndices: { [listingId: number]: number } = {};

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(private listingService: ListingService) {}

  ngOnInit(): void {
    this.loadListings();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    if (this.shouldLoadMore()) {
      this.loadMoreListings();
    }
  }

  private shouldLoadMore(): boolean {
    if (!this.hasMoreItems || this.loadingMore || this.loading) {
      return false;
    }

    const scrollPosition = window.innerHeight + window.scrollY;
    const scrollThreshold = document.documentElement.scrollHeight - 500;

    return scrollPosition >= scrollThreshold;
  }

  loadListings(): void {
    this.loading = true;
    this.error = null;

    this.listingService
      .getListings()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (listings) => {
          const listingsWithPhotos = listings.filter(
            (listing) =>
              listing.photoUrls &&
              listing.photoUrls.length > 0 &&
              listing.photoUrls.some((url) => !!url && url.trim() !== '')
          );

          this.allListings = listingsWithPhotos;
          this.filteredListings = [...listingsWithPhotos];

          this.initializeImageIndices();
          this.extractAvailableTypes();
          this.applySorting();
          this.resetInfiniteScroll();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load listings. Please try again later.';
          this.loading = false;
          console.error('Error loading listings:', error);
        },
      });
  }

  private initializeImageIndices(): void {
    this.allListings.forEach((listing) => {
      this.currentImageIndices[listing.id] = 0;
    });
  }

  private resetInfiniteScroll(): void {
    this.currentLoadedCount = 0;
    this.displayedListings = [];
    this.hasMoreItems = true;
    this.loadMoreListings();
  }

  loadMoreListings(): void {
    if (!this.hasMoreItems || this.loadingMore) return;

    this.loadingMore = true;

    setTimeout(() => {
      const nextItems = this.filteredListings.slice(
        this.currentLoadedCount,
        this.currentLoadedCount + this.itemsPerLoad
      );

      this.displayedListings = [...this.displayedListings, ...nextItems];
      this.currentLoadedCount += nextItems.length;

      if (this.currentLoadedCount >= this.filteredListings.length) {
        this.hasMoreItems = false;
      }

      this.loadingMore = false;
    }, 300);
  }

  setupSearch(): void {
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchSubject$.next(query);
  }

  performSearch(query: string): void {
    if (!query.trim()) {
      this.filteredListings = [...this.allListings];
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredListings = this.allListings.filter(
        (listing) =>
          listing.name.toLowerCase().includes(lowerQuery) ||
          listing.type.some((t) => t.toLowerCase().includes(lowerQuery)) ||
          listing.vicinity?.toLowerCase().includes(lowerQuery) ||
          listing.formatted_address?.toLowerCase().includes(lowerQuery)
      );
    }
    this.applyReviewScoreFilter();
    this.applySorting();
    this.resetInfiniteScroll();
  }

  extractAvailableTypes(): void {
    const typesSet = new Set<string>();
    this.allListings.forEach((listing) => {
      listing.type.forEach((type) => typesSet.add(type));
    });
    this.availableTypes = Array.from(typesSet).sort();
  }

  toggleTypeFilter(type: string): void {
    const index = this.selectedTypes.indexOf(type);
    if (index > -1) {
      this.selectedTypes.splice(index, 1);
    } else {
      this.selectedTypes.push(type);
    }
    this.applyFilters();
  }

  applyFilters(): void {
    if (this.selectedTypes.length === 0) {
      this.filteredListings = [...this.allListings];
    } else {
      this.filteredListings = this.allListings.filter((listing) =>
        listing.type.some((type) => this.selectedTypes.includes(type))
      );
    }
    this.performSearch(this.searchQuery);
  }

  /**
   * Apply review score filter
   */
  applyReviewScoreFilter(): void {
    if (this.minReviewScore > 0) {
      this.filteredListings = this.filteredListings.filter(
        (listing) => this.calculateReviewScore(listing) >= this.minReviewScore
      );
    }
  }

  /**
   * Handle review score filter change
   */
  onReviewScoreChange(value: number): void {
    this.minReviewScore = value;
    this.applyFilters();
  }

  /**
   * Get maximum review score for slider
   */
  getMaxReviewScore(): number {
    if (this.allListings.length === 0) return 10;
    const scores = this.allListings.map((listing) =>
      this.calculateReviewScore(listing)
    );
    return Math.ceil(Math.max(...scores));
  }

  clearFilters(): void {
    this.selectedTypes = [];
    this.searchQuery = '';
    this.minReviewScore = 0;
    this.filteredListings = [...this.allListings];
    this.applySorting();
    this.resetInfiniteScroll();
  }

  onSortChange(
    sortBy: 'rating' | 'price' | 'reviewScore',
    order: 'asc' | 'desc'
  ): void {
    this.sortBy = sortBy;
    this.sortOrder = order;
    this.applySorting();
    this.resetInfiniteScroll();
  }

  applySorting(): void {
    if (this.sortBy === 'reviewScore') {
      // Sort by calculated review score
      this.filteredListings.sort((a, b) => {
        const scoreA = this.calculateReviewScore(a);
        const scoreB = this.calculateReviewScore(b);
        return this.sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    } else {
      // Use existing service sorting for rating and price
      this.filteredListings = this.listingService.sortListings(
        this.filteredListings,
        this.sortBy as 'rating' | 'price',
        this.sortOrder
      );
    }
  }

  getStarRating(rating: number = 0): boolean[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(i < fullStars);
    }
    return stars;
  }

  getPhotos(listing: ListingWithPhotos): string[] {
    return listing.photoUrls && listing.photoUrls.length > 0
      ? listing.photoUrls
      : ['assets/images/poster.jpg'];
  }

  getCurrentPhoto(listing: ListingWithPhotos): string {
    const photos = this.getPhotos(listing);
    const currentIndex = this.currentImageIndices[listing.id] || 0;
    return photos[currentIndex];
  }

  nextImage(listing: ListingWithPhotos, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const photos = this.getPhotos(listing);
    const currentIndex = this.currentImageIndices[listing.id] || 0;
    this.currentImageIndices[listing.id] = (currentIndex + 1) % photos.length;
  }

  previousImage(listing: ListingWithPhotos, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const photos = this.getPhotos(listing);
    const currentIndex = this.currentImageIndices[listing.id] || 0;
    this.currentImageIndices[listing.id] =
      currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
  }

  goToImage(listing: ListingWithPhotos, index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.currentImageIndices[listing.id] = index;
  }

  getCurrentImageIndex(listing: ListingWithPhotos): number {
    return this.currentImageIndices[listing.id] || 0;
  }

  hasMultipleImages(listing: ListingWithPhotos): boolean {
    return this.getPhotos(listing).length > 1;
  }

  formatPrice(price?: number): string {
    if (!price) return 'N/A';
    return `$${price.toFixed(2)}`;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/poster.jpg';
  }

  trackByListingId(index: number, listing: ListingWithPhotos): number {
    return listing.id;
  }

  /**
   * Calculate review score using rating and review count
   * Formula: rating * log10(1 + reviewCount)
   * This balances quality (rating) with popularity (review count)
   */
  calculateReviewScore(listing: ListingWithPhotos): number {
    const rating = listing.rating ?? 0;
    const reviewCount = listing.user_ratings_total ?? 0;
    return rating * Math.log10(1 + reviewCount);
  }

  /**
   * Format review score for display
   */
  formatReviewScore(score: number): string {
    return score.toFixed(2);
  }
}

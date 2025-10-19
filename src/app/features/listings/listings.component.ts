import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ListingWithPhotos } from '../../models/listing.model';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './listings.component.html',
  styleUrls: ['./listings.component.scss'],
})
export class ListingsComponent {
  // Inputs from parent container
  @Input({ required: true }) set listings(value: ListingWithPhotos[]) {
    this._listings.set(value);
    this.initializeImageIndices(value);
  }

  @Input() loading = false;
  @Input() selectedId?: number;
  @Input() hasMore = true;

  // Outputs to parent container
  @Output() listingClick = new EventEmitter<number>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() typeFilterChange = new EventEmitter<string[]>();
  @Output() sortChange = new EventEmitter<{
    sortBy: 'rating' | 'price' | 'reviewScore';
    order: 'asc' | 'desc';
  }>();
  @Output() reviewScoreChange = new EventEmitter<number>();

  // Internal signal for listings
  private _listings = signal<ListingWithPhotos[]>([]);

  // Public accessor
  displayedListings = computed(() => this._listings());

  // UI state
  showFilters = signal(false);
  // searchQuery = signal('');
  selectedTypes = signal<string[]>([]);
  minReviewScore = signal(0);
  sortBy = signal<'rating' | 'price' | 'reviewScore'>('reviewScore');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Image carousel tracking
  currentImageIndices = signal<{ [listingId: number]: number }>({});

  // Computed values
  availableTypes = computed(() => {
    const typesSet = new Set<string>();
    this.displayedListings().forEach((listing) => {
      listing.type.forEach((type) => typesSet.add(type));
    });
    return Array.from(typesSet).sort();
  });

  maxReviewScore = computed(() => {
    const listings = this.displayedListings();
    if (listings.length === 0) return 10;
    const scores = listings.map((listing) =>
      this.calculateReviewScore(listing)
    );
    return Math.ceil(Math.max(...scores));
  });

  private initializeImageIndices(listings: ListingWithPhotos[]): void {
    const indices = { ...this.currentImageIndices() };
    listings.forEach((listing) => {
      if (!(listing.id in indices)) {
        indices[listing.id] = 0;
      }
    });
    this.currentImageIndices.set(indices);
  }

  toggleTypeFilter(type: string): void {
    const current = this.selectedTypes();
    const index = current.indexOf(type);
    const updated =
      index > -1 ? current.filter((t) => t !== type) : [...current, type];

    this.selectedTypes.set(updated);
    this.typeFilterChange.emit(updated);
  }

  onSortChange(
    sortBy: 'rating' | 'price' | 'reviewScore',
    order: 'asc' | 'desc'
  ): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(order);
    this.sortChange.emit({ sortBy, order });
  }

  onReviewScoreChange(value: number): void {
    this.minReviewScore.set(value);
    this.reviewScoreChange.emit(value);
  }

  clearFilters(): void {
    this.selectedTypes.set([]);
    // this.searchQuery.set('');
    this.minReviewScore.set(0);

    this.searchChange.emit('');
    this.typeFilterChange.emit([]);
    this.reviewScoreChange.emit(0);
  }

  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }

  onListingClick(id: number): void {
    this.listingClick.emit(id);
  }

  // Image carousel and utility methods
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
    const currentIndex = this.currentImageIndices()[listing.id] || 0;
    return photos[currentIndex];
  }

  nextImage(listing: ListingWithPhotos, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const photos = this.getPhotos(listing);
    const indices = { ...this.currentImageIndices() };
    const currentIndex = indices[listing.id] || 0;
    indices[listing.id] = (currentIndex + 1) % photos.length;
    this.currentImageIndices.set(indices);
  }

  previousImage(listing: ListingWithPhotos, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const photos = this.getPhotos(listing);
    const indices = { ...this.currentImageIndices() };
    const currentIndex = indices[listing.id] || 0;
    indices[listing.id] =
      currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    this.currentImageIndices.set(indices);
  }

  goToImage(listing: ListingWithPhotos, index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const indices = { ...this.currentImageIndices() };
    indices[listing.id] = index;
    this.currentImageIndices.set(indices);
  }

  getCurrentImageIndex(listing: ListingWithPhotos): number {
    return this.currentImageIndices()[listing.id] || 0;
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

  calculateReviewScore(listing: ListingWithPhotos): number {
    const rating = listing.rating ?? 0;
    const reviewCount = listing.user_ratings_total ?? 0;
    return rating * Math.log10(1 + reviewCount);
  }

  formatReviewScore(score: number): string {
    return score.toFixed(2);
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
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
  host: {
    class: 'listings-component',
    '[style.display]': '"flex"',
    '[style.flex-direction]': '"column"',
    '[style.height]': '"100%"',
  },
})
export class ListingsComponent {
  // Inputs from parent container
  @Input({ required: true }) set listings(value: ListingWithPhotos[]) {
    this._listings = value;
    this.initializeImageIndices(value);
  }
  get listings(): ListingWithPhotos[] {
    return this._listings;
  }
  private _listings: ListingWithPhotos[] = [];

  @Input() loading = false;
  @Input() selectedId?: number;
  @Input() hasMore = true;
  @Input() isMobileView = false;

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

  // UI state
  showMobileSortDropdown = signal(false);
  showFilters = signal(false);
  showSortDropdown = false; // Desktop sort dropdown
  selectedTypes = signal<string[]>([]);
  minReviewScore = signal(0);
  sortBy = signal<'rating' | 'price' | 'reviewScore'>('reviewScore');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Image carousel tracking
  currentImageIndices = signal<{ [listingId: number]: number }>({});

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

  toggleSortDropdown(): void {
    this.showMobileSortDropdown.update((v) => !v);
  }

  onSortChange(
    sortBy: 'rating' | 'price' | 'reviewScore',
    order: 'asc' | 'desc'
  ): void {
    this.sortBy.set(sortBy);
    this.sortOrder.set(order);
    this.sortChange.emit({ sortBy, order });
  }

  getSortLabel(sortBy: string): string {
    const labels: { [key: string]: string } = {
      reviewScore: 'Review Score',
      rating: 'Rating',
      price: 'Price',
    };
    return labels[sortBy] || 'Featured';
  }

  onReviewScoreChange(value: number): void {
    this.minReviewScore.set(value);
    this.reviewScoreChange.emit(value);
  }

  clearFilters(): void {
    this.selectedTypes.set([]);
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

  // Image carousel methods
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

  getFirstType(listing: ListingWithPhotos): string {
    return listing.type && listing.type.length > 0
      ? listing.type[0]
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase())
      : 'Place';
  }

  getOpeningHoursText(listing: ListingWithPhotos): string {
    const hours = listing.opening_hours;
    if (!hours || !Array.isArray(hours.periods) || hours.periods.length === 0) {
      return 'Hours not available';
    }

    const now = new Date();
    const localDay = now.getDay(); // 0 = Sunday ... 6 = Saturday
    const localMinutes = now.getHours() * 60 + now.getMinutes();

    const periods = hours.periods.map((p: any) => ({
      openDay: p.open.day,
      openMinutes: p.open.hour * 60 + (p.open.minute || 0),
      closeDay: p.close.day,
      closeMinutes: p.close.hour * 60 + (p.close.minute || 0),
    }));

    // Check if open now
    for (const p of periods) {
      if (p.openDay === localDay) {
        // Case 1: closes same day
        if (
          p.closeDay === p.openDay &&
          localMinutes >= p.openMinutes &&
          localMinutes < p.closeMinutes
        ) {
          const minsLeft = p.closeMinutes - localMinutes;
          const hoursLeft = Math.floor(minsLeft / 60);
          const minsRem = minsLeft % 60;
          return `Open now (closes in ${hoursLeft}h ${minsRem}m)`;
        }
        // Case 2: closes next day (e.g., 22:00 → 02:00)
        if (p.closeDay !== p.openDay && localMinutes >= p.openMinutes) {
          const closeAfterMidnight =
            p.closeMinutes + 24 * 60 * (p.closeDay - p.openDay);
          const minsLeft = closeAfterMidnight - localMinutes;
          const hoursLeft = Math.floor(minsLeft / 60);
          const minsRem = minsLeft % 60;
          return `Open now (closes in ${hoursLeft}h ${minsRem}m)`;
        }
      }

      // Handle case: open period spans midnight (yesterday’s open still active)
      if (
        p.closeDay !== p.openDay &&
        localDay === p.closeDay &&
        localMinutes < p.closeMinutes
      ) {
        const minsLeft = p.closeMinutes - localMinutes;
        const hoursLeft = Math.floor(minsLeft / 60);
        const minsRem = minsLeft % 60;
        return `Open now (closes in ${hoursLeft}h ${minsRem}m)`;
      }
    }

    // If not open now → find next opening
    for (let i = 0; i < 7; i++) {
      const dayIndex = (localDay + i) % 7;
      const nextPeriod = periods.find((p: any) => p.openDay === dayIndex);
      if (nextPeriod) {
        let diffDays = i;
        let diffMinutes = nextPeriod.openMinutes - localMinutes;
        if (diffMinutes < 0 || i > 0) diffMinutes += diffDays * 24 * 60;

        const totalMins = diffMinutes;
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;

        if (diffDays === 0) return `Opens in ${hours}h ${mins}m`;
        if (diffDays === 1)
          return `Opens tomorrow at ${this.formatTime(nextPeriod.openMinutes)}`;
        return `Opens in ${diffDays} days at ${this.formatTime(
          nextPeriod.openMinutes
        )}`;
      }
    }

    return 'Closed';
  }

  /** Format minutes since midnight → "12:30 PM" */
  private formatTime(totalMinutes: number): string {
    let hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  }

  onLikeClick(listing: ListingWithPhotos, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Liked:', listing.name);
  }

  onMapClick(listing: ListingWithPhotos, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  getRatingFills(rating: number): number[] {
    const fills: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const diff = rating - (i - 1);
      if (diff >= 1) fills.push(100);
      else if (diff > 0) fills.push(diff * 100);
      else fills.push(0);
    }
    return fills;
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

  // Helper methods for template
  getAvailableTypes(): string[] {
    const typesSet = new Set<string>();
    this.listings.forEach((listing) => {
      listing.type.forEach((type) => typesSet.add(type));
    });
    return Array.from(typesSet).sort();
  }

  getMaxReviewScore(): number {
    if (this.listings.length === 0) return 10;
    const scores = this.listings.map((listing) =>
      this.calculateReviewScore(listing)
    );
    return Math.ceil(Math.max(...scores));
  }
}

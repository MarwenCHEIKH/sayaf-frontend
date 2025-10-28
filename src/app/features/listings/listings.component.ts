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

  getOpeningHoursText(openingHours: any[] | null | undefined): string {
    // Handle null, undefined, or empty array
    if (
      !openingHours ||
      !Array.isArray(openingHours) ||
      openingHours.length === 0
    ) {
      return 'Hours not available';
    }

    try {
      // Filter out any null/undefined items and validate structure
      const validHours = openingHours.filter(
        (h) => h && typeof h === 'object' && h.day && h.open && h.close
      );

      if (validHours.length === 0) {
        return 'Hours not available';
      }

      // Map to formatted strings
      const formattedHours = validHours.map((hours) => {
        const day = hours.day || 'N/A';
        const open = hours.open || 'N/A';
        const close = hours.close || 'N/A';
        return `${day}: ${open} - ${close}`;
      });

      // Join with line breaks or commas depending on your UI needs
      return formattedHours.join(', ');
    } catch (error) {
      console.error('Error formatting opening hours:', error);
      return 'Hours not available';
    }
  }

  /**
   * Alternative: Check if listing is currently open
   * @param openingHours - The opening hours array
   * @returns Boolean indicating if open now
   */
  isOpenNow(openingHours: any[] | null | undefined): boolean {
    if (
      !openingHours ||
      !Array.isArray(openingHours) ||
      openingHours.length === 0
    ) {
      return false;
    }

    try {
      const now = new Date();
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const currentDay = dayNames[now.getDay()];
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

      // Find today's hours
      const todayHours = openingHours.find(
        (h) => h && h.day && h.day.toLowerCase() === currentDay.toLowerCase()
      );

      if (!todayHours || !todayHours.open || !todayHours.close) {
        return false;
      }

      // Parse time strings (assuming format like "09:00" or "9:00 AM")
      const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map((s) => parseInt(s, 10));
        return (hours || 0) * 60 + (minutes || 0);
      };

      const openTime = parseTime(todayHours.open);
      const closeTime = parseTime(todayHours.close);

      return currentTime >= openTime && currentTime <= closeTime;
    } catch (error) {
      console.error('Error checking if open now:', error);
      return false;
    }
  }

  /**
   * Get today's opening hours only
   * @param openingHours - The opening hours array
   * @returns Today's hours as string or fallback
   */
  getTodayHours(openingHours: any[] | null | undefined): string {
    if (
      !openingHours ||
      !Array.isArray(openingHours) ||
      openingHours.length === 0
    ) {
      return 'Hours not available';
    }

    try {
      const now = new Date();
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const currentDay = dayNames[now.getDay()];

      const todayHours = openingHours.find(
        (h) => h && h.day && h.day.toLowerCase() === currentDay.toLowerCase()
      );

      if (!todayHours || !todayHours.open || !todayHours.close) {
        return 'Closed today';
      }

      return `${todayHours.open} - ${todayHours.close}`;
    } catch (error) {
      console.error('Error getting today hours:', error);
      return 'Hours not available';
    }
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

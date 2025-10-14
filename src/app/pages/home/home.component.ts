import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LazyLoadVideoDirective } from '../../shared/directives/lazy-load-video.directive';
import { ListingService } from '../../services/listing-service/listing.service';
import { ListingWithPhotos } from '../../models/listing.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LazyLoadVideoDirective, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;
  private isBrowser: boolean;

  featuredListings: ListingWithPhotos[] = [];

  constructor(
    private router: Router,
    private listingService: ListingService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadFeaturedListings();
    }
  }

  private loadFeaturedListings(): void {
    this.listingService.getTopListings(3).subscribe({
      next: (data) => (this.featuredListings = data),
      error: (err) => console.error('Error loading featured listings:', err),
    });
  }

  // --- Search ---
  onSearch(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.querySelector('input[type="text"]') as HTMLInputElement;
    const searchQuery = input?.value || '';
    console.log('Search query:', searchQuery);
    // this.router.navigate(['/search'], { queryParams: { q: searchQuery } });
  }

  navigateToCategory(category: string): void {
    console.log('Navigate to category:', category);
    // this.router.navigate(['/category', category]);
  }

  navigateToPlace(id: number): void {
    console.log('Navigate to place:', id);
    // this.router.navigate(['/place', id]);
  }

  scrollToSection(sectionId: string): void {
    if (!this.isBrowser) return;
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

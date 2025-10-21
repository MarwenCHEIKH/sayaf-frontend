// src/app/components/location-picker/location-picker.component.ts
import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { LocationActions } from '../../store/location/location.actions';

import { LocationSearchResult } from '../../models/location.model';
import { LocationService } from '../../services/location-service/location.service';
import { ListingsActions } from '../../store/listings/listings.actions';
import {
  selectCurrentLocationFilters,
  selectLocationLoading,
} from '../../store/location/location.selectors';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent {
  private store = inject(Store);
  private locationService = inject(LocationService);
  private searchSubject = new Subject<string>();

  currentLocation$ = this.store.select(selectCurrentLocationFilters);
  locationLoading$ = this.store.select(selectLocationLoading);

  showDropdown = signal(false);
  searchQuery = '';
  searchResults = signal<LocationSearchResult[]>([]);

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => this.locationService.searchLocations(query))
      )
      .subscribe((results) => this.searchResults.set(results));
  }

  toggleDropdown(): void {
    this.showDropdown.update((v) => !v);
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(query);
  }

  useCurrentLocation(): void {
    this.store.dispatch(LocationActions.loadCurrentLocation());

    this.currentLocation$.subscribe((location) => {
      if (!location) return;

      // Optional: immediately trigger listings load
      this.store.dispatch(
        ListingsActions.loadListings({
          filters: {
            locationName: location.locationName,
            bounds: location.bounds,
            type: [],
            query: '',
          },
          reset: true,
        })
      );
    });

    this.showDropdown.set(false);
  }

  selectLocation(result: LocationSearchResult): void {
    this.store.dispatch(
      LocationActions.setManualLocation({
        location: {
          locationName: result.locationName, // maps directly to ListingsFilters.locationName
          lat: result.lat,
          lng: result.lng,
          bounds: result.bounds, // optional: used if "search as map moves" is ON
          detected: false,
        },
      })
    );

    this.showDropdown.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);
  }
}

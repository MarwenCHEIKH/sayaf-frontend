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
import {
  selectCurrentLocation,
  selectLocationLoading,
} from '../../store/location/location.selectors';
import { LocationSearchResult } from '../../models/location.model';
import { LocationService } from '../../services/location-service/location.service';

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

  currentLocation$ = this.store.select(selectCurrentLocation);
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
      console.log('Current location state:', location);
    });
    this.showDropdown.set(false);
  }

  selectLocation(result: LocationSearchResult): void {
    this.store.dispatch(
      LocationActions.setManualLocation({
        location: {
          lat: result.lat,
          lng: result.lng,
          city: result.city,
          detected: false,
        },
      })
    );
    this.showDropdown.set(false);
    this.searchQuery = '';
    this.searchResults.set([]);
  }
}

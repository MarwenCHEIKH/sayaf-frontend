import { Component } from '@angular/core';
import { LocationPickerComponent } from '../../shared/location-picker/location-picker.component';

@Component({
  selector: 'app-list-listings',
  imports: [LocationPickerComponent],
  templateUrl: './list-listings.component.html',
  styleUrl: './list-listings.component.scss',
})
export class ListListingsComponent {}

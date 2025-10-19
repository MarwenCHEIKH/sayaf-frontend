import { Component, computed, signal } from '@angular/core';
import { ListingsMapComponent } from '../../containers/listings-map/listings-map.component';
import { ListListingsComponent } from '../../features/list-listings/list-listings.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-listings-page',
  standalone: true,
  imports: [ListingsMapComponent, ListListingsComponent, CommonModule],
  templateUrl: './listings-page.component.html',
  styleUrls: ['./listings-page.component.scss'],
})
export class ListingsPageComponent {
  mode: 'map' | 'list' = 'list';

  toggleMode() {
    this.mode = this.mode === 'map' ? 'list' : 'map';
  }

  get isMapMode() {
    return this.mode === 'map';
  }
}

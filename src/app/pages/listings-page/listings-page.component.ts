import { Component } from '@angular/core';
import { ListingsMapContainerComponent } from '../../containers/listings-map/listings-map.component';
import { ListListingsComponent } from '../../features/list-listings/list-listings.component';
import { CommonModule } from '@angular/common';
import { ModeService } from '../../services/mode/mode.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-listings-page',
  standalone: true,
  imports: [ListingsMapContainerComponent, ListListingsComponent, CommonModule],
  templateUrl: './listings-page.component.html',
  styleUrls: ['./listings-page.component.scss'],
})
export class ListingsPageComponent {
  mode$!: Observable<'map' | 'list'>; // declare without initializing

  constructor(public modeService: ModeService) {
    // initialize here
    this.mode$ = this.modeService.mode$;
  }

  toggleMode() {
    this.modeService.toggleMode();
  }
}

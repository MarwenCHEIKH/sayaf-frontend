import { CommonModule } from '@angular/common';
import { LazyLoadVideoDirective } from '../../shared/directives/lazy-load-video.directive';
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LazyLoadVideoDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {}

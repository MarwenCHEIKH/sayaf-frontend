import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

@Component({
  selector: 'app-add-listing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-listing.component.html',
  styleUrls: ['./add-listing.component.scss'],
})
export class AddListingComponent {
  name = '';
  type = 'hotel';
  location = '';
  latitude!: number;
  longitude!: number;
  price!: number;
  images: string[] = [];
  availability: string[] = [];

  newImage = '';
  newAvailability = '';

  constructor(private router: Router) {}

  addImage() {
    if (this.newImage) {
      this.images.push(this.newImage);
      this.newImage = '';
    }
  }

  removeImage(index: number) {
    this.images.splice(index, 1);
  }

  addAvailability() {
    if (this.newAvailability) {
      this.availability.push(this.newAvailability);
      this.newAvailability = '';
    }
  }

  removeAvailability(index: number) {
    this.availability.splice(index, 1);
  }

  onSubmit() {
    console.log('works');
  }
}

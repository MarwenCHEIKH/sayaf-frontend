// src/app/components/map-test/map-test.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MarkerData, MapMoveEvent } from '../../models/map.model';
import { MapComponent } from '../../features/map/map.component';

@Component({
  selector: 'app-map-test',
  standalone: true,
  imports: [MapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="height: 600px; padding: 20px;">
      <h2>Map Test</h2>
      <app-map
        [markers]="testMarkers"
        [selectedMarkerId]="selectedId"
        [center]="center"
        [zoom]="13"
        [interactive]="true"
        [enableClustering]="true"
        (mapMoved)="onMapMoved($event)"
        (markerClicked)="onMarkerClicked($event)"
      />
    </div>
  `,
})
export class MapTestComponent {
  center = { lat: 36.8065, lng: 10.1815 };
  selectedId?: number;

  testMarkers: MarkerData[] = [
    {
      id: 1,
      name: 'Restaurant Dar El Jeld',
      lat: 36.7981,
      lng: 10.1709,
      type: ['restaurant'],
      photo: 'https://via.placeholder.com/200',
    },
    {
      id: 2,
      name: 'Café des Délices',
      lat: 36.8465,
      lng: 10.3233,
      type: ['cafe'],
    },
    {
      id: 3,
      name: 'Hotel Africa',
      lat: 36.8008,
      lng: 10.1817,
      type: ['hotel'],
    },
  ];

  onMapMoved(event: MapMoveEvent): void {
    console.log('Map moved:', event);
  }

  onMarkerClicked(id: number): void {
    console.log('Marker clicked:', id);
    this.selectedId = id;
  }
}

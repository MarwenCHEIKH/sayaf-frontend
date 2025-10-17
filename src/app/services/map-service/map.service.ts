import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { MapBounds, MarkerData } from '../../models/map.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class MapService {
  private platformId = inject(PLATFORM_ID);
  parsePostGISPoint(
    point?: string | { type: string; coordinates: [number, number] }
  ): { lat: number; lng: number } | null {
    if (!point) return null;

    // Handle GeoJSON object format
    if (typeof point === 'object' && Array.isArray(point.coordinates)) {
      const [lng, lat] = point.coordinates;
      return { lat, lng };
    }

    return null;
  }

  createMarkerIcon(L: any, type: string[], isSelected = false): any {
    if (!isPlatformBrowser(this.platformId)) return null;

    const primaryType = type[0] || 'other';
    const iconMap: Record<string, string> = {
      restaurant: '🍴',
      cafe: '☕',
      hotel: '🏨',
      museum: '🏛️',
      park: '🌳',
      shopping: '🛍️',
      bar: '🍺',
      beach: '🏖️',
      default: '📍',
    };

    const emoji = iconMap[primaryType] || iconMap['default'];
    const bgColor = isSelected ? '#2196F3' : '#FF5722';

    return L.divIcon({
      html: `
        <div style="
          background: ${bgColor};
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <span style="transform: rotate(45deg); font-size: 18px;">${emoji}</span>
        </div>
      `,
      className: 'custom-marker-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  }

  createPopupContent(marker: MarkerData): string {
    return `
      <div style="min-width: 200px;">
        ${
          marker.photo
            ? `<img src="${marker.photo}"
               style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
               alt="${marker.name}" />`
            : ''
        }
        <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">${
          marker.name
        }</h3>
        <p style="margin: 0; font-size: 12px; color: #666;">${marker.type.join(
          ', '
        )}</p>
      </div>
    `;
  }

  calculateBounds(map: any): MapBounds {
    if (!isPlatformBrowser(this.platformId))
      return { north: 0, south: 0, east: 0, west: 0 };
    return {
      north: map.getBounds().getNorth(),
      south: map.getBounds().getSouth(),
      east: map.getBounds().getEast(),
      west: map.getBounds().getWest(),
    };
  }

  isMarkerInBounds(marker: MarkerData, bounds: MapBounds): boolean {
    return (
      marker.lat >= bounds.south &&
      marker.lat <= bounds.north &&
      marker.lng >= bounds.west &&
      marker.lng <= bounds.east
    );
  }
}

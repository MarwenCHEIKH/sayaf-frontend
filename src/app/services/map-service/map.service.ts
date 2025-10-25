// src/app/services/map-service/map.service.ts
import { Injectable } from '@angular/core';
import { MarkerData } from '../../models/map.model';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  /**
   * Creates a modern circular marker icon with restaurant/cafe symbols
   * Size indicates importance/density, no text displayed
   */
  createMarkerIcon(L: any, type: string, isSelected: boolean = false): any {
    const size = 32; // Base size for individual listings
    const iconSize = 16; // Icon size inside circle

    // Modern colors
    const bgColor = isSelected ? '#FF6B35' : '#2196F3';
    const borderColor = '#FFFFFF';
    const shadowColor = 'rgba(0, 0, 0, 0.3)';

    // SVG icon based on type
    const iconSvg = this.getIconSvg(type);

    const html = `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          background: ${bgColor};
          border: 3px solid ${borderColor};
          border-radius: 50%;
          box-shadow: 0 3px 8px ${shadowColor};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          cursor: pointer;
        ">
          ${iconSvg}
        </div>
        ${
          isSelected
            ? `
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            width: ${size + 8}px;
            height: ${size + 8}px;
            border: 2px solid ${bgColor};
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          "></div>
        `
            : ''
        }
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      </style>
    `;

    return L.divIcon({
      html,
      className: 'modern-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  /**
   * Creates a modern cluster icon - size-based, no text
   * Size indicates density of listings
   */
  createClusterIcon(
    L: any,
    count: number,
    isBackendCluster: boolean = false
  ): any {
    const size = this.getClusterSize(count);
    const iconSize = size * 0.4; // Icon scales with cluster size

    const bgColor = '#2196F3';
    const borderColor = '#FFFFFF';
    const shadowColor = 'rgba(0, 0, 0, 0.35)';

    // Use a generic restaurant icon for clusters
    const iconSvg = this.getClusterIconSvg(iconSize);

    const html = `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bgColor};
        border: 4px solid ${borderColor};
        border-radius: 50%;
        box-shadow: 0 4px 12px ${shadowColor};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
      ">
        ${iconSvg}
        ${
          isBackendCluster
            ? `
          <div style="
            position: absolute;
            bottom: -8px;
            right: -8px;
            background: #FF6B35;
            color: white;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 10px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${this.formatCount(count)}</div>
        `
            : ''
        }
      </div>
    `;

    return L.divIcon({
      html,
      className: 'modern-cluster',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  /**
   * Determines cluster size based on count
   * Small visual differences create elegant density indication
   */
  private getClusterSize(count: number): number {
    if (count <= 10) return 40;
    if (count <= 50) return 50;
    if (count <= 100) return 60;
    return 70;
  }

  /**
   * Format count for badge display (1K, 10K, etc.)
   */
  private formatCount(count: number): string {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  }

  /**
   * Returns SVG icon based on listing type
   */
  private getIconSvg(type: string): string {
    const iconColor = '#FFFFFF';
    const size = 16;

    switch (type.toLowerCase()) {
      case 'restaurant':
        // Fork and knife icon
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 3V9.5C8.5 10.33 7.83 11 7 11C6.17 11 5.5 10.33 5.5 9.5V3H4V9.5C4 11.16 5.34 12.5 7 12.5V21H8.5V12.5C10.16 12.5 11.5 11.16 11.5 9.5V3H10V9.5C10 10.33 9.33 11 8.5 11V3H8.5Z" fill="${iconColor}"/>
            <path d="M15 3V11.5C15 12.33 15.67 13 16.5 13V21H18V13C18.83 13 19.5 12.33 19.5 11.5V3H18V10H17V3H16V10H15V3H15Z" fill="${iconColor}"/>
          </svg>
        `;
      case 'cafe':
      case 'coffee':
        // Coffee cup icon
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 19H20V21H2V19ZM18.5 4H19.5C20.6 4 21.5 4.9 21.5 6V10C21.5 11.1 20.6 12 19.5 12H18.5V13C18.5 15.21 16.71 17 14.5 17H7.5C5.29 17 3.5 15.21 3.5 13V6C3.5 4.9 4.4 4 5.5 4H18.5ZM18.5 10H19.5V6H18.5V10Z" fill="${iconColor}"/>
          </svg>
        `;
      case 'bar':
      case 'pub':
        // Wine glass icon
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3L4 9C4 11.97 6.16 14.43 9 14.9V21H15V14.9C17.84 14.43 20 11.97 20 9L18 3H6ZM7.5 5H16.5L17.5 9C17.5 10.93 15.93 12.5 14 12.5H10C8.07 12.5 6.5 10.93 6.5 9L7.5 5Z" fill="${iconColor}"/>
          </svg>
        `;
      case 'fast food':
      case 'fastfood':
        // Burger icon
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 21H23V19H1V21ZM1 17H23V15H1V17ZM2 13H22C22 11.9 21.1 11 20 11V8C20 5.79 18.21 4 16 4C14.9 4 13.9 4.45 13.17 5.17C12.45 4.45 11.44 4 10.33 4C8.12 4 6.33 5.79 6.33 8V11C5.23 11 4.33 11.9 4.33 13H2Z" fill="${iconColor}"/>
          </svg>
        `;
      default:
        // Generic dining icon
        return `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" stroke="${iconColor}" stroke-width="2" fill="none"/>
            <path d="M8 12L11 15L16 9" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
    }
  }

  /**
   * Returns cluster icon SVG (used for aggregated listings)
   */
  private getClusterIconSvg(size: number): string {
    const iconColor = '#FFFFFF';

    // Use a multi-restaurant icon to indicate multiple listings
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="7" r="2" fill="${iconColor}"/>
        <circle cx="17" cy="7" r="2" fill="${iconColor}"/>
        <circle cx="7" cy="17" r="2" fill="${iconColor}"/>
        <circle cx="17" cy="17" r="2" fill="${iconColor}"/>
        <circle cx="12" cy="12" r="3" fill="${iconColor}"/>
      </svg>
    `;
  }

  /**
   * Creates popup content with modern styling
   */
  createPopupContent(marker: MarkerData): string {
    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 4px;
        min-width: 200px;
      ">
        ${
          marker.photo
            ? `
          <img
            src="${marker.photo}"
            alt="${marker.name}"
            style="
              width: 100%;
              height: 120px;
              object-fit: cover;
              border-radius: 8px;
              margin-bottom: 8px;
            "
          />
        `
            : ''
        }
        <h3 style="
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        ">${marker.name}</h3>
        <p style="
          margin: 0;
          font-size: 13px;
          color: #666;
          text-transform: capitalize;
        ">${marker.type}</p>
      </div>
    `;
  }

  /**
   * Creates cluster popup content showing count
   */
  createClusterPopupContent(count: number, name?: string): string {
    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 8px;
        text-align: center;
      ">
        <div style="
          font-size: 24px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 4px;
        ">${count}</div>
        <div style="
          font-size: 14px;
          color: #666;
        ">${name || 'Listings in this area'}</div>
        <div style="
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        ">Click to zoom in</div>
      </div>
    `;
  }

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

  calculateBounds(map: any): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const bounds = map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }
}

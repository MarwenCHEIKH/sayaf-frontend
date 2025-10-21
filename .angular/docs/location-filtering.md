# Location Filtering & Caching Strategy

## Purpose

Explain why we need location caching, bbox queries, and how listings are filtered.

## Current Problem

- Centroid + radius is unreliable
- Bounding box is only used in "search as map moves"
- Need consistent, complete results for infinite scroll

## Proposed Approach

1. Cache locations with bbox, type, metadata
2. Use cache for initial listings fetch
3. Optional Nominatim fallback for unknown locations
4. Enrich cache later with images and metadata
5. Build autocomplete/typeahead from cached locations

## Benefits

- Deterministic bbox
- Faster queries
- Supports rich UI with images
- Offline-proof once cache is complete

## Implementation Notes

- Database schema for `location_cache`
- How controller/service interacts with cache
- Frontend behavior for search and map

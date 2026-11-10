import type { GeofenceGeometry, GeofenceCoordinate } from '../types';

/**
 * Check if a point is inside a polygon using the ray-casting algorithm.
 */
export function isPointInPolygon(
  point: GeofenceCoordinate,
  polygon: GeofenceCoordinate[]
): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  const { lat: x, lng: y } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is inside a circle.
 * Uses the Haversine formula for distance calculation.
 */
export function isPointInCircle(
  point: GeofenceCoordinate,
  center: GeofenceCoordinate,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * Calculate distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  point1: GeofenceCoordinate,
  point2: GeofenceCoordinate
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) *
      Math.cos(toRadians(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is inside a geofence.
 */
export function isPointInGeofence(
  point: GeofenceCoordinate,
  geometry: GeofenceGeometry
): boolean {
  if (geometry.type === 'polygon' && geometry.coordinates) {
    return isPointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === 'circle' && geometry.center && geometry.radius) {
    return isPointInCircle(point, geometry.center, geometry.radius);
  }
  return false;
}

/**
 * Convert a polygon's coordinates to Leaflet LatLng format.
 */
export function geofenceToLatLngs(
  geometry: GeofenceGeometry
): [number, number][] {
  if (geometry.type === 'polygon' && geometry.coordinates) {
    return geometry.coordinates.map((c) => [c.lat, c.lng]);
  }
  return [];
}

/**
 * Calculate the center of a polygon.
 */
export function getPolygonCenter(
  coordinates: GeofenceCoordinate[]
): GeofenceCoordinate {
  if (coordinates.length === 0) return { lat: 0, lng: 0 };

  const sum = coordinates.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lng: acc.lng + c.lng }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / coordinates.length,
    lng: sum.lng / coordinates.length,
  };
}


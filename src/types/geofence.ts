export type GeofenceZoneType = 'safe' | 'restricted' | 'danger';

export interface GeofenceCoordinate {
  lat: number;
  lng: number;
}

export interface GeofenceGeometry {
  type: 'polygon' | 'circle';
  coordinates?: GeofenceCoordinate[];
  center?: GeofenceCoordinate;
  radius?: number; // meters
}

export interface Geofence {
  id: string;
  name: string;
  zone_type: GeofenceZoneType;
  geometry: GeofenceGeometry;
  is_active: boolean;
  created_at: string;
}

export type GeofenceEventType = 'enter' | 'exit';

export interface GeofenceEvent {
  id: string;
  worker_id: string;
  geofence_id: string;
  event_type: GeofenceEventType;
  latitude: number;
  longitude: number;
  created_at: string;
  // Joined fields
  worker?: {
    full_name: string;
    worker_code: string;
  } | null;
  geofence?: {
    name: string;
    zone_type: GeofenceZoneType;
  } | null;
}

export const ZONE_TYPE_COLORS: Record<GeofenceZoneType, string> = {
  safe: '#22c55e',
  restricted: '#f59e0b',
  danger: '#ef4444',
};

export const ZONE_TYPE_LABELS: Record<GeofenceZoneType, string> = {
  safe: 'Safe Zone',
  restricted: 'Restricted Zone',
  danger: 'Danger Zone',
};


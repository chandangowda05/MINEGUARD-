export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertType =
  | 'HIGH_TEMPERATURE'
  | 'HIGH_HUMIDITY'
  | 'HAZARDOUS_GAS'
  | 'CARBON_MONOXIDE'
  | 'WORKER_INACTIVITY'
  | 'POSSIBLE_FALL'
  | 'SUDDEN_IMPACT'
  | 'RESTRICTED_ZONE_ENTRY'
  | 'SAFE_ZONE_EXIT'
  | 'EMERGENCY_SOS'
  | 'HELMET_OFFLINE'
  | 'GPS_SIGNAL_LOST';

export interface Alert {
  id: string;
  worker_id: string | null;
  helmet_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  description: string;
  latitude: number | null;
  longitude: number | null;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
  // Joined fields
  worker?: {
    full_name: string;
    worker_code: string;
  } | null;
  helmet?: {
    helmet_code: string;
  } | null;
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  HIGH_TEMPERATURE: 'High Temperature',
  HIGH_HUMIDITY: 'High Humidity',
  HAZARDOUS_GAS: 'Hazardous Gas Detection',
  CARBON_MONOXIDE: 'Carbon Monoxide Warning',
  WORKER_INACTIVITY: 'Worker Inactivity',
  POSSIBLE_FALL: 'Possible Worker Fall',
  SUDDEN_IMPACT: 'Sudden Impact',
  RESTRICTED_ZONE_ENTRY: 'Restricted Zone Entry',
  SAFE_ZONE_EXIT: 'Safe Zone Exit',
  EMERGENCY_SOS: 'Emergency SOS',
  HELMET_OFFLINE: 'Helmet Offline',
  GPS_SIGNAL_LOST: 'GPS Signal Lost',
};

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};


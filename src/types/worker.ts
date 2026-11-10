export type WorkerStatus = 'safe' | 'warning' | 'critical' | 'inactive' | 'offline';

export interface Worker {
  id: string;
  worker_code: string;
  full_name: string;
  assigned_helmet_id: string | null;
  mining_zone: string | null;
  status: WorkerStatus;
  created_at: string;
}

export interface WorkerWithHelmet extends Worker {
  helmet?: Helmet | null;
  latest_location?: WorkerLocation | null;
  latest_reading?: import('./sensor').SensorReading | null;
}

export interface Helmet {
  id: string;
  helmet_code: string;
  esp32_device_id: string | null;
  worker_id: string | null;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface WorkerLocation {
  id: number;
  worker_id: string;
  helmet_id: string;
  latitude: number;
  longitude: number;
  gps_valid: boolean;
  created_at: string;
}

export interface WorkerActivity {
  id: number;
  worker_id: string;
  helmet_id: string;
  activity_status: string;
  inactivity_duration: number | null;
  created_at: string;
}

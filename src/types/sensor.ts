export interface SensorReading {
  id: number;
  helmet_id: string;
  temperature: number | null;
  humidity: number | null;
  mq3_raw: number | null;
  mq7_raw: number | null;
  mq7_ppm: number | null;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  gyro_x: number | null;
  gyro_y: number | null;
  gyro_z: number | null;
  movement_status: string | null;
  created_at: string;
}

export interface SensorThresholds {
  temperature_warning: number;
  temperature_critical: number;
  humidity_warning: number;
  humidity_critical: number;
  mq3_warning: number;
  mq3_critical: number;
  mq7_warning: number;
  mq7_critical: number;
  inactivity_duration_seconds: number;
  fall_impact_threshold: number;
  movement_sensitivity: number;
}

export type SensorStatus = 'normal' | 'warning' | 'critical' | 'unknown';

export interface SensorCard {
  label: string;
  value: number | string | null;
  unit: string;
  status: SensorStatus;
  icon: string;
  lastUpdated: string | null;
}


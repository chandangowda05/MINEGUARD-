import type { SensorThresholds, SensorStatus } from '../types';
import { DEFAULT_THRESHOLDS } from '../config/constants';

export function getSensorStatus(
  value: number | null | undefined,
  warningThreshold: number,
  criticalThreshold: number
): SensorStatus {
  if (value === null || value === undefined) return 'unknown';
  if (value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'normal';
}

export function getTemperatureStatus(
  value: number | null | undefined,
  thresholds: SensorThresholds = DEFAULT_THRESHOLDS
): SensorStatus {
  return getSensorStatus(value, thresholds.temperature_warning, thresholds.temperature_critical);
}

export function getHumidityStatus(
  value: number | null | undefined,
  thresholds: SensorThresholds = DEFAULT_THRESHOLDS
): SensorStatus {
  return getSensorStatus(value, thresholds.humidity_warning, thresholds.humidity_critical);
}

export function getMQ3Status(
  value: number | null | undefined,
  thresholds: SensorThresholds = DEFAULT_THRESHOLDS
): SensorStatus {
  return getSensorStatus(value, thresholds.mq3_warning, thresholds.mq3_critical);
}

export function getMQ7Status(
  value: number | null | undefined,
  thresholds: SensorThresholds = DEFAULT_THRESHOLDS
): SensorStatus {
  return getSensorStatus(value, thresholds.mq7_warning, thresholds.mq7_critical);
}

export function getMovementStatus(
  accelX: number | null,
  accelY: number | null,
  accelZ: number | null,
  sensitivity: number = DEFAULT_THRESHOLDS.movement_sensitivity
): string {
  if (accelX === null || accelY === null || accelZ === null) return 'Unknown';
  
  // Calculate magnitude of acceleration vector (subtract gravity ~9.8)
  const magnitude = Math.sqrt(accelX ** 2 + accelY ** 2 + accelZ ** 2);
  const deviation = Math.abs(magnitude - 9.81);
  
  if (deviation > sensitivity * 3) return 'High Activity';
  if (deviation > sensitivity) return 'Moving';
  return 'Stationary';
}

export function detectPossibleFall(
  accelX: number | null,
  accelY: number | null,
  accelZ: number | null,
  gyroX: number | null,
  gyroY: number | null,
  gyroZ: number | null,
  impactThreshold: number = DEFAULT_THRESHOLDS.fall_impact_threshold
): { detected: boolean; magnitude: number } {
  if (accelX === null || accelY === null || accelZ === null) {
    return { detected: false, magnitude: 0 };
  }

  const accelMagnitude = Math.sqrt(accelX ** 2 + accelY ** 2 + accelZ ** 2);
  
  let gyroMagnitude = 0;
  if (gyroX !== null && gyroY !== null && gyroZ !== null) {
    gyroMagnitude = Math.sqrt(gyroX ** 2 + gyroY ** 2 + gyroZ ** 2);
  }

  // Possible fall: sudden high acceleration + significant angular velocity
  const totalMagnitude = accelMagnitude + gyroMagnitude * 0.5;
  
  return {
    detected: totalMagnitude > impactThreshold,
    magnitude: totalMagnitude,
  };
}

export const STATUS_COLORS: Record<SensorStatus, string> = {
  normal: 'text-green-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  unknown: 'text-slate-500',
};

export const STATUS_BG_COLORS: Record<SensorStatus, string> = {
  normal: 'bg-green-400/10 border-green-400/30',
  warning: 'bg-amber-400/10 border-amber-400/30',
  critical: 'bg-red-400/10 border-red-400/30',
  unknown: 'bg-slate-400/10 border-slate-400/30',
};

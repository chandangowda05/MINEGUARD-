import type { SensorThresholds } from '../types';

/**
 * Default demonstration thresholds.
 * 
 * WARNING: These are NOT officially approved mining safety standards.
 * They are demonstration values only and MUST be calibrated and approved
 * by qualified safety personnel before any operational use.
 */
export const DEFAULT_THRESHOLDS: SensorThresholds = {
  temperature_warning: 35,
  temperature_critical: 45,
  humidity_warning: 80,
  humidity_critical: 95,
  mq3_warning: 2500,
  mq3_critical: 3600,
  mq7_warning: 250,
  mq7_critical: 450,
  inactivity_duration_seconds: 300,
  fall_impact_threshold: 25,
  movement_sensitivity: 1.5,
};

/**
 * Application-wide constants.
 */
export const APP_CONFIG = {
  APP_NAME: 'MINEGUARD',
  APP_TAGLINE: 'Protecting Lives Through Intelligent Monitoring',
  
  // Polling intervals (ms)
  SENSOR_POLL_INTERVAL: 5000,
  LOCATION_POLL_INTERVAL: 10000,
  ALERT_POLL_INTERVAL: 3000,
  
  // Map defaults
  DEFAULT_MAP_CENTER: { lat: 12.9716, lng: 77.5946 } as const,
  DEFAULT_MAP_ZOOM: 15,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 25,
  
  // Alert sound
  ALERT_SOUND_ENABLED_KEY: 'mineguard_alert_sound_enabled',
  
  // Demo mode
  DEMO_MODE_KEY: 'mineguard_demo_mode',
} as const;

/**
 * Color palette for the dark industrial theme.
 */
export const THEME = {
  bg: {
    primary: '#0a0e1a',
    secondary: '#111827',
    card: '#1a1f2e',
    cardHover: '#222839',
  },
  accent: {
    primary: '#06b6d4',     // Electric cyan
    secondary: '#f97316',   // Safety orange
    success: '#22c55e',     // Green
    warning: '#f59e0b',     // Amber
    danger: '#ef4444',      // Red
    critical: '#dc2626',    // Dark red
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
} as const;


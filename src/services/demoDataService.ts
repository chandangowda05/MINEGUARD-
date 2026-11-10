import type {
  SensorReading,
  Worker,
  WorkerWithHelmet,
  Helmet,
  WorkerLocation,
  Alert,
  Geofence,
} from '../types';

export const DEMO_HELMET_IDS = [
  'h-001-esp32-alpha',
  'h-002-esp32-beta',
  'h-003-esp32-gamma',
  'h-004-esp32-delta',
  'h-005-esp32-epsilon',
];

export const DEMO_WORKERS: Worker[] = [
  {
    id: 'w-001',
    worker_code: 'MG-W01',
    full_name: 'Rajesh Sharma (Demo)',
    assigned_helmet_id: DEMO_HELMET_IDS[0],
    mining_zone: 'Shaft 4 - Excavation',
    status: 'safe',
    created_at: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    id: 'w-002',
    worker_code: 'MG-W02',
    full_name: 'Amit Patel (Demo)',
    assigned_helmet_id: DEMO_HELMET_IDS[1],
    mining_zone: 'Shaft 2 - Deep Tunnel',
    status: 'warning',
    created_at: new Date(Date.now() - 34000000).toISOString(),
  },
  {
    id: 'w-003',
    worker_code: 'MG-W03',
    full_name: 'Vikram Singh (Demo)',
    assigned_helmet_id: DEMO_HELMET_IDS[2],
    mining_zone: 'Shaft 7 - Gas Zone B',
    status: 'critical',
    created_at: new Date(Date.now() - 32000000).toISOString(),
  },
  {
    id: 'w-004',
    worker_code: 'MG-W04',
    full_name: 'Sunil Kumar (Demo)',
    assigned_helmet_id: DEMO_HELMET_IDS[3],
    mining_zone: 'Sub-Level 3 Conveyor',
    status: 'inactive',
    created_at: new Date(Date.now() - 28000000).toISOString(),
  },
  {
    id: 'w-005',
    worker_code: 'MG-W05',
    full_name: 'Dinesh Reddy (Demo)',
    assigned_helmet_id: DEMO_HELMET_IDS[4],
    mining_zone: 'Surface Workshop',
    status: 'offline',
    created_at: new Date(Date.now() - 25000000).toISOString(),
  },
];

export const DEMO_HELMETS: Helmet[] = [
  {
    id: DEMO_HELMET_IDS[0],
    helmet_code: 'HLMT-101',
    esp32_device_id: 'ESP32-NODE-01',
    worker_id: 'w-001',
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: DEMO_HELMET_IDS[1],
    helmet_code: 'HLMT-102',
    esp32_device_id: 'ESP32-NODE-02',
    worker_id: 'w-002',
    is_online: true,
    last_seen: new Date(Date.now() - 60000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: DEMO_HELMET_IDS[2],
    helmet_code: 'HLMT-103',
    esp32_device_id: 'ESP32-NODE-03',
    worker_id: 'w-003',
    is_online: true,
    last_seen: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: DEMO_HELMET_IDS[3],
    helmet_code: 'HLMT-104',
    esp32_device_id: 'ESP32-NODE-04',
    worker_id: 'w-004',
    is_online: true,
    last_seen: new Date(Date.now() - 400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: DEMO_HELMET_IDS[4],
    helmet_code: 'HLMT-105',
    esp32_device_id: 'ESP32-NODE-05',
    worker_id: 'w-005',
    is_online: false,
    last_seen: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Open mine reference center: Kolar Gold Fields / Standard Open Pit demo coordinates
export const DEMO_MINE_CENTER = { lat: 12.9592, lng: 78.2718 };

export const DEMO_LOCATIONS: WorkerLocation[] = [
  {
    id: 1,
    worker_id: 'w-001',
    helmet_id: DEMO_HELMET_IDS[0],
    latitude: 12.9598,
    longitude: 78.2725,
    gps_valid: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    worker_id: 'w-002',
    helmet_id: DEMO_HELMET_IDS[1],
    latitude: 12.9585,
    longitude: 78.2709,
    gps_valid: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    worker_id: 'w-003',
    helmet_id: DEMO_HELMET_IDS[2],
    latitude: 12.9610,
    longitude: 78.2735,
    gps_valid: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    worker_id: 'w-004',
    helmet_id: DEMO_HELMET_IDS[3],
    latitude: 12.9575,
    longitude: 78.2690,
    gps_valid: true,
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 5,
    worker_id: 'w-005',
    helmet_id: DEMO_HELMET_IDS[4],
    latitude: 0,
    longitude: 0,
    gps_valid: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const DEMO_GEOFENCES: Geofence[] = [
  {
    id: 'geo-01',
    name: 'Main Quarry Safe Perimeter',
    zone_type: 'safe',
    is_active: true,
    geometry: {
      type: 'polygon',
      coordinates: [
        { lat: 12.9620, lng: 78.2680 },
        { lat: 12.9625, lng: 78.2750 },
        { lat: 12.9560, lng: 78.2760 },
        { lat: 12.9550, lng: 78.2670 },
      ],
    },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'geo-02',
    name: 'Blasting Area Zone 3 (Danger)',
    zone_type: 'danger',
    is_active: true,
    geometry: {
      type: 'circle',
      center: { lat: 12.9610, lng: 78.2735 },
      radius: 120, // 120m
    },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'geo-03',
    name: 'High Voltage Transformer Station',
    zone_type: 'restricted',
    is_active: true,
    geometry: {
      type: 'polygon',
      coordinates: [
        { lat: 12.9580, lng: 78.2700 },
        { lat: 12.9590, lng: 78.2700 },
        { lat: 12.9590, lng: 78.2715 },
        { lat: 12.9580, lng: 78.2715 },
      ],
    },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alt-001',
    worker_id: 'w-003',
    helmet_id: DEMO_HELMET_IDS[2],
    alert_type: 'EMERGENCY_SOS',
    severity: 'CRITICAL',
    description: 'Worker manual SOS push button activated in Shaft 7!',
    latitude: 12.9610,
    longitude: 78.2735,
    acknowledged: false,
    resolved: false,
    created_at: new Date(Date.now() - 120000).toISOString(),
    worker: { full_name: 'Vikram Singh (Demo)', worker_code: 'MG-W03' },
    helmet: { helmet_code: 'HLMT-103' },
  },
  {
    id: 'alt-002',
    worker_id: 'w-003',
    helmet_id: DEMO_HELMET_IDS[2],
    alert_type: 'RESTRICTED_ZONE_ENTRY',
    severity: 'HIGH',
    description: 'Worker entered Blasting Area Zone 3 (Danger Zone violation).',
    latitude: 12.9610,
    longitude: 78.2735,
    acknowledged: true,
    resolved: false,
    created_at: new Date(Date.now() - 600000).toISOString(),
    worker: { full_name: 'Vikram Singh (Demo)', worker_code: 'MG-W03' },
    helmet: { helmet_code: 'HLMT-103' },
  },
  {
    id: 'alt-003',
    worker_id: 'w-002',
    helmet_id: DEMO_HELMET_IDS[1],
    alert_type: 'CARBON_MONOXIDE',
    severity: 'MEDIUM',
    description: 'Elevated CO concentration detected (62 ppm).',
    latitude: 12.9585,
    longitude: 78.2709,
    acknowledged: false,
    resolved: false,
    created_at: new Date(Date.now() - 1500000).toISOString(),
    worker: { full_name: 'Amit Patel (Demo)', worker_code: 'MG-W02' },
    helmet: { helmet_code: 'HLMT-102' },
  },
  {
    id: 'alt-004',
    worker_id: 'w-004',
    helmet_id: DEMO_HELMET_IDS[3],
    alert_type: 'WORKER_INACTIVITY',
    severity: 'MEDIUM',
    description: 'No movement detected for > 5 minutes in Sub-Level 3.',
    latitude: 12.9575,
    longitude: 78.2690,
    acknowledged: true,
    resolved: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    worker: { full_name: 'Sunil Kumar (Demo)', worker_code: 'MG-W04' },
    helmet: { helmet_code: 'HLMT-104' },
  },
  {
    id: 'alt-005',
    worker_id: 'w-005',
    helmet_id: DEMO_HELMET_IDS[4],
    alert_type: 'HELMET_OFFLINE',
    severity: 'LOW',
    description: 'Telemetry heartbeat lost from helmet HLMT-105.',
    latitude: 0,
    longitude: 0,
    acknowledged: true,
    resolved: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    worker: { full_name: 'Dinesh Reddy (Demo)', worker_code: 'MG-W05' },
    helmet: { helmet_code: 'HLMT-105' },
  },
];

/**
 * Generate a dynamic demo reading with realistic variations.
 */
export function generateDemoSensorReading(helmetId: string): SensorReading {
  const isDangerWorker = helmetId === DEMO_HELMET_IDS[2];
  const isWarningWorker = helmetId === DEMO_HELMET_IDS[1];

  const tempBase = isDangerWorker ? 42.4 : isWarningWorker ? 36.8 : 28.5;
  const humidityBase = isDangerWorker ? 88 : isWarningWorker ? 82 : 62;
  const mq3Base = isDangerWorker ? 2400 : isWarningWorker ? 1650 : 750;
  const mq7Base = isDangerWorker ? 180 : isWarningWorker ? 65 : 18;

  const jitter = (range: number) => (Math.random() - 0.5) * range;

  return {
    id: Math.floor(Date.now() + Math.random() * 1000),
    helmet_id: helmetId,
    temperature: parseFloat((tempBase + jitter(1.5)).toFixed(1)),
    humidity: parseFloat((humidityBase + jitter(3)).toFixed(1)),
    mq3_raw: Math.round(mq3Base + jitter(50)),
    mq7_raw: Math.round(mq7Base * 15 + jitter(40)),
    mq7_ppm: parseFloat((mq7Base + jitter(4)).toFixed(1)),
    accel_x: parseFloat((jitter(0.4)).toFixed(2)),
    accel_y: parseFloat((jitter(0.4)).toFixed(2)),
    accel_z: parseFloat((9.8 + jitter(0.5)).toFixed(2)),
    gyro_x: parseFloat((jitter(0.1)).toFixed(2)),
    gyro_y: parseFloat((jitter(0.1)).toFixed(2)),
    gyro_z: parseFloat((jitter(0.1)).toFixed(2)),
    movement_status: isDangerWorker ? 'High Activity' : isWarningWorker ? 'Moving' : 'Stationary',
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate historical sensor readings over N hours.
 */
export function generateDemoSensorHistory(
  helmetId: string,
  hours: number = 24
): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = Date.now();
  const stepMs = (hours * 3600 * 1000) / 24; // 24 points

  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now - i * stepMs).toISOString();
    const reading = generateDemoSensorReading(helmetId);
    reading.created_at = timestamp;
    readings.push(reading);
  }

  return readings;
}


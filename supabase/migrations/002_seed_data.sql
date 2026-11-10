-- ============================================================================
-- MINEGUARD Seed Data Migration
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================================

-- 1. Insert Initial Helmets
INSERT INTO helmets (id, helmet_code, esp32_device_id, is_online, last_seen)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'HLMT-101', 'ESP32-NODE-01', TRUE, NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'HLMT-102', 'ESP32-NODE-02', TRUE, NOW() - INTERVAL '1 minute'),
  ('a3333333-3333-3333-3333-333333333333', 'HLMT-103', 'ESP32-NODE-03', TRUE, NOW()),
  ('a4444444-4444-4444-4444-444444444444', 'HLMT-104', 'ESP32-NODE-04', TRUE, NOW() - INTERVAL '5 minutes'),
  ('a5555555-5555-5555-5555-555555555555', 'HLMT-105', 'ESP32-NODE-05', FALSE, NOW() - INTERVAL '2 hours')
ON CONFLICT (helmet_code) DO NOTHING;

-- 2. Insert Initial Mine Workers
INSERT INTO workers (id, worker_code, full_name, assigned_helmet_id, mining_zone, status)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'MG-W01', 'Rajesh Sharma', 'a1111111-1111-1111-1111-111111111111', 'Shaft 4 - Excavation', 'safe'),
  ('b2222222-2222-2222-2222-222222222222', 'MG-W02', 'Amit Patel', 'a2222222-2222-2222-2222-222222222222', 'Shaft 2 - Deep Tunnel', 'warning'),
  ('b3333333-3333-3333-3333-333333333333', 'MG-W03', 'Vikram Singh', 'a3333333-3333-3333-3333-333333333333', 'Shaft 7 - Gas Zone B', 'critical'),
  ('b4444444-4444-4444-4444-444444444444', 'MG-W04', 'Sunil Kumar', 'a4444444-4444-4444-4444-444444444444', 'Sub-Level 3 Conveyor', 'inactive'),
  ('b5555555-5555-5555-5555-555555555555', 'MG-W05', 'Dinesh Reddy', 'a5555555-5555-5555-5555-555555555555', 'Surface Workshop', 'offline')
ON CONFLICT (worker_code) DO NOTHING;

-- Update circular worker_id in helmets
UPDATE helmets SET worker_id = 'b1111111-1111-1111-1111-111111111111' WHERE id = 'a1111111-1111-1111-1111-111111111111';
UPDATE helmets SET worker_id = 'b2222222-2222-2222-2222-222222222222' WHERE id = 'a2222222-2222-2222-2222-222222222222';
UPDATE helmets SET worker_id = 'b3333333-3333-3333-3333-333333333333' WHERE id = 'a3333333-3333-3333-3333-333333333333';
UPDATE helmets SET worker_id = 'b4444444-4444-4444-4444-444444444444' WHERE id = 'a4444444-4444-4444-4444-444444444444';
UPDATE helmets SET worker_id = 'b5555555-5555-5555-5555-555555555555' WHERE id = 'a5555555-5555-5555-5555-555555555555';

-- 3. Insert Initial Geofences
INSERT INTO geofences (id, name, zone_type, geometry, is_active)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'Main Quarry Safe Perimeter',
    'safe',
    '{"type": "polygon", "coordinates": [{"lat": 12.9620, "lng": 78.2680}, {"lat": 12.9625, "lng": 78.2750}, {"lat": 12.9560, "lng": 78.2760}, {"lat": 12.9550, "lng": 78.2670}]}',
    TRUE
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'Blasting Area Zone 3 (Danger)',
    'danger',
    '{"type": "circle", "center": {"lat": 12.9610, "lng": 78.2735}, "radius": 120}',
    TRUE
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'High Voltage Transformer Station',
    'restricted',
    '{"type": "polygon", "coordinates": [{"lat": 12.9580, "lng": 78.2700}, {"lat": 12.9590, "lng": 78.2700}, {"lat": 12.9590, "lng": 78.2715}, {"lat": 12.9580, "lng": 78.2715}]}',
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Initial Worker Locations
INSERT INTO worker_locations (worker_id, helmet_id, latitude, longitude, gps_valid)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 12.9598, 78.2725, TRUE),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 12.9585, 78.2709, TRUE),
  ('b3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 12.9610, 78.2735, TRUE),
  ('b4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 12.9575, 78.2690, TRUE),
  ('b5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 0, 0, FALSE);

-- 5. Insert Initial Sensor Readings
INSERT INTO sensor_readings (helmet_id, temperature, humidity, mq3_raw, mq7_raw, mq7_ppm, accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, movement_status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 28.5, 62.0, 750, 270, 18.0, 0.05, 0.10, 9.81, 0.01, 0.02, 0.01, 'Stationary'),
  ('a2222222-2222-2222-2222-222222222222', 36.8, 82.0, 1650, 975, 65.0, 0.20, 0.35, 9.75, 0.05, 0.04, 0.03, 'Moving'),
  ('a3333333-3333-3333-3333-333333333333', 42.4, 88.0, 2400, 2700, 180.0, 0.45, 0.50, 10.20, 0.12, 0.15, 0.09, 'High Activity'),
  ('a4444444-4444-4444-4444-444444444444', 29.1, 64.0, 810, 310, 21.0, 0.00, 0.01, 9.80, 0.00, 0.00, 0.00, 'Stationary');

-- 6. Insert Initial Incidents & Alerts
INSERT INTO alerts (id, worker_id, helmet_id, alert_type, severity, description, latitude, longitude, acknowledged, resolved)
VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'b3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'EMERGENCY_SOS',
    'CRITICAL',
    'Worker manual SOS push button activated in Shaft 7!',
    12.9610,
    78.2735,
    FALSE,
    FALSE
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'RESTRICTED_ZONE_ENTRY',
    'HIGH',
    'Worker entered Blasting Area Zone 3 (Danger Zone violation).',
    12.9610,
    78.2735,
    TRUE,
    FALSE
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'CARBON_MONOXIDE',
    'MEDIUM',
    'Elevated CO concentration detected (65 ppm).',
    12.9585,
    78.2709,
    FALSE,
    FALSE
  );


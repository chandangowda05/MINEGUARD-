-- ============================================================================
-- MINEGUARD - INSTANT FIX: ENABLE RLS ACCESS FOR ESP32 & DASHBOARD
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/nfmziyqvklujuauostug/sql
-- ============================================================================

-- 1. DROP EXISTING POLICIES TO AVOID DUPLICATE ERRORS
DROP POLICY IF EXISTS "Public anon access on workers" ON workers;
DROP POLICY IF EXISTS "Public anon access on helmets" ON helmets;
DROP POLICY IF EXISTS "Public anon access on sensor_readings" ON sensor_readings;
DROP POLICY IF EXISTS "Public anon access on worker_locations" ON worker_locations;
DROP POLICY IF EXISTS "Public anon access on alerts" ON alerts;
DROP POLICY IF EXISTS "Public anon access on geofences" ON geofences;
DROP POLICY IF EXISTS "Public anon access on geofence_events" ON geofence_events;
DROP POLICY IF EXISTS "Public anon access on worker_activity" ON worker_activity;
DROP POLICY IF EXISTS "Public anon access on system_settings" ON system_settings;

-- 2. CREATE PERMISSIVE POLICIES FOR BOTH ANON (ESP32/DASHBOARD) AND AUTHENTICATED
CREATE POLICY "Public anon access on workers" ON workers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on helmets" ON helmets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on sensor_readings" ON sensor_readings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on worker_locations" ON worker_locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on alerts" ON alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on geofences" ON geofences FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on geofence_events" ON geofence_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on worker_activity" ON worker_activity FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public anon access on system_settings" ON system_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. INSERT HARDWARE HELMETS
INSERT INTO helmets (id, helmet_code, esp32_device_id, is_online, last_seen)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'HLMT-101', 'ESP32-MINE-01', TRUE, NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'HLMT-102', 'ESP32-MINE-02', TRUE, NOW()),
  ('a3333333-3333-3333-3333-333333333333', 'HLMT-103', 'ESP32-MINE-03', TRUE, NOW()),
  ('a4444444-4444-4444-4444-444444444444', 'HLMT-104', 'ESP32-MINE-04', TRUE, NOW()),
  ('a5555555-5555-5555-5555-555555555555', 'HLMT-105', 'ESP32-MINE-05', FALSE, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO UPDATE 
SET is_online = EXCLUDED.is_online,
    last_seen = NOW();

-- 4. INSERT WORKERS (using lowercase 'safe' to satisfy status check constraint)
INSERT INTO workers (id, worker_code, full_name, assigned_helmet_id, mining_zone, status)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'MG-W01', 'Rajesh Sharma', 'a1111111-1111-1111-1111-111111111111', 'Shaft 4B - Deep Extraction', 'safe'),
  ('b2222222-2222-2222-2222-222222222222', 'MG-W02', 'Vikram Patel', 'a2222222-2222-2222-2222-222222222222', 'Tunnel 7 - Vent Zone', 'safe'),
  ('b3333333-3333-3333-3333-333333333333', 'MG-W03', 'Anil Kumar', 'a3333333-3333-3333-3333-333333333333', 'North Face - Drill Zone', 'safe'),
  ('b4444444-4444-4444-4444-444444444444', 'MG-W04', 'Suresh Raina', 'a4444444-4444-4444-4444-444444444444', 'East Gallery - Haulage', 'safe'),
  ('b5555555-5555-5555-5555-555555555555', 'MG-W05', 'Manoj Singh', 'a5555555-5555-5555-5555-555555555555', 'Sub-Level 2 - Maintenance', 'safe')
ON CONFLICT (id) DO UPDATE 
SET status = EXCLUDED.status,
    mining_zone = EXCLUDED.mining_zone;

-- 5. ENABLE REALTIME BROADCASTING
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE worker_locations;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE helmets;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- 6. AUTOMATICALLY LINK HELMET'S ASSIGNED WORKER TO NEW ALERTS
CREATE OR REPLACE FUNCTION set_alert_worker_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.worker_id IS NULL AND NEW.helmet_id IS NOT NULL THEN
    SELECT worker_id INTO NEW.worker_id FROM helmets WHERE id = NEW.helmet_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_alert_worker_id ON alerts;
CREATE TRIGGER trg_set_alert_worker_id
BEFORE INSERT ON alerts
FOR EACH ROW
EXECUTE FUNCTION set_alert_worker_id();

-- 7. ENSURE SENSOR_READINGS HAS ALL MPU-6050 MOTION COLUMNS
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS accel_x FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS accel_y FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS accel_z FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS gyro_x FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS gyro_y FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS gyro_z FLOAT;
ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS movement_status TEXT;

-- 8. RESOLVE OLD LINGERING TEST ALERTS
UPDATE alerts SET resolved = TRUE WHERE resolved = FALSE;

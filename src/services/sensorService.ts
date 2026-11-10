import { supabase } from './supabase';
import type { SensorReading } from '../types';

/**
 * Fetch the most recent sensor reading for a given helmet.
 */
export async function getLatestSensorReading(helmetId: string): Promise<SensorReading | null> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('helmet_id', helmetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[MINEGUARD] Error fetching latest sensor reading:', error);
    return null;
  }
  return data;
}

/**
 * Fetch sensor reading history for a helmet over the past N hours.
 */
export async function getSensorHistory(
  helmetId: string,
  hours: number = 24,
): Promise<SensorReading[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('helmet_id', helmetId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching sensor history:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch the latest sensor reading per helmet.
 * Uses ordering + RPC-style distinct-on via a subquery approach:
 * fetches recent readings ordered by helmet_id and created_at desc,
 * then deduplicates client-side for maximum compatibility.
 */
export async function getAllLatestReadings(): Promise<SensorReading[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MINEGUARD] Error fetching all latest readings:', error);
    return [];
  }

  // Deduplicate: keep only the first (most recent) reading per helmet_id
  const seen = new Set<string>();
  const latest: SensorReading[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.helmet_id)) {
      seen.add(row.helmet_id);
      latest.push(row);
    }
  }
  return latest;
}

/**
 * Fetch sensor readings for a helmet within a specific date range.
 */
export async function getSensorReadingsInRange(
  helmetId: string,
  startDate: string,
  endDate: string,
): Promise<SensorReading[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('helmet_id', helmetId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching sensor readings in range:', error);
    return [];
  }
  return data ?? [];
}

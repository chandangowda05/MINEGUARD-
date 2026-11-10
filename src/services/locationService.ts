import { supabase } from './supabase';
import type { WorkerLocation } from '../types';

/**
 * Fetch the most recent location for a worker.
 */
export async function getLatestLocation(workerId: string): Promise<WorkerLocation | null> {
  const { data, error } = await supabase
    .from('worker_locations')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[MINEGUARD] Error fetching latest location:', error);
    return null;
  }
  return data;
}

/**
 * Fetch the latest location for every worker.
 * Retrieves all locations ordered by recency and deduplicates by worker_id client-side.
 */
export async function getAllLatestLocations(): Promise<WorkerLocation[]> {
  const { data, error } = await supabase
    .from('worker_locations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MINEGUARD] Error fetching all latest locations:', error);
    return [];
  }

  const seen = new Set<string>();
  const latest: WorkerLocation[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.worker_id)) {
      seen.add(row.worker_id);
      latest.push(row);
    }
  }
  return latest;
}

/**
 * Fetch location history for a worker over the past N hours.
 */
export async function getLocationHistory(
  workerId: string,
  hours: number = 24,
): Promise<WorkerLocation[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('worker_locations')
    .select('*')
    .eq('worker_id', workerId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching location history:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Save a new worker location.
 */
export async function saveLocation(
  data: Omit<WorkerLocation, 'id' | 'created_at'>,
): Promise<WorkerLocation> {
  const { data: created, error } = await supabase
    .from('worker_locations')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error saving location:', error);
    throw new Error(`Failed to save location: ${error.message}`);
  }
  return created;
}

import { supabase } from './supabase';
import type { Worker, WorkerWithHelmet, Helmet, WorkerLocation, SensorReading } from '../types';

/**
 * Fetch all workers ordered by full_name.
 */
export async function getWorkers(): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching workers:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch a single worker by ID with joined helmet data.
 */
export async function getWorkerById(id: string): Promise<WorkerWithHelmet | null> {
  const { data: worker, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !worker) {
    console.error('[MINEGUARD] Error fetching worker by id:', error);
    return null;
  }

  let helmet: Helmet | null = null;
  if (worker.assigned_helmet_id) {
    const { data: helmetData } = await supabase
      .from('helmets')
      .select('*')
      .eq('id', worker.assigned_helmet_id)
      .maybeSingle();
    helmet = helmetData ?? null;
  }

  return { ...worker, helmet } as WorkerWithHelmet;
}

/**
 * Create a new worker. A UUID is generated for the id.
 */
export async function createWorker(
  data: Omit<Worker, 'id' | 'created_at'>,
): Promise<Worker> {
  const { data: created, error } = await supabase
    .from('workers')
    .insert({ ...data, id: crypto.randomUUID() })
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error creating worker:', error);
    throw new Error(`Failed to create worker: ${error.message}`);
  }
  return created;
}

/**
 * Update an existing worker.
 */
export async function updateWorker(
  id: string,
  data: Partial<Worker>,
): Promise<Worker> {
  const { data: updated, error } = await supabase
    .from('workers')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error updating worker:', error);
    throw new Error(`Failed to update worker: ${error.message}`);
  }
  return updated;
}

/**
 * Delete a worker by ID.
 */
export async function deleteWorker(id: string): Promise<void> {
  const { error } = await supabase.from('workers').delete().eq('id', id);
  if (error) {
    console.error('[MINEGUARD] Error deleting worker:', error);
    throw new Error(`Failed to delete worker: ${error.message}`);
  }
}

/**
 * Fetch a worker with their latest sensor reading and location.
 */
export async function getWorkerWithLatestData(id: string): Promise<WorkerWithHelmet | null> {
  const worker = await getWorkerById(id);
  if (!worker) return null;

  // Fetch latest sensor reading via the helmet
  let latestReading: SensorReading | null = null;
  if (worker.assigned_helmet_id) {
    const { data } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('helmet_id', worker.assigned_helmet_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    latestReading = data ?? null;
  }

  // Fetch latest location
  let latestLocation: WorkerLocation | null = null;
  {
    const { data } = await supabase
      .from('worker_locations')
      .select('*')
      .eq('worker_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    latestLocation = data ?? null;
  }

  return {
    ...worker,
    latest_reading: latestReading,
    latest_location: latestLocation,
  };
}

/**
 * Fetch all workers with their helmet online status.
 */
export async function getWorkersWithStatus(): Promise<WorkerWithHelmet[]> {
  const workers = await getWorkers();

  // Fetch all helmets
  const { data: helmets } = await supabase.from('helmets').select('*');
  const helmetMap = new Map<string, Helmet>();
  for (const h of helmets ?? []) {
    helmetMap.set(h.id, h);
  }

  return workers.map((w) => {
    const helmet = w.assigned_helmet_id
      ? helmetMap.get(w.assigned_helmet_id) ?? null
      : null;
    return { ...w, helmet } as WorkerWithHelmet;
  });
}

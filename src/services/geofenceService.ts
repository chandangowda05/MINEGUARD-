import { supabase } from './supabase';
import type { Geofence, GeofenceEvent } from '../types';

/**
 * Fetch all active geofences.
 */
export async function getGeofences(): Promise<Geofence[]> {
  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MINEGUARD] Error fetching geofences:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch a geofence by ID.
 */
export async function getGeofenceById(id: string): Promise<Geofence | null> {
  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[MINEGUARD] Error fetching geofence by id:', error);
    return null;
  }
  return data;
}

/**
 * Create a new geofence.
 */
export async function createGeofence(
  data: Omit<Geofence, 'id' | 'created_at'>
): Promise<Geofence | null> {
  const { data: created, error } = await supabase
    .from('geofences')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error creating geofence:', error);
    return null;
  }
  return created;
}

/**
 * Update an existing geofence.
 */
export async function updateGeofence(
  id: string,
  data: Partial<Geofence>
): Promise<Geofence | null> {
  const { data: updated, error } = await supabase
    .from('geofences')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error updating geofence:', error);
    return null;
  }
  return updated;
}

/**
 * Soft delete or hard delete a geofence.
 */
export async function deleteGeofence(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('geofences')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[MINEGUARD] Error deleting geofence:', error);
    return false;
  }
  return true;
}

/**
 * Fetch geofence violation events.
 */
export async function getGeofenceEvents(filters?: {
  workerId?: string;
  geofenceId?: string;
  limit?: number;
}): Promise<GeofenceEvent[]> {
  let query = supabase
    .from('geofence_events')
    .select(`
      *,
      worker:workers(full_name, worker_code),
      geofence:geofences(name, zone_type)
    `)
    .order('created_at', { ascending: false });

  if (filters?.workerId) {
    query = query.eq('worker_id', filters.workerId);
  }
  if (filters?.geofenceId) {
    query = query.eq('geofence_id', filters.geofenceId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[MINEGUARD] Error fetching geofence events:', error);
    return [];
  }
  return (data as unknown as GeofenceEvent[]) ?? [];
}

/**
 * Create a new geofence event (entry or exit).
 */
export async function createGeofenceEvent(
  data: Omit<GeofenceEvent, 'id' | 'created_at' | 'worker' | 'geofence'>
): Promise<GeofenceEvent | null> {
  const { data: created, error } = await supabase
    .from('geofence_events')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error logging geofence event:', error);
    return null;
  }
  return created as unknown as GeofenceEvent;
}

import { supabase } from './supabase';
import type { Helmet } from '../types';

/**
 * Fetch all helmets.
 */
export async function getHelmets(): Promise<Helmet[]> {
  const { data, error } = await supabase
    .from('helmets')
    .select('*')
    .order('helmet_code', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching helmets:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch a single helmet by ID.
 */
export async function getHelmetById(id: string): Promise<Helmet | null> {
  const { data, error } = await supabase
    .from('helmets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[MINEGUARD] Error fetching helmet by id:', error);
    return null;
  }
  return data;
}

/**
 * Create a new helmet.
 */
export async function createHelmet(
  data: Omit<Helmet, 'id' | 'created_at'>,
): Promise<Helmet> {
  const { data: created, error } = await supabase
    .from('helmets')
    .insert({ ...data, id: crypto.randomUUID() })
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error creating helmet:', error);
    throw new Error(`Failed to create helmet: ${error.message}`);
  }
  return created;
}

/**
 * Update an existing helmet.
 */
export async function updateHelmet(
  id: string,
  data: Partial<Helmet>,
): Promise<Helmet> {
  const { data: updated, error } = await supabase
    .from('helmets')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error updating helmet:', error);
    throw new Error(`Failed to update helmet: ${error.message}`);
  }
  return updated;
}

/**
 * Delete a helmet by ID.
 */
export async function deleteHelmet(id: string): Promise<void> {
  const { error } = await supabase.from('helmets').delete().eq('id', id);
  if (error) {
    console.error('[MINEGUARD] Error deleting helmet:', error);
    throw new Error(`Failed to delete helmet: ${error.message}`);
  }
}

/**
 * Fetch all online helmets.
 */
export async function getOnlineHelmets(): Promise<Helmet[]> {
  const { data, error } = await supabase
    .from('helmets')
    .select('*')
    .eq('is_online', true)
    .order('helmet_code', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching online helmets:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Fetch all offline helmets.
 */
export async function getOfflineHelmets(): Promise<Helmet[]> {
  const { data, error } = await supabase
    .from('helmets')
    .select('*')
    .eq('is_online', false)
    .order('helmet_code', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching offline helmets:', error);
    return [];
  }
  return data ?? [];
}

import { supabase } from './supabase';
import type { SensorThresholds, SystemSetting } from '../types';
import { DEFAULT_THRESHOLDS } from '../config/constants';

/**
 * Fetch a system setting by key.
 */
export async function getSetting(key: string): Promise<SystemSetting | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('setting_key', key)
    .maybeSingle();

  if (error) {
    console.error(`[MINEGUARD] Error fetching setting ${key}:`, error);
    return null;
  }
  return data;
}

/**
 * Fetch sensor thresholds or return DEFAULT_THRESHOLDS fallback.
 */
export async function getThresholds(): Promise<SensorThresholds> {
  const setting = await getSetting('sensor_thresholds');
  if (setting && setting.setting_value) {
    return {
      ...DEFAULT_THRESHOLDS,
      ...(setting.setting_value as unknown as Partial<SensorThresholds>),
    };
  }
  return DEFAULT_THRESHOLDS;
}

/**
 * Save sensor thresholds to system_settings.
 */
export async function saveThresholds(thresholds: SensorThresholds): Promise<boolean> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: 'sensor_thresholds',
      setting_value: thresholds as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });

  if (error) {
    console.error('[MINEGUARD] Error saving thresholds:', error);
    return false;
  }
  return true;
}

/**
 * Fetch all system settings.
 */
export async function getAllSettings(): Promise<SystemSetting[]> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('setting_key', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching all settings:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Upsert arbitrary setting.
 */
export async function saveSetting(
  key: string,
  value: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'setting_key' });

  if (error) {
    console.error(`[MINEGUARD] Error saving setting ${key}:`, error);
    return false;
  }
  return true;
}

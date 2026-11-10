import { createClient } from '@supabase/supabase-js';

const getEnvOrStorage = (envKey: string, storageKey: string): string => {
  const envVal = import.meta.env[envKey];
  if (envVal && typeof envVal === 'string' && envVal.trim() !== '') {
    return envVal.trim();
  }
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored && stored.trim() !== '') {
      return stored.trim();
    }
  }
  return '';
};

const supabaseUrl = getEnvOrStorage('VITE_SUPABASE_URL', 'mineguard_supabase_url');
const supabaseAnonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY', 'mineguard_supabase_anon_key');

if (!supabaseUrl || !supabaseAnonKey) {
  console.info(
    '[MINEGUARD] Running in DEMO MODE with simulated telemetry. ' +
    'To connect live database, provide credentials in .env or via Settings.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = (): boolean => {
  const currentUrl = getEnvOrStorage('VITE_SUPABASE_URL', 'mineguard_supabase_url');
  const currentKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY', 'mineguard_supabase_anon_key');
  return !!(
    currentUrl &&
    currentKey &&
    currentUrl !== 'https://placeholder.supabase.co' &&
    currentKey !== 'placeholder-key'
  );
};

export const saveCustomSupabaseConfig = (url: string, key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mineguard_supabase_url', url.trim());
    localStorage.setItem('mineguard_supabase_anon_key', key.trim());
  }
};

export const clearCustomSupabaseConfig = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mineguard_supabase_url');
    localStorage.removeItem('mineguard_supabase_anon_key');
  }
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('helmets').select('id').limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected to Supabase database.' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown connection error';
    return { success: false, message: errMsg };
  }
};

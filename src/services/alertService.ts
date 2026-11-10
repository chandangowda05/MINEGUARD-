import { supabase } from './supabase';
import type { Alert, AlertSeverity, AlertType } from '../types';

interface AlertFilters {
  severity?: AlertSeverity;
  alertType?: AlertType;
  workerId?: string;
  resolved?: boolean;
  limit?: number;
}

/**
 * Fetch alerts with optional filters, including joined worker and helmet names.
 */
export async function getAlerts(filters?: AlertFilters): Promise<Alert[]> {
  let query = supabase
    .from('alerts')
    .select(
      '*, worker:workers!alerts_worker_id_fkey(full_name, worker_code), helmet:helmets!alerts_helmet_id_fkey(helmet_code)',
    )
    .order('created_at', { ascending: false });

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.alertType) {
    query = query.eq('alert_type', filters.alertType);
  }
  if (filters?.workerId) {
    query = query.eq('worker_id', filters.workerId);
  }
  if (filters?.resolved !== undefined) {
    query = query.eq('resolved', filters.resolved);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[MINEGUARD] Error fetching alerts:', error);
    return [];
  }
  return (data ?? []) as Alert[];
}

/**
 * Fetch all unresolved alerts, ordered by severity (CRITICAL first) then created_at desc.
 */
export async function getActiveAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select(
      '*, worker:workers!alerts_worker_id_fkey(full_name, worker_code), helmet:helmets!alerts_helmet_id_fkey(helmet_code)',
    )
    .eq('resolved', false)
    .order('severity', { ascending: true }) // CRITICAL < HIGH < ... alphabetically works out
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MINEGUARD] Error fetching active alerts:', error);
    return [];
  }
  return (data ?? []) as Alert[];
}

/**
 * Fetch a single alert by ID.
 */
export async function getAlertById(id: string): Promise<Alert | null> {
  const { data, error } = await supabase
    .from('alerts')
    .select(
      '*, worker:workers!alerts_worker_id_fkey(full_name, worker_code), helmet:helmets!alerts_helmet_id_fkey(helmet_code)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[MINEGUARD] Error fetching alert by id:', error);
    return null;
  }
  return data as Alert | null;
}

/**
 * Create a new alert.
 */
export async function createAlert(
  data: Omit<Alert, 'id' | 'created_at' | 'acknowledged' | 'resolved' | 'worker' | 'helmet'>,
): Promise<Alert> {
  const { data: created, error } = await supabase
    .from('alerts')
    .insert({
      ...data,
      id: crypto.randomUUID(),
      acknowledged: false,
      resolved: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[MINEGUARD] Error creating alert:', error);
    throw new Error(`Failed to create alert: ${error.message}`);
  }
  return created as Alert;
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(id: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ acknowledged: true })
    .eq('id', id);

  if (error) {
    console.error('[MINEGUARD] Error acknowledging alert:', error);
    throw new Error(`Failed to acknowledge alert: ${error.message}`);
  }
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(id: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ resolved: true })
    .eq('id', id);

  if (error) {
    console.error('[MINEGUARD] Error resolving alert:', error);
    throw new Error(`Failed to resolve alert: ${error.message}`);
  }
}

/**
 * Get alert statistics aggregated by date for the past N days.
 */
export async function getAlertStats(
  days: number = 30,
): Promise<{ date: string; count: number; byType: Record<string, number> }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('alerts')
    .select('created_at, alert_type')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[MINEGUARD] Error fetching alert stats:', error);
    return [];
  }

  // Aggregate by date
  const statsMap = new Map<string, { count: number; byType: Record<string, number> }>();

  for (const row of data ?? []) {
    const date = row.created_at.split('T')[0];
    if (!statsMap.has(date)) {
      statsMap.set(date, { count: 0, byType: {} });
    }
    const entry = statsMap.get(date)!;
    entry.count++;
    entry.byType[row.alert_type] = (entry.byType[row.alert_type] || 0) + 1;
  }

  return Array.from(statsMap.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));
}

/**
 * Count of unresolved alerts.
 */
export async function getRecentAlertCount(): Promise<number> {
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false);

  if (error) {
    console.error('[MINEGUARD] Error fetching recent alert count:', error);
    return 0;
  }
  return count ?? 0;
}

import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A';
  try {
    return format(parseISO(timestamp), 'MMM dd, yyyy HH:mm:ss');
  } catch {
    return 'Invalid date';
  }
}

export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A';
  try {
    return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatShortTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '--:--';
  try {
    return format(parseISO(timestamp), 'HH:mm:ss');
  } catch {
    return '--:--';
  }
}

export function formatDate(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A';
  try {
    return format(parseISO(timestamp), 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

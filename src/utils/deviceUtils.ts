/**
 * Determines if an IoT device/helmet is actively streaming based on heartbeat.
 * A device is considered ONLINE only if a telemetry packet was received within the timeout window (default: 60 seconds).
 */
export function isDeviceOnline(
  helmet?: { is_online?: boolean; last_seen?: string | null } | null,
  latestReading?: { created_at?: string } | null,
  timeoutSeconds: number = 60
): boolean {
  if (!helmet) return false;

  const timestamp = latestReading?.created_at || helmet.last_seen;
  if (!timestamp) return false;

  const lastTime = new Date(timestamp).getTime();
  if (isNaN(lastTime)) return false;

  return Date.now() - lastTime < timeoutSeconds * 1000;
}

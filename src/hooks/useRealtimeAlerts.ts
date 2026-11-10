import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getAlerts, acknowledgeAlert as svcAck, resolveAlert as svcRes } from '../services/alertService';
import { DEMO_ALERTS } from '../services/demoDataService';
import { useAppContext } from '../context/AppContext';
import type { Alert } from '../types';

/**
 * Play a synthesized industrial warning/alarm beep using the Web Audio API.
 */
function playEmergencySound(frequency = 880, pulses = 3) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    for (let i = 0; i < pulses; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + i * 0.2);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.16);
    }
  } catch (err) {
    console.warn('[MINEGUARD] Could not play alert tone:', err);
  }
}

export function useRealtimeAlerts() {
  const { demoMode, alertSoundEnabled, setNotificationCount } = useAppContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlert, setNewAlert] = useState<Alert | null>(null);
  const audioCooldownRef = useRef<number>(0);

  // Fetch initial alerts
  const refreshAlerts = useCallback(async () => {
    if (!isSupabaseConfigured() || demoMode) {
      setAlerts([...DEMO_ALERTS]);
      const unack = DEMO_ALERTS.filter((a) => !a.acknowledged && !a.resolved).length;
      setNotificationCount(unack);
      return;
    }

    try {
      const data = await getAlerts({ limit: 50 });
      setAlerts(data);
      const unack = data.filter((a) => !a.acknowledged && !a.resolved).length;
      setNotificationCount(unack);
    } catch (err) {
      console.error('[MINEGUARD] Error fetching alerts:', err);
    }
  }, [demoMode, setNotificationCount]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  // Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || demoMode) {
      return;
    }

    const channel = supabase
      .channel('realtime_alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const freshAlert = payload.new as Alert;
          setAlerts((prev) => [freshAlert, ...prev]);
          setNewAlert(freshAlert);
          setNotificationCount((prev) => prev + 1);

          // Audio alarm with 2-second rate limiting
          const now = Date.now();
          if (alertSoundEnabled && now - audioCooldownRef.current > 2000) {
            audioCooldownRef.current = now;
            const freq = freshAlert.severity === 'CRITICAL' ? 950 : 600;
            const pulses = freshAlert.severity === 'CRITICAL' ? 4 : 2;
            playEmergencySound(freq, pulses);
          }

          // Browser Push Notification if authorized
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`[MINEGUARD ALERT] ${freshAlert.alert_type}`, {
              body: freshAlert.description,
              icon: '/favicon.svg',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts' },
        (payload) => {
          const updatedAlert = payload.new as Alert;
          setAlerts((prev) =>
            prev.map((a) => (a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demoMode, alertSoundEnabled, setNotificationCount]);

  const acknowledgeAlert = async (id: string) => {
    if (!isSupabaseConfigured() || demoMode) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
      setNotificationCount((c) => Math.max(0, c - 1));
      return;
    }
    await svcAck(id);
    refreshAlerts();
  };

  const resolveAlert = async (id: string) => {
    if (!isSupabaseConfigured() || demoMode) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, resolved: true, acknowledged: true } : a))
      );
      setNotificationCount((c) => Math.max(0, c - 1));
      return;
    }
    await svcRes(id);
    refreshAlerts();
  };

  const clearNewAlert = () => setNewAlert(null);

  return {
    alerts,
    newAlert,
    clearNewAlert,
    acknowledgeAlert,
    resolveAlert,
    refreshAlerts,
    playEmergencySound,
  };
}


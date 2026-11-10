import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getAllLatestReadings } from '../services/sensorService';
import { generateDemoSensorReading, DEMO_HELMET_IDS } from '../services/demoDataService';
import { useAppContext } from '../context/AppContext';
import type { SensorReading } from '../types';

export function useRealtimeSensors() {
  const { demoMode, setLastDataReceived } = useAppContext();
  const [latestReadings, setLatestReadings] = useState<Map<string, SensorReading>>(new Map());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const demoIntervalRef = useRef<number | null>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      if (!isSupabaseConfigured() || demoMode) {
        // Initialize demo map
        const initialMap = new Map<string, SensorReading>();
        DEMO_HELMET_IDS.forEach((id) => {
          initialMap.set(id, generateDemoSensorReading(id));
        });
        if (isMounted) {
          setLatestReadings(initialMap);
          setIsConnected(true);
          setLastDataReceived(new Date().toISOString());
        }
        return;
      }

      try {
        const readings = await getAllLatestReadings();
        if (isMounted) {
          const map = new Map<string, SensorReading>();
          readings.forEach((r) => map.set(r.helmet_id, r));
          setLatestReadings(map);
          setIsConnected(true);
          if (readings.length > 0) {
            setLastDataReceived(readings[0].created_at);
          }
        }
      } catch (err) {
        console.error('[MINEGUARD] Error fetching initial readings:', err);
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [demoMode, setLastDataReceived]);

  // Realtime subscription or demo interval
  useEffect(() => {
    if (!isSupabaseConfigured() || demoMode) {
      // Simulate periodic ESP32 transmissions every 4 seconds in demo mode
      demoIntervalRef.current = window.setInterval(() => {
        setLatestReadings((prev) => {
          const updated = new Map(prev);
          DEMO_HELMET_IDS.forEach((id) => {
            updated.set(id, generateDemoSensorReading(id));
          });
          return updated;
        });
        setLastDataReceived(new Date().toISOString());
      }, 4000);

      return () => {
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      };
    }

    // Connect to Supabase Realtime
    const channel = supabase
      .channel('realtime_sensor_readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const newReading = payload.new as SensorReading;
          setLatestReadings((prev) => {
            const next = new Map(prev);
            next.set(newReading.helmet_id, newReading);
            return next;
          });
          setLastDataReceived(newReading.created_at);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demoMode, setLastDataReceived]);

  return { latestReadings, isConnected };
}

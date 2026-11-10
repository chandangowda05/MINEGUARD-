import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getAllLatestLocations } from '../services/locationService';
import { DEMO_LOCATIONS } from '../services/demoDataService';
import { useAppContext } from '../context/AppContext';
import type { WorkerLocation } from '../types';

export function useWorkerLocations() {
  const { demoMode } = useAppContext();
  const [locations, setLocations] = useState<Map<string, WorkerLocation>>(new Map());
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      if (!isSupabaseConfigured() || demoMode) {
        const demoMap = new Map<string, WorkerLocation>();
        DEMO_LOCATIONS.forEach((loc) => demoMap.set(loc.worker_id, loc));
        if (isMounted) {
          setLocations(demoMap);
          setIsConnected(true);
        }
        return;
      }

      try {
        const data = await getAllLatestLocations();
        if (isMounted) {
          const map = new Map<string, WorkerLocation>();
          data.forEach((loc) => map.set(loc.worker_id, loc));
          setLocations(map);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('[MINEGUARD] Error fetching locations:', err);
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [demoMode]);

  // Realtime updates
  useEffect(() => {
    if (!isSupabaseConfigured() || demoMode) {
      return;
    }

    const channel = supabase
      .channel('realtime_worker_locations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'worker_locations' },
        (payload) => {
          const newLoc = payload.new as WorkerLocation;
          setLocations((prev) => {
            const next = new Map(prev);
            next.set(newLoc.worker_id, newLoc);
            return next;
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demoMode]);

  return { locations, isConnected };
}


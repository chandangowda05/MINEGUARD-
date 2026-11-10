import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Layers } from 'lucide-react';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import { getWorkers } from '../services/workerService';
import { getHelmets } from '../services/helmetService';
import {
  DEMO_WORKERS,
  DEMO_HELMETS,
  DEMO_MINE_CENTER,
} from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import type { Worker, Helmet } from '../types';

// Map pan helper
function ChangeView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

// Custom modern marker matching Reference Image 2
function createDeviceMarker(status: string, code: string) {
  const color =
    status === 'critical'
      ? '#ef4444' // Breach (red)
      : status === 'warning'
      ? '#f59e0b'
      : status === 'safe'
      ? '#10b981' // Online (green)
      : '#64748b'; // Offline (gray)

  const isCritical = status === 'critical';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      ${
        isCritical
          ? `<div style="position: absolute; top: -3px; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.4); animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ''
      }
      <div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.6); z-index: 10;">
      </div>
      <div style="background-color: #0b1325; color: #f1f5f9; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); margin-top: 3px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
        ${code}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [26, 36],
    iconAnchor: [13, 11],
    popupAnchor: [0, -15],
  });
}

export default function GPSTracking() {
  const { demoMode } = useAppContext();
  const { locations } = useWorkerLocations();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('satellite');

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured() || demoMode) {
        setWorkers(DEMO_WORKERS);
        setHelmets(DEMO_HELMETS);
        return;
      }
      try {
        const [wList, hList] = await Promise.all([getWorkers(), getHelmets()]);
        setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
        setHelmets(hList.length > 0 ? hList : DEMO_HELMETS);
      } catch (err) {
        console.error('[MINEGUARD] Error fetching GPS workers:', err);
      }
    }
    init();
  }, [demoMode]);

  const trackedDevices = workers.map((w) => {
    const loc = locations.get(w.id);
    const helmet = helmets.find((h) => h.id === w.assigned_helmet_id);
    return {
      worker: w,
      location: loc,
      helmet,
      hasValidGps: !!(loc && loc.gps_valid && loc.latitude !== 0),
    };
  });

  return (
    <div className="space-y-4">
      {/* Top Header matching Reference Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Map</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time device monitoring</p>
        </div>

        {/* Legend in Top Right (Image 2) */}
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Breach</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            <span>Offline</span>
          </div>

          {/* Satellite vs OpenStreetMap Toggle */}
          <div className="ml-2 flex rounded-lg border border-slate-700/60 bg-[#111c35] p-0.5 text-xs">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mapType === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('osm')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mapType === 'osm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              OpenStreetMap
            </button>
          </div>
        </div>
      </div>

      {/* Full Width Map Container matching Image 2 */}
      <div className="navy-card overflow-hidden h-[calc(100vh-180px)] min-h-[550px] relative">
        <MapContainer
          center={[DEMO_MINE_CENTER.lat, DEMO_MINE_CENTER.lng]}
          zoom={16}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#0a101f' }}
        >
          <ChangeView center={[DEMO_MINE_CENTER.lat, DEMO_MINE_CENTER.lng]} zoom={16} />

          {/* Dynamic Layer: Esri World Imagery (Satellite) vs OpenStreetMap */}
          {mapType === 'satellite' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {trackedDevices
            .filter((item) => item.hasValidGps && item.location)
            .map(({ worker, location, helmet }) => (
              <Marker
                key={worker.id}
                position={[location!.latitude, location!.longitude]}
                icon={createDeviceMarker(worker.status, helmet?.helmet_code || worker.worker_code)}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs">
                    <div className="font-bold text-white text-sm border-b border-slate-700 pb-1">
                      {worker.full_name}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <div>Device: <strong>{helmet?.helmet_code || 'HLMT'}</strong></div>
                      <div>Zone: <strong>{worker.mining_zone || 'Surface'}</strong></div>
                      <div className="font-mono text-slate-400 mt-1">
                        {location!.latitude.toFixed(5)}, {location!.longitude.toFixed(5)}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}

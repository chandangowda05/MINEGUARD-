import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Users,
  Crosshair,
  Radio,
  Search,
  HardHat,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
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
import type { Worker, Helmet, WorkerLocation } from '../types';

// Component to dynamically pan/zoom map to selected coordinates
function ChangeView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

// Generate custom SVG colored marker icons for Leaflet
function createWorkerIcon(status: string, code: string) {
  const color =
    status === 'critical'
      ? '#ef4444'
      : status === 'warning'
      ? '#f59e0b'
      : status === 'safe'
      ? '#22c55e'
      : '#64748b';

  const isCritical = status === 'critical';

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      ${
        isCritical
          ? `<div style="position: absolute; top: -4px; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(239, 68, 68, 0.4); animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
          : ''
      }
      <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.5); z-index: 10;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div style="background-color: #1a1f2e; color: #f1f5f9; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 3px; border: 1px solid #334155; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
        ${code}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [30, 42],
    iconAnchor: [15, 20],
    popupAnchor: [0, -20],
  });
}

export default function GPSTracking() {
  const { demoMode } = useAppContext();
  const { locations } = useWorkerLocations();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    DEMO_MINE_CENTER.lat,
    DEMO_MINE_CENTER.lng,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [filterSearch, setFilterSearch] = useState<string>('');

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

  const workersWithValidGps = workers.map((w) => {
    const loc = locations.get(w.id);
    const helmet = helmets.find((h) => h.id === w.assigned_helmet_id);
    return {
      worker: w,
      location: loc,
      helmet,
      hasValidGps: !!(loc && loc.gps_valid && loc.latitude !== 0),
    };
  });

  const filteredList = workersWithValidGps.filter((item) =>
    item.worker.full_name.toLowerCase().includes(filterSearch.toLowerCase()) ||
    item.worker.worker_code.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const handleCenterOnWorker = (item: (typeof workersWithValidGps)[0]) => {
    if (item.hasValidGps && item.location) {
      setMapCenter([item.location.latitude, item.location.longitude]);
      setMapZoom(18);
      setSelectedWorkerId(item.worker.id);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-cyan-400" />
            LIVE WORKER GPS MAPPING & SATELLITE TRACKING
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time geospatial positioning for surface pits, transport corridors, and shaft entrances.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-green-400 font-semibold">
            <Radio className="h-3 w-3 animate-pulse" />
            {workersWithValidGps.filter((w) => w.hasValidGps).length} Fixes Active
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            {workersWithValidGps.filter((w) => !w.hasValidGps).length} Underground/No Signal
          </span>
        </div>
      </div>

      {/* Main Grid: Map + Side Worker List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Leaflet Map Display */}
        <div className="lg:col-span-3 rounded-lg border border-slate-800 bg-[#161c2d] overflow-hidden flex flex-col h-[650px] relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {workersWithValidGps
              .filter((item) => item.hasValidGps && item.location)
              .map(({ worker, location, helmet }) => (
                <Marker
                  key={worker.id}
                  position={[location!.latitude, location!.longitude]}
                  icon={createWorkerIcon(worker.status, worker.worker_code)}
                  eventHandlers={{
                    click: () => setSelectedWorkerId(worker.id),
                  }}
                >
                  <Popup>
                    <div className="p-1 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="font-bold text-cyan-400">{worker.full_name}</span>
                        <StatusBadge status={worker.status} size="sm" />
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <div>Badge: <strong>{worker.worker_code}</strong></div>
                        <div>Helmet: <strong>{helmet?.helmet_code || 'N/A'}</strong></div>
                        <div>Zone: <strong>{worker.mining_zone || 'Surface'}</strong></div>
                        <div className="font-mono text-slate-400 mt-1">
                          Lat: {location!.latitude.toFixed(6)}<br />
                          Lng: {location!.longitude.toFixed(6)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Ping: {new Date(location!.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          {/* Map Overlay Badge */}
          <div className="absolute top-3 right-3 z-[1000] rounded-md bg-[#1a1f2e]/90 backdrop-blur border border-slate-700/80 p-2.5 shadow-lg text-xs space-y-1">
            <span className="font-bold text-slate-200 block text-[11px]">Map Legend</span>
            <div className="flex items-center gap-1.5 text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500"></span> Safe State
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Warning State
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span> Critical / Hazard
            </div>
          </div>
        </div>

        {/* Worker Telemetry Sidebar */}
        <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4 flex flex-col h-[650px]">
          <div className="mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Tracked Personnel</span>
              <Users className="h-4 w-4 text-cyan-400" />
            </h3>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search worker..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full rounded border border-slate-800 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredList.map((item) => {
              const isSelected = item.worker.id === selectedWorkerId;
              return (
                <div
                  key={item.worker.id}
                  onClick={() => handleCenterOnWorker(item)}
                  className={`rounded border p-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/30'
                      : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[140px]">
                      {item.worker.full_name}
                    </span>
                    <StatusBadge status={item.worker.status} size="sm" />
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">{item.worker.worker_code}</span>
                    <span className="truncate max-w-[100px]">{item.helmet?.helmet_code || 'No Helmet'}</span>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                    {item.hasValidGps && item.location ? (
                      <div className="flex items-center gap-1 text-cyan-400">
                        <MapPin className="h-3 w-3" />
                        <span className="font-mono text-[10px]">
                          {item.location.latitude.toFixed(3)}, {item.location.longitude.toFixed(3)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" /> No GPS fix
                      </span>
                    )}

                    {item.hasValidGps && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCenterOnWorker(item);
                        }}
                        className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center gap-0.5"
                      >
                        <Crosshair className="h-3 w-3" /> Center
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No matching tracked workers found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

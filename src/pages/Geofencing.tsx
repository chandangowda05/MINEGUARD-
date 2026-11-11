import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Shield,
  Plus,
  Trash2,
  X,
  Layers,
  MapPin,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  getGeofences,
  createGeofence,
  deleteGeofence,
  getGeofenceEvents,
  createGeofenceEvent,
} from '../services/geofenceService';
import { getWorkers } from '../services/workerService';
import { createAlert } from '../services/alertService';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import {
  DEMO_GEOFENCES,
  DEMO_WORKERS,
  DEMO_MINE_CENTER,
} from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import {
  isPointInGeofence,
  geofenceToLatLngs,
} from '../utils/geofenceUtils';
import type {
  Geofence,
  GeofenceCoordinate,
  GeofenceZoneType,
  Worker,
} from '../types';
import { ZONE_TYPE_COLORS } from '../types';
import { toast } from 'sonner';

// Pan helper
function ChangeView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

// Marker helper for workers inside or near geofences
function createDeviceMarker(status: string, code: string) {
  const color =
    status === 'critical'
      ? '#ef4444' // Breach (red)
      : status === 'warning'
      ? '#f59e0b'
      : '#10b981'; // Safe / Online (green)

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

function MapDrawListener({
  isDrawing,
  onAddPoint,
}: {
  isDrawing: boolean;
  onAddPoint: (pt: GeofenceCoordinate) => void;
}) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function Geofencing() {
  const { demoMode } = useAppContext();
  const { locations } = useWorkerLocations();

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('satellite');

  // Drawing mode state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneType, setNewZoneType] = useState<GeofenceZoneType>('danger');
  const [drawGeometryType, setDrawGeometryType] = useState<'polygon' | 'circle'>('polygon');
  const [drawnPoints, setDrawnPoints] = useState<GeofenceCoordinate[]>([]);
  const [circleRadius, setCircleRadius] = useState<number>(120);

  const reportedBreaches = useRef<Set<string>>(new Set());

  const loadData = async () => {
    if (!isSupabaseConfigured() || demoMode) {
      setGeofences(DEMO_GEOFENCES);
      setWorkers(DEMO_WORKERS);
      return;
    }
    try {
      const [gList, wList] = await Promise.all([getGeofences(), getWorkers()]);
      setGeofences(gList.length > 0 ? gList : DEMO_GEOFENCES);
      setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
    } catch (err) {
      console.error('[MINEGUARD] Error loading geofences:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoMode]);

  // Automated geofence breach detection
  useEffect(() => {
    if (geofences.length === 0 || workers.length === 0) return;

    workers.forEach((worker) => {
      const loc = locations.get(worker.id);
      if (!loc || !loc.gps_valid || loc.latitude === 0) return;

      const workerPt: GeofenceCoordinate = { lat: loc.latitude, lng: loc.longitude };

      geofences.forEach((fence) => {
        if (!fence.is_active) return;

        const isInside = isPointInGeofence(workerPt, fence.geometry);
        const breachKey = `${worker.id}-${fence.id}`;

        if (isInside && (fence.zone_type === 'danger' || fence.zone_type === 'restricted')) {
          if (!reportedBreaches.current.has(breachKey)) {
            reportedBreaches.current.add(breachKey);

            if (isSupabaseConfigured() && !demoMode) {
              createGeofenceEvent({
                worker_id: worker.id,
                geofence_id: fence.id,
                event_type: 'enter',
                latitude: loc.latitude,
                longitude: loc.longitude,
              });
              createAlert({
                worker_id: worker.id,
                helmet_id: worker.assigned_helmet_id,
                alert_type: 'RESTRICTED_ZONE_ENTRY',
                severity: fence.zone_type === 'danger' ? 'CRITICAL' : 'HIGH',
                description: `VIOLATION: ${worker.full_name} entered restricted ${fence.name}.`,
                latitude: loc.latitude,
                longitude: loc.longitude,
              });
            }

            toast.error(`ZONE BREACH: ${worker.full_name} entered ${fence.name}!`);
          }
        } else if (!isInside && reportedBreaches.current.has(breachKey)) {
          reportedBreaches.current.delete(breachKey);
        }
      });
    });
  }, [geofences, workers, locations, demoMode]);

  // Count and list devices inside a specific geofence
  const getDevicesInside = (fence: Geofence): Worker[] => {
    return workers.filter((w) => {
      const loc = locations.get(w.id);
      if (!loc || !loc.gps_valid || loc.latitude === 0) return false;
      return isPointInGeofence({ lat: loc.latitude, lng: loc.longitude }, fence.geometry);
    });
  };

  const liveWorkerWithLocation = workers.find((w) => {
    const loc = locations.get(w.id);
    return loc && loc.gps_valid && loc.latitude !== 0;
  });
  const liveLoc = liveWorkerWithLocation ? locations.get(liveWorkerWithLocation.id) : Array.from(locations.values())[0];
  const activeCenter: [number, number] = liveLoc && liveLoc.gps_valid && liveLoc.latitude !== 0
    ? [liveLoc.latitude, liveLoc.longitude]
    : geofences[0]?.geometry?.type === 'circle' && geofences[0]?.geometry?.center
    ? [geofences[0].geometry.center.lat, geofences[0].geometry.center.lng]
    : [DEMO_MINE_CENTER.lat, DEMO_MINE_CENTER.lng];

  const handleSaveGeofence = async () => {
    if (!newZoneName) {
      toast.error('Zone Name is required.');
      return;
    }
    if (drawGeometryType === 'polygon' && drawnPoints.length < 3) {
      toast.error('Polygon requires at least 3 points on map.');
      return;
    }

    const geometry =
      drawGeometryType === 'polygon'
        ? { type: 'polygon' as const, coordinates: drawnPoints }
        : { type: 'circle' as const, center: drawnPoints[0], radius: circleRadius };

    const newFence: Geofence = {
      id: `geo-${Date.now()}`,
      name: newZoneName,
      zone_type: newZoneType,
      geometry,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured() || demoMode) {
      setGeofences([newFence, ...geofences]);
      toast.success(`Zone "${newZoneName}" created.`);
    } else {
      await createGeofence({
        name: newZoneName,
        zone_type: newZoneType,
        geometry,
        is_active: true,
      });
      toast.success('Geofence saved to database.');
      loadData();
    }

    setIsDrawing(false);
    setDrawnPoints([]);
    setNewZoneName('');
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured() || demoMode) {
      setGeofences(geofences.filter((g) => g.id !== id));
      toast.success('Zone removed.');
    } else {
      await deleteGeofence(id);
      toast.success('Zone deleted from database.');
      loadData();
    }
  };

  const toggleZoneActive = (id: string) => {
    setGeofences(
      geofences.map((g) => (g.id === id ? { ...g, is_active: !g.is_active } : g))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header matching Reference Image 4 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Geofence Zones</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage restricted areas & view active devices
          </p>
        </div>

        <button
          onClick={() => {
            setIsDrawing(true);
            setDrawnPoints([]);
            setNewZoneName(`Custom Zone ${geofences.length + 1}`);
          }}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Create Zone
        </button>
      </div>

      {/* Drawing Toolbar if Active */}
      {isDrawing && (
        <div className="navy-card p-4 border border-blue-500/40 shadow-xl space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Zone Name</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="rounded bg-[#0b1325] border border-slate-700 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Zone Type</label>
                <select
                  value={newZoneType}
                  onChange={(e) => setNewZoneType(e.target.value as GeofenceZoneType)}
                  className="rounded bg-[#0b1325] border border-slate-700 px-3 py-1.5 text-xs text-white"
                >
                  <option value="danger">Danger Zone</option>
                  <option value="restricted">Restricted Zone</option>
                  <option value="safe">Safe Perimeter</option>
                </select>
              </div>

              <span className="text-blue-400 font-semibold self-end pb-1.5">
                Click map to place points ({drawnPoints.length} vertices)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsDrawing(false);
                  setDrawnPoints([]);
                }}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGeofence}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white"
              >
                Save Boundary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone Cards Grid matching Reference Image 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {geofences.map((fence) => {
          const devicesInside = getDevicesInside(fence);
          return (
            <div key={fence.id} className="navy-card p-5 flex flex-col justify-between space-y-4">
              <div>
                {/* Card Top: Shield + Name + ACTIVE pill */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{fence.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {fence.geometry.type === 'circle' ? 'Radial Circular Zone' : 'Custom Polygon Zone'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      fence.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {fence.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mt-2">
                  {fence.zone_type.toUpperCase()} HAZARD PERIMETER
                </div>

                {/* Sub-box: DEVICES INSIDE (Image 4) */}
                <div className="mt-4 navy-card-sub p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      DEVICES INSIDE
                    </span>
                    <span className={`font-black text-sm ${devicesInside.length > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {devicesInside.length}
                    </span>
                  </div>
                  <div className="text-[11px] mt-1.5">
                    {devicesInside.length === 0 ? (
                      <span className="text-slate-500">No active devices in this zone.</span>
                    ) : (
                      <div className="space-y-1">
                        {devicesInside.map((dev) => (
                          <div key={dev.id} className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{dev.full_name} ({dev.worker_code})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Deactivate / Activate + Trash icon */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <button
                  onClick={() => toggleZoneActive(fence.id)}
                  className="font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {fence.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(fence.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Map Container for Visual Boundary Verification */}
      <div className="navy-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            Interactive Geofence Boundary Map
          </h3>
          <div className="flex items-center gap-3">
            {liveLoc && liveLoc.gps_valid && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800">
                <MapPin className="h-3 w-3 text-cyan-400" />
                Live GNSS: {liveLoc.latitude.toFixed(4)}°, {liveLoc.longitude.toFixed(4)}°
              </span>
            )}
            <div className="flex rounded-lg border border-slate-700/60 bg-[#111c35] p-0.5 text-xs">
              <button
                onClick={() => setMapType('satellite')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  mapType === 'satellite' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setMapType('osm')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  mapType === 'osm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                OSM
              </button>
            </div>
          </div>
        </div>

        <div className="h-[460px] rounded-lg overflow-hidden relative">
          <MapContainer
            center={activeCenter}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#0a101f' }}
          >
            <ChangeView center={activeCenter} zoom={16} />

            {mapType === 'satellite' ? (
              <TileLayer
                attribution='&copy; <a href="https://server.arcgisonline.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            ) : (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}

            <MapDrawListener isDrawing={isDrawing} onAddPoint={(pt) => setDrawnPoints([...drawnPoints, pt])} />

            {/* Geofence Boundaries */}
            {geofences.map((fence) => {
              const color = ZONE_TYPE_COLORS[fence.zone_type];
              if (fence.geometry.type === 'polygon' && fence.geometry.coordinates) {
                return (
                  <Polygon
                    key={fence.id}
                    positions={geofenceToLatLngs(fence.geometry)}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
                  />
                );
              }
              if (fence.geometry.type === 'circle' && fence.geometry.center && fence.geometry.radius) {
                return (
                  <Circle
                    key={fence.id}
                    center={[fence.geometry.center.lat, fence.geometry.center.lng]}
                    radius={fence.geometry.radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
                  />
                );
              }
              return null;
            })}

            {/* Live Worker Locations on Geofence Map */}
            {workers.map((w) => {
              const loc = locations.get(w.id);
              if (!loc || !loc.gps_valid || loc.latitude === 0) return null;
              return (
                <Marker
                  key={w.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={createDeviceMarker(w.status, w.worker_code)}
                >
                  <Popup>
                    <div className="p-1 space-y-1 text-xs">
                      <div className="font-bold text-white text-sm border-b border-slate-700 pb-1">
                        {w.full_name} ({w.worker_code})
                      </div>
                      <div className="text-[11px] text-slate-300">
                        <div>Zone: <strong>{w.mining_zone || 'Surface'}</strong></div>
                        <div className="font-mono text-cyan-400 mt-1">
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {isDrawing && drawnPoints.length > 0 && (
              <Polygon
                positions={drawnPoints.map((p): [number, number] => [p.lat, p.lng])}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2 }}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

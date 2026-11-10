import { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Map as MapIcon,
  Plus,
  Shield,
  AlertTriangle,
  Flame,
  Trash2,
  CheckCircle2,
  Radio,
  Eye,
  X,
  Layers,
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
  GeofenceEvent,
  Worker,
} from '../types';
import { ZONE_TYPE_COLORS, ZONE_TYPE_LABELS } from '../types';
import { toast } from 'sonner';

// Custom Map Click Listener to record polygon vertices during creation
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

// Marker for workers on geofence map
function createWorkerDot(name: string, status: string) {
  const color = status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 8px ${color};"></div>
        <div style="background-color: rgba(15,23,42,0.9); color: #e2e8f0; font-size: 9px; padding: 1px 4px; border-radius: 2px; margin-top: 2px; white-space:nowrap;">
          ${name}
        </div>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [20, 30],
    iconAnchor: [10, 7],
  });
}

export default function Geofencing() {
  const { demoMode } = useAppContext();
  const { locations } = useWorkerLocations();

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [newZoneName, setNewZoneName] = useState<string>('');
  const [newZoneType, setNewZoneType] = useState<GeofenceZoneType>('danger');
  const [drawGeometryType, setDrawGeometryType] = useState<'polygon' | 'circle'>('polygon');
  const [drawnPoints, setDrawnPoints] = useState<GeofenceCoordinate[]>([]);
  const [circleRadius, setCircleRadius] = useState<number>(100);

  // Breach tracking set to prevent repetitive duplicate alerts
  const reportedBreaches = useRef<Set<string>>(new Set());

  // Load initial geofences and events
  const loadGeofenceData = async () => {
    if (!isSupabaseConfigured() || demoMode) {
      setGeofences(DEMO_GEOFENCES);
      setWorkers(DEMO_WORKERS);
      return;
    }

    try {
      const [gList, eList, wList] = await Promise.all([
        getGeofences(),
        getGeofenceEvents({ limit: 20 }),
        getWorkers(),
      ]);
      setGeofences(gList.length > 0 ? gList : DEMO_GEOFENCES);
      setEvents(eList);
      setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
    } catch (err) {
      console.error('[MINEGUARD] Error loading geofences:', err);
    }
  };

  useEffect(() => {
    loadGeofenceData();
  }, [demoMode]);

  // Geofence Rule Engine: Detect Safe Zone Exit and Danger/Restricted Zone Entry
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

        // 1. Danger / Restricted Zone Entry Rule
        if (isInside && (fence.zone_type === 'danger' || fence.zone_type === 'restricted')) {
          if (!reportedBreaches.current.has(breachKey)) {
            reportedBreaches.current.add(breachKey);

            // Log event
            const eventPayload = {
              worker_id: worker.id,
              geofence_id: fence.id,
              event_type: 'enter' as const,
              latitude: loc.latitude,
              longitude: loc.longitude,
            };

            const alertPayload = {
              worker_id: worker.id,
              helmet_id: worker.assigned_helmet_id,
              alert_type: 'RESTRICTED_ZONE_ENTRY' as const,
              severity: fence.zone_type === 'danger' ? ('CRITICAL' as const) : ('HIGH' as const),
              description: `VIOLATION: ${worker.full_name} entered ${fence.name} (${ZONE_TYPE_LABELS[fence.zone_type]}).`,
              latitude: loc.latitude,
              longitude: loc.longitude,
            };

            if (isSupabaseConfigured() && !demoMode) {
              createGeofenceEvent(eventPayload);
              createAlert(alertPayload);
            }

            toast.error(
              `GEOFENCE VIOLATION: ${worker.full_name} entered ${fence.name}!`,
              { duration: 5000 }
            );

            setEvents((prev) => [
              {
                id: `evt-${Date.now()}`,
                ...eventPayload,
                created_at: new Date().toISOString(),
                worker: { full_name: worker.full_name, worker_code: worker.worker_code },
                geofence: { name: fence.name, zone_type: fence.zone_type },
              },
              ...prev,
            ]);
          }
        }
        // Worker exited the restricted zone -> reset state for subsequent entries
        else if (!isInside && reportedBreaches.current.has(breachKey)) {
          reportedBreaches.current.delete(breachKey);
        }
      });
    });
  }, [geofences, workers, locations, demoMode]);

  // Handle map click during drawing
  const handleAddDrawPoint = (pt: GeofenceCoordinate) => {
    if (drawGeometryType === 'polygon') {
      setDrawnPoints((prev) => [...prev, pt]);
      toast.info(`Vertex ${drawnPoints.length + 1} added.`);
    } else {
      // Circle center point
      setDrawnPoints([pt]);
      toast.info('Circle center set. Adjust radius slider.');
    }
  };

  // Save Geofence
  const handleSaveGeofence = async () => {
    if (!newZoneName) {
      toast.error('Please provide a name for the safety zone.');
      return;
    }

    if (drawGeometryType === 'polygon' && drawnPoints.length < 3) {
      toast.error('Polygon geofence requires at least 3 vertices on the map.');
      return;
    }

    if (drawGeometryType === 'circle' && drawnPoints.length === 0) {
      toast.error('Click on the map to place circle center.');
      return;
    }

    const geometry =
      drawGeometryType === 'polygon'
        ? { type: 'polygon' as const, coordinates: drawnPoints }
        : {
            type: 'circle' as const,
            center: drawnPoints[0],
            radius: circleRadius,
          };

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
      toast.success(`Geofence "${newZoneName}" created.`);
    } else {
      await createGeofence({
        name: newZoneName,
        zone_type: newZoneType,
        geometry,
        is_active: true,
      });
      toast.success('Geofence boundary stored in Supabase.');
      loadGeofenceData();
    }

    // Reset drawing state
    setIsDrawing(false);
    setDrawnPoints([]);
    setNewZoneName('');
  };

  // Delete Geofence
  const handleDeleteGeofence = async (id: string, name: string) => {
    if (!isSupabaseConfigured() || demoMode) {
      setGeofences(geofences.filter((g) => g.id !== id));
      toast.success(`Geofence "${name}" deleted.`);
    } else {
      await deleteGeofence(id);
      toast.success(`Geofence deleted from database.`);
      loadGeofenceData();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-cyan-400" />
            GEOFENCING & SAFETY PERIMETER MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Draw and configure virtual boundaries with automated breach, safe-exit, and restricted-zone alarms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isDrawing ? (
            <button
              onClick={() => {
                setIsDrawing(true);
                setDrawnPoints([]);
                setNewZoneName(`Zone-${geofences.length + 1}`);
              }}
              className="flex items-center gap-2 rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Draw New Geofence
            </button>
          ) : (
            <button
              onClick={() => {
                setIsDrawing(false);
                setDrawnPoints([]);
              }}
              className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" /> Cancel Drawing
            </button>
          )}
        </div>
      </div>

      {/* Drawing Toolbar Overlay if active */}
      {isDrawing && (
        <div className="rounded-lg border-2 border-cyan-500 bg-[#161c2d] p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400">Zone Name</label>
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="e.g. Blasting Sector B"
                className="mt-0.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400">Zone Type</label>
              <select
                value={newZoneType}
                onChange={(e) => setNewZoneType(e.target.value as GeofenceZoneType)}
                className="mt-0.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="danger">Danger Zone (Immediate Critical Alarm)</option>
                <option value="restricted">Restricted Zone (High Warning)</option>
                <option value="safe">Safe Zone (Must Remain Inside)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400">Shape</label>
              <div className="mt-0.5 flex rounded border border-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setDrawGeometryType('polygon');
                    setDrawnPoints([]);
                  }}
                  className={`px-3 py-1 text-xs ${
                    drawGeometryType === 'polygon'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Polygon
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawGeometryType('circle');
                    setDrawnPoints([]);
                  }}
                  className={`px-3 py-1 text-xs ${
                    drawGeometryType === 'circle'
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Circle
                </button>
              </div>
            </div>

            {drawGeometryType === 'circle' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400">
                  Radius: {circleRadius}m
                </label>
                <input
                  type="range"
                  min={30}
                  max={500}
                  step={10}
                  value={circleRadius}
                  onChange={(e) => setCircleRadius(Number(e.target.value))}
                  className="mt-1 w-32"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400 font-semibold">
              {drawGeometryType === 'polygon'
                ? `Click map to add points (${drawnPoints.length} vertices)`
                : drawnPoints.length === 0
                ? 'Click map for circle center'
                : 'Center set!'}
            </span>
            <button
              onClick={handleSaveGeofence}
              className="rounded bg-green-600 hover:bg-green-500 px-4 py-1.5 text-xs font-bold text-white transition-colors"
            >
              Save Perimeter
            </button>
          </div>
        </div>
      )}

      {/* Main Map + Geofences List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Leaflet Geofence Map */}
        <div className="lg:col-span-3 rounded-lg border border-slate-800 bg-[#161c2d] overflow-hidden h-[620px] relative">
          <MapContainer
            center={[DEMO_MINE_CENTER.lat, DEMO_MINE_CENTER.lng]}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapDrawListener isDrawing={isDrawing} onAddPoint={handleAddDrawPoint} />

            {/* Render Existing Stored Geofences */}
            {geofences.map((fence) => {
              const color = ZONE_TYPE_COLORS[fence.zone_type];
              if (fence.geometry.type === 'polygon' && fence.geometry.coordinates) {
                return (
                  <Polygon
                    key={fence.id}
                    positions={geofenceToLatLngs(fence.geometry)}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.25,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong className="text-white block text-sm">{fence.name}</strong>
                        <span className="inline-block mt-1 font-bold uppercase text-[10px]" style={{ color }}>
                          {ZONE_TYPE_LABELS[fence.zone_type]}
                        </span>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }
              if (fence.geometry.type === 'circle' && fence.geometry.center && fence.geometry.radius) {
                return (
                  <Circle
                    key={fence.id}
                    center={[fence.geometry.center.lat, fence.geometry.center.lng]}
                    radius={fence.geometry.radius}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.25,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <strong className="text-white block text-sm">{fence.name}</strong>
                        <span className="inline-block mt-1 font-bold uppercase text-[10px]" style={{ color }}>
                          {ZONE_TYPE_LABELS[fence.zone_type]} (Radius: {fence.geometry.radius}m)
                        </span>
                      </div>
                    </Popup>
                  </Circle>
                );
              }
              return null;
            })}

            {/* In-Progress Drawing Preview */}
            {isDrawing && drawGeometryType === 'polygon' && drawnPoints.length > 0 && (
              <Polygon
                positions={drawnPoints.map((p): [number, number] => [p.lat, p.lng])}
                pathOptions={{
                  color: '#06b6d4',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.3,
                  dashArray: '5, 5',
                  weight: 2,
                }}
              />
            )}

            {isDrawing && drawGeometryType === 'circle' && drawnPoints.length > 0 && (
              <Circle
                center={[drawnPoints[0].lat, drawnPoints[0].lng]}
                radius={circleRadius}
                pathOptions={{
                  color: '#06b6d4',
                  fillColor: '#06b6d4',
                  fillOpacity: 0.3,
                  dashArray: '5, 5',
                  weight: 2,
                }}
              />
            )}

            {/* Active Workers Position Markers on Map */}
            {workers.map((w) => {
              const loc = locations.get(w.id);
              if (!loc || !loc.gps_valid || loc.latitude === 0) return null;
              return (
                <Marker
                  key={w.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={createWorkerDot(w.full_name, w.status)}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong>{w.full_name}</strong> ({w.worker_code})<br />
                      Status: <span className="uppercase font-bold">{w.status}</span><br />
                      Zone: {w.mining_zone || 'Surface'}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar: Geofences Roster & Event Logs */}
        <div className="space-y-4">
          {/* Active Geofences List */}
          <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4 flex flex-col max-h-[340px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span>Configured Perimeters ({geofences.length})</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {geofences.map((fence) => (
                <div
                  key={fence.id}
                  className="rounded border border-slate-800 bg-slate-900/60 p-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ZONE_TYPE_COLORS[fence.zone_type] }}
                      />
                      {fence.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Type: <strong style={{ color: ZONE_TYPE_COLORS[fence.zone_type] }}>
                        {ZONE_TYPE_LABELS[fence.zone_type]}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteGeofence(fence.id, fence.name)}
                    className="rounded p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete Geofence"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Realtime Breach Event Log */}
          <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4 flex flex-col max-h-[260px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
              <span>Breach Event Log</span>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs scrollbar-thin">
              {events.slice(0, 10).map((evt) => (
                <div
                  key={evt.id}
                  className="rounded border border-red-500/20 bg-red-950/20 p-2 text-[11px]"
                >
                  <div className="flex items-center justify-between text-red-400 font-bold">
                    <span>{evt.event_type === 'enter' ? 'ZONE ENTRY BREACH' : 'ZONE EXIT'}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 mt-0.5">
                    <strong>{evt.worker?.full_name || 'Worker'}</strong> entered{' '}
                    <strong>{evt.geofence?.name || 'Restricted Area'}</strong>.
                  </p>
                </div>
              ))}

              {events.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  No geofence breach incidents detected.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

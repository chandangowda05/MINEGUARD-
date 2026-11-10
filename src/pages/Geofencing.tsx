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
  Shield,
  Plus,
  Trash2,
  X,
  Layers,
  MapPin,
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

  // Count devices inside a specific geofence
  const getDevicesInsideCount = (fence: Geofence): number => {
    return workers.filter((w) => {
      const loc = locations.get(w.id);
      if (!loc || !loc.gps_valid || loc.latitude === 0) return false;
      return isPointInGeofence({ lat: loc.latitude, lng: loc.longitude }, fence.geometry);
    }).length;
  };

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
          const devicesInside = getDevicesInsideCount(fence);
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
                    <span className="font-black text-sm text-blue-400">{devicesInside}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {devicesInside === 0
                      ? 'No active devices in this zone.'
                      : `${devicesInside} personnel currently inside.`}
                  </p>
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
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-400" />
          Interactive Geofence Boundary Map
        </h3>

        <div className="h-[400px] rounded-lg overflow-hidden relative">
          <MapContainer
            center={[DEMO_MINE_CENTER.lat, DEMO_MINE_CENTER.lng]}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#0a101f' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://server.arcgisonline.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />

            <MapDrawListener isDrawing={isDrawing} onAddPoint={(pt) => setDrawnPoints([...drawnPoints, pt])} />

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

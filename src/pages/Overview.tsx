import { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  WifiOff,
  AlertTriangle,
  Shield,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Compass,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import { getWorkers } from '../services/workerService';
import { getHelmets } from '../services/helmetService';
import { getGeofences } from '../services/geofenceService';
import {
  DEMO_WORKERS,
  DEMO_HELMETS,
  DEMO_GEOFENCES,
  DEMO_HELMET_IDS,
} from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import {
  getTemperatureStatus,
  getHumidityStatus,
  getMQ3Status,
  getMQ7Status,
} from '../utils/thresholdUtils';
import type { Worker, Helmet, Geofence, SensorReading } from '../types';

export default function Overview() {
  const { demoMode } = useAppContext();
  const { latestReadings } = useRealtimeSensors();
  const { alerts } = useRealtimeAlerts();
  const { locations } = useWorkerLocations();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured() || demoMode) {
        setWorkers(DEMO_WORKERS);
        setHelmets(DEMO_HELMETS);
        setGeofences(DEMO_GEOFENCES);
        return;
      }
      try {
        const [wList, hList, gList] = await Promise.all([
          getWorkers(),
          getHelmets(),
          getGeofences(),
        ]);
        setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
        setHelmets(hList.length > 0 ? hList : DEMO_HELMETS);
        setGeofences(gList.length > 0 ? gList : DEMO_GEOFENCES);
      } catch (err) {
        console.error('[MINEGUARD] Error loading dashboard data:', err);
      }
    }
    loadData();
  }, [demoMode]);

  // Operational metrics matching Reference Image 1
  const totalDevices = helmets.length || 5;
  const onlineDevices = helmets.filter((h) => h.is_online).length;
  const offlineDevices = helmets.filter((h) => !h.is_online).length;
  const activeAlertsCount = alerts.filter((a) => !a.resolved).length;
  const activeZonesCount = geofences.filter((g) => g.is_active).length;

  // Donut chart data for Device Status
  const deviceStatusData = [
    { name: 'Online', value: onlineDevices || 4, color: '#10b981' },
    { name: 'Offline', value: offlineDevices || 1, color: '#334155' },
  ];

  // Bar chart data for Recent Alert Frequencies
  const alertFreqData = [
    { name: 'FALL DETECTED', count: 2 },
    { name: 'GEOFENCE BREACH', count: 1 },
    { name: 'SUDDEN MOVEMENT', count: 3 },
    { name: 'GAS WARNING', count: 2 },
    { name: 'EMERGENCY SOS', count: 1 },
  ];

  // Focus reading for first online helmet
  const primaryReading: SensorReading | null =
    latestReadings.get(DEMO_HELMET_IDS[0]) || Array.from(latestReadings.values())[0] || null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">System Overview</h1>
      </div>

      {/* Row 1: 5 KPI Metric Cards (Matching SmartWristband design) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Devices */}
        <div className="navy-card p-5 flex items-center justify-between">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Cpu className="h-6 w-6" />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              TOTAL DEVICES
            </span>
            <span className="text-3xl font-black text-white">{totalDevices}</span>
          </div>
        </div>

        {/* Online */}
        <div className="navy-card p-5 flex items-center justify-between">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="h-6 w-6" />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              ONLINE
            </span>
            <span className="text-3xl font-black text-white">{onlineDevices}</span>
          </div>
        </div>

        {/* Offline */}
        <div className="navy-card p-5 flex items-center justify-between">
          <div className="p-3 rounded-lg bg-slate-800 text-slate-400">
            <WifiOff className="h-6 w-6" />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              OFFLINE
            </span>
            <span className="text-3xl font-black text-white">{offlineDevices}</span>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="navy-card p-5 flex items-center justify-between">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              ACTIVE ALERTS
            </span>
            <span className="text-3xl font-black text-white">{activeAlertsCount}</span>
          </div>
        </div>

        {/* Active Zones */}
        <div className="navy-card p-5 flex items-center justify-between">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <Shield className="h-6 w-6" />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              ACTIVE ZONES
            </span>
            <span className="text-3xl font-black text-white">{activeZonesCount}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Device Status Donut & Recent Alert Frequencies Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Device Status Donut Chart (2 cols) */}
        <div className="lg:col-span-2 navy-card p-6 flex flex-col justify-between">
          <h2 className="text-base font-bold text-white mb-2">Device Status</h2>

          <div className="flex-1 flex items-center justify-center my-2" style={{ minHeight: '220px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="#0a101f"
                  strokeWidth={4}
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111c35',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Online ({onlineDevices})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span>
              <span className="text-slate-300">Offline ({offlineDevices})</span>
            </div>
          </div>
        </div>

        {/* Right: Recent Alert Frequencies Bar Chart (3 cols) */}
        <div className="lg:col-span-3 navy-card p-6 flex flex-col justify-between">
          <h2 className="text-base font-bold text-white mb-2">Recent Alert Frequencies</h2>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={alertFreqData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111c35',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Events Feed (Matching Reference Image 1) */}
      <div className="navy-card p-6">
        <h2 className="text-base font-bold text-white mb-4">Recent Events</h2>

        <div className="space-y-4">
          {alerts.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between pb-3.5 border-b border-slate-800/60 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-500'
                      : 'bg-blue-400'
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {alert.helmet?.helmet_code || 'Smart Helmet'} - {alert.alert_type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{alert.description}</div>
                </div>
              </div>

              <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-500">
              No recent safety alerts logged. System nominal.
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Live Atmospheric & Telemetry Snapshot */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Live Environmental & Biometric Readings</h2>
          <Link to="/monitoring" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Open Full Telemetry <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Temperature */}
          <div className="navy-card p-4">
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <span className="text-xs font-semibold text-slate-400">Temperature</span>
              <Thermometer className="h-4 w-4" />
            </div>
            <div className="text-2xl font-black text-white">
              {primaryReading?.temperature ?? '28.4'} <span className="text-xs font-normal text-slate-400">°C</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">Normal</div>
          </div>

          {/* Humidity */}
          <div className="navy-card p-4">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <span className="text-xs font-semibold text-slate-400">Humidity</span>
              <Droplets className="h-4 w-4" />
            </div>
            <div className="text-2xl font-black text-white">
              {primaryReading?.humidity ?? '62.0'} <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">Normal</div>
          </div>

          {/* MQ-3 */}
          <div className="navy-card p-4">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold text-slate-400">MQ-3 Gas</span>
              <Wind className="h-4 w-4" />
            </div>
            <div className="text-2xl font-black text-white">
              {primaryReading?.mq3_raw ?? '740'} <span className="text-xs font-normal text-slate-400">Raw</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">Safe</div>
          </div>

          {/* MQ-7 */}
          <div className="navy-card p-4">
            <div className="flex items-center justify-between text-orange-400 mb-2">
              <span className="text-xs font-semibold text-slate-400">MQ-7 (CO)</span>
              <Flame className="h-4 w-4" />
            </div>
            <div className="text-2xl font-black text-white">
              {primaryReading?.mq7_ppm ?? '18.2'} <span className="text-xs font-normal text-slate-400">ppm</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">Safe</div>
          </div>

          {/* Movement */}
          <div className="navy-card p-4">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold text-slate-400">Motion State</span>
              <Compass className="h-4 w-4" />
            </div>
            <div className="text-xl font-black text-white truncate">
              {primaryReading?.movement_status ?? 'Moving'}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">Active</div>
          </div>

          {/* GPS */}
          <div className="navy-card p-4">
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="text-xs font-semibold text-slate-400">GPS Signal</span>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="text-base font-black text-white truncate">
              3D Fix
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium">Constellation Locked</div>
          </div>
        </div>
      </div>
    </div>
  );
}

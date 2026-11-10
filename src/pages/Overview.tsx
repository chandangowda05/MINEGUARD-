import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldAlert,
  HardHat,
  WifiOff,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Activity,
  MapPin,
  AlertTriangle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import KPICard from '../components/common/KPICard';
import SensorCard from '../components/common/SensorCard';
import SensorTrendChart from '../components/charts/SensorTrendChart';
import WorkerActivityTimeline from '../components/charts/WorkerActivityTimeline';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import { getWorkers } from '../services/workerService';
import { getHelmets } from '../services/helmetService';
import { getSensorHistory } from '../services/sensorService';
import { getThresholds } from '../services/settingsService';
import {
  DEMO_WORKERS,
  DEMO_HELMETS,
  generateDemoSensorHistory,
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
import type { Worker, Helmet, SensorReading, SensorThresholds } from '../types';
import { DEFAULT_THRESHOLDS } from '../config/constants';

export default function Overview() {
  const { demoMode } = useAppContext();
  const { latestReadings } = useRealtimeSensors();
  const { alerts, acknowledgeAlert } = useRealtimeAlerts();
  const { locations } = useWorkerLocations();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [thresholds, setThresholds] = useState<SensorThresholds>(DEFAULT_THRESHOLDS);
  const [historyReadings, setHistoryReadings] = useState<SensorReading[]>([]);
  const [selectedHelmetId, setSelectedHelmetId] = useState<string>(DEMO_HELMET_IDS[0]);

  // Load workers, helmets, thresholds, and sensor history
  useEffect(() => {
    async function loadData() {
      if (!isSupabaseConfigured() || demoMode) {
        setWorkers(DEMO_WORKERS);
        setHelmets(DEMO_HELMETS);
        setHistoryReadings(generateDemoSensorHistory(selectedHelmetId, 24));
        return;
      }

      try {
        const [wData, hData, tData] = await Promise.all([
          getWorkers(),
          getHelmets(),
          getThresholds(),
        ]);
        setWorkers(wData.length > 0 ? wData : DEMO_WORKERS);
        setHelmets(hData.length > 0 ? hData : DEMO_HELMETS);
        setThresholds(tData);

        const targetHelmet = hData[0]?.id || selectedHelmetId;
        setSelectedHelmetId(targetHelmet);
        const history = await getSensorHistory(targetHelmet, 24);
        setHistoryReadings(history.length > 0 ? history : generateDemoSensorHistory(targetHelmet, 24));
      } catch (err) {
        console.error('[MINEGUARD] Error loading dashboard data:', err);
      }
    }

    loadData();
  }, [demoMode, selectedHelmetId]);

  // Aggregated KPI calculations
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.status === 'safe' || w.status === 'warning').length;
  const dangerWorkers = workers.filter((w) => w.status === 'critical');
  const activeAlerts = alerts.filter((a) => !a.resolved);
  const onlineHelmets = helmets.filter((h) => h.is_online).length;
  const offlineHelmets = helmets.filter((h) => !h.is_online).length;

  // Primary active sensor reading (focused helmet)
  const currentReading: SensorReading | null = useMemo(() => {
    if (latestReadings.has(selectedHelmetId)) {
      return latestReadings.get(selectedHelmetId)!;
    }
    const firstReading = Array.from(latestReadings.values())[0];
    return firstReading || null;
  }, [latestReadings, selectedHelmetId]);

  // Location for focused helmet / worker
  const focusedWorker = workers.find((w) => w.assigned_helmet_id === selectedHelmetId);
  const workerLocation = focusedWorker ? locations.get(focusedWorker.id) : null;

  // Active Critical SOS Emergency Alert
  const emergencySosAlert = alerts.find(
    (a) => a.alert_type === 'EMERGENCY_SOS' && !a.resolved
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Critical Emergency SOS Banner */}
      {emergencySosAlert && (
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 rounded-lg border-2 border-red-500 bg-red-950/80 p-4 shadow-lg shadow-red-950/50 animate-pulse-glow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 animate-alert-flash">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-black uppercase text-white tracking-widest">
                  CRITICAL SOS SIGNAL
                </span>
                <span className="text-xs text-red-300">Immediate Response Required</span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {emergencySosAlert.description}
              </h2>
              <p className="text-xs text-red-200">
                Worker: {emergencySosAlert.worker?.full_name || 'Assigned Personnel'} | Helmet ID:{' '}
                {emergencySosAlert.helmet?.helmet_code || 'HLMT-103'} | Coordinates:{' '}
                {emergencySosAlert.latitude?.toFixed(4)}, {emergencySosAlert.longitude?.toFixed(4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/gps-tracking"
              className="flex items-center gap-1.5 rounded bg-red-700 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              Pinpoint on Map
            </Link>
            {!emergencySosAlert.acknowledged && (
              <button
                onClick={() => acknowledgeAlert(emergencySosAlert.id)}
                className="rounded border border-red-400 bg-black/40 hover:bg-black/60 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors"
              >
                Acknowledge Alert
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Header & Helmet Focus Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            CONTROL ROOM OVERVIEW
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-medium text-cyan-400 border border-cyan-800/60">
              <Radio className="h-3 w-3 animate-pulse" /> Live Telemetry Hub
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-shaft worker safety, toxic atmosphere monitoring, and biometric sensors.
          </p>
        </div>

        {/* Focused Helmet Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Telemetry Source:</span>
          <select
            value={selectedHelmetId}
            onChange={(e) => setSelectedHelmetId(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-cyan-400 focus:border-cyan-500 focus:outline-none"
          >
            {helmets.map((h) => (
              <option key={h.id} value={h.id}>
                {h.helmet_code} ({h.is_online ? 'Online' : 'Offline'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6 Key Operational KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Total Workers"
          value={totalWorkers}
          icon={<Users className="h-5 w-5 text-cyan-400" />}
          subtitle="Registered staff"
          color="cyan"
        />
        <KPICard
          title="Active Workers"
          value={activeWorkers}
          icon={<Activity className="h-5 w-5 text-green-400" />}
          subtitle="Currently on shift"
          color="green"
        />
        <KPICard
          title="Workers in Danger"
          value={dangerWorkers.length}
          icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
          subtitle="Immediate hazard"
          color="red"
        />
        <KPICard
          title="Active Safety Alerts"
          value={activeAlerts.length}
          icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
          subtitle="Unresolved events"
          color="orange"
        />
        <KPICard
          title="Connected Helmets"
          value={onlineHelmets}
          icon={<HardHat className="h-5 w-5 text-cyan-400" />}
          subtitle="Heartbeat active"
          color="cyan"
        />
        <KPICard
          title="Offline Devices"
          value={offlineHelmets}
          icon={<WifiOff className="h-5 w-5 text-slate-400" />}
          subtitle="Signal unavailable"
          color="slate"
        />
      </div>

      {/* Live Environmental Sensor Cards */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            Atmospheric & Biometric Readings ({helmets.find((h) => h.id === selectedHelmetId)?.helmet_code || 'HELMET'})
          </h2>
          <span className="text-xs text-slate-500">
            Assigned: {focusedWorker?.full_name || 'Unassigned'} ({focusedWorker?.mining_zone || 'Zone N/A'})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <SensorCard
            label="Temperature"
            value={currentReading?.temperature ?? '--'}
            unit="°C"
            status={getTemperatureStatus(currentReading?.temperature, thresholds)}
            icon={<Thermometer className="h-5 w-5 text-rose-400" />}
            lastUpdated={currentReading?.created_at}
            trend="up"
          />
          <SensorCard
            label="Relative Humidity"
            value={currentReading?.humidity ?? '--'}
            unit="%"
            status={getHumidityStatus(currentReading?.humidity, thresholds)}
            icon={<Droplets className="h-5 w-5 text-blue-400" />}
            lastUpdated={currentReading?.created_at}
            trend="stable"
          />
          <SensorCard
            label="MQ-3 Gas Sensor"
            value={currentReading?.mq3_raw ?? '--'}
            unit="Raw"
            status={getMQ3Status(currentReading?.mq3_raw, thresholds)}
            icon={<Wind className="h-5 w-5 text-yellow-400" />}
            lastUpdated={currentReading?.created_at}
          />
          <SensorCard
            label="MQ-7 Carbon Monoxide"
            value={currentReading?.mq7_ppm ?? currentReading?.mq7_raw ?? '--'}
            unit="PPM"
            status={getMQ7Status(currentReading?.mq7_ppm, thresholds)}
            icon={<Flame className="h-5 w-5 text-orange-400" />}
            lastUpdated={currentReading?.created_at}
          />
          <SensorCard
            label="Worker Motion State"
            value={currentReading?.movement_status ?? 'Unknown'}
            unit=""
            status={
              currentReading?.movement_status === 'Stationary'
                ? 'warning'
                : currentReading?.movement_status === 'High Activity'
                ? 'normal'
                : 'normal'
            }
            icon={<Activity className="h-5 w-5 text-emerald-400" />}
            lastUpdated={currentReading?.created_at}
          />
          <SensorCard
            label="GPS Position Fix"
            value={
              workerLocation?.gps_valid
                ? `${workerLocation.latitude.toFixed(3)}, ${workerLocation.longitude.toFixed(3)}`
                : 'No Satellite Fix'
            }
            unit=""
            status={workerLocation?.gps_valid ? 'normal' : 'warning'}
            icon={<MapPin className="h-5 w-5 text-cyan-400" />}
            lastUpdated={workerLocation?.created_at}
          />
        </div>
      </div>

      {/* Historical Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SensorTrendChart
          data={historyReadings}
          dataKey="temperature"
          title="Ambient Temperature Trend"
          unit="°C"
          strokeColor="#f43f5e"
          fillColor="#f43f5e"
          warningThreshold={thresholds.temperature_warning}
          criticalThreshold={thresholds.temperature_critical}
        />
        <SensorTrendChart
          data={historyReadings}
          dataKey="humidity"
          title="Atmospheric Humidity Trend"
          unit="%"
          strokeColor="#06b6d4"
          fillColor="#06b6d4"
          warningThreshold={thresholds.humidity_warning}
          criticalThreshold={thresholds.humidity_critical}
        />
        <SensorTrendChart
          data={historyReadings}
          dataKey="mq3_raw"
          title="MQ-3 Combustible / Hydrocarbon Gas Concentration"
          unit="Raw ADC"
          strokeColor="#eab308"
          fillColor="#eab308"
          warningThreshold={thresholds.mq3_warning}
          criticalThreshold={thresholds.mq3_critical}
        />
        <SensorTrendChart
          data={historyReadings}
          dataKey="mq7_ppm"
          title="MQ-7 Toxic Carbon Monoxide Level (CO)"
          unit="ppm"
          strokeColor="#f97316"
          fillColor="#f97316"
          warningThreshold={thresholds.mq7_warning}
          criticalThreshold={thresholds.mq7_critical}
        />
      </div>

      {/* Shift Activity & Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WorkerActivityTimeline />
        </div>

        {/* High-Priority Active Alert Feed */}
        <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Active Alerts Queue
              </h3>
              <Link
                to="/alerts"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {activeAlerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded border border-slate-800 bg-slate-900/60 p-2.5 transition-colors hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : alert.severity === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200 line-clamp-2">
                    {alert.description}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{alert.worker?.full_name || 'Worker'}</span>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {activeAlerts.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No unacknowledged safety alerts. All shafts nominal.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Critical workers: {dangerWorkers.length}</span>
            <Link to="/workers" className="text-cyan-400 hover:underline">
              Inspect Personnel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

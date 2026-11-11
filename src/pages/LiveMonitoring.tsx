import { useState, useEffect } from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Compass,
  MapPin,
  HardHat,
  Radio,
  Sliders,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import { getWorkers } from '../services/workerService';
import { getHelmets } from '../services/helmetService';
import { getThresholds, saveThresholds } from '../services/settingsService';
import {
  DEMO_WORKERS,
  DEMO_HELMETS,
  DEMO_HELMET_IDS,
  generateDemoSensorReading,
} from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import {
  getTemperatureStatus,
  getHumidityStatus,
  getMQ3Status,
  getMQ7Status,
  detectPossibleFall,
} from '../utils/thresholdUtils';
import type { Worker, Helmet, SensorThresholds, SensorReading } from '../types';
import { DEFAULT_THRESHOLDS } from '../config/constants';
import { toast } from 'sonner';

export default function LiveMonitoring() {
  const { demoMode } = useAppContext();
  const { latestReadings } = useRealtimeSensors();
  const { locations } = useWorkerLocations();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [selectedHelmetId, setSelectedHelmetId] = useState<string>(DEMO_HELMET_IDS[0]);
  const [thresholds, setThresholds] = useState<SensorThresholds>(DEFAULT_THRESHOLDS);
  const [showThresholdModal, setShowThresholdModal] = useState<boolean>(false);
  const [editingThresholds, setEditingThresholds] = useState<SensorThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured() || demoMode) {
        setWorkers(DEMO_WORKERS);
        setHelmets(DEMO_HELMETS);
        return;
      }

      try {
        const [wList, hList, tList] = await Promise.all([
          getWorkers(),
          getHelmets(),
          getThresholds(),
        ]);
        setWorkers(wList);
        setHelmets(hList);
        setThresholds(tList);
        setEditingThresholds(tList);
        if (hList.length > 0) setSelectedHelmetId(hList[0].id);
      } catch (err) {
        console.error('[MINEGUARD] Error fetching live monitor meta:', err);
      }
    }
    init();
  }, [demoMode]);

  const activeHelmet = helmets.find((h) => h.id === selectedHelmetId) || helmets[0];
  const assignedWorker = workers.find((w) => w.assigned_helmet_id === activeHelmet?.id);

  const EMPTY_READING: SensorReading = {
    id: 0,
    helmet_id: selectedHelmetId,
    temperature: null,
    humidity: null,
    mq3_raw: null,
    mq7_raw: null,
    mq7_ppm: null,
    accel_x: null,
    accel_y: null,
    accel_z: null,
    gyro_x: null,
    gyro_y: null,
    gyro_z: null,
    movement_status: 'Awaiting Hardware Signal',
    created_at: new Date().toISOString(),
  };

  // Get current active sensor reading (Strictly live when demoMode is false)
  const reading: SensorReading =
    latestReadings.get(selectedHelmetId) ||
    (demoMode ? generateDemoSensorReading(selectedHelmetId || DEMO_HELMET_IDS[0]) : EMPTY_READING);

  // GPS Location
  const loc = assignedWorker ? locations.get(assignedWorker.id) : null;

  // Fall & Impact calculation from MPU6050
  const fallAnalysis = detectPossibleFall(
    reading.accel_x,
    reading.accel_y,
    reading.accel_z,
    reading.gyro_x,
    reading.gyro_y,
    reading.gyro_z,
    thresholds.fall_impact_threshold
  );

  const accelMagnitude = Math.sqrt(
    Math.pow(reading.accel_x || 0, 2) +
    Math.pow(reading.accel_y || 0, 2) +
    Math.pow(reading.accel_z || 0, 2)
  );

  // Status checks
  const tempStatus = getTemperatureStatus(reading.temperature, thresholds);
  const humidityStatus = getHumidityStatus(reading.humidity, thresholds);
  const mq3Status = getMQ3Status(reading.mq3_raw, thresholds);
  const mq7Status = getMQ7Status(reading.mq7_ppm, thresholds);

  const handleSaveThresholds = async () => {
    setThresholds(editingThresholds);
    if (isSupabaseConfigured() && !demoMode) {
      await saveThresholds(editingThresholds);
    }
    setShowThresholdModal(false);
    toast.success('Demonstration safety thresholds updated successfully.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              LIVE SENSOR TELEMETRY & HARDWARE MONITOR
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800">
              <Radio className="h-3 w-3 animate-pulse" />
              ESP32 Realtime Node
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Direct feed from DHT11, MQ-3, MQ-7, MPU6050 6-DOF IMU, and NEO-6M GPS sensor suite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowThresholdModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            Adjust Thresholds
          </button>
        </div>
      </div>

      {/* Helmet Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {helmets.map((h) => {
          const w = workers.find((item) => item.assigned_helmet_id === h.id);
          const isSelected = h.id === selectedHelmetId;
          return (
            <button
              key={h.id}
              onClick={() => setSelectedHelmetId(h.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-all shrink-0 ${
                isSelected
                  ? 'border-blue-500 bg-[#152445] text-white shadow-md'
                  : 'border-slate-800/80 bg-[#111c35] hover:border-slate-700 text-slate-300'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md ${
                  h.is_online ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <HardHat className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span>{h.helmet_code}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      h.is_online ? 'bg-green-400' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
                  {w ? w.full_name.replace(' (Demo)', '') : 'Unassigned'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Worker Banner info */}
      <div className="navy-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-sm">
            {assignedWorker?.worker_code || 'HLMT'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100">{assignedWorker?.full_name || 'Unassigned Helmet'}</span>
              <span className="text-xs text-slate-400">({activeHelmet?.esp32_device_id || 'ESP32'})</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
              <span>Mining Sector: <strong className="text-slate-200">{assignedWorker?.mining_zone || 'Surface'}</strong></span>
              <span>Worker State: <strong className="text-blue-400 uppercase">{assignedWorker?.status || 'Active'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div>
            <span className="block text-slate-500 text-[10px]">HARDWARE CONNECTION</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> 2.4GHz WiFi / HTTP Telemetry
            </span>
          </div>
          <div>
            <span className="block text-slate-500 text-[10px]">TELEMETRY LATENCY</span>
            <span className="font-semibold text-blue-400">~120 ms</span>
          </div>
        </div>
      </div>

      {/* Primary Sensor Matrices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sensor A: DHT11 Temperature */}
        <div className={`rounded-lg border p-4 bg-[#161c2d] flex flex-col justify-between ${
          tempStatus === 'critical' ? 'border-red-500 shadow-lg shadow-red-950/40' :
          tempStatus === 'warning' ? 'border-amber-500' : 'border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-rose-500/10 text-rose-400">
                  <Thermometer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">DHT11 Temperature</h3>
                  <p className="text-[11px] text-slate-500">Thermal comfort & heat stress</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                tempStatus === 'critical' ? 'bg-red-500/20 text-red-400' :
                tempStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {tempStatus}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{reading.temperature ?? '--'}</span>
              <span className="text-sm text-slate-400">°C</span>
            </div>

            {/* Threshold indicator bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>0°C</span>
                <span className="text-amber-400">Warn: {thresholds.temperature_warning}°C</span>
                <span className="text-red-400">Crit: {thresholds.temperature_critical}°C</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    tempStatus === 'critical' ? 'bg-red-500' :
                    tempStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, ((reading.temperature || 0) / 50) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Sampling: 5s continuous</span>
            <span>Range: 0-50°C (±2°C)</span>
          </div>
        </div>

        {/* Sensor B: DHT11 Humidity */}
        <div className={`rounded-lg border p-4 bg-[#161c2d] flex flex-col justify-between ${
          humidityStatus === 'critical' ? 'border-red-500 shadow-lg shadow-red-950/40' :
          humidityStatus === 'warning' ? 'border-amber-500' : 'border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-cyan-500/10 text-cyan-400">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">DHT11 Humidity</h3>
                  <p className="text-[11px] text-slate-500">Relative shaft humidity</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                humidityStatus === 'critical' ? 'bg-red-500/20 text-red-400' :
                humidityStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {humidityStatus}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{reading.humidity ?? '--'}</span>
              <span className="text-sm text-slate-400">% RH</span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>0%</span>
                <span className="text-amber-400">Warn: {thresholds.humidity_warning}%</span>
                <span className="text-red-400">Crit: {thresholds.humidity_critical}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    humidityStatus === 'critical' ? 'bg-red-500' :
                    humidityStatus === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, reading.humidity || 0)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Sampling: 5s continuous</span>
            <span>Range: 20-90% RH (±5%)</span>
          </div>
        </div>

        {/* Sensor C: MQ-3 Combustible / Hydrocarbon Gases */}
        <div className={`rounded-lg border p-4 bg-[#161c2d] flex flex-col justify-between ${
          mq3Status === 'critical' ? 'border-red-500 shadow-lg shadow-red-950/40' :
          mq3Status === 'warning' ? 'border-amber-500' : 'border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-yellow-500/10 text-yellow-400">
                  <Wind className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">MQ-2 Gas Sensor</h3>
                  <p className="text-[11px] text-slate-500">Methane, LPG & Smoke detector</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                mq3Status === 'critical' ? 'bg-red-500/20 text-red-400' :
                mq3Status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {mq3Status}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{reading.mq3_raw ?? '--'}</span>
              <span className="text-sm text-slate-400">Raw ADC (12-bit)</span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>0</span>
                <span className="text-amber-400">Warn: {thresholds.mq3_warning}</span>
                <span className="text-red-400">Crit: {thresholds.mq3_critical}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    mq3Status === 'critical' ? 'bg-red-500' :
                    mq3Status === 'warning' ? 'bg-amber-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(100, ((reading.mq3_raw || 0) / 4095) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Analog Pin: GPIO 34</span>
            <span>Pre-heat: Active</span>
          </div>
        </div>

        {/* Sensor D: MQ-7 Carbon Monoxide (CO) */}
        <div className={`rounded-lg border p-4 bg-[#161c2d] flex flex-col justify-between ${
          mq7Status === 'critical' ? 'border-red-500 shadow-lg shadow-red-950/40' :
          mq7Status === 'warning' ? 'border-amber-500' : 'border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-orange-500/10 text-orange-400">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">MQ-7 Carbon Monoxide</h3>
                  <p className="text-[11px] text-slate-500">Toxic asphyxiant gas (CO)</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                mq7Status === 'critical' ? 'bg-red-500/20 text-red-400' :
                mq7Status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {mq7Status}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{reading.mq7_ppm ?? reading.mq7_raw ?? '--'}</span>
              <span className="text-sm text-slate-400">ppm CO</span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>0 ppm</span>
                <span className="text-amber-400">Warn: {thresholds.mq7_warning}</span>
                <span className="text-red-400">Crit: {thresholds.mq7_critical}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    mq7Status === 'critical' ? 'bg-red-500' :
                    mq7Status === 'warning' ? 'bg-amber-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(100, ((reading.mq7_ppm || 0) / 250) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Analog Pin: GPIO 35</span>
            <span>Calibrated: Yes</span>
          </div>
        </div>
      </div>

      {/* Sensor E: MPU6050 6-Axis Motion & Fall Detection Card */}
      <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                MPU6050 6-DOF INERTIAL MEASUREMENT UNIT (IMU)
              </h3>
              <p className="text-xs text-slate-400">
                Triple-axis accelerometer + Triple-axis gyroscope for fall detection, impact, and worker stance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fallAnalysis.detected ? (
              <span className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs font-black text-white animate-alert-flash">
                <ShieldAlert className="h-4 w-4" /> POSSIBLE FALL / IMPACT DETECTED!
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-green-950 px-2.5 py-1 text-xs font-semibold text-green-400 border border-green-800">
                <CheckCircle className="h-3.5 w-3.5" /> No Sudden Impact
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Accelerometer Vectors */}
          <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center justify-between">
              <span>Accelerometer (m/s²)</span>
              <span className="text-cyan-400 text-[11px]">|a|: {accelMagnitude.toFixed(2)} m/s²</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>X-Axis (Lateral):</span>
                  <span className="font-mono text-cyan-400">{reading.accel_x ?? 0} m/s²</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, Math.abs(reading.accel_x || 0) * 10)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Y-Axis (Longitudinal):</span>
                  <span className="font-mono text-cyan-400">{reading.accel_y ?? 0} m/s²</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, Math.abs(reading.accel_y || 0) * 10)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Z-Axis (Vertical Gravity):</span>
                  <span className="font-mono text-cyan-400">{reading.accel_z ?? 9.8} m/s²</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${Math.min(100, Math.abs(reading.accel_z || 0) * 7)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Gyroscope Vectors */}
          <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">
              Gyroscope Angular Velocity (rad/s)
            </h4>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Gyro Roll (X):</span>
                  <span className="font-mono text-indigo-400">{reading.gyro_x ?? 0} rad/s</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-400"
                    style={{ width: `${Math.min(100, Math.abs(reading.gyro_x || 0) * 50)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Gyro Pitch (Y):</span>
                  <span className="font-mono text-indigo-400">{reading.gyro_y ?? 0} rad/s</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-400"
                    style={{ width: `${Math.min(100, Math.abs(reading.gyro_y || 0) * 50)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Gyro Yaw (Z):</span>
                  <span className="font-mono text-indigo-400">{reading.gyro_z ?? 0} rad/s</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-400"
                    style={{ width: `${Math.min(100, Math.abs(reading.gyro_z || 0) * 50)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Motion State & Inactivity Engine */}
          <div className="rounded border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                Worker Motion & Posture Engine
              </h4>
              <div className="mt-2 flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  reading.movement_status === 'Stationary' ? 'bg-amber-500/20 text-amber-400' :
                  reading.movement_status === 'High Activity' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Current Status</span>
                  <span className="text-lg font-black text-white">
                    {reading.movement_status || 'Stationary'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Configured Inactivity Threshold:</span>
                  <span className="text-slate-200">{thresholds.inactivity_duration_seconds} sec</span>
                </div>
                <div className="flex justify-between">
                  <span>Fall Impact Threshold:</span>
                  <span className="text-slate-200">{thresholds.fall_impact_threshold} G-force</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Impact Vector:</span>
                  <span className="text-slate-200 font-mono">{fallAnalysis.magnitude.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
              *Filtered using 50Hz low-pass I2C register filter.
            </div>
          </div>
        </div>
      </div>

      {/* Sensor F: GPS Signal Fix Status */}
      <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-md ${
            loc?.gps_valid ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              NEO-6M GPS SATELLITE TELEMETRY
              {loc?.gps_valid ? (
                <span className="text-[10px] font-bold text-green-400 bg-green-950 px-2 py-0.5 rounded border border-green-800">
                  3D SATELLITE FIX ACQUIRED
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  SEARCHING FOR CONSTELLATION / SUBTERRANEAN
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {loc?.gps_valid
                ? `Latitude: ${loc.latitude.toFixed(6)} | Longitude: ${loc.longitude.toFixed(6)}`
                : 'GPS satellite line-of-sight unavailable inside underground shaft. Using dead reckoning.'}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 shrink-0">
          Last GNSS Ping: {loc?.created_at ? new Date(loc.created_at).toLocaleTimeString() : 'N/A'}
        </div>
      </div>

      {/* Threshold Config Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-[#1a1f2e] p-6 shadow-xl animate-fade-in">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-400" />
              Configure Demonstration Thresholds
            </h3>
            <p className="text-xs text-amber-400 mt-1 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
              ⚠ NOTE: These values are demonstration presets and must be calibrated to mine-specific regulations before operational sign-off.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300">Temp Warning (°C)</label>
                <input
                  type="number"
                  value={editingThresholds.temperature_warning}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      temperature_warning: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">Temp Critical (°C)</label>
                <input
                  type="number"
                  value={editingThresholds.temperature_critical}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      temperature_critical: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">Humidity Warning (%)</label>
                <input
                  type="number"
                  value={editingThresholds.humidity_warning}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      humidity_warning: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">Humidity Critical (%)</label>
                <input
                  type="number"
                  value={editingThresholds.humidity_critical}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      humidity_critical: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">MQ-7 CO Warning (ppm)</label>
                <input
                  type="number"
                  value={editingThresholds.mq7_warning}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      mq7_warning: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">MQ-7 CO Critical (ppm)</label>
                <input
                  type="number"
                  value={editingThresholds.mq7_critical}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      mq7_critical: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">Inactivity Trigger (sec)</label>
                <input
                  type="number"
                  value={editingThresholds.inactivity_duration_seconds}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      inactivity_duration_seconds: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300">Fall Impact Vector (G)</label>
                <input
                  type="number"
                  value={editingThresholds.fall_impact_threshold}
                  onChange={(e) =>
                    setEditingThresholds({
                      ...editingThresholds,
                      fall_impact_threshold: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowThresholdModal(false)}
                className="rounded px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThresholds}
                className="rounded bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition-colors"
              >
                Apply Thresholds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

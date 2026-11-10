import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  HardHat,
  MapPin,
  Activity,
  AlertTriangle,
  Radio,
  Thermometer,
  Droplets,
  Wind,
  Flame,
  CheckCircle,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import SensorCard from '../components/common/SensorCard';
import SensorTrendChart from '../components/charts/SensorTrendChart';
import { getWorkerById } from '../services/workerService';
import { getSensorHistory } from '../services/sensorService';
import { getAlerts } from '../services/alertService';
import { useRealtimeSensors } from '../hooks/useRealtimeSensors';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import { DEMO_WORKERS, DEMO_HELMETS, DEMO_ALERTS, generateDemoSensorHistory } from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_THRESHOLDS } from '../config/constants';
import { getTemperatureStatus, getHumidityStatus, getMQ3Status, getMQ7Status } from '../utils/thresholdUtils';
import type { Worker, Helmet, Alert, SensorReading } from '../types';

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const { demoMode } = useAppContext();
  const { latestReadings } = useRealtimeSensors();
  const { locations } = useWorkerLocations();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [helmet, setHelmet] = useState<Helmet | null>(null);
  const [workerAlerts, setWorkerAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadWorker() {
      setLoading(true);
      if (!isSupabaseConfigured() || demoMode) {
        const found = DEMO_WORKERS.find((w) => w.id === id) || DEMO_WORKERS[0];
        setWorker(found);
        const paired = DEMO_HELMETS.find((h) => h.id === found.assigned_helmet_id);
        setHelmet(paired || null);
        setWorkerAlerts(DEMO_ALERTS.filter((a) => a.worker_id === found.id));
        setHistory(generateDemoSensorHistory(found.assigned_helmet_id || 'demo-h', 24));
        setLoading(false);
        return;
      }

      try {
        if (id) {
          const w = await getWorkerById(id);
          if (w) {
            setWorker(w);
            setHelmet(w.helmet || null);
            if (w.assigned_helmet_id) {
              const hist = await getSensorHistory(w.assigned_helmet_id, 24);
              setHistory(hist);
            }
          }
          const a = await getAlerts({ workerId: id, limit: 10 });
          setWorkerAlerts(a);
        }
      } catch (err) {
        console.error('[MINEGUARD] Error loading worker detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorker();
  }, [id, demoMode]);

  if (loading || !worker) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Loading personnel telemetry profile...
      </div>
    );
  }

  const workerLoc = locations.get(worker.id);
  const reading = helmet ? latestReadings.get(helmet.id) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button and profile header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          to="/workers"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Personnel Roster
        </Link>
        <span className="text-xs font-mono text-slate-500">
          SYSTEM_UID: {worker.id}
        </span>
      </div>

      {/* Main Profile Summary Card */}
      <div className="navy-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-950 font-black text-2xl text-cyan-400 border border-cyan-800">
              {worker.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white">{worker.full_name}</h1>
                <StatusBadge status={worker.status} size="md" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="font-mono text-cyan-400">{worker.worker_code}</span>
                <span>Sector: <strong className="text-slate-200">{worker.mining_zone || 'Surface'}</strong></span>
                <span>Enrolled: {new Date(worker.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="block text-[10px] uppercase text-slate-500 font-bold">Assigned Hardware</span>
              <div className="mt-1 flex items-center gap-2">
                <HardHat className="h-4 w-4 text-cyan-400" />
                <span className="font-mono font-bold text-slate-200">
                  {helmet?.helmet_code || 'UNPAIRED'}
                </span>
                <span className={`h-2 w-2 rounded-full ${helmet?.is_online ? 'bg-green-400' : 'bg-slate-600'}`} />
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase text-slate-500 font-bold">GPS Coordinate Fix</span>
              <div className="mt-1 flex items-center gap-1.5 text-slate-200">
                <MapPin className="h-4 w-4 text-cyan-400" />
                {workerLoc?.gps_valid ? (
                  <span className="font-mono">{workerLoc.latitude.toFixed(4)}, {workerLoc.longitude.toFixed(4)}</span>
                ) : (
                  <span className="text-slate-500 italic">No GPS Fix</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Telemetry Matrix */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-400" /> Current Helmet Biometric & Environmental Readings
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SensorCard
            label="Temperature"
            value={reading?.temperature ?? '--'}
            unit="°C"
            status={getTemperatureStatus(reading?.temperature, DEFAULT_THRESHOLDS)}
            icon={<Thermometer className="h-5 w-5 text-rose-400" />}
            lastUpdated={reading?.created_at}
          />
          <SensorCard
            label="Humidity"
            value={reading?.humidity ?? '--'}
            unit="%"
            status={getHumidityStatus(reading?.humidity, DEFAULT_THRESHOLDS)}
            icon={<Droplets className="h-5 w-5 text-blue-400" />}
            lastUpdated={reading?.created_at}
          />
          <SensorCard
            label="MQ-3 VOC / Gas"
            value={reading?.mq3_raw ?? '--'}
            unit="Raw"
            status={getMQ3Status(reading?.mq3_raw, DEFAULT_THRESHOLDS)}
            icon={<Wind className="h-5 w-5 text-yellow-400" />}
            lastUpdated={reading?.created_at}
          />
          <SensorCard
            label="MQ-7 CO PPM"
            value={reading?.mq7_ppm ?? reading?.mq7_raw ?? '--'}
            unit="ppm"
            status={getMQ7Status(reading?.mq7_ppm, DEFAULT_THRESHOLDS)}
            icon={<Flame className="h-5 w-5 text-orange-400" />}
            lastUpdated={reading?.created_at}
          />
        </div>
      </div>

      {/* Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SensorTrendChart
          data={history}
          dataKey="temperature"
          title="24-Hour Ambient Temperature"
          unit="°C"
          strokeColor="#f43f5e"
          fillColor="#f43f5e"
        />
        <SensorTrendChart
          data={history}
          dataKey="mq7_ppm"
          title="24-Hour Toxic Carbon Monoxide History"
          unit="ppm"
          strokeColor="#f97316"
          fillColor="#f97316"
        />
      </div>

      {/* Worker Incident History */}
      <div className="navy-card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Safety Incident Log for {worker.full_name}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/60 uppercase text-slate-400 text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Severity</th>
                <th className="px-4 py-2.5">Alert Event</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {workerAlerts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        a.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400'
                          : a.severity === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{a.alert_type}</td>
                  <td className="px-4 py-3 text-slate-300">{a.description}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {a.resolved ? (
                      <span className="text-green-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Resolved
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold">Pending</span>
                    )}
                  </td>
                </tr>
              ))}

              {workerAlerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-500">
                    No safety incidents logged for this personnel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

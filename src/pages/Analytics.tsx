import { useState, useEffect } from 'react';
import {
  History,
  Download,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import AlertDistributionChart from '../components/charts/AlertDistributionChart';
import { getAlerts } from '../services/alertService';
import { getWorkers } from '../services/workerService';
import { getHelmets } from '../services/helmetService';
import {
  DEMO_ALERTS,
  DEMO_WORKERS,
  DEMO_HELMETS,
  generateDemoSensorHistory,
  DEMO_HELMET_IDS,
} from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import { exportToCsv } from '../utils/helpers';
import type { Alert, Worker, Helmet, SensorReading } from '../types';
import { toast } from 'sonner';

const SAMPLE_DAILY_ALERTS = [
  { date: 'Nov 05', critical: 1, high: 2, medium: 3 },
  { date: 'Nov 06', critical: 0, high: 1, medium: 2 },
  { date: 'Nov 07', critical: 2, high: 3, medium: 4 },
  { date: 'Nov 08', critical: 0, high: 1, medium: 2 },
  { date: 'Nov 09', critical: 1, high: 2, medium: 3 },
  { date: 'Nov 10', critical: 0, high: 0, medium: 1 },
  { date: 'Nov 11', critical: 1, high: 1, medium: 2 },
];

export default function Analytics() {
  const { demoMode } = useAppContext();
  const [dateRange, setDateRange] = useState<string>('7d');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured() || demoMode) {
        setAlerts(DEMO_ALERTS);
        setSensorHistory(generateDemoSensorHistory(DEMO_HELMET_IDS[0], 24));
        return;
      }
      try {
        const aList = await getAlerts({ limit: 100 });
        setAlerts(aList.length > 0 ? aList : DEMO_ALERTS);
        setSensorHistory(generateDemoSensorHistory(DEMO_HELMET_IDS[0], 24));
      } catch (err) {
        console.error(err);
      }
    }
    init();
  }, [demoMode]);

  const handleExportFullReport = () => {
    const reportData = alerts.map((a) => ({
      incident_id: a.id,
      timestamp: a.created_at,
      worker_name: a.worker?.full_name || 'N/A',
      category: a.alert_type,
      severity: a.severity,
      description: a.description,
      status: a.resolved ? 'RESOLVED' : 'ACTIVE',
    }));
    exportToCsv(reportData, `mineguard_history_${dateRange}`);
    toast.success('History log exported.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">History & Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Telemetry audits & incident trends</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-700/60 bg-[#111c35] p-1 text-xs font-semibold">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors ${
                  dateRange === range ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportFullReport}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="navy-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            SAFETY COMPLIANCE
          </span>
          <span className="text-3xl font-black text-emerald-400">96.4%</span>
        </div>
        <div className="navy-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            TOTAL INCIDENTS
          </span>
          <span className="text-3xl font-black text-white">{alerts.length}</span>
        </div>
        <div className="navy-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            GEOFENCE BREACHES
          </span>
          <span className="text-3xl font-black text-amber-400">1</span>
        </div>
        <div className="navy-card p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            HARDWARE UPTIME
          </span>
          <span className="text-3xl font-black text-blue-400">99.8%</span>
        </div>
      </div>

      {/* Daily Incident Frequency */}
      <div className="navy-card p-6">
        <h3 className="text-base font-bold text-white mb-4">Daily Safety Incident Frequencies</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={SAMPLE_DAILY_ALERTS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
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
              <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="medium" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Atmospheric Multi-Line Profile */}
      <div className="navy-card p-6">
        <h3 className="text-base font-bold text-white mb-4">Historical Environmental Telemetry</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <AreaChart
              data={sensorHistory.map((s, idx) => ({
                time: `${idx}:00`,
                temp: s.temperature ?? 28,
                humidity: s.humidity ?? 60,
              }))}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111c35',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Area type="monotone" name="Temperature (°C)" dataKey="temp" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
              <Area type="monotone" name="Humidity (%)" dataKey="humidity" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

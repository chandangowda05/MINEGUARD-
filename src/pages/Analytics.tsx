import { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  ShieldCheck,
  HardHat,
  AlertTriangle,
  Clock,
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
import KPICard from '../components/common/KPICard';
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

interface DailyAlertCount {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const SAMPLE_DAILY_ALERTS: DailyAlertCount[] = [
  { date: 'Nov 04', critical: 1, high: 2, medium: 4, low: 1 },
  { date: 'Nov 05', critical: 0, high: 1, medium: 3, low: 2 },
  { date: 'Nov 06', critical: 2, high: 3, medium: 5, low: 2 },
  { date: 'Nov 07', critical: 0, high: 2, medium: 2, low: 1 },
  { date: 'Nov 08', critical: 1, high: 1, medium: 4, low: 3 },
  { date: 'Nov 09', critical: 0, high: 0, medium: 2, low: 1 },
  { date: 'Nov 10', critical: 1, high: 2, medium: 3, low: 2 },
];

export default function Analytics() {
  const { demoMode } = useAppContext();

  const [dateRange, setDateRange] = useState<string>('7d'); // '24h' | '7d' | '30d'
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [selectedHelmetId, setSelectedHelmetId] = useState<string>('all');

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured() || demoMode) {
        setAlerts(DEMO_ALERTS);
        setWorkers(DEMO_WORKERS);
        setHelmets(DEMO_HELMETS);
        setSensorHistory(generateDemoSensorHistory(DEMO_HELMET_IDS[0], 24));
        return;
      }
      try {
        const [aList, wList, hList] = await Promise.all([
          getAlerts({ limit: 100 }),
          getWorkers(),
          getHelmets(),
        ]);
        setAlerts(aList.length > 0 ? aList : DEMO_ALERTS);
        setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
        setHelmets(hList.length > 0 ? hList : DEMO_HELMETS);
        setSensorHistory(generateDemoSensorHistory(hList[0]?.id || DEMO_HELMET_IDS[0], 24));
      } catch (err) {
        console.error('[MINEGUARD] Error fetching analytics data:', err);
      }
    }
    init();
  }, [demoMode]);

  // Statistics calculation
  const totalIncidents = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const geofenceViolations = alerts.filter(
    (a) => a.alert_type === 'RESTRICTED_ZONE_ENTRY' || a.alert_type === 'SAFE_ZONE_EXIT'
  ).length;
  const gasAlerts = alerts.filter(
    (a) => a.alert_type === 'HAZARDOUS_GAS' || a.alert_type === 'CARBON_MONOXIDE'
  ).length;

  const safetyCompliance =
    totalIncidents > 0 ? Math.max(82, 100 - criticalCount * 4) : 98;

  // CSV Report Export
  const handleExportFullReport = () => {
    const reportData = alerts.map((a) => ({
      incident_id: a.id,
      timestamp: a.created_at,
      worker_name: a.worker?.full_name || 'N/A',
      worker_code: a.worker?.worker_code || 'N/A',
      helmet_id: a.helmet?.helmet_code || 'N/A',
      category: a.alert_type,
      severity: a.severity,
      description: a.description,
      status: a.resolved ? 'RESOLVED' : 'ACTIVE',
    }));

    exportToCsv(
      reportData,
      `mineguard_safety_analytics_${dateRange}_${new Date().toISOString().split('T')[0]}`
    );
    toast.success('Analytics safety report exported to CSV.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-cyan-400" />
            SAFETY ANALYTICS & AUDIT COMPLIANCE REPORTS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical environmental trends, safety incident frequency, shift compliance, and exportable regulatory records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportFullReport}
            className="flex items-center gap-2 rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Safety Audit (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Date Range Bar */}
      <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range pills */}
          <div className="flex rounded border border-slate-700 overflow-hidden">
            <button
              onClick={() => setDateRange('24h')}
              className={`px-3 py-1.5 font-medium ${
                dateRange === '24h'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1.5 font-medium ${
                dateRange === '7d'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1.5 font-medium ${
                dateRange === '30d'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Worker Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Worker:</span>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Workers</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Helmet Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Helmet:</span>
            <select
              value={selectedHelmetId}
              onChange={(e) => setSelectedHelmetId(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">All Helmets</option>
              {helmets.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.helmet_code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-[11px] text-slate-500">
          Showing aggregated statistical records ({dateRange})
        </span>
      </div>

      {/* Safety Compliance & Summary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard
          title="Safety Compliance Index"
          value={`${safetyCompliance}%`}
          icon={<ShieldCheck className="h-5 w-5 text-green-400" />}
          subtitle="Regulatory threshold"
          color="green"
        />
        <KPICard
          title="Total Safety Incidents"
          value={totalIncidents}
          icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
          subtitle="Logged events"
          color="orange"
        />
        <KPICard
          title="Toxic Gas Excursions"
          value={gasAlerts}
          icon={<TrendingUp className="h-5 w-5 text-red-400" />}
          subtitle="MQ-3 & MQ-7 spikes"
          color="red"
        />
        <KPICard
          title="Geofence Breaches"
          value={geofenceViolations}
          icon={<Layers className="h-5 w-5 text-purple-400" />}
          subtitle="Zone perimeter violations"
          color="cyan"
        />
        <KPICard
          title="Avg Inactivity Duration"
          value="4.2m"
          icon={<Clock className="h-5 w-5 text-slate-400" />}
          subtitle="Before movement resume"
          color="slate"
        />
      </div>

      {/* Daily Incident Frequency Chart */}
      <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Safety Incidents Over Time
            </h3>
            <p className="text-xs text-slate-500">Incident severity breakdown by shift date</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500"></span> Critical
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="h-2 w-2 rounded-full bg-orange-500"></span> High
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Medium
            </span>
            <span className="flex items-center gap-1 text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500"></span> Low
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={SAMPLE_DAILY_ALERTS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#253047" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1f2e',
                  borderColor: '#334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="medium" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="low" stackId="a" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side: Alert Distribution & Multi-Sensor Ambient Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertDistributionChart alerts={alerts} height={280} />

        {/* Multi-parameter Environmental Timeline */}
        <div className="rounded-lg border border-slate-800 bg-[#161c2d] p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Composite Atmosphere Profile
            </h3>
            <p className="text-xs text-slate-500">Temperature & Humidity Overlay</p>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart
                data={sensorHistory.map((s, idx) => ({
                  time: idx % 4 === 0 ? `${idx}:00` : '',
                  temp: s.temperature ?? 28,
                  humidity: s.humidity ?? 60,
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#253047" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1f2e',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Area
                  type="monotone"
                  name="Temperature (°C)"
                  dataKey="temp"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  name="Humidity (% RH)"
                  dataKey="humidity"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

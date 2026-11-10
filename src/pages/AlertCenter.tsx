import { useState } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckCircle,
  Clock,
  Filter,
  Download,
  MapPin,
  Flame,
  Radio,
  BellRing,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { useAppContext } from '../context/AppContext';
import { exportToCsv } from '../utils/helpers';
import type { AlertSeverity, AlertType } from '../types';
import { ALERT_TYPE_LABELS, SEVERITY_COLORS } from '../types';
import { toast } from 'sonner';

const ALL_CATEGORIES: AlertType[] = [
  'HIGH_TEMPERATURE',
  'HIGH_HUMIDITY',
  'HAZARDOUS_GAS',
  'CARBON_MONOXIDE',
  'WORKER_INACTIVITY',
  'POSSIBLE_FALL',
  'SUDDEN_IMPACT',
  'RESTRICTED_ZONE_ENTRY',
  'SAFE_ZONE_EXIT',
  'EMERGENCY_SOS',
  'HELMET_OFFLINE',
  'GPS_SIGNAL_LOST',
];

export default function AlertCenter() {
  const { alertSoundEnabled, toggleAlertSound } = useAppContext();
  const { alerts, acknowledgeAlert, resolveAlert, playEmergencySound } = useRealtimeAlerts();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // 'active' | 'resolved' | 'all'
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser does not support desktop notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      toast.success('Desktop emergency notifications authorized.');
      new Notification('MINEGUARD Alert System', {
        body: 'Emergency push notifications are now active.',
        icon: '/favicon.svg',
      });
    } else {
      toast.error('Notification permission denied.');
    }
  };

  // Test sound buzzer
  const handleTestBuzzer = () => {
    playEmergencySound(900, 3);
    toast.info('Synthesizing industrial alarm frequency (900 Hz).');
  };

  // Filtered alerts list
  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || a.alert_type === categoryFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? !a.resolved
        : a.resolved;

    const matchesSearch =
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.worker?.full_name && a.worker.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.helmet?.helmet_code && a.helmet.helmet_code.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSeverity && matchesCategory && matchesStatus && matchesSearch;
  });

  // Emergency SOS items specifically
  const emergencySosAlerts = alerts.filter(
    (a) => a.alert_type === 'EMERGENCY_SOS' && !a.resolved
  );

  // CSV Export
  const handleExportCSV = () => {
    const rows = filteredAlerts.map((a) => ({
      alert_id: a.id,
      worker_name: a.worker?.full_name || 'N/A',
      worker_code: a.worker?.worker_code || 'N/A',
      helmet_id: a.helmet?.helmet_code || 'N/A',
      alert_type: a.alert_type,
      severity: a.severity,
      description: a.description,
      latitude: a.latitude ?? '',
      longitude: a.longitude ?? '',
      acknowledged: a.acknowledged ? 'YES' : 'NO',
      resolved: a.resolved ? 'YES' : 'NO',
      timestamp: a.created_at,
    }));
    exportToCsv(rows, `mineguard_alerts_${new Date().toISOString().split('T')[0]}`);
    toast.success('Alert logs exported to CSV.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-cyan-400" />
            INCIDENT & SAFETY ALERT COMMAND CENTER
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time emergency SOS dispatcher, atmospheric alarm triage, and incident resolution audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Mute/Unmute */}
          <button
            onClick={toggleAlertSound}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              alertSoundEnabled
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                : 'bg-slate-800 text-slate-400'
            }`}
            title="Toggle Alert Audio Tone"
          >
            {alertSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {alertSoundEnabled ? 'Buzzer On' : 'Buzzer Muted'}
          </button>

          {/* Test Buzzer */}
          <button
            onClick={handleTestBuzzer}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            Test Tone
          </button>

          {/* Browser Notification Button */}
          <button
            onClick={requestNotificationPermission}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            <BellRing className="h-3.5 w-3.5 text-cyan-400" />
            Enable Push
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export Log
          </button>
        </div>
      </div>

      {/* Emergency SOS Banner Callout if Active */}
      {emergencySosAlerts.length > 0 && (
        <div className="rounded-lg border-2 border-red-500 bg-red-950/80 p-5 shadow-2xl shadow-red-950/60 animate-pulse-glow">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping" />
            <h2 className="text-base font-black uppercase text-red-300 tracking-wider flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              ACTIVE EMERGENCY PANIC BUTTONS (SOS) DISPATCH ({emergencySosAlerts.length})
            </h2>
          </div>

          <div className="space-y-3 mt-3">
            {emergencySosAlerts.map((sos) => (
              <div
                key={sos.id}
                className="rounded-lg border border-red-500/40 bg-black/40 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-red-600 px-2 py-0.5 font-black uppercase text-white tracking-widest text-[10px]">
                      CRITICAL SOS
                    </span>
                    <span className="font-bold text-white text-sm">
                      {sos.worker?.full_name || 'Worker'}
                    </span>
                    <span className="text-slate-400 font-mono">
                      (Helmet: {sos.helmet?.helmet_code || 'HLMT-103'})
                    </span>
                  </div>
                  <p className="text-xs text-red-200 mt-1 font-medium">{sos.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-red-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Coordinates: {sos.latitude?.toFixed(4)}, {sos.longitude?.toFixed(4)}
                    </span>
                    <span>Received: {new Date(sos.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/gps-tracking"
                    className="rounded bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Map View
                  </Link>
                  {!sos.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(sos.id)}
                      className="rounded border border-red-400 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-900/50"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => resolveAlert(sos.id)}
                    className="rounded bg-green-700 hover:bg-green-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Resolve Incident
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
            Search Incidents
          </label>
          <input
            type="text"
            placeholder="Search description, worker, or helmet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded border border-slate-800 bg-[#161c2d] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
            Severity Filter
          </label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full rounded border border-slate-800 bg-[#161c2d] px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
            Category Filter
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded border border-slate-800 bg-[#161c2d] px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All 12 Categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ALERT_TYPE_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
            Resolution Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded border border-slate-800 bg-[#161c2d] px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="active">Active (Unresolved)</option>
            <option value="resolved">Resolved Only</option>
            <option value="all">All Logs</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#161c2d]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/60 uppercase text-slate-400 tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Incident Category</th>
              <th className="px-4 py-3">Worker & Device</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Location / GPS</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAlerts.map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              return (
                <tr
                  key={alert.id}
                  className={`transition-colors ${
                    isCrit ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                          : alert.severity === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : alert.severity === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="font-bold text-white">
                      {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-200">
                      {alert.worker?.full_name || 'Unassigned'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {alert.helmet?.helmet_code || 'No Helmet'}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-slate-300 max-w-xs">
                    {alert.description}
                  </td>

                  <td className="px-4 py-3.5 text-slate-400">
                    {alert.latitude && alert.longitude ? (
                      <div className="flex items-center gap-1 font-mono text-[11px] text-cyan-400">
                        <MapPin className="h-3 w-3" />
                        {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No GPS</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(alert.created_at).toLocaleString()}
                  </td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => {
                            acknowledgeAlert(alert.id);
                            toast.success('Alert acknowledged.');
                          }}
                          className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300"
                        >
                          Acknowledge
                        </button>
                      )}

                      {!alert.resolved ? (
                        <button
                          onClick={() => {
                            resolveAlert(alert.id);
                            toast.success('Alert resolved.');
                          }}
                          className="rounded bg-green-700 hover:bg-green-600 px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-green-400 text-[11px] font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" /> Resolved
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAlerts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                  No incident alerts matching the filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

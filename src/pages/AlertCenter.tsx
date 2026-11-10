import { useState } from 'react';
import {
  CheckCircle,
  MapPin,
  Clock,
  Download,
  ShieldAlert,
} from 'lucide-react';
import { useRealtimeAlerts } from '../hooks/useRealtimeAlerts';
import { exportToCsv } from '../utils/helpers';
import type { Alert } from '../types';
import { toast } from 'sonner';

export default function AlertCenter() {
  const { alerts, acknowledgeAlert, resolveAlert } = useRealtimeAlerts();
  const [filterTab, setFilterTab] = useState<'active' | 'resolved' | 'all'>('active');

  const filteredAlerts = alerts.filter((a) => {
    if (filterTab === 'active') return !a.resolved;
    if (filterTab === 'resolved') return a.resolved;
    return true;
  });

  const handleExportCSV = () => {
    const rows = filteredAlerts.map((a) => ({
      alert_id: a.id,
      worker_name: a.worker?.full_name || 'N/A',
      helmet_id: a.helmet?.helmet_code || 'N/A',
      alert_type: a.alert_type,
      severity: a.severity,
      description: a.description,
      status: a.resolved ? 'RESOLVED' : 'ACTIVE',
      timestamp: a.created_at,
    }));
    exportToCsv(rows, `mineguard_alerts_${filterTab}`);
    toast.success('Alerts exported.');
  };

  return (
    <div className="space-y-6">
      {/* Header matching Reference Image 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Alerts</h1>
          <p className="text-xs text-slate-400 mt-0.5">System events and security breaches</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active / Resolved / All Pill Switcher (Image 5) */}
          <div className="flex rounded-lg border border-slate-700/60 bg-[#111c35] p-1 text-xs font-semibold">
            <button
              onClick={() => setFilterTab('active')}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors ${
                filterTab === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterTab('resolved')}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors ${
                filterTab === 'resolved'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-md uppercase tracking-wider transition-colors ${
                filterTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="rounded-lg bg-[#111c35] border border-slate-700/60 hover:bg-slate-800 p-2 text-slate-300 transition-colors"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Container matching Reference Image 5 */}
      <div className="navy-card p-6 min-h-[420px] flex flex-col justify-center">
        {filteredAlerts.length === 0 ? (
          /* Empty State matching Image 5: "All Clear" with green checkmark */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">All Clear</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              There are no active alerts matching your criteria.
            </p>
          </div>
        ) : (
          /* List of alerts in modern navy cards */
          <div className="space-y-3.5 my-auto">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="navy-card-sub p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-slate-700"
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                        : alert.severity === 'HIGH'
                        ? 'bg-amber-500'
                        : 'bg-blue-400'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {alert.helmet?.helmet_code || 'Smart Helmet'} - {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400'
                            : alert.severity === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{alert.description}</p>
                    <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
                      <span>Worker: {alert.worker?.full_name || 'N/A'}</span>
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300"
                    >
                      Acknowledge
                    </button>
                  )}
                  {!alert.resolved ? (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Resolve
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

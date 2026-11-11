import { AlertTriangle, CheckCircle, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRealtimeAlerts } from '../../hooks/useRealtimeAlerts';
import { useAppContext } from '../../context/AppContext';

export default function EmergencyBanner() {
  const { alerts, resolveAlert, acknowledgeAlert } = useRealtimeAlerts();
  const { alertSoundEnabled, toggleAlertSound } = useAppContext();

  // Find the most recent active (unresolved) CRITICAL or EMERGENCY_SOS alert
  const activeSos = alerts.find(
    (a) => !a.resolved && (a.severity === 'CRITICAL' || a.alert_type === 'EMERGENCY_SOS')
  );

  if (!activeSos) return null;

  return (
    <div className="relative z-50 flex items-center justify-between gap-4 bg-gradient-to-r from-rose-950 via-red-950 to-rose-900 px-6 py-2.5 border-b border-rose-500 shadow-xl shadow-rose-950/80 animate-pulse">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.8)]">
          <AlertTriangle className="h-4 w-4 animate-bounce" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-rose-100 text-xs sm:text-sm tracking-wider uppercase">
              🚨 CRITICAL EMERGENCY SOS
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
              {activeSos.helmet?.helmet_code || 'HLMT-101'}
            </span>
          </div>
          <p className="text-xs text-rose-200/90 truncate mt-0.5 font-medium">
            {activeSos.description}
            {activeSos.worker?.full_name ? ` • Worker: ${activeSos.worker.full_name}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleAlertSound}
          className="p-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-300 transition-colors"
          title={alertSoundEnabled ? 'Mute Siren' : 'Enable Siren'}
        >
          {alertSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {!activeSos.acknowledged && (
          <button
            onClick={() => acknowledgeAlert(activeSos.id)}
            className="rounded-lg bg-rose-800/80 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          >
            Acknowledge
          </button>
        )}

        <button
          onClick={() => resolveAlert(activeSos.id)}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-950 transition-colors"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Resolve
        </button>

        <Link
          to="/alerts"
          className="hidden sm:flex items-center gap-1 rounded-lg bg-rose-950/80 border border-rose-700/50 hover:bg-rose-900 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition-colors"
        >
          <span>View</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}


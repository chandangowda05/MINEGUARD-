import { useEffect, useState } from 'react';
import { Bell, Radio, Zap, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAppContext } from '../../context/AppContext';
import HardwareSimulatorModal from '../dashboard/HardwareSimulatorModal';

export default function TopNav() {
  const { systemOnline, lastDataReceived, notificationCount, demoMode } = useAppContext();
  const [now, setNow] = useState(new Date());
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', { hour12: true });

  const lastDataText = lastDataReceived
    ? `Last data: ${formatDistanceToNow(new Date(lastDataReceived), { addSuffix: true })}`
    : 'No data received';

  return (
    <>
      <header
        className="flex h-16 items-center justify-between border-b border-slate-700/50 px-6 shrink-0"
        style={{ backgroundColor: '#111827' }}
      >
        {/* Left */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-wider text-cyan-400">MINEGUARD</span>
          <span className="hidden sm:inline-block rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
            IoT Safety Hub
          </span>
        </div>

        {/* Center */}
        <div className="hidden items-center gap-5 md:flex text-xs">
          {/* System status */}
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                systemOnline
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
              }`}
            />
            <span className={systemOnline ? 'text-green-400 font-semibold' : 'text-red-400'}>
              {systemOnline ? 'System Online' : 'System Offline'}
            </span>
          </div>

          {/* ESP32 badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-0.5 text-xs font-semibold text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            {demoMode ? 'ESP32 Telemetry (Active)' : 'ESP32 Connected'}
          </span>

          {/* Last data */}
          <span className="text-slate-400 font-mono text-[11px]">{lastDataText}</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Hardware Scenario Simulator Trigger */}
          <button
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/60 px-3 py-1.5 text-xs font-bold text-cyan-300 shadow-sm transition-all"
            title="Inject simulated hardware events (SOS, Fall, Gas, Geofence)"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Scenario Simulator</span>
          </button>

          {/* Clock */}
          <div className="hidden text-right text-xs leading-tight text-slate-400 lg:block">
            <div>{formattedDate}</div>
            <div className="font-mono text-slate-300 font-bold">{formattedTime}</div>
          </div>

          {/* Notifications Link to /alerts */}
          <Link
            to="/alerts"
            className="relative p-1.5 rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-cyan-400"
            title="View Alert Command Center"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white animate-pulse">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Link>

          {/* Avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-xs font-black text-white border border-cyan-400 shadow-sm">
            MG
          </div>
        </div>
      </header>

      {/* Simulator Modal */}
      <HardwareSimulatorModal
        open={showSimulator}
        onClose={() => setShowSimulator(false)}
      />
    </>
  );
}

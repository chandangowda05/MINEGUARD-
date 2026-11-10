import { useEffect, useState } from 'react';
import { Bell, Zap } from 'lucide-react';
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

  const formattedTime = now.toLocaleTimeString('en-US', { hour12: true });

  const lastDataText = lastDataReceived
    ? `Updated ${formatDistanceToNow(new Date(lastDataReceived), { addSuffix: true })}`
    : 'Waiting for heartbeat';

  return (
    <>
      <header
        className="flex h-14 items-center justify-between px-8 shrink-0 border-b border-[#131d36]"
        style={{ backgroundColor: '#090f1f' }}
      >
        {/* Left: subtle telemetry status */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                systemOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {systemOnline ? 'System Online' : 'System Offline'}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400 font-mono text-[11px]">{lastDataText}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Quick Scenario Simulator */}
          <button
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-400 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Scenario Simulator</span>
          </button>

          {/* Clock */}
          <div className="hidden sm:block font-mono text-xs text-slate-400 font-medium px-2">
            {formattedTime}
          </div>

          {/* Notifications */}
          <Link
            to="/alerts"
            className="relative rounded-lg p-2 text-slate-400 hover:bg-[#111c35] hover:text-white transition-colors"
          >
            <Bell className="h-4.5 w-4.5" />
            {notificationCount > 0 && (
              <span className="absolute 1 top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <HardwareSimulatorModal
        open={showSimulator}
        onClose={() => setShowSimulator(false)}
      />
    </>
  );
}

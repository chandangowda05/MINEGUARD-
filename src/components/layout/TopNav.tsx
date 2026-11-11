import { useEffect, useState } from 'react';
import { Bell, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAppContext } from '../../context/AppContext';
import HardwareSimulatorModal from '../dashboard/HardwareSimulatorModal';

export default function TopNav() {
  const { systemOnline, lastDataReceived, notificationCount, demoMode, toggleDemoMode } = useAppContext();
  const [now, setNow] = useState(new Date());
  const [showSimulator, setShowSimulator] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formattedTime = now.toLocaleTimeString('en-US', { hour12: true });

  const isHardwareLive = lastDataReceived
    ? !isNaN(new Date(lastDataReceived).getTime()) && (Date.now() - new Date(lastDataReceived).getTime()) < 60000
    : false;

  let lastDataText = 'Waiting for ESP32';
  if (lastDataReceived) {
    try {
      const d = new Date(lastDataReceived);
      if (!isNaN(d.getTime())) {
        lastDataText = `Last seen ${formatDistanceToNow(d, { addSuffix: true })}`;
      }
    } catch {
      lastDataText = 'Live Telemetry Active';
    }
  }

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
                isHardwareLive
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isHardwareLive ? 'Hardware Live' : 'Hardware Standby'}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <span className="text-slate-400 font-mono text-[11px]">{lastDataText}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Live Hardware vs Demo Mode Toggle */}
          <button
            onClick={toggleDemoMode}
            title={demoMode ? "Click to switch to Live ESP32 Hardware Stream" : "Click to switch to Simulated Demo Mode"}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              demoMode
                ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                : 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                demoMode
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              }`}
            />
            <span>{demoMode ? 'Demo Mode' : 'Live Hardware'}</span>
          </button>

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

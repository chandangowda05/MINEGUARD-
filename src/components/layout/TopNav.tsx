import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAppContext } from '../../context/AppContext';

export default function TopNav() {
  const { systemOnline, lastDataReceived, notificationCount } = useAppContext();
  const [now, setNow] = useState(new Date());

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
    <header
      className="flex h-16 items-center justify-between border-b border-slate-700/50 px-6"
      style={{ backgroundColor: '#111827' }}
    >
      {/* Left */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-wider text-cyan-400">MINEGUARD</span>
      </div>

      {/* Center */}
      <div className="hidden items-center gap-6 md:flex">
        {/* System status */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${systemOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'}`}
          />
          <span className={systemOnline ? 'text-green-400' : 'text-red-400'}>
            {systemOnline ? 'System Online' : 'System Offline'}
          </span>
        </div>

        {/* ESP32 badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          ESP32 Disconnected
        </span>

        {/* Last data */}
        <span className="text-xs text-slate-500">{lastDataText}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        {/* Clock */}
        <div className="hidden text-right text-xs leading-tight text-slate-400 lg:block">
          <div>{formattedDate}</div>
          <div className="font-mono text-slate-300">{formattedTime}</div>
        </div>

        {/* Notifications */}
        <button className="relative text-slate-400 transition-colors hover:text-slate-200">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
          MG
        </div>
      </div>
    </header>
  );
}

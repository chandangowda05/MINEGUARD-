import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Map,
  Cpu,
  Users,
  ShieldAlert,
  AlertTriangle,
  History,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Live Map', icon: Map, path: '/gps-tracking' },
  { label: 'Devices', icon: Cpu, path: '/devices' },
  { label: 'Workers', icon: Users, path: '/workers' },
  { label: 'Zones', icon: Shield, path: '/geofencing' },
  { label: 'Alerts', icon: AlertTriangle, path: '/alerts' },
  { label: 'History', icon: History, path: '/analytics' },
  { label: 'Live Telemetry', icon: Activity, path: '/monitoring' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#162340] transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-64',
      )}
      style={{ backgroundColor: '#090f1f' }}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Shield className="h-5 w-5" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-white">MINEGUARD</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#152445] text-blue-400 font-semibold'
                  : 'text-slate-400 hover:bg-[#111c35] hover:text-slate-200',
                sidebarCollapsed && 'justify-center px-2',
              )
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Collapse Toggle */}
      <div className="border-t border-[#162340] p-4">
        {!sidebarCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#162340] text-sm font-bold text-slate-300 border border-slate-700">
                D
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-200">
                  demo@demo.com
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  ADMIN
                </div>
              </div>
            </div>

            <button
              onClick={() => {}}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors pt-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#162340] text-xs font-bold text-slate-300">
              D
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded p-1 text-slate-400 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="mt-3 flex w-full items-center justify-center rounded p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

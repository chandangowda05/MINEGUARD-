import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Activity,
  Users,
  MapPin,
  Map,
  Bell,
  BarChart3,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/' },
  { label: 'Live Monitoring', icon: Activity, path: '/monitoring' },
  { label: 'Worker Management', icon: Users, path: '/workers' },
  { label: 'Live GPS Tracking', icon: MapPin, path: '/gps-tracking' },
  { label: 'Geofencing', icon: Map, path: '/geofencing' },
  { label: 'Alert Center', icon: Bell, path: '/alerts' },
  { label: 'Analytics & Reports', icon: BarChart3, path: '/analytics' },
  { label: 'Device Management', icon: Cpu, path: '/devices' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-700/50 transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-64',
      )}
      style={{ backgroundColor: '#111827' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700/50 px-4">
        <Shield className="h-8 w-8 shrink-0 text-cyan-400" />
        {!sidebarCollapsed && (
          <span className="text-lg font-bold tracking-wide text-cyan-400">MINEGUARD</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-[3px] border-cyan-400 bg-cyan-400/10 text-cyan-400'
                  : 'border-l-[3px] border-transparent text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
                sidebarCollapsed && 'justify-center',
              )
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex h-12 items-center justify-center border-t border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/40 hover:text-slate-200"
      >
        {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>
    </aside>
  );
}

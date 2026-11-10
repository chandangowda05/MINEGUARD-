import { Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { clsx } from 'clsx';

export default function AppLayout() {
  const { sidebarCollapsed, demoMode } = useAppContext();

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a0e1a', color: '#f1f5f9' }}>
      <Sidebar />

      <div
        className={clsx(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-64',
        )}
      >
        <TopNav />

        <main className="flex-1 overflow-y-auto p-6">
          {demoMode && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
              ⚠ DEMO MODE — Displaying simulated data. Connect Supabase for live monitoring.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

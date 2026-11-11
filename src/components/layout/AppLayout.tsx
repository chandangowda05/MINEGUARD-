import { Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import EmergencyBanner from '../alerts/EmergencyBanner';
import { clsx } from 'clsx';

export default function AppLayout() {
  const { sidebarCollapsed } = useAppContext();

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0a101f', color: '#f1f5f9' }}>
      <Sidebar />

      <div
        className={clsx(
          'flex flex-1 flex-col transition-all duration-300 min-w-0 overflow-hidden',
          sidebarCollapsed ? 'ml-20' : 'ml-64',
        )}
      >
        <TopNav />
        <EmergencyBanner />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

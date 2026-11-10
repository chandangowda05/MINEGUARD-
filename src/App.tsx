import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';
import LoadingState from './components/common/LoadingState';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy loaded page components
const Overview = lazy(() => import('./pages/Overview'));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring'));
const Workers = lazy(() => import('./pages/Workers'));
const WorkerDetail = lazy(() => import('./pages/WorkerDetail'));
const GPSTracking = lazy(() => import('./pages/GPSTracking'));
const Geofencing = lazy(() => import('./pages/Geofencing'));
const AlertCenter = lazy(() => import('./pages/AlertCenter'));
const Analytics = lazy(() => import('./pages/Analytics'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const Settings = lazy(() => import('./pages/Settings'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 10,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <BrowserRouter>
            <Toaster
              theme="dark"
              position="top-right"
              richColors
              closeButton
            />
            <Suspense fallback={<LoadingState message="Loading MINEGUARD Operations Hub..." />}>
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="monitoring" element={<LiveMonitoring />} />
                  <Route path="workers" element={<Workers />} />
                  <Route path="workers/:id" element={<WorkerDetail />} />
                  <Route path="gps-tracking" element={<GPSTracking />} />
                  <Route path="geofencing" element={<Geofencing />} />
                  <Route path="alerts" element={<AlertCenter />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="devices" element={<DeviceManagement />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}


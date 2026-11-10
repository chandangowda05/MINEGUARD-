import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AppContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  demoMode: boolean;
  toggleDemoMode: () => void;
  alertSoundEnabled: boolean;
  toggleAlertSound: () => void;
  systemOnline: boolean;
  lastDataReceived: string | null;
  setLastDataReceived: (timestamp: string | null) => void;
  notificationCount: number;
  setNotificationCount: React.Dispatch<React.SetStateAction<number>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === 'true';
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [demoMode, setDemoMode] = useState(() => {
    // If live Supabase credentials are configured, ALWAYS force LIVE Hardware mode (demoMode: false)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mineguard_demo_mode');
      if (stored === 'true') {
        localStorage.setItem('mineguard_demo_mode', 'false');
      }
    }
    return false;
  });
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(() =>
    getStoredBoolean('mineguard_alert_sound_enabled', true),
  );
  const [systemOnline, setSystemOnline] = useState(true);
  const [lastDataReceived, setLastDataReceived] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('mineguard_demo_mode', String(demoMode));
  }, [demoMode]);

  useEffect(() => {
    localStorage.setItem('mineguard_alert_sound_enabled', String(alertSoundEnabled));
  }, [alertSoundEnabled]);

  // Simple online/offline detection
  useEffect(() => {
    const goOnline = () => setSystemOnline(true);
    const goOffline = () => setSystemOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);
  const toggleDemoMode = useCallback(() => setDemoMode((p) => !p), []);
  const toggleAlertSound = useCallback(() => setAlertSoundEnabled((p) => !p), []);

  return (
    <AppContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar,
        demoMode,
        toggleDemoMode,
        alertSoundEnabled,
        toggleAlertSound,
        systemOnline,
        lastDataReceived,
        setLastDataReceived,
        notificationCount,
        setNotificationCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
}

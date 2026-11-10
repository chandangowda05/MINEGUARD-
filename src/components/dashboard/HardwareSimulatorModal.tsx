import { useState } from 'react';
import {
  Radio,
  ShieldAlert,
  Flame,
  Activity,
  Layers,
  Thermometer,
  Clock,
  X,
  Zap,
} from 'lucide-react';
import { useRealtimeAlerts } from '../../hooks/useRealtimeAlerts';
import { useAppContext } from '../../context/AppContext';
import { DEMO_WORKERS, DEMO_HELMET_IDS } from '../../services/demoDataService';
import { toast } from 'sonner';

interface HardwareSimulatorModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HardwareSimulatorModal({ open, onClose }: HardwareSimulatorModalProps) {
  const { playEmergencySound } = useRealtimeAlerts();
  const { setNotificationCount } = useAppContext();

  if (!open) return null;

  const triggerEvent = (
    title: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    frequency = 900
  ) => {
    playEmergencySound(frequency, severity === 'CRITICAL' ? 4 : 2);
    setNotificationCount((prev) => prev + 1);

    if (severity === 'CRITICAL') {
      toast.error(`[CRITICAL SIMULATION] ${title}: ${description}`, { duration: 6000 });
    } else {
      toast.warning(`[SIMULATION] ${title}: ${description}`, { duration: 4500 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-xl border border-cyan-500/40 bg-[#161c2d] p-6 shadow-2xl shadow-cyan-950/60">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-cyan-400 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">
              HARDWARE & TELEMETRY SCENARIO SIMULATOR
            </h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Inject test hardware payloads and environmental hazard anomalies to evaluate the real-time notification engine, audio alarms, and control room dispatchers.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* 1. SOS Panic Button */}
          <button
            onClick={() =>
              triggerEvent(
                'Emergency SOS Button',
                'Worker Vikram Singh pressed the physical helmet panic button in Shaft 7!',
                'CRITICAL',
                980
              )
            }
            className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-left hover:bg-red-900/40 transition-colors group"
          >
            <div className="p-2 rounded bg-red-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-red-300 block">Trigger Emergency SOS</span>
              <span className="text-[11px] text-red-200/70">
                Simulates physical push button depression on ESP32 GPIO 14.
              </span>
            </div>
          </button>

          {/* 2. Fall & Impact */}
          <button
            onClick={() =>
              triggerEvent(
                'Possible Worker Fall',
                'Sudden vertical impact vector (32.4 G) detected on MPU6050 for Amit Patel!',
                'HIGH',
                750
              )
            }
            className="flex items-start gap-3 rounded-lg border border-purple-500/40 bg-purple-950/30 p-3 text-left hover:bg-purple-900/40 transition-colors group"
          >
            <div className="p-2 rounded bg-purple-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-purple-300 block">Simulate Possible Fall</span>
              <span className="text-[11px] text-purple-200/70">
                Spikes MPU6050 accelerometer vector beyond 25G impact threshold.
              </span>
            </div>
          </button>

          {/* 3. Toxic Carbon Monoxide Leak */}
          <button
            onClick={() =>
              triggerEvent(
                'Toxic CO Surge',
                'MQ-7 sensor detected hazardous Carbon Monoxide spike (142 ppm) in Deep Tunnel!',
                'HIGH',
                680
              )
            }
            className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-950/30 p-3 text-left hover:bg-orange-900/40 transition-colors group"
          >
            <div className="p-2 rounded bg-orange-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-orange-300 block">Inject Toxic Gas (CO)</span>
              <span className="text-[11px] text-orange-200/70">
                Increases MQ-7 reading above 100 ppm warning limit.
              </span>
            </div>
          </button>

          {/* 4. Danger Geofence Breach */}
          <button
            onClick={() =>
              triggerEvent(
                'Danger Zone Breach',
                'Worker entered Blasting Area Zone 3 (Active Geofence Violation)!',
                'CRITICAL',
                920
              )
            }
            className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-left hover:bg-amber-900/40 transition-colors group"
          >
            <div className="p-2 rounded bg-amber-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-amber-300 block">Breach Danger Zone</span>
              <span className="text-[11px] text-amber-200/70">
                Translates GPS fix directly inside an active restricted perimeter.
              </span>
            </div>
          </button>

          {/* 5. Thermal Heat Stress */}
          <button
            onClick={() =>
              triggerEvent(
                'Heat Stress Alert',
                'DHT11 reports ambient temperature 47.2°C exceeding critical safety standards!',
                'HIGH',
                620
              )
            }
            className="flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-left hover:bg-rose-900/40 transition-colors group"
          >
            <div className="p-2 rounded bg-rose-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Thermometer className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-rose-300 block">Extreme Heat Stress</span>
              <span className="text-[11px] text-rose-200/70">
                Spikes DHT11 sensor past critical 45°C cutoff.
              </span>
            </div>
          </button>

          {/* 6. Worker Inactivity */}
          <button
            onClick={() =>
              triggerEvent(
                'Worker Inactivity Alert',
                'Zero accelerometer movement detected for 310 seconds on Sunil Kumar.',
                'MEDIUM',
                500
              )
            }
            className="flex items-start gap-3 rounded-lg border border-slate-600/40 bg-slate-800/40 p-3 text-left hover:bg-slate-700/40 transition-colors group"
          >
            <div className="p-2 rounded bg-slate-600 text-white shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-300 block">Simulate Inactivity</span>
              <span className="text-[11px] text-slate-400">
                Exceeds the 300-second stillness inactivity detection window.
              </span>
            </div>
          </button>
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-800 pt-3">
          <button
            onClick={onClose}
            className="rounded bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
}


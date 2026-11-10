import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  Volume2,
  Database,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Radio,
} from 'lucide-react';
import { getThresholds, saveThresholds } from '../services/settingsService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import { DEFAULT_THRESHOLDS } from '../config/constants';
import type { SensorThresholds } from '../types';
import { toast } from 'sonner';

export default function Settings() {
  const { demoMode, toggleDemoMode, alertSoundEnabled, toggleAlertSound } = useAppContext();

  const [thresholds, setThresholds] = useState<SensorThresholds>(DEFAULT_THRESHOLDS);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (isSupabaseConfigured() && !demoMode) {
        const data = await getThresholds();
        setThresholds(data);
      } else {
        setThresholds(DEFAULT_THRESHOLDS);
      }
    }
    load();
  }, [demoMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isSupabaseConfigured() && !demoMode) {
        await saveThresholds(thresholds);
      }
      toast.success('Demonstration safety parameters saved.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    toast.info('Reset to default factory demonstration parameters.');
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-cyan-400" />
          SYSTEM CONFIGURATION & SAFETY THRESHOLDS
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust environmental trigger levels, biometric inactivity windows, fall sensitivity, and telemetry parameters.
        </p>
      </div>

      {/* Mandatory Mining Safety Standards Disclaimer */}
      <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold uppercase tracking-wider text-amber-400">
              REGULATORY NOTICE — DEMONSTRATION THRESHOLDS
            </h3>
            <p className="leading-relaxed">
              The preset thresholds below are demonstration approximations provided for hardware prototyping and simulation.
              <strong> They are NOT officially certified mining safety standards.</strong> Prior to operational deployment in any subterranean or surface mine, all limits for flammable VOCs, carbon monoxide (CO), ambient thermal heat stress, and fall shock criteria must be calibrated, verified, and officially signed off by licensed mining safety engineers and local occupational health regulatory authorities (e.g. DGMS / MSHA / OSHA).
            </p>
          </div>
        </div>
      </div>

      {/* Thresholds Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Atmospheric Gas & Thermal Limits */}
        <div className="navy-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            Atmospheric & Environmental Safety Thresholds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Temperature */}
            <div className="space-y-3 rounded border border-slate-800 bg-slate-900/40 p-3.5">
              <h4 className="font-bold text-slate-300">Ambient Temperature (°C)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    value={thresholds.temperature_warning}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, temperature_warning: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-amber-400 mt-0.5 block">Triggers caution state</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Critical Threshold</label>
                  <input
                    type="number"
                    value={thresholds.temperature_critical}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, temperature_critical: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-red-400 mt-0.5 block">Triggers critical alarm</span>
                </div>
              </div>
            </div>

            {/* Humidity */}
            <div className="space-y-3 rounded border border-slate-800 bg-slate-900/40 p-3.5">
              <h4 className="font-bold text-slate-300">Relative Humidity (% RH)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    value={thresholds.humidity_warning}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, humidity_warning: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-amber-400 mt-0.5 block">High moisture caution</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Critical Threshold</label>
                  <input
                    type="number"
                    value={thresholds.humidity_critical}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, humidity_critical: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-red-400 mt-0.5 block">Severe condensation alert</span>
                </div>
              </div>
            </div>

            {/* MQ-3 Hydrocarbons */}
            <div className="space-y-3 rounded border border-slate-800 bg-slate-900/40 p-3.5">
              <h4 className="font-bold text-slate-300">MQ-3 Gas / VOC (Raw 12-Bit ADC)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Warning Raw Value</label>
                  <input
                    type="number"
                    value={thresholds.mq3_warning}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, mq3_warning: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-amber-400 mt-0.5 block">Vapor traces detected</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Critical Raw Value</label>
                  <input
                    type="number"
                    value={thresholds.mq3_critical}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, mq3_critical: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-red-400 mt-0.5 block">Combustible level alarm</span>
                </div>
              </div>
            </div>

            {/* MQ-7 Carbon Monoxide */}
            <div className="space-y-3 rounded border border-slate-800 bg-slate-900/40 p-3.5">
              <h4 className="font-bold text-slate-300">MQ-7 Carbon Monoxide (CO ppm)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Warning (ppm CO)</label>
                  <input
                    type="number"
                    value={thresholds.mq7_warning}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, mq7_warning: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-amber-400 mt-0.5 block">Exceeds TWA baseline</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Critical (ppm CO)</label>
                  <input
                    type="number"
                    value={thresholds.mq7_critical}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, mq7_critical: Number(e.target.value) })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-red-400 mt-0.5 block">Immediate evacuation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Motion, Inactivity & Fall Detection */}
        <div className="navy-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            MPU6050 Motion, Inactivity & Fall Logic
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="text-slate-300 block font-medium mb-1">
                Inactivity Alert Trigger (Seconds)
              </label>
              <input
                type="number"
                value={thresholds.inactivity_duration_seconds}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    inactivity_duration_seconds: Number(e.target.value),
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Duration of zero IMU deviation before triggering a worker inactivity check (e.g. 300s = 5m).
              </p>
            </div>

            <div>
              <label className="text-slate-300 block font-medium mb-1">
                Fall Impact Vector Threshold (G-Force)
              </label>
              <input
                type="number"
                value={thresholds.fall_impact_threshold}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    fall_impact_threshold: Number(e.target.value),
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Combined acceleration and angular shock vector magnitude (default: 25.0 G).
              </p>
            </div>

            <div>
              <label className="text-slate-300 block font-medium mb-1">
                Movement Noise Filter Sensitivity
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.movement_sensitivity}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    movement_sensitivity: Number(e.target.value),
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-white font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Threshold for distinguishing regular footsteps from tremors or stationary stance.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: System, Audio & Environment Toggles */}
        <div className="navy-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            Control Room System Preferences
          </h2>

          <div className="space-y-4 text-xs">
            {/* Audio alarm */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-bold text-white block">Audible Emergency Alarm (Web Audio)</span>
                <span className="text-slate-400">
                  Plays multi-pulse audio alarm whenever CRITICAL or HIGH incidents occur.
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAlertSound}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  alertSoundEnabled ? 'bg-cyan-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    alertSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-bold text-white block">Simulated Hardware Demo Mode</span>
                <span className="text-slate-400">
                  Injects synthetic telemetry for testing without physical ESP32 boards connected.
                </span>
              </div>
              <button
                type="button"
                onClick={toggleDemoMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  demoMode ? 'bg-amber-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    demoMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Supabase Connection Status */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="font-bold text-white block">Supabase Backend Integration</span>
                <span className="text-slate-400">
                  {isSupabaseConfigured()
                    ? 'Connected to PostgreSQL database and Realtime WebSocket cluster.'
                    : 'Not configured — operating in standalone simulated mode.'}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                  isSupabaseConfigured()
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isSupabaseConfigured() ? 'CONFIGURED' : 'LOCAL DEMO'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Demonstration Defaults
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-950 transition-colors"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Apply & Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Cpu,
  HardHat,
  Plus,
  Wifi,
  WifiOff,
  Battery,
  Radio,
  Search,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Trash2,
  X,
} from 'lucide-react';
import { getHelmets, createHelmet, deleteHelmet, updateHelmet } from '../services/helmetService';
import { getWorkers } from '../services/workerService';
import { DEMO_HELMETS, DEMO_WORKERS } from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import type { Helmet, Worker } from '../types';
import { toast } from 'sonner';

export default function DeviceManagement() {
  const { demoMode } = useAppContext();

  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    helmet_code: '',
    esp32_device_id: '',
  });

  const loadData = async () => {
    if (!isSupabaseConfigured() || demoMode) {
      setHelmets(DEMO_HELMETS);
      setWorkers(DEMO_WORKERS);
      return;
    }
    try {
      const [hList, wList] = await Promise.all([getHelmets(), getWorkers()]);
      setHelmets(hList.length > 0 ? hList : DEMO_HELMETS);
      setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
    } catch (err) {
      console.error('[MINEGUARD] Error loading devices:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoMode]);

  const filteredHelmets = helmets.filter(
    (h) =>
      h.helmet_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.esp32_device_id && h.esp32_device_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.helmet_code || !formData.esp32_device_id) {
      toast.error('Helmet Code and ESP32 Device ID are required.');
      return;
    }

    if (!isSupabaseConfigured() || demoMode) {
      const newH: Helmet = {
        id: `h-${Date.now()}`,
        helmet_code: formData.helmet_code,
        esp32_device_id: formData.esp32_device_id,
        worker_id: null,
        is_online: true,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setHelmets([newH, ...helmets]);
      toast.success('ESP32 Helmet registered in local inventory.');
    } else {
      await createHelmet({
        helmet_code: formData.helmet_code,
        esp32_device_id: formData.esp32_device_id,
        worker_id: null,
        is_online: false,
        last_seen: null,
      });
      toast.success('Helmet enrolled in Supabase registry.');
      loadData();
    }

    setShowAddModal(false);
    setFormData({ helmet_code: '', esp32_device_id: '' });
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured() || demoMode) {
      setHelmets(helmets.filter((h) => h.id !== id));
      toast.success('Helmet removed.');
    } else {
      await deleteHelmet(id);
      toast.success('Helmet deleted from database.');
      loadData();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-cyan-400" />
            ESP32 SMART HELMET DEVICE INVENTORY
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hardware provisioning, MAC identification, WiFi telemetry heartbeats, and worker pairing.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              helmet_code: `HLMT-${100 + helmets.length + 1}`,
              esp32_device_id: `ESP32-NODE-0${helmets.length + 1}`,
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950 transition-colors"
        >
          <Plus className="h-4 w-4" /> Provision New Helmet
        </button>
      </div>

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by helmet code or ESP32 device ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-[#161c2d] py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-green-400 font-semibold">
            <Wifi className="h-4 w-4" />
            {helmets.filter((h) => h.is_online).length} Active Nodes
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <WifiOff className="h-4 w-4" />
            {helmets.filter((h) => !h.is_online).length} Offline
          </span>
        </div>
      </div>

      {/* Hardware Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#161c2d]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/60 uppercase text-slate-400 tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Helmet ID</th>
              <th className="px-4 py-3">ESP32 Hardware ID</th>
              <th className="px-4 py-3">Paired Personnel</th>
              <th className="px-4 py-3">Telemetry State</th>
              <th className="px-4 py-3">Last Heartbeat</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredHelmets.map((h) => {
              const pairedWorker = workers.find((w) => w.assigned_helmet_id === h.id);
              return (
                <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded bg-cyan-500/10 text-cyan-400">
                        <HardHat className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-white font-mono text-sm">
                        {h.helmet_code}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-slate-400">
                    {h.esp32_device_id || 'ESP32-GENERIC'}
                  </td>

                  <td className="px-4 py-3.5">
                    {pairedWorker ? (
                      <div>
                        <div className="font-bold text-slate-200">{pairedWorker.full_name}</div>
                        <div className="text-[11px] text-slate-400">{pairedWorker.mining_zone}</div>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned (Pool Inventory)</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    {h.is_online ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[11px] font-bold text-green-400 border border-green-500/20">
                        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        Online & Streaming
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-slate-600" />
                        Offline / Dormant
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                    {h.last_seen ? new Date(h.last_seen).toLocaleString() : 'Never'}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="rounded p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="De-register Device"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredHelmets.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  No ESP32 helmets registered in inventory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Provision Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-[#1a1f2e] p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" /> Provision ESP32 Helmet
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Helmet Serial / Asset Tag</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HLMT-106"
                  value={formData.helmet_code}
                  onChange={(e) => setFormData({ ...formData, helmet_code: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">ESP32 Device Identifier / MAC</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-NODE-06"
                  value={formData.esp32_device_id}
                  onChange={(e) => setFormData({ ...formData, esp32_device_id: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white font-mono"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-cyan-600 hover:bg-cyan-500 px-4 py-2 font-bold text-white transition-colors"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

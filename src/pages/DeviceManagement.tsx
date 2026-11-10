import { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Battery,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHelmets, createHelmet, deleteHelmet } from '../services/helmetService';
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
      toast.error('Device ID and Hardware MAC are required.');
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
      toast.success('Device registered.');
    } else {
      await createHelmet({
        helmet_code: formData.helmet_code,
        esp32_device_id: formData.esp32_device_id,
        worker_id: null,
        is_online: false,
        last_seen: null,
      });
      toast.success('Device registered in database.');
      loadData();
    }

    setShowAddModal(false);
    setFormData({ helmet_code: '', esp32_device_id: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header matching Reference Image 3 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Devices</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage and monitor smart helmets</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              helmet_code: `Helmet-${helmets.length + 1}`,
              esp32_device_id: `ESP32-NODE-0${helmets.length + 1}`,
            });
            setShowAddModal(true);
          }}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
        >
          Add Device
        </button>
      </div>

      {/* Main Table Container matching Reference Image 3 */}
      <div className="navy-card p-5 space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-[#0b1325] border border-slate-800/80 py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-2">DEVICE</th>
                <th className="py-3 px-2">STATUS</th>
                <th className="py-3 px-2">BATTERY</th>
                <th className="py-3 px-2">LAST SEEN</th>
                <th className="py-3 px-2 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredHelmets.map((h) => {
                const pairedWorker = workers.find((w) => w.assigned_helmet_id === h.id);
                return (
                  <tr key={h.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">{h.helmet_code}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {h.esp32_device_id || 'ESP32-DEFAULT'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-2">
                      {h.is_online ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/60 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                          OFFLINE
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-2">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Battery className="h-4 w-4 text-emerald-400" />
                        <span>100%</span>
                      </div>
                    </td>

                    <td className="py-4 px-2 text-slate-400">
                      {h.last_seen ? new Date(h.last_seen).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="py-4 px-2 text-right">
                      {pairedWorker ? (
                        <Link
                          to={`/workers/${pairedWorker.id}`}
                          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View Details
                        </Link>
                      ) : (
                        <Link
                          to="/monitoring"
                          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredHelmets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                    No devices registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl navy-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-400" /> Add New Smart Device
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Device Name / Serial</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Helmet-06"
                  value={formData.helmet_code}
                  onChange={(e) => setFormData({ ...formData, helmet_code: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-[#0b1325] border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">ESP32 Device Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-DEFAULT"
                  value={formData.esp32_device_id}
                  onChange={(e) => setFormData({ ...formData, esp32_device_id: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-[#0b1325] border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 font-semibold text-white transition-colors"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

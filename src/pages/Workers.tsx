import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  HardHat,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
} from '../services/workerService';
import { getHelmets } from '../services/helmetService';
import { DEMO_WORKERS, DEMO_HELMETS } from '../services/demoDataService';
import { isSupabaseConfigured } from '../services/supabase';
import { useAppContext } from '../context/AppContext';
import { useWorkerLocations } from '../hooks/useWorkerLocations';
import type { Worker, Helmet, WorkerStatus } from '../types';
import { toast } from 'sonner';

export default function Workers() {
  const { demoMode } = useAppContext();
  const { locations } = useWorkerLocations();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [helmets, setHelmets] = useState<Helmet[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const [formData, setFormData] = useState({
    worker_code: '',
    full_name: '',
    mining_zone: '',
    status: 'safe' as WorkerStatus,
    assigned_helmet_id: '',
  });

  const loadData = async () => {
    if (!isSupabaseConfigured() || demoMode) {
      setWorkers(DEMO_WORKERS);
      setHelmets(DEMO_HELMETS);
      return;
    }
    try {
      const [wList, hList] = await Promise.all([getWorkers(), getHelmets()]);
      setWorkers(wList);
      setHelmets(hList);
    } catch (err) {
      console.error('[MINEGUARD] Error fetching workers:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoMode]);

  const filteredWorkers = workers.filter(
    (w) =>
      w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.worker_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.mining_zone && w.mining_zone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.worker_code) {
      toast.error('Worker Code and Full Name are required.');
      return;
    }

    if (!isSupabaseConfigured() || demoMode) {
      const newW: Worker = {
        id: `w-${Date.now()}`,
        worker_code: formData.worker_code,
        full_name: formData.full_name,
        mining_zone: formData.mining_zone || 'Surface',
        status: formData.status,
        assigned_helmet_id: formData.assigned_helmet_id || null,
        created_at: new Date().toISOString(),
      };
      setWorkers([newW, ...workers]);
      toast.success('Worker enrolled.');
    } else {
      await createWorker({
        worker_code: formData.worker_code,
        full_name: formData.full_name,
        mining_zone: formData.mining_zone || null,
        status: formData.status,
        assigned_helmet_id: formData.assigned_helmet_id || null,
      });
      toast.success('Worker saved to database.');
      loadData();
    }

    setShowAddModal(false);
    setFormData({ worker_code: '', full_name: '', mining_zone: '', status: 'safe', assigned_helmet_id: '' });
  };

  const confirmDelete = async () => {
    if (!workerToDelete) return;
    if (!isSupabaseConfigured() || demoMode) {
      setWorkers(workers.filter((w) => w.id !== workerToDelete.id));
      toast.success('Worker removed.');
    } else {
      await deleteWorker(workerToDelete.id);
      toast.success('Worker deleted.');
      loadData();
    }
    setWorkerToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Workers</h1>
          <p className="text-xs text-slate-400 mt-0.5">Personnel profiles & smart helmet assignments</p>
        </div>

        <button
          onClick={() => {
            setFormData({
              worker_code: `MG-W0${workers.length + 1}`,
              full_name: '',
              mining_zone: 'Shaft 1',
              status: 'safe',
              assigned_helmet_id: '',
            });
            setShowAddModal(true);
          }}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Worker
        </button>
      </div>

      {/* Main Container */}
      <div className="navy-card p-5 space-y-4">
        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search workers by name or ID..."
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
                <th className="py-3 px-2">WORKER</th>
                <th className="py-3 px-2">MINING ZONE</th>
                <th className="py-3 px-2">STATUS</th>
                <th className="py-3 px-2">PAIRED DEVICE</th>
                <th className="py-3 px-2">LOCATION</th>
                <th className="py-3 px-2 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredWorkers.map((worker) => {
                const pairedHelmet = helmets.find((h) => h.id === worker.assigned_helmet_id);
                const workerLoc = locations.get(worker.id);

                return (
                  <tr key={worker.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#152445] font-bold text-blue-400 border border-blue-500/30 text-xs">
                          {worker.full_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/workers/${worker.id}`}
                            className="font-semibold text-white hover:text-blue-400 transition-colors"
                          >
                            {worker.full_name}
                          </Link>
                          <div className="text-[11px] font-mono text-slate-400">
                            {worker.worker_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-2">
                      <span className="rounded-md bg-[#0b1325] px-2.5 py-1 text-[11px] text-slate-300 border border-slate-800">
                        {worker.mining_zone || 'Surface'}
                      </span>
                    </td>

                    <td className="py-4 px-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${
                          worker.status === 'safe'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : worker.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-400'
                            : worker.status === 'critical'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            worker.status === 'safe'
                              ? 'bg-emerald-400'
                              : worker.status === 'warning'
                              ? 'bg-amber-400'
                              : worker.status === 'critical'
                              ? 'bg-rose-400 animate-ping'
                              : 'bg-slate-500'
                          }`}
                        />
                        {worker.status}
                      </span>
                    </td>

                    <td className="py-4 px-2 font-mono text-slate-300">
                      {pairedHelmet?.helmet_code || 'Unassigned'}
                    </td>

                    <td className="py-4 px-2 text-slate-400">
                      {workerLoc?.gps_valid ? (
                        <div className="flex items-center gap-1 text-slate-300 font-mono">
                          <MapPin className="h-3 w-3 text-blue-400" />
                          {workerLoc.latitude.toFixed(3)}, {workerLoc.longitude.toFixed(3)}
                        </div>
                      ) : (
                        <span className="text-slate-500">Underground</span>
                      )}
                    </td>

                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/workers/${worker.id}`}
                          className="font-medium text-blue-400 hover:text-blue-300"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => setWorkerToDelete(worker)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl navy-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-400" /> Register Worker
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Worker Badge Code</label>
                <input
                  type="text"
                  required
                  value={formData.worker_code}
                  onChange={(e) => setFormData({ ...formData, worker_code: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-[#0b1325] border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-[#0b1325] border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Mining Zone</label>
                <input
                  type="text"
                  value={formData.mining_zone}
                  onChange={(e) => setFormData({ ...formData, mining_zone: e.target.value })}
                  className="mt-1 w-full rounded-lg bg-[#0b1325] border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Assign Smart Helmet</label>
                <select
                  value={formData.assigned_helmet_id}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_helmet_id: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0b1325] border border-slate-800 p-2.5 text-white"
                >
                  <option value="">No Helmet Assigned</option>
                  {helmets.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.helmet_code}
                    </option>
                  ))}
                </select>
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
                  Save Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!workerToDelete}
        onClose={() => setWorkerToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove Worker"
        description={`Remove ${workerToDelete?.full_name} from active roster?`}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
}

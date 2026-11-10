import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  HardHat,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/common/StatusBadge';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Form states
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
      setWorkers(wList.length > 0 ? wList : DEMO_WORKERS);
      setHelmets(hList.length > 0 ? hList : DEMO_HELMETS);
    } catch (err) {
      console.error('[MINEGUARD] Error fetching workers:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [demoMode]);

  // Filtered workers
  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.worker_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.mining_zone && w.mining_zone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Add Worker
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.worker_code) {
      toast.error('Worker Code and Full Name are mandatory.');
      return;
    }

    if (!isSupabaseConfigured() || demoMode) {
      const newW: Worker = {
        id: `w-${Date.now()}`,
        worker_code: formData.worker_code,
        full_name: formData.full_name,
        mining_zone: formData.mining_zone || 'Sector Surface',
        status: formData.status,
        assigned_helmet_id: formData.assigned_helmet_id || null,
        created_at: new Date().toISOString(),
      };
      setWorkers([newW, ...workers]);
      toast.success('Worker added to local roster.');
    } else {
      await createWorker({
        worker_code: formData.worker_code,
        full_name: formData.full_name,
        mining_zone: formData.mining_zone || null,
        status: formData.status,
        assigned_helmet_id: formData.assigned_helmet_id || null,
      });
      toast.success('Worker registered in database.');
      loadData();
    }

    setShowAddModal(false);
    setFormData({ worker_code: '', full_name: '', mining_zone: '', status: 'safe', assigned_helmet_id: '' });
  };

  // Handle Edit Worker
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerToEdit) return;

    if (!isSupabaseConfigured() || demoMode) {
      setWorkers(
        workers.map((w) =>
          w.id === workerToEdit.id
            ? {
                ...w,
                worker_code: formData.worker_code,
                full_name: formData.full_name,
                mining_zone: formData.mining_zone,
                status: formData.status,
                assigned_helmet_id: formData.assigned_helmet_id || null,
              }
            : w
        )
      );
      toast.success('Worker updated.');
    } else {
      await updateWorker(workerToEdit.id, {
        worker_code: formData.worker_code,
        full_name: formData.full_name,
        mining_zone: formData.mining_zone,
        status: formData.status,
        assigned_helmet_id: formData.assigned_helmet_id || null,
      });
      toast.success('Worker updated in database.');
      loadData();
    }

    setShowEditModal(false);
    setWorkerToEdit(null);
  };

  // Handle Delete Worker
  const confirmDelete = async () => {
    if (!workerToDelete) return;
    if (!isSupabaseConfigured() || demoMode) {
      setWorkers(workers.filter((w) => w.id !== workerToDelete.id));
      toast.success('Worker removed.');
    } else {
      await deleteWorker(workerToDelete.id);
      toast.success('Worker deleted from database.');
      loadData();
    }
    setWorkerToDelete(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-400" />
            WORKER ROSTER & HELMET ASSIGNMENT
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personnel profiles, safety status tracking, active zones, and IoT helmet pairing.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              worker_code: `MG-W0${workers.length + 1}`,
              full_name: '',
              mining_zone: 'Shaft 1 - Extraction',
              status: 'safe',
              assigned_helmet_id: '',
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Register New Worker
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by worker name, ID, or mining sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-800 bg-[#161c2d] py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-800 bg-[#161c2d] px-3 py-2 text-xs font-medium text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Safety States</option>
            <option value="safe">Safe</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="inactive">Inactive</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Workers Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#161c2d]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/60 uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Worker ID & Name</th>
              <th className="px-4 py-3">Mining Sector / Zone</th>
              <th className="px-4 py-3">Safety Status</th>
              <th className="px-4 py-3">Paired Helmet</th>
              <th className="px-4 py-3">GPS Location</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredWorkers.map((worker) => {
              const pairedHelmet = helmets.find((h) => h.id === worker.assigned_helmet_id);
              const workerLoc = locations.get(worker.id);

              return (
                <tr key={worker.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-950 font-bold text-cyan-400 border border-cyan-800">
                        {worker.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          to={`/workers/${worker.id}`}
                          className="font-bold text-white hover:text-cyan-400 transition-colors"
                        >
                          {worker.full_name}
                        </Link>
                        <div className="text-[11px] font-mono text-slate-400">
                          {worker.worker_code}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="rounded bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300">
                      {worker.mining_zone || 'Unassigned Zone'}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <StatusBadge status={worker.status} />
                  </td>

                  <td className="px-4 py-3.5">
                    {pairedHelmet ? (
                      <div className="flex items-center gap-2">
                        <HardHat className="h-4 w-4 text-cyan-400" />
                        <div>
                          <span className="font-mono font-bold text-slate-200">
                            {pairedHelmet.helmet_code}
                          </span>
                          <span
                            className={`ml-2 inline-block h-2 w-2 rounded-full ${
                              pairedHelmet.is_online ? 'bg-green-400' : 'bg-slate-600'
                            }`}
                            title={pairedHelmet.is_online ? 'Online' : 'Offline'}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No helmet paired</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    {workerLoc?.gps_valid ? (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="font-mono text-[11px]">
                          {workerLoc.latitude.toFixed(4)}, {workerLoc.longitude.toFixed(4)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">No GPS Fix</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/workers/${worker.id}`}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                        title="View Detailed Telemetry"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => {
                          setWorkerToEdit(worker);
                          setFormData({
                            worker_code: worker.worker_code,
                            full_name: worker.full_name,
                            mining_zone: worker.mining_zone || '',
                            status: worker.status,
                            assigned_helmet_id: worker.assigned_helmet_id || '',
                          });
                          setShowEditModal(true);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-colors"
                        title="Edit Worker Profile"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => setWorkerToDelete(worker)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
                        title="Remove Worker"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredWorkers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                  No workers matching the search and filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-[#1a1f2e] p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-400" /> Register Mine Worker
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Worker Code / Badge #</label>
                <input
                  type="text"
                  required
                  value={formData.worker_code}
                  onChange={(e) => setFormData({ ...formData, worker_code: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Assigned Mining Sector</label>
                <input
                  type="text"
                  placeholder="e.g. Shaft 3 - Drifting"
                  value={formData.mining_zone}
                  onChange={(e) => setFormData({ ...formData, mining_zone: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Assign Safety Helmet</label>
                <select
                  value={formData.assigned_helmet_id}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_helmet_id: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  <option value="">No Helmet Assigned</option>
                  {helmets.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.helmet_code} ({h.esp32_device_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium">Initial Safety Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as WorkerStatus })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  <option value="safe">Safe</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                  <option value="inactive">Inactive</option>
                  <option value="offline">Offline</option>
                </select>
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
                  Save Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-[#1a1f2e] p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-amber-400" /> Edit Worker Profile
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium">Worker Code</label>
                <input
                  type="text"
                  required
                  value={formData.worker_code}
                  onChange={(e) => setFormData({ ...formData, worker_code: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Assigned Mining Sector</label>
                <input
                  type="text"
                  value={formData.mining_zone}
                  onChange={(e) => setFormData({ ...formData, mining_zone: e.target.value })}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Assigned Helmet</label>
                <select
                  value={formData.assigned_helmet_id}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_helmet_id: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  <option value="">No Helmet Assigned</option>
                  {helmets.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.helmet_code} ({h.esp32_device_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium">Safety Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as WorkerStatus })
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  <option value="safe">Safe</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                  <option value="inactive">Inactive</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-amber-600 hover:bg-amber-500 px-4 py-2 font-bold text-white transition-colors"
                >
                  Update Profile
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
        description={`Are you sure you want to remove ${workerToDelete?.full_name} (${workerToDelete?.worker_code}) from the roster? This will unpair any active smart helmet.`}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
}

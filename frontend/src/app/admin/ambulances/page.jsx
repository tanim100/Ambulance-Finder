'use client';
// src/app/admin/ambulances/page.jsx — Theme-Aware

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Edit2, Trash2, Search, ChevronLeft } from 'lucide-react';
import { ambulanceAPI } from '@/lib/api';

const MOCK_AMBULANCES = [
  { _id: 'a1', vehicleNumber: 'AMB-001', type: 'Basic', status: 'Available', driver: 'Rahim Ahmed', hospital: 'DMCH', lastMaintenance: '2024-05-01' },
  { _id: 'a2', vehicleNumber: 'AMB-002', type: 'Advanced', status: 'Busy', driver: 'Karim Hossain', hospital: 'Square Hospital', lastMaintenance: '2024-04-15' },
  { _id: 'a3', vehicleNumber: 'AMB-003', type: 'ICU', status: 'Available', driver: 'Jamal Uddin', hospital: 'Apollo Hospital', lastMaintenance: '2024-05-10' },
  { _id: 'a4', vehicleNumber: 'AMB-004', type: 'Basic', status: 'Offline', driver: 'Sajid Mia', hospital: 'BIRDEM', lastMaintenance: '2024-03-20' },
  { _id: 'a5', vehicleNumber: 'AMB-005', type: 'Advanced', status: 'Available', driver: 'Hasan Ali', hospital: 'United Hospital', lastMaintenance: '2024-05-22' },
];

const TYPE_OPTS = [{ value: 'Basic', label: 'Basic' }, { value: 'Advanced', label: 'Advanced' }, { value: 'ICU', label: 'ICU' }];
const STATUS_OPTS = [{ value: 'Available', label: 'Available' }, { value: 'Busy', label: 'Busy' }, { value: 'Offline', label: 'Offline' }];
const EMPTY_FORM = { vehicleNumber: '', type: '', status: 'Available', driver: '', hospital: '' };

const chipColor = {
  Available: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Busy: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  Offline: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

export default function AdminAmbulancesPage() {
  const [ambulances, setAmbulances] = useState(MOCK_AMBULANCES);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = ambulances.filter((a) =>
    !search ||
    a.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
    a.driver.toLowerCase().includes(search.toLowerCase()) ||
    a.hospital.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (a) => { setEditTarget(a); setForm({ vehicleNumber: a.vehicleNumber, type: a.type, status: a.status, driver: a.driver, hospital: a.hospital }); setModalOpen(true); };
  const handleFormChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await ambulanceAPI.update(editTarget._id, form);
        setAmbulances((prev) => prev.map((a) => a._id === editTarget._id ? { ...a, ...form } : a));
      } else {
        const res = await ambulanceAPI.create(form);
        const newAmb = res.data?.ambulance || { _id: Date.now().toString(), ...form };
        setAmbulances((prev) => [...prev, newAmb]);
      }
    } catch {
      if (editTarget) setAmbulances((prev) => prev.map((a) => a._id === editTarget._id ? { ...a, ...form } : a));
      else setAmbulances((prev) => [...prev, { _id: Date.now().toString(), lastMaintenance: new Date().toISOString().split('T')[0], ...form }]);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ambulance?')) return;
    try { await ambulanceAPI.delete(id); } catch { }
    setAmbulances((prev) => prev.filter((a) => a._id !== id));
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div
          className="px-6 py-4 sticky top-0 z-20 backdrop-blur-xl"
          style={{
            background: 'var(--nav-bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--on-surface-muted)' }}
              >
                <ChevronLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>Ambulances</h1>
                <p className="text-sm" style={{ color: 'var(--on-surface-muted)' }}>{ambulances.length} registered</p>
              </div>
            </div>
            <Button onClick={openAdd} leftIcon={<Plus size={16} />}>Add Ambulance</Button>
          </div>
        </div>

        <div className="p-6">
          {/* Summary chips */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {[
              { label: 'Available', count: ambulances.filter((a) => a.status === 'Available').length },
              { label: 'Busy', count: ambulances.filter((a) => a.status === 'Busy').length },
              { label: 'Offline', count: ambulances.filter((a) => a.status === 'Offline').length },
            ].map(({ label, count }) => (
              <div key={label} className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${chipColor[label]} border-transparent`}>
                {label}: {count}
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--on-surface-subtle)' }} />
            <input
              type="text"
              placeholder="Search by vehicle, driver, hospital..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                color: 'var(--on-surface)',
              }}
            />
          </div>

          {/* Table */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'var(--surface-2)' }}>
                  <tr>
                    {['Vehicle #', 'Type', 'Status', 'Driver', 'Hospital', 'Last Maintenance', 'Actions'].map((h) => (
                      <th key={h}
                        className="text-left text-xs font-semibold px-5 py-3 uppercase tracking-wide whitespace-nowrap"
                        style={{ color: 'var(--on-surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((amb, i) => (
                    <tr
                      key={amb._id}
                      className="transition-colors hover:bg-[var(--surface-3)]"
                      style={i !== 0 ? { borderTop: '1px solid var(--border)' } : undefined}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{amb.type === 'ICU' ? '🏥' : amb.type === 'Advanced' ? '🚨' : '🚑'}</span>
                          <span className="font-semibold text-sm" style={{ color: 'var(--on-surface)' }}>{amb.vehicleNumber}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Badge status={amb.type.toLowerCase()} label={amb.type} size="xs" /></td>
                      <td className="px-5 py-4"><Badge status={amb.status.toLowerCase()} label={amb.status} size="xs" /></td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--on-surface-muted)' }}>{amb.driver || '—'}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: 'var(--on-surface-muted)' }}>{amb.hospital}</td>
                      <td className="px-5 py-4 text-xs" style={{ color: 'var(--on-surface-subtle)' }}>{amb.lastMaintenance}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(amb)}
                            className="p-1.5 rounded-lg transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(amb._id)}
                            className="p-1.5 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Ambulance' : 'Add New Ambulance'}>
        <div className="space-y-4">
          <Input id="vehicleNumber" name="vehicleNumber" label="Vehicle Number" placeholder="AMB-006" value={form.vehicleNumber} onChange={handleFormChange} required />
          <Select id="type" name="type" label="Ambulance Type" options={TYPE_OPTS} value={form.type} onChange={handleFormChange} required />
          <Select id="status" name="status" label="Status" options={STATUS_OPTS} value={form.status} onChange={handleFormChange} />
          <Input id="driver" name="driver" label="Assigned Driver" placeholder="Driver name" value={form.driver} onChange={handleFormChange} />
          <Input id="hospital" name="hospital" label="Base Hospital" placeholder="Hospital name" value={form.hospital} onChange={handleFormChange} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editTarget ? 'Update' : 'Add Ambulance'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

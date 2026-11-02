'use client';
// src/app/admin/drivers/page.jsx

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Edit2, Trash2, Search, ChevronLeft, Star } from 'lucide-react';
import { driverAPI } from '@/lib/api';

const MOCK_DRIVERS = [
  { _id: 'd1', name: 'Rahim Ahmed',   email: 'rahim@amb.com',  license: 'DL-12345', ambulance: 'AMB-001', isOnline: true,  rating: 4.8, totalTrips: 234 },
  { _id: 'd2', name: 'Karim Hossain', email: 'karim@amb.com',  license: 'DL-23456', ambulance: 'AMB-002', isOnline: true,  rating: 4.6, totalTrips: 187 },
  { _id: 'd3', name: 'Jamal Uddin',   email: 'jamal@amb.com',  license: 'DL-34567', ambulance: 'AMB-003', isOnline: false, rating: 4.9, totalTrips: 412 },
  { _id: 'd4', name: 'Sajid Mia',     email: 'sajid@amb.com',  license: 'DL-45678', ambulance: 'AMB-004', isOnline: false, rating: 4.7, totalTrips: 156 },
  { _id: 'd5', name: 'Hasan Ali',     email: 'hasan@amb.com',  license: 'DL-56789', ambulance: 'AMB-005', isOnline: true,  rating: 4.5, totalTrips: 98 },
];

const EMPTY_FORM = { name: '', email: '', phone: '', license: '', ambulance: '' };

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState(MOCK_DRIVERS);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filtered = drivers.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      d.license.toLowerCase().includes(search.toLowerCase()) ||
      d.ambulance.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (d) => {
    setEditTarget(d);
    setForm({ name: d.name, email: d.email, phone: d.phone || '', license: d.license, ambulance: d.ambulance });
    setModalOpen(true);
  };

  const handleFormChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await driverAPI.update(editTarget._id, form);
        setDrivers((prev) => prev.map((d) => d._id === editTarget._id ? { ...d, ...form } : d));
      } else {
        const res = await driverAPI.create(form);
        const newDriver = res.data?.driver || { _id: Date.now().toString(), isOnline: false, rating: 0, totalTrips: 0, ...form };
        setDrivers((prev) => [...prev, newDriver]);
      }
    } catch {
      if (editTarget) {
        setDrivers((prev) => prev.map((d) => d._id === editTarget._id ? { ...d, ...form } : d));
      } else {
        setDrivers((prev) => [...prev, { _id: Date.now().toString(), isOnline: false, rating: 0, totalTrips: 0, ...form }]);
      }
    }
    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this driver?')) return;
    try { await driverAPI.delete(id); } catch {}
    setDrivers((prev) => prev.filter((d) => d._id !== id));
  };

  const onlineCount = drivers.filter((d) => d.isOnline).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} /></Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
                <p className="text-sm text-gray-500">{drivers.length} registered · {onlineCount} online</p>
              </div>
            </div>
            <Button onClick={openAdd} leftIcon={<Plus size={16} />}>Add Driver</Button>
          </div>
        </div>

        <div className="p-6">
          {/* Summary chips */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="px-4 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-700">Online: {onlineCount}</div>
            <div className="px-4 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">Offline: {drivers.length - onlineCount}</div>
            <div className="px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
              Total Trips: {drivers.reduce((s, d) => s + d.totalTrips, 0).toLocaleString()}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Driver', 'Email', 'License', 'Ambulance', 'Status', 'Rating', 'Trips', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((driver) => (
                    <tr key={driver._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                            {driver.name?.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900 text-sm">{driver.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{driver.email}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{driver.license}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{driver.ambulance || '—'}</td>
                      <td className="px-5 py-4">
                        <Badge status={driver.isOnline ? 'online' : 'offline'} label={driver.isOnline ? 'Online' : 'Offline'} size="xs" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-sm text-yellow-600 font-semibold">
                          <Star size={12} fill="currentColor" />
                          {driver.rating}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 font-medium">{driver.totalTrips}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(driver)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(driver._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Driver' : 'Add New Driver'}>
        <div className="space-y-4">
          <Input id="dname" name="name"     label="Full Name"       placeholder="Driver's full name" value={form.name}      onChange={handleFormChange} required />
          <Input id="demail" name="email"   label="Email"           placeholder="driver@example.com" value={form.email}     onChange={handleFormChange} required />
          <Input id="dphone" name="phone"   label="Phone"           placeholder="+880 1700-000000"   value={form.phone}     onChange={handleFormChange} />
          <Input id="dlicense" name="license" label="License Number" placeholder="DL-XXXXX"          value={form.license}   onChange={handleFormChange} required />
          <Input id="damb" name="ambulance" label="Assigned Ambulance" placeholder="AMB-XXX"         value={form.ambulance} onChange={handleFormChange} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editTarget ? 'Update' : 'Add Driver'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { opsApi } from '../../api/client';
import toast from 'react-hot-toast';

const BLANK = { name: '', contact: '', phone: '', email: '', terms: 'Net 30', gst: '', status: 'active' };

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const normalize = (v) => ({
    ...v,
    contact: v.contact || '',
    gst: v.gstin || '',
    terms: v.payment_terms || v.terms || 'Net 30',
    orders: v.orders || 0,
    outstanding: v.outstanding || 0,
    status: v.is_active === false ? 'inactive' : 'active',
  });

  const load = async () => {
    try {
      const res = await opsApi.listVendors();
      const raw = res.data?.items ?? res.data?.results ?? res.data ?? [];
      setVendors(raw.map(normalize));
    } catch {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = vendors.filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal(true); };
  const openEdit = (v) => { setForm({ ...v }); setEditId(v.id); setModal(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Vendor name required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || '',
        email: form.email || '',
        payment_terms: form.terms || 'Net 30',
        is_active: form.status !== 'inactive',
      };
      if (editId) {
        const res = await opsApi.updateVendor(editId, payload);
        setVendors(p => p.map(x => x.id === editId ? normalize(res.data) : x));
        toast.success('Vendor updated');
      } else {
        const res = await opsApi.createVendor(payload);
        setVendors(p => [normalize(res.data), ...p]);
        toast.success('Vendor added');
      }
      setModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await opsApi.deleteVendor(deleteId);
      setVendors(p => p.filter(x => x.id !== deleteId));
      setDeleteId(null);
      toast.success('Vendor removed');
    } catch {
      toast.error('Failed to remove vendor');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Vendor Management</h2>
          <p className="text-sm text-bodydark">{vendors.filter(v => v.status === 'active').length} active vendors</p>
        </div>
        <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Add Vendor</button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…" className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary w-72" />
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><span className="spinner" /></div> : <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Vendor','Contact Person','Phone / Email','GST No.','Credit Terms','Total Orders','Outstanding','Status','Actions'].map(h => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-1">
                <td className="px-5 py-3.5 text-sm font-semibold text-black">{v.name}</td>
                <td className="px-5 py-3.5 text-sm text-black">{v.contact}</td>
                <td className="px-5 py-3.5">
                  <div className="text-sm text-black">{v.phone}</div>
                  <div className="text-xs text-bodydark">{v.email}</div>
                </td>
                <td className="px-5 py-3.5 font-mono text-sm text-bodydark">{v.gst || '—'}</td>
                <td className="px-5 py-3.5 text-sm text-black">{v.terms}</td>
                <td className="px-5 py-3.5 text-sm font-semibold text-black">{v.orders}</td>
                <td className={`px-5 py-3.5 text-sm font-semibold ${(v.outstanding ?? 0) > 0 ? 'text-meta-1' : 'text-meta-3'}`}>
                  {(v.outstanding ?? 0) > 0 ? `₹${(v.outstanding).toLocaleString()}` : '₹0'}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${v.status === 'active' ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-9 text-bodydark'}`}>
                    {v.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(v)} className="text-xs text-primary hover:underline">Edit</button>
                    <button onClick={() => setDeleteId(v.id)} className="text-xs text-meta-1 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">{editId ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <F label="Company Name *" value={form.name} onChange={set('name')} placeholder="ElectroSpares Distributors" />
              <div className="grid grid-cols-2 gap-4">
                <F label="Contact Person *" value={form.contact} onChange={set('contact')} placeholder="Ramesh Singh" />
                <F label="Phone" value={form.phone} onChange={set('phone')} placeholder="+91 9988776655" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Email" type="email" value={form.email} onChange={set('email')} placeholder="vendor@email.com" />
                <F label="GST Number" value={form.gst} onChange={set('gst')} placeholder="07AABCE1234F1Z5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Credit Terms</label>
                  <select value={form.terms} onChange={set('terms')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {['Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Status</label>
                  <select value={form.status} onChange={set('status')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : editId ? 'Update' : 'Add Vendor'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-meta-1/10 flex items-center justify-center mx-auto text-2xl text-meta-1">⚠</div>
              <h3 className="font-semibold text-black">Remove Vendor?</h3>
              <p className="text-sm text-bodydark">This vendor will be removed from the system.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setDeleteId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleDelete} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
    </div>
  );
}

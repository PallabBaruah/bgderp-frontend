import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { gstConfigApi } from '../../api/client';

const BLANK = { name: '', rate: 18, description: '', is_active: true };

export default function GSTConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await gstConfigApi.list();
      setConfigs(r.data ?? []);
    } catch {
      toast.error('Failed to load GST configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal(true); };
  const openEdit = (g) => {
    setForm({ name: g.name, rate: g.rate, description: g.description || '', is_active: g.is_active });
    setEditId(g.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.rate || parseFloat(form.rate) < 0) { toast.error('Valid rate required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), rate: parseFloat(form.rate), description: form.description || null, is_active: form.is_active };
      if (editId) {
        const r = await gstConfigApi.update(editId, payload);
        setConfigs(p => p.map(x => x.id === editId ? r.data : x));
        toast.success('GST config updated');
      } else {
        const r = await gstConfigApi.create(payload);
        setConfigs(p => [...p, r.data]);
        toast.success('GST config created');
      }
      setModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this GST config?')) return;
    try {
      await gstConfigApi.delete(id);
      setConfigs(p => p.filter(x => x.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">GST Tax Rates</h2>
          <p className="text-sm text-bodydark">Manage tax rate presets for products and invoices.</p>
        </div>
        <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          + Add Rate
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : configs.length === 0 ? (
          <div className="py-16 text-center text-sm text-bodydark">No GST configs yet. Add standard rates like 0%, 5%, 12%, 18%, 28%.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-1 border-b border-stroke">
              <tr>
                {['Name', 'Rate', 'CGST / SGST (each)', 'IGST', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {configs.map(g => (
                <tr key={g.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3 text-sm font-semibold text-black">{g.name}</td>
                  <td className="px-5 py-3 text-sm font-mono text-black">{g.rate}%</td>
                  <td className="px-5 py-3 text-sm text-bodydark">{(g.rate / 2).toFixed(2)}%</td>
                  <td className="px-5 py-3 text-sm text-bodydark">{g.rate}%</td>
                  <td className="px-5 py-3 text-sm text-bodydark">{g.description || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${g.is_active ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-9 text-bodydark'}`}>
                      {g.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openEdit(g)} className="text-xs text-primary hover:underline">Edit</button>
                      <button onClick={() => handleDelete(g.id)} className="text-xs text-danger hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-sm border border-stroke bg-white p-5 text-xs text-bodydark space-y-1">
        <p className="font-semibold text-black text-sm">How GST is calculated</p>
        <p><strong>Intra-state</strong> (buyer &amp; seller in same state): CGST = SGST = Rate ÷ 2</p>
        <p><strong>Inter-state</strong> (buyer &amp; seller in different states): IGST = Rate</p>
        <p>Transaction type is determined automatically from company registered state vs customer billing state.</p>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">{editId ? 'Edit GST Config' : 'Add GST Rate'}</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Name *</label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Standard Rate" className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Total GST Rate (%) *</label>
                <input type="number" min="0" max="100" step="0.1" value={form.rate} onChange={set('rate')} placeholder="18" className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                {form.rate > 0 && (
                  <p className="text-xs text-bodydark mt-1">
                    Intra-state: CGST {(parseFloat(form.rate)/2).toFixed(2)}% + SGST {(parseFloat(form.rate)/2).toFixed(2)}% &nbsp;|&nbsp; Inter-state: IGST {parseFloat(form.rate).toFixed(2)}%
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Description</label>
                <input value={form.description} onChange={set('description')} placeholder="Optional note" className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <label htmlFor="is_active" className="text-sm text-black">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

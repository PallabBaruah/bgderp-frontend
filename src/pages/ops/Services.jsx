import { useState, useEffect } from 'react';
import { opsApi } from '../../api/client';
import toast from 'react-hot-toast';

const SERVICE_CATEGORIES = ['All', 'Installation', 'Maintenance', 'Repair', 'AMC', 'Consultation', 'Support', 'Other'];
const SERVICE_UNITS = ['hrs', 'days', 'visit', 'month', 'job', 'nos', 'fixed'];
const GST_RATES = [0, 5, 12, 18, 28];

const BLANK = {
  sku: '', name: '', description: '', category: 'Maintenance',
  unit: 'hrs', selling_price: '', tax_rate: '18', hsn_code: '',
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await opsApi.listProducts({ is_service: true, include_inactive: true, limit: 500 });
      const raw = res.data?.items ?? res.data?.results ?? res.data ?? [];
      setServices(raw);
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = services.filter(s => {
    if (!showInactive && !s.is_active) return false;
    const matchCat = catFilter === 'All' || s.category === catFilter;
    const matchSearch = !search
      || s.name?.toLowerCase().includes(search.toLowerCase())
      || s.sku?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal(true); };
  const openEdit = (s) => {
    setForm({
      sku: s.sku || '',
      name: s.name || '',
      description: s.description || '',
      category: s.category || 'Other',
      unit: s.unit || 'hrs',
      selling_price: String(s.selling_price ?? ''),
      tax_rate: String(s.tax_rate ?? '18'),
      hsn_code: s.hsn_code || '',
    });
    setEditId(s.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Service name required'); return; }
    if (!form.selling_price) { toast.error('Rate required'); return; }
    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim() || `SVC-${Date.now()}`,
        name: form.name.trim(),
        description: form.description || undefined,
        category: form.category,
        unit: form.unit || 'hrs',
        selling_price: parseFloat(form.selling_price),
        cost_price: 0,
        tax_rate: parseFloat(form.tax_rate) || 18,
        hsn_code: form.hsn_code || undefined,
        is_service: true,
      };
      if (editId) {
        const res = await opsApi.updateProduct(editId, payload);
        setServices(p => p.map(x => x.id === editId ? res.data : x));
        toast.success('Service updated');
      } else {
        const res = await opsApi.createProduct(payload);
        setServices(p => [res.data, ...p]);
        toast.success('Service added');
      }
      setModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (svc) => {
    try {
      const res = await opsApi.updateProduct(svc.id, { is_active: !svc.is_active });
      setServices(p => p.map(x => x.id === svc.id ? res.data : x));
      toast.success(res.data.is_active ? 'Service activated' : 'Service deactivated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      await opsApi.deleteProduct(deleteId);
      setServices(p => p.filter(x => x.id !== deleteId));
      setDeleteId(null);
      toast.success('Service deleted');
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const active = services.filter(s => s.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Service Master</h2>
          <p className="text-sm text-bodydark">{active} active services · {services.length} total</p>
        </div>
        <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          + Add Service
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code…"
          className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary w-64 bg-white"
        />
        <div className="flex gap-1.5 flex-wrap">
          {SERVICE_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${catFilter === c ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 ml-auto cursor-pointer text-xs text-bodydark">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-primary" />
          Show inactive
        </label>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-bodydark text-sm">No services found</p>
            <button onClick={openAdd} className="text-sm text-primary hover:underline">+ Add first service</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>
                {['Service Code', 'Service Name', 'Category', 'Unit', 'Rate (₹)', 'GST %', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {filtered.map(s => (
                <tr key={s.id} className={`hover:bg-gray-1 ${!s.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-mono text-sm text-primary">{s.sku}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-black">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-bodydark mt-0.5 max-w-xs truncate" title={s.description}>{s.description}</p>
                    )}
                    {s.hsn_code && <p className="text-xs text-bodydark">SAC: {s.hsn_code}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{s.category}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{s.unit}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">
                    ₹{(Number(s.selling_price) || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{Number(s.tax_rate)}%</td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => handleToggleActive(s)}
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 ${s.is_active ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-9 text-bodydark'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline">Edit</button>
                      <button onClick={() => setDeleteId(s.id)} className="text-xs text-meta-1 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">{editId ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <F label="Service Name *" value={form.name} onChange={set('name')} placeholder="Annual Maintenance Contract" />
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Description</label>
                <textarea value={form.description} onChange={set('description')} rows={2}
                  placeholder="Brief description of the service…"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Service Code (SAC)" value={form.sku} onChange={set('sku')} placeholder="SVC-AMC-CCTV" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Category</label>
                  <select value={form.category} onChange={set('category')}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary bg-white">
                    {SERVICE_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Rate / Price (₹) *" type="number" value={form.selling_price} onChange={set('selling_price')} placeholder="1500" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Unit</label>
                  <select value={form.unit} onChange={set('unit')}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary bg-white">
                    {SERVICE_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">GST %</label>
                  <select value={form.tax_rate} onChange={set('tax_rate')}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary bg-white">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>
              <F label="SAC Code" value={form.hsn_code} onChange={set('hsn_code')} placeholder="998511" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)}
                className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Saving…' : editId ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-meta-1/10 flex items-center justify-center mx-auto text-2xl text-meta-1">⚠</div>
              <h3 className="font-semibold text-black">Delete Service?</h3>
              <p className="text-sm text-bodydark">This cannot be undone. Past invoices using this service are unaffected.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setDeleteId(null)}
                className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">
                Delete
              </button>
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
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { opsApi } from '../../api/client';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Surveillance', 'Electrical', 'HVAC', 'Networking', 'Fire Safety', 'Other'];

const BLANK = {
  sku: '', name: '', description: '', category: 'Surveillance', selling_price: '', min_stock_level: '', unit: 'pcs',
  amc_applicable: false, warranty_applicable: false, service_applicable: false, refill_applicable: false,
  lifecycle_config: {
    amc: { duration_months: 12, renewal_cycle_months: 12, start_logic: 'installation_date' },
    warranty: { duration_months: 12, start_logic: 'installation_date' },
    service: { interval_days: 90, reminder_before_days: 7 },
    refill: { interval_days: 30, reminder_before_days: 3 },
  },
};

const START_LOGIC_OPTIONS = [
  { value: 'installation_date', label: 'Installation Date' },
  { value: 'delivery_date', label: 'Delivery Date' },
  { value: 'closure_date', label: 'Closure Date' },
  { value: 'manual_date', label: 'Manual Date' },
];

const normalize = (p) => ({
  ...p,
  selling_price: p.selling_price ?? p.price ?? 0,
  current_stock: p.current_stock ?? p.stock ?? 0,
  min_stock_level: p.min_stock_level ?? p.reorder ?? 0,
});

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await opsApi.listProducts();
      const raw = res.data?.items ?? res.data?.results ?? res.data ?? [];
      setProducts(raw.map(normalize));
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => { setForm(BLANK); setEditItem(null); setModal(true); };
  const openEdit = (p) => {
    const lc = p.lifecycle_config || {};
    setForm({
      sku: p.sku || '',
      name: p.name || '',
      description: p.description || '',
      category: p.category || 'Other',
      unit: p.unit || 'pcs',
      selling_price: String(p.selling_price ?? ''),
      min_stock_level: String(p.min_stock_level ?? ''),
      amc_applicable: p.amc_applicable || false,
      warranty_applicable: p.warranty_applicable || false,
      service_applicable: p.service_applicable || false,
      refill_applicable: p.refill_applicable || false,
      lifecycle_config: {
        amc: lc.amc || BLANK.lifecycle_config.amc,
        warranty: lc.warranty || BLANK.lifecycle_config.warranty,
        service: lc.service || BLANK.lifecycle_config.service,
        refill: lc.refill || BLANK.lifecycle_config.refill,
      },
    });
    setEditItem(p.id);
    setModal(true);
  };

  const setLcField = (type, field, value) =>
    setForm(p => ({ ...p, lifecycle_config: { ...p.lifecycle_config, [type]: { ...p.lifecycle_config[type], [field]: value } } }));

  const handleSave = async () => {
    if (!form.name) { toast.error('Product name required'); return; }
    setSaving(true);
    try {
      const lc = {};
      if (form.amc_applicable) lc.amc = form.lifecycle_config.amc;
      if (form.warranty_applicable) lc.warranty = form.lifecycle_config.warranty;
      if (form.service_applicable) lc.service = form.lifecycle_config.service;
      if (form.refill_applicable) lc.refill = form.lifecycle_config.refill;
      const payload = {
        sku: form.sku || undefined,
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        unit: form.unit || 'pcs',
        selling_price: Number(form.selling_price) || 0,
        cost_price: Number(form.selling_price) || 0,
        min_stock_level: Number(form.min_stock_level) || 0,
        amc_applicable: form.amc_applicable,
        warranty_applicable: form.warranty_applicable,
        service_applicable: form.service_applicable,
        refill_applicable: form.refill_applicable,
        lifecycle_config: lc,
      };
      if (editItem) {
        const res = await opsApi.updateProduct(editItem, payload);
        setProducts(p => p.map(x => x.id === editItem ? normalize(res.data) : x));
        toast.success('Product updated');
      } else {
        const res = await opsApi.createProduct(payload);
        setProducts(p => [normalize(res.data), ...p]);
        toast.success('Product added');
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
      await opsApi.deleteProduct(deleteId);
      setProducts(p => p.filter(x => x.id !== deleteId));
      setDeleteId(null);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const lowStock = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length;
  const outOfStock = products.filter(p => p.current_stock === 0).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Products & SKUs</h2>
          <p className="text-sm text-bodydark">{products.length} products · {outOfStock} out of stock · {lowStock} low stock</p>
        </div>
        <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Add Product</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…" className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary w-64 bg-white" />
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${catFilter === c ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><span className="spinner" /></div> : <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['SKU','Product Name','Category','Unit Price','Stock','Reorder Pt','Status','Actions'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {filtered.map(p => {
              const stock = Number(p.current_stock) || 0;
              const reorder = Number(p.min_stock_level) || 0;
              const stockStatus = stock === 0
                ? { label: 'Out of Stock', cls: 'bg-meta-1/10 text-meta-1' }
                : stock <= reorder
                  ? { label: 'Low Stock', cls: 'bg-meta-6/10 text-meta-6' }
                  : { label: 'In Stock', cls: 'bg-meta-3/10 text-meta-3' };
              return (
                <tr key={p.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 font-mono text-sm text-primary">{p.sku}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-medium text-black">{p.name}</p>
                    {p.description && <p className="text-xs text-bodydark mt-0.5 max-w-xs truncate" title={p.description}>{p.description}</p>}
                    {(p.amc_applicable || p.warranty_applicable || p.service_applicable || p.refill_applicable) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.amc_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">AMC</span>}
                        {p.warranty_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-6/10 text-meta-6">Warranty</span>}
                        {p.service_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-3/10 text-meta-3">Service</span>}
                        {p.refill_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-5/10 text-meta-5">Refill</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{p.category}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">₹{(Number(p.selling_price) || 0).toLocaleString()}</td>
                  <td className={`px-5 py-3.5 text-sm font-bold ${stock === 0 ? 'text-meta-1' : stock <= reorder ? 'text-meta-6' : 'text-black'}`}>{stock} {p.unit}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{reorder}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStatus.cls}`}>{stockStatus.label}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-primary hover:underline">Edit</button>
                      <button onClick={() => setDeleteId(p.id)} className="text-xs text-meta-1 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">{editItem ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <F label="Product Name *" value={form.name} onChange={set('name')} placeholder="CCTV Camera 2MP" />
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Description</label>
                <textarea value={form.description} onChange={set('description')} rows={2}
                  placeholder="Brief description of the product…"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="SKU Code" value={form.sku} onChange={set('sku')} placeholder="CCTV-CAM-2MP" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Category</label>
                  <select value={form.category} onChange={set('category')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Unit Price (₹)" type="number" value={form.selling_price} onChange={set('selling_price')} placeholder="2800" />
                <F label="Reorder Point" type="number" value={form.min_stock_level} onChange={set('min_stock_level')} placeholder="10" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Unit</label>
                  <select value={form.unit} onChange={set('unit')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {['pcs', 'kg', 'ltr', 'mtr', 'box', 'set'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Lifecycle Configuration ─────────────────────────────── */}
              <div className="border-t border-stroke pt-4">
                <h4 className="text-sm font-medium text-black mb-3">Post-Sales Lifecycle</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['amc_applicable', 'AMC Applicable'],
                    ['warranty_applicable', 'Warranty Applicable'],
                    ['service_applicable', 'Service Applicable'],
                    ['refill_applicable', 'Refill Applicable'],
                  ].map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[field]}
                        onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))}
                        className="w-4 h-4 rounded border-stroke accent-primary" />
                      <span className="text-sm text-black">{label}</span>
                    </label>
                  ))}
                </div>

                {form.amc_applicable && (
                  <div className="mt-3 rounded bg-primary/5 border border-primary/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">AMC Configuration</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Duration (months)</label>
                        <input type="number" value={form.lifecycle_config.amc.duration_months}
                          onChange={e => setLcField('amc', 'duration_months', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Renewal Cycle (months)</label>
                        <input type="number" value={form.lifecycle_config.amc.renewal_cycle_months}
                          onChange={e => setLcField('amc', 'renewal_cycle_months', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Start Logic</label>
                        <select value={form.lifecycle_config.amc.start_logic}
                          onChange={e => setLcField('amc', 'start_logic', e.target.value)}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary">
                          {START_LOGIC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {form.warranty_applicable && (
                  <div className="mt-3 rounded bg-meta-6/5 border border-meta-6/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-meta-6">Warranty Configuration</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Duration (months)</label>
                        <input type="number" value={form.lifecycle_config.warranty.duration_months}
                          onChange={e => setLcField('warranty', 'duration_months', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Start Logic</label>
                        <select value={form.lifecycle_config.warranty.start_logic}
                          onChange={e => setLcField('warranty', 'start_logic', e.target.value)}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary">
                          {START_LOGIC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {form.service_applicable && (
                  <div className="mt-3 rounded bg-meta-3/5 border border-meta-3/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-meta-3">Service Configuration</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Service Interval (days)</label>
                        <input type="number" value={form.lifecycle_config.service.interval_days}
                          onChange={e => setLcField('service', 'interval_days', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Reminder Before (days)</label>
                        <input type="number" value={form.lifecycle_config.service.reminder_before_days}
                          onChange={e => setLcField('service', 'reminder_before_days', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                    </div>
                  </div>
                )}

                {form.refill_applicable && (
                  <div className="mt-3 rounded bg-meta-5/5 border border-meta-5/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-meta-5">Refill Configuration</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Refill Interval (days)</label>
                        <input type="number" value={form.lifecycle_config.refill.interval_days}
                          onChange={e => setLcField('refill', 'interval_days', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="block text-xs text-bodydark mb-1">Reminder Before (days)</label>
                        <input type="number" value={form.lifecycle_config.refill.reminder_before_days}
                          onChange={e => setLcField('refill', 'reminder_before_days', Number(e.target.value))}
                          className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : editItem ? 'Update' : 'Add Product'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-meta-1/10 flex items-center justify-center mx-auto text-2xl text-meta-1">⚠</div>
              <h3 className="font-semibold text-black">Delete Product?</h3>
              <p className="text-sm text-bodydark">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setDeleteId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleDelete} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Delete</button>
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

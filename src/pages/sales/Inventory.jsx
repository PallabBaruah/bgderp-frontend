import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { salesApi, opsApi } from '../../api/client';
import { useGSTRates } from '../../hooks/useGSTRates';

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function AddProductModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', sku: '', unit: 'pcs', category: '',
    selling_price: '', cost_price: '', tax_rate: 18,
    hsn_code: '', min_stock_level: 0, is_service: false,
  });
  const [saving, setSaving] = useState(false);
  const { rates: gstRates } = useGSTRates();

  async function handleSave() {
    if (!form.name.trim() || !form.selling_price) { toast.error('Name and selling price required'); return; }
    setSaving(true);
    try {
      await opsApi.createProduct({
        ...form,
        sku: form.sku.trim() || `ITEM-${Date.now()}`,
        selling_price: parseFloat(form.selling_price),
        cost_price: parseFloat(form.cost_price) || 0,
        tax_rate: parseFloat(form.tax_rate) || 0,
        min_stock_level: parseFloat(form.min_stock_level) || 0,
      });
      toast.success(`"${form.name}" added`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create product');
    } finally { setSaving(false); }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-sm border border-stroke bg-white shadow-default">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
          <h3 className="text-base font-semibold text-black">Add New Product</h3>
          <button onClick={onClose} className="text-bodydark hover:text-black text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-black">Product Name *</label>
              <input value={form.name} onChange={e => f('name', e.target.value)}
                placeholder="e.g. Fire Extinguisher 4kg"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">SKU</label>
              <input value={form.sku} onChange={e => f('sku', e.target.value)}
                placeholder="Auto-generate if blank"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Category</label>
              <input value={form.category} onChange={e => f('category', e.target.value)}
                placeholder="e.g. Fire Safety"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Selling Price *</label>
              <input type="number" min="0" value={form.selling_price} onChange={e => f('selling_price', e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Cost Price</label>
              <input type="number" min="0" value={form.cost_price} onChange={e => f('cost_price', e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">GST %</label>
              <select value={form.tax_rate} onChange={e => f('tax_rate', e.target.value)}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
                {gstRates.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Unit</label>
              <input value={form.unit} onChange={e => f('unit', e.target.value)}
                placeholder="pcs, kg, nos…"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">HSN Code</label>
              <input value={form.hsn_code} onChange={e => f('hsn_code', e.target.value)}
                placeholder="e.g. 3813"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Min Stock Level</label>
              <input type="number" min="0" value={form.min_stock_level} onChange={e => f('min_stock_level', e.target.value)}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="is_service" checked={form.is_service} onChange={e => f('is_service', e.target.checked)}
                className="rounded" />
              <label htmlFor="is_service" className="text-sm text-bodydark cursor-pointer">This is a Service (no stock tracking)</label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-stroke justify-end">
          <button onClick={onClose} className="rounded border border-stroke px-4 py-2 text-sm text-bodydark">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ product, onClose, onSaved }) {
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const n = parseFloat(qty);
    if (isNaN(n) || n === 0) { toast.error('Enter a non-zero quantity'); return; }
    setSaving(true);
    try {
      await salesApi.adjustStock({ product_id: product.id, qty: n, notes: notes || 'Manual adjustment' });
      toast.success('Stock adjusted');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-sm border border-stroke bg-white p-6 shadow-default">
        <h3 className="text-base font-semibold text-black mb-1">Adjust Stock</h3>
        <p className="text-sm text-bodydark mb-4">{product.name} — Current: {product.current_stock} {product.unit}</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-black">Quantity Change (+ to add, - to remove)</label>
            <input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="e.g. 10 or -5"
              className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black">Reason / Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Stock count, damage, purchase, etc."
              className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="rounded border border-stroke px-4 py-2 text-sm text-bodydark">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Adjust'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState('stock'); // stock | movements

  const [movements, setMovements] = useState([]);
  const [movLoading, setMovLoading] = useState(false);

  async function loadStock() {
    setLoading(true);
    try {
      const r = await salesApi.listStock({ search: search || undefined, low_stock: lowOnly || undefined, limit: 200 });
      setProducts(r.data?.results || []);
      setTotal(r.data?.total || 0);
    } catch { toast.error('Failed to load stock'); }
    finally { setLoading(false); }
  }

  async function loadMovements() {
    setMovLoading(true);
    try {
      const r = await salesApi.stockMovements({ limit: 100 });
      setMovements(r.data?.results || []);
    } catch {}
    finally { setMovLoading(false); }
  }

  useEffect(() => { loadStock(); }, [lowOnly]);
  useEffect(() => { if (tab === 'movements') loadMovements(); }, [tab]);

  const lowCount = products.filter(p => p.low_stock).length;
  const totalValue = products.reduce((s, p) => s + (p.current_stock * p.selling_price), 0);
  const serviceCount = products.filter(p => p.is_service).length;

  return (
    <div className="p-6">
      {addOpen && <AddProductModal onClose={() => setAddOpen(false)} onSaved={loadStock} />}
      {adjustTarget && (
        <AdjustModal product={adjustTarget} onClose={() => setAdjustTarget(null)} onSaved={loadStock} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-black">Inventory & Stock</h1>
          <p className="text-sm text-bodydark">{total} products</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">
          + Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Products', value: total - serviceCount, cls: 'text-black' },
          { label: 'Services', value: serviceCount, cls: 'text-primary' },
          { label: 'Low Stock Alerts', value: lowCount, cls: lowCount > 0 ? 'text-danger' : 'text-meta-3' },
          { label: 'Stock Value (selling)', value: fmt(totalValue), cls: 'text-black' },
        ].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white p-4 shadow-default">
            <p className="text-xs text-bodydark mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stroke mb-4">
        {[{ key: 'stock', label: 'Stock Levels' }, { key: 'movements', label: 'Stock Movements' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-bodydark hover:text-black'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          <div className="flex gap-3 mb-4">
            <input type="text" placeholder="Search products…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadStock()}
              className="rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary w-64" />
            <label className="flex items-center gap-2 text-sm text-bodydark cursor-pointer">
              <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)}
                className="rounded" />
              Low stock only
            </label>
          </div>

          <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-1 border-b border-stroke">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Category</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Unit</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">HSN</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Selling Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">GST%</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Min Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="py-12 text-center text-bodydark">Loading…</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={10} className="py-12 text-center text-bodydark">No products found</td></tr>
                  ) : products.map(p => (
                    <tr key={p.id} className={`border-b border-stroke hover:bg-gray-1/50 ${p.low_stock ? 'bg-danger/2' : ''}`}>
                      <td className="px-4 py-3 text-xs text-bodydark font-mono">{p.sku}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-black">{p.name}</span>
                          {p.is_service && (
                            <span className="text-xs rounded-full bg-primary/10 text-primary px-1.5 py-0.5">Service</span>
                          )}
                          {p.low_stock && (
                            <span className="text-xs rounded-full bg-danger/10 text-danger px-1.5 py-0.5">⚠ Low</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-bodydark text-xs">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-center text-bodydark text-xs">{p.unit}</td>
                      <td className="px-4 py-3 text-center text-bodydark text-xs font-mono">{p.hsn_code || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(p.selling_price)}</td>
                      <td className="px-4 py-3 text-right text-bodydark">{p.tax_rate}%</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${p.low_stock ? 'text-danger' : 'text-black'}`}>
                          {p.is_service ? '—' : p.current_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-bodydark text-xs">
                        {p.is_service ? '—' : p.min_stock_level}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!p.is_service && (
                          <button onClick={() => setAdjustTarget(p)}
                            className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black">
                            Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'movements' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-1 border-b border-stroke">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Reference</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Qty Change</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Balance After</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Notes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Date</th>
                </tr>
              </thead>
              <tbody>
                {movLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-bodydark">Loading…</td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-bodydark">No movements recorded</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="border-b border-stroke hover:bg-gray-1/50">
                    <td className="px-4 py-3 font-medium text-black">{m.product_name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.movement_type === 'sale' ? 'bg-danger/10 text-danger' :
                        m.movement_type === 'purchase' ? 'bg-meta-3/10 text-meta-3' :
                        'bg-bodydark/10 text-bodydark'
                      }`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-bodydark">{m.reference_type}</td>
                    <td className={`px-4 py-3 text-right font-medium ${m.qty_change < 0 ? 'text-danger' : 'text-meta-3'}`}>
                      {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                    </td>
                    <td className="px-4 py-3 text-right text-black">{m.balance_after}</td>
                    <td className="px-4 py-3 text-xs text-bodydark">{m.notes}</td>
                    <td className="px-4 py-3 text-xs text-bodydark">
                      {new Date(m.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

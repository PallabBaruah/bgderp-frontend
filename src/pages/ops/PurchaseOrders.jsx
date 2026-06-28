import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { opsApi } from '../../api/client';
import toast from 'react-hot-toast';

const STATUS_META = {
  draft:            { label: 'Draft',            color: 'bg-meta-9 text-bodydark' },
  submitted:        { label: 'Submitted',        color: 'bg-meta-5/10 text-meta-5' },
  approved:         { label: 'Approved',         color: 'bg-meta-6/10 text-meta-6' },
  partial_received: { label: 'Partial Received', color: 'bg-primary/10 text-primary' },
  received:         { label: 'Received',         color: 'bg-meta-3/10 text-meta-3' },
  cancelled:        { label: 'Cancelled',        color: 'bg-meta-1/10 text-meta-1' },
};

const LINE_BLANK = { product: '', qty: '', price: '' };
const BLANK_PO = { vendor: '', expected: '', notes: '' };

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [approveId, setApproveId] = useState(null);
  const [form, setForm] = useState(BLANK_PO);
  const [lines, setLines] = useState([{ ...LINE_BLANK }]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [posRes, vendorRes] = await Promise.all([opsApi.listPOs(), opsApi.listVendors()]);
      setPos(posRes.data?.items ?? posRes.data?.results ?? posRes.data ?? []);
      const vList = vendorRes.data?.items ?? vendorRes.data?.results ?? vendorRes.data ?? [];
      setVendors(vList);
      if (vList.length > 0 && !form.vendor) setForm(p => ({ ...p, vendor: vList[0].id ?? vList[0].name }));
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = filter === 'all' ? pos : pos.filter(p => p.status === filter);

  const lineTotal = lines.reduce((s, l) => s + (Number(l.qty) * Number(l.price) || 0), 0);

  const addLine = () => setLines(p => [...p, { ...LINE_BLANK }]);
  const removeLine = (i) => setLines(p => p.filter((_, idx) => idx !== i));
  const setLine = (i, k, v) => setLines(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const handleCreate = async () => {
    if (!form.vendor || lines.some(l => !l.product)) { toast.error('Vendor and all product names required'); return; }
    setSaving(true);
    try {
      const payload = {
        vendor_id: form.vendor,
        expected_date: form.expected || null,
        notes: form.notes,
        items: lines.map(l => ({ product_name: l.product, qty: Number(l.qty) || 1, unit_price: Number(l.price) || 0 })),
      };
      const res = await opsApi.createPO(payload);
      setPos(p => [res.data, ...p]);
      setModal(false);
      setForm(BLANK_PO);
      setLines([{ ...LINE_BLANK }]);
      toast.success('Purchase order created');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await opsApi.approvePO(approveId);
      setPos(p => p.map(x => x.id === approveId ? res.data : x));
      setApproveId(null);
      toast.success('PO approved');
    } catch {
      toast.error('Approval failed');
    }
  };

  const handleSubmit = async (id) => {
    try {
      const res = await opsApi.submitPO(id);
      setPos(p => p.map(x => x.id === id ? res.data : x));
      toast.success('PO submitted for approval');
    } catch {
      toast.error('Submit failed');
    }
  };

  const counts = Object.keys(STATUS_META).reduce((a, s) => ({ ...a, [s]: pos.filter(p => p.status === s).length }), {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Purchase Orders</h2>
          <p className="text-sm text-bodydark">{pos.length} total · {counts.approved || 0} awaiting receipt</p>
        </div>
        <button onClick={() => setModal(true)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Create PO</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', 'All'], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === val ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>
            {label}{val !== 'all' && counts[val] ? ` (${counts[val]})` : ''}
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><span className="spinner" /></div> : <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['PO Number', 'Vendor', 'Date', 'Expected By', 'Items', 'Total', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {filtered.map(po => {
              const sm = STATUS_META[po.status];
              return (
                <tr key={po.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5">
                    <Link to={`/ops/purchase-orders/${po.id}`} className="font-mono text-sm font-medium text-primary hover:underline">{po.po_number}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-black">{po.vendor}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{po.date}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{po.expected}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{po.items ?? po.item_count ?? 0} items</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">₹{(po.total ?? po.total_amount ?? 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sm?.color ?? 'bg-meta-9 text-bodydark'}`}>{sm?.label ?? po.status}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/ops/purchase-orders/${po.id}`} className="text-xs text-primary hover:underline">View</Link>
                      {po.status === 'draft' && (
                        <button onClick={() => handleSubmit(po.id)} className="text-xs text-meta-5 hover:underline">Submit</button>
                      )}
                      {po.status === 'submitted' && (
                        <button onClick={() => setApproveId(po.id)} className="text-xs text-meta-3 hover:underline">Approve</button>
                      )}
                      {(po.status === 'approved' || po.status === 'partial_received') && (
                        <Link to={`/ops/purchase-orders/${po.id}`} className="text-xs text-meta-6 hover:underline">Receive</Link>
                      )}
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
          <div className="modal-box max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Create Purchase Order</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Vendor *</label>
                  <select value={form.vendor} onChange={set('vendor')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {vendors.map(v => <option key={v.id ?? v.name} value={v.id ?? v.name}>{v.name}</option>)}
                  </select>
                </div>
                <F label="Expected Delivery" type="date" value={form.expected} onChange={set('expected')} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-bodydark uppercase">Line Items</label>
                  <button type="button" onClick={addLine} className="text-xs text-primary hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">
                        {i === 0 && <label className="block text-xs text-bodydark mb-1">Product</label>}
                        <input value={l.product} onChange={e => setLine(i, 'product', e.target.value)} placeholder="Product name" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <label className="block text-xs text-bodydark mb-1">Qty</label>}
                        <input type="number" value={l.qty} onChange={e => setLine(i, 'qty', e.target.value)} placeholder="0" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div className="col-span-3">
                        {i === 0 && <label className="block text-xs text-bodydark mb-1">Unit Price (₹)</label>}
                        <input type="number" value={l.price} onChange={e => setLine(i, 'price', e.target.value)} placeholder="0" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {lines.length > 1 && (
                          <button onClick={() => removeLine(i)} className="text-meta-1 text-sm hover:opacity-70">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3 pt-3 border-t border-stroke">
                  <span className="text-sm font-semibold text-black">Total: ₹{lineTotal.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional notes…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Creating…' : 'Create PO'}</button>
            </div>
          </div>
        </div>
      )}

      {approveId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-meta-3/10 flex items-center justify-center mx-auto text-2xl">✓</div>
              <h3 className="font-semibold text-black">Approve Purchase Order?</h3>
              <p className="text-sm text-bodydark">This will authorize the purchase and notify the vendor.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setApproveId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleApprove} className="rounded bg-meta-3 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Approve</button>
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

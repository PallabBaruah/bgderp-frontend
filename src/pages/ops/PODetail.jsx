import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { opsApi } from '../../api/client';
import toast from 'react-hot-toast';

const STATUS_META = {
  draft:            { label: 'Draft',            color: 'bg-meta-9 text-bodydark' },
  submitted:        { label: 'Submitted',        color: 'bg-meta-5/10 text-meta-5' },
  approved:         { label: 'Approved',         color: 'bg-meta-6/10 text-meta-6' },
  partial_received: { label: 'Partial Received', color: 'bg-primary/10 text-primary' },
  received:         { label: 'Received',         color: 'bg-meta-3/10 text-meta-3' },
};

export default function PODetail() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiveModal, setReceiveModal] = useState(false);
  const [receiveQty, setReceiveQty] = useState({});
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    opsApi.getPO(id)
      .then(res => setPo(res.data))
      .catch(() => toast.error('Failed to load purchase order'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><span className="spinner" /></div>;
  if (!po) return <div className="p-8 text-center text-bodydark">Purchase order not found.</div>;

  const items = po.items ?? po.line_items ?? [];
  const subtotal = items.reduce((s, i) => s + (i.total ?? i.unit_price * i.qty ?? 0), 0);
  const gst = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + gst;

  const sm = STATUS_META[po.status] || STATUS_META.approved;

  const handleReceive = async () => {
    const anyEntered = Object.values(receiveQty).some(v => Number(v) > 0);
    if (!anyEntered) { toast.error('Enter at least one quantity'); return; }
    setReceiving(true);
    try {
      const payload = {
        items: items.map(item => ({
          item_id: item.id,
          qty_received: Number(receiveQty[item.id]) || 0,
        })).filter(x => x.qty_received > 0),
      };
      const res = await opsApi.receivePO(id, payload);
      setPo(res.data);
      setReceiveModal(false);
      setReceiveQty({});
      toast.success('Goods received — inventory updated');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Receive failed');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/ops/purchase-orders" className="hover:text-primary">Purchase Orders</Link>
        <span>/</span>
        <span className="text-black font-medium">{po.po_number}</span>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-xl font-bold text-primary">{po.po_number}</span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sm.color}`}>{sm.label}</span>
            </div>
            <p className="text-sm text-bodydark">{po.vendor} · {po.vendor_contact} · {po.vendor_phone}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(po.status === 'approved' || po.status === 'partial_received') && (
              <button onClick={() => setReceiveModal(true)} className="rounded bg-meta-3 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Receive Goods</button>
            )}
            <button onClick={() => toast.success('Sending to vendor…')} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Send to Vendor</button>
            <Link to="/ops/purchase-orders" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">← Back</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {[{ label: 'Order Date', val: po.date }, { label: 'Expected By', val: po.expected }, { label: 'Vendor', val: po.vendor }, { label: 'Grand Total', val: `₹${grandTotal.toLocaleString()}` }].map(s => (
            <div key={s.label} className="rounded bg-gray-1 p-3">
              <div className="text-xs text-bodydark mb-0.5">{s.label}</div>
              <div className="text-sm font-semibold text-black">{s.val}</div>
            </div>
          ))}
        </div>

        {po.notes && (
          <div className="mt-4 p-3 rounded bg-meta-6/5 border border-meta-6/20 text-sm text-bodydark">
            <span className="font-medium text-black">Note: </span>{po.notes}
          </div>
        )}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke">
          <h3 className="font-medium text-black">Order Items</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Product', 'SKU', 'Ordered Qty', 'Received', 'Pending', 'Unit Price', 'Total'].map(h => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {items.map(item => {
              const pending = (item.qty ?? item.quantity ?? 0) - (item.received ?? item.qty_received ?? 0);
              const unitPrice = item.price ?? item.unit_price ?? 0;
              const lineTotal = item.total ?? unitPrice * (item.qty ?? 0);
              return (
                <tr key={item.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm font-medium text-black">{item.product ?? item.product_name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-bodydark">{item.sku ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-black">{item.qty ?? item.quantity}</td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${(item.received ?? 0) > 0 ? 'text-meta-3' : 'text-bodydark'}`}>{item.received ?? item.qty_received ?? 0}</td>
                  <td className={`px-5 py-3.5 text-sm font-semibold ${pending > 0 ? 'text-meta-1' : 'text-meta-3'}`}>{pending}</td>
                  <td className="px-5 py-3.5 text-sm text-black">₹{unitPrice.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">₹{lineTotal.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-5 py-4 bg-gray-1 flex justify-end">
          <div className="w-60 space-y-2 text-sm">
            <div className="flex justify-between text-bodydark"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-bodydark"><span>GST (18%)</span><span>₹{gst.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-black pt-2 border-t border-stroke"><span>Grand Total</span><span>₹{grandTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
        <h3 className="font-medium text-black mb-4">Status Timeline</h3>
        <div className="space-y-4">
          {(po.timeline ?? po.history ?? []).map((t, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                {i < (po.timeline ?? po.history ?? []).length - 1 && <div className="w-0.5 flex-1 bg-stroke mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-black">{t.status}</p>
                <p className="text-xs text-bodydark">{t.by} · {t.date ?? t.created_at}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {receiveModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Receive Goods — {po.po_number}</h3>
              <button onClick={() => setReceiveModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-1">
                  <tr>{['Product', 'Pending', 'Receiving Now'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {items.map(item => {
                    const pending = (item.qty ?? item.quantity ?? 0) - (item.received ?? item.qty_received ?? 0);
                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-3 text-sm font-medium text-black">{item.product ?? item.product_name}</td>
                        <td className={`px-5 py-3 text-sm font-bold ${pending > 0 ? 'text-meta-1' : 'text-meta-3'}`}>{pending}</td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="0" max={pending} disabled={pending === 0}
                            value={receiveQty[item.id] || ''}
                            onChange={e => setReceiveQty(p => ({ ...p, [item.id]: e.target.value }))}
                            placeholder="0"
                            className="w-24 rounded border border-stroke px-3 py-1.5 text-sm text-black outline-none focus:border-primary disabled:bg-gray-1 disabled:text-bodydark"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setReceiveModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleReceive} disabled={receiving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{receiving ? 'Confirming…' : 'Confirm Receipt'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

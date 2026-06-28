import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/client';

const STATUS_META = {
  open:      { label: 'Open',      cls: 'bg-primary/10 text-primary' },
  delivered: { label: 'Delivered', cls: 'bg-meta-3/10 text-meta-3' },
  cancelled: { label: 'Cancelled', cls: 'bg-danger/10 text-danger' },
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function DeliveryChallans() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await salesApi.listChallans({ status: status || undefined });
      setItems(r.data?.results || []);
      setTotal(r.data?.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);

  async function markDelivered(id) {
    try {
      await salesApi.updateChallan(id, { status: 'delivered' });
      toast.success('Marked as delivered');
      load();
    } catch { toast.error('Failed'); }
  }

  const today = new Date().toDateString();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-black">Delivery Challans</h1>
          <p className="text-sm text-bodydark">{total} total</p>
        </div>
        <Link to="/sales/challans/new"
          className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">
          + New Challan
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">All Status</option>
          {Object.entries(STATUS_META).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-1 border-b border-stroke">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Challan No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Invoice</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Items</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-bodydark">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-bodydark">No delivery challans found</td></tr>
              ) : items.map(ch => {
                const sm = STATUS_META[ch.status] || STATUS_META.open;
                const isOverdue = ch.due_date && new Date(ch.due_date).toDateString() !== today
                  && new Date(ch.due_date) < new Date() && ch.status === 'open';
                return (
                  <tr key={ch.id} className="border-b border-stroke hover:bg-gray-1/50">
                    <td className="px-4 py-3 font-medium text-black">{ch.challan_no}</td>
                    <td className="px-4 py-3 font-medium text-black">{ch.customer_name}</td>
                    <td className="px-4 py-3 text-bodydark">{ch.challan_date}</td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? 'text-danger font-medium' : 'text-bodydark'}>
                        {ch.due_date || '—'}
                        {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-bodydark text-xs">
                      {ch.invoice_id
                        ? <Link to={`/sales/invoices/${ch.invoice_id}`} className="text-primary hover:underline">View Invoice</Link>
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-black">{fmt(ch.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sm.cls}`}>{sm.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-bodydark">
                      {ch.items?.length || 0} item{ch.items?.length !== 1 ? 's' : ''}
                      {ch.items?.slice(0, 2).map((it, i) => (
                        <div key={i} className="truncate max-w-32">{it.name} × {it.ordered_qty || it.qty}</div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center">
                        {ch.status === 'open' && (
                          <button onClick={() => markDelivered(ch.id)}
                            className="rounded border border-meta-3/30 bg-meta-3/5 px-2.5 py-1 text-xs text-meta-3 hover:bg-meta-3/10">
                            ✓ Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

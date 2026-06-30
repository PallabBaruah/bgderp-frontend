import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const STATUS_META = {
  draft:          { label: 'Draft',           cls: 'bg-bodydark/10 text-bodydark' },
  sent:           { label: 'Sent',            cls: 'bg-primary/10 text-primary' },
  paid:           { label: 'Paid',            cls: 'bg-meta-3/10 text-meta-3' },
  partially_paid: { label: 'Partial',         cls: 'bg-warning/10 text-warning' },
  overdue:        { label: 'Overdue',         cls: 'bg-danger/10 text-danger' },
  cancelled:      { label: 'Cancelled',       cls: 'bg-bodydark/10 text-bodydark' },
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function PaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [payType, setPayType] = useState(invoice.payment_type || 'cash');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { toast.error('Enter valid amount'); return; }
    setSaving(true);
    try {
      const r = await salesApi.recordPayment(invoice.id, { amount: parseFloat(amount), payment_type: payType });
      toast.success('Payment recorded');
      onSaved(r.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-sm border border-stroke bg-white p-6 shadow-default">
        <h3 className="text-base font-semibold text-black mb-4">Record Payment — {invoice.invoice_no}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-black">Balance Due</label>
            <p className="text-xl font-bold text-danger">{fmt(invoice.balance_due)}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black">Payment Amount</label>
            <input type="number" min="0" max={invoice.balance_due} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black">Payment Type</label>
            <select value={payType} onChange={e => setPayType(e.target.value)}
              className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="rounded border border-stroke px-4 py-2 text-sm text-bodydark">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesInvoices() {
  const { roles, user } = useAuthStore();
  const isEmployee = roles?.length === 1 && roles[0] === 'Employee';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [challanCreating, setChallanCreating] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = { status: status || undefined, search: search || undefined };
      if (isEmployee && user?.id) params.created_by = user.id;
      const r = await salesApi.listInvoices(params);
      setItems(r.data?.results || []);
      setTotal(r.data?.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);

  async function createChallan(inv) {
    setChallanCreating(inv.id);
    try {
      await salesApi.createChallanFromInvoice(inv.id);
      toast.success('Delivery Challan created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setChallanCreating(null); }
  }

  function updateItem(updated) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  }

  // Summary stats
  const totalRevenue = items.reduce((s, i) => s + parseFloat(i.total || 0), 0);
  const totalReceived = items.reduce((s, i) => s + parseFloat(i.amount_received || 0), 0);
  const totalBalance = items.reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
  const overdueCount = items.filter(i => i.status === 'overdue').length;

  return (
    <div className="p-6">
      {payModal && (
        <PaymentModal invoice={payModal} onClose={() => setPayModal(null)} onSaved={updateItem} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-black">Sales Invoices</h1>
          <p className="text-sm text-bodydark">{total} total</p>
        </div>
        {!isEmployee && (
          <Link to="/sales/invoices/new"
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">
            + New Invoice
          </Link>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Revenue', value: fmt(totalRevenue), cls: 'text-black' },
          { label: 'Collected', value: fmt(totalReceived), cls: 'text-meta-3' },
          { label: 'Outstanding', value: fmt(totalBalance), cls: 'text-danger' },
          { label: 'Overdue', value: overdueCount + ' invoices', cls: 'text-warning' },
        ].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white p-4 shadow-default">
            <p className="text-xs text-bodydark mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Search customer or INV no…" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary w-64" />
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
          <option value="">All Status</option>
          {Object.entries(STATUS_META).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-1 border-b border-stroke">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Invoice No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Due</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-bodydark">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-bodydark">No invoices found</td></tr>
              ) : items.map(inv => {
                const sm = STATUS_META[inv.status] || STATUS_META.draft;
                const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.balance_due > 0;
                return (
                  <tr key={inv.id} className="border-b border-stroke hover:bg-gray-1/50">
                    <td className="px-4 py-3">
                      <Link to={`/sales/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                        {inv.invoice_no}
                      </Link>
                      {inv.pi_id && <span className="ml-1 text-xs text-bodydark">(from PI)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-black">{inv.customer_name}</p>
                      {inv.customer_phone && <p className="text-xs text-bodydark">{inv.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-bodydark">{inv.invoice_date}</td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? 'text-danger font-medium' : 'text-bodydark'}>
                        {inv.due_date || '—'}
                        {isOverdue && (
                          <span className="ml-1 text-xs">
                            (overdue {Math.floor((Date.now() - new Date(inv.due_date)) / 86400000)}d)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-black">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={parseFloat(inv.balance_due) > 0 ? 'text-danger font-medium' : 'text-meta-3 font-medium'}>
                        {fmt(inv.balance_due)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sm.cls}`}>{sm.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center flex-wrap">
                        <Link to={`/sales/invoices/${inv.id}`}
                          className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black">
                          View
                        </Link>
                        {!isEmployee && (<>
                          <Link to={`/sales/invoices/${inv.id}/edit`}
                            className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black">
                            Edit
                          </Link>
                          {parseFloat(inv.balance_due) > 0 && inv.status !== 'cancelled' && (
                            <button onClick={() => setPayModal(inv)}
                              className="rounded border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10">
                              + Payment
                            </button>
                          )}
                          <button
                            onClick={() => createChallan(inv)}
                            disabled={challanCreating === inv.id}
                            className="rounded border border-warning/30 bg-warning/5 px-2.5 py-1 text-xs text-warning hover:bg-warning/10 disabled:opacity-50">
                            → Challan
                          </button>
                        </>)}
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

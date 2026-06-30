import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-bodydark/10 text-bodydark' },
  sent:      { label: 'Sent',      cls: 'bg-primary/10 text-primary' },
  converted: { label: 'Converted', cls: 'bg-meta-3/10 text-meta-3' },
  cancelled: { label: 'Cancelled', cls: 'bg-danger/10 text-danger' },
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function ProformaInvoices() {
  const { roles, user } = useAuthStore();
  const isEmployee = roles?.length === 1 && roles[0] === 'Employee';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [converting, setConverting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = { status: status || undefined };
      if (isEmployee && user?.id) params.created_by = user.id;
      const r = await salesApi.listPI(params);
      setItems(r.data?.results || []);
      setTotal(r.data?.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);

  async function handleConvert(pid) {
    setConverting(pid);
    try {
      await salesApi.convertPI(pid);
      toast.success('Converted to Invoice');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setConverting(null); }
  }

  const filtered = search
    ? items.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()) || i.pi_no.includes(search))
    : items;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-black">Proforma Invoices</h1>
          <p className="text-sm text-bodydark">{total} total</p>
        </div>
        {!isEmployee && (
          <Link to="/sales/pi/new"
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">
            + New PI
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search customer or PI no…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary w-64" />
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">PI No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">Valid Until</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-bodydark">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-bodydark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-bodydark">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-bodydark">No proforma invoices found</td></tr>
              ) : filtered.map(p => {
                const sm = STATUS_META[p.status] || STATUS_META.draft;
                return (
                  <tr key={p.id} className="border-b border-stroke hover:bg-gray-1/50">
                    <td className="px-4 py-3">
                      <Link to={`/sales/pi/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.pi_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-black">{p.customer_name}</td>
                    <td className="px-4 py-3 text-bodydark">{p.date}</td>
                    <td className="px-4 py-3 text-bodydark">{p.valid_until || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-black">{fmt(p.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sm.cls}`}>{sm.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center">
                        {!isEmployee && (<>
                          <Link to={`/sales/pi/${p.id}/edit`}
                            className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black">
                            Edit
                          </Link>
                          {!p.converted_to_invoice_id && p.status !== 'converted' && (
                            <button onClick={() => handleConvert(p.id)}
                              disabled={converting === p.id}
                              className="rounded border border-meta-3/30 bg-meta-3/5 px-2.5 py-1 text-xs text-meta-3 hover:bg-meta-3/10 disabled:opacity-50">
                              → Invoice
                            </button>
                          )}
                        </>)}
                        {isEmployee && <span className="text-xs text-bodydark">View only</span>}
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

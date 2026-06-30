import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-bodydark/10 text-bodydark' },
  sent:      { label: 'Sent',      cls: 'bg-primary/10 text-primary' },
  accepted:  { label: 'Accepted',  cls: 'bg-meta-3/10 text-meta-3' },
  rejected:  { label: 'Rejected',  cls: 'bg-danger/10 text-danger' },
  expired:   { label: 'Expired',   cls: 'bg-warning/10 text-warning' },
  converted: { label: 'Converted', cls: 'bg-purple-100 text-purple-700' },
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function Quotations() {
  const navigate = useNavigate();
  const { roles, user } = useAuthStore();
  const isEmployee = roles?.length === 1 && roles[0] === 'Employee';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [converting, setConverting] = useState(null);
  const [copying, setCopying] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = { status: status || undefined, search: search || undefined };
      if (isEmployee && user?.id) params.created_by = user.id;
      const r = await salesApi.listQuotations(params);
      setItems(r.data?.results || []);
      setTotal(r.data?.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);

  async function handleConvert(qid, target) {
    setConverting(qid + target);
    try {
      await salesApi.convertQuotation(qid, target);
      toast.success(`Converted to ${target === 'pi' ? 'Proforma Invoice' : 'Invoice'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to convert');
    } finally { setConverting(null); }
  }

  async function handleCopy(id, quoteNo) {
    if (!confirm(`Copy quotation ${quoteNo}? A new draft revision will be created.`)) return;
    setCopying(id);
    try {
      const r = await salesApi.copyQuotation(id, {});
      toast.success(`Created ${r.data.quote_no} as a draft copy`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to copy');
    } finally { setCopying(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this quotation?')) return;
    try {
      await salesApi.deleteQuotation(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  }

  const filtered = search
    ? items.filter(i => i.customer_name?.toLowerCase().includes(search.toLowerCase()) || i.quote_no.includes(search))
    : items;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-black">Quotations</h1>
          <p className="text-sm text-bodydark">{total} total</p>
        </div>
        {!isEmployee && (
          <Link to="/sales/quotations/new"
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">
            + New Quotation
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text" placeholder="Search customer or QT no…" value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          className="rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary w-64"
        />
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-bodydark">QT No.</th>
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
                <tr><td colSpan={7} className="py-12 text-center text-bodydark">No quotations found</td></tr>
              ) : filtered.map(q => {
                const sm = STATUS_META[q.status] || STATUS_META.draft;
                const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status === 'sent';
                return (
                  <tr key={q.id} className="border-b border-stroke hover:bg-gray-1/50">
                    <td className="px-4 py-3">
                      <Link to={`/sales/quotations/${q.id}`} className="font-medium text-primary hover:underline">
                        {q.quote_no}
                      </Link>
                      {q.parent_id && (
                        <span className="ml-1.5 rounded bg-bodydark/10 px-1.5 py-0.5 text-xs text-bodydark" title="Copied from another quotation">
                          copy
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-black">{q.customer_name}</p>
                    </td>
                    <td className="px-4 py-3 text-bodydark">{q.date}</td>
                    <td className="px-4 py-3">
                      <span className={isExpired ? 'text-danger font-medium' : 'text-bodydark'}>
                        {q.valid_until || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-black">{fmt(q.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sm.cls}`}>{sm.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center flex-wrap">
                        <Link to={`/sales/quotations/${q.id}`}
                          className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black">
                          View
                        </Link>
                        {!isEmployee && (<>
                          <Link to={`/sales/quotations/${q.id}/edit`}
                            className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black">
                            Edit
                          </Link>
                          <button onClick={() => handleCopy(q.id, q.quote_no)}
                            disabled={copying === q.id}
                            title="Create a revision copy"
                            className="rounded border border-warning/30 bg-warning/5 px-2.5 py-1 text-xs text-warning hover:bg-warning/10 disabled:opacity-50">
                            Copy
                          </button>
                          <Link to={`/sales/quotations/${q.id}?tab=history`}
                            className="rounded border border-bodydark/20 px-2.5 py-1 text-xs text-bodydark hover:text-black"
                            title="Version history">
                            History
                          </Link>
                          {!q.converted_to && q.status !== 'converted' && (<>
                            <button onClick={() => handleConvert(q.id, 'pi')}
                              disabled={converting === q.id + 'pi'}
                              className="rounded border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50">
                              → PI
                            </button>
                            <button onClick={() => handleConvert(q.id, 'invoice')}
                              disabled={converting === q.id + 'invoice'}
                              className="rounded border border-meta-3/30 bg-meta-3/5 px-2.5 py-1 text-xs text-meta-3 hover:bg-meta-3/10 disabled:opacity-50">
                              → Invoice
                            </button>
                          </>)}
                          <button onClick={() => handleDelete(q.id)}
                            className="rounded border border-danger/20 px-2.5 py-1 text-xs text-danger hover:bg-danger/5">
                            Del
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

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import DocumentForm from './DocumentForm';
import { salesApi } from '../../api/client';
import toast from 'react-hot-toast';

const ACTION_META = {
  created:        { label: 'Created',        cls: 'bg-meta-3/10 text-meta-3' },
  copied:         { label: 'Copied',         cls: 'bg-warning/10 text-warning' },
  modified:       { label: 'Modified',       cls: 'bg-primary/10 text-primary' },
  status_changed: { label: 'Status Changed', cls: 'bg-purple-100 text-purple-700' },
};

const STATUS_CLS = {
  draft:     'bg-bodydark/10 text-bodydark',
  sent:      'bg-primary/10 text-primary',
  accepted:  'bg-meta-3/10 text-meta-3',
  rejected:  'bg-danger/10 text-danger',
  expired:   'bg-warning/10 text-warning',
  converted: 'bg-purple-100 text-purple-700',
};

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

function VersionHistory({ quotationId }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!quotationId) return;
    setLoading(true);
    salesApi.getQuotationHistory(quotationId)
      .then(r => { setHistory(r.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [quotationId]);

  if (loading) return <div className="py-8 text-center text-sm text-bodydark">Loading history…</div>;
  if (!history) return <div className="py-8 text-center text-sm text-danger">Failed to load history</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Versions', value: history.versions.length },
          { label: 'Total Copies', value: history.total_copies },
          { label: 'Modifications', value: history.total_modifications },
          { label: 'Activity Events', value: history.activity_log.length },
        ].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-gray-1 p-4 text-center">
            <p className="text-2xl font-bold text-black">{s.value}</p>
            <p className="text-xs text-bodydark mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Version chain */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-black">Version Chain</h3>
        <div className="overflow-x-auto rounded-sm border border-stroke">
          <table className="w-full text-sm">
            <thead className="bg-gray-1 border-b border-stroke">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-bodydark">Quote No.</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-bodydark">Revision</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-bodydark">Date</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-bodydark">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-bodydark">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-bodydark">Remarks</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-bodydark">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.versions.map(v => (
                <tr key={v.id}
                  className={`border-b border-stroke hover:bg-gray-1/50 ${v.id === quotationId ? 'bg-primary/5' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-black">{v.quote_no}</td>
                  <td className="px-4 py-2.5 text-bodydark">
                    {v.revision_number === 0 ? 'Original' : `Rev-${v.revision_number}`}
                  </td>
                  <td className="px-4 py-2.5 text-bodydark">{v.date}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{fmt(v.total)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[v.status] || ''}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-bodydark text-xs max-w-[140px] truncate" title={v.revision_remarks || ''}>
                    {v.revision_remarks || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {v.id !== quotationId && (
                      <button
                        onClick={() => navigate(`/sales/quotations/${v.id}?tab=history`)}
                        className="rounded border border-stroke px-2 py-0.5 text-xs text-bodydark hover:text-black">
                        View
                      </button>
                    )}
                    {v.id === quotationId && (
                      <span className="text-xs text-primary font-medium">Current</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity log */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-black">Activity Log</h3>
        {history.activity_log.length === 0 ? (
          <p className="text-sm text-bodydark">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {history.activity_log.map(log => {
              const meta = ACTION_META[log.action] || { label: log.action, cls: 'bg-bodydark/10 text-bodydark' };
              const ts = new Date(log.created_at);
              return (
                <div key={log.id} className="flex gap-3 rounded-sm border border-stroke bg-white p-3">
                  <div className="mt-0.5 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-black font-medium">{log.user_name || 'Unknown user'}</p>
                    {log.remarks && <p className="text-xs text-bodydark mt-0.5">{log.remarks}</p>}
                    {log.changes && log.action === 'modified' && (
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(log.changes).map(([field, diff]) => (
                          <li key={field} className="text-xs text-bodydark">
                            <span className="font-medium text-black">{field}:</span>{' '}
                            <span className="line-through text-danger">{diff.old ?? '—'}</span>
                            {' → '}
                            <span className="text-meta-3">{diff.new ?? '—'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-bodydark">{ts.toLocaleDateString()}</p>
                    <p className="text-xs text-bodydark">{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuotationFormPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(!!id && id !== 'new');
  const [copying, setCopying] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyRemarks, setCopyRemarks] = useState('');

  const activeTab = searchParams.get('tab') || 'form';

  useEffect(() => {
    if (id && id !== 'new') {
      salesApi.getQuotation(id).then(r => { setDoc(r.data); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [id]);

  async function handleCopy() {
    if (!id) return;
    setCopying(true);
    try {
      const r = await salesApi.copyQuotation(id, { remarks: copyRemarks || undefined });
      toast.success(`Created ${r.data.quote_no} as a draft copy`);
      setShowCopyModal(false);
      setCopyRemarks('');
      navigate(`/sales/quotations/${r.data.id}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to copy');
    } finally { setCopying(false); }
  }

  if (loading) return <div className="p-8 text-center text-bodydark">Loading…</div>;

  const isExisting = !!id && id !== 'new';

  return (
    <div>
      {/* Top bar with Copy button and tabs (only for existing quotations) */}
      {isExisting && doc && (
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-black">{doc.quote_no}</h2>
              {doc.parent_id && (
                <p className="text-xs text-bodydark mt-0.5">
                  Copied from a previous quotation
                  {doc.revision_remarks ? ` — ${doc.revision_remarks}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCopyModal(true)}
              className="rounded bg-warning px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90">
              Copy Quotation
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-stroke">
            {[
              { key: 'form', label: 'Details' },
              { key: 'history', label: 'Version History' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSearchParams(tab.key === 'form' ? {} : { tab: tab.key })}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-bodydark hover:text-black'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'form' || !isExisting ? (
        <DocumentForm docType="quotation" existing={doc} />
      ) : (
        <div className="p-6">
          <VersionHistory quotationId={id} />
        </div>
      )}

      {/* Copy modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-base font-semibold text-black">Copy Quotation</h3>
            <p className="mb-4 text-sm text-bodydark">
              Creates a new draft revision of <span className="font-medium text-black">{doc?.quote_no}</span>.
              All line items, customer details, terms, and taxes will be copied.
            </p>
            <label className="mb-1 block text-xs font-medium text-black">Revision Remarks (optional)</label>
            <textarea
              value={copyRemarks}
              onChange={e => setCopyRemarks(e.target.value)}
              placeholder="e.g. Updated pricing for Q3"
              rows={3}
              className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowCopyModal(false); setCopyRemarks(''); }}
                className="rounded border border-stroke px-4 py-1.5 text-sm text-bodydark hover:text-black">
                Cancel
              </button>
              <button
                onClick={handleCopy}
                disabled={copying}
                className="rounded bg-warning px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
                {copying ? 'Creating…' : 'Create Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

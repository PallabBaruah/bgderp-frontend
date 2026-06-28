import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { documentSeriesApi } from '../../api/client';

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: 'quotation',    label: 'Quotation',         defaultPrefix: 'QUO' },
  { value: 'pi',           label: 'Proforma Invoice',  defaultPrefix: 'PI'  },
  { value: 'invoice',      label: 'Sales Invoice',     defaultPrefix: 'INV' },
  { value: 'challan',      label: 'Delivery Challan',  defaultPrefix: 'DC'  },
  { value: 'po',           label: 'Purchase Order',    defaultPrefix: 'PO'  },
  { value: 'sales_return', label: 'Sales Return',      defaultPrefix: 'SR'  },
];

const SEPARATORS = ['/', '-', '_', ''];

const CURRENT_FY_START = (() => {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
})();

function fyCode(startYear) {
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

function buildFyOptions() {
  const opts = [];
  for (let y = CURRENT_FY_START - 1; y <= CURRENT_FY_START + 2; y++) {
    opts.push({ value: y, label: `FY ${fyCode(y)} (${y}–${y + 1})` });
  }
  return opts;
}

const FY_OPTIONS = buildFyOptions();

const STATUS = {
  active:   { label: 'Active',   cls: 'bg-meta-3/10 text-meta-3' },
  inactive: { label: 'Inactive', cls: 'bg-gray-1 text-bodydark'  },
};

const DOC_LABEL = Object.fromEntries(DOC_TYPES.map(d => [d.value, d.label]));

// ── Blank form ────────────────────────────────────────────────────────────────

const BLANK = {
  doc_type: 'quotation',
  prefix: 'QUO',
  fy_start_year: CURRENT_FY_START,
  separator: '/',
  padding: 5,
  start_number: 1,
  is_active: true,
  reset_on_new_fy: true,
};

// ── Preview ───────────────────────────────────────────────────────────────────

function previewFormat({ prefix, separator, fy_start_year, padding, start_number }) {
  const fy = fyCode(fy_start_year);
  const n  = String(start_number || 1).padStart(padding || 5, '0');
  const sep = separator ?? '/';
  return `${prefix || '???'}${sep}${fy}${sep}${n}`;
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────

function SeriesModal({ series, onClose, onSaved }) {
  const isEdit = !!series?.id;
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          doc_type:      series.doc_type,
          prefix:        series.prefix,
          fy_start_year: series.fy_start_year,
          separator:     series.separator,
          padding:       series.padding,
          start_number:  series.start_number,
          is_active:     series.is_active,
          reset_on_new_fy: series.reset_on_new_fy,
        }
      : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => {
      const next = { ...p, [k]: k === 'padding' || k === 'start_number' || k === 'fy_start_year' ? Number(v) : v };
      // Auto-set prefix when doc_type changes
      if (k === 'doc_type' && !isEdit) {
        const dt = DOC_TYPES.find(d => d.value === v);
        next.prefix = dt?.defaultPrefix || '';
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.prefix.trim()) { toast.error('Prefix required'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const patch = {
          prefix: form.prefix.trim().toUpperCase(),
          separator: form.separator,
          padding: form.padding,
          start_number: form.start_number,
          is_active: form.is_active,
          reset_on_new_fy: form.reset_on_new_fy,
        };
        const res = await documentSeriesApi.update(series.id, patch);
        onSaved(res.data);
        toast.success('Series updated');
      } else {
        const res = await documentSeriesApi.create({
          ...form,
          prefix: form.prefix.trim().toUpperCase(),
        });
        onSaved(res.data);
        toast.success('Series created');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const preview = previewFormat(form);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-sm border border-stroke bg-white shadow-default">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
          <div>
            <h3 className="text-base font-semibold text-black">
              {isEdit ? 'Edit Series' : 'New Document Series'}
            </h3>
            {isEdit && (
              <p className="text-xs text-bodydark mt-0.5">
                {DOC_LABEL[series.doc_type]} · FY {series.fy_code}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-bodydark hover:text-black">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Preview banner */}
          <div className="rounded bg-primary/5 border border-primary/20 px-4 py-3 text-center">
            <p className="text-xs text-bodydark mb-1">Generated format preview</p>
            <p className="text-xl font-bold text-primary tracking-wider font-mono">{preview}</p>
          </div>

          {/* Document Type + FY */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Document Type *</label>
              <select value={form.doc_type} onChange={set('doc_type')} disabled={isEdit}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white disabled:bg-gray-1 disabled:text-bodydark">
                {DOC_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Financial Year *</label>
              <select value={form.fy_start_year} onChange={set('fy_start_year')} disabled={isEdit}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white disabled:bg-gray-1 disabled:text-bodydark">
                {FY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prefix + Separator */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Prefix *</label>
              <input type="text" value={form.prefix} onChange={set('prefix')}
                maxLength={10} placeholder="e.g. QUO"
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary uppercase font-mono" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Separator</label>
              <select value={form.separator} onChange={set('separator')}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
                <option value="/">/  (slash)</option>
                <option value="-">-  (dash)</option>
                <option value="_">_  (underscore)</option>
                <option value="">   (none)</option>
              </select>
            </div>
          </div>

          {/* Padding + Start Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Number Digits (padding)</label>
              <select value={form.padding} onChange={set('padding')}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
                {[3,4,5,6].map(n => (
                  <option key={n} value={n}>{n} digits  (e.g. {'0'.repeat(n - 1)}1)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Starting Number</label>
              <input type="number" min="1" value={form.start_number} onChange={set('start_number')}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              {isEdit && series.current_number > 0 && (
                <p className="text-[11px] text-warning mt-1">
                  ⚠ {series.current_number} numbers already issued — change only if resetting
                </p>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_active} onChange={set('is_active')}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium text-black">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.reset_on_new_fy} onChange={set('reset_on_new_fy')}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-black">Reset on new FY</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stroke">
          <button onClick={onClose}
            className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Series'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit Log Modal ───────────────────────────────────────────────────────────

function AuditModal({ series, onClose }) {
  const log = [...(series.audit_log || [])].reverse();
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-sm border border-stroke bg-white shadow-default max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke flex-shrink-0">
          <h3 className="font-semibold text-black">
            Audit Log — {DOC_LABEL[series.doc_type]} / {series.fy_code}
          </h3>
          <button onClick={onClose} className="text-bodydark hover:text-black">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          {log.length === 0 ? (
            <p className="text-sm text-bodydark text-center py-8">No audit entries</p>
          ) : (
            <div className="space-y-3">
              {log.map((entry, i) => (
                <div key={i} className="rounded border border-stroke p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.action === 'created' ? 'bg-meta-3/10 text-meta-3' :
                      entry.action === 'activated' ? 'bg-primary/10 text-primary' :
                      entry.action === 'deactivated' ? 'bg-meta-1/10 text-meta-1' :
                      'bg-meta-6/10 text-meta-6'
                    }`}>
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-bodydark">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-IN') : ''}
                    </span>
                  </div>
                  {entry.changes && Object.entries(entry.changes).map(([field, chg]) => (
                    <p key={field} className="text-xs text-bodydark mt-1">
                      <span className="font-medium text-black">{field}</span>:
                      {' '}<span className="line-through text-meta-1">{String(chg.from)}</span>
                      {' → '}<span className="text-meta-3">{String(chg.to)}</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DocumentSeries() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | seriesObj
  const [auditModal, setAuditModal] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await documentSeriesApi.list();
      const data = r.data;
      setSeries(Array.isArray(data) ? data : (data?.items ?? data?.results ?? []));
    } catch { toast.error('Failed to load series'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSaved = (updated) => {
    setSeries(p => {
      const exists = p.find(s => s.id === updated.id);
      return exists ? p.map(s => s.id === updated.id ? updated : s) : [updated, ...p];
    });
  };

  const handleToggle = async (s) => {
    setToggling(s.id);
    try {
      const fn = s.is_active ? documentSeriesApi.deactivate : documentSeriesApi.activate;
      const res = await fn(s.id);
      setSeries(p => p.map(x => x.id === s.id ? res.data : x));
      toast.success(s.is_active ? 'Series deactivated' : 'Series activated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setToggling(null);
    }
  };

  // Group by FY
  const grouped = (Array.isArray(series) ? series : []).reduce((acc, s) => {
    const key = `FY ${s.fy_code}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">Document Numbering</h2>
          <p className="text-sm text-bodydark mt-0.5">
            Configure financial-year-wise auto-numbering for all transaction documents
          </p>
        </div>
        <button onClick={() => setModal('create')}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          + New Series
        </button>
      </div>

      {/* Info card */}
      <div className="rounded-sm border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-black">
        <p className="font-medium mb-1">How it works</p>
        <p className="text-bodydark text-xs">
          When a series is <strong>active</strong> for the current financial year, all new documents of that type
          automatically use the configured format (e.g. <span className="font-mono font-medium">QUO/26-27/00001</span>).
          If no active series exists, the system falls back to the legacy format. Each tenant has its own independent series.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-bodydark text-sm">Loading…</div>
      ) : series.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white py-16 text-center shadow-default">
          <p className="text-bodydark text-sm mb-3">No series configured yet.</p>
          <button onClick={() => setModal('create')}
            className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark">
            Create First Series
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([fyLabel, items]) => (
          <div key={fyLabel} className="rounded-sm border border-stroke bg-white shadow-default">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-stroke">
              <span className="text-sm font-semibold text-black">{fyLabel}</span>
              {fyLabel.includes(fyCode(CURRENT_FY_START)) && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Current FY
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-1">
                  <tr>
                    {['Document Type','Format','Prefix','Start No.','Current No.','Next Preview','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-bodydark uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {items.map(s => {
                    const statusMeta = STATUS[s.is_active ? 'active' : 'inactive'];
                    return (
                      <tr key={s.id} className="hover:bg-gray-1 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-black">{DOC_LABEL[s.doc_type] || s.doc_type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-1 border border-stroke rounded px-2 py-0.5">
                            {s.prefix}{s.separator}{s.fy_code}{s.separator}{'0'.repeat(s.padding - 1)}1
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">{s.prefix}</td>
                        <td className="px-4 py-3 text-bodydark">{s.start_number}</td>
                        <td className="px-4 py-3">
                          <span className={s.current_number > 0 ? 'text-black font-medium' : 'text-bodydark'}>
                            {s.current_number > 0 ? s.current_number : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-primary font-medium">{s.next_preview}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.cls}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModal(s)}
                              className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-primary hover:border-primary transition-colors">
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggle(s)}
                              disabled={toggling === s.id}
                              className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                                s.is_active
                                  ? 'border-meta-1/30 text-meta-1 hover:bg-meta-1/5'
                                  : 'border-meta-3/30 text-meta-3 hover:bg-meta-3/5'
                              }`}>
                              {toggling === s.id ? '…' : s.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => setAuditModal(s)}
                              className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:text-black transition-colors"
                              title="View audit log">
                              Log
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Quick setup helper — show doc types missing for current FY */}
      {!loading && (() => {
        const configured = new Set(
          series.filter(s => s.fy_start_year === CURRENT_FY_START).map(s => s.doc_type)
        );
        const missing = DOC_TYPES.filter(d => !configured.has(d.value));
        if (missing.length === 0) return null;
        return (
          <div className="rounded-sm border border-stroke bg-white p-5 shadow-default">
            <p className="text-sm font-medium text-black mb-3">
              Quick Setup — Missing series for current FY ({fyCode(CURRENT_FY_START)})
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.map(d => (
                <button key={d.value}
                  onClick={() => setModal({ doc_type: d.value, prefix: d.defaultPrefix,
                    fy_start_year: CURRENT_FY_START, separator: '/', padding: 5,
                    start_number: 1, is_active: true, reset_on_new_fy: true })}
                  className="rounded border border-stroke px-3 py-1.5 text-xs text-bodydark hover:border-primary hover:text-primary transition-colors">
                  + {d.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Modals */}
      {modal && modal !== 'create' && !modal.id && (
        <SeriesModal series={modal} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {(modal === 'create' || modal?.id) && (
        <SeriesModal
          series={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {auditModal && (
        <AuditModal series={auditModal} onClose={() => setAuditModal(null)} />
      )}
    </div>
  );
}

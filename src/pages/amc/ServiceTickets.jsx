import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { serviceApi, employeeApi } from '../../api/client';

const STATUS_META = {
  open:        { label: 'Open',        color: 'bg-meta-6/10 text-meta-6' },
  in_progress: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
  assigned:    { label: 'Assigned',    color: 'bg-meta-5/10 text-meta-5' },
  resolved:    { label: 'Resolved',    color: 'bg-meta-3/10 text-meta-3' },
  closed:      { label: 'Closed',      color: 'bg-meta-9 text-bodydark' },
};
const SEVERITY_META = {
  critical: 'bg-meta-1/15 text-meta-1',
  high:     'bg-meta-1/10 text-meta-1',
  medium:   'bg-meta-6/10 text-meta-6',
  low:      'bg-meta-3/10 text-meta-3',
};

const BLANK = { customer_name: '', customer_phone: '', issue_description: '', issue_category: '', priority: 'medium' };

const normalize = (t) => ({
  ...t,
  ticket_no: t.ticket_number ?? '',
  customer:  t.customer_name ?? '',
  issue:     t.issue_description ?? '',
  severity:  t.priority ?? 'medium',
  reported:  t.created_at ? String(t.created_at).split('T')[0] : '',
});

export default function ServiceTickets() {
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [employees, setEmployees]   = useState([]);
  const [filter, setFilter]         = useState('all');
  const [modal, setModal]           = useState(false);
  const [assignModal, setAssignModal] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);
  const [form, setForm]             = useState(BLANK);
  const [assigneeId, setAssigneeId] = useState('');
  const [resolution, setResolution] = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    load();
    employeeApi.list({ limit: 100, status: 'active' }).then(r => setEmployees(r.data?.items ?? r.data ?? [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await serviceApi.list({ limit: 100 });
      const items = (res.data?.results ?? res.data?.items ?? res.data ?? []).map(normalize);
      setTickets(items);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleCreate() {
    if (!form.customer_name || !form.issue_description) { toast.error('Customer and issue required'); return; }
    setSaving(true);
    try {
      const res = await serviceApi.create(form);
      setTickets(p => [normalize(res.data), ...p]);
      setModal(false);
      setForm(BLANK);
      toast.success('Ticket created');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed'); }
    finally { setSaving(false); }
  }

  async function handleAssign() {
    if (!assigneeId) { toast.error('Select engineer'); return; }
    setSaving(true);
    try {
      const res = await serviceApi.assign(assignModal, { assigned_to: assigneeId });
      setTickets(p => p.map(t => t.id === assignModal ? normalize(res.data) : t));
      setAssignModal(null);
      setAssigneeId('');
      toast.success('Ticket assigned');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Assign failed'); }
    finally { setSaving(false); }
  }

  async function handleResolve() {
    setSaving(true);
    try {
      const res = await serviceApi.close(resolveModal, { resolution_notes: resolution });
      setTickets(p => p.map(t => t.id === resolveModal ? normalize(res.data) : t));
      setResolveModal(null);
      setResolution('');
      toast.success('Ticket closed');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Close failed'); }
    finally { setSaving(false); }
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const counts = Object.keys(STATUS_META).reduce((acc, s) => ({ ...acc, [s]: tickets.filter(t => t.status === s).length }), {});

  const empName = (id) => {
    if (!id) return null;
    const e = employees.find(e => e.id === id);
    return e ? e.full_name : id.slice(0,8) + '…';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Service Tickets</h2>
          <p className="text-sm text-bodydark">{counts.open || 0} open · {tickets.filter(t => !t.assigned_to && !['resolved','closed'].includes(t.status)).length} unassigned</p>
        </div>
        <button onClick={() => setModal(true)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ New Ticket</button>
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
        {Object.entries(STATUS_META).map(([s, m]) => (
          <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)} className={`rounded-sm border p-3 text-left transition-all ${filter === s ? 'border-primary bg-primary/5' : 'border-stroke bg-white shadow-default hover:bg-gray-1'}`}>
            <div className={`text-xl font-bold mb-0.5 ${m.color.split(' ')[1]}`}>{counts[s] || 0}</div>
            <div className="text-xs text-bodydark">{m.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : (
        <div className="table-responsive">
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Ticket #','Customer / Product','Issue','Priority','Assigned To','Status','Reported','Actions'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {filtered.length === 0
                ? <tr><td colSpan={8} className="py-10 text-center text-sm text-bodydark">No tickets found</td></tr>
                : filtered.map(t => {
                  const statusM = STATUS_META[t.status] || STATUS_META.open;
                  const sevM = SEVERITY_META[t.severity] || SEVERITY_META.medium;
                  return (
                    <tr key={t.id} className="hover:bg-gray-1">
                      <td className="px-5 py-4">
                        <Link to={`/amc/tickets/${t.id}`} className="font-mono text-sm font-medium text-primary hover:underline">{t.ticket_no}</Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-black">{t.customer}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-black max-w-[200px] truncate">{t.issue}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sevM}`}>{t.severity}</span></td>
                      <td className="px-5 py-4 text-sm text-bodydark">
                        {t.assigned_to ? empName(t.assigned_to) : <span className="text-meta-1 text-xs">Unassigned</span>}
                      </td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusM.color}`}>{statusM.label}</span></td>
                      <td className="px-5 py-4 text-sm text-bodydark">{t.reported}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/amc/tickets/${t.id}`} className="text-xs text-primary hover:underline">View</Link>
                          {['open','assigned','in_progress'].includes(t.status) && (
                            <button onClick={() => { setAssignModal(t.id); setAssigneeId(t.assigned_to || ''); }} className="text-xs text-meta-5 hover:underline">Assign</button>
                          )}
                          {['assigned','in_progress','open'].includes(t.status) && (
                            <button onClick={() => setResolveModal(t.id)} className="text-xs text-meta-3 hover:underline">Close</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Create Service Ticket</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Customer Name *" value={form.customer_name} onChange={set('customer_name')} placeholder="Customer Ltd" />
                <F label="Customer Phone" value={form.customer_phone} onChange={set('customer_phone')} placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Issue Description *</label>
                <textarea value={form.issue_description} onChange={set('issue_description')} rows={3} placeholder="Describe the problem in detail…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Priority</label>
                  <select value={form.priority} onChange={set('priority')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {['critical','high','medium','low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <F label="Issue Category" value={form.issue_category} onChange={set('issue_category')} placeholder="Hardware / Software" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Creating…' : 'Create Ticket'}</button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Assign Ticket</h3>
              <button onClick={() => setAssignModal(null)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-bodydark mb-1.5">Select Engineer</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                <option value="">— Select —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setAssignModal(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleAssign} disabled={saving} className="rounded bg-meta-5 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">Assign</button>
            </div>
          </div>
        </div>
      )}

      {resolveModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Close Ticket</h3>
              <button onClick={() => setResolveModal(null)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-bodydark mb-1.5">Resolution Notes</label>
              <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={4} placeholder="Describe the resolution…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setResolveModal(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleResolve} disabled={saving} className="rounded bg-meta-3 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-60">{saving ? 'Closing…' : 'Close Ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, type='text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
    </div>
  );
}

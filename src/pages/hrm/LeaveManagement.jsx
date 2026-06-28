import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { leaveApi } from '../../api/client';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BAL_COLORS = [
  'bg-primary', 'bg-meta-3', 'bg-meta-5', 'bg-meta-6', 'bg-meta-8', 'bg-meta-1',
];

const STATUS_META = {
  pending:   { label: 'Pending',   color: 'bg-meta-6/10 text-meta-6' },
  approved:  { label: 'Approved',  color: 'bg-meta-3/10 text-meta-3' },
  rejected:  { label: 'Rejected',  color: 'bg-meta-1/10 text-meta-1' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-2 text-bodydark' },
};

const fmt = (d) => d ? String(d).slice(0, 10) : '—';

export default function LeaveManagement() {
  const now = new Date();
  const [tab, setTab] = useState('apply');

  // leave types
  const [leaveTypes, setLeaveTypes]   = useState([]);

  // apply form
  const [form, setForm]   = useState({ leave_type_id: '', from_date: '', to_date: '', reason: '' });
  const [applying, setApplying] = useState(false);

  // balances
  const [balances, setBalances]       = useState([]);
  const [balLoading, setBalLoading]   = useState(false);

  // my leaves
  const [myLeaves, setMyLeaves]       = useState([]);
  const [myLoading, setMyLoading]     = useState(false);
  const [myFilter, setMyFilter]       = useState('all');

  // approvals
  const [approvals, setApprovals]     = useState([]);
  const [appLoading, setAppLoading]   = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // calendar
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calData, setCalData]   = useState([]);
  const [calLoading, setCalLoading] = useState(false);

  // load types + balances on mount
  useEffect(() => {
    loadTypes();
    loadBalances();
  }, []);

  useEffect(() => {
    if (tab === 'my')       loadMyLeaves();
    if (tab === 'approval') loadApprovals();
    if (tab === 'balances') loadBalances();
    if (tab === 'calendar') loadCalendar();
  }, [tab]);

  useEffect(() => {
    if (tab === 'calendar') loadCalendar();
  }, [calYear, calMonth]);

  async function loadTypes() {
    try {
      const res = await leaveApi.types();
      const types = res.data ?? [];
      setLeaveTypes(types);
      if (types.length && !form.leave_type_id) {
        setForm(p => ({ ...p, leave_type_id: types[0].id }));
      }
    } catch { /* non-critical */ }
  }

  async function loadBalances() {
    setBalLoading(true);
    try {
      const res = await leaveApi.balance();
      setBalances(res.data ?? []);
    } catch { toast.error('Failed to load balances'); }
    finally { setBalLoading(false); }
  }

  async function loadMyLeaves() {
    setMyLoading(true);
    try {
      const res = await leaveApi.requests();
      setMyLeaves(res.data ?? []);
    } catch { toast.error('Failed to load leave history'); }
    finally { setMyLoading(false); }
  }

  async function loadApprovals() {
    setAppLoading(true);
    try {
      const res = await leaveApi.requests({ status: 'pending' });
      setApprovals(res.data ?? []);
    } catch { toast.error('Failed to load approvals'); }
    finally { setAppLoading(false); }
  }

  async function loadCalendar() {
    setCalLoading(true);
    try {
      const res = await leaveApi.calendar(calMonth, calYear);
      setCalData(res.data ?? []);
    } catch { toast.error('Failed to load calendar'); }
    finally { setCalLoading(false); }
  }

  async function handleApply() {
    if (!form.leave_type_id || !form.from_date || !form.to_date || !form.reason) {
      toast.error('All fields required'); return;
    }
    if (form.to_date < form.from_date) { toast.error('End date must be after start date'); return; }
    setApplying(true);
    try {
      await leaveApi.apply(form);
      toast.success('Leave application submitted');
      setForm(p => ({ ...p, from_date: '', to_date: '', reason: '' }));
      loadBalances();
      setTab('my');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Submission failed'); }
    finally { setApplying(false); }
  }

  async function handleApprove(id) {
    try {
      await leaveApi.approve(id);
      toast.success('Leave approved');
      setApprovals(p => p.filter(l => l.id !== id));
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  }

  async function handleReject() {
    if (!rejectReason) { toast.error('Enter rejection reason'); return; }
    try {
      await leaveApi.reject(rejectModal, rejectReason);
      toast.success('Leave rejected');
      setApprovals(p => p.filter(l => l.id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  }

  async function handleCancel(id) {
    try {
      await leaveApi.cancel(id);
      toast.success('Leave cancelled');
      setMyLeaves(p => p.map(l => l.id === id ? { ...l, status: 'cancelled' } : l));
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  }

  function changeCalMonth(delta) {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setCalMonth(m);
    setCalYear(y);
  }

  // Derived
  const duration = form.from_date && form.to_date
    ? Math.max(1, Math.round((new Date(form.to_date) - new Date(form.from_date)) / 86400000) + 1)
    : null;

  const pendingCount = approvals.length;

  const filteredMyLeaves = myFilter === 'all'
    ? myLeaves
    : myLeaves.filter(l => l.status === myFilter);

  // Calendar grid
  const calDays   = new Date(calYear, calMonth, 0).getDate();
  const calOffset = new Date(calYear, calMonth - 1, 1).getDay();
  const calLabel  = new Date(calYear, calMonth - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // Build date→leaves map
  const calMap = {};
  calData.forEach(entry => {
    const start = new Date(entry.from_date);
    const end   = new Date(entry.to_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === calYear && d.getMonth() + 1 === calMonth) {
        const key = d.getDate();
        if (!calMap[key]) calMap[key] = [];
        calMap[key].push(entry);
      }
    }
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Leave Management</h2>
          <p className="text-sm text-bodydark">{pendingCount > 0 ? `${pendingCount} pending approval` : 'Manage employee leaves'}</p>
        </div>
        <button onClick={() => setTab('apply')} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          + Apply Leave
        </button>
      </div>

      <div className="tab-list">
        {[
          ['apply',    'Apply Leave'],
          ['my',       'My Leaves'],
          ['approval', `Approvals${pendingCount ? ` (${pendingCount})` : ''}`],
          ['balances', 'Leave Balances'],
          ['calendar', 'Calendar'],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {/* ── Apply Tab ──────────────────────────────────────────────── */}
      {tab === 'apply' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-sm border border-stroke bg-white shadow-default p-6">
            <h3 className="font-semibold text-black mb-5">Apply for Leave</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Leave Type</label>
                <select
                  value={form.leave_type_id}
                  onChange={e => setForm(p => ({ ...p, leave_type_id: e.target.value }))}
                  className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
                >
                  {leaveTypes.length === 0 && <option value="">Loading…</option>}
                  {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">From Date</label>
                  <input type="date" value={form.from_date} onChange={e => setForm(p => ({ ...p, from_date: e.target.value }))} className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">To Date</label>
                  <input type="date" value={form.to_date} onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))} className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary" />
                </div>
              </div>
              {duration && (
                <div className="rounded bg-primary/5 border border-primary/20 px-4 py-2 text-sm text-primary">
                  Duration: {duration} day(s)
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Reason / Remarks</label>
                <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={4} placeholder="Please provide the reason for leave…" className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setForm(p => ({ ...p, from_date: '', to_date: '', reason: '' }))} className="rounded border border-stroke bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-gray-1">Clear</button>
                <button onClick={handleApply} disabled={applying} className="rounded bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                  {applying ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </div>
          </div>

          {/* Balances sidebar */}
          <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
            <h3 className="font-semibold text-black mb-5">Your Leave Balances</h3>
            {balLoading ? (
              <div className="flex justify-center py-8"><span className="spinner" /></div>
            ) : balances.length === 0 ? (
              <p className="text-sm text-bodydark text-center py-4">No leave balances found</p>
            ) : (
              <div className="space-y-4">
                {balances.map((b, i) => {
                  const avail = Number(b.available) || 0;
                  const alloc = Number(b.allocated) || 0;
                  const pct   = alloc > 0 ? (avail / alloc) * 100 : 0;
                  return (
                    <div key={b.leave_type_id}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-black">{b.leave_type_name}</span>
                        <span className="font-semibold text-black">
                          {avail} <span className="text-bodydark font-normal">/ {alloc}</span>
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${BAL_COLORS[i % BAL_COLORS.length]}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My Leaves ──────────────────────────────────────────────── */}
      {tab === 'my' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">My Leave History</h3>
            <select value={myFilter} onChange={e => setMyFilter(e.target.value)} className="rounded border border-stroke px-3 py-1.5 text-sm text-black outline-none focus:border-primary">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {myLoading ? (
            <div className="flex justify-center py-12"><span className="spinner" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>{['Type', 'From', 'To', 'Days', 'Reason', 'Status', ''].map(h =>
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {filteredMyLeaves.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-sm text-bodydark text-center">No leave records found</td></tr>
                ) : filteredMyLeaves.map(l => {
                  const m = STATUS_META[l.status] || STATUS_META.pending;
                  return (
                    <tr key={l.id} className="hover:bg-gray-1">
                      <td className="px-5 py-3.5 text-sm text-black">{l.leave_type?.name ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-bodydark">{fmt(l.from_date)}</td>
                      <td className="px-5 py-3.5 text-sm text-bodydark">{fmt(l.to_date)}</td>
                      <td className="px-5 py-3.5 text-sm text-black text-center">{Number(l.days)}</td>
                      <td className="px-5 py-3.5 text-sm text-bodydark max-w-[180px] truncate">{l.reason}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${m.color}`}>{m.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {l.status === 'pending' && (
                          <button onClick={() => handleCancel(l.id)} className="text-xs text-meta-1 hover:underline">Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Approvals ──────────────────────────────────────────────── */}
      {tab === 'approval' && (
        <div className="space-y-4">
          {appLoading ? (
            <div className="flex justify-center py-12"><span className="spinner" /></div>
          ) : approvals.length === 0 ? (
            <div className="rounded-sm border border-stroke bg-white shadow-default p-12 text-center text-bodydark">
              <p className="text-lg font-medium text-black mb-1">All caught up!</p>
              <p className="text-sm">No pending leave approvals.</p>
            </div>
          ) : approvals.map(l => (
            <div key={l.id} className="rounded-sm border border-stroke bg-white shadow-default p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {String(l.employee_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-black">{l.leave_type?.name ?? 'Leave'}</div>
                    <div className="text-xs text-bodydark">Applied {fmt(l.created_at)}</div>
                  </div>
                </div>
                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-meta-6/10 text-meta-6">Pending</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded bg-gray-1 p-3">
                  <div className="text-xs text-bodydark mb-0.5">From</div>
                  <div className="font-medium text-black">{fmt(l.from_date)}</div>
                </div>
                <div className="rounded bg-gray-1 p-3">
                  <div className="text-xs text-bodydark mb-0.5">To</div>
                  <div className="font-medium text-black">{fmt(l.to_date)}</div>
                </div>
                <div className="rounded bg-gray-1 p-3">
                  <div className="text-xs text-bodydark mb-0.5">Days</div>
                  <div className="font-medium text-black">{Number(l.days)}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-bodydark italic">"{l.reason}"</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleApprove(l.id)} className="flex-1 rounded bg-meta-3 py-2 text-sm font-medium text-white hover:bg-opacity-90">✓ Approve</button>
                <button onClick={() => { setRejectModal(l.id); setRejectReason(''); }} className="flex-1 rounded bg-meta-1 py-2 text-sm font-medium text-white hover:bg-opacity-90">✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Balances Tab ───────────────────────────────────────────── */}
      {tab === 'balances' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Your Leave Balances</h3>
          </div>
          {balLoading ? (
            <div className="flex justify-center py-12"><span className="spinner" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>{['Leave Type', 'Code', 'Allocated', 'Used', 'Pending', 'Carry Fwd', 'Available'].map(h =>
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {balances.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-sm text-bodydark text-center">No balances found</td></tr>
                ) : balances.map(b => (
                  <tr key={b.leave_type_id} className="hover:bg-gray-1">
                    <td className="px-5 py-3.5 text-sm font-medium text-black">{b.leave_type_name}</td>
                    <td className="px-5 py-3.5 text-sm text-bodydark">{b.leave_type_code}</td>
                    <td className="px-5 py-3.5 text-sm text-black">{Number(b.allocated)}</td>
                    <td className="px-5 py-3.5 text-sm text-meta-1">{Number(b.used)}</td>
                    <td className="px-5 py-3.5 text-sm text-meta-6">{Number(b.pending)}</td>
                    <td className="px-5 py-3.5 text-sm text-bodydark">{Number(b.carried_forward)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-meta-3">{Number(b.available)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Calendar Tab ───────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-black">Leave Calendar</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => changeCalMonth(-1)} className="text-bodydark hover:text-primary px-2">‹</button>
              <span className="text-sm font-medium text-black w-36 text-center">{calLabel}</span>
              <button onClick={() => changeCalMonth(1)} className="text-bodydark hover:text-primary px-2">›</button>
            </div>
          </div>
          {calLoading ? (
            <div className="flex justify-center py-12"><span className="spinner" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {DAY_LABELS.map(d => <div key={d} className="text-xs font-medium text-bodydark py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(calOffset).fill(null).map((_, i) => <div key={'e' + i} />)}
                {Array.from({ length: calDays }, (_, i) => i + 1).map(day => {
                  const entries = calMap[day] ?? [];
                  return (
                    <div key={day} className={`rounded-lg p-1.5 min-h-[56px] border ${entries.length ? 'border-primary/30 bg-primary/5' : 'border-stroke'}`}>
                      <div className="text-xs font-semibold text-black mb-1">{day}</div>
                      {entries.slice(0, 2).map((e, i) => (
                        <div key={i} className="rounded text-[10px] bg-primary/10 text-primary px-1 py-0.5 truncate mb-0.5" title={e.leave_type}>
                          {e.leave_type}
                        </div>
                      ))}
                      {entries.length > 2 && (
                        <div className="text-[10px] text-bodydark">+{entries.length - 2} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Reject Modal ───────────────────────────────────────────── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Reject Leave</h3>
              <button onClick={() => setRejectModal(null)} className="text-bodydark hover:text-black">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-bodydark mb-1.5">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Please provide rejection reason…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setRejectModal(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleReject} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Reject Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

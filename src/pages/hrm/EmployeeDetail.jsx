import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { employeeApi, attendanceApi, leaveApi, payrollApi } from '../../api/client';

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtCur = (n) => `₹${fmt(n)}`;
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const firstDayOfMonth = (y, m) => new Date(y, m - 1, 1).getDay();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const STATUS_CLS = {
  present:  'bg-meta-3 text-white',
  late:     'bg-yellow-400 text-white',
  half_day: 'bg-yellow-200 text-yellow-800',
  absent:   'bg-meta-1 text-white',
  on_leave: 'bg-blue-400 text-white',
  wfh:      'bg-blue-200 text-blue-800',
  week_off: 'bg-gray-200 text-gray-500',
  holiday:  'bg-purple-200 text-purple-700',
};

// ── root component ────────────────────────────────────────────────────────────

export default function EmployeeDetail() {
  const { id } = useParams();
  const [emp, setEmp]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');
  const [editOpen, setEditOpen] = useState(false);

  const reload = () => {
    employeeApi.get(id).then(r => setEmp(r.data)).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    employeeApi.get(id)
      .then(r => setEmp(r.data))
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><span className="spinner" /></div>;
  if (!emp) return <div className="text-center py-24 text-bodydark">Employee not found.</div>;

  const name     = emp.contact?.name ?? emp.full_name ?? '—';
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const profile  = emp.profile ?? {};
  const address  = [
    profile.present_address?.street,
    profile.present_address?.city,
    profile.present_address?.state,
    profile.present_address?.pincode,
  ].filter(Boolean).join(', ') || '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/hrm/employees" className="hover:text-primary">Employees</Link>
        <span>/</span>
        <span className="text-black font-medium">{name}</span>
      </div>

      {/* Profile banner */}
      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="h-32 bg-gradient-to-r from-primary to-primary-dark rounded-t-sm" />
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end gap-4 -mt-12 mb-5">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-card flex items-center justify-center text-primary text-2xl font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-black">{name}</h2>
              <p className="text-sm text-bodydark">
                {emp.designation?.name ?? '—'} · {emp.department?.name ?? '—'}
                {emp.branch && <> · <span className="text-primary font-medium">{emp.branch.name}</span></>}
              </p>
            </div>
            <div className="flex gap-2 pb-1">
              <Link to="/hrm/employees" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">
                ← Back
              </Link>
              <button onClick={() => setEditOpen(true)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">
                Edit Profile
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            {emp.contact?.email   && <InfoPill icon="✉" label={emp.contact.email} />}
            {emp.contact?.phone   && <InfoPill icon="📱" label={emp.contact.phone} />}
            {emp.branch           && <InfoPill icon="🏢" label={emp.branch.name} />}
            <InfoPill icon="📅" label={`Joined ${emp.date_of_joining}`} />
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${emp.status === 'active' ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-1/10 text-meta-1'}`}>
              {emp.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        {['overview','attendance','leaves','payroll','documents'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'active' : ''}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview'    && <OverviewTab emp={emp} profile={profile} address={address} />}
      {tab === 'attendance'  && <AttendanceTab empId={id} />}
      {tab === 'leaves'      && <LeavesTab empId={id} />}
      {tab === 'payroll'     && <PayrollTab empId={id} />}
      {tab === 'documents'   && <DocumentsTab empId={id} />}

      {editOpen && (
        <EditEmployeeModal
          emp={emp}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({ emp, profile, address }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <InfoCard title="Personal Information">
        <Row label="Employee Code"    value={emp.employee_code} />
        <Row label="Gender"           value={profile.gender ?? '—'} />
        <Row label="Blood Group"      value={profile.blood_group ?? '—'} />
        <Row label="Date of Birth"    value={profile.dob ?? '—'} />
        <Row label="Address"          value={address} />
        <Row label="Emergency Contact" value={
          typeof profile.emergency_contact === 'object'
            ? profile.emergency_contact?.phone ?? '—'
            : profile.emergency_contact ?? '—'
        } />
        <Row label="PAN"              value={profile.pan ?? '—'} />
      </InfoCard>

      <InfoCard title="Employment Details">
        <Row label="Department"       value={emp.department?.name ?? '—'} />
        <Row label="Designation"      value={emp.designation?.name ?? '—'} />
        <Row label="Branch / Office"  value={emp.branch?.name ?? '—'} />
        <Row label="Employment Type"  value={emp.employment_type ?? '—'} />
        <Row label="Date Joined"      value={emp.date_of_joining ?? '—'} />
        {emp.date_of_confirmation && <Row label="Confirmed On" value={emp.date_of_confirmation} />}
      </InfoCard>
    </div>
  );
}

// ── Attendance ────────────────────────────────────────────────────────────────

function AttendanceTab({ empId }) {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [logs, setLogs]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regDay, setRegDay]   = useState(null); // dateStr to regularise

  const loadData = () => {
    setLoading(true);
    Promise.all([
      attendanceApi.monthly(year, month, empId),
      attendanceApi.summary(year, month, empId),
    ]).then(([lr, sr]) => {
      const raw = lr.data ?? [];
      setLogs(raw.map(l => ({ ...l, log_date: String(l.date ?? l.log_date) })));
      setSummary(sr.data);
    }).catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, [year, month, empId]);

  const logMap = {};
  logs.forEach(l => { logMap[l.log_date] = l; });

  const days   = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => {
    const n = new Date(); if (year === n.getFullYear() && month === n.getMonth() + 1) return;
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  };

  const STAT_ITEMS = [
    { k: 'present_days',  label: 'Present',  cls: 'text-meta-3' },
    { k: 'absent_days',   label: 'Absent',   cls: 'text-meta-1' },
    { k: 'late_days',     label: 'Late',     cls: 'text-yellow-500' },
    { k: 'half_days',     label: 'Half Day', cls: 'text-yellow-600' },
    { k: 'on_leave_days', label: 'On Leave', cls: 'text-blue-500' },
    { k: 'lop_days',      label: 'LOP',      cls: 'text-meta-1' },
    { k: 'working_days',  label: 'Working',  cls: 'text-black' },
    { k: 'holidays',      label: 'Holidays', cls: 'text-purple-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Month picker */}
      <div className="rounded-sm border border-stroke bg-white shadow-default p-4 flex items-center gap-3">
        <button onClick={prevMonth} className="p-1.5 rounded border border-stroke hover:bg-gray-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="text-sm font-semibold text-black w-32 text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 rounded border border-stroke hover:bg-gray-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {loading ? <div className="py-16 text-center text-bodydark text-sm">Loading…</div> : (
        <>
          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {STAT_ITEMS.map(({ k, label, cls }) => (
                <div key={k} className="rounded border border-stroke bg-white p-3 text-center shadow-default">
                  <div className={`text-2xl font-bold ${cls}`}>{summary[k] ?? 0}</div>
                  <div className="text-xs text-bodydark mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-bodydark">Click any day to regularise attendance</p>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => <div key={d} className="text-xs text-bodydark font-medium text-center py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: days }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const log = logMap[dateStr];
                const status = log?.status;
                const cls = STATUS_CLS[status] ?? 'bg-gray-100 text-gray-400';
                const tooltip = log
                  ? `${status} · ${log.check_in ? log.check_in.slice(11,16) : '—'} – ${log.check_out ? log.check_out.slice(11,16) : '—'}`
                  : 'Click to regularise';
                return (
                  <div key={day} title={tooltip}
                    onClick={() => setRegDay(dateStr)}
                    className={`text-xs font-medium rounded text-center py-1.5 cursor-pointer hover:ring-2 hover:ring-primary/60 hover:opacity-90 transition-all ${cls}`}>
                    {day}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-stroke">
              {Object.entries(STATUS_CLS).map(([k, cls]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${cls.split(' ')[0]}`} />
                  <span className="text-xs text-bodydark capitalize">{k.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day-wise timing table */}
          {logs.length > 0 && (
            <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
              <div className="px-5 py-3 border-b border-stroke">
                <h4 className="text-sm font-semibold text-black">Day-wise Attendance</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-1">
                    <tr>
                      {['Date','Day','Status','Check In','Check Out','Hours','Regularised','Action'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-xs font-semibold text-bodydark uppercase text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke">
                    {logs
                      .filter(l => l.check_in || l.is_regularised || ['present','late','half_day','wfh'].includes(l.status))
                      .slice()
                      .sort((a, b) => a.log_date.localeCompare(b.log_date))
                      .map(log => {
                        const d = new Date(log.log_date + 'T00:00:00');
                        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
                        const badgeCls = STATUS_CLS[log.status] ?? 'bg-gray-100 text-gray-500';
                        const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
                        const hrs = log.worked_hours ? `${Number(log.worked_hours).toFixed(1)}h` : '—';
                        return (
                          <tr key={log.log_date} className="hover:bg-gray-1">
                            <td className="px-4 py-2.5 text-sm text-black font-medium whitespace-nowrap">{log.log_date}</td>
                            <td className="px-4 py-2.5 text-xs text-bodydark">{dayName}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${badgeCls}`}>
                                {log.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-black font-mono whitespace-nowrap">{fmtTime(log.check_in)}</td>
                            <td className="px-4 py-2.5 text-sm text-black font-mono whitespace-nowrap">{fmtTime(log.check_out)}</td>
                            <td className="px-4 py-2.5 text-sm text-bodydark whitespace-nowrap">{hrs}</td>
                            <td className="px-4 py-2.5 text-xs">
                              {log.is_regularised
                                ? <span className="text-yellow-600 font-medium">Yes</span>
                                : <span className="text-bodydark-2">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <button onClick={() => setRegDay(log.log_date)}
                                className="text-xs text-primary hover:underline whitespace-nowrap">
                                Regularise
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {regDay && (
        <RegulariseModal
          empId={empId}
          dateStr={regDay}
          existingLog={logMap[regDay]}
          onClose={() => setRegDay(null)}
          onSaved={() => { setRegDay(null); loadData(); }}
        />
      )}
    </div>
  );
}

// ── Regularise Modal ──────────────────────────────────────────────────────────

function RegulariseModal({ empId, dateStr, existingLog, onClose, onSaved }) {
  const toTimeStr = (dt) => dt ? dt.slice(11, 16) : '';
  const [form, setForm] = useState({
    status:    existingLog?.status ?? 'present',
    check_in:  toTimeStr(existingLog?.check_in),
    check_out: toTimeStr(existingLog?.check_out),
    notes:     existingLog?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const STATUSES = ['present','late','half_day','absent','wfh','on_leave','week_off','holiday'];
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const toISO = (t) => t ? `${dateStr}T${t}:00` : null;
      await attendanceApi.manual({
        employee_id: empId,
        log_date:    dateStr,
        check_in:    toISO(form.check_in),
        check_out:   toISO(form.check_out),
        status:      form.status,
        notes:       form.notes || null,
      });
      toast.success(`Attendance regularised for ${dateStr}`);
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Regularisation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
          <div>
            <h2 className="text-base font-semibold text-black">Regularise Attendance</h2>
            <p className="text-xs text-bodydark mt-0.5">{dateStr}</p>
          </div>
          <button onClick={onClose} className="text-bodydark hover:text-black">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Status</label>
            <select value={form.status} onChange={set('status')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>

          {['present','late','half_day','wfh'].includes(form.status) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Check In</label>
                <input type="time" value={form.check_in} onChange={set('check_in')}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Check Out</label>
                <input type="time" value={form.check_out} onChange={set('check_out')}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Notes / Reason</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Reason for regularisation…"
              className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60">
              {saving ? 'Saving…' : 'Regularise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Leaves ────────────────────────────────────────────────────────────────────

function LeavesTab({ empId }) {
  const [balances, setBalances]   = useState([]);
  const [requests, setRequests]   = useState([]);
  const [typeMap, setTypeMap]     = useState({});
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      leaveApi.balance({ employee_id: empId }),
      leaveApi.requests({ employee_id: empId }),
      leaveApi.types(),
    ]).then(([br, rr, tr]) => {
      setBalances(br.data ?? []);
      setRequests(rr.data ?? []);
      const map = {};
      (tr.data ?? []).forEach(t => { map[t.id] = t.name; });
      setTypeMap(map);
    }).catch(() => toast.error('Failed to load leave data'))
      .finally(() => setLoading(false));
  }, [empId]);

  if (loading) return <div className="py-16 text-center text-bodydark text-sm">Loading…</div>;

  const statusCls = { approved: 'bg-meta-3/10 text-meta-3', pending: 'bg-yellow-100 text-yellow-700', rejected: 'bg-meta-1/10 text-meta-1', cancelled: 'bg-gray-100 text-gray-500' };

  return (
    <div className="space-y-5">
      {/* Balance */}
      <InfoCard title="Leave Balances">
        {balances.length === 0 ? (
          <p className="text-sm text-bodydark text-center py-4">No leave balances found.</p>
        ) : balances.map(b => {
          const pct = b.allocated > 0 ? Math.round((Number(b.available) / Number(b.allocated)) * 100) : 0;
          return (
            <div key={b.leave_type_id} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-black font-medium">{b.leave_type_name}</span>
                <span className="text-bodydark">{b.available} / {b.allocated} remaining</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-4 mt-1 text-xs text-bodydark">
                <span>Used: {b.used}</span>
                {Number(b.pending) > 0 && <span className="text-yellow-600">Pending: {b.pending}</span>}
              </div>
            </div>
          );
        })}
      </InfoCard>

      {/* Requests */}
      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="px-6 py-4 border-b border-stroke">
          <h3 className="font-medium text-black">Leave History</h3>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-bodydark text-sm">No leave requests found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Type','From','To','Days','Status'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm text-black">{typeMap[r.leave_type_id] ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{r.from_date}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{r.to_date}</td>
                  <td className="px-5 py-3.5 text-sm text-black">{r.days}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Payroll ───────────────────────────────────────────────────────────────────

function PayrollTab({ empId }) {
  const [payslips, setPayslips] = useState([]);
  const [runs, setRuns]         = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      payrollApi.payslips({ employee_id: empId }),
      payrollApi.runs(),
    ]).then(([pr, rr]) => {
      setPayslips(pr.data ?? []);
      const map = {};
      (rr.data ?? []).forEach(r => { map[r.id] = r; });
      setRuns(map);
    }).catch(() => toast.error('Failed to load payroll data'))
      .finally(() => setLoading(false));
  }, [empId]);

  if (loading) return <div className="py-16 text-center text-bodydark text-sm">Loading…</div>;

  const statusCls = { paid: 'bg-meta-3/10 text-meta-3', processed: 'bg-blue-100 text-blue-700', pending: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
      <div className="px-6 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">Payroll History</h3>
      </div>
      {payslips.length === 0 ? (
        <div className="p-8 text-center text-bodydark text-sm">No payroll records found.</div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Month','Gross','Deductions','Net Pay','Status','Payslip'].map(h => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {payslips.map(p => {
              const run = runs[p.run_id];
              const monthLabel = run?.run_month
                ? new Date(run.run_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                : '—';
              const totalDed = Object.values(p.deductions ?? {}).reduce((s, v) => s + Number(v), 0);
              const disburseStatus = run?.status === 'disbursed' ? 'paid' : run?.status ?? p.bank_transfer_status;
              return (
                <tr key={p.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm text-black font-medium">{monthLabel}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{fmtCur(p.gross)}</td>
                  <td className="px-5 py-3.5 text-sm text-meta-1">{fmtCur(totalDed)}</td>
                  <td className="px-5 py-3.5 text-sm text-black font-semibold">{fmtCur(p.net)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusCls[disburseStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {disburseStatus ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {p.payslip_url ? (
                      <a href={p.payslip_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Download</a>
                    ) : (
                      <span className="text-xs text-bodydark-2">Not generated</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────

function DocumentsTab({ empId }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [docType, setDocType] = useState('offer_letter');

  const load = () => {
    setLoading(true);
    employeeApi.getDocuments(empId)
      .then(r => setDocs(r.data ?? []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [empId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await employeeApi.uploadDocument(empId, file, docType);
      toast.success('Document uploaded');
      load();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const DOC_TYPES = [
    { value: 'offer_letter', label: 'Offer Letter' },
    { value: 'id_proof', label: 'ID Proof' },
    { value: 'pan_card', label: 'PAN Card' },
    { value: 'bank_details', label: 'Bank Details' },
    { value: 'resume', label: 'Resume' },
    { value: 'appraisal', label: 'Appraisal Letter' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">Employee Documents</h3>
        <div className="flex items-center gap-2">
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="rounded border border-stroke px-2 py-1.5 text-xs text-black outline-none focus:border-primary">
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-opacity-90 disabled:opacity-60">
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-bodydark text-sm">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="p-8 text-center text-bodydark text-sm">No documents uploaded yet.</div>
      ) : (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded border border-stroke hover:bg-gray-1">
              <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-black font-medium truncate">{doc.original_filename}</p>
                <p className="text-xs text-bodydark capitalize">{doc.doc_type?.replace(/_/g, ' ')} · {doc.file_size_kb ?? 0} KB</p>
              </div>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">View</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditEmployeeModal({ emp, onClose, onSaved }) {
  const profile = emp.profile ?? {};
  const [depts, setDepts]     = useState([]);
  const [desigs, setDesigs]   = useState([]);
  const [branches, setBranches] = useState([]);
  const [saving, setSaving]   = useState(false);

  const [form, setForm] = useState({
    full_name:       emp.contact?.name ?? '',
    phone:           emp.contact?.phone ?? '',
    department_id:   emp.department_id ?? '',
    designation_id:  emp.designation_id ?? '',
    branch_id:       emp.branch_id ?? '',
    employment_type: emp.employment_type ?? 'permanent',
    profile: {
      gender:        profile.gender ?? '',
      dob:           profile.dob ?? '',
      blood_group:   profile.blood_group ?? '',
      pan:           profile.pan ?? '',
      personal_email: profile.personal_email ?? '',
      personal_phone: profile.personal_phone ?? '',
      nationality:   profile.nationality ?? 'Indian',
    },
  });

  useEffect(() => {
    Promise.all([
      employeeApi.departments(),
      employeeApi.designations(),
      employeeApi.branches(),
    ]).then(([d, des, b]) => {
      setDepts(d.data ?? []);
      setDesigs(des.data ?? []);
      setBranches((b.data ?? []).filter(br => br.is_active));
    });
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setForm(f => ({ ...f, profile: { ...f.profile, [k]: e.target.value } }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error('Name required');
    setSaving(true);
    try {
      const nullify = (v) => (v === '' || v === null || v === undefined) ? null : v;
      const payload = {
        full_name:       form.full_name.trim(),
        phone:           nullify(form.phone),
        department_id:   nullify(form.department_id),
        designation_id:  nullify(form.designation_id),
        branch_id:       nullify(form.branch_id),
        employment_type: form.employment_type,
        profile: {
          gender:         nullify(form.profile.gender),
          dob:            nullify(form.profile.dob),
          blood_group:    nullify(form.profile.blood_group),
          pan:            nullify(form.profile.pan),
          personal_email: nullify(form.profile.personal_email),
          personal_phone: nullify(form.profile.personal_phone),
          nationality:    nullify(form.profile.nationality),
        },
      };
      await employeeApi.update(emp.id, payload);
      toast.success('Employee updated');
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
          <h2 className="text-base font-semibold text-black">Edit Employee</h2>
          <button onClick={onClose} className="text-bodydark hover:text-black">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <p className="text-xs font-semibold text-bodydark uppercase tracking-wide">Basic Info</p>
          <div className="grid grid-cols-2 gap-4">
            <FField label="Full Name *" value={form.full_name} onChange={set('full_name')} />
            <FField label="Phone" value={form.phone} onChange={set('phone')} />
          </div>

          <p className="text-xs font-semibold text-bodydark uppercase tracking-wide pt-1">Employment</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Department</label>
              <select value={form.department_id} onChange={set('department_id')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                <option value="">— Select —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Designation</label>
              <select value={form.designation_id} onChange={set('designation_id')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                <option value="">— Select —</option>
                {desigs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Branch / Office</label>
              <select value={form.branch_id} onChange={set('branch_id')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                <option value="">— Select —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Employment Type</label>
              <select value={form.employment_type} onChange={set('employment_type')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="part_time">Part Time</option>
              </select>
            </div>
          </div>

          <p className="text-xs font-semibold text-bodydark uppercase tracking-wide pt-1">Personal</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Gender</label>
              <select value={form.profile.gender} onChange={setP('gender')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                <option value="">— Select —</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <FField label="Date of Birth" type="date" value={form.profile.dob} onChange={setP('dob')} />
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Blood Group</label>
              <select value={form.profile.blood_group} onChange={setP('blood_group')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                {['','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g || '— Select —'}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FField label="PAN" value={form.profile.pan} onChange={setP('pan')} placeholder="ABCDE1234F" />
            <FField label="Personal Email" type="email" value={form.profile.personal_email} onChange={setP('personal_email')} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-stroke">
            <button type="button" onClick={onClose} className="rounded border border-stroke px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FField({ label, type = 'text', value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary disabled:bg-gray-1" />
    </div>
  );
}

// ── shared UI ─────────────────────────────────────────────────────────────────

function InfoCard({ title, children }) {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="px-6 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">{title}</h3>
      </div>
      <div className="p-6 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-bodydark flex-shrink-0">{label}</span>
      <span className="text-black font-medium text-right">{value}</span>
    </div>
  );
}

function InfoPill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-bodydark">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { StatusBadge } from '../components/Badge';
import { attendanceApi, employeeApi } from '../api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function Attendance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [monthly, setMonthly] = useState([]);
  const [summary, setSummary] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('calendar');

  const { user, roles } = useAuthStore();
  const isAdmin = user?.is_superadmin || roles?.includes('Admin') || roles?.includes('HR Manager') || user?.role === 'admin';

  // Regularisation
  const [regOpen, setRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({ log_date: '', reason: '', requested_check_in: '', requested_check_out: '' });
  const [regSaving, setRegSaving] = useState(false);

  // Manual Attendance (Admin)
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => { fetchAll(); }, [year, month]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mon, sum, tod] = await Promise.allSettled([
        attendanceApi.monthly(year, month),
        attendanceApi.summary(year, month),
        attendanceApi.today(),
      ]);
      if (mon.status === 'fulfilled') setMonthly(mon.value.data || []);
      if (sum.status === 'fulfilled') setSummary(sum.value.data);
      if (tod.status === 'fulfilled') setToday(tod.value.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handlePunch = async (type) => {
    try {
      if (type === 'in') await attendanceApi.punchIn({ source: 'web' });
      else await attendanceApi.punchOut({ source: 'web' });
      toast.success(type === 'in' ? 'Punched in!' : 'Punched out!');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    setRegSaving(true);
    try {
      await attendanceApi.regularise(regForm);
      toast.success('Regularisation submitted');
      setRegOpen(false);
      setRegForm({ log_date: '', reason: '', requested_check_in: '', requested_check_out: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setRegSaving(false);
    }
  };

  // Build calendar cells
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (firstDay + 6) % 7; // shift to Mon-start
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const rec = monthly.find((r) => r.date === dateStr || r.date?.startsWith(dateStr.substring(0, 10)));
    cells.push({ day: d, dateStr, rec });
  }

  const isToday = (dateStr) => dateStr === now.toISOString().slice(0, 10);
  const isFuture = (dateStr) => dateStr > now.toISOString().slice(0, 10);

  return (
    <>
      <TopBar title="Attendance">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setRegOpen(true)}>
            Regularise
          </button>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setManualOpen(true)}>
              + Manual Entry
            </button>
          )}
        </div>
      </TopBar>

      <div className="page-content">
        {/* Today Status */}
        {today && (
          <div className="card mb-24" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Today</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[['Check In', today.check_in], ['Check Out', today.check_out], ['Hours', today.worked_hours ? `${Number(today.worked_hours).toFixed(1)}h` : null]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                    {val ? (label !== 'Hours' ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : val) : '—'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {(!today.check_in || today.status === 'not_punched') && (
                <button className="btn btn-primary" onClick={() => handlePunch('in')}>Punch In</button>
              )}
              {today.check_in && !today.check_out && (
                <button className="btn btn-danger" onClick={() => handlePunch('out')}>Punch Out</button>
              )}
            </div>
          </div>
        )}

        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { const d = new Date(year, month - 2); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }}>‹</button>
          <span style={{ fontWeight: 600, fontSize: 15, minWidth: 120, textAlign: 'center' }}>{MONTHS[month - 1]} {year}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => { const d = new Date(year, month); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); }}>›</button>
          <div className="tabs" style={{ margin: '0 0 0 auto', borderBottom: 'none' }}>
            {(isAdmin ? ['calendar', 'list', 'report'] : ['calendar', 'list']).map((t) => (
              <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : tab === 'calendar' ? (
          <div className="card">
            {/* Day headers */}
            <div className="att-calendar" style={{ marginBottom: 8 }}>
              {DAYS.map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div className="att-calendar">
              {cells.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} />;
                const status = cell.rec?.status || (isFuture(cell.dateStr) ? 'future' : 'absent');
                return (
                  <div
                    key={cell.dateStr}
                    className={`att-day ${status} ${isToday(cell.dateStr) ? 'today' : ''} ${isFuture(cell.dateStr) ? 'future' : ''}`}
                    title={`${cell.dateStr}: ${status}`}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 11 }}>
              {[['present','Present'],['late','Late'],['half_day','Half Day'],['absent','Absent'],['on_leave','On Leave'],['holiday','Holiday'],['week_off','Week Off']].map(([s, l]) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div className={`att-day ${s}`} style={{ width: 20, height: 20, fontSize: 9, minWidth: 'unset', aspectRatio: 'unset' }} />
                  <span style={{ color: 'var(--text-2)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        ) : tab === 'list' ? (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Day</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {monthly.filter(r => !isFuture(r.date)).map((r) => (
                    <tr key={r.date}>
                      <td>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td className="td-muted">{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' })}</td>
                      <td>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{r.worked_hours ? `${Number(r.worked_hours).toFixed(1)}h` : '—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <AttendanceReport />
        )}

        {/* Summary Strip */}
        {summary && (
          <div className="stat-grid" style={{ marginTop: 16 }}>
            {[
              ['Present', summary.present_days, 'green'],
              ['Absent', summary.absent_days, 'red'],
              ['Late', summary.late_days, 'amber'],
              ['Half Day', summary.half_days, 'blue'],
              ['On Leave', summary.on_leave_days, 'indigo'],
              ['Overtime Hrs', Number(summary.overtime_hours).toFixed(1), 'green'],
            ].map(([label, val, color]) => (
              <div key={label} className="stat-card" style={{ padding: '14px 16px' }}>
                <div className={`stat-icon ${color}`} style={{ width: 36, height: 36 }}>
                  <span style={{ fontSize: 16 }}>{val}</span>
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regularisation Modal */}
      {regOpen && (
        <div className="modal-overlay" onClick={() => setRegOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Regularisation Request</h3>
              <button className="btn btn-ghost" onClick={() => setRegOpen(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleRegSubmit}>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={regForm.log_date} onChange={(e) => setRegForm(f => ({...f, log_date: e.target.value}))} required />
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Check In Time</label>
                  <input className="form-input" type="datetime-local" value={regForm.requested_check_in} onChange={(e) => setRegForm(f => ({...f, requested_check_in: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Check Out Time</label>
                  <input className="form-input" type="datetime-local" value={regForm.requested_check_out} onChange={(e) => setRegForm(f => ({...f, requested_check_out: e.target.value}))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason *</label>
                <textarea className="form-input" rows={3} value={regForm.reason} onChange={(e) => setRegForm(f => ({...f, reason: e.target.value}))} required style={{ resize: 'vertical' }} />
              </div>
            </form>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRegOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegSubmit} disabled={regSaving}>{regSaving ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {manualOpen && (
        <ManualAttendanceModal onClose={() => setManualOpen(false)} onAdded={() => { setManualOpen(false); fetchAll(); }} />
      )}
    </>
  );
}

function AttendanceReport() {
  const now = new Date();
  const [fromDate, setFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(now.toISOString().slice(0, 10));
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []); // eslint-disable-line

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.report({ from_date: fromDate, to_date: toDate });
      setReport(res.data || []);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">From Date</label>
          <input className="form-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">To Date</label>
          <input className="form-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Name</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {report.map((r) => (
              <tr key={r.id}>
                <td className="td-muted">{r.employee_code}</td>
                <td style={{ fontWeight: 500 }}>{r.employee_name}</td>
                <td>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>{r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td>{r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                <td>{r.worked_hours ? `${Number(r.worked_hours).toFixed(1)}h` : '—'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="td-muted">{r.notes || '—'}</td>
              </tr>
            ))}
            {report.length === 0 && !loading && (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>No data found for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManualAttendanceModal({ onClose, onAdded }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    employee_id: '',
    log_date: new Date().toISOString().slice(0, 10),
    check_in: '',
    check_out: '',
    status: 'present',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    employeeApi.list({ limit: 1000 }).then(r => setEmployees(r.data.items || r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        check_in: form.check_in ? new Date(`${form.log_date}T${form.check_in}`).toISOString() : null,
        check_out: form.check_out ? new Date(`${form.log_date}T${form.check_out}`).toISOString() : null,
      };
      await attendanceApi.manual(payload);
      toast.success('Manual attendance added');
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add manual entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Manual Attendance Entry</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Employee *</label>
            <select className="form-input form-select" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required>
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
              ))}
            </select>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-input form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="late">Late</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Check In Time</label>
              <input className="form-input" type="time" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Check Out Time</label>
              <input className="form-input" type="time" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Reason for manual entry..." />
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.employee_id}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

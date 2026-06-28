import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../api/client';

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_META = {
  present:  { label: 'Present',  color: 'bg-meta-3/10 text-meta-3' },
  absent:   { label: 'Absent',   color: 'bg-meta-1/10 text-meta-1' },
  late:     { label: 'Late',     color: 'bg-meta-6/10 text-meta-6' },
  on_leave: { label: 'On Leave', color: 'bg-primary/10 text-primary' },
  half_day: { label: 'Half Day', color: 'bg-meta-8/10 text-meta-8' },
  week_off: { label: 'Week Off', color: 'bg-gray-2 text-bodydark' },
  holiday:  { label: 'Holiday',  color: 'bg-meta-5/10 text-meta-5' },
};

const fmtTime = (dt) => {
  if (!dt) return '--:--';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function Attendance() {
  const now = new Date();
  const [tab, setTab] = useState('my');

  // My Attendance
  const [todayLog, setTodayLog]   = useState(null);
  const [summary, setSummary]     = useState(null);
  const [calendar, setCalendar]   = useState([]);
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [punching, setPunching]   = useState(false);
  const [myLoading, setMyLoading] = useState(true);

  // Team View
  const [teamDate, setTeamDate]     = useState(now.toISOString().slice(0, 10));
  const [teamData, setTeamData]     = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Regularisations
  const [regList, setRegList]         = useState([]);
  const [regLoading, setRegLoading]   = useState(false);
  const [regularModal, setRegularModal] = useState(false);
  const [regularForm, setRegularForm] = useState({ log_date: '', reason: '', requested_check_in: '', requested_check_out: '' });
  const [submitting, setSubmitting]   = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Admin: set attendance for any employee
  const [adminAttModal, setAdminAttModal] = useState(null); // { employee_id, employee_name, log_date }
  const [adminAttForm, setAdminAttForm]   = useState({ check_in: '', check_out: '', status: 'present', notes: '' });
  const [adminAttSaving, setAdminAttSaving] = useState(false);

  useEffect(() => {
    loadMyAttendance();
  }, [viewYear, viewMonth]);

  async function loadMyAttendance() {
    setMyLoading(true);
    const [todayRes, calRes, sumRes] = await Promise.allSettled([
      attendanceApi.today(),
      attendanceApi.monthly(viewYear, viewMonth),
      attendanceApi.summary(viewYear, viewMonth),
    ]);
    if (todayRes.status === 'fulfilled') setTodayLog(todayRes.value.data);
    if (calRes.status === 'fulfilled')   setCalendar(calRes.value.data ?? []);
    if (sumRes.status === 'fulfilled')   setSummary(sumRes.value.data);
    setMyLoading(false);
  }

  useEffect(() => {
    if (tab === 'team') loadTeam();
  }, [tab, teamDate]);

  async function loadTeam() {
    setTeamLoading(true);
    try {
      const res = await attendanceApi.team(teamDate);
      setTeamData(res.data ?? []);
    } catch { toast.error('Failed to load team attendance'); }
    finally { setTeamLoading(false); }
  }

  useEffect(() => {
    if (tab === 'regularise') loadRegularisations();
  }, [tab]);

  async function loadRegularisations() {
    setRegLoading(true);
    try {
      const res = await attendanceApi.regularisations();
      setRegList(res.data ?? []);
    } catch { toast.error('Failed to load regularisations'); }
    finally { setRegLoading(false); }
  }

  async function handlePunch() {
    setPunching(true);
    try {
      const isPunchedIn = todayLog?.check_in && !todayLog?.check_out;
      if (isPunchedIn) {
        await attendanceApi.punchOut({ source: 'web' });
        toast.success('Punched OUT successfully');
      } else {
        await attendanceApi.punchIn({ source: 'web' });
        toast.success('Punched IN successfully');
      }
      const res = await attendanceApi.today();
      setTodayLog(res.data);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Punch failed'); }
    finally { setPunching(false); }
  }

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  async function handleRegularise() {
    if (!regularForm.log_date || !regularForm.reason) { toast.error('Date and reason required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        log_date: regularForm.log_date,
        reason: regularForm.reason,
        requested_check_in:  regularForm.requested_check_in  ? `${regularForm.log_date}T${regularForm.requested_check_in}:00` : null,
        requested_check_out: regularForm.requested_check_out ? `${regularForm.log_date}T${regularForm.requested_check_out}:00` : null,
      };
      await attendanceApi.regularise(payload);
      toast.success('Regularisation request submitted');
      setRegularModal(false);
      setRegularForm({ log_date: '', reason: '', requested_check_in: '', requested_check_out: '' });
      loadRegularisations();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Submission failed'); }
    finally { setSubmitting(false); }
  }

  async function handleApprove(id) {
    try {
      await attendanceApi.approveReg(id);
      toast.success('Approved');
      setRegList(p => p.map(r => r.id === id ? {...r, status: 'approved'} : r));
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  }

  async function handleReject() {
    if (!rejectReason) { toast.error('Enter rejection reason'); return; }
    try {
      await attendanceApi.rejectReg(rejectModal, rejectReason);
      toast.success('Rejected');
      setRegList(p => p.map(r => r.id === rejectModal ? {...r, status: 'rejected'} : r));
      setRejectModal(null);
      setRejectReason('');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  }

  async function handleAdminSetAttendance() {
    if (!adminAttModal) return;
    if (!adminAttForm.check_in) { toast.error('Check-in time required'); return; }
    setAdminAttSaving(true);
    try {
      const dateStr = adminAttModal.log_date;
      await attendanceApi.manual({
        employee_id: adminAttModal.employee_id,
        log_date: dateStr,
        check_in:  adminAttForm.check_in  ? `${dateStr}T${adminAttForm.check_in}:00` : null,
        check_out: adminAttForm.check_out ? `${dateStr}T${adminAttForm.check_out}:00` : null,
        status: adminAttForm.status,
        notes: adminAttForm.notes || null,
      });
      toast.success(`Attendance set for ${adminAttModal.employee_name}`);
      setAdminAttModal(null);
      loadTeam();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setAdminAttSaving(false); }
  }

  // Build calendar lookup map
  const calMap = {};
  calendar.forEach(log => {
    const day = new Date(log.date).getDate();
    calMap[day] = log;
  });

  const daysInMonth    = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const monthLabel     = new Date(viewYear, viewMonth - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const isPunchedIn  = todayLog?.check_in && !todayLog?.check_out;
  const isAlreadyOut = todayLog?.check_in && todayLog?.check_out;

  const teamCounts = {
    present:  teamData.filter(t => t.status === 'present').length,
    absent:   teamData.filter(t => t.status === 'absent').length,
    late:     teamData.filter(t => t.status === 'late').length,
    on_leave: teamData.filter(t => t.status === 'on_leave').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Attendance</h2>
          <p className="text-sm text-bodydark">Track and manage employee attendance</p>
        </div>
        <button onClick={() => setRegularModal(true)} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">
          + Regularisation Request
        </button>
      </div>

      <div className="tab-list">
        {[['my','My Attendance'],['team','Team View'],['regularise','Regularisations']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {/* ── My Attendance ─────────────────────────────────────────── */}
      {tab === 'my' && (
        myLoading
          ? <div className="flex items-center justify-center h-64"><span className="spinner" /></div>
          : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Punch card */}
            <div className="rounded-sm border border-stroke bg-white shadow-default p-6 flex flex-col items-center gap-5">
              <h3 className="font-semibold text-black self-start">Today's Attendance</h3>
              <p className="text-sm text-bodydark self-start">
                {now.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
              </p>

              {isAlreadyOut ? (
                <div className="w-32 h-32 rounded-full border-4 border-gray-2 flex flex-col items-center justify-center text-bodydark text-sm font-bold">
                  <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="9 11 12 14 22 4"/>
                  </svg>
                  Done
                </div>
              ) : (
                <button
                  onClick={handlePunch}
                  disabled={punching}
                  className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-card disabled:opacity-60 ${isPunchedIn ? 'border-meta-1 text-meta-1 bg-meta-1/5' : 'border-meta-3 text-meta-3 bg-meta-3/5'}`}
                >
                  <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {punching ? '…' : isPunchedIn ? 'Punch Out' : 'Punch In'}
                </button>
              )}

              <div className="w-full grid grid-cols-2 gap-3 text-center">
                <div className="rounded bg-gray-1 p-3">
                  <div className="text-lg font-bold text-black">{fmtTime(todayLog?.check_in)}</div>
                  <div className="text-xs text-bodydark">Punch In</div>
                </div>
                <div className="rounded bg-gray-1 p-3">
                  <div className="text-lg font-bold text-black">{fmtTime(todayLog?.check_out)}</div>
                  <div className="text-xs text-bodydark">Punch Out</div>
                </div>
              </div>
              {todayLog?.worked_hours != null && (
                <p className="text-sm text-bodydark">
                  Worked: <span className="font-semibold text-black">{Number(todayLog.worked_hours).toFixed(1)}h</span>
                </p>
              )}
            </div>

            {/* Monthly summary + calendar */}
            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Present',  val: summary?.present_days  ?? 0, color: 'text-meta-3' },
                  { label: 'Absent',   val: summary?.absent_days   ?? 0, color: 'text-meta-1' },
                  { label: 'Late',     val: summary?.late_days     ?? 0, color: 'text-meta-6' },
                  { label: 'On Leave', val: summary?.on_leave_days ?? 0, color: 'text-primary' },
                ].map((s) => (
                  <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-xs text-bodydark mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-black">Monthly Calendar</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeMonth(-1)} className="text-bodydark hover:text-primary px-2">‹</button>
                    <span className="text-sm font-medium text-black">{monthLabel}</span>
                    <button onClick={() => changeMonth(1)} className="text-bodydark hover:text-primary px-2">›</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                  {DAY_LABELS.map(d => <div key={d} className="text-xs text-bodydark font-medium py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={'e'+i} />)}
                  {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => {
                    const log = calMap[day];
                    const cellDate = new Date(viewYear, viewMonth - 1, day);
                    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
                    const state = log?.status || (cellDate > todayMidnight ? 'future' : '');
                    return (
                      <div key={day} className={`att-day ${state}`} title={log?.check_in ? `In: ${fmtTime(log.check_in)}` : ''}>
                        {day}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-4 text-xs">
                  {[['present','Present'],['absent','Absent'],['late','Late'],['on_leave','On Leave'],['week_off','Week Off'],['holiday','Holiday']].map(([s,l]) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm att-day ${s}`} />
                      <span className="text-bodydark">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── Team View ──────────────────────────────────────────────── */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Present',  val: teamCounts.present,  color: 'text-meta-3' },
              { label: 'Absent',   val: teamCounts.absent,   color: 'text-meta-1' },
              { label: 'Late',     val: teamCounts.late,     color: 'text-meta-6' },
              { label: 'On Leave', val: teamCounts.on_leave, color: 'text-primary' },
            ].map((s) => (
              <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-bodydark">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
              <h3 className="font-medium text-black">Team Attendance</h3>
              <input
                type="date"
                value={teamDate}
                onChange={e => setTeamDate(e.target.value)}
                className="rounded border border-stroke px-3 py-1.5 text-sm text-black outline-none focus:border-primary"
              />
            </div>
            {teamLoading ? (
              <div className="flex items-center justify-center h-32"><span className="spinner" /></div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-1">
                  <tr>{['Employee','Department','Status','Punch In','Punch Out','Hours','Action'].map(h =>
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                  )}</tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {teamData.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-6 text-sm text-bodydark text-center">No data for this date</td></tr>
                  ) : teamData.map((t, i) => {
                    const meta = STATUS_META[t.status] || STATUS_META.absent;
                    const name = t.employee_name || t.employee_code || t.name || 'Unknown';
                    const dept = t.department || t.dept || '—';
                    return (
                      <tr key={i} className="hover:bg-gray-1">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-black">{name}</span>
                              <div className="text-[11px] text-bodydark">{t.employee_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-bodydark">{dept}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                          {t.is_regularised && <span className="ml-1 text-[10px] text-bodydark">(adj)</span>}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-black">{fmtTime(t.check_in)}</td>
                        <td className="px-5 py-3.5 text-sm text-bodydark">{fmtTime(t.check_out)}</td>
                        <td className="px-5 py-3.5 text-sm text-bodydark">
                          {t.worked_hours != null ? `${Number(t.worked_hours).toFixed(1)}h` : '--'}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => {
                              setAdminAttModal({ employee_id: t.employee_id, employee_name: name, log_date: teamDate });
                              setAdminAttForm({
                                check_in: t.check_in ? fmtTime(t.check_in) : '',
                                check_out: t.check_out ? fmtTime(t.check_out) : '',
                                status: t.status || 'present',
                                notes: '',
                              });
                            }}
                            className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:border-primary hover:text-primary transition-colors"
                          >
                            {t.check_in ? 'Edit' : 'Set'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Regularisations ───────────────────────────────────────── */}
      {tab === 'regularise' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Regularisation Requests</h3>
            <button onClick={() => setRegularModal(true)} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">
              + New Request
            </button>
          </div>
          {regLoading ? (
            <div className="flex items-center justify-center h-32"><span className="spinner" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>{['Date','Reason','Req. Check-In','Req. Check-Out','Status','Actions'].map(h =>
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {regList.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-6 text-sm text-bodydark text-center">No regularisation requests</td></tr>
                ) : regList.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-1">
                    <td className="px-5 py-3.5 text-sm text-bodydark">{r.log_date}</td>
                    <td className="px-5 py-3.5 text-sm text-black max-w-[180px] truncate">{r.reason}</td>
                    <td className="px-5 py-3.5 text-sm text-bodydark">{fmtTime(r.requested_check_in)}</td>
                    <td className="px-5 py-3.5 text-sm text-bodydark">{fmtTime(r.requested_check_out)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'approved' ? 'bg-meta-3/10 text-meta-3'
                        : r.status === 'rejected' ? 'bg-meta-1/10 text-meta-1'
                        : 'bg-meta-6/10 text-meta-6'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(r.id)} className="rounded bg-meta-3 px-2.5 py-1 text-xs text-white hover:bg-opacity-90">Approve</button>
                          <button onClick={() => { setRejectModal(r.id); setRejectReason(''); }} className="rounded bg-meta-1 px-2.5 py-1 text-xs text-white hover:bg-opacity-90">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Regularisation Modal ──────────────────────────────────── */}
      {regularModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRegularModal(false)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Regularisation Request</h3>
              <button onClick={() => setRegularModal(false)} className="text-bodydark hover:text-black">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Attendance Date</label>
                <input type="date" value={regularForm.log_date} onChange={e => setRegularForm(p => ({...p, log_date: e.target.value}))} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Requested Check-In</label>
                  <input type="time" value={regularForm.requested_check_in} onChange={e => setRegularForm(p => ({...p, requested_check_in: e.target.value}))} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Requested Check-Out</label>
                  <input type="time" value={regularForm.requested_check_out} onChange={e => setRegularForm(p => ({...p, requested_check_out: e.target.value}))} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Reason / Remarks</label>
                <textarea value={regularForm.reason} onChange={e => setRegularForm(p => ({...p, reason: e.target.value}))} rows={3} placeholder="Please explain the reason…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setRegularModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleRegularise} disabled={submitting} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Reject Request</h3>
              <button onClick={() => setRejectModal(null)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-bodydark mb-1.5">Rejection Reason</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Enter reason…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setRejectModal(null)} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleReject} className="rounded bg-meta-1 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin: Set Attendance Modal ───────────────────────────── */}
      {adminAttModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAdminAttModal(null)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <div>
                <h3 className="font-semibold text-black">Set Attendance</h3>
                <p className="text-xs text-bodydark mt-0.5">{adminAttModal.employee_name} · {adminAttModal.log_date}</p>
              </div>
              <button onClick={() => setAdminAttModal(null)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Check-In *</label>
                  <input type="time" value={adminAttForm.check_in}
                    onChange={e => setAdminAttForm(p => ({...p, check_in: e.target.value}))}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Check-Out</label>
                  <input type="time" value={adminAttForm.check_out}
                    onChange={e => setAdminAttForm(p => ({...p, check_out: e.target.value}))}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Status</label>
                <select value={adminAttForm.status}
                  onChange={e => setAdminAttForm(p => ({...p, status: e.target.value}))}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary bg-white">
                  {['present','absent','late','on_leave','half_day','week_off','holiday'].map(s => (
                    <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Admin Notes</label>
                <textarea value={adminAttForm.notes}
                  onChange={e => setAdminAttForm(p => ({...p, notes: e.target.value}))}
                  rows={2} placeholder="Reason for manual entry…"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setAdminAttModal(null)}
                className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">
                Cancel
              </button>
              <button onClick={handleAdminSetAttendance} disabled={adminAttSaving}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {adminAttSaving ? 'Saving…' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

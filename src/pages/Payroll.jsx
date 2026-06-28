import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { StatusBadge } from '../components/Badge';
import { payrollApi, employeeApi } from '../api/client';
import toast from 'react-hot-toast';
import SalaryConfig from './SalaryConfig';

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [runMonth, setRunMonth] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [tab, setTab] = useState('runs');

  useEffect(() => { fetchRuns(); }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await payrollApi.runs();
      setRuns(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!runMonth) { toast.error('Select a month first'); return; }
    setCreating(true);
    try {
      const run_month = runMonth + '-01';
      const res = await payrollApi.createRun(run_month);
      toast.success('Payroll run created');
      fetchRuns();
      setRunMonth('');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create run');
    } finally {
      setCreating(false);
    }
  };

  const handleProcess = async (run) => {
    if (!confirm(`Process payroll for ${fmtMonth(run.run_month)}? This will run in background.`)) return;
    try {
      await payrollApi.processRun(run.id);
      toast.success('Processing started — refresh in a moment');
      setTimeout(fetchRuns, 3000);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleApprove = async (run) => {
    if (!confirm(`Approve payroll for ${fmtMonth(run.run_month)}?`)) return;
    try {
      await payrollApi.approveRun(run.id);
      toast.success('Approved');
      fetchRuns();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleDisburse = async (run) => {
    if (!confirm(`Mark ${fmtMonth(run.run_month)} as disbursed? This will notify employees.`)) return;
    try {
      await payrollApi.disburseRun(run.id);
      toast.success('Marked as disbursed');
      fetchRuns();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const handleBankFile = async (run) => {
    try {
      const res = await payrollApi.bankFile(run.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = `bank_file_${run.run_month}.csv`; a.click();
    } catch (e) {
      toast.error('Failed to download bank file');
    }
  };

  const handleViewEntries = async (run) => {
    setSelectedRun(run);
    setEntriesLoading(true);
    try {
      const res = await payrollApi.preview(run.id);
      setEntries(res.data || []);
    } catch { setEntries([]); }
    setEntriesLoading(false);
  };

  const fmtMonth = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const fmtINR  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <>
      <TopBar title="Payroll" />

      <div className="page-content">
        <div className="tabs mb-16">
          <button className={`tab ${tab === 'runs' ? 'active' : ''}`} onClick={() => setTab('runs')}>Payroll Runs</button>
          <button className={`tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>Monthly View</button>
          <button className={`tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>Salary Configuration</button>
        </div>

        {tab === 'runs' ? (
          <>
            {/* Create Run */}
        <div className="card mb-24" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Create New Payroll Run</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: '0 0 auto' }}>
              <label className="form-label">Payroll Month</label>
              <input className="form-input" type="month" value={runMonth} onChange={(e) => setRunMonth(e.target.value)} style={{ width: 180 }} />
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !runMonth}>
              {creating ? 'Creating…' : '+ Create Run'}
            </button>
          </div>
        </div>

        {/* Runs Table */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Payroll Runs</div>
          {loading ? (
            <div className="loading-center"><div className="spinner spinner-lg" /></div>
          ) : runs.length === 0 ? (
            <div className="empty-state">
              <BankIcon />
              <h3>No payroll runs yet</h3>
              <p>Create your first payroll run above.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Employees</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: 600 }}>{fmtMonth(run.run_month)}</td>
                      <td>{run.total_employees || 0}</td>
                      <td>{fmtINR(run.total_gross)}</td>
                      <td style={{ color: 'var(--danger)' }}>{fmtINR(run.total_deductions)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtINR(run.total_net)}</td>
                      <td><StatusBadge status={run.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleViewEntries(run)}>View</button>
                          {run.status === 'draft' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleProcess(run)}>Process</button>
                          )}
                          {run.status === 'review' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleApprove(run)}>Approve</button>
                          )}
                          {run.status === 'approved' && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleBankFile(run)}>Bank File</button>
                              <button className="btn btn-primary btn-sm" onClick={() => handleDisburse(run)}>Disburse</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Entries Modal */}
        {selectedRun && (
          <div className="modal-overlay" onClick={() => setSelectedRun(null)}>
            <div className="modal" style={{ maxWidth: 800, width: '95vw' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Entries — {fmtMonth(selectedRun.run_month)}</h3>
                <button className="btn btn-ghost" onClick={() => setSelectedRun(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: 0 }}>
                {entriesLoading ? (
                  <div className="loading-center" style={{ padding: 40 }}><div className="spinner spinner-lg" /></div>
                ) : entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No entries — process the run first</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Employee</th><th>Days</th><th>LOP</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Payslip</th></tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={e.id}>
                            <td className="td-muted" style={{ fontSize: 11 }}>{e.employee_id.slice(0, 8)}…</td>
                            <td>{e.present_days}/{e.working_days}</td>
                            <td style={{ color: e.lop_days > 0 ? 'var(--danger)' : 'inherit' }}>{e.lop_days}</td>
                            <td>{fmtINR(e.gross)}</td>
                            <td style={{ color: 'var(--danger)' }}>{fmtINR(Object.values(e.deductions || {}).reduce((a, v) => a + v, 0))}</td>
                            <td style={{ fontWeight: 700 }}>{fmtINR(e.net)}</td>
                            <td>
                              {e.payslip_url ? (
                                <a href={e.payslip_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">PDF</a>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </>
        ) : tab === 'view' ? (
          <MonthlyPayrollView fmtINR={fmtINR} />
        ) : (
          <SalaryConfig />
        )}
      </div>
    </>
  );
}

function MonthlyPayrollView({ fmtINR }) {
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    employeeApi.departments()
      .then((r) => setDepartments(r.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (deptFilter) params.department_id = deptFilter;
      if (monthFilter) params.month = monthFilter;
      const res = await payrollApi.monthlyView(params);
      setRows(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load payroll view');
      setRows([]);
    }
    setLoading(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

  const statusColor = (s) => {
    if (!s || s === 'not_processed') return { color: '#888' };
    if (s === 'completed') return { color: 'var(--success)', fontWeight: 600 };
    if (s === 'pending') return { color: '#f59e0b', fontWeight: 600 };
    return {};
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="card mb-24" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Department</label>
            <select
              className="form-input form-select"
              style={{ minWidth: 200 }}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Month</label>
            <input
              type="month"
              className="form-input"
              style={{ width: 160 }}
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Loading…' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Monthly Payroll List</div>
        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : !searched ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <p style={{ color: 'var(--text-3)' }}>Select filters above and click Submit to view payroll.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <p style={{ color: 'var(--text-3)' }}>No records found for the selected filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PIN</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Last Payment</th>
                  <th>Net Salary</th>
                  <th>Pay Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.employee_id}>
                    <td className="td-muted" style={{ fontFamily: 'monospace' }}>{r.employee_code}</td>
                    <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                    <td className="td-muted">{r.department || '—'}</td>
                    <td className="td-muted">{fmtDate(r.last_payment)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtINR(r.net_salary)}</td>
                    <td>
                      <span style={statusColor(r.pay_status)}>
                        {r.pay_status === 'not_processed' ? 'Not Processed' : r.pay_status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Salary Config"
                        onClick={() => {}}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
              Showing {rows.length} employee{rows.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BankIcon() {
  return <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>;
}

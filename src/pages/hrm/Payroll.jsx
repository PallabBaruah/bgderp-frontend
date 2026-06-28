import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { payrollApi, employeeApi } from '../../api/client';

const STATUS_META = {
  draft:      { label: 'Draft',      color: 'bg-gray-2 text-bodydark' },
  processing: { label: 'Processing', color: 'bg-meta-6/10 text-meta-6' },
  review:     { label: 'Review',     color: 'bg-meta-8/10 text-meta-8' },
  approved:   { label: 'Approved',   color: 'bg-meta-3/10 text-meta-3' },
  disbursed:  { label: 'Paid',       color: 'bg-primary/10 text-primary' },
};

const EARN_LABELS = {
  BASIC: 'Basic Pay', HRA_RENTED: 'HRA (Rented)', HRA_OWN: 'HRA (Own)',
  TRANSPORT_ALLOW: 'Conveyance', SPECIAL_PAY: 'Special Allowance',
  GRADE_PAY: 'Grade Pay', MEDICAL_ALLOW: 'Medical Allowance',
  LTA: 'LTA', BONUS: 'Bonus', OT_SHIFT: 'OT Shift', OT_DAY: 'OT Day',
};
const DED_LABELS = {
  EPF: 'Provident Fund (EPF)', VPF: 'Voluntary PF', ESI: 'ESI',
  PROF_TAX: 'Professional Tax', INC_TAX_CURR: 'Income Tax', INC_TAX_ARR: 'Income Tax (Arrear)',
};

const fmtMonth = (d) => d ? new Date(String(d) + 'T00:00:00').toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : '—';
const fmtL     = (n) => `₹${(Number(n) / 100000).toFixed(2)}L`;
const fmtRs    = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function Payroll() {
  const [tab, setTab] = useState('runs');

  // Runs list
  const [runs, setRuns]           = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [processing, setProcessing]   = useState(null);

  // Preview
  const [selectedRunId, setSelectedRunId]   = useState(null);
  const [previewEntries, setPreviewEntries] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [empMap, setEmpMap]                 = useState({});

  // Payslips
  const [payslips, setPayslips]           = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [payslipModal, setPayslipModal]   = useState(null);

  // New Run Modal
  const [newRunModal, setNewRunModal] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [newRunYear,  setNewRunYear]  = useState(String(new Date().getFullYear()));
  const [creating, setCreating]       = useState(false);

  useEffect(() => { loadRuns(); }, []);

  useEffect(() => {
    if (tab === 'payslips') loadPayslips();
  }, [tab]);

  async function loadRuns() {
    setRunsLoading(true);
    try {
      const res = await payrollApi.runs();
      setRuns(res.data ?? []);
    } catch { toast.error('Failed to load payroll runs'); }
    finally { setRunsLoading(false); }
  }

  async function openPreview(runId) {
    setSelectedRunId(runId);
    setTab('preview');
    setPreviewLoading(true);
    setPreviewEntries([]);
    try {
      const res = await payrollApi.preview(runId);
      setPreviewEntries(res.data ?? []);
    } catch { toast.error('Failed to load preview'); }
    finally { setPreviewLoading(false); }
  }

  async function loadPayslips() {
    setPayslipsLoading(true);
    try {
      const res = await payrollApi.payslips();
      setPayslips(res.data ?? []);
    } catch { toast.error('Failed to load payslips'); }
    finally { setPayslipsLoading(false); }
  }

  async function handleCreateRun() {
    setCreating(true);
    try {
      const res = await payrollApi.createRun(`${newRunYear}-${newRunMonth}-01`);
      setRuns(p => [res.data, ...p]);
      setNewRunModal(false);
      toast.success('Payroll run created');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create run'); }
    finally { setCreating(false); }
  }

  async function handleProcess(id) {
    setProcessing(id);
    try {
      const res = await payrollApi.processRun(id);
      setRuns(p => p.map(r => r.id === id ? res.data : r));
      toast.success('Processing payroll…');
      // Poll until background task completes (processing → review)
      const poll = setInterval(async () => {
        const fresh = await payrollApi.runs();
        const updated = (fresh.data ?? []).find(r => r.id === id);
        if (updated && updated.status !== 'processing') {
          clearInterval(poll);
          setRuns(fresh.data ?? []);
          if (updated.status === 'review') toast.success('Payroll ready for review');
          else if (updated.status === 'draft') toast.error('Processing failed — check salary config');
        }
      }, 3000);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Processing failed'); }
    finally { setProcessing(null); }
  }

  async function handleApprove(id) {
    try {
      const res = await payrollApi.approveRun(id);
      setRuns(p => p.map(r => r.id === id ? res.data : r));
      toast.success('Payroll run approved');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Approval failed'); }
  }

  async function handleDisburse(id) {
    try {
      const res = await payrollApi.disburseRun(id);
      setRuns(p => p.map(r => r.id === id ? res.data : r));
      toast.success('Payroll marked as paid');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this payroll run and all its entries? This cannot be undone.')) return;
    try {
      await payrollApi.deleteRun(id);
      setRuns(p => p.filter(r => r.id !== id));
      if (selectedRunId === id) setSelectedRunId(null);
      toast.success('Payroll run deleted');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed'); }
  }

  async function handleReprocess(id) {
    if (!window.confirm('Re-process this run? All existing entries will be recalculated.')) return;
    setProcessing(id);
    try {
      const res = await payrollApi.reprocessRun(id);
      setRuns(p => p.map(r => r.id === id ? res.data : r));
      toast.success('Re-processing payroll…');
      const poll = setInterval(async () => {
        const fresh = await payrollApi.runs();
        const updated = (fresh.data ?? []).find(r => r.id === id);
        if (updated && updated.status !== 'processing') {
          clearInterval(poll);
          setRuns(fresh.data ?? []);
          if (updated.status === 'review') toast.success('Payroll ready for review');
        }
      }, 3000);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Reprocess failed'); }
    finally { setProcessing(null); }
  }

  async function handleBankFile(id) {
    try {
      const res = await payrollApi.bankFile(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href = url; a.download = `bank_transfer_${id}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Download failed'); }
  }

  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Payroll</h2>
          <p className="text-sm text-bodydark">Manage salary runs, payslips, and reports</p>
        </div>
        <button onClick={() => setNewRunModal(true)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          + New Payroll Run
        </button>
      </div>

      <div className="tab-list">
        {[['runs','Payroll Runs'],['preview','Run Preview'],['payslips','Payslips'],['reports','Reports']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {/* ── Payroll Runs ─────────────────────────────────────────── */}
      {tab === 'runs' && (
        runsLoading
          ? <div className="flex justify-center h-40 items-center"><span className="spinner" /></div>
          : (
          <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>{['Period','Employees','Gross Salary','Deductions','Net Pay','Status','Actions'].map(h =>
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {runs.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-sm text-bodydark text-center">No payroll runs yet. Create one to get started.</td></tr>
                ) : runs.map(r => {
                  const meta = STATUS_META[r.status] || STATUS_META.draft;
                  const canPreview = ['review','approved','disbursed'].includes(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-gray-1">
                      <td className="px-5 py-4 text-sm font-semibold text-black">{fmtMonth(r.run_month)}</td>
                      <td className="px-5 py-4 text-sm text-bodydark">{r.total_employees}</td>
                      <td className="px-5 py-4 text-sm text-black">{fmtL(r.total_gross)}</td>
                      <td className="px-5 py-4 text-sm text-meta-1">{fmtL(r.total_deductions)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-meta-3">{fmtL(r.total_net)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {canPreview && (
                            <button onClick={() => openPreview(r.id)} className="text-xs text-primary hover:underline">Preview</button>
                          )}
                          {r.status === 'draft' && (
                            <>
                              <button onClick={() => handleProcess(r.id)} disabled={processing === r.id} className="text-xs text-meta-6 hover:underline disabled:opacity-50">
                                {processing === r.id ? 'Processing…' : 'Process'}
                              </button>
                              <button onClick={() => handleDelete(r.id)} className="text-xs text-meta-1 hover:underline">Delete</button>
                            </>
                          )}
                          {r.status === 'review' && (
                            <>
                              <button onClick={() => handleApprove(r.id)} className="text-xs text-meta-3 hover:underline">Approve</button>
                              <button onClick={() => handleReprocess(r.id)} disabled={processing === r.id} className="text-xs text-meta-6 hover:underline disabled:opacity-50">Reprocess</button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <>
                              <button onClick={() => handleDisburse(r.id)} className="text-xs text-primary hover:underline">Mark Paid</button>
                              <button onClick={() => handleBankFile(r.id)} className="text-xs text-bodydark hover:underline">Bank File</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Run Preview ──────────────────────────────────────────── */}
      {tab === 'preview' && (
        <div className="space-y-4">
          {!selectedRun ? (
            <div className="rounded-sm border border-stroke bg-white shadow-default p-12 text-center text-bodydark">
              Select a run from <button onClick={() => setTab('runs')} className="text-primary hover:underline">Payroll Runs</button> to preview.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Period',       val: fmtMonth(selectedRun.run_month) },
                  { label: 'Gross Pay',    val: fmtL(selectedRun.total_gross) },
                  { label: 'Deductions',   val: fmtL(selectedRun.total_deductions) },
                  { label: 'Net Pay',      val: fmtL(selectedRun.total_net) },
                ].map(s => (
                  <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-4">
                    <div className="text-xs text-bodydark mb-1">{s.label}</div>
                    <div className="text-lg font-bold text-black">{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
                  <h3 className="font-medium text-black">Entries — {fmtMonth(selectedRun.run_month)}</h3>
                  <div className="flex gap-2">
                    {selectedRun.status === 'review' && (
                      <button onClick={() => handleApprove(selectedRun.id)} className="rounded bg-meta-3 px-4 py-1.5 text-sm font-medium text-white hover:bg-opacity-90">Approve Run</button>
                    )}
                    {selectedRun.status === 'approved' && (
                      <>
                        <button onClick={() => handleBankFile(selectedRun.id)} className="rounded border border-stroke bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-gray-1">⬇ Bank File</button>
                        <button onClick={() => handleDisburse(selectedRun.id)} className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-dark">Mark as Paid</button>
                      </>
                    )}
                  </div>
                </div>
                {previewLoading ? (
                  <div className="flex justify-center py-12"><span className="spinner" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gray-1">
                        <tr>{['Employee','Dept','Present','Gross','Deductions','Net Pay','Action'].map(h =>
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                        )}</tr>
                      </thead>
                      <tbody className="divide-y divide-stroke">
                        {previewEntries.length === 0 ? (
                          <tr><td colSpan={7} className="px-5 py-8 text-sm text-bodydark text-center">No entries found</td></tr>
                        ) : previewEntries.map(e => {
                          const deds     = e.deductions || {};
                          const totalDed = Object.values(deds).reduce((s, v) => s + Number(v), 0);
                          return (
                            <tr key={e.id} className="hover:bg-gray-1">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-black">{e.employee_name ?? '—'}</div>
                                <div className="text-xs text-bodydark">{e.employee_code ?? ''}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-bodydark">{e.department_name ?? '—'}</td>
                              <td className="px-4 py-3 text-sm text-black">{Number(e.present_days)}/{e.working_days}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-black">{fmtRs(e.gross)}</td>
                              <td className="px-4 py-3 text-sm text-meta-1">{fmtRs(totalDed)}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-meta-3">{fmtRs(e.net)}</td>
                              <td className="px-4 py-3">
                                <button onClick={() => setPayslipModal({ entry: e, emp: { full_name: e.employee_name, employee_code: e.employee_code }, run: selectedRun })} className="text-xs text-primary hover:underline">View</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Payslips ─────────────────────────────────────────────── */}
      {tab === 'payslips' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">My Payslips</h3>
          </div>
          {payslipsLoading ? (
            <div className="flex justify-center py-12"><span className="spinner" /></div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>{['Period','Present Days','Gross','Deductions','Net Pay','Transfer Status','Action'].map(h =>
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                )}</tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {payslips.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-sm text-bodydark text-center">No payslips found</td></tr>
                ) : payslips.map(e => {
                  const run      = runs.find(r => r.id === e.run_id);
                  const deds     = e.deductions || {};
                  const totalDed = Object.values(deds).reduce((s, v) => s + Number(v), 0);
                  const paid     = e.bank_transfer_status === 'paid';
                  return (
                    <tr key={e.id} className="hover:bg-gray-1">
                      <td className="px-5 py-4 text-sm font-semibold text-black">{run ? fmtMonth(run.run_month) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-bodydark">{Number(e.present_days)} / {e.working_days}</td>
                      <td className="px-5 py-4 text-sm text-black">{fmtRs(e.gross)}</td>
                      <td className="px-5 py-4 text-sm text-meta-1">{fmtRs(totalDed)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-meta-3">{fmtRs(e.net)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${paid ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-6/10 text-meta-6'}`}>
                          {e.bank_transfer_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setPayslipModal({ entry: e, emp: empMap[e.employee_id], run })}
                          className="text-xs text-primary hover:underline"
                        >View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Reports ──────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              { title: 'Department-wise Salary', desc: 'Salary breakup by department' },
              { title: 'PF & ESI Summary',       desc: 'Statutory deduction report' },
              { title: 'TDS Report',             desc: 'Tax deducted at source details' },
              { title: 'Salary Register',        desc: 'Full salary register for audit' },
            ].map(r => (
              <div key={r.title} className="rounded-sm border border-stroke bg-white shadow-default p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-black">{r.title}</h4>
                  <p className="text-sm text-bodydark mt-0.5">{r.desc}</p>
                </div>
                <button onClick={() => toast('Coming soon')} className="rounded border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-1">Export</button>
              </div>
            ))}
          </div>

          {runs.some(r => ['approved','disbursed'].includes(r.status)) && (
            <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
              <h4 className="font-medium text-black mb-3">Bank Transfer Files</h4>
              <div className="divide-y divide-stroke">
                {runs.filter(r => ['approved','disbursed'].includes(r.status)).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="text-sm font-medium text-black">{fmtMonth(r.run_month)}</span>
                      <span className="ml-2 text-xs text-bodydark">{r.total_employees} employees · {fmtL(r.total_net)}</span>
                    </div>
                    <button onClick={() => handleBankFile(r.id)} className="rounded border border-stroke bg-white px-3 py-1 text-xs font-medium text-black hover:bg-gray-1">
                      ⬇ Download CSV
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── New Run Modal ─────────────────────────────────────────── */}
      {newRunModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNewRunModal(false)}>
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Create Payroll Run</h3>
              <button onClick={() => setNewRunModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-xs font-medium text-bodydark">Select Period</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-bodydark mb-1">Month</label>
                  <select value={newRunMonth} onChange={e => setNewRunMonth(e.target.value)} className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary">
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                      <option key={m} value={m}>
                        {new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-bodydark mb-1">Year</label>
                  <select value={newRunYear} onChange={e => setNewRunYear(e.target.value)} className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary">
                    {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i)).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="text-xs text-bodydark">
                Run period: <span className="font-medium text-black">
                  {new Date(`${newRunYear}-${newRunMonth}-01T00:00:00`).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setNewRunModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleCreateRun} disabled={creating} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {creating ? 'Creating…' : 'Create Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payslip Modal ─────────────────────────────────────────── */}
      {payslipModal && (
        <PayslipModal
          entry={payslipModal.entry}
          emp={payslipModal.emp}
          run={payslipModal.run}
          onClose={() => setPayslipModal(null)}
        />
      )}
    </div>
  );
}

function PayslipModal({ entry, emp, run, onClose }) {
  const earnings  = entry.earnings_breakdown || {};
  const deductions = entry.deductions || {};
  const totalDed  = Object.values(deductions).reduce((s, v) => s + Number(v), 0);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box modal-box-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
          <h3 className="font-semibold text-black">Payslip — {emp?.full_name ?? 'Employee'}</h3>
          <button onClick={onClose} className="text-bodydark hover:text-black">✕</button>
        </div>
        <div className="p-8">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-stroke">
            <div>
              <h2 className="text-2xl font-bold text-black">BGDERP Technologies</h2>
              <p className="text-sm text-bodydark">Bengaluru, Karnataka</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">PAYSLIP</div>
              <div className="text-sm text-bodydark">
                Period: {run ? fmtMonth(run.run_month) : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-1 rounded">
            {[
              ['Name',         emp?.full_name ?? '—'],
              ['Emp Code',     emp?.employee_code ?? '—'],
              ['Department',   emp?.department?.name ?? '—'],
              ['Present Days', `${Number(entry.present_days)} / ${entry.working_days}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-bodydark">{l}:</span>
                <span className="font-medium text-black">{v}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-black mb-3 pb-2 border-b border-stroke">Earnings</h4>
              {Object.entries(earnings).map(([code, val]) => Number(val) > 0 && (
                <div key={code} className="flex justify-between text-sm py-1.5 border-b border-stroke/50">
                  <span className="text-bodydark">{EARN_LABELS[code] || code}</span>
                  <span className="text-black">₹{Number(val).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm py-2 font-bold">
                <span className="text-black">Gross Earnings</span>
                <span className="text-meta-3">₹{Number(entry.gross).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-3 pb-2 border-b border-stroke">Deductions</h4>
              {Object.entries(deductions).map(([code, val]) => Number(val) > 0 && (
                <div key={code} className="flex justify-between text-sm py-1.5 border-b border-stroke/50">
                  <span className="text-bodydark">{DED_LABELS[code] || code}</span>
                  <span className="text-meta-1">₹{Number(val).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm py-2 font-bold">
                <span className="text-black">Total Deductions</span>
                <span className="text-meta-1">₹{totalDed.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded bg-primary/5 border border-primary/20 flex justify-between items-center">
            <span className="font-bold text-black text-lg">Net Pay</span>
            <span className="font-bold text-primary text-2xl">₹{Number(entry.net).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

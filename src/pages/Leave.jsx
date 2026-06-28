import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { StatusBadge } from '../components/Badge';
import { leaveApi } from '../api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function Leave() {
  const [balance, setBalance] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [tab, setTab] = useState('balance');

  const { user, roles } = useAuthStore();
  const isAdmin = user?.is_superadmin || roles?.includes('Admin') || roles?.includes('HR Manager') || user?.role === 'admin';

  const earnedLeaves = balance.filter(b => b.leave_type_name.toLowerCase().includes('earned') || b.leave_type_code === 'EL' || b.leave_type_code === 'PL');
  const otherLeaves = balance.filter(b => !earnedLeaves.includes(b));

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bal, reqs, types] = await Promise.allSettled([
        leaveApi.balance({}),
        leaveApi.requests({ year: new Date().getFullYear() }),
        leaveApi.types(),
      ]);
      if (bal.status === 'fulfilled')   setBalance(bal.value.data || []);
      if (reqs.status === 'fulfilled')  setRequests(reqs.value.data || []);
      if (types.status === 'fulfilled') setLeaveTypes(types.value.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await leaveApi.cancel(id);
      toast.success('Leave cancelled');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  return (
    <>
      <TopBar title="Leave Management">
        <button className="btn btn-primary" onClick={() => setApplyOpen(true)}>
          Apply Leave
        </button>
      </TopBar>

      <div className="page-content">
        {/* Balance Cards */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          {balance.map((b) => {
            const pct = Number(b.allocated) > 0 ? (Number(b.used) / Number(b.allocated)) * 100 : 0;
            return (
              <div key={b.leave_type_id} className="card" style={{ padding: '16px 18px' }}>
                <div className="flex-between mb-16" style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{b.leave_type_code}</span>
                  <span className={`badge ${Number(b.available) <= 2 ? 'badge-red' : 'badge-green'}`}>{b.available} left</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{b.leave_type_name}</div>
                <div className="progress">
                  <div className={`progress-fill ${pct > 75 ? 'red' : pct > 50 ? 'amber' : 'green'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
                  <span>Used: {b.used}</span>
                  <span>Total: {b.allocated}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(isAdmin ? ['balance', 'my requests', 'all requests', 'maximum config'] : ['balance', 'my requests', 'all requests']).map((t) => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : tab === 'balance' ? (
          <div className="card" style={{ padding: 0 }}>
            {earnedLeaves.length > 0 && (
              <>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Earned Leave</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Leave Type</th><th>Allocated</th><th>Carried Forward</th><th>Used</th><th>Pending</th><th>Available</th></tr>
                    </thead>
                    <tbody>
                      {earnedLeaves.map((b) => (
                        <tr key={b.leave_type_id}>
                          <td><strong>{b.leave_type_name}</strong> <span style={{ color: 'var(--text-3)', fontSize: 11 }}>({b.leave_type_code})</span></td>
                          <td>{b.allocated}</td>
                          <td>{b.carried_forward || 0}</td>
                          <td>{b.used}</td>
                          <td>{b.pending}</td>
                          <td style={{ fontWeight: 700, color: Number(b.available) <= 0 ? 'var(--danger)' : 'var(--success)' }}>{b.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {otherLeaves.length > 0 && (
              <>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', borderTop: earnedLeaves.length > 0 ? '1px solid var(--border)' : 'none', fontWeight: 600 }}>Other Leaves</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Leave Type</th><th>Allocated</th><th>Used</th><th>Pending</th><th>Available</th></tr>
                    </thead>
                    <tbody>
                      {otherLeaves.map((b) => (
                        <tr key={b.leave_type_id}>
                          <td><strong>{b.leave_type_name}</strong> <span style={{ color: 'var(--text-3)', fontSize: 11 }}>({b.leave_type_code})</span></td>
                          <td>{b.allocated}</td>
                          <td>{b.used}</td>
                          <td>{b.pending}</td>
                          <td style={{ fontWeight: 700, color: Number(b.available) <= 0 ? 'var(--danger)' : 'var(--success)' }}>{b.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : tab === 'maximum config' ? (
          <MaximumLeaveConfig leaveTypes={leaveTypes} />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 30 }}>No requests found</td></tr>
                  ) : requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.leave_type?.name || '—'}</td>
                      <td>{new Date(r.from_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td>{new Date(r.to_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ fontWeight: 600 }}>{r.days}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>
                        {r.status === 'pending' && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleCancel(r.id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {applyOpen && (
        <ApplyLeaveModal
          leaveTypes={leaveTypes}
          balance={balance}
          onClose={() => setApplyOpen(false)}
          onApplied={() => { setApplyOpen(false); fetchAll(); }}
        />
      )}
    </>
  );
}

function MaximumLeaveConfig({ leaveTypes }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.maxConfigs();
      setConfigs(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this configuration?')) return;
    try {
      await leaveApi.deleteMaxConfig(id);
      toast.success('Configuration deleted');
      fetchConfigs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <>
      <div className="card">
        <div className="flex-between mb-16">
          <h3 style={{ margin: 0 }}>Maximum Leave Configurations</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Add Config</button>
        </div>
        
        {loading ? (
          <div className="loading-center"><div className="spinner spinner-lg" /></div>
        ) : configs.length === 0 ? (
          <div className="empty-state">No configurations found. Add one to restrict maximum leaves.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Maximum Days</th>
                  <th>Applicable Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((c) => {
                  const lt = leaveTypes.find(l => l.id === c.leave_type_id);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{lt?.name || 'Unknown'}</td>
                      <td>{c.max_days}</td>
                      <td style={{ textTransform: 'capitalize' }}>{c.applicable_role || 'All Roles'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {addOpen && (
        <AddMaxConfigModal 
          leaveTypes={leaveTypes} 
          onClose={() => setAddOpen(false)} 
          onAdded={() => { setAddOpen(false); fetchConfigs(); }} 
        />
      )}
    </>
  );
}

function AddMaxConfigModal({ leaveTypes, onClose, onAdded }) {
  const [form, setForm] = useState({ leave_type_id: '', max_days: '', applicable_role: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await leaveApi.createMaxConfig({
        ...form,
        applicable_role: form.applicable_role || null
      });
      toast.success('Configuration added');
      onAdded();
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Leave Configuration</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Leave Type *</label>
            <select className="form-input form-select" value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })} required>
              <option value="">Select Leave Type</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Maximum Days *</label>
            <input className="form-input" type="number" step="0.5" value={form.max_days} onChange={(e) => setForm({ ...form, max_days: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Applicable Role</label>
            <input className="form-input" value={form.applicable_role} onChange={(e) => setForm({ ...form, applicable_role: e.target.value })} placeholder="e.g. employee, manager (leave blank for all)" />
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.leave_type_id || !form.max_days}>
            {saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  );
}
function ApplyLeaveModal({ leaveTypes, balance, onClose, onApplied }) {
  const [form, setForm] = useState({ leave_type_id: '', from_date: '', to_date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const selectedBalance = balance.find(b => b.leave_type_id === form.leave_type_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await leaveApi.apply(form);
      toast.success('Leave applied successfully!');
      onApplied();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to apply');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Apply for Leave</h3>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Leave Type *</label>
            <select className="form-input form-select" value={form.leave_type_id} onChange={(e) => setForm(f => ({...f, leave_type_id: e.target.value}))} required>
              <option value="">Select leave type…</option>
              {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
            </select>
          </div>
          {selectedBalance && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
              Available balance: <strong style={{ color: 'var(--text)' }}>{selectedBalance.available} days</strong>
            </div>
          )}
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">From Date *</label>
              <input className="form-input" type="date" value={form.from_date} onChange={(e) => setForm(f => ({...f, from_date: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="form-label">To Date *</label>
              <input className="form-input" type="date" value={form.to_date} min={form.from_date} onChange={(e) => setForm(f => ({...f, to_date: e.target.value}))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={(e) => setForm(f => ({...f, reason: e.target.value}))} required style={{ resize: 'vertical' }} placeholder="Briefly describe the reason…" />
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting…' : 'Apply Leave'}</button>
        </div>
      </div>
    </div>
  );
}

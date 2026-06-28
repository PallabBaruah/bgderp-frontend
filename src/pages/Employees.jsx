import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { StatusBadge } from '../components/Badge';
import { employeeApi } from '../api/client';
import toast from 'react-hot-toast';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadDepts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search, selectedDept]);

  const loadDepts = async () => {
    try {
      const res = await employeeApi.departments();
      setDepartments(res.data);
    } catch { /* silent */ }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await employeeApi.list({ search, dept: selectedDept || undefined, limit: 50 });
      setEmployees(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const initials = (name) =>
    (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <TopBar title="Employees">
        <button className="btn btn-primary" onClick={() => { setSelected(null); setDrawerOpen(true); }}>
          <PlusIcon /> Add Employee
        </button>
      </TopBar>

      <div className="page-content">
        {/* Filters */}
        <div className="card mb-24" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ maxWidth: 260 }}
              placeholder="Search by name, email, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-input form-select"
              style={{ maxWidth: 200 }}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-2)' }}>
              {total} employees
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="loading-center"><div className="spinner spinner-lg" /></div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <UserIcon />
              <h3>No employees found</h3>
              <p>Add your first employee to get started.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Code</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Joined</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} onClick={() => { setSelected(emp); setDrawerOpen(true); }} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar">{initials(emp.full_name)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{emp.full_name || '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{emp.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td-muted">{emp.employee_code}</td>
                      <td>{emp.department?.name || '—'}</td>
                      <td>{emp.designation?.name || '—'}</td>
                      <td className="td-muted">{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN') : '—'}</td>
                      <td><span className="badge badge-blue">{emp.employment_type}</span></td>
                      <td><StatusBadge status={emp.status} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost" title="Edit" onClick={() => { setSelected(emp); setDrawerOpen(true); }}>
                          <EditIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <EmployeeDrawer
          employee={selected}
          departments={departments}
          onClose={() => { setDrawerOpen(false); setSelected(null); }}
          onSaved={() => { setDrawerOpen(false); setSelected(null); load(); }}
        />
      )}
    </>
  );
}

function EmployeeDrawer({ employee, departments, onClose, onSaved }) {
  const [designations, setDesignations] = useState([]);
  const [form, setForm] = useState({
    full_name: employee?.full_name || '',
    email: employee?.email || '',
    department_id: employee?.department?.id || '',
    designation_id: employee?.designation?.id || '',
    date_of_joining: employee?.date_of_joining || '',
    employment_type: employee?.employment_type || 'permanent',
    create_user_account: !employee,
    profile: employee?.profile || {},
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    employeeApi.designations().then((r) => setDesignations(r.data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [e.target.name]: val }));
  };

  const handleProfileChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, profile: { ...f.profile, [e.target.name]: val } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.department_id) payload.department_id = null;
      if (!payload.designation_id) payload.designation_id = null;

      if (employee) {
        await employeeApi.update(employee.id, payload);
        toast.success('Employee updated');
      } else {
        await employeeApi.create(payload);
        toast.success('Employee created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 600 }}>
        <div className="drawer-header">
          <h2 className="modal-title">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button className="btn btn-ghost" onClick={onClose}><CloseIcon /></button>
        </div>
        <form className="drawer-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" name="email" type="email" value={form.email} onChange={handleChange} required={!employee} />
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input form-select" name="department_id" value={form.department_id} onChange={handleChange}>
                <option value="">Select dept…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Designation</label>
              <select className="form-input form-select" name="designation_id" value={form.designation_id} onChange={handleChange}>
                <option value="">Select desig…</option>
                {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Date of Joining *</label>
              <input className="form-input" name="date_of_joining" type="date" value={form.date_of_joining} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select className="form-input form-select" name="employment_type" value={form.employment_type} onChange={handleChange}>
                <option value="permanent">Permanent</option>
                <option value="probation">Probation</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>
          </div>
          {!employee && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="create_user" name="create_user_account" checked={form.create_user_account} onChange={handleChange} />
              <label htmlFor="create_user" style={{ fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
                Create login account for this employee
              </label>
            </div>
          )}

          <h4 style={{ margin: '24px 0 12px', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Extended Profile</h4>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Religion</label>
              <input className="form-input" name="religion" value={form.profile?.religion || ''} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Caste</label>
              <input className="form-input" name="caste" value={form.profile?.caste || ''} onChange={handleProfileChange} />
            </div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Height</label>
              <input className="form-input" name="height" value={form.profile?.height || ''} onChange={handleProfileChange} placeholder="e.g. 5'8&quot;" />
            </div>
            <div className="form-group">
              <label className="form-label">Weight</label>
              <input className="form-input" name="weight" value={form.profile?.weight || ''} onChange={handleProfileChange} placeholder="e.g. 70 kg" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Identification Mark</label>
            <input className="form-input" name="identification_mark" value={form.profile?.identification_mark || ''} onChange={handleProfileChange} />
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select className="form-input form-select" name="vehicle_type" value={form.profile?.vehicle_type || ''} onChange={handleProfileChange}>
                <option value="">Select vehicle…</option>
                <option value="2-wheeler">2 Wheeler</option>
                <option value="4-wheeler">4 Wheeler</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Fuel Type</label>
              <select className="form-input form-select" name="vehicle_fuel_type" value={form.profile?.vehicle_fuel_type || ''} onChange={handleProfileChange}>
                <option value="">Select fuel…</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="ev">Electric</option>
                <option value="cng">CNG</option>
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">House Type</label>
              <select className="form-input form-select" name="house_type" value={form.profile?.house_type || ''} onChange={handleProfileChange}>
                <option value="">Select house…</option>
                <option value="rented">Rented</option>
                <option value="owned">Owned</option>
                <option value="company">Company Provided</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Marital Status</label>
              <select className="form-input form-select" name="marital_status" value={form.profile?.marital_status || ''} onChange={handleProfileChange}>
                <option value="">Select status…</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
          </div>
        </form>
        <div className="drawer-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : employee ? 'Update' : 'Create Employee'}
          </button>
        </div>
      </div>
    </>
  );
}

function PlusIcon()  { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function UserIcon()  { return <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function EditIcon()  { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

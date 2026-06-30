import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { employeeApi } from '../../api/client';

const BLANK_FORM = {
  full_name: '', email: '', phone: '', department_id: '', designation_id: '', branch_id: '',
  date_of_joining: new Date().toISOString().split('T')[0], employment_type: 'permanent',
  profile: { gender: 'Male' },
};

const normalize = (e) => ({
  ...e,
  emp_code:    e.employee_code ?? '',
  department:  e.department?.name ?? '',
  designation: e.designation?.name ?? '',
  branch:      e.branch?.name ?? '',
  phone:       e.contact?.phone ?? e.phone ?? '',
  date_joined: e.date_of_joining ? String(e.date_of_joining) : '',
});

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal]         = useState(0);
  const [depts, setDepts]         = useState([]);
  const [desigs, setDesigs]       = useState([]);
  const [branches, setBranches]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(BLANK_FORM);
  const [editId, setEditId]       = useState(null);
  const [deleteId, setDeleteId]   = useState(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    loadEmployees();
    employeeApi.departments().then(r => setDepts(r.data ?? [])).catch(() => {});
    employeeApi.designations().then(r => setDesigs(r.data ?? [])).catch(() => {});
    employeeApi.branches().then(r => setBranches(r.data ?? [])).catch(() => {});
  }, []);

  async function loadEmployees(params = {}) {
    setLoading(true);
    try {
      const res = await employeeApi.list({ limit: 100, ...params });
      const items = (res.data?.items ?? res.data ?? []).map(normalize);
      setEmployees(items);
      setTotal(res.data?.total ?? items.length);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      loadEmployees({ search: search || undefined, dept: deptFilter || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [search, deptFilter]);

  const openAdd = () => { setForm(BLANK_FORM); setModal('add'); };
  const openEdit = (emp) => {
    setForm({
      full_name: emp.full_name, email: emp.email, phone: emp.phone,
      department_id: emp.department_id || '', designation_id: emp.designation_id || '',
      branch_id: emp.branch_id || '',
      date_of_joining: emp.date_joined || '', employment_type: emp.employment_type || 'permanent',
      profile: { gender: emp.profile?.gender || 'Male' },
    });
    setEditId(emp.id);
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditId(null); };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setProfile = (k) => (e) => setForm(p => ({ ...p, profile: { ...p.profile, [k]: e.target.value } }));

  async function handleSave() {
    if (!form.full_name || !form.email || !form.date_of_joining) {
      toast.error('Full name, email and joining date are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        department_id: form.department_id || undefined,
        designation_id: form.designation_id || undefined,
        branch_id: form.branch_id || undefined,
        date_of_joining: form.date_of_joining,
        employment_type: form.employment_type || 'permanent',
        profile: form.profile,
      };
      if (modal === 'add') {
        const res = await employeeApi.create(payload);
        setEmployees(p => [normalize(res.data), ...p]);
        setTotal(t => t + 1);
        toast.success('Employee added');
      } else {
        const { email, date_of_joining, ...updatePayload } = payload;
        const res = await employeeApi.update(editId, updatePayload);
        setEmployees(p => p.map(e => e.id === editId ? normalize(res.data) : e));
        toast.success('Employee updated');
      }
      closeModal();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      await employeeApi.deactivate(deleteId);
      setEmployees(p => p.map(e => e.id === deleteId ? { ...e, status: 'inactive' } : e));
      setDeleteId(null);
      toast.success('Employee deactivated');
    } catch { toast.error('Failed to deactivate employee'); }
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.full_name?.toLowerCase().includes(q) || e.emp_code?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
    const matchDept = !deptFilter || e.department_id === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">Employees</h2>
          <p className="text-sm text-bodydark">{total} total · {employees.filter(e => e.status === 'active').length} active</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/hrm/employees/org-chart" className="flex items-center gap-1.5 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>
            Org Chart
          </Link>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Employee
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bodydark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search by name, code, email…" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded border border-stroke pl-9 pr-4 py-2 text-sm text-black outline-none focus:border-primary" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : (
        <div className="table-responsive">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-1 text-left">
                <th className="px-5 py-3.5 text-xs font-semibold text-bodydark uppercase tracking-wide">Employee</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-bodydark uppercase tracking-wide">Department</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-bodydark uppercase tracking-wide hidden md:table-cell">Designation</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-bodydark uppercase tracking-wide hidden lg:table-cell">Joined</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-bodydark uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-bodydark uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-bodydark text-sm">No employees found</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-1 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                        {emp.full_name?.split(' ').map(w => w[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <Link to={`/hrm/employees/${emp.id}`} className="text-sm font-medium text-black hover:text-primary">
                          {emp.full_name}
                        </Link>
                        <div className="text-xs text-bodydark">{emp.emp_code} · {emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-black">{emp.department || '—'}</td>
                  <td className="px-5 py-4 text-sm text-bodydark hidden md:table-cell">{emp.designation || '—'}</td>
                  <td className="px-5 py-4 text-sm text-bodydark hidden lg:table-cell">{emp.date_joined}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.status === 'active' ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-1/10 text-meta-1'}`}>
                      {emp.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/hrm/employees/${emp.id}`} className="text-bodydark hover:text-primary" title="View">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </Link>
                      <button onClick={() => openEdit(emp)} className="text-bodydark hover:text-primary" title="Edit">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => setDeleteId(emp.id)} className="text-bodydark hover:text-meta-1" title="Deactivate">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        <div className="flex items-center justify-between px-5 py-3 border-t border-stroke text-sm text-bodydark">
          <span>Showing {filtered.length} of {total}</span>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black text-lg">{modal === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
              <button onClick={closeModal} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FF label="Full Name *" value={form.full_name} onChange={set('full_name')} placeholder="Rahul Sharma" />
                <FF label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="rahul@company.com" disabled={modal === 'edit'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FF label="Phone" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
                <FF label="Date of Joining *" type="date" value={form.date_of_joining} onChange={set('date_of_joining')} disabled={modal === 'edit'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Branch / Office</label>
                  <select value={form.branch_id} onChange={set('branch_id')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option value="">— Select —</option>
                    {branches.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Gender</label>
                  <select value={form.profile?.gender || 'Male'} onChange={setProfile('gender')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option>Male</option><option>Female</option><option>Other</option>
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
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={closeModal} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Saving…' : modal === 'add' ? 'Add Employee' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-meta-6/10">
                <svg className="w-7 h-7 text-meta-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Deactivate Employee?</h3>
              <p className="text-sm text-bodydark mb-6">The employee will be deactivated and lose system access.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
                <button onClick={handleDelete} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FF({ label, type='text', value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
        className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary disabled:bg-gray-1 disabled:cursor-not-allowed" />
    </div>
  );
}

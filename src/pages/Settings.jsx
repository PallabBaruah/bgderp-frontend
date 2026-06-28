import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { employeeApi, attendanceApi } from '../api/client';

export default function Settings() {
  const [tab, setTab] = useState('departments');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-black">System Settings</h2>
        <p className="text-sm text-bodydark">Manage departments, designations, and attendance policies</p>
      </div>

      <div className="tab-list">
        {[['departments','Departments'],['designations','Designations'],['policies','Attendance Policies']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {tab === 'departments'  && <DepartmentSettings />}
      {tab === 'designations' && <DesignationSettings />}
      {tab === 'policies'     && <PolicySettings />}
    </div>
  );
}

// ── Departments ────────────────────────────────────────────────────────────────

function DepartmentSettings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await employeeApi.departments();
      setItems(res.data ?? []);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await employeeApi.createDept({ name: name.trim(), is_active: true });
      setItems(p => [...p, res.data]);
      setName('');
      toast.success('Department created');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed'); }
    finally { setSaving(false); }
  }

  async function toggleActive(d) {
    try {
      const res = await employeeApi.patchDept(d.id, { name: d.name, is_active: !d.is_active });
      setItems(p => p.map(x => x.id === d.id ? res.data : x));
    } catch { toast.error('Update failed'); }
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="px-5 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">Departments</h3>
      </div>
      <div className="p-5">
        <div className="flex gap-3 mb-5 max-w-md">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="New department name…" className="flex-1 rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
          <button onClick={handleAdd} disabled={!name.trim() || saving} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {loading ? <div className="flex justify-center py-8"><span className="spinner" /></div> : (
        <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Name','Status','Action'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {items.map(d => (
              <tr key={d.id} className="hover:bg-gray-1">
                <td className="px-5 py-3.5 text-sm font-medium text-black">{d.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${d.is_active ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-9 text-bodydark'}`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => toggleActive(d)} className={`text-xs hover:underline ${d.is_active ? 'text-meta-1' : 'text-meta-3'}`}>
                    {d.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-sm text-bodydark text-center">No departments yet</td></tr>}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

// ── Designations ───────────────────────────────────────────────────────────────

function DesignationSettings() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName]     = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await employeeApi.designations();
      setItems(res.data ?? []);
    } catch { toast.error('Failed to load designations'); }
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await employeeApi.createDesig({ name: name.trim(), is_active: true });
      setItems(p => [...p, res.data]);
      setName('');
      toast.success('Designation created');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed'); }
    finally { setSaving(false); }
  }

  async function toggleActive(d) {
    try {
      const res = await employeeApi.patchDesig(d.id, { name: d.name, is_active: !d.is_active });
      setItems(p => p.map(x => x.id === d.id ? res.data : x));
    } catch { toast.error('Update failed'); }
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="px-5 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">Designations</h3>
      </div>
      <div className="p-5">
        <div className="flex gap-3 mb-5 max-w-md">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="New designation name…" className="flex-1 rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
          <button onClick={handleAdd} disabled={!name.trim() || saving} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {loading ? <div className="flex justify-center py-8"><span className="spinner" /></div> : (
        <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Name','Status','Action'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {items.map(d => (
              <tr key={d.id} className="hover:bg-gray-1">
                <td className="px-5 py-3.5 text-sm font-medium text-black">{d.name}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${d.is_active ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-9 text-bodydark'}`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button onClick={() => toggleActive(d)} className={`text-xs hover:underline ${d.is_active ? 'text-meta-1' : 'text-meta-3'}`}>
                    {d.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-sm text-bodydark text-center">No designations yet</td></tr>}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

// ── Attendance Policies ────────────────────────────────────────────────────────

const BLANK_POLICY = { name: '', shift_start: '09:00', shift_end: '18:00', grace_minutes: 15, overtime_after_hours: 9, is_default: false, work_days: [1,2,3,4,5,6] };
const DAY_LABELS = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 7:'Sun' };

function PolicySettings() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(BLANK_POLICY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await attendanceApi.policies();
      setItems(res.data ?? []);
    } catch { toast.error('Failed to load policies'); }
    finally { setLoading(false); }
  }

  function openAdd()  { setForm(BLANK_POLICY); setEditId(null); setModal(true); }
  function openEdit(p) {
    setForm({ name: p.name, shift_start: p.shift_start, shift_end: p.shift_end,
      grace_minutes: p.grace_minutes, overtime_after_hours: Number(p.overtime_after_hours), is_default: p.is_default, work_days: p.work_days || [1,2,3,4,5,6] });
    setEditId(p.id); setModal(true);
  }

  async function handleSave() {
    if (!form.name) { toast.error('Policy name required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, grace_minutes: Number(form.grace_minutes), overtime_after_hours: Number(form.overtime_after_hours) };
      if (editId) {
        const res = await attendanceApi.patchPolicy(editId, payload);
        setItems(p => p.map(x => x.id === editId ? res.data : x));
        toast.success('Policy updated');
      } else {
        const res = await attendanceApi.createPolicy(payload);
        setItems(p => [...p, res.data]);
        toast.success('Policy created');
      }
      setModal(false);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  }

  const setF = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <>
    <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">Attendance Policies</h3>
        <button onClick={openAdd} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">+ Add Policy</button>
      </div>
      {loading ? <div className="flex justify-center py-8"><span className="spinner" /></div> : (
      <table className="w-full">
        <thead className="bg-gray-1">
          <tr>{['Policy Name','Shift','Work Days','Grace','OT After','Default',''].map(h => (
            <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-stroke">
          {items.map(p => (
            <tr key={p.id} className="hover:bg-gray-1">
              <td className="px-5 py-3.5 text-sm font-medium text-black">{p.name}</td>
              <td className="px-5 py-3.5 text-sm text-bodydark">{p.shift_start} — {p.shift_end}</td>
              <td className="px-5 py-3.5 text-sm text-bodydark">{(p.work_days || []).map(d => DAY_LABELS[d]).join(', ')}</td>
              <td className="px-5 py-3.5 text-sm text-bodydark">{p.grace_minutes} min</td>
              <td className="px-5 py-3.5 text-sm text-bodydark">{Number(p.overtime_after_hours)}h</td>
              <td className="px-5 py-3.5">{p.is_default && <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">Default</span>}</td>
              <td className="px-5 py-3.5"><button onClick={() => openEdit(p)} className="text-xs text-primary hover:underline">Edit</button></td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-sm text-bodydark text-center">No policies yet</td></tr>}
        </tbody>
      </table>
      )}
    </div>

    {modal && (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
        <div className="modal-box max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
            <h3 className="font-semibold text-black">{editId ? 'Edit Policy' : 'New Attendance Policy'}</h3>
            <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
          </div>
          <div className="p-6 space-y-4">
            <F label="Policy Name *" value={form.name} onChange={setF('name')} placeholder="Standard 9-6" />
            <div className="grid grid-cols-2 gap-4">
              <F label="Shift Start" type="time" value={form.shift_start} onChange={setF('shift_start')} />
              <F label="Shift End" type="time" value={form.shift_end} onChange={setF('shift_end')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <F label="Grace (minutes)" type="number" value={String(form.grace_minutes)} onChange={setF('grace_minutes')} />
              <F label="OT After (hours)" type="number" value={String(form.overtime_after_hours)} onChange={setF('overtime_after_hours')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-2">Work Days</label>
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5,6,7].map(d => (
                  <label key={d} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input type="checkbox" checked={(form.work_days || []).includes(d)}
                      onChange={e => setForm(p => ({ ...p, work_days: e.target.checked ? [...(p.work_days||[]),d].sort() : (p.work_days||[]).filter(x=>x!==d) }))} />
                    {DAY_LABELS[d]}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={setF('is_default')} />
              Set as default policy
            </label>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
            <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Policy'}</button>
          </div>
        </div>
      </div>
    )}
    </>
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

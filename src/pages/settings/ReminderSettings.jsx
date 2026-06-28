import { useState, useEffect } from 'react';
import { reminderConfigApi } from '../../api/client';
import toast from 'react-hot-toast';

const REMINDER_TYPES = [
  { value: 'amc_renewal', label: 'AMC Renewal', color: 'text-primary', bg: 'bg-primary/10' },
  { value: 'warranty_expiry', label: 'Warranty Expiry', color: 'text-meta-6', bg: 'bg-meta-6/10' },
  { value: 'service_due', label: 'Service Due', color: 'text-meta-3', bg: 'bg-meta-3/10' },
  { value: 'refill_due', label: 'Refill Due', color: 'text-meta-5', bg: 'bg-meta-5/10' },
];

const BLANK = {
  reminder_type: 'amc_renewal',
  days_before: 30,
  notify_inapp: true,
  notify_email: false,
  notify_sms: false,
  notify_whatsapp: false,
  is_active: true,
};

export default function ReminderSettings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const load = async () => {
    try {
      const res = await reminderConfigApi.list(filterType !== 'all' ? { type: filterType } : {});
      setConfigs(res.data?.items ?? res.data ?? []);
    } catch {
      toast.error('Failed to load reminder configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterType]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openAdd = () => { setForm(BLANK); setEditItem(null); setModal(true); };
  const openEdit = (c) => {
    setForm({
      reminder_type: c.reminder_type,
      days_before: c.days_before,
      notify_inapp: c.notify_inapp ?? true,
      notify_email: c.notify_email ?? false,
      notify_sms: c.notify_sms ?? false,
      notify_whatsapp: c.notify_whatsapp ?? false,
      is_active: c.is_active ?? true,
    });
    setEditItem(c.id);
    setModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, days_before: Number(form.days_before) };
      if (editItem) {
        await reminderConfigApi.update(editItem, payload);
        toast.success('Reminder updated');
      } else {
        await reminderConfigApi.create(payload);
        toast.success('Reminder created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this reminder config?')) return;
    try {
      await reminderConfigApi.delete(id);
      setConfigs(p => p.filter(c => c.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggle = async (c) => {
    try {
      await reminderConfigApi.update(c.id, { is_active: !c.is_active });
      setConfigs(p => p.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
    } catch {
      toast.error('Toggle failed');
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await reminderConfigApi.seedDefaults();
      toast.success(`Seeded ${res.data?.created ?? 0} default reminder configs`);
      load();
    } catch {
      toast.error('Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const grouped = REMINDER_TYPES.reduce((acc, rt) => {
    acc[rt.value] = configs.filter(c => c.reminder_type === rt.value).sort((a, b) => a.days_before - b.days_before);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Lifecycle Reminder Settings</h2>
          <p className="text-sm text-bodydark">Configure when to send AMC, warranty, service, and refill reminders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSeedDefaults} disabled={seeding} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 disabled:opacity-60">
            {seeding ? 'Seeding…' : 'Seed Defaults'}
          </button>
          <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Add Reminder</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('all')} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>All</button>
        {REMINDER_TYPES.map(rt => (
          <button key={rt.value} onClick={() => setFilterType(rt.value)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterType === rt.value ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>{rt.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="spinner" /></div>
      ) : configs.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-8 text-center space-y-3">
          <p className="text-bodydark text-sm">No reminder configs yet.</p>
          <button onClick={handleSeedDefaults} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">Seed Defaults</button>
        </div>
      ) : (
        <div className="space-y-5">
          {REMINDER_TYPES.filter(rt => filterType === 'all' || filterType === rt.value).map(rt => (
            grouped[rt.value]?.length > 0 && (
              <div key={rt.value} className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
                <div className={`px-5 py-3 border-b border-stroke flex items-center justify-between ${rt.bg}`}>
                  <h3 className={`font-semibold text-sm ${rt.color}`}>{rt.label} Reminders</h3>
                  <span className="text-xs text-bodydark">{grouped[rt.value].length} configured</span>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-1">
                    <tr>{['Days Before', 'In-App', 'Email', 'SMS', 'WhatsApp', 'Active', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-stroke">
                    {grouped[rt.value].map(c => (
                      <tr key={c.id} className="hover:bg-gray-1">
                        <td className="px-5 py-3 text-sm font-semibold text-black">{c.days_before} days</td>
                        <td className="px-5 py-3 text-center">{c.notify_inapp ? <span className="text-meta-3">✓</span> : <span className="text-stroke">—</span>}</td>
                        <td className="px-5 py-3 text-center">{c.notify_email ? <span className="text-meta-3">✓</span> : <span className="text-stroke">—</span>}</td>
                        <td className="px-5 py-3 text-center">{c.notify_sms ? <span className="text-meta-3">✓</span> : <span className="text-stroke">—</span>}</td>
                        <td className="px-5 py-3 text-center">{c.notify_whatsapp ? <span className="text-meta-3">✓</span> : <span className="text-stroke">—</span>}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => handleToggle(c)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${c.is_active ? 'bg-primary' : 'bg-stroke'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${c.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(c)} className="text-xs text-primary hover:underline">Edit</button>
                            <button onClick={() => handleDelete(c.id)} className="text-xs text-meta-1 hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">{editItem ? 'Edit Reminder' : 'Add Reminder'}</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Reminder Type</label>
                <select value={form.reminder_type} onChange={set('reminder_type')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                  {REMINDER_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Days Before Due Date</label>
                <input type="number" value={form.days_before} onChange={set('days_before')} min="1" max="365"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                <p className="text-xs text-bodydark mt-1">Reminder fires this many days before the event date</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-2">Notification Channels</label>
                <div className="space-y-2">
                  {[
                    ['notify_inapp', 'In-App Notification'],
                    ['notify_email', 'Email'],
                    ['notify_sms', 'SMS (coming soon)'],
                    ['notify_whatsapp', 'WhatsApp (coming soon)'],
                  ].map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form[field]} onChange={set(field)} className="w-4 h-4 accent-primary" />
                      <span className="text-sm text-black">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-black">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : editItem ? 'Update' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

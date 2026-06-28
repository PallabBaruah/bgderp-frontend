import { useState } from 'react';
import toast from 'react-hot-toast';

const INIT = [
  { id: 1, contract_no: 'AMC-001', customer: 'ABC Technologies', product: 'CCTV System', scheduled: '2025-05-15', engineer: 'Suresh Kumar', status: 'scheduled', priority: 'normal' },
  { id: 2, contract_no: 'AMC-003', customer: 'Tech Solutions Ltd', product: 'Access Control', scheduled: '2025-05-18', engineer: 'Ravi Prasad', status: 'scheduled', priority: 'high' },
  { id: 3, contract_no: 'AMC-005', customer: 'CloudNine Systems', product: 'UPS & Battery', scheduled: '2025-05-20', engineer: 'Suresh Kumar', status: 'scheduled', priority: 'normal' },
  { id: 4, contract_no: 'AMC-002', customer: 'XYZ Corp', product: 'Fire Alarm System', scheduled: '2025-04-28', engineer: 'Ravi Prasad', status: 'completed', priority: 'normal', completed_on: '2025-04-28' },
  { id: 5, contract_no: 'AMC-001', customer: 'ABC Technologies', product: 'CCTV System', scheduled: '2025-02-15', engineer: 'Suresh Kumar', status: 'completed', priority: 'normal', completed_on: '2025-02-15' },
  { id: 6, contract_no: 'AMC-003', customer: 'Tech Solutions Ltd', product: 'Access Control', scheduled: '2025-04-10', engineer: 'Ravi Prasad', status: 'overdue', priority: 'high' },
];

const STATUS_META = {
  scheduled: { label: 'Scheduled', color: 'bg-meta-5/10 text-meta-5' },
  completed: { label: 'Completed', color: 'bg-meta-3/10 text-meta-3' },
  overdue:   { label: 'Overdue',   color: 'bg-meta-1/10 text-meta-1' },
  cancelled: { label: 'Cancelled', color: 'bg-meta-9 text-bodydark' },
};

const BLANK = { contract_no: '', customer: '', product: '', scheduled: '', engineer: '', priority: 'normal', status: 'scheduled' };

export default function ScheduledVisits() {
  const [visits, setVisits] = useState(INIT);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [updateModal, setUpdateModal] = useState(null);
  const [notes, setNotes] = useState('');

  const filtered = filter === 'all' ? visits : visits.filter(v => v.status === filter);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleAdd = () => {
    if (!form.customer || !form.scheduled) { toast.error('Customer and date required'); return; }
    setVisits(p => [{ ...form, id: Date.now() }, ...p]);
    setModal(false);
    setForm(BLANK);
    toast.success('Visit scheduled');
  };

  const handleComplete = () => {
    setVisits(p => p.map(v => v.id === updateModal ? { ...v, status: 'completed', completed_on: new Date().toISOString().split('T')[0], notes } : v));
    setUpdateModal(null);
    setNotes('');
    toast.success('Visit marked as completed');
  };

  const counts = Object.keys(STATUS_META).reduce((acc, s) => ({ ...acc, [s]: visits.filter(v => v.status === s).length }), {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Scheduled Visits</h2>
          <p className="text-sm text-bodydark">{visits.filter(v=>v.status==='scheduled').length} upcoming · {counts.overdue || 0} overdue</p>
        </div>
        <button onClick={() => setModal(true)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Schedule Visit</button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(STATUS_META).map(([s, m]) => (
          <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)} className={`rounded-sm border p-4 text-left transition-all ${filter === s ? 'border-primary bg-primary/5' : 'border-stroke bg-white shadow-default hover:bg-gray-1'}`}>
            <div className={`text-2xl font-bold mb-1 ${m.color.split(' ')[1]}`}>{counts[s] || 0}</div>
            <div className="text-xs text-bodydark">{m.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
          <h3 className="font-medium text-black">Visit Schedule</h3>
          <div className="flex gap-2">
            {[['all','All'],['scheduled','Upcoming'],['overdue','Overdue'],['completed','Done']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === v ? 'bg-primary text-white' : 'bg-gray-1 text-bodydark hover:bg-gray-2'}`}>{l}</button>
            ))}
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Contract','Customer','Product','Scheduled','Engineer','Priority','Status','Actions'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {filtered.map((v) => {
              const meta = STATUS_META[v.status];
              return (
                <tr key={v.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 font-mono text-sm text-primary">{v.contract_no}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-black">{v.customer}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{v.product}</td>
                  <td className={`px-5 py-3.5 text-sm ${v.status === 'overdue' ? 'text-meta-1 font-semibold' : 'text-black'}`}>{v.scheduled}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{v.engineer}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${v.priority === 'high' ? 'bg-meta-1/10 text-meta-1' : 'bg-meta-9 text-bodydark'}`}>{v.priority}</span>
                  </td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span></td>
                  <td className="px-5 py-3.5">
                    {(v.status === 'scheduled' || v.status === 'overdue') && (
                      <div className="flex gap-2">
                        <button onClick={() => setUpdateModal(v.id)} className="text-xs text-meta-3 hover:underline">Complete</button>
                        <button onClick={() => { setVisits(p => p.map(x => x.id === v.id ? { ...x, status: 'cancelled' } : x)); toast.error('Cancelled'); }} className="text-xs text-meta-1 hover:underline">Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Schedule Visit</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Contract No" value={form.contract_no} onChange={set('contract_no')} placeholder="AMC-001" />
                <F label="Customer *" value={form.customer} onChange={set('customer')} placeholder="Customer Ltd" />
              </div>
              <F label="Product / Equipment" value={form.product} onChange={set('product')} placeholder="CCTV System" />
              <div className="grid grid-cols-2 gap-4">
                <F label="Scheduled Date *" type="date" value={form.scheduled} onChange={set('scheduled')} />
                <F label="Engineer" value={form.engineer} onChange={set('engineer')} placeholder="Suresh Kumar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Priority</label>
                <select value={form.priority} onChange={set('priority')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                  <option value="normal">Normal</option><option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleAdd} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Schedule Visit</button>
            </div>
          </div>
        </div>
      )}

      {updateModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Complete Visit</h3>
              <button onClick={() => setUpdateModal(null)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Time In" type="time" placeholder="09:00" />
                <F label="Time Out" type="time" placeholder="13:00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Service Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Describe work done during visit…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setUpdateModal(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleComplete} className="rounded bg-meta-3 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Mark Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
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

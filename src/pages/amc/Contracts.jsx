import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { amcApi } from '../../api/client';
import toast from 'react-hot-toast';

const STATUS_META = {
  active:           { label: 'Active',           color: 'bg-meta-3/10 text-meta-3' },
  expired:          { label: 'Expired',          color: 'bg-meta-1/10 text-meta-1' },
  pending_renewal:  { label: 'Pending Renewal',  color: 'bg-meta-6/10 text-meta-6' },
  draft:            { label: 'Draft',            color: 'bg-meta-9 text-bodydark' },
};

const BLANK = { contract_no: '', customer: '', product: '', start: '', end: '', value: '', visits: 4, status: 'active' };

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const toListItem = (raw) => ({
    ...raw,
    contract_no: raw.contract_no ?? raw.contract_number ?? '',
    customer: raw.customer ?? raw.customer_name ?? '',
    product: raw.product ?? '',
    start: raw.start ?? (raw.start_date ? String(raw.start_date) : ''),
    end: raw.end ?? (raw.end_date ? String(raw.end_date) : ''),
    value: raw.value ?? Number(raw.amount) ?? 0,
    visits: raw.visits ?? raw.visits_included ?? 4,
    completed_visits: raw.completed_visits ?? raw.visits_used ?? 0,
    status: raw.status ?? 'active',
  });

  const load = async () => {
    try {
      const res = await amcApi.list();
      const raw = res.data?.results ?? res.data?.items ?? res.data ?? [];
      setContracts(raw.map(toListItem));
    } catch {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = contracts.filter((c) => {
    const match = c.customer?.toLowerCase().includes(search.toLowerCase()) || c.contract_no?.toLowerCase().includes(search.toLowerCase()) || c.product?.toLowerCase().includes(search.toLowerCase());
    const status = statusFilter === 'all' || c.status === statusFilter;
    return match && status;
  });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openAdd = () => { setForm(BLANK); setModal('add'); };
  const openEdit = (c) => { setForm({ ...c, value: String(c.value), visits: String(c.visits) }); setEditId(c.id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };

  const handleSave = async () => {
    if (!form.customer) { toast.error('Customer name required'); return; }
    setSaving(true);
    try {
      const payload = {
        customer_name: form.customer,
        customer_phone: form.phone || '',
        start_date: form.start || new Date().toISOString().split('T')[0],
        end_date: form.end || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        amount: Number(form.value) || 0,
        visits_included: Number(form.visits) || 4,
        status: form.status || 'active',
        contract_type: 'amc',
        billing_cycle: 'annual',
        refill_type: 'yearly',
      };
      if (modal === 'add') {
        const res = await amcApi.create(payload);
        setContracts(p => [toListItem(res.data), ...p]);
        toast.success('Contract created');
      } else {
        const res = await amcApi.update(editId, payload);
        setContracts(p => p.map(c => c.id === editId ? toListItem(res.data) : c));
        toast.success('Contract updated');
      }
      closeModal();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await amcApi.delete(deleteId);
      setContracts(p => p.filter(c => c.id !== deleteId));
      setDeleteId(null);
      toast.success('Contract deleted');
    } catch {
      toast.error('Failed to delete contract');
    }
  };

  const totalValue = filtered.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">AMC Contracts</h2>
          <p className="text-sm text-bodydark">{filtered.length} contracts · Total value ₹{(totalValue/100000).toFixed(1)}L</p>
        </div>
        <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ New Contract</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(STATUS_META).map(([status, meta]) => (
          <button key={status} onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)} className={`rounded-sm border p-4 text-left transition-all ${statusFilter === status ? 'border-primary bg-primary/5' : 'border-stroke bg-white shadow-default hover:bg-gray-1'}`}>
            <div className={`text-xl font-bold mb-1 ${meta.color.split(' ')[1]}`}>{contracts.filter(c=>c.status===status).length}</div>
            <div className="text-xs text-bodydark">{meta.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bodydark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search customer, contract no, product…" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded border border-stroke pl-9 pr-4 py-2 text-sm text-black outline-none focus:border-primary" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
            <option value="all">All Status</option>
            {Object.entries(STATUS_META).map(([v,m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : (
        <div className="table-responsive">
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Contract No','Customer','Product','Period','Value','Visits','Status','Actions'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {filtered.map((c) => {
                const meta = STATUS_META[c.status];
                const visitPct = c.visits ? (c.completed_visits / c.visits) * 100 : 0;
                return (
                  <tr key={c.id} className="hover:bg-gray-1">
                    <td className="px-5 py-4 font-mono text-sm font-medium text-black">{c.contract_no}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-sm text-black">{c.customer}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-bodydark">{c.product}</td>
                    <td className="px-5 py-4 text-sm text-bodydark">
                      <div>{c.start}</div>
                      <div className="text-xs">to {c.end}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-black">₹{(c.value ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-bodydark mb-1">{c.completed_visits}/{c.visits}</div>
                      <div className="progress-bar w-16">
                        <div className="progress-fill bg-primary" style={{ width: `${visitPct}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/amc/contracts/${c.id}`} className="text-bodydark hover:text-primary" title="View">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                        <button onClick={() => openEdit(c)} className="text-bodydark hover:text-primary" title="Edit">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="text-bodydark hover:text-meta-1" title="Delete">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black text-lg">{modal === 'add' ? 'New AMC Contract' : 'Edit Contract'}</h3>
              <button onClick={closeModal} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Contract No" value={form.contract_no} onChange={set('contract_no')} placeholder="AMC-007" />
                <F label="Customer Name *" value={form.customer} onChange={set('customer')} placeholder="Customer Ltd" />
              </div>
              <F label="Product / Equipment *" value={form.product} onChange={set('product')} placeholder="CCTV System" />
              <div className="grid grid-cols-2 gap-4">
                <F label="Start Date" type="date" value={form.start} onChange={set('start')} />
                <F label="End Date" type="date" value={form.end} onChange={set('end')} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Contract Value (₹)" type="number" value={form.value} onChange={set('value')} placeholder="85000" />
                <F label="Visits per Year" type="number" value={String(form.visits)} onChange={set('visits')} placeholder="4" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Status</label>
                  <select value={form.status} onChange={set('status')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {Object.entries(STATUS_META).map(([v,m]) => <option key={v} value={v}>{m.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={closeModal} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : modal === 'add' ? 'Create Contract' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-meta-1/10">
                <svg className="w-7 h-7 text-meta-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Delete Contract?</h3>
              <p className="text-sm text-bodydark mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
                <button onClick={handleDelete} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Delete</button>
              </div>
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

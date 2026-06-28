import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/client';
import { INDIAN_STATES } from '../../constants/indianStates';
import toast from 'react-hot-toast';

const TODAY = new Date().toISOString().slice(0, 10);

const BLANK = {
  name: '', contact: '', phone: '', email: '', gstin: '',
  billing_street: '', city: '', billing_state: '', billing_pincode: '',
  shipping_same: true,
  shipping_street: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
  credit_limit: '', opening_balance: '', opening_balance_date: TODAY,
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [amcFilter, setAmcFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await customerApi.list();
      setCustomers(res.data?.results ?? res.data ?? []);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = customers.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.contact?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchAmc = amcFilter === 'all' || (amcFilter === 'active' && c.active_amc) || (amcFilter === 'none' && !c.active_amc);
    return matchSearch && matchAmc;
  });

  const openAdd = () => { setForm(BLANK); setEditId(null); setModal(true); };
  const openEdit = (c) => {
    setForm({
      name: c.name, contact: c.contact || '', phone: c.phone || '', email: c.email || '', gstin: c.gstin || '',
      billing_street: c.billing_street || '', city: c.city || '', billing_state: c.billing_state || '', billing_pincode: c.billing_pincode || '',
      shipping_same: c.shipping_same !== false,
      shipping_street: c.shipping_street || '', shipping_city: c.shipping_city || '',
      shipping_state: c.shipping_state || '', shipping_pincode: c.shipping_pincode || '',
      credit_limit: c.credit_limit != null ? String(c.credit_limit) : '',
      opening_balance: c.opening_balance != null ? String(c.opening_balance) : '',
      opening_balance_date: c.opening_balance_date || TODAY,
    });
    setEditId(c.id); setModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Customer name required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        credit_limit: form.credit_limit !== '' ? parseFloat(form.credit_limit) : null,
        opening_balance: form.opening_balance !== '' ? parseFloat(form.opening_balance) : null,
        opening_balance_date: form.opening_balance_date || null,
      };
      if (editId) {
        const res = await customerApi.update(editId, payload);
        setCustomers(p => p.map(x => x.id === editId ? res.data : x));
        toast.success('Customer updated');
      } else {
        const res = await customerApi.create(payload);
        setCustomers(p => [res.data, ...p]);
        toast.success('Customer added');
      }
      setModal(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Customer Database</h2>
          <p className="text-sm text-bodydark">{customers.length} customers · {customers.filter(c => c.active_amc).length} with active AMC</p>
        </div>
        <button onClick={openAdd} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Add Customer</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, contact, phone…" className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary w-72 bg-white" />
        <div className="flex gap-1.5">
          {[['all', 'All'], ['active', 'Active AMC'], ['none', 'No AMC']].map(([v, l]) => (
            <button key={v} onClick={() => setAmcFilter(v)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${amcFilter === v ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? <div className="flex justify-center py-16"><span className="spinner" /></div> : <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['Customer', 'Contact', 'City', 'AMC Status', 'AMC Contracts', 'Total Revenue', 'Joined', 'Actions'].map(h => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-1">
                <td className="px-5 py-4">
                  <Link to={`/customers/${c.id}`} className="text-sm font-semibold text-primary hover:underline">{c.name}</Link>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm font-medium text-black">{c.contact}</div>
                  <div className="text-xs text-bodydark">{c.phone}</div>
                </td>
                <td className="px-5 py-4 text-sm text-bodydark">{c.city}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.active_amc ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-9 text-bodydark'}`}>
                    {c.active_amc ? 'Active AMC' : 'No AMC'}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-bodydark text-center">{c.amc_count}</td>
                <td className="px-5 py-4 text-sm font-semibold text-black">₹{(c.total_revenue ?? 0).toLocaleString()}</td>
                <td className="px-5 py-4 text-sm text-bodydark">{c.joined}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link to={`/customers/${c.id}`} className="text-xs text-primary hover:underline">View</Link>
                    <button onClick={() => openEdit(c)} className="text-xs text-meta-5 hover:underline">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">{editId ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Basic info */}
              <F label="Company / Customer Name *" value={form.name} onChange={set('name')} placeholder="ABC Technologies Pvt Ltd" />
              <div className="grid grid-cols-3 gap-4">
                <F label="Contact Person" value={form.contact} onChange={set('contact')} placeholder="Rajesh Kumar" />
                <F label="Phone" value={form.phone} onChange={set('phone')} placeholder="9876543000" />
                <F label="Email" type="email" value={form.email} onChange={set('email')} placeholder="rajesh@abc.com" />
              </div>
              <F label="GSTIN" value={form.gstin} onChange={set('gstin')} placeholder="22AAAAA0000A1Z5" />

              {/* Billing Address */}
              <div>
                <p className="text-xs font-semibold text-black uppercase tracking-wide mb-3 pb-1 border-b border-stroke">Billing Address</p>
                <div className="space-y-3">
                  <F label="Street / Area / Building" value={form.billing_street} onChange={set('billing_street')} placeholder="123, MG Road, Sector 4" />
                  <div className="grid grid-cols-3 gap-3">
                    <F label="City" value={form.city} onChange={set('city')} placeholder="Mumbai" />
                    <StateSelect label="State" value={form.billing_state} onChange={set('billing_state')} />
                    <F label="Pincode" value={form.billing_pincode} onChange={set('billing_pincode')} placeholder="400001" />
                  </div>
                </div>
              </div>

              {/* Credit & Balance */}
              <div>
                <p className="text-xs font-semibold text-black uppercase tracking-wide mb-3 pb-1 border-b border-stroke">Credit &amp; Balance</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Opening Balance (₹)" type="number" value={form.opening_balance} onChange={set('opening_balance')} placeholder="0.00" />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-black">As Of Date</label>
                      <input type="date" value={form.opening_balance_date} onChange={set('opening_balance_date')}
                        className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="text-sm font-medium text-black">Credit Limit</label>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="credit_limit_type" checked={form.credit_limit === ''}
                          onChange={() => setForm(f => ({ ...f, credit_limit: '' }))}
                          className="accent-primary" />
                        <span className="text-sm text-bodydark">No Limit</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="credit_limit_type" checked={form.credit_limit !== ''}
                          onChange={() => setForm(f => ({ ...f, credit_limit: '0' }))}
                          className="accent-primary" />
                        <span className="text-sm text-bodydark">Custom Limit</span>
                      </label>
                      {form.credit_limit !== '' && (
                        <input type="number" min="0" value={form.credit_limit} onChange={set('credit_limit')}
                          placeholder="e.g. 50000"
                          className="w-36 rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary" />
                      )}
                    </div>
                    {form.credit_limit !== '' && (
                      <p className="text-xs text-bodydark mt-1.5">Credit sale blocked / warned when outstanding balance exceeds this amount</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-stroke mb-3">
                  <p className="text-xs font-semibold text-black uppercase tracking-wide">Shipping Address</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.shipping_same}
                      onChange={e => setForm(f => ({ ...f, shipping_same: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-primary" />
                    <span className="text-xs text-bodydark">Same as Billing</span>
                  </label>
                </div>
                {!form.shipping_same && (
                  <div className="space-y-3">
                    <F label="Street / Area / Building" value={form.shipping_street} onChange={set('shipping_street')} placeholder="456, Industrial Area" />
                    <div className="grid grid-cols-3 gap-3">
                      <F label="City" value={form.shipping_city} onChange={set('shipping_city')} placeholder="Pune" />
                      <StateSelect label="State" value={form.shipping_state} onChange={set('shipping_state')} />
                      <F label="Pincode" value={form.shipping_pincode} onChange={set('shipping_pincode')} placeholder="411001" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : editId ? 'Update' : 'Add Customer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
    </div>
  );
}

function StateSelect({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <select value={value} onChange={onChange} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary bg-white">
        <option value="">— Select State —</option>
        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

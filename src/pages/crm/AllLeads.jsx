import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '../../api/client';
import toast from 'react-hot-toast';

const CLOSURE_STATUSES = new Set(['won','closed_won','completed','delivered','installed','commissioned','converted']);

// ATE DVR visit stage labels — status values (backend) unchanged
const STAGES = ['All','new','contacted','qualified','proposal','negotiation','won','lost'];
const STAGE_LABEL = {
  new:         'New',
  contacted:   'Welcome Visit',
  qualified:   'Reminder Visit',
  proposal:    'Follow Up',
  negotiation: 'Repeat',
  won:         'Won',
  lost:        'Lost',
};
const SOURCES = ['All','walk_in','referral','website','call','social','campaign','exhibition','just_dial','india_mart'];
const SOURCE_LABEL = { walk_in: 'Walk-in', referral: 'Referral', website: 'Website', call: 'Cold Call', social: 'Social', campaign: 'Campaign', exhibition: 'Exhibition', just_dial: 'Just Dial', india_mart: 'India Mart' };

const STAGE_META = {
  new:         { color: 'bg-bodydark-2/20 text-bodydark' },
  contacted:   { color: 'bg-meta-5/10 text-meta-5' },
  qualified:   { color: 'bg-meta-6/10 text-meta-6' },
  proposal:    { color: 'bg-meta-3/10 text-meta-3' },
  negotiation: { color: 'bg-meta-8/10 text-meta-8' },
  won:         { color: 'bg-meta-3/15 text-meta-3 font-semibold' },
  lost:        { color: 'bg-meta-1/10 text-meta-1' },
};

function getFollowupInfo(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)  return { label: 'Overdue',   color: 'bg-meta-1/10 text-meta-1' };
  if (diff === 0) return { label: 'Today',     color: 'bg-meta-6/10 text-meta-6' };
  if (diff === 1) return { label: 'Tomorrow',  color: 'bg-meta-8/10 text-meta-8' };
  if (diff <= 7)  return { label: 'This Week', color: 'bg-meta-5/10 text-meta-5' };
  return { label: dateStr, color: 'bg-bodydark/10 text-bodydark' };
}

const BLANK_FORM  = { company:'', contact:'', phone:'', email:'', source:'walk_in', stage:'new', category:'', product_enquired:'', location:'', value:'', notes:'', assigned_to:'', next_followup_date:'' };
const BLANK_VISIT = { visit_type:'welcome', date:'', product_enquired:'', remarks:'' };
const BLANK_ITEM  = { product_id:'', product_name:'', qty:1, unit_price:'', notes:'' };
const VISIT_TYPES = [
  { value:'welcome',   label:'1st — Welcome Visit' },
  { value:'reminder',  label:'2nd — Reminder Visit' },
  { value:'follow_up', label:'3rd — Follow Up' },
  { value:'repeat',    label:'4th — Repeat' },
  { value:'fifth',     label:'5th — Final Visit' },
];

export default function AllLeads() {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [stageFilter, setStageFilter]   = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(BLANK_FORM);
  const [editId, setEditId]     = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [masterSources, setMasterSources] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dvrModal, setDvrModal]   = useState(null);
  const [visitForm, setVF]        = useState({ visit_type:'welcome', date:'', product_enquired:'', remarks:'' });
  const [vSaving, setVSaving]     = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [modalNewItem, setMNI]    = useState({ ...BLANK_ITEM });

  const normalize = (l) => ({
    ...l,
    contact: l.contact ?? l.name ?? '',
    stage: l.status || 'new',
    value: Number(l.expected_value) || 0,
    next_followup_date: l.next_followup_date || '',
    items: l.items || [],
  });

  const load = async () => {
    try {
      const res = await leadsApi.list();
      const raw = res.data?.results ?? res.data?.items ?? res.data ?? [];
      setLeads(raw.map(normalize));
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    leadsApi.products().then(r => setProducts(r.data || [])).catch(() => {});
    leadsApi.masters('category').then(r => setCategories(r.data || [])).catch(() => {});
    leadsApi.masters('source').then(r => setMasterSources(r.data || [])).catch(() => {});
    
    import('../../api/client').then(({ employeeApi }) => {
      employeeApi.list({ limit: 100 }).then(r => setEmployees(r.data?.items || [])).catch(() => {});
    });
  }, []);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !search || l.company?.toLowerCase().includes(q) || l.contact?.toLowerCase().includes(q) || l.phone?.includes(q) || l.category?.toLowerCase().includes(q);
    const matchStage = stageFilter === 'All' || l.stage === stageFilter;
    const matchSource = sourceFilter === 'All' || l.source === sourceFilter;
    return matchSearch && matchStage && matchSource;
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openAdd = () => { setForm(BLANK_FORM); setModalItems([]); setMNI({...BLANK_ITEM}); setModal('add'); };
  const openEdit = (l) => { setForm({ ...l, value: String(l.value) }); setModalItems(l.items || []); setMNI({...BLANK_ITEM}); setEditId(l.id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); setModalItems([]); };

  async function handleSave() {
    if (!form.contact) { toast.error('Contact Person is required'); return; }
    if (!form.phone) { toast.error('Phone number is required'); return; }

    setSaving(true);
    try {
      const itemsTotal = modalItems.reduce((s,it) => s + (Number(it.unit_price)||0)*(Number(it.qty)||1), 0);
      const payload = {
        name: form.contact,
        company: form.company || '',
        phone: form.phone,
        email: form.email || undefined,
        source: form.source || 'walk_in',
        status: form.stage || 'new',
        category: form.category || undefined,
        product_enquired: form.product_enquired || (modalItems[0]?.product_name) || undefined,
        location: form.location || undefined,
        expected_value: Number(form.value) || itemsTotal || 0,
        enquiry_text: form.notes || undefined,
        next_followup_date: form.next_followup_date || undefined,
        items: modalItems.length > 0 ? modalItems : undefined,
      };
      if (modal === 'add') {
        const res = await leadsApi.create(payload);
        setLeads((p) => [normalize(res.data), ...p]);
        toast.success('Lead added');
      } else {
        const res = await leadsApi.update(editId, payload);
        setLeads((p) => p.map((l) => l.id === editId ? normalize(res.data) : l));
        toast.success('Lead updated');
      }
      closeModal();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  function handleModalAddItem() {
    if (!modalNewItem.product_name.trim()) { toast.error('Select product'); return; }
    const prod = products.find(p => p.id === modalNewItem.product_id);
    setModalItems(prev => [...prev, {
      product_id: modalNewItem.product_id || null,
      product_name: modalNewItem.product_name,
      qty: Number(modalNewItem.qty) || 1,
      unit_price: modalNewItem.unit_price ? Number(modalNewItem.unit_price) : null,
      notes: modalNewItem.notes || null,
      amc_applicable: prod?.amc_applicable || false,
      warranty_applicable: prod?.warranty_applicable || false,
      service_applicable: prod?.service_applicable || false,
      refill_applicable: prod?.refill_applicable || false,
    }]);
    setMNI({...BLANK_ITEM});
  }

  const handleDelete = async () => {
    try {
      await leadsApi.delete(deleteId);
      setLeads((p) => p.filter((l) => l.id !== deleteId));
      setDeleteId(null);
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleConvert = async (id) => {
    try {
      await leadsApi.convert(id, { conversion_type: 'customer' });
      setLeads((p) => p.map((l) => l.id === id ? { ...l, stage: 'Won', status: 'won' } : l));
      toast.success('Lead converted!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Convert failed');
    }
  };

  const totalValue = filtered.reduce((sum, l) => sum + l.value, 0);

  function openDvr(lead) {
    const visitCount = (lead.visits || []).length;
    const types = ['welcome','reminder','follow_up','repeat','fifth'];
    const nextType = types[Math.min(visitCount, 4)];
    setVF({ visit_type: nextType, date: new Date().toISOString().split('T')[0], product_enquired:'', remarks:'' });
    setDvrModal(lead);
  }

  async function handleLogVisit() {
    if (!visitForm.date) { toast.error('Select visit date'); return; }
    setVSaving(true);
    try {
      const res = await leadsApi.logVisit(dvrModal.id, visitForm);
      setLeads(p => p.map(l => l.id === dvrModal.id ? normalize(res.data) : l));
      toast.success('Visit logged ✓');
      setDvrModal(null);
    } catch(e) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setVSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">All Leads</h2>
          <p className="text-sm text-bodydark">{filtered.length} leads · Pipeline value ₹{(totalValue/100000).toFixed(1)}L</p>
        </div>
        <div className="flex gap-2">
          <Link to="/crm/kanban" className="flex items-center gap-1.5 rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>
            Kanban
          </Link>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="rounded-sm border border-stroke bg-white shadow-default p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bodydark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search company, contact, email…" value={search} onChange={e => setSearch(e.target.value)} className="w-full rounded border border-stroke pl-9 pr-4 py-2 text-sm text-black outline-none focus:border-primary" />
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
            {SOURCES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : SOURCE_LABEL[s] || s}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {STAGES.map((s) => (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${stageFilter === s ? 'bg-primary text-white' : 'bg-gray-1 text-bodydark hover:bg-gray-2'}`}>
              {s === 'All' ? 'All' : STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="w-full">
                <thead className="bg-gray-1">
                  <tr>{['Sr.','Party / Company','Phone · Category','Stage','Follow-up','Visits','Est. Value / PO','Actions'].map(h => <th key={h} className="px-4 py-3.5 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {filtered.map((l, idx) => {
                    const stageMeta = STAGE_META[l.stage] || STAGE_META.new;
                    const visits    = l.visits || [];
                    const poTotal   = (l.po_amounts || []).reduce((s, n) => s + (Number(n) || 0), 0);
                    const lastVisit = visits.length ? visits[visits.length - 1]?.date : null;
                    return (
                      <tr key={l.id} className="hover:bg-gray-1">
                        <td className="px-4 py-3.5 text-xs text-bodydark">{idx + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Link to={`/crm/leads/${l.id}`} className="font-medium text-black hover:text-primary text-sm">
                              {l.company || l.contact}
                            </Link>
                            {l.is_converted && (
                              <span className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-meta-3/10 text-meta-3">Customer</span>
                            )}
                          </div>
                          <div className="text-xs text-bodydark">{l.contact} · {l.lead_no}</div>
                          {l.location && <div className="text-[10px] text-bodydark">📍 {l.location}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-black">{l.phone}</div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {l.category && <span className="text-[10px] rounded bg-meta-5/10 text-meta-5 px-1.5 py-0.5">{l.category}</span>}
                            {l.product_enquired && <span className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5">{l.product_enquired}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stageMeta.color}`}>
                            {STAGE_LABEL[l.stage] ?? l.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {(() => {
                            const fu = getFollowupInfo(l.next_followup_date);
                            return fu ? (
                              <>
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${fu.color}`}>{fu.label}</span>
                                <div className="text-[10px] text-bodydark mt-0.5">{l.next_followup_date}</div>
                              </>
                            ) : <span className="text-xs text-bodydark">—</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-medium text-black">{visits.length} / 5</div>
                          {lastVisit && <div className="text-[10px] text-bodydark">Last: {lastVisit}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-black">{l.value > 0 ? `₹${l.value.toLocaleString()}` : '—'}</div>
                          {poTotal > 0 && <div className="text-[10px] text-meta-3 font-semibold">PO: ₹{poTotal.toLocaleString()}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Link to={`/crm/leads/${l.id}`} className="text-bodydark hover:text-primary" title="View Lead">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </Link>
                            {!CLOSURE_STATUSES.has(l.stage) && (<>
                              <button onClick={() => openDvr(l)} className="text-meta-5 hover:text-meta-5/70" title="Log DVR Visit">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
                              </button>
                              <button onClick={() => openEdit(l)} className="text-bodydark hover:text-primary" title="Edit">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button onClick={() => setDeleteId(l.id)} className="text-bodydark hover:text-meta-1" title="Delete">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            </>)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-stroke text-sm text-bodydark">
              Showing {filtered.length} of {leads.length} leads
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box max-w-2xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black text-lg">{modal === 'add' ? 'Add New Lead' : 'Edit Lead'}</h3>
              <button onClick={closeModal} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Party / Company" value={form.company} onChange={set('company')} placeholder="ABC Pvt Ltd" />
                <F label="Contact Person *" value={form.contact} onChange={set('contact')} placeholder="Ramesh Kumar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Phone *" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
                <F label="Email" type="email" value={form.email} onChange={set('email')} placeholder="ramesh@abc.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Category</label>
                <select value={form.category} onChange={set('category')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                  <option value="">— Select category —</option>
                  {categories.length > 0
                    ? categories.map(c => <option key={c.id} value={c.value}>{c.label}</option>)
                    : ['Retail','Project','End Customer'].map(c => <option key={c} value={c}>{c}</option>)
                  }
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Location / Area" value={form.location} onChange={set('location')} placeholder="e.g. Guwahati, Jorhat" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Source</label>
                  <select value={form.source} onChange={set('source')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {masterSources.length > 0
                      ? masterSources.map(s => <option key={s.id} value={s.value}>{s.label}</option>)
                      : SOURCES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{SOURCE_LABEL[s] || s}</option>)
                    }
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Expected Value (₹)" type="number" value={form.value} onChange={set('value')} placeholder="100000" />
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Initial Stage</label>
                  <select value={form.stage} onChange={set('stage')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {STAGES.filter(s=>s!=='All').map(s=><option key={s} value={s}>{STAGE_LABEL[s] || s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Assigned To</label>
                  <select value={form.assigned_to || ''} onChange={set('assigned_to')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option value="">— Unassigned —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.user_id || ''}>
                        {e.full_name} ({e.department?.name || 'No Dept'})
                      </option>
                    ))}
                  </select>
                </div>
                <F label="Next Follow-up Date" type="date" value={form.next_followup_date} onChange={set('next_followup_date')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Enquiry Notes</label>
                <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Initial requirements or enquiry details…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>

              {/* Items / Products Section */}
              <div className="border border-stroke rounded-sm">
                <div className="px-4 py-2.5 bg-gray-1 border-b border-stroke flex items-center justify-between">
                  <span className="text-xs font-semibold text-bodydark uppercase tracking-wide">
                    Products &amp; Services {modalItems.length > 0 && `(${modalItems.length})`}
                  </span>
                  {modalItems.length > 0 && (
                    <span className="text-xs font-medium text-black">
                      Total: ₹{modalItems.reduce((s,it)=>s+(Number(it.unit_price)||0)*(Number(it.qty)||1),0).toLocaleString()}
                    </span>
                  )}
                </div>
                {/* Add row */}
                <div className="px-4 py-3 border-b border-stroke">
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] text-bodydark mb-1">Product</label>
                      <select
                        value={modalNewItem.product_id}
                        onChange={e => {
                          const prod = products.find(p => p.id === e.target.value);
                          setMNI(prev => ({ ...prev, product_id: e.target.value, product_name: prod ? prod.name : prev.product_name }));
                        }}
                        className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary bg-white"
                      >
                        <option value="">— Select —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-16">
                      <label className="block text-[10px] text-bodydark mb-1">Qty</label>
                      <input type="number" min="0.01" step="0.01" value={modalNewItem.qty}
                        onChange={e => setMNI(prev => ({ ...prev, qty: e.target.value }))}
                        className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] text-bodydark mb-1">Unit Price</label>
                      <input type="number" min="0" step="0.01" value={modalNewItem.unit_price} placeholder="₹"
                        onChange={e => setMNI(prev => ({ ...prev, unit_price: e.target.value }))}
                        className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <label className="block text-[10px] text-bodydark mb-1">Notes</label>
                      <input type="text" value={modalNewItem.notes} placeholder="Serial / remarks"
                        onChange={e => setMNI(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                    </div>
                    <button onClick={handleModalAddItem}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 whitespace-nowrap">
                      + Add
                    </button>
                  </div>
                </div>
                {/* Items list */}
                {modalItems.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-bodydark">No items added yet — add products above</div>
                ) : (
                  <div className="divide-y divide-stroke">
                    {modalItems.map((it, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-black">{it.product_name}</span>
                          <span className="text-xs text-bodydark ml-2">×{it.qty}</span>
                          {it.unit_price && <span className="text-xs text-bodydark ml-1">@ ₹{Number(it.unit_price).toLocaleString()}</span>}
                          {it.notes && <span className="text-xs text-bodydark ml-2 italic">{it.notes}</span>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {it.amc_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">AMC</span>}
                          {it.warranty_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-6/10 text-meta-6">Warranty</span>}
                          {it.service_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-3/10 text-meta-3">Service</span>}
                          {it.refill_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-5/10 text-meta-5">Refill</span>}
                        </div>
                        <div className="text-sm font-medium text-black flex-shrink-0 w-20 text-right">
                          {(Number(it.unit_price)||0) > 0 ? `₹${((Number(it.unit_price)||0)*(Number(it.qty)||1)).toLocaleString()}` : '—'}
                        </div>
                        <button onClick={() => setModalItems(prev => prev.filter((_,i)=>i!==idx))}
                          className="text-danger text-sm hover:opacity-70 flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={closeModal} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Saving…' : modal === 'add' ? 'Add Lead' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-meta-1/10">
                <svg className="w-7 h-7 text-meta-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Delete Lead?</h3>
              <p className="text-sm text-bodydark mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
                <button onClick={handleDelete} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DVR Log Visit Modal */}
      {dvrModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDvrModal(null)}>
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <div>
                <h3 className="font-semibold text-black">Log DVR Visit</h3>
                <p className="text-xs text-bodydark mt-0.5">
                  {dvrModal.company || dvrModal.contact} · {(dvrModal.visits||[]).length}/5 visits done
                </p>
              </div>
              <button onClick={() => setDvrModal(null)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Visit Type</label>
                  <select value={visitForm.visit_type} onChange={e => setVF(p=>({...p,visit_type:e.target.value}))}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {VISIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Visit Date</label>
                  <input type="date" value={visitForm.date} onChange={e => setVF(p=>({...p,date:e.target.value}))}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Product Enquired</label>
                <select value={visitForm.product_enquired} onChange={e => setVF(p=>({...p,product_enquired:e.target.value}))}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                  <option value="">— Select product —</option>
                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="__other">Other (note in remarks)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Remarks</label>
                <textarea value={visitForm.remarks} onChange={e => setVF(p=>({...p,remarks:e.target.value}))}
                  rows={3} placeholder="Visit outcome, client feedback, next steps…"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none"/>
              </div>
              {(dvrModal.visits||[]).length > 0 && (
                <div className="rounded bg-gray-1 px-3 py-2 space-y-1">
                  <p className="text-xs font-medium text-bodydark mb-1">Previous visits:</p>
                  {(dvrModal.visits||[]).map((v,i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">{i+1}</span>
                      <span className="text-bodydark">{v.date}</span>
                      {v.product_enquired && <span className="text-primary">{v.product_enquired}</span>}
                      {v.remarks && <span className="truncate text-bodydark italic">{v.remarks}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setDvrModal(null)} className="rounded border border-stroke bg-white px-4 py-2 text-sm text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleLogVisit} disabled={vSaving} className="rounded bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">
                {vSaving ? 'Logging…' : 'Log Visit'}
              </button>
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

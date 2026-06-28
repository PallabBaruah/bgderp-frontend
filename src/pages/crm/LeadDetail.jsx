import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/client';

const CLOSURE_STATUSES = new Set(['won','closed_won','completed','delivered','installed','commissioned','converted']);
const DOC_TYPES = [
  { value: 'delivery_challan',        label: 'Delivery Challan' },
  { value: 'installation_report',     label: 'Installation Report' },
  { value: 'completion_certificate',  label: 'Completion Certificate' },
  { value: 'warranty_card',           label: 'Warranty Card' },
  { value: 'service_report',          label: 'Service Report' },
  { value: 'customer_acceptance',     label: 'Customer Acceptance Document' },
  { value: 'other',                   label: 'Other Supporting Document' },
];

const STAGE_MAP = {}; // Will be populated dynamically
const ACT_META = {
  call:    { icon:'📞', label:'Call',     color:'bg-meta-5/10 text-meta-5' },
  whatsapp:{ icon:'💬', label:'WhatsApp', color:'bg-meta-3/10 text-meta-3' },
  meeting: { icon:'🤝', label:'Meeting',  color:'bg-meta-6/10 text-meta-6' },
  email:   { icon:'✉',  label:'Email',    color:'bg-primary/10 text-primary' },
  note:    { icon:'📝', label:'Note',     color:'bg-bodydark/10 text-bodydark' },
};



export default function LeadDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [lead, setLead]         = useState(null);
  const [activities, setActs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState(location.state?.openVisit ? 'visits' : 'overview');
  const [actForm, setActForm]   = useState({ activity_type:'call', summary:'', outcome:'' });
  const [stageModal, setSM]     = useState(false);
  const [newStage, setNS]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [poAmounts, setPO]      = useState([]);
  const [poSaving, setPOSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [masterStages, setMasterStages] = useState([]);
  const [convertModal, setConvertModal] = useState(false);
  // Closure state
  const [closureForm, setClosureForm] = useState({
    closure_comment: '', closure_date: '', delivery_date: '', installation_date: '',
    conversion_type: 'customer', amc_contract_type: 'amc',
  });
  const [closureDocs, setClosureDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [closureStageTarget, setClosureStageTarget] = useState(null);
  // Items / line items state
  const [items, setItems] = useState([]);
  const [itemSaving, setItemSaving] = useState(false);
  const BLANK_ITEM = { product_id: '', product_name: '', qty: 1, unit_price: '', notes: '' };
  const [newItem, setNewItem] = useState({ ...BLANK_ITEM });

  useEffect(() => {
    load();
    leadsApi.products().then(r => setProducts(r.data || [])).catch(() => {});
    import('../../api/client').then(({ employeeApi }) => {
      employeeApi.list({ limit: 100 }).then(r => setEmployees(r.data?.items || [])).catch(() => {});
    });
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [lr, ar] = await Promise.allSettled([leadsApi.get(id), leadsApi.activities(id)]);
      if (lr.status === 'fulfilled') {
        const l = lr.value.data;
        setLead(l);
        setNS(l.status || 'new');
        setPO((l.po_amounts || []).concat(Array(5).fill('')).slice(0,5));
        setItems(l.items || []);
      } else { toast.error('Lead not found'); navigate('/crm/leads'); }
      if (ar.status === 'fulfilled') setActs(ar.value.data ?? []);
      
      const stagesRes = await leadsApi.masters('stage');
      setMasterStages(stagesRes.data || []);
      stagesRes.data.forEach(s => {
        STAGE_MAP[s.value] = { 
          label: s.label, 
          colorClass: s.color ? 'text-white' : 'bg-gray-2 text-black',
          style: s.color ? { backgroundColor: s.color } : {}
        };
      });
    } finally { setLoading(false); }
  }

  async function handleAddActivity() {
    if (!actForm.summary) { toast.error('Enter activity details'); return; }
    setSaving(true);
    try {
      const res = await leadsApi.addActivity(id, { ...actForm, communication_type: actForm.activity_type });
      setActs(p => [res.data, ...p]);
      setActForm({ activity_type:'call', summary:'', outcome:'' });
      toast.success('Activity logged');
    } catch(e) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleStageUpdate() {
    // If moving to a closure status, open the closure modal instead
    if (CLOSURE_STATUSES.has(newStage)) {
      setClosureStageTarget(newStage);
      setConvertModal(true);
      setSM(false);
      return;
    }
    setSaving(true);
    try {
      const res = await leadsApi.update(id, { status: newStage });
      setLead(res.data); setSM(false);
      toast.success(`Stage → ${STAGE_MAP[newStage]?.label || newStage}`);
    } catch(e) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleAssignUpdate(userId) {
    if (!userId && !lead.assigned_to) return;
    try {
      const res = await leadsApi.update(id, { assigned_to: userId || null });
      setLead(res.data);
      toast.success('Assignment updated');
    } catch(e) { toast.error('Assignment failed'); }
  }



  async function handleSavePO() {
    setPOSaving(true);
    try {
      const amounts = poAmounts.map(v => Number(v) || 0).filter(v => v > 0);
      const res = await leadsApi.update(id, { po_amounts: amounts });
      setLead(res.data);
      toast.success('PO amounts saved');
    } catch(e) { toast.error('Save failed'); }
    finally { setPOSaving(false); }
  }

  function handleAddItem() {
    if (!newItem.product_name.trim()) { toast.error('Select or enter a product'); return; }
    const prod = products.find(p => p.id === newItem.product_id);
    setItems(prev => [...prev, {
      product_id: newItem.product_id || null,
      product_name: newItem.product_name,
      qty: Number(newItem.qty) || 1,
      unit_price: newItem.unit_price ? Number(newItem.unit_price) : null,
      notes: newItem.notes || null,
      amc_applicable: prod?.amc_applicable || false,
      warranty_applicable: prod?.warranty_applicable || false,
      service_applicable: prod?.service_applicable || false,
      refill_applicable: prod?.refill_applicable || false,
    }]);
    setNewItem({ ...BLANK_ITEM });
  }

  async function handleSaveItems() {
    setItemSaving(true);
    try {
      const res = await leadsApi.update(id, { items });
      setLead(res.data);
      setItems(res.data.items || []);
      toast.success('Items saved');
    } catch(e) { toast.error('Save failed'); }
    finally { setItemSaving(false); }
  }

  async function handleUploadClosureDoc(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const res = await leadsApi.uploadClosureDocument(file);
      const { url, original_name } = res.data;
      setClosureDocs(prev => [...prev, { url, name: original_name, doc_type: 'other' }]);
      toast.success('Document uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingDoc(false); e.target.value = ''; }
  }

  function removeClosureDoc(idx) {
    setClosureDocs(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleClose() {
    if (!closureForm.closure_comment.trim()) {
      toast.error('Closure comment is required');
      return;
    }
    setSaving(true);
    try {
      if (closureForm.conversion_type === 'none') {
        const res = await leadsApi.update(id, {
          status: closureStageTarget,
          closure_comment: closureForm.closure_comment,
          closure_documents: closureDocs,
          closure_date: closureForm.closure_date || undefined,
          delivery_date: closureForm.delivery_date || undefined,
          installation_date: closureForm.installation_date || undefined,
        });
        setLead(res.data);
        toast.success(`Lead closed → ${STAGE_MAP[closureStageTarget]?.label || closureStageTarget}`);
      } else {
        const payload = {
          conversion_type: closureForm.conversion_type,
          closure_comment: closureForm.closure_comment,
          closure_documents: closureDocs,
          closure_date: closureForm.closure_date || undefined,
          delivery_date: closureForm.delivery_date || undefined,
          installation_date: closureForm.installation_date || undefined,
        };
        if (closureForm.conversion_type === 'amc') {
          payload.amc_contract_type = closureForm.amc_contract_type;
        }
        const res = await leadsApi.convert(id, payload);
        toast.success(`Closed & Converted — ${res.data.customer_name}`);
        const lr = await leadsApi.get(id);
        setLead(lr.data);
      }
      setConvertModal(false);
      setClosureDocs([]);
      setClosureStageTarget(null);
    } catch(e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><span className="spinner"/></div>;
  if (!lead) return null;

  const isLocked = CLOSURE_STATUSES.has(lead.status);
  const stage    = lead.status || 'new';
  const PI_STAGES = masterStages.filter(s => !['lost', 'junk'].includes(s.value));
  const visits   = lead.visits || [];
  
  // Progress bar tracks visits (0 visits = index 0 (New), 1 visit = index 1, etc.)
  let progressIdx = Math.min(visits.length, PI_STAGES.length - 1);
  if (stage === 'won') progressIdx = PI_STAGES.length - 1;

  const value    = Number(lead.expected_value) || 0;
  const poTotal  = (lead.po_amounts || []).reduce((s,n) => s + (Number(n)||0), 0);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/crm/leads" className="hover:text-primary">All Leads</Link>
        <span>/</span>
        <span className="text-black font-medium">{lead.company || lead.name}</span>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-3 rounded-sm border border-meta-1/30 bg-meta-1/5 px-4 py-3">
          <span className="text-meta-1 text-base">🔒</span>
          <p className="text-sm font-medium text-meta-1">
            This lead is <span className="uppercase">{lead.status.replace(/_/g, ' ')}</span> — read only. No further edits allowed.
          </p>
        </div>
      )}

      {/* Conversion banner */}
      {lead.is_converted && lead.contact_id && (
        <div className="flex items-center gap-3 rounded-sm border border-meta-3/30 bg-meta-3/5 px-4 py-3">
          <span className="text-meta-3 text-lg">✓</span>
          <div className="flex-1">
            <span className="text-sm font-medium text-meta-3">Converted to Customer</span>
            {lead.converted_at && (
              <span className="text-xs text-bodydark ml-2">on {String(lead.converted_at).split('T')[0]}</span>
            )}
          </div>
          <Link
            to={`/customers/${lead.contact_id}`}
            className="rounded bg-meta-3 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            View Customer →
          </Link>
        </div>
      )}

      {/* Closure Summary Banner */}
      {lead.closure_comment && (
        <div className="rounded-sm border border-warning/30 bg-warning/5 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-warning text-sm font-medium">Closure Remarks</span>
            {lead.closure_date && <span className="text-xs text-bodydark">· {lead.closure_date}</span>}
          </div>
          <p className="text-sm text-black">{lead.closure_comment}</p>
          {(lead.delivery_date || lead.installation_date) && (
            <div className="flex gap-4 text-xs text-bodydark">
              {lead.delivery_date && <span>Delivery: {lead.delivery_date}</span>}
              {lead.installation_date && <span>Installation: {lead.installation_date}</span>}
            </div>
          )}
          {lead.closure_documents?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lead.closure_documents.map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-white border border-stroke px-2 py-1 text-xs text-primary hover:opacity-80">
                  📎 {doc.name || doc.doc_type}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header card */}
      <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold flex-shrink-0">
              {(lead.company || lead.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">{lead.company || lead.name}</h2>
              <p className="text-sm text-bodydark">{lead.name} · {lead.phone}</p>
              {lead.location && <p className="text-xs text-bodydark mt-0.5">📍 {lead.location}</p>}
              <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-bodydark">
                {lead.email && <span>✉ {lead.email}</span>}
                {lead.category && <span className="rounded bg-meta-5/10 text-meta-5 px-2 py-0.5">{lead.category}</span>}
                {lead.product_enquired && <span className="rounded bg-primary/10 text-primary px-2 py-0.5">{lead.product_enquired}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={lead.assigned_to || ''}
              onChange={(e) => handleAssignUpdate(e.target.value)}
              disabled={isLocked}
              className="rounded-full border border-stroke px-3 py-1 text-sm bg-white text-black outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">👤 Unassigned</option>
              {employees.map(e => (
                <option key={e.id} value={e.user_id || ''}>
                  👤 {e.full_name}
                </option>
              ))}
            </select>
            {isLocked ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STAGE_MAP[stage]?.colorClass || 'bg-gray-2 text-bodydark'}`}
                style={STAGE_MAP[stage]?.style || {}}
              >
                🔒 {STAGE_MAP[stage]?.label ?? stage}
              </span>
            ) : (
              <button onClick={() => setSM(true)}>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium cursor-pointer hover:opacity-80 ${STAGE_MAP[stage]?.colorClass || 'bg-gray-2 text-bodydark'}`}
                  style={STAGE_MAP[stage]?.style || {}}
                >
                  {STAGE_MAP[stage]?.label ?? stage} ↓
                </span>
              </button>
            )}
            {value > 0 && <div className="text-lg font-bold text-primary">₹{value.toLocaleString()}</div>}
            {poTotal > 0 && <div className="text-sm font-semibold text-meta-3">PO: ₹{poTotal.toLocaleString()}</div>}
            <Link to="/crm/leads" className="rounded border border-stroke bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-gray-1">← Back</Link>
          </div>
        </div>
        {/* Pipeline progress */}
        <div className="mt-5">
          <div className="flex gap-1">
            {PI_STAGES.map((s,i) => (
              <div key={s.value} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= progressIdx ? 'bg-primary' : 'bg-gray-2'}`}/>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-bodydark mt-1">
            {PI_STAGES.map(s => <span key={s.value}>{s.label}</span>)}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {[
          { label:'Lead No',    val: lead.lead_no },
          { label:'Source',     val: lead.source ? lead.source.replace('_',' ') : '—' },
          { label:'Category',   val: lead.category || '—' },
          { label:'Visits',     val: visits.length },
          { label:'PO Total',   val: poTotal > 0 ? `₹${poTotal.toLocaleString()}` : '—' },
          { label:'Last Visit', val: visits.length ? visits[visits.length-1].date : '—' },
        ].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-3 text-center">
            <div className="text-xs text-bodydark mb-0.5">{s.label}</div>
            <div className="text-sm font-semibold text-black">{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-list">
        {[
          ['overview','Overview'],
          ['items', `Items${items.length ? ` (${items.length})` : ''}`],
          ['visits',`DVR Visits (${visits.length})`],
          ['activities','Activities'],
        ].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab===v?'active':''}`}>{l}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card title="Client Information">
            {[
              ['Party / Company', lead.company],
              ['Contact Person',  lead.name],
              ['Phone',           lead.phone],
              ['Email',           lead.email],
              ['Location',        lead.location || lead.city],
              ['Category',        lead.category],
              ['Product Enquired',lead.product_enquired],
              ['Source',          lead.source?.replace('_',' ')],
              ['Stage',           STAGE_MAP[stage]?.label],
            ].filter(([,v]) => v).map(([l,v]) => <Row key={l} label={l} value={v}/>)}
          </Card>
          <div className="space-y-5">
            <Card title="Deal Details">
              {[
                ['Expected Value',  value > 0 ? `₹${value.toLocaleString()}` : null],
                ['Total PO Value',  poTotal > 0 ? `₹${poTotal.toLocaleString()}` : null],
                ['Priority',        lead.priority],
                ['Expected Close',  lead.expected_close_date],
                ['Lead Score',      lead.lead_score || 0],
                ['Created',         lead.created_at ? String(lead.created_at).split('T')[0] : null],
                ['Next Follow-up',  lead.next_followup_date],
              ].filter(([,v]) => v !== null && v !== undefined && v !== '').map(([l,v]) => <Row key={l} label={l} value={String(v)}/>)}
            </Card>
            {lead.enquiry_text && (
              <Card title="Enquiry Notes">
                <p className="text-sm text-bodydark italic">{lead.enquiry_text}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Items Tab */}
      {tab === 'items' && (
        <div className="space-y-4">
          <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
            <div className="px-5 py-4 border-b border-stroke flex items-center justify-between">
              <div>
                <h3 className="font-medium text-black">Products &amp; Services</h3>
                <p className="text-xs text-bodydark mt-0.5">Items sold / to be delivered on this lead</p>
              </div>
              {!isLocked && items.length > 0 && (
                <button onClick={handleSaveItems} disabled={itemSaving}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60">
                  {itemSaving ? 'Saving…' : 'Save Items'}
                </button>
              )}
            </div>

            {/* Add item row */}
            {!isLocked && (
              <div className="px-5 py-3 border-b border-stroke bg-gray-1">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-medium text-bodydark mb-1">Product</label>
                    <select
                      value={newItem.product_id}
                      onChange={e => {
                        const prod = products.find(p => p.id === e.target.value);
                        setNewItem(prev => ({
                          ...prev,
                          product_id: e.target.value,
                          product_name: prod ? prod.name : prev.product_name,
                        }));
                      }}
                      className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary bg-white"
                    >
                      <option value="">— Select product —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] font-medium text-bodydark mb-1">Qty</label>
                    <input type="number" min="0.01" step="0.01" value={newItem.qty}
                      onChange={e => setNewItem(prev => ({ ...prev, qty: e.target.value }))}
                      className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] font-medium text-bodydark mb-1">Unit Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={newItem.unit_price}
                      placeholder="0"
                      onChange={e => setNewItem(prev => ({ ...prev, unit_price: e.target.value }))}
                      className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-[10px] font-medium text-bodydark mb-1">Notes</label>
                    <input type="text" value={newItem.notes}
                      placeholder="Serial no., remarks…"
                      onChange={e => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                  </div>
                  <button onClick={handleAddItem}
                    className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 whitespace-nowrap">
                    + Add
                  </button>
                </div>
              </div>
            )}

            {/* Items table */}
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-bodydark">
                {isLocked ? 'No items recorded for this lead.' : 'Add products or services above to track what was sold.'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-1">
                      <tr>
                        {['#','Product','Qty','Unit Price','Total','Lifecycle','Notes',''].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-bodydark uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke">
                      {items.map((item, idx) => {
                        const lineTotal = (Number(item.unit_price) || 0) * (Number(item.qty) || 1);
                        return (
                          <tr key={idx} className="hover:bg-gray-1">
                            <td className="px-4 py-3 text-xs text-bodydark">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-black">{item.product_name}</td>
                            <td className="px-4 py-3 text-sm text-black">
                              {isLocked ? item.qty : (
                                <input type="number" min="0.01" step="0.01" value={item.qty}
                                  onChange={e => setItems(prev => prev.map((it,i) => i===idx ? {...it, qty: Number(e.target.value)||1} : it))}
                                  className="w-16 rounded border border-stroke px-2 py-1 text-sm text-black outline-none focus:border-primary" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-black">
                              {isLocked ? (item.unit_price ? `₹${Number(item.unit_price).toLocaleString()}` : '—') : (
                                <input type="number" min="0" step="0.01" value={item.unit_price || ''}
                                  placeholder="0"
                                  onChange={e => setItems(prev => prev.map((it,i) => i===idx ? {...it, unit_price: e.target.value ? Number(e.target.value) : null} : it))}
                                  className="w-24 rounded border border-stroke px-2 py-1 text-sm text-black outline-none focus:border-primary" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-black">
                              {lineTotal > 0 ? `₹${lineTotal.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {item.amc_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">AMC</span>}
                                {item.warranty_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-6/10 text-meta-6">Warranty</span>}
                                {item.service_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-3/10 text-meta-3">Service</span>}
                                {item.refill_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-5/10 text-meta-5">Refill</span>}
                                {!item.amc_applicable && !item.warranty_applicable && !item.service_applicable && !item.refill_applicable && (
                                  <span className="text-[10px] text-bodydark">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-bodydark max-w-[140px] truncate">{item.notes || '—'}</td>
                            <td className="px-4 py-3">
                              {!isLocked && (
                                <button onClick={() => setItems(prev => prev.filter((_,i) => i !== idx))}
                                  className="text-danger hover:opacity-70 text-sm">✕</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-stroke bg-gray-1">
                      <tr>
                        <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-bodydark text-right">Grand Total</td>
                        <td className="px-4 py-2.5 text-sm font-bold text-black">
                          ₹{items.reduce((s, it) => s + (Number(it.unit_price)||0)*(Number(it.qty)||1), 0).toLocaleString()}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {!isLocked && (
                  <div className="px-5 py-3 border-t border-stroke flex justify-end">
                    <button onClick={handleSaveItems} disabled={itemSaving}
                      className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                      {itemSaving ? 'Saving…' : 'Save Items'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Lifecycle notice */}
          {items.some(it => it.amc_applicable || it.warranty_applicable || it.service_applicable || it.refill_applicable) && (
            <div className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
              <span className="font-medium">Lifecycle tracking active</span> — when this lead is closed/converted, ownership records with AMC/warranty/service/refill schedules will be auto-created for each applicable item and appear in AMC Renewals.
            </div>
          )}
        </div>
      )}

      {/* DVR Visits Tab */}
      {tab === 'visits' && (
        <div className="grid grid-cols-1 gap-5">
          {/* Visit history + PO */}
          <div className="space-y-5">

            <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
              <div className="px-5 py-4 border-b border-stroke">
                <h3 className="font-medium text-black">Visit History ({visits.length})</h3>
              </div>
              {visits.length === 0 ? (
                <div className="p-8 text-center text-sm text-bodydark">No visits logged yet</div>
              ) : (
                <div className="divide-y divide-stroke">
                  {visits.map((v,i) => {
                    const VTYPE_LABELS = {
                      welcome:'1st — Welcome Visit', reminder:'2nd — Reminder Visit',
                      follow_up:'3rd — Follow Up', repeat:'4th — Repeat', fifth:'5th — Follow Up',
                    };
                    const typeLabel = VTYPE_LABELS[v.type] || v.type || `Visit ${i+1}`;
                    const photos = (v.photos || []).map(u =>
                      u.startsWith('http') ? u.replace(/^https?:\/\/[^/]+/, '') : u
                    );
                    const hasLocation = v.lat && v.lng;
                    const mapsUrl = hasLocation
                      ? `https://www.google.com/maps?q=${v.lat},${v.lng}`
                      : null;
                    return (
                      <div key={i} className="flex items-start gap-4 px-5 py-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">{i+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-black">{typeLabel}</span>
                            <span className="text-xs text-bodydark bg-gray-1 rounded px-2 py-0.5">{v.date}</span>
                            {v.product_enquired && <span className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5">{v.product_enquired}</span>}
                            {hasLocation && (
                              <a href={mapsUrl} target="_blank" rel="noreferrer"
                                className="text-xs bg-meta-3/10 text-meta-3 rounded px-2 py-0.5 flex items-center gap-1 hover:underline">
                                📍 {parseFloat(v.lat).toFixed(4)}, {parseFloat(v.lng).toFixed(4)}
                              </a>
                            )}
                          </div>
                          {v.remarks && <p className="text-sm text-bodydark mt-1">{v.remarks}</p>}
                          {photos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {photos.map((url, pi) => (
                                <a key={pi} href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt={`visit-${i+1}-photo-${pi+1}`}
                                    className="w-16 h-16 object-cover rounded border border-stroke hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PO Amounts */}
            <Card title="Purchase Order Amounts">
              <div className="space-y-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-bodydark w-12">PO {i+1}</span>
                    <input type="number" value={poAmounts[i] || ''}
                      onChange={e => { if (isLocked) return; const a=[...poAmounts]; a[i]=e.target.value; setPO(a); }}
                      readOnly={isLocked}
                      placeholder="Amount (₹)" className={`flex-1 rounded border border-stroke px-3 py-1.5 text-sm text-black outline-none focus:border-primary ${isLocked ? 'bg-gray-1 cursor-not-allowed' : ''}`}/>
                  </div>
                ))}
                {poTotal > 0 && (
                  <div className="flex justify-between text-sm border-t border-stroke pt-2 mt-1">
                    <span className="font-medium text-black">Total Business</span>
                    <span className="font-bold text-meta-3">₹{poTotal.toLocaleString()}</span>
                  </div>
                )}
                {!isLocked && (
                  <button onClick={handleSavePO} disabled={poSaving}
                    className="w-full rounded bg-primary py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 mt-1">
                    {poSaving ? 'Saving…' : 'Save PO Amounts'}
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Activities Tab */}
      {tab === 'activities' && (
        <div className={`grid grid-cols-1 gap-5 ${!isLocked ? 'lg:grid-cols-3' : ''}`}>
          {!isLocked && (
            <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
              <h3 className="font-medium text-black mb-4">Log Activity</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Type</label>
                  <select value={actForm.activity_type} onChange={e => setActForm(p=>({...p,activity_type:e.target.value}))}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option value="call">📞 Call</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="meeting">🤝 Meeting</option>
                    <option value="email">✉ Email</option>
                    <option value="note">📝 Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Summary</label>
                  <textarea value={actForm.summary} onChange={e => setActForm(p=>({...p,summary:e.target.value}))}
                    rows={3} placeholder="What happened…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Outcome</label>
                  <input type="text" value={actForm.outcome} onChange={e => setActForm(p=>({...p,outcome:e.target.value}))}
                    placeholder="e.g. Interested, Call back next week" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary"/>
                </div>
                <button onClick={handleAddActivity} disabled={saving}
                  className="w-full rounded bg-primary py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                  {saving ? 'Logging…' : 'Log Activity'}
                </button>
              </div>
            </div>
          )}
          <div className={`${!isLocked ? 'lg:col-span-2' : ''} rounded-sm border border-stroke bg-white shadow-default divide-y divide-stroke`}>
            {activities.length === 0
              ? <div className="p-6 text-sm text-bodydark text-center">No activities yet</div>
              : activities.map(a => {
                  const meta = ACT_META[a.activity_type] || ACT_META.note;
                  return (
                    <div key={a.id} className="flex gap-3 px-5 py-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${meta.color}`}>{meta.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm text-black">{a.summary}</p>
                        {a.outcome && <p className="text-xs text-bodydark italic mt-0.5">Outcome: {a.outcome}</p>}
                        <p className="text-xs text-bodydark mt-0.5">{meta.label} · {a.created_at ? String(a.created_at).replace('T',' ').slice(0,16) : ''}</p>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* Lead Closure / Convert Modal */}
      {convertModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && (setConvertModal(false), setClosureStageTarget(null))}>
          <div className="modal-box max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">
                Close Lead — {STAGE_MAP[closureStageTarget]?.label || closureStageTarget}
              </h3>
              <button onClick={() => { setConvertModal(false); setClosureStageTarget(null); }} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Lead summary */}
              <div className="rounded bg-gray-1 p-3 text-sm text-bodydark space-y-0.5">
                <p className="font-medium text-black">{lead.company || lead.name}</p>
                {lead.phone && <p>📞 {lead.phone}</p>}
              </div>

              {/* Items summary for closure */}
              {items.length > 0 && (
                <div className="rounded border border-stroke">
                  <div className="px-3 py-2 bg-gray-1 text-xs font-semibold text-bodydark border-b border-stroke">
                    Items ({items.length}) — lifecycle tracking on closure
                  </div>
                  <div className="divide-y divide-stroke">
                    {items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="text-sm text-black">{it.product_name}</span>
                          <span className="text-xs text-bodydark ml-2">×{it.qty}</span>
                        </div>
                        <div className="flex gap-1">
                          {it.amc_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">AMC</span>}
                          {it.warranty_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-6/10 text-meta-6">Warranty</span>}
                          {it.service_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-3/10 text-meta-3">Service</span>}
                          {it.refill_applicable && <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-meta-5/10 text-meta-5">Refill</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion type */}
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Conversion Type</label>
                <select value={closureForm.conversion_type}
                  onChange={e => setClosureForm(p => ({ ...p, conversion_type: e.target.value }))}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                  <option value="customer">Convert to Customer</option>
                  <option value="amc">AMC Contract</option>
                  <option value="sales_order">Sales Order</option>
                  <option value="none">Close Only — no customer record</option>
                </select>
              </div>
              {closureForm.conversion_type === 'amc' && (
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">AMC Type</label>
                  <select value={closureForm.amc_contract_type}
                    onChange={e => setClosureForm(p => ({ ...p, amc_contract_type: e.target.value }))}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option value="amc">AMC</option>
                    <option value="cmc">CMC</option>
                    <option value="warranty">Warranty</option>
                    <option value="one_time">One Time</option>
                  </select>
                </div>
              )}

              {/* Mandatory closure comment */}
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">
                  Closure Remarks <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  value={closureForm.closure_comment}
                  onChange={e => setClosureForm(p => ({ ...p, closure_comment: e.target.value }))}
                  placeholder="Describe what was delivered, installed, or completed…"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none"
                />
                {!closureForm.closure_comment.trim() && (
                  <p className="text-xs text-danger mt-0.5">Required for closure</p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['closure_date', 'Closure Date'],
                  ['delivery_date', 'Delivery Date'],
                  ['installation_date', 'Installation Date'],
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-bodydark mb-1">{label}</label>
                    <input type="date" value={closureForm[field]}
                      onChange={e => setClosureForm(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full rounded border border-stroke px-2 py-1.5 text-sm text-black outline-none focus:border-primary" />
                  </div>
                ))}
              </div>

              {/* Document upload */}
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Supporting Documents</label>
                <label className={`flex items-center gap-2 w-full cursor-pointer rounded border border-dashed border-stroke px-4 py-3 text-sm text-bodydark hover:border-primary transition-colors ${uploadingDoc ? 'opacity-60 pointer-events-none' : ''}`}>
                  <input type="file" className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                    onChange={handleUploadClosureDoc} />
                  {uploadingDoc ? '⏳ Uploading…' : '📎 Click to attach document'}
                </label>
                {closureDocs.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {closureDocs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 rounded bg-gray-1 px-3 py-2">
                        <span className="text-xs flex-1 truncate text-black">{doc.name}</span>
                        <select value={doc.doc_type}
                          onChange={e => setClosureDocs(prev => prev.map((d,j) => j===i ? {...d, doc_type: e.target.value} : d))}
                          className="text-xs rounded border border-stroke px-2 py-1 text-black outline-none">
                          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <button onClick={() => removeClosureDoc(i)} className="text-danger text-xs hover:opacity-80">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-bodydark mt-1">
                  Accepted: PDF, JPG, PNG, DOCX, XLSX · Max 10MB each
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => { setConvertModal(false); setClosureStageTarget(null); }}
                className="rounded border border-stroke bg-white px-4 py-2 text-sm text-black hover:bg-gray-1">
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={saving || !closureForm.closure_comment.trim()}
                className="rounded bg-meta-3 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving ? 'Closing…' : 'Close Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage modal */}
      {stageModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Update Stage</h3>
              <button onClick={() => setSM(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-2">
              {masterStages.map(s => (
                <button key={s.value} onClick={() => setNS(s.value)}
                  className={`w-full text-left rounded px-4 py-3 text-sm font-medium border transition-colors ${newStage===s.value?'border-primary bg-primary/5 text-primary':'border-stroke hover:bg-gray-1 text-black'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setSM(false)} className="rounded border border-stroke bg-white px-4 py-2 text-sm text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleStageUpdate} disabled={saving} className="rounded bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60">
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="px-5 py-4 border-b border-stroke"><h3 className="font-medium text-black">{title}</h3></div>
      <div className="p-5 space-y-2.5">{children}</div>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-bodydark whitespace-nowrap">{label}</span>
      <span className="text-black font-medium text-right">{String(value)}</span>
    </div>
  );
}

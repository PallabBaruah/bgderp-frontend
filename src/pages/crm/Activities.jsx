import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadsApi, employeeApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { value: 'call',       label: 'Call',        icon: '📞', color: 'bg-meta-5/10 text-meta-5 border-meta-5/20' },
  { value: 'whatsapp',   label: 'WhatsApp',    icon: '💬', color: 'bg-meta-3/10 text-meta-3 border-meta-3/20' },
  { value: 'email',      label: 'Email',       icon: '✉',  color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'meeting',    label: 'Meeting',     icon: '🤝', color: 'bg-meta-8/10 text-meta-8 border-meta-8/20' },
  { value: 'demo',       label: 'Demo',        icon: '🖥', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'site_visit', label: 'Site Visit',  icon: '🏢', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'proposal',   label: 'Proposal',    icon: '📄', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'note',       label: 'Note',        icon: '📝', color: 'bg-bodydark/10 text-bodydark border-bodydark/20' },
];

const OUTCOMES = [
  'Positive — interested, follow-up scheduled',
  'Neutral — thinking, needs time',
  'Negative — not interested',
  'Proposal sent',
  'Demo completed',
  'PO expected',
  'Lost — chose competitor',
  'No response',
  'Callback requested',
];

const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];

const PRIORITY_META = {
  hot:    { label: 'Hot',  class: 'bg-danger/10 text-danger border-danger/20', dot: 'bg-danger' },
  warm:   { label: 'Warm', class: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  cold:   { label: 'Cold', class: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary' },
  medium: { label: 'Med',  class: 'bg-bodydark/10 text-bodydark border-bodydark/20', dot: 'bg-bodydark' },
};

const STAGE_META = {
  new:         { label: 'New',         class: 'bg-gray-100 text-gray-600' },
  contacted:   { label: 'Contacted',   class: 'bg-blue-100 text-blue-700' },
  qualified:   { label: 'Qualified',   class: 'bg-cyan-100 text-cyan-700' },
  proposal:    { label: 'Proposal',    class: 'bg-yellow-100 text-yellow-700' },
  negotiation: { label: 'Negotiation', class: 'bg-orange-100 text-orange-700' },
  won:         { label: 'Won',         class: 'bg-meta-3/10 text-meta-3' },
  lost:        { label: 'Lost',        class: 'bg-danger/10 text-danger' },
  junk:        { label: 'Junk',        class: 'bg-bodydark/10 text-bodydark' },
};

function actMeta(type) { return ACTIVITY_TYPES.find(a => a.value === type) || ACTIVITY_TYPES[7]; }

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(d);
}

function groupByDate(activities) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const a of activities) {
    const d = new Date(a.created_at);
    let key;
    if (d.toDateString() === today)     key = 'Today';
    else if (d.toDateString() === yesterday) key = 'Yesterday';
    else key = fmtDate(a.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }
  return groups;
}

function fmtCurrency(val) {
  if (!val) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}

function normalizeProductsDiscussed(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item =>
    typeof item === 'string'
      ? { type: 'product', product_id: '', product_name: item, quantity: '', unit: '' }
      : {
          type: item.type || 'product',
          product_id: item.product_id || '',
          product_name: item.product_name || '',
          quantity: item.quantity != null ? String(item.quantity) : '',
          unit: item.unit || '',
        }
  );
}

// ── Log Activity Modal ────────────────────────────────────────────────────────

const BLANK = {
  // Lead search
  lead_id: '', lead_search: '',
  // Activity
  activity_type: 'call',
  activity_datetime: new Date().toISOString().slice(0, 16),
  // Contact
  contact_name: '', contact_phone: '',
  // Discussion
  summary: '',
  products_discussed: [],
  requirement_notes: '',
  outcome: '',
  // Pipeline
  lead_stage_after: '',
  priority: '',
  // Deal
  deal_value: '',
  probability: '',
  expected_closure_date: '',
  // Follow-up
  next_followup_datetime: '',
  next_action: '',
  // Location
  location_name: '', lat: '', lng: '',
  // Misc
  internal_remarks: '',
  call_duration: '',
};

function LogActivityModal({ onClose, onSaved, preselectedLeadId, preselectedLeadName, editActivity }) {
  const isEdit = !!editActivity;
  const { user } = useAuthStore();
  const [form, setForm] = useState(() => {
    if (editActivity) return {
      ...BLANK,
      lead_id:               editActivity.lead_id || '',
      lead_search:           `${editActivity.lead_name || ''}${editActivity.lead_company ? ` — ${editActivity.lead_company}` : ''}`,
      activity_type:         editActivity.activity_type || 'call',
      activity_datetime:     editActivity.activity_datetime ? editActivity.activity_datetime.slice(0, 16) : new Date().toISOString().slice(0, 16),
      contact_name:          editActivity.contact_name || '',
      contact_phone:         editActivity.contact_phone || '',
      summary:               editActivity.summary || '',
      products_discussed:    normalizeProductsDiscussed(editActivity.products_discussed || []),
      requirement_notes:     editActivity.requirement_notes || '',
      outcome:               editActivity.outcome || '',
      internal_remarks:      editActivity.internal_remarks || '',
      lead_stage_after:      editActivity.lead_stage_after || '',
      priority:              editActivity.priority || '',
      deal_value:            editActivity.deal_value != null ? String(editActivity.deal_value) : '',
      probability:           editActivity.probability != null ? String(editActivity.probability) : '',
      expected_closure_date: editActivity.expected_closure_date || '',
      next_followup_datetime: editActivity.next_followup_datetime ? editActivity.next_followup_datetime.slice(0, 16) : '',
      next_action:           editActivity.next_action || '',
      location_name:         editActivity.location_name || '',
      lat:                   editActivity.lat != null ? String(editActivity.lat) : '',
      lng:                   editActivity.lng != null ? String(editActivity.lng) : '',
      call_duration:         editActivity.call_duration != null ? String(editActivity.call_duration) : '',
      on_behalf_of_user_id:  '',
      activity_by_search:    '',
    };
    return {
      ...BLANK,
      lead_id: preselectedLeadId || '',
      lead_search: preselectedLeadName || '',
      on_behalf_of_user_id: '',
      activity_by_search: '',
    };
  });
  const [leads, setLeads] = useState([]);
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [openRowIdx, setOpenRowIdx] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [leadError, setLeadError] = useState(false);
  const [leadSearching, setLeadSearching] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: '', phone: '', company: '', source: 'direct' });
  const [quickSaving, setQuickSaving] = useState(false);
  const [sources, setSources] = useState([]);
  const [section, setSection] = useState('activity');
  const SECTION_KEYS = ['activity', 'discussion', 'pipeline', 'followup'];
  const sectionIdx = SECTION_KEYS.indexOf(section);
  const isFirst = sectionIdx === 0;
  const isLast  = sectionIdx === SECTION_KEYS.length - 1;

  const handleNext = () => {
    if (section === 'activity' && !form.lead_id && !form.contact_name.trim()) {
      toast.error('Enter a contact name (or link to a lead)'); return;
    }
    if (section === 'discussion' && !form.summary.trim()) { toast.error('Discussion summary required'); return; }
    if (!isLast) setSection(SECTION_KEYS[sectionIdx + 1]);
  };
  const handleBack = () => { if (!isFirst) setSection(SECTION_KEYS[sectionIdx - 1]); };

  useEffect(() => {
    leadsApi.products({ limit: 200 }).then(r => {
      setProducts(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {});
    employeeApi.list({ limit: 200 }).then(r => {
      const list = r.data?.items ?? r.data ?? [];
      setEmployees(Array.isArray(list) ? list.filter(e => e.user_id) : []);
    }).catch(() => {});
    leadsApi.masters('source').then(r => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      setSources(list);
    }).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const updateProductRow = (idx, field, val) => setForm(p => {
    const items = [...p.products_discussed];
    items[idx] = { ...items[idx], [field]: val };
    return { ...p, products_discussed: items };
  });
  const addProductRow = () =>
    setForm(p => ({ ...p, products_discussed: [...p.products_discussed, { type: 'product', product_id: '', product_name: '', quantity: '', unit: '' }] }));
  const removeProductRow = (idx) => {
    setForm(p => ({ ...p, products_discussed: p.products_discussed.filter((_, i) => i !== idx) }));
    setOpenRowIdx(-1);
  };

  const searchLeads = useCallback(async (q) => {
    if (!q || q.length < 1) { setLeads([]); return; }
    setLeadSearching(true);
    try {
      const r = await leadsApi.list({ search: q, limit: 10 });
      setLeads(r.data?.results || r.data || []);
    } catch { setLeads([]); }
    finally { setLeadSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchLeads(form.lead_search), 300);
    return () => clearTimeout(t);
  }, [form.lead_search]);

  const captureGPS = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({ ...p, lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) }));
        setLocating(false); toast.success('Location captured');
      },
      () => { toast.error('Could not get GPS'); setLocating(false); }
    );
  };

  const handleSave = async () => {
    if (!form.lead_id && !form.contact_name.trim()) { toast.error('Enter a contact name (no lead selected)'); return; }
    if (!form.summary.trim()) { toast.error('Discussion summary required'); return; }
    setSaving(true);
    try {
      const payload = {
        activity_type: form.activity_type,
        activity_datetime: form.activity_datetime || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        summary: form.summary,
        requirement_notes: form.requirement_notes || null,
        outcome: form.outcome || null,
        products_discussed: form.products_discussed
          .filter(p => (p.product_name || '').trim())
          .map(p => ({
            type: p.type,
            product_id: p.product_id || null,
            product_name: p.product_name,
            quantity: p.quantity ? parseFloat(p.quantity) : null,
            unit: p.unit || null,
          })),
        lead_stage_after: form.lead_id ? (form.lead_stage_after || null) : null,
        priority: form.priority || null,
        deal_value: form.deal_value ? parseFloat(form.deal_value) : null,
        probability: form.probability ? parseInt(form.probability) : null,
        expected_closure_date: form.expected_closure_date || null,
        next_action: form.next_action || null,
        next_followup_datetime: form.next_followup_datetime || null,
        next_action_date: form.next_followup_datetime ? form.next_followup_datetime.slice(0, 10) : null,
        location_name: form.location_name || null,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        internal_remarks: form.internal_remarks || null,
        call_duration: form.call_duration ? parseInt(form.call_duration) : null,
        ...(!isEdit && { on_behalf_of_user_id: form.on_behalf_of_user_id || null, attachments: [] }),
      };
      let res;
      if (isEdit) {
        if (editActivity.lead_id) {
          res = await leadsApi.updateActivity(editActivity.lead_id, editActivity.id, payload);
        } else {
          res = await leadsApi.updateStandaloneActivity(editActivity.id, payload);
        }
        toast.success('Activity updated');
      } else {
        if (form.lead_id) {
          res = await leadsApi.addActivity(form.lead_id, payload);
        } else {
          res = await leadsApi.createStandaloneActivity(payload);
        }
        toast.success('Activity logged');
      }
      onSaved(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const SECTIONS = [
    { key: 'activity',   label: 'Activity' },
    { key: 'discussion', label: 'Discussion' },
    { key: 'pipeline',   label: 'Pipeline & Deal' },
    { key: 'followup',   label: 'Follow-up' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-sm border border-stroke bg-white shadow-default flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="border-b border-stroke px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-black">{isEdit ? 'Edit Activity' : 'Log Sales Activity'}</h3>
          <button onClick={onClose} className="text-bodydark hover:text-black">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── Always-visible context: Lead + Activity By ─── */}
        <div className="px-6 py-4 border-b border-stroke bg-gray-1 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            {/* Lead search */}
            <div className="relative">
              <label className="mb-1 block text-xs font-semibold text-black">
                Lead / Company <span className="text-xs font-normal text-bodydark">(optional)</span>
              </label>
              <input
                type="text"
                value={form.lead_search}
                onChange={e => {
                  set('lead_search')(e);
                  setForm(p => ({ ...p, lead_id: '' }));
                  setLeadSearchOpen(true);
                  setLeadError(false);
                  setQuickCreate(false);
                }}
                onFocus={() => form.lead_search.length >= 1 && setLeadSearchOpen(true)}
                placeholder="Type name / company / phone to search…"
                className={`w-full rounded border px-3 py-2 text-sm outline-none focus:border-primary ${
                  form.lead_id ? 'border-meta-3 bg-meta-3/5' : leadError ? 'border-danger ring-1 ring-danger/30' : 'border-stroke'
                }`}
              />
              {form.lead_id
                ? <span className="absolute right-3 top-[30px] text-meta-3 font-bold">✓ {form.lead_search.split('—')[0].trim()}</span>
                : <p className="text-[10px] text-bodydark mt-1">Leave blank to log as standalone visit (enter contact name below)</p>
              }
              {leadSearchOpen && !form.lead_id && form.lead_search.length >= 1 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLeadSearchOpen(false)} />
                  <div className="absolute z-50 w-full mt-1 bg-white border border-stroke rounded shadow-lg max-h-52 overflow-y-auto">
                    {leadSearching ? (
                      <p className="px-4 py-3 text-xs text-bodydark">Searching…</p>
                    ) : leads.length === 0 ? (
                      <div className="px-4 py-3">
                        <p className="text-xs text-danger font-medium">No leads found for "{form.lead_search}"</p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCreate(true);
                            setQuickForm(q => ({ ...q, name: form.lead_search }));
                            setLeadSearchOpen(false);
                          }}
                          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          + Create new lead "{form.lead_search}"
                        </button>
                      </div>
                    ) : leads.map(l => (
                      <button key={l.id} type="button"
                        onClick={() => {
                          setForm(p => ({
                            ...p,
                            lead_id: l.id,
                            lead_search: `${l.name}${l.company ? ` — ${l.company}` : ''}`,
                            lead_stage_after: p.lead_stage_after || l.status,
                            priority: p.priority || l.priority || 'medium',
                            deal_value: p.deal_value || (l.expected_value ? String(l.expected_value) : ''),
                            expected_closure_date: p.expected_closure_date || l.expected_close_date || '',
                          }));
                          setLeadSearchOpen(false);
                          setLeadError(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-1 text-sm border-b border-stroke last:border-0">
                        <span className="font-medium text-black">{l.name}</span>
                        {l.company && <span className="text-bodydark ml-2">— {l.company}</span>}
                        <div className="text-xs text-bodydark mt-0.5">
                          {l.phone} · {l.status} · {l.priority}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Activity By */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-black">
                Activity By <span className="text-xs font-normal text-bodydark">(admin — log for employee)</span>
              </label>
              <select
                value={form.on_behalf_of_user_id}
                onChange={e => setForm(p => ({ ...p, on_behalf_of_user_id: e.target.value }))}
                className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white"
              >
                <option value="">{user?.full_name || 'Me'} (me)</option>
                {employees
                  .filter(e => e.user_id !== user?.id)
                  .map(e => (
                    <option key={e.user_id} value={e.user_id}>
                      {e.full_name}{e.department?.name ? ` — ${e.department.name}` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Quick-create new lead inline form */}
          {quickCreate && (
            <div className="mt-3 rounded border border-primary/30 bg-white p-3">
              <p className="text-xs font-semibold text-primary mb-2">Create New Lead</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={quickForm.name}
                  onChange={e => setQuickForm(q => ({ ...q, name: e.target.value }))}
                  placeholder="Full name *"
                  className="col-span-2 rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  type="tel"
                  value={quickForm.phone}
                  onChange={e => setQuickForm(q => ({ ...q, phone: e.target.value }))}
                  placeholder="Phone *"
                  className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={quickForm.company}
                  onChange={e => setQuickForm(q => ({ ...q, company: e.target.value }))}
                  placeholder="Company"
                  className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                />
                <select
                  value={quickForm.source}
                  onChange={e => setQuickForm(q => ({ ...q, source: e.target.value }))}
                  className="col-span-2 rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary bg-white"
                >
                  <option value="direct">Direct</option>
                  <option value="referral">Referral</option>
                  <option value="website">Website</option>
                  <option value="social">Social Media</option>
                  <option value="phone">Phone Enquiry</option>
                  <option value="walk_in">Walk-in</option>
                  {sources
                    .filter(s => !['direct','referral','website','social','phone','walk_in'].includes(s.value))
                    .map(s => <option key={s.id} value={s.value}>{s.label || s.value}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setQuickCreate(false)}
                  className="text-xs text-bodydark hover:text-black px-2 py-1"
                >Cancel</button>
                <button
                  type="button"
                  disabled={quickSaving || !quickForm.name.trim() || !quickForm.phone.trim()}
                  onClick={async () => {
                    setQuickSaving(true);
                    try {
                      const res = await leadsApi.create({
                        name: quickForm.name.trim(),
                        phone: quickForm.phone.trim(),
                        company: quickForm.company.trim() || undefined,
                        source: quickForm.source,
                        priority: 'medium',
                      });
                      const nl = res.data;
                      setForm(p => ({
                        ...p,
                        lead_id: nl.id,
                        lead_search: `${nl.name}${nl.company ? ` — ${nl.company}` : ''}`,
                        lead_stage_after: p.lead_stage_after || nl.status || 'new',
                        priority: p.priority || nl.priority || 'medium',
                      }));
                      setQuickCreate(false);
                      setLeadError(false);
                      setQuickForm({ name: '', phone: '', company: '', source: 'direct' });
                      toast.success('Lead created and selected');
                    } catch (err) {
                      toast.error(err.response?.data?.detail || 'Failed to create lead');
                    } finally {
                      setQuickSaving(false);
                    }
                  }}
                  className="rounded bg-primary px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {quickSaving ? 'Creating…' : 'Create & Select'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center border-b border-stroke flex-shrink-0 px-6 py-3 gap-0">
          {SECTIONS.map((s, i) => {
            const done = i < sectionIdx;
            const active = i === sectionIdx;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    done   ? 'bg-meta-3 text-white' :
                    active ? 'bg-primary text-white' :
                             'bg-stroke text-bodydark'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-primary' : done ? 'text-meta-3' : 'text-bodydark'}`}>
                    {s.label}
                  </span>
                </div>
                {i < SECTIONS.length - 1 && (
                  <div className={`h-px flex-1 mx-2 ${done ? 'bg-meta-3' : 'bg-stroke'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* ── Section: Activity ──────────────────────── */}
          {section === 'activity' && (
            <div className="space-y-4">
              {/* Activity type */}
              <div>
                <label className="mb-2 block text-xs font-medium text-black">Activity Type</label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm(p => ({ ...p, activity_type: t.value }))}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        form.activity_type === t.value ? t.color + ' ring-1 ring-current' : 'border-stroke text-bodydark hover:border-primary hover:text-primary'
                      }`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Time */}
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Activity Date & Time</label>
                <input type="datetime-local" value={form.activity_datetime} onChange={set('activity_datetime')}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Contact Person</label>
                  <input type="text" value={form.contact_name} onChange={set('contact_name')} placeholder="Name at company"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Contact Phone</label>
                  <input type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="Phone number"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              {/* Call duration (if call) */}
              {(form.activity_type === 'call' || form.activity_type === 'whatsapp') && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Call Duration (seconds)</label>
                  <input type="number" min="0" value={form.call_duration} onChange={set('call_duration')} placeholder="e.g. 300 for 5 minutes"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              )}

              {/* Location */}
              {['meeting', 'site_visit', 'demo'].includes(form.activity_type) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-black">Location</label>
                    <button type="button" onClick={captureGPS} disabled={locating}
                      className="text-xs text-primary hover:underline disabled:opacity-50">
                      📍 {locating ? 'Getting GPS…' : 'Use My Location'}
                    </button>
                  </div>
                  <input type="text" value={form.location_name} onChange={set('location_name')} placeholder="Location / venue name"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                  {(form.lat || form.lng) && (
                    <p className="text-xs text-meta-3 mt-1">GPS: {form.lat}, {form.lng}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Section: Discussion ────────────────────── */}
          {section === 'discussion' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Discussion Summary *</label>
                <textarea rows={5} value={form.summary} onChange={set('summary')}
                  placeholder="Detailed notes of what was discussed, key points raised, objections, client feedback..."
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-black">Products / Services Discussed</label>
                  <button type="button" onClick={addProductRow}
                    className="text-xs text-primary hover:underline font-medium">+ Add Item</button>
                </div>
                {form.products_discussed.length === 0 ? (
                  <button type="button" onClick={addProductRow}
                    className="w-full rounded border border-dashed border-stroke px-4 py-3 text-xs text-bodydark hover:border-primary hover:text-primary transition-colors">
                    + Add product or service discussed
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid gap-2 text-[10px] text-bodydark font-medium px-0.5" style={{gridTemplateColumns:'96px 1fr 64px 56px 20px'}}>
                      <span>Type</span><span>Name</span><span>Qty</span><span>Unit</span><span/>
                    </div>
                    {form.products_discussed.map((item, idx) => (
                      <div key={idx} className="relative flex items-center gap-2">
                        {/* Type */}
                        <select
                          value={item.type}
                          onChange={e => updateProductRow(idx, 'type', e.target.value)}
                          className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary bg-white w-24 flex-shrink-0">
                          <option value="product">Product</option>
                          <option value="service">Service</option>
                        </select>
                        {/* Name with dropdown */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={e => {
                              updateProductRow(idx, 'product_name', e.target.value);
                              updateProductRow(idx, 'product_id', '');
                              setOpenRowIdx(idx);
                            }}
                            onFocus={() => setOpenRowIdx(idx)}
                            placeholder={item.type === 'service' ? 'Service name' : 'Product name'}
                            className={`w-full rounded border px-2 py-1.5 text-xs outline-none focus:border-primary ${item.product_id ? 'border-meta-3 bg-meta-3/5' : 'border-stroke'}`}
                          />
                          {openRowIdx === idx && (() => {
                            const filtered = products
                              .filter(p => !item.product_name || p.name.toLowerCase().includes(item.product_name.toLowerCase()))
                              .slice(0, 8);
                            if (!filtered.length) return null;
                            return (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenRowIdx(-1)} />
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-stroke rounded shadow-lg max-h-40 overflow-y-auto">
                                  {filtered.map(p => (
                                    <button key={p.id} type="button"
                                      onClick={() => {
                                        updateProductRow(idx, 'product_id', p.id);
                                        updateProductRow(idx, 'product_name', p.name);
                                        updateProductRow(idx, 'unit', p.unit || 'pcs');
                                        updateProductRow(idx, 'type', p.is_service ? 'service' : 'product');
                                        setOpenRowIdx(-1);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-1 border-b border-stroke last:border-0 flex items-center justify-between">
                                      <span className="font-medium text-black">{p.name}</span>
                                      <span className="text-[10px] text-bodydark">
                                        {p.is_service ? 'Service' : 'Product'}{p.unit ? ` · ${p.unit}` : ''}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        {/* Qty */}
                        <input
                          type="number" min="0" step="0.01"
                          value={item.quantity}
                          onChange={e => updateProductRow(idx, 'quantity', e.target.value)}
                          placeholder="Qty"
                          className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary w-16 flex-shrink-0"
                        />
                        {/* Unit */}
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateProductRow(idx, 'unit', e.target.value)}
                          placeholder="Unit"
                          className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary w-14 flex-shrink-0"
                        />
                        {/* Remove */}
                        <button type="button" onClick={() => removeProductRow(idx)}
                          className="text-danger/40 hover:text-danger text-xl leading-none flex-shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-black">Requirement Notes</label>
                <textarea rows={3} value={form.requirement_notes} onChange={set('requirement_notes')}
                  placeholder="Specific requirements, quantities, specifications, constraints..."
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-black">Outcome</label>
                <select value={form.outcome} onChange={set('outcome')}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary">
                  <option value="">— select outcome —</option>
                  {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-black">Internal Remarks</label>
                <textarea rows={2} value={form.internal_remarks} onChange={set('internal_remarks')}
                  placeholder="Manager-only notes, strategy, concerns (not visible to client)..."
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
              </div>
            </div>
          )}

          {/* ── Section: Pipeline & Deal ───────────────── */}
          {section === 'pipeline' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Update Lead Stage</label>
                  <select value={form.lead_stage_after} onChange={set('lead_stage_after')}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="">— no change —</option>
                    {LEAD_STAGES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Priority</label>
                  <select value={form.priority} onChange={set('priority')}
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="">— no change —</option>
                    <option value="hot">🔴 Hot</option>
                    <option value="warm">🟡 Warm</option>
                    <option value="cold">🔵 Cold</option>
                    <option value="medium">⚪ Medium</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Deal Value (₹)</label>
                  <input type="number" min="0" value={form.deal_value} onChange={set('deal_value')} placeholder="e.g. 250000"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-black">Win Probability (%)</label>
                  <input type="number" min="0" max="100" value={form.probability} onChange={set('probability')} placeholder="0-100"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-black">Expected Closure Date</label>
                <input type="date" value={form.expected_closure_date} onChange={set('expected_closure_date')}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>

              {form.deal_value && form.probability && (
                <div className="rounded bg-primary/5 border border-primary/20 p-4">
                  <p className="text-xs text-bodydark">Weighted Deal Value</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {fmtCurrency(parseFloat(form.deal_value) * parseInt(form.probability) / 100)}
                  </p>
                  <p className="text-xs text-bodydark">{form.probability}% of {fmtCurrency(parseFloat(form.deal_value))}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Section: Follow-up ─────────────────────── */}
          {section === 'followup' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Next Follow-up Date & Time</label>
                <input type="datetime-local" value={form.next_followup_datetime} onChange={set('next_followup_datetime')}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Follow-up Action / Reminder</label>
                <input type="text" value={form.next_action} onChange={set('next_action')}
                  placeholder="Send revised proposal, Call for decision, Schedule demo..."
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>

              {/* Summary before save */}
              <div className="rounded border border-stroke bg-gray-1 p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">Activity Summary</p>
                <div className="flex gap-2 flex-wrap">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${actMeta(form.activity_type).color}`}>
                    {actMeta(form.activity_type).icon} {actMeta(form.activity_type).label}
                  </span>
                  {form.priority && <span className={`rounded-full border px-2 py-0.5 text-xs ${(PRIORITY_META[form.priority] || PRIORITY_META.medium).class}`}>
                    {(PRIORITY_META[form.priority] || PRIORITY_META.medium).label}
                  </span>}
                  {form.lead_stage_after && <span className={`rounded px-2 py-0.5 text-xs ${(STAGE_META[form.lead_stage_after] || {}).class || ''}`}>
                    → {form.lead_stage_after}
                  </span>}
                </div>
                {form.lead_search && <p className="text-xs text-bodydark">Lead: <strong className="text-black">{form.lead_search}</strong></p>}
                {form.deal_value && <p className="text-xs text-bodydark">Deal: <strong className="text-black">{fmtCurrency(parseFloat(form.deal_value))}</strong> {form.probability ? `· ${form.probability}% probability` : ''}</p>}
                {form.next_followup_datetime && <p className="text-xs text-bodydark">Follow-up: <strong className="text-black">{fmtDateTime(form.next_followup_datetime)}</strong></p>}
                {form.outcome && <p className="text-xs text-bodydark">Outcome: {form.outcome}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer — wizard nav */}
        <div className="border-t border-stroke px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="text-sm text-bodydark hover:text-black">Cancel</button>
          <div className="flex gap-2">
            {!isFirst && (
              <button onClick={handleBack}
                className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">
                ← Back
              </button>
            )}
            {!isLast ? (
              <button onClick={handleNext}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">
                Next →
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
                {saving ? 'Saving…' : isEdit ? 'Update Activity' : 'Log Activity'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick Follow-up Modal ─────────────────────────────────────────────────────

function QuickFollowupModal({ lead, onClose, onSaved }) {
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (d) => {
    const chosen = d || date;
    if (!chosen) { toast.error('Pick a date'); return; }
    setSaving(true);
    try {
      if (lead.lead_id) {
        await leadsApi.update(lead.lead_id, { next_followup_date: chosen });
      } else {
        await leadsApi.updateStandaloneActivity(lead.id, { next_followup_datetime: chosen + 'T09:00:00' });
      }
      toast.success(`Follow-up set for ${chosen}`);
      onSaved(chosen);
      onClose();
    } catch {
      toast.error('Failed to set follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xs rounded-sm border border-stroke bg-white shadow-default">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
          <div>
            <p className="text-sm font-semibold text-black">Set Follow-up Date</p>
            <p className="text-xs text-bodydark mt-0.5 truncate">{lead.lead_name || lead.lead_company || lead.contact_name || 'Standalone visit'}</p>
          </div>
          <button onClick={onClose} className="text-bodydark hover:text-black">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick buttons */}
          <div className="flex gap-2 flex-wrap">
            {[['Today', today], ['Tomorrow', tomorrow], ['Next Week', nextWeek]].map(([label, val]) => (
              <button key={label} onClick={() => save(val)} disabled={saving}
                className="rounded border border-stroke px-3 py-1.5 text-xs font-medium text-black hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
                {label}
              </button>
            ))}
          </div>

          {/* Custom date */}
          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Custom Date</label>
            <div className="flex gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} min={today}
                className="flex-1 rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={() => save()} disabled={saving || !date}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
                {saving ? '…' : 'Set'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Convert to Lead Modal ─────────────────────────────────────────────────────

function ConvertToLeadModal({ activity, onClose, onConverted }) {
  const [source, setSource] = useState('direct_visit');
  const [saving, setSaving] = useState(false);

  const convert = async () => {
    setSaving(true);
    try {
      const res = await leadsApi.convertActivityToLead(activity.id, { source });
      toast.success(`Lead created: ${res.data.name}`);
      onConverted(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to convert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-sm border border-stroke bg-white shadow-default">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
          <div>
            <p className="text-sm font-semibold text-black">Convert to Lead</p>
            <p className="text-xs text-bodydark mt-0.5">{activity.contact_name}{activity.contact_phone ? ` · ${activity.contact_phone}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-bodydark hover:text-black">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded bg-gray-1 border border-stroke p-3 text-xs text-bodydark space-y-1">
            <p>A new lead will be created with:</p>
            <p className="font-medium text-black">Name: {activity.contact_name || 'Unknown'}</p>
            {activity.contact_phone && <p className="font-medium text-black">Phone: {activity.contact_phone}</p>}
            <p>This activity will be linked to the new lead.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-black mb-1">Lead Source</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
              <option value="direct_visit">Direct Visit</option>
              <option value="referral">Referral</option>
              <option value="walk_in">Walk-in</option>
              <option value="cold_call">Cold Call</option>
              <option value="social">Social Media</option>
              <option value="website">Website</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="rounded border border-stroke px-4 py-2 text-sm text-black hover:bg-gray-1">
              Cancel
            </button>
            <button onClick={convert} disabled={saving}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Creating Lead…' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Activity Card (Timeline) ──────────────────────────────────────────────────

function ActivityCard({ a, onAddFollowup, onEdit, onConvertToLead }) {
  const meta = actMeta(a.activity_type);
  const priMeta = PRIORITY_META[a.priority || 'medium'] || PRIORITY_META.medium;
  const stageMeta = STAGE_META[a.lead_stage_after] || STAGE_META[a.lead_status] || null;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex gap-3">
          {/* Type icon */}
          <div className={`flex-shrink-0 h-10 w-10 rounded-full border flex items-center justify-center text-lg ${meta.color}`}>
            {meta.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Top row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>{meta.label}</span>
              {a.priority && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium flex items-center gap-1 ${priMeta.class}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${priMeta.dot}`} />
                  {priMeta.label}
                </span>
              )}
              {a.lead_stage_after && stageMeta && (
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${stageMeta.class}`}>
                  → {stageMeta.label}
                </span>
              )}
              {a.lead_status && !a.lead_stage_after && (STAGE_META[a.lead_status]) && (
                <span className={`rounded px-2 py-0.5 text-[10px] ${STAGE_META[a.lead_status].class}`}>
                  {STAGE_META[a.lead_status].label}
                </span>
              )}
            </div>

            {/* Lead name or standalone badge */}
            {a.lead_name ? (
              <div className="flex items-baseline gap-2 mb-1">
                <Link to={`/crm/leads/${a.lead_id}`}
                  className="text-sm font-semibold text-primary hover:underline">
                  {a.lead_name}
                </Link>
                {a.lead_company && <span className="text-xs text-bodydark">{a.lead_company}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full bg-bodydark/10 border border-bodydark/20 px-2 py-0.5 text-[10px] text-bodydark font-medium">
                  Standalone Visit
                </span>
              </div>
            )}

            {/* Contact */}
            {a.contact_name && (
              <p className="text-xs text-bodydark mb-1">
                👤 {a.contact_name}{a.contact_phone ? ` · ${a.contact_phone}` : ''}
              </p>
            )}

            {/* Summary */}
            <p className={`text-sm text-black ${expanded ? '' : 'line-clamp-2'}`}>{a.summary}</p>
            {a.summary?.length > 140 && (
              <button onClick={() => setExpanded(p => !p)} className="text-xs text-primary hover:underline mt-0.5">
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}

            {/* Products / Services */}
            {a.products_discussed?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {a.products_discussed.map((item, i) => {
                  const name = typeof item === 'string' ? item : item.product_name;
                  const qty = typeof item === 'object' && item.quantity ? ` ×${item.quantity}${item.unit ? ' ' + item.unit : ''}` : '';
                  const isService = typeof item === 'object' && item.type === 'service';
                  return (
                    <span key={i} className={`rounded px-2 py-0.5 text-[10px] border ${
                      isService ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-1 text-bodydark border-stroke'
                    }`}>
                      {isService ? '🔧' : '📦'} {name}{qty}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Outcome */}
            {a.outcome && (
              <p className="text-xs text-bodydark mt-2">
                <span className="text-meta-3 font-medium">Outcome: </span>{a.outcome}
              </p>
            )}

            {/* Deal row */}
            {(a.deal_value || a.probability || a.expected_closure_date) && (
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {a.deal_value && (
                  <span className="font-semibold text-black">💰 {fmtCurrency(a.deal_value)}</span>
                )}
                {a.probability != null && (
                  <span className="text-bodydark">{a.probability}% probability</span>
                )}
                {a.expected_closure_date && (
                  <span className="text-bodydark">Close: {fmtDate(a.expected_closure_date)}</span>
                )}
              </div>
            )}

            {/* Location */}
            {a.location_name && (
              <p className="text-xs text-bodydark mt-1">
                📍 {a.location_name}
                {a.lat && a.lng && (
                  <a href={`https://maps.google.com/?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer"
                    className="ml-1 text-primary hover:underline">map ↗</a>
                )}
              </p>
            )}

            {/* Follow-up */}
            {(a.next_followup_datetime || a.next_action_date) && (
              <div className={`mt-2 flex items-center gap-1.5 text-xs rounded px-2 py-1 border w-fit ${
                new Date(a.next_followup_datetime || a.next_action_date) < new Date()
                  ? 'bg-danger/10 text-danger border-danger/20'
                  : 'bg-warning/10 text-warning border-warning/20'
              }`}>
                🔔 Follow-up: {fmtDateTime(a.next_followup_datetime) || fmtDate(a.next_action_date)}
                {a.next_action && <span className="ml-1">— {a.next_action}</span>}
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stroke">
              <div className="text-xs text-bodydark">
                {a.done_by_name && <span>{a.done_by_name} · </span>}
                <span>{timeAgo(a.created_at)}</span>
                {a.activity_datetime && a.activity_datetime !== a.created_at && (
                  <span className="ml-1">· Activity: {fmtDateTime(a.activity_datetime)}</span>
                )}
              </div>
              {/* Quick actions */}
              <div className="flex gap-1">
                {a.contact_phone && (
                  <a href={`tel:${a.contact_phone}`}
                    className="rounded border border-stroke px-2 py-1 text-xs text-bodydark hover:text-meta-5 hover:border-meta-5 transition-colors"
                    title="Call">📞</a>
                )}
                {a.contact_phone && (
                  <a href={`https://wa.me/${a.contact_phone?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="rounded border border-stroke px-2 py-1 text-xs text-bodydark hover:text-meta-3 hover:border-meta-3 transition-colors"
                    title="WhatsApp">💬</a>
                )}
                <button onClick={() => onEdit(a)}
                  className="rounded border border-stroke px-2 py-1 text-xs text-bodydark hover:text-primary hover:border-primary transition-colors"
                  title="Edit activity">✏ Edit</button>
                <button onClick={() => onAddFollowup(a)}
                  className="rounded border border-stroke px-2 py-1 text-xs text-bodydark hover:text-primary hover:border-primary transition-colors"
                  title="Set follow-up date">+ Follow-up</button>
                {a.lead_id ? (
                  <Link to={`/crm/leads/${a.lead_id}`}
                    className="rounded border border-stroke px-2 py-1 text-xs text-bodydark hover:text-black transition-colors"
                    title="Open lead">→ Lead</Link>
                ) : (
                  <button onClick={() => onConvertToLead(a)}
                    className="rounded border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                    title="Convert to lead">→ Convert to Lead</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────

function ActivityTableRow({ a, onAddFollowup }) {
  const meta = actMeta(a.activity_type);
  const priMeta = PRIORITY_META[a.priority || 'medium'] || PRIORITY_META.medium;
  return (
    <tr className="border-b border-stroke hover:bg-gray-1 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-xs text-bodydark">{fmtDate(a.created_at)}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {a.lead_name ? (
          <Link to={`/crm/leads/${a.lead_id}`} className="text-sm font-medium text-primary hover:underline">
            {a.lead_name}
          </Link>
        ) : <span className="text-bodydark text-sm">—</span>}
        {a.lead_company && <div className="text-xs text-bodydark">{a.lead_company}</div>}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priMeta.class}`}>
          {priMeta.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {a.lead_stage_after
          ? <span className={`rounded px-2 py-0.5 text-xs ${(STAGE_META[a.lead_stage_after] || {}).class || 'text-bodydark'}`}>→ {a.lead_stage_after}</span>
          : a.lead_status
          ? <span className={`rounded px-2 py-0.5 text-xs ${(STAGE_META[a.lead_status] || {}).class || ''}`}>{a.lead_status}</span>
          : <span className="text-bodydark text-xs">—</span>
        }
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        <p className="text-sm text-black truncate">{a.summary}</p>
        {a.outcome && <p className="text-xs text-bodydark truncate">{a.outcome}</p>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-black">
        {a.deal_value ? fmtCurrency(a.deal_value) : '—'}
        {a.probability != null && a.deal_value && <div className="text-[10px] text-bodydark">{a.probability}%</div>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-bodydark">
        {a.next_followup_datetime
          ? <span className={new Date(a.next_followup_datetime) < new Date() ? 'text-danger' : 'text-warning'}>
              {fmtDate(a.next_followup_datetime)}
            </span>
          : '—'
        }
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-bodydark">{a.done_by_name || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {a.contact_phone && (
            <a href={`tel:${a.contact_phone}`} className="text-meta-5 hover:opacity-70 p-1" title="Call">📞</a>
          )}
          <button onClick={() => onAddFollowup(a)} className="text-primary hover:opacity-70 text-xs p-1" title="Add follow-up">+FU</button>
        </div>
      </td>
    </tr>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ activities }) {
  const today = new Date().toDateString();
  const callsToday = activities.filter(a =>
    a.activity_type === 'call' && new Date(a.created_at).toDateString() === today
  ).length;
  const meetingsWeek = activities.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    const diff = (now - d) / 86400000;
    return a.activity_type === 'meeting' && diff <= 7;
  }).length;
  const pendingFollowups = activities.filter(a =>
    a.next_followup_datetime && new Date(a.next_followup_datetime) > new Date()
  ).length;
  const overdueFollowups = activities.filter(a =>
    a.next_followup_datetime && new Date(a.next_followup_datetime) < new Date()
  ).length;
  const hotLeads = activities.filter(a => a.priority === 'hot').length;

  const stats = [
    { label: 'Total Activities', value: activities.length, color: 'text-black' },
    { label: 'Calls Today',       value: callsToday,        color: 'text-meta-5' },
    { label: 'Meetings (7d)',      value: meetingsWeek,      color: 'text-meta-3' },
    { label: 'Upcoming Follow-ups', value: pendingFollowups, color: 'text-warning' },
    { label: 'Overdue',            value: overdueFollowups,  color: 'text-danger', hide: !overdueFollowups },
    { label: 'Hot Leads',          value: hotLeads,          color: 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.filter(s => !s.hide).map(s => (
        <div key={s.label} className="rounded-sm border border-stroke bg-white px-4 py-3 shadow-default">
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-bodydark mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [viewMode, setViewMode]     = useState('timeline'); // timeline | table

  // Filters
  const [filters, setFilters] = useState({
    activity_type: '', priority: '', lead_stage: '', outcome: '',
    done_by: '', from_date: '', to_date: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [logModal, setLogModal]         = useState(null);
  const [followupLead, setFollowupLead] = useState(null);
  const [editModal, setEditModal]       = useState(null);
  const [convertModal, setConvertModal] = useState(null);

  useEffect(() => {
    employeeApi.list({ limit: 200 }).then(r => {
      const list = r.data?.items ?? r.data ?? [];
      setEmployees(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.activity_type) params.activity_type = filters.activity_type;
      if (filters.priority)      params.priority       = filters.priority;
      if (filters.lead_stage)    params.lead_stage     = filters.lead_stage;
      if (filters.outcome)       params.outcome        = filters.outcome;
      if (filters.done_by)       params.done_by        = filters.done_by;
      if (filters.from_date)     params.from_date      = filters.from_date;
      if (filters.to_date)       params.to_date        = filters.to_date;
      params.limit = 100;
      const r = await leadsApi.allActivities(params);
      setActivities(r.data || []);
    } catch { toast.error('Failed to load activities'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const setFilter = (k) => (e) => setFilters(p => ({ ...p, [k]: e.target.value }));

  const clearFilters = () => setFilters({
    activity_type: '', priority: '', lead_stage: '', outcome: '',
    done_by: '', from_date: '', to_date: '',
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleSaved = (saved) => {
    setActivities(p => [saved, ...p]);
  };

  const grouped = groupByDate(activities);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">Sales Activities</h2>
          <p className="text-sm text-bodydark">Complete activity log across all leads</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded border border-stroke overflow-hidden">
            <button onClick={() => setViewMode('timeline')} title="Timeline"
              className={`px-3 py-1.5 text-xs transition-colors ${viewMode === 'timeline' ? 'bg-primary text-white' : 'text-bodydark hover:bg-gray-1'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><circle cx="3" cy="6" r="1.5" fill="currentColor"/>
                <line x1="3" y1="12" x2="21" y2="12"/><circle cx="3" cy="12" r="1.5" fill="currentColor"/>
                <line x1="3" y1="18" x2="21" y2="18"/><circle cx="3" cy="18" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            <button onClick={() => setViewMode('table')} title="Table"
              className={`px-3 py-1.5 border-l border-stroke text-xs transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'text-bodydark hover:bg-gray-1'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="1"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
            </button>
          </div>

          <button onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-colors ${
              activeFilterCount > 0 ? 'border-primary text-primary' : 'border-stroke text-bodydark hover:text-black'
            }`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <button onClick={() => setLogModal({})}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            + Log Activity
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar activities={activities} />

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-bodydark mb-1">Type</label>
              <select value={filters.activity_type} onChange={setFilter('activity_type')}
                className="rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary">
                <option value="">All types</option>
                {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-bodydark mb-1">Priority</label>
              <select value={filters.priority} onChange={setFilter('priority')}
                className="rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary">
                <option value="">All</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="medium">Medium</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-bodydark mb-1">Lead Stage</label>
              <select value={filters.lead_stage} onChange={setFilter('lead_stage')}
                className="rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary">
                <option value="">All stages</option>
                {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-bodydark mb-1">Sales Person</label>
              <select value={filters.done_by} onChange={setFilter('done_by')}
                className="rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary">
                <option value="">All</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-bodydark mb-1">From</label>
              <input type="date" value={filters.from_date} onChange={setFilter('from_date')}
                className="rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs text-bodydark mb-1">To</label>
              <input type="date" value={filters.to_date} onChange={setFilter('to_date')}
                className="rounded border border-stroke px-3 py-1.5 text-sm outline-none focus:border-primary" />
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-danger hover:underline pb-1">✕ Clear all</button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-bodydark text-sm">Loading activities…</div>
      ) : activities.length === 0 ? (
        <div className="rounded-sm border border-stroke bg-white py-20 text-center shadow-default">
          <p className="text-bodydark text-sm">No activities found. <button onClick={() => setLogModal({})} className="text-primary hover:underline">Log the first one.</button></p>
        </div>
      ) : viewMode === 'timeline' ? (
        // Timeline view
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, acts]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-stroke" />
                <span className="text-xs font-semibold text-bodydark uppercase tracking-widest">{dateLabel}</span>
                <div className="h-px flex-1 bg-stroke" />
              </div>
              <div className="space-y-3">
                {acts.map(a => (
                  <ActivityCard key={a.id} a={a}
                    onAddFollowup={(act) => setFollowupLead(act)}
                    onEdit={(act) => setEditModal(act)}
                    onConvertToLead={(act) => setConvertModal(act)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table view
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stroke bg-gray-1 text-left">
                <th className="px-4 py-3 font-medium text-black text-xs">Date</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Type</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Lead</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Priority</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Stage</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Summary</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Deal Value</th>
                <th className="px-4 py-3 font-medium text-black text-xs">Follow-up</th>
                <th className="px-4 py-3 font-medium text-black text-xs">By</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {activities.map(a => (
                <ActivityTableRow key={a.id} a={a}
                  onAddFollowup={(act) => setFollowupLead(act)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Activity Modal */}
      {logModal && (
        <LogActivityModal
          preselectedLeadId={logModal.leadId}
          preselectedLeadName={logModal.leadName}
          onClose={() => setLogModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Quick Follow-up Date Modal */}
      {followupLead && (
        <QuickFollowupModal
          lead={followupLead}
          onClose={() => setFollowupLead(null)}
          onSaved={() => {}}
        />
      )}

      {/* Edit Activity Modal */}
      {editModal && (
        <LogActivityModal
          editActivity={editModal}
          onClose={() => setEditModal(null)}
          onSaved={(updated) => {
            setActivities(p => p.map(a => a.id === updated.id ? updated : a));
          }}
        />
      )}

      {/* Convert to Lead Modal */}
      {convertModal && (
        <ConvertToLeadModal
          activity={convertModal}
          onClose={() => setConvertModal(null)}
          onConverted={() => loadActivities()}
        />
      )}
    </div>
  );
}

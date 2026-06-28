import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerApi, amcApi, serviceApi, ownershipApi } from '../../api/client';
import toast from 'react-hot-toast';

const SEVERITY_META = { high: 'bg-meta-1/10 text-meta-1', medium: 'bg-meta-6/10 text-meta-6', low: 'bg-meta-3/10 text-meta-3' };
const TICKET_STATUS = { in_progress: 'bg-primary/10 text-primary', resolved: 'bg-meta-3/10 text-meta-3', open: 'bg-meta-6/10 text-meta-6' };

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [amcs, setAmcs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ownedProducts, setOwnedProducts] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [tab, setTab] = useState('overview');
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      customerApi.get(id),
      amcApi.list({ customer_id: id }),
      serviceApi.list({ customer_id: id }),
      ownershipApi.listByCustomer(id),
    ])
      .then(([cRes, aRes, tRes, oRes]) => {
        setCustomer(cRes.data);
        setForm({ contact: cRes.data.contact, phone: cRes.data.phone, email: cRes.data.email, address: cRes.data.address });
        setAmcs(aRes.data?.results ?? aRes.data?.items ?? aRes.data ?? []);
        setTickets(tRes.data?.results ?? tRes.data?.items ?? tRes.data ?? []);
        setOwnedProducts(oRes.data?.items ?? oRes.data ?? []);
      })
      .catch(() => toast.error('Failed to load customer'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadTimeline = async () => {
    if (timeline.length > 0) return;
    setTimelineLoading(true);
    try {
      const res = await ownershipApi.timeline(id);
      setTimeline(res.data?.events ?? res.data ?? []);
    } catch {
      toast.error('Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleTabChange = (v) => {
    setTab(v);
    if (v === 'timeline') loadTimeline();
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await customerApi.update(id, form);
      setCustomer(p => ({ ...p, ...res.data }));
      setEditModal(false);
      toast.success('Customer updated');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><span className="spinner" /></div>;
  if (!customer) return <div className="p-8 text-center text-bodydark">Customer not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/customers" className="hover:text-primary">Customers</Link>
        <span>/</span>
        <span className="text-black font-medium">{customer.name}</span>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">{customer.name}</h2>
              <p className="text-sm text-bodydark">{customer.contact} · {customer.phone}</p>
              <p className="text-sm text-bodydark">{customer.city} · Joined {customer.joined}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditModal(true)} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Edit</button>
            <Link to="/customers" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">← Back</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Total Revenue', val: `₹${(customer.total_revenue ?? 0).toLocaleString()}`, cls: 'text-black' },
            { label: 'AMC Contracts', val: customer.amc_count ?? amcs.length, cls: 'text-primary' },
            { label: 'Open Tickets', val: customer.open_tickets ?? tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length, cls: (customer.open_tickets ?? 0) > 0 ? 'text-meta-1' : 'text-meta-3' },
            { label: 'AMC Status', val: customer.active_amc ? 'Active' : 'No AMC', cls: customer.active_amc ? 'text-meta-3' : 'text-bodydark' },
          ].map(s => (
            <div key={s.label} className="rounded bg-gray-1 p-3">
              <div className="text-xs text-bodydark mb-0.5">{s.label}</div>
              <div className={`text-lg font-bold ${s.cls}`}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tab-list">
        {[['overview', 'Overview'], ['products', `Products (${ownedProducts.length})`], ['amc', 'AMC Contracts'], ['tickets', 'Service Tickets'], ['timeline', 'Timeline'], ['documents', 'Documents']].map(([v, l]) => (
          <button key={v} onClick={() => handleTabChange(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-sm border border-stroke bg-white shadow-default">
            <div className="px-5 py-4 border-b border-stroke"><h3 className="font-medium text-black">Contact Details</h3></div>
            <div className="p-5 space-y-3">
              {[['Contact Person', customer.contact], ['Phone', customer.phone], ['Email', customer.email], ['City', customer.city], ['GST No.', customer.gst || '—']].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm py-1.5 border-b border-stroke/50 last:border-0">
                  <span className="text-bodydark">{l}</span>
                  <span className="text-black font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-sm border border-stroke bg-white shadow-default">
            <div className="px-5 py-4 border-b border-stroke"><h3 className="font-medium text-black">Billing Address</h3></div>
            <div className="p-5">
              <p className="text-sm text-bodydark leading-relaxed">{customer.address}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-black">Owned Products ({ownedProducts.length})</h3>
          </div>
          {ownedProducts.length === 0 ? (
            <div className="rounded-sm border border-stroke bg-white shadow-default p-8 text-center text-bodydark text-sm">No products recorded yet. Products are added when a lead is closed.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownedProducts.map(op => {
                const today = new Date();
                const warrantyExpiry = op.warranty_end_date ? new Date(op.warranty_end_date) : null;
                const amcExpiry = op.amc_end_date ? new Date(op.amc_end_date) : null;
                const nextService = op.next_service_date ? new Date(op.next_service_date) : null;
                const nextRefill = op.next_refill_date ? new Date(op.next_refill_date) : null;
                const daysUntil = (d) => d ? Math.ceil((d - today) / 86400000) : null;
                const wDays = daysUntil(warrantyExpiry);
                const aDays = daysUntil(amcExpiry);
                const sDays = daysUntil(nextService);
                const rDays = daysUntil(nextRefill);

                const statusCls = op.current_status === 'active'
                  ? 'bg-meta-3/10 text-meta-3'
                  : op.current_status === 'warranty_expired' || op.current_status === 'amc_expired'
                    ? 'bg-meta-1/10 text-meta-1'
                    : 'bg-meta-6/10 text-meta-6';

                return (
                  <div key={op.id} className="rounded-sm border border-stroke bg-white shadow-default p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-black">{op.product_name || op.product_id}</p>
                        {op.serial_number && <p className="text-xs text-bodydark font-mono">S/N: {op.serial_number}</p>}
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${statusCls}`}>
                        {(op.current_status || 'active').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {op.purchase_date && <><span className="text-bodydark">Purchase</span><span className="text-black">{op.purchase_date}</span></>}
                      {op.delivery_date && <><span className="text-bodydark">Delivery</span><span className="text-black">{op.delivery_date}</span></>}
                      {op.installation_date && <><span className="text-bodydark">Installation</span><span className="text-black">{op.installation_date}</span></>}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-stroke/50">
                      {op.warranty_applicable && (
                        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${wDays !== null && wDays <= 0 ? 'bg-meta-1/10 text-meta-1' : wDays !== null && wDays <= 30 ? 'bg-meta-6/10 text-meta-6' : 'bg-meta-6/10 text-meta-6'}`}>
                          Warranty {wDays !== null ? (wDays <= 0 ? 'Expired' : `${wDays}d left`) : op.warranty_end_date || '—'}
                        </span>
                      )}
                      {op.amc_applicable && (
                        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${aDays !== null && aDays <= 0 ? 'bg-meta-1/10 text-meta-1' : aDays !== null && aDays <= 30 ? 'bg-meta-6/10 text-meta-6' : 'bg-primary/10 text-primary'}`}>
                          AMC {aDays !== null ? (aDays <= 0 ? 'Expired' : `${aDays}d left`) : op.amc_end_date || '—'}
                        </span>
                      )}
                      {op.service_applicable && nextService && (
                        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${sDays !== null && sDays <= 7 ? 'bg-meta-1/10 text-meta-1' : 'bg-meta-3/10 text-meta-3'}`}>
                          Service {sDays !== null ? (sDays <= 0 ? 'Overdue' : `in ${sDays}d`) : op.next_service_date}
                        </span>
                      )}
                      {op.refill_applicable && nextRefill && (
                        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${rDays !== null && rDays <= 7 ? 'bg-meta-1/10 text-meta-1' : 'bg-meta-5/10 text-meta-5'}`}>
                          Refill {rDays !== null ? (rDays <= 0 ? 'Overdue' : `in ${rDays}d`) : op.next_refill_date}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Customer Lifecycle Timeline</h3>
          </div>
          {timelineLoading ? (
            <div className="flex justify-center py-12"><span className="spinner" /></div>
          ) : timeline.length === 0 ? (
            <div className="p-8 text-center text-sm text-bodydark">No timeline events found.</div>
          ) : (
            <div className="p-5">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-stroke" />
                <div className="space-y-4">
                  {timeline.map((ev, i) => {
                    const iconMap = {
                      lead_created: { icon: '🎯', cls: 'bg-primary/10' },
                      activity: { icon: '📋', cls: 'bg-meta-6/10' },
                      quotation: { icon: '📄', cls: 'bg-meta-5/10' },
                      closure: { icon: '✅', cls: 'bg-meta-3/10' },
                      ownership_created: { icon: '📦', cls: 'bg-primary/10' },
                      warranty_event: { icon: '🛡', cls: 'bg-meta-6/10' },
                      amc_event: { icon: '🔄', cls: 'bg-primary/10' },
                      service_contract: { icon: '📝', cls: 'bg-meta-3/10' },
                      service_visit: { icon: '🔧', cls: 'bg-meta-3/10' },
                      refill_due: { icon: '💧', cls: 'bg-meta-5/10' },
                      notification: { icon: '🔔', cls: 'bg-meta-6/10' },
                    };
                    const { icon, cls } = iconMap[ev.event_type] || { icon: '•', cls: 'bg-gray-1' };
                    return (
                      <div key={i} className="flex gap-4 pl-2">
                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${cls}`}>{icon}</div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-black">{ev.title || ev.event_type?.replace(/_/g, ' ')}</p>
                            <span className="text-xs text-bodydark flex-shrink-0">{ev.date || ev.created_at?.slice(0, 10)}</span>
                          </div>
                          {ev.description && <p className="text-xs text-bodydark mt-0.5">{ev.description}</p>}
                          {ev.meta && typeof ev.meta === 'object' && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(ev.meta).map(([k, v]) => v && (
                                <span key={k} className="text-[10px] text-bodydark">
                                  <span className="font-medium">{k.replace(/_/g, ' ')}:</span> {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'amc' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">AMC Contracts</h3>
            <Link to="/amc/contracts" className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">+ New Contract</Link>
          </div>
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Contract No', 'Product', 'Start', 'End', 'Value', 'Status'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {amcs.map(a => (
                <tr key={a.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5">
                    <Link to={`/amc/contracts/${a.id}`} className="font-mono text-sm text-primary hover:underline">{a.contract_no}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-black">{a.product}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{a.start}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{a.end}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">₹{a.value.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-meta-3/10 text-meta-3">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Service Tickets</h3>
            <Link to="/amc/tickets" className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">+ New Ticket</Link>
          </div>
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Ticket No', 'Issue', 'Severity', 'Status', 'Reported'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5">
                    <Link to={`/amc/tickets/${t.id}`} className="font-mono text-sm text-primary hover:underline">{t.ticket_no}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-black max-w-xs truncate">{t.issue}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_META[t.severity]}`}>{t.severity}</span></td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TICKET_STATUS[t.status] || 'bg-meta-9 text-bodydark'}`}>{t.status.replace('_', ' ')}</span></td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{t.reported}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
          <div className="flex justify-between mb-4">
            <h3 className="font-medium text-black">Documents</h3>
            <button className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white">Upload</button>
          </div>
          <div className="space-y-2">
            {['Customer Agreement - Jan 2024.pdf', 'KYC Documents.pdf', 'GST Certificate.pdf'].map(d => (
              <div key={d} className="flex items-center gap-3 p-3 rounded border border-stroke hover:bg-gray-1">
                <span className="text-primary">📄</span>
                <span className="flex-1 text-sm text-black">{d}</span>
                <button className="text-xs text-primary hover:underline">Download</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Edit Customer</h3>
              <button onClick={() => setEditModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Contact Person" value={form.contact} onChange={set('contact')} />
                <F label="Phone" value={form.phone} onChange={set('phone')} />
              </div>
              <F label="Email" type="email" value={form.email} onChange={set('email')} />
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Address</label>
                <textarea value={form.address} onChange={set('address')} rows={3} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setEditModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
    </div>
  );
}

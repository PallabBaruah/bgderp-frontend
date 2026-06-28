import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const CONTRACTS = [
  { id: 1, contract_no: 'AMC-001', customer: 'ABC Technologies', contact: 'Rajesh Kumar', phone: '9876543000', email: 'rajesh@abc.com', product: 'CCTV Surveillance System', description: '32-channel DVR with 24 cameras, full HD, night vision', start: '2025-01-01', end: '2025-12-31', value: 85000, visits: 4, completed_visits: 1, status: 'active', assigned_engineer: 'Suresh Kumar' },
];

const VISITS = [
  { id: 1, date: '2025-02-15', engineer: 'Suresh Kumar', status: 'completed', notes: 'Cleaned all cameras, tested DVR recording, updated firmware', time_in: '10:00', time_out: '13:30' },
  { id: 2, date: '2025-05-15', engineer: 'Suresh Kumar', status: 'scheduled', notes: null, time_in: null, time_out: null },
  { id: 3, date: '2025-08-15', engineer: 'Suresh Kumar', status: 'pending', notes: null, time_in: null, time_out: null },
  { id: 4, date: '2025-11-15', engineer: 'Suresh Kumar', status: 'pending', notes: null, time_in: null, time_out: null },
];

const TICKETS = [
  { id: 1, ticket_no: 'TKT-012', issue: 'Camera 14 not recording', severity: 'high', status: 'resolved', reported: '2025-04-10', resolved: '2025-04-11' },
  { id: 2, ticket_no: 'TKT-028', issue: 'DVR disk space full warning', severity: 'medium', status: 'closed', reported: '2025-03-20', resolved: '2025-03-21' },
];

const VISIT_META = { completed: 'bg-meta-3/10 text-meta-3', scheduled: 'bg-meta-5/10 text-meta-5', pending: 'bg-gray-2 text-bodydark' };
const SEVERITY_META = { high: 'bg-meta-1/10 text-meta-1', medium: 'bg-meta-6/10 text-meta-6', low: 'bg-meta-3/10 text-meta-3' };

export default function ContractDetail() {
  const { id } = useParams();
  const contract = CONTRACTS.find(c => String(c.id) === id) || CONTRACTS[0];
  const [tab, setTab] = useState('overview');
  const [renewModal, setRenewModal] = useState(false);

  const visitPct = contract.visits ? (contract.completed_visits / contract.visits) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/amc/contracts" className="hover:text-primary">AMC Contracts</Link>
        <span>/</span>
        <span className="text-black font-medium">{contract.contract_no}</span>
      </div>

      {/* Header */}
      <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-black">{contract.contract_no}</h2>
            <p className="text-sm text-bodydark">{contract.customer} · {contract.product}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-bodydark">
              <span>👤 {contract.contact}</span>
              <span>📱 {contract.phone}</span>
              <span>✉ {contract.email}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex rounded-full px-3 py-1 text-sm font-medium bg-meta-3/10 text-meta-3">Active</span>
            <button onClick={() => setRenewModal(true)} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Renew Contract</button>
            <Link to="/amc/contracts" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">← Back</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mt-5">
          {[
            { label: 'Contract Value', val: `₹${contract.value.toLocaleString()}` },
            { label: 'Start Date', val: contract.start },
            { label: 'End Date', val: contract.end },
            { label: 'Engineer', val: contract.assigned_engineer },
          ].map(s => (
            <div key={s.label} className="rounded bg-gray-1 p-3">
              <div className="text-xs text-bodydark mb-0.5">{s.label}</div>
              <div className="text-sm font-semibold text-black">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Visit progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-bodydark">Visit Progress</span>
            <span className="font-medium text-black">{contract.completed_visits}/{contract.visits} visits completed</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill bg-primary" style={{ width: `${visitPct}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        {[['overview','Overview'],['visits','Scheduled Visits'],['tickets','Service Tickets'],['documents','Documents']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InfoCard title="Contract Details">
            {[['Contract No', contract.contract_no],['Customer', contract.customer],['Product', contract.product],['Description', contract.description],['Value', `₹${contract.value.toLocaleString()}`],['Visits/Year', contract.visits],['Start Date', contract.start],['End Date', contract.end]].map(([l,v]) => (
              <div key={l} className="flex justify-between text-sm py-1.5 border-b border-stroke/50 last:border-0">
                <span className="text-bodydark">{l}</span>
                <span className="text-black font-medium text-right max-w-[60%]">{v}</span>
              </div>
            ))}
          </InfoCard>
          <InfoCard title="Customer & Contact">
            {[['Customer', contract.customer],['Contact Person', contract.contact],['Phone', contract.phone],['Email', contract.email],['Assigned Engineer', contract.assigned_engineer]].map(([l,v]) => (
              <div key={l} className="flex justify-between text-sm py-1.5 border-b border-stroke/50 last:border-0">
                <span className="text-bodydark">{l}</span>
                <span className="text-black font-medium">{v}</span>
              </div>
            ))}
          </InfoCard>
        </div>
      )}

      {tab === 'visits' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Scheduled Maintenance Visits</h3>
            <button onClick={() => toast.success('Generating visit schedule…')} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark">Generate Schedule</button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Visit #','Scheduled Date','Engineer','Status','Time In','Time Out','Notes','Action'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {VISITS.map((v, i) => (
                <tr key={v.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm font-medium text-black">#{i + 1}</td>
                  <td className="px-5 py-3.5 text-sm text-black">{v.date}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{v.engineer}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${VISIT_META[v.status]}`}>{v.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{v.time_in || '--'}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{v.time_out || '--'}</td>
                  <td className="px-5 py-3.5 text-xs text-bodydark max-w-[200px] truncate">{v.notes || '--'}</td>
                  <td className="px-5 py-3.5">
                    {v.status !== 'completed' && (
                      <button onClick={() => toast.success('Visit updated')} className="text-xs text-primary hover:underline">Update</button>
                    )}
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
              <tr>{['Ticket No','Issue','Severity','Status','Reported','Resolved'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {TICKETS.map((t) => (
                <tr key={t.id} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 font-mono text-sm text-primary">{t.ticket_no}</td>
                  <td className="px-5 py-3.5 text-sm text-black">{t.issue}</td>
                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_META[t.severity]}`}>{t.severity}</span></td>
                  <td className="px-5 py-3.5"><span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-meta-3/10 text-meta-3">{t.status}</span></td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{t.reported}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{t.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
          <div className="flex justify-between mb-4">
            <h3 className="font-medium text-black">Contract Documents</h3>
            <button className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white">Upload</button>
          </div>
          <div className="space-y-2">
            {['AMC-001 Contract Agreement.pdf','Equipment List & Serial Numbers.xlsx','Service Report - Feb 2025.pdf'].map(d => (
              <div key={d} className="flex items-center gap-3 p-3 rounded border border-stroke hover:bg-gray-1">
                <span className="text-primary">📄</span>
                <span className="flex-1 text-sm text-black">{d}</span>
                <button className="text-xs text-primary hover:underline">Download</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {renewModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Renew Contract</h3>
              <button onClick={() => setRenewModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="New Start Date" type="date" />
                <F label="New End Date" type="date" />
              </div>
              <F label="New Contract Value (₹)" type="number" placeholder="90000" />
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Renewal Notes</label>
                <textarea rows={3} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none" placeholder="Renewal notes…" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setRenewModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={() => { setRenewModal(false); toast.success('Contract renewed'); }} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Renew Contract</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="px-5 py-4 border-b border-stroke"><h3 className="font-medium text-black">{title}</h3></div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function F({ label, type='text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-bodydark mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
    </div>
  );
}

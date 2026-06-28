import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const TICKETS = [
  { id: 1, ticket_no: 'TKT-047', customer: 'ABC Technologies', contact: 'Rajesh Kumar', phone: '9876543000', product: 'CCTV Surveillance System', contract: 'AMC-001', issue: 'Camera 14 not recording — DVR disk issue', description: 'Camera 14 stopped recording since yesterday. DVR shows disk warning. Estimated 85% disk capacity. Need immediate attention as this camera covers main entrance.', severity: 'high', status: 'in_progress', assigned_to: 'Suresh Kumar', reported: '2025-05-01', location: 'Server Room, Floor 2' },
];

const NOTES = [
  { id: 1, by: 'Suresh Kumar', type: 'update', msg: 'Visited site. DVR disk at 92%. Need to replace HDD. Ordered 4TB HDD from vendor.', date: '2025-05-01 15:30' },
  { id: 2, by: 'Rahul Sharma', type: 'assignment', msg: 'Ticket assigned to Suresh Kumar for immediate resolution.', date: '2025-05-01 11:00' },
  { id: 3, by: 'System', type: 'created', msg: 'Ticket created from customer complaint via phone call.', date: '2025-05-01 09:45' },
];

const STATUS_META = {
  open:        { label: 'Open',        color: 'bg-meta-6/10 text-meta-6' },
  assigned:    { label: 'Assigned',    color: 'bg-meta-5/10 text-meta-5' },
  in_progress: { label: 'In Progress', color: 'bg-primary/10 text-primary' },
  resolved:    { label: 'Resolved',    color: 'bg-meta-3/10 text-meta-3' },
  closed:      { label: 'Closed',      color: 'bg-meta-9 text-bodydark' },
};

const SEVERITY_META = { critical: 'bg-meta-1/15 text-meta-1', high: 'bg-meta-1/10 text-meta-1', medium: 'bg-meta-6/10 text-meta-6', low: 'bg-meta-3/10 text-meta-3' };
const STATUSES = ['open','assigned','in_progress','resolved','closed'];

export default function TicketDetail() {
  const { id } = useParams();
  const ticket = TICKETS.find(t => String(t.id) === id) || TICKETS[0];
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(NOTES);
  const [newNote, setNewNote] = useState('');
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(p => [{ id: Date.now(), by: 'You', type: 'update', msg: newNote, date: new Date().toISOString().replace('T',' ').slice(0,16) }, ...p]);
    setNewNote('');
    toast.success('Note added');
  };

  const updateStatus = () => {
    setStatus(newStatus);
    setNotes(p => [{ id: Date.now(), by: 'You', type: 'status', msg: `Status changed to "${newStatus}"`, date: new Date().toISOString().replace('T',' ').slice(0,16) }, ...p]);
    setStatusModal(false);
    toast.success(`Status updated to ${newStatus}`);
  };

  const statusM = STATUS_META[status];
  const sevM = SEVERITY_META[ticket.severity];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/amc/tickets" className="hover:text-primary">Service Tickets</Link>
        <span>/</span>
        <span className="text-black font-medium">{ticket.ticket_no}</span>
      </div>

      {/* Header card */}
      <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-lg font-bold text-primary">{ticket.ticket_no}</span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusM.color}`}>{statusM.label}</span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sevM}`}>{ticket.severity}</span>
            </div>
            <h2 className="text-lg font-semibold text-black">{ticket.issue}</h2>
            <p className="text-sm text-bodydark mt-1">{ticket.customer} · {ticket.product} · {ticket.contract}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setStatusModal(true)} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Update Status</button>
            <Link to="/amc/tickets" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">← Back</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-5">
          {[
            { label: 'Reported By', val: ticket.contact },
            { label: 'Phone', val: ticket.phone },
            { label: 'Assigned To', val: ticket.assigned_to || 'Unassigned' },
            { label: 'Location', val: ticket.location },
            { label: 'Reported On', val: ticket.reported },
            { label: 'Contract', val: ticket.contract },
          ].map(s => (
            <div key={s.label} className="rounded bg-gray-1 p-3">
              <div className="text-xs text-bodydark mb-0.5">{s.label}</div>
              <div className="text-sm font-semibold text-black">{s.val}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded bg-bodydark/5 border border-stroke">
          <p className="text-sm font-medium text-black mb-1">Problem Description:</p>
          <p className="text-sm text-bodydark">{ticket.description}</p>
        </div>
      </div>

      {/* Notes & Updates */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
          <h3 className="font-medium text-black mb-4">Add Update</h3>
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={4} placeholder="Add a note or update…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary resize-none mb-3" />
          <button onClick={addNote} className="w-full rounded bg-primary py-2 text-sm font-medium text-white hover:bg-primary-dark">Add Note</button>
          <div className="mt-4 space-y-2">
            <button onClick={() => toast.success('Assigned')} className="w-full rounded border border-stroke py-2 text-sm font-medium text-black hover:bg-gray-1">Reassign Engineer</button>
            <button onClick={() => { setStatus('resolved'); toast.success('Resolved'); }} className="w-full rounded bg-meta-3 py-2 text-sm font-medium text-white hover:bg-opacity-90">Mark Resolved</button>
            <button onClick={() => { setStatus('closed'); toast.success('Closed'); }} className="w-full rounded border border-stroke py-2 text-sm font-medium text-black hover:bg-gray-1">Close Ticket</button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-sm border border-stroke bg-white shadow-default divide-y divide-stroke">
          <div className="px-5 py-4">
            <h3 className="font-medium text-black">Activity Timeline</h3>
          </div>
          {notes.map((n) => (
            <div key={n.id} className="flex gap-3 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {n.by === 'System' ? '⚙' : n.by.split(' ').map(w=>w[0]).slice(0,2).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-black">{n.by}</span>
                  <span className="text-xs text-bodydark">{n.date}</span>
                </div>
                <p className="text-sm text-bodydark mt-0.5">{n.msg}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Update Status</h3>
              <button onClick={() => setStatusModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-2">
              {STATUSES.map(s => {
                const m = STATUS_META[s];
                return (
                  <button key={s} onClick={() => setNewStatus(s)} className={`w-full text-left rounded px-4 py-3 text-sm font-medium border transition-colors ${newStatus === s ? 'border-primary bg-primary/5 text-primary' : 'border-stroke hover:bg-gray-1 text-black'}`}>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium mr-2 ${m.color}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setStatusModal(false)} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={updateStatus} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

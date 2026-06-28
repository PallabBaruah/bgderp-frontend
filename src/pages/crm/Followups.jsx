import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '../../api/client';
import toast from 'react-hot-toast';

const PERIODS = [
  { value: 'overdue',   label: 'Overdue' },
  { value: 'today',     label: 'Today' },
  { value: 'tomorrow',  label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'all',       label: 'All' },
];

const LABEL_COLOR = {
  Overdue:   'bg-meta-1/10 text-meta-1',
  Today:     'bg-meta-6/10 text-meta-6',
  Tomorrow:  'bg-meta-8/10 text-meta-8',
  'This Week': 'bg-meta-5/10 text-meta-5',
  Upcoming:  'bg-bodydark/10 text-bodydark',
};

const PRIORITY_COLOR = {
  hot:    'bg-meta-1/10 text-meta-1',
  warm:   'bg-meta-6/10 text-meta-6',
  cold:   'bg-meta-5/10 text-meta-5',
  high:   'bg-meta-1/10 text-meta-1',
  medium: 'bg-meta-6/10 text-meta-6',
  low:    'bg-meta-3/10 text-meta-3',
};

export default function Followups() {
  const [period, setPeriod]     = useState('today');
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showDone, setShowDone] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await leadsApi.followups({ period, include_done: showDone });
      setItems(res.data?.results || []);
    } catch {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, showDone]);

  const pending = items.filter(f => !f.is_done);
  const done    = items.filter(f => f.is_done);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">Follow-up Tracker</h2>
          <p className="text-sm text-bodydark">
            {pending.length} pending · {done.length} done
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-bodydark cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDone}
            onChange={e => setShowDone(e.target.checked)}
            className="rounded"
          />
          Show completed
        </label>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === value ? 'bg-primary text-white' : 'bg-gray-1 text-bodydark hover:bg-gray-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-bodydark text-sm">
            No follow-ups found for this period.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>
                  {['Lead / Company', 'Phone', 'Follow-up Date', 'Priority', 'Stage', 'Assigned To', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {items.map(f => (
                  <tr key={f.id} className={`hover:bg-gray-1 ${f.is_done ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <Link to={`/crm/leads/${f.id}`} className="font-medium text-sm text-black hover:text-primary">
                        {f.company}
                      </Link>
                      <div className="text-xs text-bodydark">{f.contact} · {f.lead_no}</div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-black">{f.phone || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-black">{f.next_followup_date}</div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5 ${LABEL_COLOR[f.followup_label] || ''}`}>
                        {f.followup_label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {f.priority ? (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLOR[f.priority] || ''}`}>
                          {f.priority}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-bodydark capitalize">{f.status || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-bodydark">{f.assigned_to_name || 'Unassigned'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        f.is_done ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-6/10 text-meta-6'
                      }`}>
                        {f.is_done ? 'Done' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link to={`/crm/leads/${f.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">
                        Log Activity →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-bodydark">
        Follow-ups are set when logging activities on leads. A follow-up is marked <strong>Done</strong> automatically when a contact is recorded on or after the scheduled date.
      </p>
    </div>
  );
}

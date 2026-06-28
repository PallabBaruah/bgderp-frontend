import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ownershipApi } from '../../api/client';
import toast from 'react-hot-toast';

const TABS = [
  { value: 'amc',      label: 'AMC Renewals',   color: 'text-primary', bg: 'bg-primary/10' },
  { value: 'warranty', label: 'Warranty Expiry', color: 'text-meta-6',  bg: 'bg-meta-6/10'  },
  { value: 'service',  label: 'Service Due',     color: 'text-meta-3',  bg: 'bg-meta-3/10'  },
  { value: 'refill',   label: 'Refill Due',      color: 'text-meta-5',  bg: 'bg-meta-5/10'  },
];

const STATUS_CLS = {
  active:           'bg-meta-3/10 text-meta-3',
  warranty_expired: 'bg-meta-1/10 text-meta-1',
  amc_expired:      'bg-meta-1/10 text-meta-1',
  expiring_soon:    'bg-meta-6/10 text-meta-6',
  inactive:         'bg-gray-1 text-bodydark',
};

const QUICK_RANGES = [
  { label: '30 days',  days: 30  },
  { label: '60 days',  days: 60  },
  { label: '90 days',  days: 90  },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
  { label: '2 years',  days: 730 },
];

function toISO(d) { return d ? d.toISOString().split('T')[0] : ''; }

export default function AMCRenewals() {
  const today = new Date();
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('amc');
  const [fromDate, setFromDate] = useState(toISO(today));
  const [toDate, setToDate] = useState(toISO(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())));
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    ownershipApi.lifecycleDashboard()
      .then(r => setDashboard(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchItems = useCallback(() => {
    if (!fromDate || !toDate) return;
    setItemsLoading(true);
    ownershipApi.upcomingRenewals({ renewal_type: tab, from_date: fromDate, to_date: toDate })
      .then(r => {
        const d = r.data;
        const list = d?.results ?? d?.items ?? (Array.isArray(d) ? d : []);
        setItems(list);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setItemsLoading(false));
  }, [tab, fromDate, toDate]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const applyQuickRange = (days) => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);
    setFromDate(toISO(from));
    setToDate(toISO(to));
  };

  const stats = dashboard || {};
  const dueDateKey = { amc: 'end_date', warranty: 'due_date', service: 'due_date', refill: 'due_date' };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-black">AMC & Lifecycle Renewals</h2>
        <p className="text-sm text-bodydark">AMC, warranty, service, and refill tracking across all customers</p>
      </div>

      {/* Summary stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active AMC',              val: stats.amc?.active ?? '—',                cls: 'text-primary' },
            { label: 'AMC Expiring (30d)',       val: stats.amc?.expiring_30_days ?? '—',      cls: 'text-meta-6'  },
            { label: 'AMC Expired',             val: stats.amc?.expired ?? '—',               cls: 'text-meta-1'  },
            { label: 'Warranty Expiring (30d)', val: stats.warranty?.expiring_30_days ?? '—',  cls: 'text-meta-6'  },
            { label: 'Service Due (7d)',         val: stats.service?.due_soon ?? '—',          cls: 'text-meta-3'  },
            { label: 'Refill Due (7d)',          val: stats.refill?.due_soon ?? '—',           cls: 'text-meta-5'  },
            { label: 'Upcoming Visits',         val: stats.service?.upcoming_visits ?? '—',   cls: 'text-black'   },
            { label: 'AMC Expiring (60d)',       val: stats.amc?.expiring_60_days ?? '—',      cls: 'text-meta-6'  },
          ].map(s => (
            <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-4">
              <div className={`text-2xl font-bold ${s.cls}`}>{s.val}</div>
              <div className="text-xs text-bodydark mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + date range */}
      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke space-y-3">
          {/* Type tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${tab === t.value ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Date range row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-bodydark whitespace-nowrap">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="rounded border border-stroke px-2 py-1.5 text-xs text-black outline-none focus:border-primary" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-bodydark whitespace-nowrap">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                min={fromDate}
                className="rounded border border-stroke px-2 py-1.5 text-xs text-black outline-none focus:border-primary" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_RANGES.map(r => (
                <button key={r.days} onClick={() => applyQuickRange(r.days)}
                  className="rounded border border-stroke px-2.5 py-1 text-xs text-bodydark hover:bg-gray-1 hover:border-primary hover:text-primary transition-colors">
                  {r.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-bodydark ml-auto">{items.length} record{items.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {itemsLoading ? (
          <div className="flex justify-center py-8"><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-bodydark">
            No {TABS.find(t => t.value === tab)?.label.toLowerCase()} events between {fromDate} and {toDate}.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Customer', 'Product / Contract', 'Due Date', 'Days Left', 'Status', ''].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {items.map(r => {
                const dueDate = r[dueDateKey[tab]];
                const daysLeft = r.days_left ?? r.days_until_due;
                const urgencyCls = typeof daysLeft === 'number'
                  ? daysLeft < 0   ? 'text-meta-1 font-bold'
                  : daysLeft <= 7  ? 'text-meta-1 font-semibold'
                  : daysLeft <= 30 ? 'text-meta-6 font-semibold'
                  : 'text-black'
                  : 'text-black';
                const statusCls = STATUS_CLS[r.current_status] || 'bg-gray-1 text-bodydark';
                return (
                  <tr key={r.id} className="hover:bg-gray-1">
                    <td className="px-5 py-3.5">
                      {r.customer_id
                        ? <Link to={`/customers/${r.customer_id}`} className="text-sm font-medium text-primary hover:underline">{r.customer_name || r.customer_id}</Link>
                        : <span className="text-sm font-medium text-black">{r.customer_name || '—'}</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-sm text-black">{r.product_name || r.contract_number || r.product_id || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-bodydark">{dueDate || '—'}</td>
                    <td className={`px-5 py-3.5 text-sm ${urgencyCls}`}>
                      {typeof daysLeft === 'number'
                        ? daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls}`}>
                        {(r.current_status || '—').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.customer_id && (
                        <Link to={`/customers/${r.customer_id}`} className="text-xs text-primary hover:underline">View</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

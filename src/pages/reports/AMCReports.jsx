import toast from 'react-hot-toast';

const MONTHLY = [
  { month: 'Apr 2026', expiring: 8,  renewed: 6,  revenue: '₹2,80,000', renewal_rate: '75%' },
  { month: 'Mar 2026', expiring: 12, renewed: 10, revenue: '₹4,20,000', renewal_rate: '83%' },
  { month: 'Feb 2026', expiring: 7,  renewed: 5,  revenue: '₹1,85,000', renewal_rate: '71%' },
  { month: 'Jan 2026', expiring: 15, renewed: 13, revenue: '₹5,10,000', renewal_rate: '87%' },
  { month: 'Dec 2025', expiring: 20, renewed: 16, revenue: '₹6,40,000', renewal_rate: '80%' },
];

const BY_PRODUCT = [
  { product: 'CCTV Surveillance', contracts: 18, value: '₹9,45,000' },
  { product: 'Access Control', contracts: 12, value: '₹6,20,000' },
  { product: 'Fire Alarm', contracts: 10, value: '₹4,80,000' },
  { product: 'HVAC System', contracts: 8, value: '₹7,20,000' },
  { product: 'UPS & Battery', contracts: 6, value: '₹2,40,000' },
];

export default function AMCReports() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">AMC Reports</h2>
          <p className="text-sm text-bodydark">Monthly summary of contract renewals and revenue</p>
        </div>
        <button onClick={() => toast.success('Exporting report…')} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">Export CSV</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Active AMCs', val: '54', cls: 'text-primary' },
          { label: 'Expiring This Month', val: '8', cls: 'text-meta-6' },
          { label: 'Renewal Rate (3M Avg)', val: '79%', cls: 'text-meta-3' },
          { label: 'Monthly AMC Revenue', val: '₹2.8L', cls: 'text-black' },
        ].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-5">
            <div className={`text-2xl font-bold mb-1 ${s.cls}`}>{s.val}</div>
            <div className="text-sm text-bodydark">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Monthly Renewal Trend</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Month', 'Expiring', 'Renewed', 'Revenue', 'Rate'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {MONTHLY.map(r => (
                <tr key={r.month} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm font-medium text-black">{r.month}</td>
                  <td className="px-5 py-3.5 text-sm text-meta-6 font-semibold">{r.expiring}</td>
                  <td className="px-5 py-3.5 text-sm text-meta-3 font-semibold">{r.renewed}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">{r.revenue}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${Number(r.renewal_rate) >= 80 ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-6/10 text-meta-6'}`}>
                      {r.renewal_rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Contracts by Product</h3>
          </div>
          <div className="p-5 space-y-3">
            {BY_PRODUCT.map(p => {
              const maxContracts = Math.max(...BY_PRODUCT.map(x => x.contracts));
              return (
                <div key={p.product}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-black font-medium">{p.product}</span>
                    <span className="text-bodydark">{p.contracts} contracts · {p.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-1 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(p.contracts / maxContracts) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

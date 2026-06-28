import toast from 'react-hot-toast';

const QUARTERLY = [
  { period: 'Q1 2026', leads: 120, converted: 35, rate: '29.2%', value: '₹18,50,000' },
  { period: 'Q4 2025', leads: 140, converted: 40, rate: '28.6%', value: '₹21,00,000' },
  { period: 'Q3 2025', leads: 90,  converted: 20, rate: '22.2%', value: '₹12,40,000' },
  { period: 'Q2 2025', leads: 105, converted: 28, rate: '26.7%', value: '₹15,80,000' },
];

const BY_SOURCE = [
  { source: 'Website', leads: 85, pct: '31%' },
  { source: 'Referral', leads: 72, pct: '26%' },
  { source: 'Cold Call', leads: 55, pct: '20%' },
  { source: 'Social Media', leads: 40, pct: '15%' },
  { source: 'Exhibition', leads: 23, pct: '8%' },
];

export default function LeadReports() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Lead Reports</h2>
          <p className="text-sm text-bodydark">Quarterly breakdown of lead volumes and conversions</p>
        </div>
        <button onClick={() => toast.success('Exporting report…')} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">Export CSV</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ label: 'Total Leads (Q1)', val: '120', cls: 'text-primary' }, { label: 'Converted', val: '35', cls: 'text-meta-3' }, { label: 'Conversion Rate', val: '29.2%', cls: 'text-meta-6' }, { label: 'Pipeline Value', val: '₹18.5L', cls: 'text-black' }].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-5">
            <div className={`text-2xl font-bold mb-1 ${s.cls}`}>{s.val}</div>
            <div className="text-sm text-bodydark">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Quarterly Performance</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Quarter', 'Total Leads', 'Converted', 'Rate', 'Pipeline Value'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {QUARTERLY.map(r => (
                <tr key={r.period} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm font-medium text-black">{r.period}</td>
                  <td className="px-5 py-3.5 text-sm text-black font-semibold">{r.leads}</td>
                  <td className="px-5 py-3.5 text-sm text-meta-3 font-semibold">{r.converted}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-meta-3/10 text-meta-3">{r.rate}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-black">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Leads by Source</h3>
          </div>
          <div className="p-5 space-y-3">
            {BY_SOURCE.map(s => (
              <div key={s.source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-black font-medium">{s.source}</span>
                  <span className="text-bodydark">{s.leads} leads · {s.pct}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-1 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: s.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

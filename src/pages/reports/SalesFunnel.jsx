import toast from 'react-hot-toast';

const STAGES = [
  { stage: 'New',         count: 120, pct: 100, value: '₹45,00,000', color: 'bg-primary' },
  { stage: 'Contacted',   count: 85,  pct: 71,  value: '₹32,00,000', color: 'bg-meta-5' },
  { stage: 'Qualified',   count: 40,  pct: 33,  value: '₹18,50,000', color: 'bg-meta-6' },
  { stage: 'Proposal',    count: 25,  pct: 21,  value: '₹12,00,000', color: 'bg-meta-8' },
  { stage: 'Negotiation', count: 18,  pct: 15,  value: '₹9,00,000',  color: 'bg-meta-6' },
  { stage: 'Won',         count: 15,  pct: 13,  value: '₹7,50,000',  color: 'bg-meta-3' },
  { stage: 'Lost',        count: 22,  pct: 18,  value: '—',          color: 'bg-meta-1' },
];

export default function SalesFunnel() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Sales Funnel</h2>
          <p className="text-sm text-bodydark">Lead drop-off rates across pipeline stages</p>
        </div>
        <button onClick={() => toast.success('Exporting report…')} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">Export CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Total Leads', val: '120', cls: 'text-primary' }, { label: 'Won Deals', val: '15 (12.5%)', cls: 'text-meta-3' }, { label: 'Avg Deal Size', val: '₹50,000', cls: 'text-black' }].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-5">
            <div className={`text-2xl font-bold mb-1 ${s.cls}`}>{s.val}</div>
            <div className="text-sm text-bodydark">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
          <h3 className="font-medium text-black mb-5">Funnel Visualization</h3>
          <div className="space-y-3">
            {STAGES.map(s => (
              <div key={s.stage}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-black">{s.stage}</span>
                  <span className="text-bodydark">{s.count} leads · {s.pct}%</span>
                </div>
                <div className="h-7 rounded bg-gray-1 overflow-hidden flex items-center">
                  <div className={`h-full rounded ${s.color} opacity-80 flex items-center justify-end pr-2 transition-all`} style={{ width: `${s.pct}%` }}>
                    <span className="text-xs font-bold text-white">{s.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Stage Summary</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-1">
              <tr>{['Stage', 'Count', '% of Total', 'Pipeline Value'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stroke">
              {STAGES.map(s => (
                <tr key={s.stage} className="hover:bg-gray-1">
                  <td className="px-5 py-3 text-sm font-medium text-black">{s.stage}</td>
                  <td className="px-5 py-3 text-sm font-bold text-black">{s.count}</td>
                  <td className="px-5 py-3 text-sm text-bodydark">{s.pct}%</td>
                  <td className="px-5 py-3 text-sm font-medium text-black">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

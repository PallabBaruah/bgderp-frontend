import toast from 'react-hot-toast';

const STOCK_SUMMARY = [
  { sku: 'CCTV-CAM-2MP', name: 'CCTV Camera 2MP Dome', category: 'Surveillance', opening: 35, received: 10, consumed: 3, closing: 42, value: '₹1,17,600' },
  { sku: 'DVR-8CH-FHD',  name: 'DVR 8 Channel Full HD', category: 'Surveillance', opening: 12, received: 5,  consumed: 2, closing: 15, value: '₹1,27,500' },
  { sku: 'AC-COMP-1.5T', name: 'AC Compressor 1.5 Ton', category: 'HVAC',         opening: 10, received: 0,  consumed: 2, closing: 8,  value: '₹52,000' },
  { sku: 'UPS-BATT-12V', name: 'UPS Battery 12V 7Ah',   category: 'Electrical',   opening: 5,  received: 0,  consumed: 5, closing: 0,  value: '₹0' },
  { sku: 'NET-SW-24PT',  name: 'Network Switch 24 Port', category: 'Networking',   opening: 8,  received: 0,  consumed: 2, closing: 6,  value: '₹72,000' },
];

const TOP_CONSUMED = [
  { product: 'RO Filter Cartridge 10"', qty: 18, reference: 'Service calls' },
  { product: 'CCTV Camera 2MP Dome',   qty: 12, reference: 'Installation + repair' },
  { product: 'UPS Battery 12V 7Ah',    qty: 10, reference: 'AMC visits' },
  { product: 'Smoke Detector',         qty: 8,  reference: 'Replacement' },
];

export default function InventoryReports() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Inventory Reports</h2>
          <p className="text-sm text-bodydark">Stock movement summary and valuation</p>
        </div>
        <button onClick={() => toast.success('Exporting report…')} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">Export CSV</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total SKUs', val: '7', cls: 'text-primary' },
          { label: 'Items Received (Apr)', val: '15', cls: 'text-meta-3' },
          { label: 'Items Consumed (Apr)', val: '14', cls: 'text-meta-6' },
          { label: 'Closing Stock Value', val: '₹3,69,100', cls: 'text-black' },
        ].map(s => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-5">
            <div className={`text-2xl font-bold mb-1 ${s.cls}`}>{s.val}</div>
            <div className="text-sm text-bodydark">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke">
          <h3 className="font-medium text-black">Stock Movement Summary — April 2026</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-1">
            <tr>{['SKU', 'Product', 'Category', 'Opening', 'Received', 'Consumed', 'Closing', 'Value'].map(h => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stroke">
            {STOCK_SUMMARY.map(s => (
              <tr key={s.sku} className="hover:bg-gray-1">
                <td className="px-5 py-3.5 font-mono text-xs text-primary">{s.sku}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-black">{s.name}</td>
                <td className="px-5 py-3.5 text-sm text-bodydark">{s.category}</td>
                <td className="px-5 py-3.5 text-sm text-bodydark">{s.opening}</td>
                <td className="px-5 py-3.5 text-sm text-meta-3 font-semibold">+{s.received}</td>
                <td className="px-5 py-3.5 text-sm text-meta-1 font-semibold">-{s.consumed}</td>
                <td className={`px-5 py-3.5 text-sm font-bold ${s.closing === 0 ? 'text-meta-1' : 'text-black'}`}>{s.closing}</td>
                <td className="px-5 py-3.5 text-sm font-semibold text-black">{s.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke">
          <h3 className="font-medium text-black">Top Consumed Items</h3>
        </div>
        <div className="p-5 space-y-3">
          {TOP_CONSUMED.map((item, i) => (
            <div key={item.product} className="flex items-center gap-4">
              <span className="text-lg font-bold text-bodydark w-6 text-right">{i + 1}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-black">{item.product}</div>
                <div className="text-xs text-bodydark">{item.reference}</div>
              </div>
              <span className="text-sm font-bold text-meta-1">{item.qty} units</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

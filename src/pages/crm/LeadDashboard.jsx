import ReactApexChart from 'react-apexcharts';
import { Link } from 'react-router-dom';

const FUNNEL_OPTIONS = {
  chart: { type: 'bar', toolbar: { show: false } },
  plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4, dataLabels: { position: 'bottom' } } },
  colors: ['#E2E8F0','#259AE6','#219653','#FFBA00','#F0950C','#3C50E0','#D34053'],
  xaxis: { categories: ['New','Contacted','Qualified','Proposal','Negotiation','Won','Lost'] },
  legend: { show: false },
  grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
  dataLabels: { enabled: true, textAnchor: 'start', style: { colors: ['#333A48'] }, formatter: (v) => v + ' leads', offsetX: 4 },
};

const SOURCE_OPTIONS = {
  chart: { type: 'donut', toolbar: { show: false } },
  labels: ['Website','LinkedIn','Referral','Cold Call','Email','Exhibition','Walk-in'],
  colors: ['#3C50E0','#259AE6','#219653','#FFBA00','#F0950C','#D34053','#637381'],
  legend: { position: 'bottom', fontSize: '12px' },
  dataLabels: { enabled: false },
  plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => '1,230' } } } } },
};

const TREND_OPTIONS = {
  chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
  stroke: { curve: 'smooth', width: [2,2,2] },
  xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
  colors: ['#3C50E0','#219653','#D34053'],
  legend: { position: 'top' },
  grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
  yaxis: { labels: { formatter: v => v + '' } },
};

export default function LeadDashboard() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Lead Dashboard</h2>
          <p className="text-sm text-bodydark">CRM pipeline overview and analytics</p>
        </div>
        <Link to="/crm/leads" className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">View All Leads</Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Leads', val: '1,842', delta: '+12% vs last month', color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Won This Month', val: '48', delta: '₹28.4L pipeline won', color: 'text-meta-3', bg: 'bg-meta-3/10' },
          { label: 'Conversion Rate', val: '12.4%', delta: '+1.2% vs last month', color: 'text-meta-3', bg: 'bg-meta-3/10' },
          { label: 'Avg. Deal Size', val: '₹2.8L', delta: '+8% vs Q1', color: 'text-meta-6', bg: 'bg-meta-6/10' },
          { label: 'Active Pipeline', val: '₹184L', delta: 'Across 148 leads', color: 'text-meta-5', bg: 'bg-meta-5/10' },
          { label: 'Avg. Close Time', val: '24 days', delta: '-3 days vs last month', color: 'text-meta-8', bg: 'bg-meta-8/10' },
          { label: 'Lost Leads', val: '84', delta: '6.8% of total', color: 'text-meta-1', bg: 'bg-meta-1/10' },
          { label: 'Follow-ups Due', val: '23', delta: '8 overdue today', color: 'text-meta-1', bg: 'bg-meta-1/10' },
        ].map((s) => (
          <div key={s.label} className="rounded-sm border border-stroke bg-white shadow-default p-5">
            <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.val}</div>
            <div className="text-xs font-medium text-black mb-0.5">{s.label}</div>
            <div className="text-[11px] text-bodydark">{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="px-6 py-4 border-b border-stroke">
            <h3 className="font-semibold text-black">Pipeline Funnel</h3>
            <p className="text-xs text-bodydark">Leads by current stage</p>
          </div>
          <div className="p-4">
            <ReactApexChart options={FUNNEL_OPTIONS} series={[{ data: [180, 280, 210, 160, 95, 48, 84] }]} type="bar" height={280} />
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="px-6 py-4 border-b border-stroke">
            <h3 className="font-semibold text-black">Leads by Source</h3>
            <p className="text-xs text-bodydark">Distribution across channels</p>
          </div>
          <div className="p-4">
            <ReactApexChart options={SOURCE_OPTIONS} series={[320, 280, 210, 180, 140, 70, 30]} type="donut" height={280} />
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="px-6 py-4 border-b border-stroke">
          <h3 className="font-semibold text-black">Lead Trend — FY 2024-25</h3>
          <p className="text-xs text-bodydark">New leads, Won, and Lost by month</p>
        </div>
        <div className="p-4">
          <ReactApexChart
            options={TREND_OPTIONS}
            series={[
              { name: 'New Leads', data: [120,145,130,160,158,175,190,165,180,170,185,210] },
              { name: 'Won', data: [28,35,31,42,38,45,50,40,48,44,52,55] },
              { name: 'Lost', data: [12,14,10,16,14,18,15,13,17,12,16,14] },
            ]}
            type="line"
            height={240}
          />
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="px-5 py-4 border-b border-stroke"><h3 className="font-medium text-black">Top Performers</h3></div>
          <div className="divide-y divide-stroke">
            {[
              { name: 'Amit Kumar', leads: 124, won: 22, value: '₹48.2L' },
              { name: 'Divya Nair', leads: 98, won: 18, value: '₹38.5L' },
              { name: 'Rahul Sharma', leads: 76, won: 12, value: '₹26.8L' },
              { name: 'Priya Singh', leads: 54, won: 8, value: '₹18.4L' },
            ].map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 px-5 py-3.5">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i+1}</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {p.name.split(' ').map(w=>w[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-black">{p.name}</div>
                  <div className="text-xs text-bodydark">{p.leads} leads · {p.won} won</div>
                </div>
                <div className="text-sm font-semibold text-meta-3">{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="px-5 py-4 border-b border-stroke"><h3 className="font-medium text-black">Hot Leads (Closing Soon)</h3></div>
          <div className="divide-y divide-stroke">
            {[
              { company: 'Tech Solutions Ltd', stage: 'Negotiation', value: '₹1.5L', days: 3 },
              { company: 'XYZ Corp', stage: 'Proposal', value: '₹4.8L', days: 5 },
              { company: 'CloudNine Systems', stage: 'Qualified', value: '₹5.4L', days: 7 },
            ].map((l) => (
              <div key={l.company} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium text-black">{l.company}</div>
                  <div className="text-xs text-bodydark">{l.stage}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">{l.value}</div>
                  <div className="text-xs text-meta-1">Close in ~{l.days}d</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

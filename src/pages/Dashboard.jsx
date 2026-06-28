import { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Link } from 'react-router-dom';
import { employeeApi, leadsApi, amcApi, serviceApi, leaveApi, payrollApi } from '../api/client';

const PRIORITY_COLOR = {
  high:   'bg-meta-1/10 text-meta-1',
  medium: 'bg-meta-6/10 text-meta-6',
  low:    'bg-meta-3/10 text-meta-3',
};

const STAGE_COLORS = ['#3C50E0', '#259AE6', '#219653', '#FFBA00', '#F0950C', '#D34053', '#6B7280'];
const STAGE_ORDER  = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const STAGE_LABEL  = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost', junk: 'Junk' };

const MONTHLY_REV_OPTIONS = {
  chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
  yaxis: { labels: { formatter: (v) => '₹' + (v / 100000).toFixed(0) + 'L' } },
  colors: ['#3C50E0', '#219653'],
  legend: { position: 'top' },
  grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
  tooltip: { y: { formatter: (v) => '₹' + v.toLocaleString() } },
};
const MONTHLY_REV_SERIES = [
  { name: 'Revenue',    data: [820000,950000,890000,1100000,1050000,1200000,1380000,1250000,1420000,1180000,1350000,1580000] },
  { name: 'Collection', data: [750000,870000,820000,980000,960000,1100000,1250000,1150000,1310000,1080000,1240000,1450000] },
];

const ATTENDANCE_OPTIONS = {
  chart: { type: 'bar', toolbar: { show: false } },
  plotOptions: { bar: { columnWidth: '60%', borderRadius: 4 } },
  colors: ['#219653', '#D34053', '#FFBA00'],
  xaxis: { categories: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  legend: { position: 'top' },
  grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
};
const ATTENDANCE_SERIES = [
  { name: 'Present', data: [230,235,228,240,226,84] },
  { name: 'Absent',  data: [18,13,20,8,22,15] },
  { name: 'Late',    data: [12,15,8,14,10,5] },
];

export default function Dashboard() {
  const [stats, setStats]             = useState(null);
  const [stageSeries, setStageSeries] = useState([]);
  const [stageLabels, setStageLabels] = useState([]);
  const [activities, setActivities]   = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [empR, leadsR, amcR, ticketR, leaveR, payrollR] = await Promise.allSettled([
        employeeApi.list({ limit: 1, is_active: true }),
        leadsApi.list({ limit: 200 }),
        amcApi.list({ limit: 200 }),
        serviceApi.list({ limit: 50 }),
        leaveApi.requests({ status: 'pending' }),
        payrollApi.runs(),
      ]);

      // ── Employees ──────────────────────────────────────────────────────────
      const totalEmp = empR.status === 'fulfilled'
        ? (empR.value.data?.total ?? empR.value.data?.items?.length ?? 0) : 0;

      // ── Leads ──────────────────────────────────────────────────────────────
      const allLeads = leadsR.status === 'fulfilled'
        ? (leadsR.value.data?.results ?? leadsR.value.data ?? []) : [];
      const totalLeads = leadsR.status === 'fulfilled'
        ? (leadsR.value.data?.total ?? allLeads.length) : 0;

      const stageCounts = {};
      allLeads.forEach(l => { const s = l.status || 'new'; stageCounts[s] = (stageCounts[s] || 0) + 1; });
      const orderedStages = [...STAGE_ORDER, ...Object.keys(stageCounts).filter(k => !STAGE_ORDER.includes(k))].filter(s => stageCounts[s]);
      setStageSeries(orderedStages.map(s => stageCounts[s]));
      setStageLabels(orderedStages.map(s => STAGE_LABEL[s] || s));

      // ── AMC ────────────────────────────────────────────────────────────────
      const allAmc = amcR.status === 'fulfilled'
        ? (amcR.value.data?.results ?? amcR.value.data?.items ?? amcR.value.data ?? []) : [];
      const activeAmc   = allAmc.filter(c => c.status === 'active').length;
      const today       = new Date();
      const in30        = new Date(today.getTime() + 30 * 86400000);
      const expiringAmc = allAmc.filter(c => { const e = new Date(c.end || c.end_date); return e >= today && e <= in30; }).length;

      // ── Tickets ────────────────────────────────────────────────────────────
      const allTickets = ticketR.status === 'fulfilled'
        ? (ticketR.value.data?.results ?? ticketR.value.data?.items ?? ticketR.value.data ?? []) : [];
      const openTickets = allTickets.filter(t => ['open','pending','in_progress'].includes(t.status)).length;
      const overdueTickets = allTickets.filter(t => {
        if (t.status === 'closed' || t.status === 'resolved') return false;
        return t.due_date && new Date(t.due_date) < today;
      }).length;
      const unassignedTickets = allTickets.filter(t => !t.assigned_to && t.status !== 'closed').length;

      // ── Leaves ────────────────────────────────────────────────────────────
      const pendingLeaves = leaveR.status === 'fulfilled'
        ? (Array.isArray(leaveR.value.data) ? leaveR.value.data.length : 0) : 0;

      // ── Payroll ───────────────────────────────────────────────────────────
      const payrollRuns = payrollR.status === 'fulfilled'
        ? (payrollR.value.data ?? []) : [];
      const pendingPayroll = payrollRuns.filter(r => ['draft','processing'].includes(r.status)).length;

      setStats({ totalEmp, totalLeads, activeAmc, expiringAmc, openTickets, overdueTickets, pendingLeaves, pendingPayroll });

      // ── Recent Activity ───────────────────────────────────────────────────
      const acts = [];
      allLeads.slice(0, 3).forEach(l => acts.push({
        type: 'lead', msg: `Lead "${l.company || l.name}" — ${l.status || 'new'}`,
        time: fmtTime(l.created_at),
      }));
      allTickets.slice(0, 3).forEach(t => acts.push({
        type: 'ticket', msg: `Ticket #${t.ticket_number || t.id?.slice(0,8)} — ${t.issue_description?.slice(0, 50) || t.status}`,
        time: fmtTime(t.created_at),
      }));
      allAmc.slice(0, 2).forEach(c => acts.push({
        type: 'contract', msg: `AMC ${c.contract_no || c.contract_number} — ${c.customer || c.customer_name}`,
        time: fmtTime(c.created_at),
      }));
      acts.sort((a, b) => (b._ts || 0) - (a._ts || 0));
      setActivities(acts.slice(0, 6));

      // ── Pending Tasks ─────────────────────────────────────────────────────
      const tasks = [];
      if (pendingLeaves > 0) tasks.push({ task: `Approve ${pendingLeaves} pending leave request${pendingLeaves > 1 ? 's' : ''}`, module: 'HRMS', priority: 'high', link: '/hrm/leave' });
      if (pendingPayroll > 0) tasks.push({ task: `${pendingPayroll} payroll run${pendingPayroll > 1 ? 's' : ''} pending`, module: 'Payroll', priority: 'high', link: '/hrm/payroll' });
      if (expiringAmc > 0) tasks.push({ task: `${expiringAmc} AMC contract${expiringAmc > 1 ? 's' : ''} expiring in 30 days`, module: 'AMC', priority: 'high', link: '/amc/contracts' });
      if (unassignedTickets > 0) tasks.push({ task: `${unassignedTickets} unassigned service ticket${unassignedTickets > 1 ? 's' : ''}`, module: 'Service', priority: 'medium', link: '/amc/tickets' });
      if (overdueTickets > 0) tasks.push({ task: `${overdueTickets} overdue ticket${overdueTickets > 1 ? 's' : ''}`, module: 'Service', priority: 'high', link: '/amc/tickets' });
      if (tasks.length === 0) tasks.push({ task: 'All caught up — no pending actions', module: 'System', priority: 'low', link: '/' });
      setPendingTasks(tasks);
    } catch (e) {
      console.error('Dashboard load error', e);
    } finally {
      setLoading(false);
    }
  }

  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
    return Math.floor(diff / 86400) + ' day(s) ago';
  }

  const donutOptions = {
    chart: { type: 'donut', toolbar: { show: false } },
    labels: stageLabels,
    colors: STAGE_COLORS.slice(0, stageLabels.length),
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, formatter: (val) => val.toFixed(1) + '%' },
    plotOptions: { pie: { donut: { size: '65%' } } },
    noData: { text: 'No lead data' },
  };

  const TYPE_META = {
    lead:     { color: 'bg-primary/10 text-primary',   label: 'Lead' },
    ticket:   { color: 'bg-meta-1/10 text-meta-1',     label: 'Ticket' },
    contract: { color: 'bg-meta-3/10 text-meta-3',     label: 'Contract' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Employees" value={stats?.totalEmp ?? '—'} delta="Active headcount" up={true} color="bg-primary/10 text-primary" icon={<IconUsers />} />
        <StatCard label="Active Leads" value={stats?.totalLeads ?? '—'} delta="In pipeline" up={true} color="bg-meta-3/10 text-meta-3" icon={<IconChart />} />
        <StatCard label="AMC Contracts" value={stats?.activeAmc ?? '—'} delta={stats?.expiringAmc ? `${stats.expiringAmc} expiring soon` : 'Active contracts'} up={!stats?.expiringAmc} color="bg-meta-6/10 text-meta-6" icon={<IconDocument />} />
        <StatCard label="Open Tickets" value={stats?.openTickets ?? '—'} delta={stats?.overdueTickets ? `${stats.overdueTickets} overdue` : 'All on track'} up={!stats?.overdueTickets} color="bg-meta-1/10 text-meta-1" icon={<IconTicket />} />
        <StatCard label="Pending Leaves" value={stats?.pendingLeaves ?? '—'} delta="Needs approval" up={false} color="bg-meta-5/10 text-meta-5" icon={<IconCalendar />} />
        <StatCard label="Payroll Runs" value={stats?.pendingPayroll ?? '—'} delta={stats?.pendingPayroll ? 'Pending action' : 'All processed'} up={!stats?.pendingPayroll} color="bg-meta-8/10 text-meta-8" icon={<IconBanknotes />} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-sm border border-stroke bg-white shadow-default">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
            <div>
              <h3 className="font-semibold text-black">Revenue vs Collection</h3>
              <p className="text-xs text-bodydark">Monthly trend — FY 2024-25</p>
            </div>
          </div>
          <div className="px-4 py-4">
            <ReactApexChart options={MONTHLY_REV_OPTIONS} series={MONTHLY_REV_SERIES} type="area" height={260} />
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="px-6 py-4 border-b border-stroke">
            <h3 className="font-semibold text-black">Leads by Stage</h3>
            <p className="text-xs text-bodydark">Current pipeline distribution</p>
          </div>
          <div className="px-4 py-4">
            {stageSeries.length > 0
              ? <ReactApexChart options={donutOptions} series={stageSeries} type="donut" height={260} />
              : <div className="flex items-center justify-center h-64 text-sm text-bodydark">No lead data</div>
            }
          </div>
        </div>
      </div>

      {/* Attendance + Pending Tasks */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
            <div>
              <h3 className="font-semibold text-black">Weekly Attendance</h3>
              <p className="text-xs text-bodydark">This week breakdown</p>
            </div>
            <Link to="/hrm/attendance" className="text-xs text-primary hover:underline">Full Report →</Link>
          </div>
          <div className="px-4 py-4">
            <ReactApexChart options={ATTENDANCE_OPTIONS} series={ATTENDANCE_SERIES} type="bar" height={220} />
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
            <h3 className="font-semibold text-black">Pending Actions</h3>
            <span className="inline-flex items-center rounded-full bg-meta-1/10 px-2.5 py-0.5 text-xs font-medium text-meta-1">
              {pendingTasks.filter(t => t.priority === 'high').length} urgent
            </span>
          </div>
          <div className="divide-y divide-stroke">
            {pendingTasks.map((t, i) => (
              <Link key={i} to={t.link} className="flex items-start gap-3 px-6 py-3.5 hover:bg-gray-1 transition-colors">
                <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${PRIORITY_COLOR[t.priority]}`}>
                  {t.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black leading-snug">{t.task}</p>
                  <p className="text-xs text-bodydark mt-0.5">{t.module}</p>
                </div>
                <svg className="w-4 h-4 text-bodydark flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
          <h3 className="font-semibold text-black">Recent Activity</h3>
        </div>
        {activities.length === 0
          ? <div className="px-6 py-8 text-sm text-bodydark text-center">No recent activity</div>
          : (
          <div className="divide-y divide-stroke">
            {activities.map((a, i) => {
              const meta = TYPE_META[a.type] || { color: 'bg-gray-100 text-gray-500', label: a.type };
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap flex-shrink-0 ${meta.color}`}>
                    {meta.label}
                  </span>
                  <p className="flex-1 text-sm text-black">{a.msg}</p>
                  <span className="text-xs text-bodydark whitespace-nowrap">{a.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, up, color, icon }) {
  return (
    <div className="rounded-sm border border-stroke bg-white p-5 shadow-default">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
        <span className="w-5 h-5">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-black mb-1">{value}</div>
      <div className="text-xs text-bodydark mb-1">{label}</div>
      <div className={`text-[11px] font-medium ${up ? 'text-meta-3' : 'text-meta-1'}`}>{delta}</div>
    </div>
  );
}

function IconUsers() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function IconChart() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconDocument() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function IconTicket() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6M2 15a3 3 0 000 6h20a3 3 0 000-6"/></svg>; }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconBanknotes() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>; }

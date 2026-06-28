import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const NAV_GROUPS = [
  {
    label: 'MAIN',
    items: [
      { to: '/', label: 'Dashboard', exact: true, icon: <IconDashboard /> },
    ],
  },
  {
    label: 'HRM',
    items: [
      { to: '/hrm/employees', label: 'Employees', icon: <IconUsers /> },
      { to: '/hrm/attendance', label: 'Attendance', icon: <IconClock /> },
      { to: '/hrm/leave', label: 'Leave', icon: <IconCalendar /> },
      { to: '/hrm/payroll', label: 'Payroll', icon: <IconBanknotes /> },
      { to: '/hrm/salary-config', label: 'Salary Config', icon: <IconSliders /> },
      { to: '/notice-board', label: 'Notice Board', icon: <IconMegaphone /> },
    ],
  },
  {
    label: 'CRM',
    items: [
      { to: '/crm/dashboard', label: 'Lead Dashboard', icon: <IconChart /> },
      { to: '/crm/leads', label: 'All Leads', icon: <IconUsers /> },
      { to: '/crm/kanban', label: 'Kanban Pipeline', icon: <IconKanban /> },
      { to: '/crm/follow-ups', label: 'Follow-ups', icon: <IconClock /> },
      { to: '/crm/activities', label: 'Activities', icon: <IconActivity /> },
    ],
  },
  {
    label: 'CUSTOMERS',
    items: [
      { to: '/customers', label: 'All Customers', icon: <IconUsers /> },
    ],
  },
  {
    label: 'AMC & SERVICE',
    items: [
      { to: '/amc/contracts', label: 'Contracts', icon: <IconDocument /> },
      { to: '/amc/visits', label: 'Scheduled Visits', icon: <IconCalendar /> },
      { to: '/amc/tickets', label: 'Service Tickets', icon: <IconTicket /> },
      { to: '/amc/renewals', label: 'AMC Renewals', icon: <IconRefresh /> },
    ],
  },
  {
    label: 'SALES',
    items: [
      { to: '/sales/quotations', label: 'Quotations', icon: <IconDocument /> },
      { to: '/sales/pi', label: 'Proforma Invoice', icon: <IconDocument /> },
      { to: '/sales/invoices', label: 'Sales Invoices', icon: <IconCart /> },
      { to: '/sales/challans', label: 'Delivery Challan', icon: <IconBox /> },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/ops/products', label: 'Product Master', icon: <IconBox /> },
      { to: '/ops/services', label: 'Service Master', icon: <IconBox /> },
      { to: '/sales/inventory', label: 'Stock', icon: <IconWarehouse /> },
      { to: '/ops/vendors', label: 'Vendors', icon: <IconBuilding /> },
      { to: '/ops/purchase-orders', label: 'Purchase Orders', icon: <IconCart /> },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { to: '/reports/leads', label: 'Lead Reports', icon: <IconChart /> },
      { to: '/reports/sales-funnel', label: 'Sales Funnel', icon: <IconFunnel /> },
      { to: '/reports/amc', label: 'AMC Reports', icon: <IconChart /> },
      { to: '/reports/inventory', label: 'Inventory Reports', icon: <IconChart /> },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { to: '/settings/leads', label: 'Lead Settings', icon: <IconCog /> },
      { to: '/settings/amc', label: 'AMC Settings', icon: <IconCog /> },
      { to: '/settings/po', label: 'PO Settings', icon: <IconCog /> },
      { to: '/settings/document-series', label: 'Document Numbering', icon: <IconCog /> },
      { to: '/settings/gst-config', label: 'GST Tax Rates', icon: <IconCog /> },
      { to: '/settings/reminders', label: 'Lifecycle Reminders', icon: <IconCog /> },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { to: '/settings/organisation', label: 'Portal Settings', icon: <IconCog /> },
      { to: '/settings/office-locations', label: 'Office Locations', icon: <IconLocation /> },
    ],
  },
];

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const { user, roles, tenant, tenantProfile, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (label) =>
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }));

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[998] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[999] flex h-screen w-[290px] flex-col bg-boxdark duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-strokedark">
          <div className="flex items-center gap-3 min-w-0">
            {tenantProfile?.logo_url ? (
              <img
                src={tenantProfile.logo_url}
                alt="org logo"
                className="h-9 w-9 rounded object-contain flex-shrink-0 bg-white/10 p-0.5"
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white tracking-tight truncate leading-tight">
                {tenantProfile?.name || 'NexaERP'}
              </h1>
              <p className="text-[10px] text-bodydark-2 uppercase tracking-widest truncate">
                {tenant || 'workspace'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-bodydark-1 hover:text-white"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="no-scrollbar flex flex-col overflow-y-auto flex-1 py-4 px-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <h3 className="mb-2 ml-3 text-[10px] font-semibold uppercase tracking-widest text-bodydark-2">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ to, label, icon, exact }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={exact}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-bodydark-1 hover:bg-boxdark-2 hover:text-white'
                        }`
                      }
                    >
                      <span className="w-4 h-4 flex-shrink-0 opacity-80">{icon}</span>
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-strokedark">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-bodydark-1 hover:bg-boxdark-2 hover:text-white transition-colors"
            title="Logout"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold text-white truncate">
                {user?.full_name || 'User'}
              </div>
              <div className="text-xs text-bodydark-2 truncate">
                {roles?.[0] || 'Member'} · Logout
              </div>
            </div>
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function IconDashboard() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function IconUsers() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IconClock() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function IconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IconBanknotes() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;
}
function IconMegaphone() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>;
}
function IconSliders() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
}
function IconChart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function IconKanban() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>;
}
function IconActivity() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function IconCog() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IconDocument() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function IconTicket() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6M2 15a3 3 0 000 6h20a3 3 0 000-6"/><line x1="12" y1="3" x2="12" y2="21"/></svg>;
}
function IconRefresh() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>;
}
function IconBox() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
function IconBuilding() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect x="2" y="7" width="20" height="15"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 12v5M8 12v1M16 12v1"/></svg>;
}
function IconCart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
}
function IconWarehouse() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconFunnel() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
}
function IconLocation() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>;
}

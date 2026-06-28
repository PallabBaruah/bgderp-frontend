import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/hrm/employees': 'Employees',
  '/hrm/attendance': 'Attendance',
  '/hrm/leave': 'Leave Management',
  '/hrm/payroll': 'Payroll',
  '/notice-board': 'Notice Board',
  '/crm/dashboard': 'Lead Dashboard',
  '/crm/leads': 'All Leads',
  '/crm/kanban': 'Kanban Pipeline',
  '/crm/follow-ups': 'Follow-ups',
  '/crm/activities': 'Activities',
  '/customers': 'Customers',
  '/amc/contracts': 'AMC Contracts',
  '/amc/visits': 'Scheduled Visits',
  '/amc/tickets': 'Service Tickets',
  '/amc/renewals': 'AMC Renewals',
  '/ops/products': 'Products',
  '/ops/vendors': 'Vendors',
  '/ops/purchase-orders': 'Purchase Orders',
  '/ops/inventory': 'Inventory',
  '/reports/leads': 'Lead Reports',
  '/reports/sales-funnel': 'Sales Funnel',
  '/reports/amc': 'AMC Reports',
  '/reports/inventory': 'Inventory Reports',
  '/settings/leads': 'Lead Settings',
  '/settings/amc': 'AMC Settings',
  '/settings/po': 'PO Settings',
  '/settings/document-series': 'Document Numbering',
};

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'leaves', message: 'John Doe applied for Annual Leave', time: '5 min ago', read: false },
  { id: 2, type: 'ticket', message: 'Service Ticket #TKT-042 assigned to you', time: '12 min ago', read: false },
  { id: 3, type: 'contract', message: 'AMC Contract #AMC-007 expiring in 7 days', time: '1 hr ago', read: false },
  { id: 4, type: 'po', message: 'Purchase Order #PO-019 approved', time: '2 hrs ago', read: true },
  { id: 5, type: 'lead', message: 'New lead assigned: ABC Technologies', time: '3 hrs ago', read: true },
];

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const title = ROUTE_TITLES[pathname] || 'NexaERP';
  const unread = notifications.filter((n) => !n.read).length;

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));

  return (
    <header className="sticky top-0 z-[99] flex w-full bg-white border-b border-stroke shadow-default">
      <div className="flex flex-grow items-center justify-between px-4 py-3 md:px-6">
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-stroke bg-white text-bodydark hover:bg-gray-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold text-black">{title}</h1>
            <Breadcrumb pathname={pathname} />
          </div>
        </div>

        {/* Right: search, notifications, profile */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 rounded-md border border-stroke bg-gray-1 px-3 py-2 text-sm text-bodydark">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none text-sm w-44 placeholder:text-bodydark-2"
            />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-stroke bg-gray-1 text-bodydark hover:bg-gray-2 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-meta-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-md border border-stroke bg-white shadow-card z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-stroke">
                  <h4 className="font-semibold text-sm text-black">Notifications</h4>
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 border-b border-stroke last:border-0 hover:bg-gray-1 cursor-pointer ${!n.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-black leading-relaxed">{n.message}</p>
                        <p className="text-[11px] text-bodydark mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 text-center border-t border-stroke">
                  <button className="text-xs text-primary hover:underline">View all notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-full border border-stroke bg-gray-1 pl-1 pr-3 py-1 hover:bg-gray-2 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium text-black max-w-[120px] truncate">
                {user?.full_name || 'User'}
              </span>
              <svg className="w-3.5 h-3.5 text-bodydark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-md border border-stroke bg-white shadow-card z-50">
                <div className="px-4 py-3 border-b border-stroke">
                  <p className="text-sm font-semibold text-black">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-bodydark">{user?.email || ''}</p>
                </div>
                <div className="py-1">
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-gray-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    Settings
                  </Link>
                  <button
                    onClick={() => { logout(); window.location.href = '/login'; }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-meta-1 hover:bg-gray-1"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Breadcrumb({ pathname }) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <nav className="flex items-center gap-1 text-xs text-bodydark mt-0.5">
      <span>Home</span>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>/</span>
          <span className={i === parts.length - 1 ? 'text-primary font-medium' : ''}>
            {part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </span>
      ))}
    </nav>
  );
}

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { tenantApi } from './api/client';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// HRM
import Employees from './pages/hrm/Employees';
import EmployeeDetail from './pages/hrm/EmployeeDetail';
import Attendance from './pages/hrm/Attendance';
import LeaveManagement from './pages/hrm/LeaveManagement';
import Payroll from './pages/hrm/Payroll';
import PayrollDetail from './pages/hrm/PayrollDetail';
import OrgChart from './pages/hrm/OrgChart';
import SalaryConfig from './pages/SalaryConfig';
import NoticeBoard from './pages/NoticeBoard';

// CRM
import LeadDashboard from './pages/crm/LeadDashboard';
import AllLeads from './pages/crm/AllLeads';
import LeadKanban from './pages/crm/KanbanPipeline';
import LeadDetail from './pages/crm/LeadDetail';
import Followups from './pages/crm/Followups';
import Activities from './pages/crm/Activities';

// Customers
import Customers from './pages/customers/Customers';
import CustomerDetail from './pages/customers/CustomerDetail';

// AMC
import Contracts from './pages/amc/Contracts';
import ContractDetail from './pages/amc/ContractDetail';
import ScheduledVisits from './pages/amc/ScheduledVisits';
import ServiceTickets from './pages/amc/ServiceTickets';
import TicketDetail from './pages/amc/TicketDetail';
import AMCRenewals from './pages/amc/AMCRenewals';

// Operations
import Products from './pages/ops/Products';
import Services from './pages/ops/Services';
import Vendors from './pages/ops/Vendors';
import PurchaseOrders from './pages/ops/PurchaseOrders';
import PODetail from './pages/ops/PODetail';

// Reports
import LeadReports from './pages/reports/LeadReports';
import SalesFunnel from './pages/reports/SalesFunnel';
import AMCReports from './pages/reports/AMCReports';
import InventoryReports from './pages/reports/InventoryReports';

// Sales
import Quotations from './pages/sales/Quotations';
import ProformaInvoices from './pages/sales/ProformaInvoices';
import SalesInvoices from './pages/sales/SalesInvoices';
import DeliveryChallans from './pages/sales/DeliveryChallans';
import SalesInventory from './pages/sales/Inventory';
import DocumentForm from './pages/sales/DocumentForm';
import QuotationFormPage from './pages/sales/QuotationFormPage';
import PIFormPage from './pages/sales/PIFormPage';
import InvoiceFormPage from './pages/sales/InvoiceFormPage';

// Settings
import LeadSettings from './pages/settings/LeadSettings';
import AMCSettings from './pages/settings/AMCSettings';
import POSettings from './pages/settings/POSettings';
import TenantConfig from './pages/settings/TenantConfig';
import OfficeLocations from './pages/settings/OfficeLocations';
import DocumentSeries from './pages/settings/DocumentSeries';
import GSTConfig from './pages/settings/GSTConfig';
import ReminderSettings from './pages/settings/ReminderSettings';
import Settings from './pages/Settings';

function EmployeeGuard({ children }) {
  const { roles } = useAuthStore();
  const isEmployee = roles?.length === 1 && roles[0] === 'Employee';
  if (!isEmployee) return children;
  // employees hit a restricted route → send home
  return <Navigate to="/" replace />;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* HRM — attendance & leave open to all; rest employee-restricted */}
            <Route path="/hrm/attendance" element={<Attendance />} />
            <Route path="/hrm/leave" element={<LeaveManagement />} />
            <Route path="/notice-board" element={<NoticeBoard />} />
            <Route path="/hrm/employees" element={<EmployeeGuard><Employees /></EmployeeGuard>} />
            <Route path="/hrm/employees/:id" element={<EmployeeGuard><EmployeeDetail /></EmployeeGuard>} />
            <Route path="/hrm/employees/org-chart" element={<EmployeeGuard><OrgChart /></EmployeeGuard>} />
            <Route path="/hrm/payroll" element={<EmployeeGuard><Payroll /></EmployeeGuard>} />
            <Route path="/hrm/payroll/:id" element={<EmployeeGuard><PayrollDetail /></EmployeeGuard>} />
            <Route path="/hrm/salary-config" element={<EmployeeGuard><SalaryConfig /></EmployeeGuard>} />

            {/* Legacy HRM routes → redirect */}
            <Route path="/employees" element={<Navigate to="/hrm/employees" replace />} />
            <Route path="/attendance" element={<Navigate to="/hrm/attendance" replace />} />
            <Route path="/leave" element={<Navigate to="/hrm/leave" replace />} />
            <Route path="/payroll" element={<Navigate to="/hrm/payroll" replace />} />

            {/* CRM — open to employees (pages self-filter) */}
            <Route path="/crm/dashboard" element={<LeadDashboard />} />
            <Route path="/crm/leads" element={<AllLeads />} />
            <Route path="/crm/leads/:id" element={<LeadDetail />} />
            <Route path="/crm/kanban" element={<LeadKanban />} />
            <Route path="/crm/follow-ups" element={<Followups />} />
            <Route path="/crm/activities" element={<Activities />} />

            {/* Customers — employee-restricted (no employee-specific relation) */}
            <Route path="/customers" element={<EmployeeGuard><Customers /></EmployeeGuard>} />
            <Route path="/customers/:id" element={<EmployeeGuard><CustomerDetail /></EmployeeGuard>} />

            {/* AMC — employee-restricted */}
            <Route path="/amc/contracts" element={<EmployeeGuard><Contracts /></EmployeeGuard>} />
            <Route path="/amc/contracts/:id" element={<EmployeeGuard><ContractDetail /></EmployeeGuard>} />
            <Route path="/amc/visits" element={<EmployeeGuard><ScheduledVisits /></EmployeeGuard>} />
            <Route path="/amc/tickets" element={<EmployeeGuard><ServiceTickets /></EmployeeGuard>} />
            <Route path="/amc/tickets/:id" element={<EmployeeGuard><TicketDetail /></EmployeeGuard>} />
            <Route path="/amc/renewals" element={<EmployeeGuard><AMCRenewals /></EmployeeGuard>} />

            {/* Operations — employee-restricted */}
            <Route path="/ops/products" element={<EmployeeGuard><Products /></EmployeeGuard>} />
            <Route path="/ops/services" element={<EmployeeGuard><Services /></EmployeeGuard>} />
            <Route path="/ops/vendors" element={<EmployeeGuard><Vendors /></EmployeeGuard>} />
            <Route path="/ops/purchase-orders" element={<EmployeeGuard><PurchaseOrders /></EmployeeGuard>} />
            <Route path="/ops/purchase-orders/:id" element={<EmployeeGuard><PODetail /></EmployeeGuard>} />

            {/* Sales — open to employees (pages self-filter; write actions hidden for employees) */}
            <Route path="/sales/quotations" element={<Quotations />} />
            <Route path="/sales/quotations/new" element={<EmployeeGuard><QuotationFormPage /></EmployeeGuard>} />
            <Route path="/sales/quotations/:id" element={<QuotationFormPage />} />
            <Route path="/sales/quotations/:id/edit" element={<EmployeeGuard><QuotationFormPage /></EmployeeGuard>} />
            <Route path="/sales/pi" element={<ProformaInvoices />} />
            <Route path="/sales/pi/new" element={<EmployeeGuard><PIFormPage /></EmployeeGuard>} />
            <Route path="/sales/pi/:id/edit" element={<EmployeeGuard><PIFormPage /></EmployeeGuard>} />
            <Route path="/sales/invoices" element={<SalesInvoices />} />
            <Route path="/sales/invoices/new" element={<EmployeeGuard><InvoiceFormPage /></EmployeeGuard>} />
            <Route path="/sales/invoices/:id" element={<InvoiceFormPage />} />
            <Route path="/sales/invoices/:id/edit" element={<EmployeeGuard><InvoiceFormPage /></EmployeeGuard>} />
            <Route path="/sales/challans" element={<DeliveryChallans />} />
            <Route path="/sales/challans/new" element={<EmployeeGuard><DocumentForm docType="challan" /></EmployeeGuard>} />
            <Route path="/sales/inventory" element={<EmployeeGuard><SalesInventory /></EmployeeGuard>} />

            {/* Reports — employee-restricted */}
            <Route path="/reports/leads" element={<EmployeeGuard><LeadReports /></EmployeeGuard>} />
            <Route path="/reports/sales-funnel" element={<EmployeeGuard><SalesFunnel /></EmployeeGuard>} />
            <Route path="/reports/amc" element={<EmployeeGuard><AMCReports /></EmployeeGuard>} />
            <Route path="/reports/inventory" element={<EmployeeGuard><InventoryReports /></EmployeeGuard>} />

            {/* Settings — employee-restricted */}
            <Route path="/settings" element={<EmployeeGuard><Settings /></EmployeeGuard>} />
            <Route path="/settings/leads" element={<EmployeeGuard><LeadSettings /></EmployeeGuard>} />
            <Route path="/settings/amc" element={<EmployeeGuard><AMCSettings /></EmployeeGuard>} />
            <Route path="/settings/po" element={<EmployeeGuard><POSettings /></EmployeeGuard>} />
            <Route path="/settings/organisation" element={<EmployeeGuard><TenantConfig /></EmployeeGuard>} />
            <Route path="/settings/office-locations" element={<EmployeeGuard><OfficeLocations /></EmployeeGuard>} />
            <Route path="/settings/document-series" element={<EmployeeGuard><DocumentSeries /></EmployeeGuard>} />
            <Route path="/settings/gst-config" element={<EmployeeGuard><GSTConfig /></EmployeeGuard>} />
            <Route path="/settings/reminders" element={<EmployeeGuard><ReminderSettings /></EmployeeGuard>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function applyPrimaryColor(color) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--color-primary-dark', color);
  root.style.setProperty('--color-brand-500', color);
}

export default function App() {
  const { token, setTenantProfile, tenantProfile } = useAuthStore();

  useEffect(() => {
    if (token) {
      tenantApi.getProfile().then(r => {
        setTenantProfile(r.data);
        applyPrimaryColor(r.data.primary_color);
      }).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    applyPrimaryColor(tenantProfile?.primary_color);
  }, [tenantProfile?.primary_color]);

  useEffect(() => {
    if (tenantProfile?.name) document.title = tenantProfile.name;
    if (tenantProfile?.logo_url) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = tenantProfile.logo_url;
    }
  }, [tenantProfile?.name, tenantProfile?.logo_url]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', fontSize: 13, borderRadius: 6 },
          success: { iconTheme: { primary: '#219653', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#D34053', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/*" element={token ? <AppLayout /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

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

            {/* HRM */}
            <Route path="/hrm/employees" element={<Employees />} />
            <Route path="/hrm/employees/:id" element={<EmployeeDetail />} />
            <Route path="/hrm/employees/org-chart" element={<OrgChart />} />
            <Route path="/hrm/attendance" element={<Attendance />} />
            <Route path="/hrm/leave" element={<LeaveManagement />} />
            <Route path="/hrm/payroll" element={<Payroll />} />
            <Route path="/hrm/payroll/:id" element={<PayrollDetail />} />
            <Route path="/hrm/salary-config" element={<SalaryConfig />} />
            <Route path="/notice-board" element={<NoticeBoard />} />

            {/* Legacy HRM routes → redirect */}
            <Route path="/employees" element={<Navigate to="/hrm/employees" replace />} />
            <Route path="/attendance" element={<Navigate to="/hrm/attendance" replace />} />
            <Route path="/leave" element={<Navigate to="/hrm/leave" replace />} />
            <Route path="/payroll" element={<Navigate to="/hrm/payroll" replace />} />

            {/* CRM */}
            <Route path="/crm/dashboard" element={<LeadDashboard />} />
            <Route path="/crm/leads" element={<AllLeads />} />
            <Route path="/crm/leads/:id" element={<LeadDetail />} />
            <Route path="/crm/kanban" element={<LeadKanban />} />
            <Route path="/crm/follow-ups" element={<Followups />} />
            <Route path="/crm/activities" element={<Activities />} />

            {/* Customers */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />

            {/* AMC */}
            <Route path="/amc/contracts" element={<Contracts />} />
            <Route path="/amc/contracts/:id" element={<ContractDetail />} />
            <Route path="/amc/visits" element={<ScheduledVisits />} />
            <Route path="/amc/tickets" element={<ServiceTickets />} />
            <Route path="/amc/tickets/:id" element={<TicketDetail />} />
            <Route path="/amc/renewals" element={<AMCRenewals />} />

            {/* Operations */}
            <Route path="/ops/products" element={<Products />} />
            <Route path="/ops/services" element={<Services />} />
            <Route path="/ops/vendors" element={<Vendors />} />
            <Route path="/ops/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/ops/purchase-orders/:id" element={<PODetail />} />

            {/* Sales */}
            <Route path="/sales/quotations" element={<Quotations />} />
            <Route path="/sales/quotations/new" element={<QuotationFormPage />} />
            <Route path="/sales/quotations/:id" element={<QuotationFormPage />} />
            <Route path="/sales/quotations/:id/edit" element={<QuotationFormPage />} />
            <Route path="/sales/pi" element={<ProformaInvoices />} />
            <Route path="/sales/pi/new" element={<PIFormPage />} />
            <Route path="/sales/pi/:id/edit" element={<PIFormPage />} />
            <Route path="/sales/invoices" element={<SalesInvoices />} />
            <Route path="/sales/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/sales/invoices/:id" element={<InvoiceFormPage />} />
            <Route path="/sales/invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="/sales/challans" element={<DeliveryChallans />} />
            <Route path="/sales/challans/new" element={<DocumentForm docType="challan" />} />
            <Route path="/sales/inventory" element={<SalesInventory />} />

            {/* Reports */}
            <Route path="/reports/leads" element={<LeadReports />} />
            <Route path="/reports/sales-funnel" element={<SalesFunnel />} />
            <Route path="/reports/amc" element={<AMCReports />} />
            <Route path="/reports/inventory" element={<InventoryReports />} />

            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/leads" element={<LeadSettings />} />
            <Route path="/settings/amc" element={<AMCSettings />} />
            <Route path="/settings/po" element={<POSettings />} />
            <Route path="/settings/organisation" element={<TenantConfig />} />
            <Route path="/settings/office-locations" element={<OfficeLocations />} />
            <Route path="/settings/document-series" element={<DocumentSeries />} />
            <Route path="/settings/gst-config" element={<GSTConfig />} />
            <Route path="/settings/reminders" element={<ReminderSettings />} />

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

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// In dev: Vite proxy forwards /auth and /hrm to localhost:8000
// In production: set VITE_API_URL to your backend URL
const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: BASE });

// ── Request interceptor — inject token + tenant ─────────────────────────────
api.interceptors.request.use((config) => {
  const { token, tenant } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenant) config.headers['X-Tenant-Slug'] = tenant;
  return config;
});

// ── Response interceptor — refresh on 401 ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refreshToken }, {
            headers: { 'X-Tenant-Slug': useAuthStore.getState().tenant },
          });
          setTokens(res.data.access_token, res.data.refresh_token);
          original.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(original);
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password, tenant) =>
    api.post('/auth/login', { email, password }, { headers: { 'X-Tenant-Slug': tenant } }),
  me: () => api.get('/auth/me'),
};

// ── Employees ──────────────────────────────────────────────────────────────
export const employeeApi = {
  list: (params) => api.get('/hrm/employees', { params }),
  get: (id) => api.get(`/hrm/employees/${id}`),
  create: (data) => api.post('/hrm/employees', data),
  update: (id, data) => api.patch(`/hrm/employees/${id}`, data),
  deactivate: (id) => api.delete(`/hrm/employees/${id}`),
  orgChart: () => api.get('/hrm/employees/org-chart'),
  departments: () => api.get('/hrm/departments'),
  designations: () => api.get('/hrm/designations'),
  branches: () => api.get('/hrm/branches'),
  createBranch: (data) => api.post('/hrm/branches', data),
  updateBranch: (id, data) => api.patch(`/hrm/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/hrm/branches/${id}`),
  createDept: (data) => api.post('/hrm/departments', data),
  patchDept: (id, data) => api.patch(`/hrm/departments/${id}`, data),
  deleteDept: (id) => api.delete(`/hrm/departments/${id}`),
  createDesig: (data) => api.post('/hrm/designations', data),
  patchDesig: (id, data) => api.patch(`/hrm/designations/${id}`, data),
  deleteDesig: (id) => api.delete(`/hrm/designations/${id}`),
  getSalaryConfig: (id) => api.get(`/hrm/employees/${id}/salary-config`),
  saveSalaryConfig: (id, data) => api.post(`/hrm/employees/${id}/salary-config`, data),
};

// ── Attendance ─────────────────────────────────────────────────────────────
export const attendanceApi = {
  today: () => api.get('/hrm/attendance/today'),
  punchIn: (data) => api.post('/hrm/attendance/punch-in', data),
  punchOut: (data) => api.post('/hrm/attendance/punch-out', data),
  monthly: (year, month, employeeId) =>
    api.get('/hrm/attendance/monthly', { params: { year, month, employee_id: employeeId } }),
  summary: (year, month, employeeId) =>
    api.get('/hrm/attendance/summary', { params: { year, month, employee_id: employeeId } }),
  team: (date) => api.get('/hrm/attendance/team', { params: { for_date: date } }),
  regularise: (data) => api.post('/hrm/attendance/regularise', data),
  regularisations: (params) => api.get('/hrm/attendance/regularisations', { params }),
  approveReg: (id) => api.patch(`/hrm/attendance/regularisations/${id}/approve`),
  rejectReg: (id, reason) => api.patch(`/hrm/attendance/regularisations/${id}/reject`, { reason }),
  holidays: (year) => api.get('/hrm/attendance/holidays', { params: { year } }),
  policies: () => api.get('/hrm/attendance/policies'),
  createPolicy: (data) => api.post('/hrm/attendance/policies', data),
  patchPolicy: (id, data) => api.patch(`/hrm/attendance/policies/${id}`, data),
  manual: (data) => api.post('/hrm/attendance/manual', data),
  report: (params) => api.get('/hrm/attendance/report', { params }),
};

// ── Leave ──────────────────────────────────────────────────────────────────
export const leaveApi = {
  types: () => api.get('/hrm/leave/types'),
  balance: (params) => api.get('/hrm/leave/balance', { params }),
  apply: (data) => api.post('/hrm/leave/apply', data),
  requests: (params) => api.get('/hrm/leave/requests', { params }),
  approve: (id) => api.patch(`/hrm/leave/requests/${id}/approve`),
  reject: (id, reason) => api.patch(`/hrm/leave/requests/${id}/reject`, { reason }),
  cancel: (id) => api.post(`/hrm/leave/requests/${id}/cancel`),
  calendar: (month, year, dept) => api.get('/hrm/leave/calendar', { params: { month, year, department_id: dept } }),
  maxConfigs: () => api.get('/hrm/leave/maximum-config'),
  createMaxConfig: (data) => api.post('/hrm/leave/maximum-config', data),
  deleteMaxConfig: (id) => api.delete(`/hrm/leave/maximum-config/${id}`),
};

// ── Payroll ────────────────────────────────────────────────────────────────
export const payrollApi = {
  runs: () => api.get('/hrm/payroll/runs'),
  createRun: (run_month) => api.post('/hrm/payroll/runs', { run_month }),
  processRun:   (id) => api.post(`/hrm/payroll/runs/${id}/process`),
  reprocessRun: (id) => api.post(`/hrm/payroll/runs/${id}/reprocess`),
  deleteRun:    (id) => api.delete(`/hrm/payroll/runs/${id}`),
  approveRun:   (id) => api.post(`/hrm/payroll/runs/${id}/approve`),
  disburseRun: (id) => api.post(`/hrm/payroll/runs/${id}/disburse`),
  preview: (id) => api.get(`/hrm/payroll/runs/${id}/preview`),
  summary: (id) => api.get(`/hrm/payroll/runs/${id}/summary`),
  bankFile: (id) => api.get(`/hrm/payroll/runs/${id}/bank-file`, { responseType: 'blob' }),
  payslips: (params) => api.get('/hrm/payroll/payslips', { params }),
  statutoryConfig: () => api.get('/hrm/payroll/statutory-config'),
  upsertStatutory: (data) => api.post('/hrm/payroll/statutory-config', data),
  monthlyView: (params) => api.get('/hrm/payroll/monthly-view', { params }),
};

// ── Notice Board ─────────────────────────────────────────────────────────────
export const noticeBoardApi = {
  list: () => api.get('/hrm/notice-board'),
  create: (data) => api.post('/hrm/notice-board', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/hrm/notice-board/${id}`),
};

// ── Leads ──────────────────────────────────────────────────────────────────
export const leadsApi = {
  list: (params) => api.get('/leads', { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.patch(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  convert: (id, data) => api.post(`/leads/${id}/convert`, data),
  kanban: () => api.get('/leads/kanban'),
  activities: (id) => api.get(`/leads/${id}/activities`),
  addActivity: (id, data) => api.post(`/leads/${id}/activities`, data),
  updateActivity: (leadId, actId, data) => api.patch(`/leads/${leadId}/activities/${actId}`, data),
  quotations: (id) => api.get(`/leads/${id}/quotations`),
  addQuotation: (id, data) => api.post(`/leads/${id}/quotations`, data),
  getDashboard: () => api.get('/leads/dashboard'),
  // DVR visits
  logVisit: (id, data) => api.post(`/leads/${id}/log-visit`, data),
  // Products list (for dropdowns)
  products: (params) => api.get('/leads/products', { params }),
  // Masters — categories, sources, stages
  masters: (master_type) => api.get('/leads/masters', { params: master_type ? { master_type } : {} }),
  createMaster: (data) => api.post('/leads/masters', data),
  deleteMaster: (id) => api.delete(`/leads/masters/${id}`),

  // Follow-ups & global activity feed
  followups: (params) => api.get('/leads/followup-report', { params }),
  allActivities: (params) => api.get('/leads/activities', { params }),

  // Closure document upload
  uploadClosureDocument: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/leads/upload-closure-document', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Standalone activities (no lead)
  createStandaloneActivity: (data) => api.post('/crm/activities', data),
  updateStandaloneActivity: (actId, data) => api.patch(`/crm/activities/${actId}`, data),
  convertActivityToLead: (actId, data) => api.post(`/crm/activities/${actId}/convert-to-lead`, data),
};

// ── Sales (Quotations, PI, Invoices, Challans, Stock) ─────────────────────
export const salesApi = {
  // Quotations
  listQuotations: (params) => api.get('/sales/quotations', { params }),
  getQuotation: (id) => api.get(`/sales/quotations/${id}`),
  createQuotation: (data) => api.post('/sales/quotations', data),
  updateQuotation: (id, data) => api.patch(`/sales/quotations/${id}`, data),
  deleteQuotation: (id) => api.delete(`/sales/quotations/${id}`),
  convertQuotation: (id, target) => api.post(`/sales/quotations/${id}/convert`, { target }),
  copyQuotation: (id, data) => api.post(`/sales/quotations/${id}/copy`, data),
  getQuotationHistory: (id) => api.get(`/sales/quotations/${id}/history`),

  // Proforma Invoices
  listPI: (params) => api.get('/sales/pi', { params }),
  getPI: (id) => api.get(`/sales/pi/${id}`),
  createPI: (data) => api.post('/sales/pi', data),
  updatePI: (id, data) => api.patch(`/sales/pi/${id}`, data),
  convertPI: (id) => api.post(`/sales/pi/${id}/convert`),

  // Sales Invoices
  listInvoices: (params) => api.get('/sales/invoices', { params }),
  getInvoice: (id) => api.get(`/sales/invoices/${id}`),
  createInvoice: (data) => api.post('/sales/invoices', data),
  updateInvoice: (id, data) => api.patch(`/sales/invoices/${id}`, data),
  recordPayment: (id, data) => api.post(`/sales/invoices/${id}/record-payment`, data),
  createChallanFromInvoice: (id) => api.post(`/sales/invoices/${id}/challan`),

  // Delivery Challans
  listChallans: (params) => api.get('/sales/challans', { params }),
  getChallan: (id) => api.get(`/sales/challans/${id}`),
  createChallan: (data) => api.post('/sales/challans', data),
  updateChallan: (id, data) => api.patch(`/sales/challans/${id}`, data),

  // Stock
  listStock: (params) => api.get('/sales/stock', { params }),
  adjustStock: (data) => api.post('/sales/stock/adjust', data),
  stockMovements: (params) => api.get('/sales/stock/movements', { params }),
};

// ── AMC ────────────────────────────────────────────────────────────────────
export const amcApi = {
  list: (params) => api.get('/amc', { params }),
  get: (id) => api.get(`/amc/${id}`),
  create: (data) => api.post('/amc', data),
  update: (id, data) => api.patch(`/amc/${id}`, data),
  delete: (id) => api.delete(`/amc/${id}`),
  renew: (id) => api.post(`/amc/${id}/renew`),
  visits: (id) => api.get(`/amc/${id}/visits`),
  scheduleVisit: (id, data) => api.post(`/amc/${id}/visits`, data),
};

// ── Operations (Products, Vendors, POs, Inventory) ───────────────────
export const opsApi = {
  // Products
  listProducts: (params) => api.get('/ops/products', { params }),
  createProduct: (data) => api.post('/ops/products', data),
  updateProduct: (id, data) => api.patch(`/ops/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/ops/products/${id}`),

  // Vendors
  listVendors: (params) => api.get('/ops/vendors', { params }),
  createVendor: (data) => api.post('/ops/vendors', data),
  updateVendor: (id, data) => api.patch(`/ops/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/ops/vendors/${id}`),

  // Purchase Orders
  listPOs: (params) => api.get('/ops/purchase-orders', { params }),
  getPO: (id) => api.get(`/ops/purchase-orders/${id}`),
  createPO: (data) => api.post('/ops/purchase-orders', data),
  updatePO: (id, data) => api.patch(`/ops/purchase-orders/${id}`, data),
  submitPO: (id) => api.post(`/ops/purchase-orders/${id}/submit`),
  approvePO: (id) => api.post(`/ops/purchase-orders/${id}/approve`),
  receivePO: (id, data) => api.post(`/ops/purchase-orders/${id}/receive`, data),
  cancelPO: (id) => api.post(`/ops/purchase-orders/${id}/cancel`),

  // Inventory
  listInventory: (params) => api.get('/ops/inventory', { params }),
  listMovements: (params) => api.get('/ops/inventory/movements', { params }),
};

// ── Customers ─────────────────────────────────────────────────────
export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
};

// ── Service Tickets ───────────────────────────────────────────────
export const serviceApi = {
  list: (params) => api.get('/service/tickets', { params }),
  get: (id) => api.get(`/service/tickets/${id}`),
  create: (data) => api.post('/service/tickets', data),
  update: (id, data) => api.patch(`/service/tickets/${id}`, data),
  close: (id, data) => api.post(`/service/tickets/${id}/close`, data),
  assign: (id, data) => api.post(`/service/tickets/${id}/assign`, data),
  addNote: (id, data) => api.post(`/service/tickets/${id}/notes`, data),
};

// ── CRM Daily (Field Visits + Tasks) ───────────────────────────────────────
export const dailyApi = {
  listVisits: (params) => api.get('/crm/field-visits', { params }),
  createVisit: (data) => api.post('/crm/field-visits', data),
  createVisitMobile: (formData) => api.post('/crm/field-visits/mobile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateVisit: (id, data) => api.patch(`/crm/field-visits/${id}`, data),
  deleteVisit: (id) => api.delete(`/crm/field-visits/${id}`),
  uploadPhoto: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/crm/field-visits/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listTasks: (params) => api.get('/crm/tasks', { params }),
  createTask: (data) => api.post('/crm/tasks', data),
  updateTask: (id, data) => api.patch(`/crm/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/crm/tasks/${id}`),
};

// ── Tenant ─────────────────────────────────────────────────────────────────
export const tenantApi = {
  getProfile: () => api.get('/tenant/profile'),
  updateProfile: (data) => api.patch('/tenant/profile', data),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/tenant/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Document Series (Numbering) ───────────────────────────────────────────────
export const documentSeriesApi = {
  list: () => api.get('/settings/document-series'),
  get: (id) => api.get(`/settings/document-series/${id}`),
  create: (data) => api.post('/settings/document-series', data),
  update: (id, data) => api.patch(`/settings/document-series/${id}`, data),
  activate: (id) => api.post(`/settings/document-series/${id}/activate`),
  deactivate: (id) => api.post(`/settings/document-series/${id}/deactivate`),
};

// ── GST Config ────────────────────────────────────────────────────────────────
export const gstConfigApi = {
  list: () => api.get('/settings/gst-configs'),
  create: (data) => api.post('/settings/gst-configs', data),
  update: (id, data) => api.patch(`/settings/gst-configs/${id}`, data),
  delete: (id) => api.delete(`/settings/gst-configs/${id}`),
};

// ── Customer Product Ownership ────────────────────────────────────────────────
export const ownershipApi = {
  list: (params) => api.get('/crm/ownership', { params }),
  get: (id) => api.get(`/crm/ownership/${id}`),
  create: (data) => api.post('/crm/ownership', data),
  update: (id, data) => api.patch(`/crm/ownership/${id}`, data),
  // Per-customer
  listByCustomer: (customerId) => api.get(`/customers/${customerId}/products`),
  // Timeline
  timeline: (customerId) => api.get(`/customers/${customerId}/timeline`),
  // Lifecycle dashboard
  lifecycleDashboard: () => api.get('/crm/lifecycle-dashboard'),
  upcomingRenewals: (params) => api.get('/crm/upcoming-renewals', { params }),
};

// ── Closure Document Upload ────────────────────────────────────────────────────
export const closureApi = {
  uploadDocument: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/leads/upload-closure-document', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── Reminder Configs ──────────────────────────────────────────────────────────
export const reminderConfigApi = {
  list: (params) => api.get('/settings/reminder-configs', { params }),
  create: (data) => api.post('/settings/reminder-configs', data),
  update: (id, data) => api.patch(`/settings/reminder-configs/${id}`, data),
  delete: (id) => api.delete(`/settings/reminder-configs/${id}`),
  seedDefaults: () => api.post('/settings/reminder-configs/seed-defaults'),
};

export default api;

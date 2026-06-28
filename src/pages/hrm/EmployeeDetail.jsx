import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const EMPLOYEES = [
  { id: 1, emp_code: 'EMP001', full_name: 'Rahul Sharma', department: 'Engineering', designation: 'Senior Developer', email: 'rahul@company.com', phone: '9876543210', date_joined: '2022-01-15', status: 'active', gender: 'Male', salary: 85000, manager: 'Vikram Rao', address: '123, Park Street, Bengaluru', blood_group: 'O+', emergency_contact: '9876540001', pan: 'ABCDE1234F', bank: 'HDFC Bank', account_no: '1234567890', ifsc: 'HDFC0001234' },
  { id: 2, emp_code: 'EMP002', full_name: 'Priya Singh', department: 'HR', designation: 'HR Manager', email: 'priya@company.com', phone: '9876543211', date_joined: '2021-06-10', status: 'active', gender: 'Female', salary: 70000, manager: 'CEO', address: '45, MG Road, Mumbai', blood_group: 'A+', emergency_contact: '9876540002', pan: 'FGHIJ5678K', bank: 'ICICI Bank', account_no: '9876543210', ifsc: 'ICIC0001234' },
];

const ATTENDANCE_SUMMARY = { present: 22, absent: 1, late: 2, leaves: 1, wfh: 0, half_day: 0 };

const LEAVE_BALANCE = [
  { type: 'Annual Leave', total: 18, used: 5, remaining: 13 },
  { type: 'Sick Leave', total: 12, used: 2, remaining: 10 },
  { type: 'Casual Leave', total: 6, used: 1, remaining: 5 },
];

const ACTIVITY = [
  { date: '2025-04-28', type: 'attendance', msg: 'Punched in 09:05, out 18:30 · 9h 25m' },
  { date: '2025-04-25', type: 'leave', msg: 'Annual Leave approved (1 day)' },
  { date: '2025-04-15', type: 'payroll', msg: 'Salary ₹85,000 processed for April 2025' },
  { date: '2025-04-01', type: 'document', msg: 'Appraisal letter uploaded' },
];

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const emp = EMPLOYEES.find((e) => String(e.id) === id) || EMPLOYEES[0];
  const [tab, setTab] = useState('overview');

  const initials = emp.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/hrm/employees" className="hover:text-primary">Employees</Link>
        <span>/</span>
        <span className="text-black font-medium">{emp.full_name}</span>
      </div>

      {/* Profile Card */}
      <div className="rounded-sm border border-stroke bg-white shadow-default">
        <div className="h-32 bg-gradient-to-r from-primary to-primary-dark rounded-t-sm" />
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end gap-4 -mt-12 mb-5">
            <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-card flex items-center justify-center text-primary text-2xl font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-black">{emp.full_name}</h2>
              <p className="text-sm text-bodydark">{emp.designation} · {emp.department}</p>
            </div>
            <div className="flex gap-2 pb-1 flex-wrap">
              <Link to={`/hrm/employees`} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">
                ← Back
              </Link>
              <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
                Edit Profile
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <InfoPill icon="✉" label={emp.email} />
            <InfoPill icon="📱" label={emp.phone} />
            <InfoPill icon="🏢" label={emp.department} />
            <InfoPill icon="📅" label={`Joined ${emp.date_joined}`} />
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${emp.status === 'active' ? 'bg-meta-3/10 text-meta-3' : 'bg-meta-1/10 text-meta-1'}`}>
              {emp.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        {['overview', 'attendance', 'leaves', 'payroll', 'documents', 'activity'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'active' : ''}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InfoCard title="Personal Information">
            <Row label="Employee Code" value={emp.emp_code} />
            <Row label="Gender" value={emp.gender} />
            <Row label="Blood Group" value={emp.blood_group} />
            <Row label="Address" value={emp.address} />
            <Row label="Emergency Contact" value={emp.emergency_contact} />
          </InfoCard>
          <InfoCard title="Employment Details">
            <Row label="Department" value={emp.department} />
            <Row label="Designation" value={emp.designation} />
            <Row label="Reports To" value={emp.manager} />
            <Row label="Date Joined" value={emp.date_joined} />
            <Row label="Monthly Salary" value={`₹${emp.salary?.toLocaleString()}`} />
          </InfoCard>
          <InfoCard title="Bank & Financial">
            <Row label="PAN" value={emp.pan} />
            <Row label="Bank" value={emp.bank} />
            <Row label="Account No." value={emp.account_no} />
            <Row label="IFSC" value={emp.ifsc} />
          </InfoCard>
          <InfoCard title="Leave Balances">
            {LEAVE_BALANCE.map((l) => (
              <div key={l.type} className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-black">{l.type}</span>
                  <span className="text-bodydark">{l.remaining}/{l.total}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill bg-primary" style={{ width: `${(l.remaining / l.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </InfoCard>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 mb-6">
            {Object.entries(ATTENDANCE_SUMMARY).map(([k, v]) => (
              <div key={k} className="text-center p-3 rounded bg-gray-1">
                <div className="text-2xl font-bold text-black">{v}</div>
                <div className="text-xs text-bodydark capitalize">{k.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-xs text-bodydark font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 30 }, (_, i) => {
              const states = ['present','present','present','present','week_off','week_off','late','absent','present','present','present','present','week_off','week_off','present','present','present','present','present','week_off','week_off','on_leave','present','present','present','present','week_off','week_off','present','present'];
              return <div key={i} className={`att-day ${states[i] || 'future'}`}>{i + 1}</div>;
            })}
          </div>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-1"><tr>{['Type','From','To','Days','Status'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-stroke">
              {[
                { type: 'Annual Leave', from: '2025-04-25', to: '2025-04-25', days: 1, status: 'Approved' },
                { type: 'Sick Leave', from: '2025-03-10', to: '2025-03-11', days: 2, status: 'Approved' },
                { type: 'Casual Leave', from: '2025-02-14', to: '2025-02-14', days: 1, status: 'Approved' },
              ].map((l, i) => (
                <tr key={i} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm text-black">{l.type}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{l.from}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">{l.to}</td>
                  <td className="px-5 py-3.5 text-sm text-black">{l.days}</td>
                  <td className="px-5 py-3.5"><span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-meta-3/10 text-meta-3">{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-1"><tr>{['Month','Gross','Deductions','Net Pay','Status'].map(h => <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-stroke">
              {[
                { month: 'April 2025', gross: 85000, ded: 9250, net: 75750, status: 'Paid' },
                { month: 'March 2025', gross: 85000, ded: 9250, net: 75750, status: 'Paid' },
                { month: 'February 2025', gross: 85000, ded: 9250, net: 75750, status: 'Paid' },
              ].map((p, i) => (
                <tr key={i} className="hover:bg-gray-1">
                  <td className="px-5 py-3.5 text-sm text-black font-medium">{p.month}</td>
                  <td className="px-5 py-3.5 text-sm text-bodydark">₹{p.gross.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-meta-1">₹{p.ded.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-black font-semibold">₹{p.net.toLocaleString()}</td>
                  <td className="px-5 py-3.5"><span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-meta-3/10 text-meta-3">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
          <div className="flex justify-between mb-4">
            <h3 className="font-medium text-black">Employee Documents</h3>
            <button className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white">Upload Document</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Offer Letter', 'ID Proof (Aadhaar)', 'PAN Card', 'Bank Details', 'Resume', 'Appraisal Letter'].map((doc) => (
              <div key={doc} className="flex items-center gap-3 p-3 rounded border border-stroke hover:bg-gray-1">
                <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div className="flex-1 text-sm text-black">{doc}</div>
                <button className="text-xs text-primary hover:underline">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default divide-y divide-stroke">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="flex gap-4 px-6 py-4">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-black">{a.msg}</p>
                <p className="text-xs text-bodydark mt-0.5">{a.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default">
      <div className="px-6 py-4 border-b border-stroke">
        <h3 className="font-medium text-black">{title}</h3>
      </div>
      <div className="p-6 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-bodydark">{label}</span>
      <span className="text-black font-medium">{value}</span>
    </div>
  );
}

function InfoPill({ icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-bodydark">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

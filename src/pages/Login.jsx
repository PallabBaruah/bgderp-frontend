import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login, setTenant } = useAuthStore();
  const [form, setForm] = useState({ tenant: 'atmt', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tenant || !form.email || !form.password) {
      toast.error('All fields required');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password, form.tenant);
      const { access_token, refresh_token, user, roles } = res.data;
      setTenant(form.tenant);
      login(access_token, refresh_token, user, roles ?? []);
      toast.success('Signed in successfully');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 login-gradient flex-col items-center justify-center p-16 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
            Demo<span className="text-primary">ERP</span>
          </h1>
          <p className="text-lg text-white/70 mb-12">
            Complete business management — HRMS, CRM, AMC & Operations unified.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '👥', label: 'HRMS', desc: 'Employees, Attendance, Leave, Payroll' },
              { icon: '📊', label: 'CRM', desc: 'Leads, Pipeline, Activities, Convert' },
              { icon: '🔧', label: 'AMC & Service', desc: 'Contracts, Visits, Tickets' },
              { icon: '📦', label: 'Operations', desc: 'Products, Inventory, Purchase Orders' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-xl p-5 backdrop-blur-sm">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold mb-1">{f.label}</div>
                <div className="text-xs text-white/60">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-bodybg p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-extrabold text-black">
              Nexa<span className="text-primary">ERP</span>
            </h1>
          </div>

          <div className="rounded-sm border border-stroke bg-white shadow-default p-8 md:p-10">
            <h2 className="text-2xl font-bold text-black mb-1">Sign In</h2>
            <p className="text-sm text-bodydark mb-8">Access your ERP workspace.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                label="Employee ID / Email"
                icon={<IconUser />}
                type="text"
                value={form.email}
                onChange={set('email')}
                placeholder="EMP-0001 or admin@company.com"
              />
              <div>
                <label className="block text-sm font-medium text-black mb-2">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bodydark w-4 h-4">
                    <IconLock />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-stroke bg-transparent pl-10 pr-10 py-3 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-bodydark hover:text-black w-4 h-4"
                  >
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="rounded border-stroke accent-primary" />
                  <span className="text-bodydark">Remember me</span>
                </label>
                <button type="button" className="text-primary hover:underline text-sm">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-all"
              >
                {loading && <span className="spinner !w-4 !h-4 !border-2 border-white/40 border-t-white" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-bodydark">
              Contact your administrator if you need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bodydark w-4 h-4">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-md border border-stroke bg-transparent pl-10 pr-4 py-3 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
    </div>
  );
}

function IconBuilding() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><rect x="2" y="7" width="20" height="15"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>;
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IconLock() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function IconEye() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconEyeOff() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { tenantApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { INDIAN_STATES } from '../../constants/indianStates';

function applyPrimaryColor(color) {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--color-primary-dark', color);
  root.style.setProperty('--color-brand-500', color);
}

export default function TenantConfig() {
  const { setTenantProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '', primary_color: '#3C50E0',
    gstin: '', state: '', address: '', phone: '', email: '',
    bank_name: '', bank_account_holder: '', bank_account_number: '',
    bank_ifsc: '', bank_branch: '',
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    tenantApi.getProfile()
      .then(r => {
        const d = r.data;
        setForm({
          name: d.name || '', primary_color: d.primary_color || '#3C50E0',
          gstin: d.gstin || '', state: d.state || '', address: d.address || '',
          phone: d.phone || '', email: d.email || '',
          bank_name: d.bank_name || '', bank_account_holder: d.bank_account_holder || '',
          bank_account_number: d.bank_account_number || '', bank_ifsc: d.bank_ifsc || '',
          bank_branch: d.bank_branch || '',
        });
        setLogoUrl(d.logo_url || '');
        setLogoPreview(d.logo_url || '');
        setTenantProfile(d);
      })
      .catch(() => toast.error('Failed to load organisation profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PNG, JPG, WEBP, SVG allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB');
      return;
    }

    setLogoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const r = await tenantApi.uploadLogo(file);
      setLogoUrl(r.data.logo_url || '');
      setTenantProfile(r.data);
      toast.success('Logo uploaded');
    } catch {
      toast.error('Logo upload failed');
      setLogoPreview(logoUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Organisation name required');
    setSaving(true);
    try {
      const r = await tenantApi.updateProfile({
        name: form.name.trim(),
        primary_color: form.primary_color || null,
        gstin: form.gstin || null,
        state: form.state || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        bank_name: form.bank_name || null,
        bank_account_holder: form.bank_account_holder || null,
        bank_account_number: form.bank_account_number || null,
        bank_ifsc: form.bank_ifsc || null,
        bank_branch: form.bank_branch || null,
      });
      setTenantProfile(r.data);
      applyPrimaryColor(r.data.primary_color);
      toast.success('Settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-bodydark">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">Organisation Settings</h1>
        <p className="text-sm text-bodydark mt-1">Configure portal branding and company profile for this workspace.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Logo upload */}
        <div className="rounded-lg border border-stroke bg-white p-6">
          <h2 className="text-sm font-semibold text-black mb-4 uppercase tracking-wide">Organisation Logo</h2>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-stroke bg-gray-50 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="logo"
                  className="w-full h-full object-contain p-2"
                  onError={() => setLogoPreview('')}
                />
              ) : (
                <svg className="w-10 h-10 text-bodydark-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Choose File'}
              </button>
              <p className="mt-2 text-xs text-bodydark">PNG, JPG, WEBP or SVG · Max 2 MB</p>
              {uploading && (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Uploading…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-lg border border-stroke bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-black uppercase tracking-wide">Branding</h2>

          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Organisation Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. ABC Pvt Ltd"
              className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={set('primary_color')}
                className="h-10 w-16 rounded border border-stroke cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={set('primary_color')}
                placeholder="#3C50E0"
                maxLength={7}
                className="w-28 rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary font-mono"
              />
              <span className="text-xs text-bodydark">Sidebar accent colour</span>
            </div>
          </div>
        </div>

        {/* GST & Company Details */}
        <div className="rounded-lg border border-stroke bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-black uppercase tracking-wide">GST & Company Details</h2>
          <p className="text-xs text-bodydark -mt-2">Used to determine intra-state vs inter-state tax on invoices.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">GSTIN</label>
              <input
                type="text"
                value={form.gstin}
                onChange={set('gstin')}
                placeholder="e.g. 18AABCU9603R1ZM"
                maxLength={20}
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Registered State *</label>
              <select
                value={form.state}
                onChange={set('state')}
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary bg-white"
              >
                <option value="">— Select State —</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+91 98765 43210"
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="company@example.com"
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Address</label>
            <textarea
              value={form.address}
              onChange={set('address')}
              rows={2}
              placeholder="Company address for invoices"
              className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Bank Details */}
        <div className="rounded-lg border border-stroke bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-black uppercase tracking-wide">Bank Details</h2>
          <p className="text-xs text-bodydark -mt-2">Bank information printed on invoices and proforma invoices.</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Bank Name</label>
              <input
                type="text"
                value={form.bank_name}
                onChange={set('bank_name')}
                placeholder="e.g. State Bank of India"
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Account Holder Name</label>
              <input
                type="text"
                value={form.bank_account_holder}
                onChange={set('bank_account_holder')}
                placeholder="e.g. ABC Pvt Ltd"
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Account Number</label>
              <input
                type="text"
                value={form.bank_account_number}
                onChange={set('bank_account_number')}
                placeholder="e.g. 1234567890"
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">IFSC Code</label>
              <input
                type="text"
                value={form.bank_ifsc}
                onChange={set('bank_ifsc')}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-bodydark mb-1.5">Branch</label>
            <input
              type="text"
              value={form.bank_branch}
              onChange={set('bank_branch')}
              placeholder="e.g. MG Road, Bangalore"
              className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Save button — bottom of form */}
        <div className="flex justify-end pb-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}

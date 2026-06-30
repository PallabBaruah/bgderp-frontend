import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { employeeApi } from '../../api/client';

const BLANK = {
  name: '', code: '', radius_meters: 200, is_active: true,
  center_lat: '', center_lng: '',
  address: { street: '', city: '', state: '', pincode: '' },
};

export default function OfficeLocations() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | branch-obj
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = () => {
    setLoading(true);
    employeeApi.branches()
      .then(r => setBranches(r.data || []))
      .catch(() => toast.error('Failed to load locations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(BLANK); setModal('create'); };
  const openEdit = (b) => {
    setForm({
      name: b.name || '',
      code: b.code || '',
      radius_meters: b.radius_meters ?? 200,
      is_active: b.is_active ?? true,
      center_lat: b.center_lat ?? '',
      center_lng: b.center_lng ?? '',
      address: {
        street: b.address?.street || '',
        city: b.address?.city || '',
        state: b.address?.state || '',
        pincode: b.address?.pincode || '',
      },
    });
    setModal(b);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setAddr = (k) => (e) => setForm(f => ({ ...f, address: { ...f.address, [k]: e.target.value } }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          center_lat: pos.coords.latitude.toFixed(7),
          center_lng: pos.coords.longitude.toFixed(7),
        }));
        setLocating(false);
        toast.success('Location captured');
      },
      () => { toast.error('Location access denied'); setLocating(false); }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name required');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      radius_meters: Number(form.radius_meters) || 200,
      is_active: form.is_active,
      center_lat: form.center_lat !== '' ? Number(form.center_lat) : null,
      center_lng: form.center_lng !== '' ? Number(form.center_lng) : null,
      address: Object.values(form.address).some(v => v)
        ? form.address
        : null,
    };
    try {
      if (modal === 'create') {
        await employeeApi.createBranch(payload);
        toast.success('Office location created');
      } else {
        await employeeApi.updateBranch(modal.id, payload);
        toast.success('Office location updated');
      }
      setModal(null);
      load();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete "${b.name}"? This cannot be undone.`)) return;
    try {
      await employeeApi.deleteBranch(b.id);
      toast.success('Location deleted');
      load();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Delete failed';
      toast.error(msg);
    }
  };

  const geofenceConfigured = (b) => b.center_lat != null && b.center_lng != null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Office Locations</h1>
          <p className="text-sm text-bodydark mt-1">Manage office branches and geofence settings for attendance.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Location
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-bodydark p-8">Loading…</div>
      ) : branches.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-white p-12 text-center">
          <svg className="w-12 h-12 text-bodydark-2 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          <p className="text-sm text-bodydark">No office locations yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {branches.map(b => (
            <div key={b.id} className={`rounded-lg border bg-white p-5 ${b.is_active ? 'border-stroke' : 'border-stroke opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Location pin icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${geofenceConfigured(b) ? 'bg-success/10' : 'bg-gray-100'}`}>
                    <svg className={`w-5 h-5 ${geofenceConfigured(b) ? 'text-success' : 'text-bodydark-2'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                      <circle cx="12" cy="9" r="2.5"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-black">{b.name}</h3>
                      {b.code && <span className="text-xs bg-gray-100 text-bodydark px-2 py-0.5 rounded font-mono">{b.code}</span>}
                      {!b.is_active && <span className="text-xs bg-red-50 text-meta-1 px-2 py-0.5 rounded">Inactive</span>}
                    </div>

                    {b.address?.city && (
                      <p className="text-sm text-bodydark mt-0.5">
                        {[b.address.street, b.address.city, b.address.state, b.address.pincode].filter(Boolean).join(', ')}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {geofenceConfigured(b) ? (
                        <>
                          <span className="flex items-center gap-1 text-xs text-success">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            Geofence active
                          </span>
                          <span className="text-xs text-bodydark">
                            {b.center_lat}, {b.center_lng}
                          </span>
                          <span className="text-xs text-bodydark">
                            Radius: <strong>{b.radius_meters}m</strong>
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-bodydark-2">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          No geofence — set GPS coordinates to enable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(b)}
                    className="rounded border border-stroke px-3 py-1.5 text-xs font-medium text-black hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="rounded border border-stroke px-3 py-1.5 text-xs font-medium text-meta-1 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h2 className="text-base font-semibold text-black">
                {modal === 'create' ? 'Add Office Location' : `Edit — ${modal.name}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-bodydark hover:text-black">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Location Name *</label>
                  <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. Head Office — Guwahati"
                    className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Code</label>
                  <input type="text" value={form.code} onChange={set('code')} placeholder="HO"
                    className="w-full rounded border border-stroke px-3 py-2.5 text-sm text-black outline-none focus:border-primary font-mono" />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded" />
                    <span className="text-sm text-black">Active</span>
                  </label>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-bodydark mb-2">Address</label>
                <div className="space-y-2">
                  <input type="text" value={form.address.street} onChange={setAddr('street')} placeholder="Street / Area"
                    className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={form.address.city} onChange={setAddr('city')} placeholder="City"
                      className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                    <input type="text" value={form.address.state} onChange={setAddr('state')} placeholder="State"
                      className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                    <input type="text" value={form.address.pincode} onChange={setAddr('pincode')} placeholder="Pincode"
                      className="rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Geofence */}
              <div className="rounded-lg bg-gray-50 border border-stroke p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black">Geofence Settings</p>
                    <p className="text-xs text-bodydark mt-0.5">Employees must be within radius to punch in.</p>
                  </div>
                  <button type="button" onClick={useMyLocation} disabled={locating}
                    className="flex items-center gap-1.5 rounded border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white disabled:opacity-60 transition-colors">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    </svg>
                    {locating ? 'Getting…' : 'Use My Location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-bodydark mb-1">Latitude</label>
                    <input type="number" step="any" value={form.center_lat} onChange={set('center_lat')}
                      placeholder="e.g. 26.1445"
                      className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-bodydark mb-1">Longitude</label>
                    <input type="number" step="any" value={form.center_lng} onChange={set('center_lng')}
                      placeholder="e.g. 91.7362"
                      className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1">
                    Allowed Radius — <strong>{form.radius_meters} metres</strong>
                  </label>
                  <input type="range" min="50" max="2000" step="50" value={form.radius_meters}
                    onChange={e => setForm(f => ({ ...f, radius_meters: Number(e.target.value) }))}
                    className="w-full accent-primary" />
                  <div className="flex justify-between text-xs text-bodydark-2 mt-1">
                    <span>50m (strict)</span>
                    <span>500m</span>
                    <span>2000m (loose)</span>
                  </div>
                </div>

                {form.center_lat && form.center_lng && (
                  <div className="flex items-center gap-2 text-xs text-success">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Geofence will be active — employees must be within {form.radius_meters}m of this point.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60 transition-colors">
                  {saving ? 'Saving…' : modal === 'create' ? 'Create Location' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

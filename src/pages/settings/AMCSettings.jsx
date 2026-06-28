import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AMCSettings() {
  const [tab, setTab] = useState('sla');
  const [responseHours, setResponseHours] = useState('24');
  const [resolutionHours, setResolutionHours] = useState('72');
  const [renewalReminder, setRenewalReminder] = useState('30');
  const [criticalDays, setCriticalDays] = useState('30');
  const [autoEmail, setAutoEmail] = useState(true);
  const [autoSMS, setAutoSMS] = useState(false);

  const handleSave = () => toast.success('AMC settings saved');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-black">AMC Settings</h2>
        <p className="text-sm text-bodydark">Configure SLA, renewal reminders, and notifications</p>
      </div>

      <div className="tab-list">
        {[['sla', 'SLA Configuration'], ['renewals', 'Renewal Alerts'], ['notifications', 'Notifications']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {tab === 'sla' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6 space-y-6">
          <h3 className="font-medium text-black">Service Level Agreement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Initial Response Time (Hours)</label>
              <input type="number" value={responseHours} onChange={e => setResponseHours(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              <p className="text-xs text-bodydark mt-1">Time to first response after ticket creation</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Resolution Time (Hours)</label>
              <input type="number" value={resolutionHours} onChange={e => setResolutionHours(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              <p className="text-xs text-bodydark mt-1">Maximum time to resolve a ticket</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-black mb-3">SLA by Severity</h4>
            <div className="rounded border border-stroke overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-1">
                  <tr>{['Severity', 'Response Time', 'Resolution Time'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {[
                    { sev: 'Critical', sev_cls: 'bg-meta-1/10 text-meta-1', resp: '2 hours', res: '8 hours' },
                    { sev: 'High',     sev_cls: 'bg-meta-1/10 text-meta-1', resp: '4 hours', res: '24 hours' },
                    { sev: 'Medium',   sev_cls: 'bg-meta-6/10 text-meta-6', resp: '8 hours', res: '48 hours' },
                    { sev: 'Low',      sev_cls: 'bg-meta-3/10 text-meta-3', resp: '24 hours', res: '72 hours' },
                  ].map(r => (
                    <tr key={r.sev} className="hover:bg-gray-1">
                      <td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${r.sev_cls}`}>{r.sev}</span></td>
                      <td className="px-5 py-3 text-sm text-black">{r.resp}</td>
                      <td className="px-5 py-3 text-sm text-black">{r.res}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Save SLA Settings</button>
          </div>
        </div>
      )}

      {tab === 'renewals' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6 space-y-6">
          <h3 className="font-medium text-black">Renewal Alert Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Renewal Reminder (Days Before Expiry)</label>
              <input type="number" value={renewalReminder} onChange={e => setRenewalReminder(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Mark as Critical (Days Before Expiry)</label>
              <input type="number" value={criticalDays} onChange={e => setCriticalDays(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Save Renewal Settings</button>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6 space-y-4">
          <h3 className="font-medium text-black mb-4">Notification Channels</h3>
          {[
            { label: 'Email Notifications', desc: 'Send renewal reminders and ticket updates via email', val: autoEmail, set: setAutoEmail },
            { label: 'SMS Notifications', desc: 'Send SMS alerts for critical tickets and renewals', val: autoSMS, set: setAutoSMS },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-3 border-b border-stroke">
              <div>
                <div className="text-sm font-medium text-black">{n.label}</div>
                <div className="text-xs text-bodydark">{n.desc}</div>
              </div>
              <button onClick={() => n.set(p => !p)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${n.val ? 'bg-primary' : 'bg-stroke'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${n.val ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={handleSave} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Save Notification Settings</button>
          </div>
        </div>
      )}
    </div>
  );
}

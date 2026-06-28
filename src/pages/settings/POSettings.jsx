import { useState } from 'react';
import toast from 'react-hot-toast';

export default function POSettings() {
  const [autoApproveLimit, setAutoApproveLimit] = useState('10000');
  const [requireDualApproval, setRequireDualApproval] = useState(false);
  const [dualApprovalAbove, setDualApprovalAbove] = useState('50000');
  const [defaultTerms, setDefaultTerms] = useState('Net 30');
  const [gstRate, setGstRate] = useState('18');
  const [poPrefix, setPoPrefix] = useState('PO');
  const [emailOnApprove, setEmailOnApprove] = useState(true);

  const handleSave = () => toast.success('PO settings saved');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-black">Purchase Order Settings</h2>
        <p className="text-sm text-bodydark">Configure PO workflow, approval limits, and defaults</p>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-6 space-y-6">
        <div>
          <h3 className="font-medium text-black mb-4">Approval Workflow</h3>
          <div className="space-y-4">
            <div className="max-w-sm">
              <label className="block text-xs font-medium text-bodydark mb-1.5">Auto-Approve POs Under (₹)</label>
              <input type="number" value={autoApproveLimit} onChange={e => setAutoApproveLimit(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              <p className="text-xs text-bodydark mt-1">POs below this amount skip the approval step</p>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-stroke max-w-xl">
              <div>
                <div className="text-sm font-medium text-black">Require Dual Approval for Large POs</div>
                <div className="text-xs text-bodydark">Two managers must approve POs above the threshold</div>
              </div>
              <button onClick={() => setRequireDualApproval(p => !p)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireDualApproval ? 'bg-primary' : 'bg-stroke'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireDualApproval ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {requireDualApproval && (
              <div className="max-w-sm">
                <label className="block text-xs font-medium text-bodydark mb-1.5">Dual Approval Threshold (₹)</label>
                <input type="number" value={dualApprovalAbove} onChange={e => setDualApprovalAbove(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-black mb-4">PO Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Default Payment Terms</label>
              <select value={defaultTerms} onChange={e => setDefaultTerms(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                {['Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">Default GST Rate (%)</label>
              <input type="number" value={gstRate} onChange={e => setGstRate(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-bodydark mb-1.5">PO Number Prefix</label>
              <input value={poPrefix} onChange={e => setPoPrefix(e.target.value)} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-black mb-4">Notifications</h3>
          <div className="flex items-center justify-between py-3 border-b border-stroke max-w-xl">
            <div>
              <div className="text-sm font-medium text-black">Email Vendor on PO Approval</div>
              <div className="text-xs text-bodydark">Automatically email the vendor's contact when PO is approved</div>
            </div>
            <button onClick={() => setEmailOnApprove(p => !p)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailOnApprove ? 'bg-primary' : 'bg-stroke'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailOnApprove ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Save Settings</button>
        </div>
      </div>
    </div>
  );
}

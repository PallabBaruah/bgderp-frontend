import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/client';

const TABS = [
  ['general',    'General'],
  ['categories', 'Categories'],
  ['stages',     'Pipeline Stages'],
  ['sources',    'Lead Sources'],
];

export default function LeadSettings() {
  const [tab, setTab]               = useState('general');
  const [roundRobin, setRoundRobin] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [followUpDays, setFUD]      = useState('3');

  const [categories, setCategories] = useState([]);
  const [sources, setSources]       = useState([]);
  const [stages, setStages]         = useState([]);
  const [loadingMasters, setLM]     = useState(true);

  const [newCat, setNewCat]     = useState('');
  const [newSrc, setNewSrc]     = useState('');
  const [newSrcLabel, setNSL]   = useState('');
  const [adding, setAdding]     = useState(false);

  useEffect(() => { loadMasters(); }, []);

  async function loadMasters() {
    setLM(true);
    try {
      const res = await leadsApi.masters();
      const all = res.data || [];
      setCategories(all.filter(m => m.master_type === 'category'));
      setSources(all.filter(m => m.master_type === 'source'));
      setStages(all.filter(m => m.master_type === 'stage'));
    } catch { toast.error('Failed to load masters'); }
    finally { setLM(false); }
  }

  async function addMaster(master_type, value, label, extra = {}) {
    if (!value.trim()) return;
    setAdding(true);
    try {
      await leadsApi.createMaster({ master_type, value: value.trim(), label: label || value.trim(), ...extra });
      toast.success('Added');
      await loadMasters();
    } catch(e) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setAdding(false); }
  }

  async function removeMaster(id) {
    try {
      await leadsApi.deleteMaster(id);
      toast.success('Removed');
      await loadMasters();
    } catch { toast.error('Remove failed'); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-black">Lead Settings</h2>
        <p className="text-sm text-bodydark">Configure lead routing, pipeline stages, and automation</p>
      </div>

      <div className="tab-list">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-6 space-y-6">
          <div>
            <h3 className="font-medium text-black mb-4">Auto-Assignment</h3>
            <div className="space-y-4">
              {[
                { label: 'Enable Round Robin Assignment', sub: 'Distribute leads equally among sales team', val: roundRobin, set: setRoundRobin },
                { label: 'Auto-assign New Leads', sub: 'Automatically assign leads when created', val: autoAssign, set: setAutoAssign },
              ].map(({ label, sub, val, set }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-stroke">
                  <div>
                    <div className="text-sm font-medium text-black">{label}</div>
                    <div className="text-xs text-bodydark">{sub}</div>
                  </div>
                  <button onClick={() => set(p => !p)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-primary' : 'bg-stroke'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-black mb-4">Follow-up Defaults</h3>
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-bodydark mb-1.5">Default Follow-up Reminder (Days)</label>
              <input type="number" value={followUpDays} onChange={e => setFUD(e.target.value)}
                className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary"/>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => toast.success('Settings saved')} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90">
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-medium text-black">Lead Categories</h3>
              <p className="text-xs text-bodydark mt-0.5">Classify leads as Retail, Project, or End Customer</p>
            </div>
          </div>

          {loadingMasters ? (
            <div className="py-8 text-center text-sm text-bodydark">Loading…</div>
          ) : (
            <div className="space-y-2 mb-5">
              {categories.length === 0 && (
                <div className="text-sm text-bodydark text-center py-4">No categories yet</div>
              )}
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded border border-stroke hover:bg-gray-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {c.label[0]}
                    </div>
                    <span className="text-sm font-medium text-black">{c.label}</span>
                  </div>
                  <button onClick={() => removeMaster(c.id)} className="text-xs text-meta-1 hover:underline">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-stroke pt-4">
            <p className="text-xs font-medium text-bodydark mb-2">Add Category</p>
            <div className="flex gap-2">
              <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)}
                placeholder="e.g. Retail, Project, End Customer"
                className="flex-1 rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary"/>
              <button onClick={() => { addMaster('category', newCat, newCat); setNewCat(''); }} disabled={adding || !newCat.trim()}
                className="rounded bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">
                + Add
              </button>
            </div>
            <p className="text-[10px] text-bodydark mt-1.5">Default: Retail · Project · End Customer</p>
          </div>
        </div>
      )}

      {/* Pipeline Stages */}
      {tab === 'stages' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
            <h3 className="font-medium text-black">Pipeline Stages</h3>
          </div>
          {loadingMasters ? (
            <div className="py-8 text-center text-sm text-bodydark">Loading…</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-1">
                <tr>{['Order','Stage Name','ATE Label','Color'].map(h => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-bodydark uppercase text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {stages.map(s => (
                  <tr key={s.id} className="hover:bg-gray-1">
                    <td className="px-5 py-3.5 text-sm text-bodydark">{s.sort_order}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-bodydark">{s.value}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-black">{s.label}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-stroke" style={{ backgroundColor: s.color || '#ccc' }}/>
                        <span className="text-xs font-mono text-bodydark">{s.color || '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 border-t border-stroke">
            <p className="text-xs text-bodydark">Pipeline stages are fixed to the ATE workflow. Re-run seed.py to restore defaults.</p>
          </div>
        </div>
      )}

      {/* Lead Sources */}
      {tab === 'sources' && (
        <div className="rounded-sm border border-stroke bg-white shadow-default p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-black">Lead Sources</h3>
          </div>
          {loadingMasters ? (
            <div className="py-8 text-center text-sm text-bodydark">Loading…</div>
          ) : (
            <div className="space-y-2 mb-5">
              {sources.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded border border-stroke hover:bg-gray-1">
                  <div>
                    <span className="text-sm font-medium text-black">{s.label}</span>
                    <span className="text-xs text-bodydark ml-2 font-mono">({s.value})</span>
                  </div>
                  <button onClick={() => removeMaster(s.id)} className="text-xs text-meta-1 hover:underline">Remove</button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-stroke pt-4">
            <p className="text-xs font-medium text-bodydark mb-2">Add Source</p>
            <div className="flex gap-2">
              <input type="text" value={newSrc} onChange={e => setNewSrc(e.target.value)}
                placeholder="value (e.g. trade_show)"
                className="w-36 rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary"/>
              <input type="text" value={newSrcLabel} onChange={e => setNSL(e.target.value)}
                placeholder="Label (e.g. Trade Show)"
                className="flex-1 rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary"/>
              <button onClick={() => { addMaster('source', newSrc, newSrcLabel); setNewSrc(''); setNSL(''); }} disabled={adding || !newSrc.trim()}
                className="rounded bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50">
                + Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

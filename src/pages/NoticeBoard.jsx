import { useState, useEffect, useRef } from 'react';
import { noticeBoardApi } from '../api/client';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Holiday', 'HR', 'Training', 'Policy', 'Announcement', 'Other'];

const CAT_COLOR = {
  Holiday: 'bg-meta-1/10 text-meta-1',
  HR: 'bg-meta-5/10 text-meta-5',
  Training: 'bg-primary/10 text-primary',
  Policy: 'bg-meta-6/10 text-meta-6',
  Announcement: 'bg-meta-3/10 text-meta-3',
  Other: 'bg-meta-9 text-bodydark',
};

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'Announcement', priority: 'normal' });
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const res = await noticeBoardApi.list();
      setNotices(res.data);
    } catch {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const filtered = catFilter === 'All' ? notices : notices.filter(n => n.category === catFilter);

  const handlePublish = async () => {
    if (!form.title.trim()) { toast.error('Notice title required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('priority', form.priority);
      if (fileRef.current?.files?.[0]) fd.append('file', fileRef.current.files[0]);
      await noticeBoardApi.create(fd);
      toast.success('Notice published');
      setModal(false);
      setForm({ title: '', category: 'Announcement', priority: 'normal' });
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await noticeBoardApi.delete(deleteId);
      setNotices(p => p.filter(n => n.id !== deleteId));
      setDeleteId(null);
      toast.success('Notice deleted');
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Notice Board</h2>
          <p className="text-sm text-bodydark">{notices.length} notices · {notices.filter(n => n.priority === 'high').length} high priority</p>
        </div>
        <button onClick={() => setModal(true)} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">+ Post Notice</button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${catFilter === c ? 'bg-primary text-white' : 'bg-white border border-stroke text-bodydark hover:bg-gray-1'}`}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="spinner" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => (
            <div key={n.id} className={`rounded-sm border bg-white shadow-default p-5 flex items-start gap-4 ${n.priority === 'high' ? 'border-meta-1/30' : 'border-stroke'}`}>
              <div className="flex-shrink-0 mt-0.5">
                {n.priority === 'high'
                  ? <div className="w-10 h-10 rounded-full bg-meta-1/10 flex items-center justify-center text-meta-1 text-lg">📣</div>
                  : <div className="w-10 h-10 rounded-full bg-gray-1 flex items-center justify-center text-bodydark text-lg">📌</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLOR[n.category] || CAT_COLOR.Other}`}>{n.category}</span>
                  {n.priority === 'high' && <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-meta-1/10 text-meta-1">High Priority</span>}
                </div>
                <h3 className="text-sm font-semibold text-black leading-snug">{n.title}</h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-bodydark">
                  <span>By {n.posted_by}</span>
                  <span>·</span>
                  <span>{n.date || n.created_at?.split('T')[0]}</span>
                  {n.file_name && (
                    <>
                      <span>·</span>
                      <button className="text-primary hover:underline flex items-center gap-1">
                        📄 {n.file_name}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setDeleteId(n.id)} className="text-xs text-meta-1 hover:underline flex-shrink-0">Delete</button>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-sm border border-stroke bg-white shadow-default p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-medium text-black">No notices found</h3>
              <p className="text-sm text-bodydark mt-1">There are no notices in this category.</p>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke">
              <h3 className="font-semibold text-black">Post Notice</h3>
              <button onClick={() => setModal(false)} className="text-bodydark hover:text-black">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Title *</label>
                <input value={form.title} onChange={set('title')} placeholder="Enter notice title…" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Category</label>
                  <select value={form.category} onChange={set('category')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-bodydark mb-1.5">Priority</label>
                  <select value={form.priority} onChange={set('priority')} className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary">
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-bodydark mb-1.5">Attachment (optional)</label>
                <input ref={fileRef} type="file" className="w-full rounded border border-stroke px-3 py-2 text-sm text-black outline-none focus:border-primary" />
                <p className="text-xs text-bodydark mt-1">PDF, image, or document files</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setModal(false)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handlePublish} disabled={saving} className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Publishing…' : 'Publish Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-meta-1/10 flex items-center justify-center mx-auto text-2xl text-meta-1">⚠</div>
              <h3 className="font-semibold text-black">Delete Notice?</h3>
              <p className="text-sm text-bodydark">This notice will be permanently removed.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stroke">
              <button onClick={() => setDeleteId(null)} className="rounded border border-stroke bg-white px-5 py-2 text-sm font-medium text-black hover:bg-gray-1">Cancel</button>
              <button onClick={handleDelete} className="rounded bg-meta-1 px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

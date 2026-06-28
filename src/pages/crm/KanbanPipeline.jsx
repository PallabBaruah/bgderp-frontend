import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/client';

const COLUMNS   = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
// ATE DVR visit stage display labels
const COL_LABEL = {
  new:         'New',
  contacted:   'Welcome Visit',
  qualified:   'Reminder Visit',
  proposal:    'Follow Up',
  negotiation: 'Repeat',
  won:         'Won',
  lost:        'Lost',
};

const COL_META = {
  new:         { bg: 'bg-gray-2',      border: 'border-stroke',         badge: 'bg-bodydark/10 text-bodydark' },
  contacted:   { bg: 'bg-meta-5/5',   border: 'border-meta-5/30',      badge: 'bg-meta-5/10 text-meta-5' },
  qualified:   { bg: 'bg-meta-3/5',   border: 'border-meta-3/30',      badge: 'bg-meta-3/10 text-meta-3' },
  proposal:    { bg: 'bg-meta-6/5',   border: 'border-meta-6/30',      badge: 'bg-meta-6/10 text-meta-6' },
  negotiation: { bg: 'bg-meta-8/5',   border: 'border-meta-8/30',      badge: 'bg-meta-8/10 text-meta-8' },
  won:         { bg: 'bg-meta-3/10',  border: 'border-meta-3/50',      badge: 'bg-meta-3/15 text-meta-3' },
  lost:        { bg: 'bg-meta-1/5',   border: 'border-meta-1/30',      badge: 'bg-meta-1/10 text-meta-1' },
};

const cardify = (l) => ({
  id:      l.id,
  company: l.company || l.name || '—',
  contact: l.name || '—',
  value:   Number(l.expected_value) || 0,
  source:  l.source || 'Direct',
  category: l.category || null,
  product:  l.product_enquired || null,
  visits:   (l.visits || []).length,
});

export default function KanbanPipeline() {
  const [cards, setCards]       = useState(Object.fromEntries(COLUMNS.map(c => [c, []])));
  const [loading, setLoading]   = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await leadsApi.kanban();
      const data = res.data ?? {};
      const mapped = {};
      COLUMNS.forEach(col => {
        mapped[col] = (data[col] ?? []).map(cardify);
      });
      setCards(mapped);
    } catch { toast.error('Failed to load kanban'); }
    finally { setLoading(false); }
  }

  const onDragStart = (col, id) => setDragging({ col, id });
  const onDragOver  = (e, col) => { e.preventDefault(); setDragOver(col); };

  const onDrop = async (e, toCol) => {
    e.preventDefault();
    if (!dragging || dragging.col === toCol) { setDragging(null); setDragOver(null); return; }
    const card = cards[dragging.col]?.find(c => c.id === dragging.id);
    if (!card) { setDragging(null); setDragOver(null); return; }

    setCards(prev => ({
      ...prev,
      [dragging.col]: prev[dragging.col].filter(c => c.id !== dragging.id),
      [toCol]: [card, ...prev[toCol]],
    }));
    setDragging(null);
    setDragOver(null);

    setUpdating(card.id);
    try {
      await leadsApi.update(card.id, { status: toCol });
      toast.success(`Moved to ${COL_LABEL[toCol]}`);
    } catch {
      toast.error('Update failed');
      load();
    } finally { setUpdating(null); }
  };

  const totalValue = Object.values(cards).flat().reduce((s, c) => s + c.value, 0);
  const wonValue   = (cards.won || []).reduce((s, c) => s + c.value, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="spinner" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">Kanban Pipeline</h2>
          <p className="text-sm text-bodydark">Pipeline: ₹{(totalValue/100000).toFixed(1)}L · Won: ₹{(wonValue/100000).toFixed(1)}L</p>
        </div>
        <div className="flex gap-2">
          <Link to="/crm/leads" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">List View</Link>
          <button onClick={load} className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1 shadow-default">Refresh</button>
        </div>
      </div>

      <div className="kanban-board pb-4">
        {COLUMNS.map(col => {
          const meta     = COL_META[col];
          const colCards = cards[col] || [];
          const colValue = colCards.reduce((s, c) => s + c.value, 0);
          return (
            <div
              key={col}
              className={`kanban-col rounded-sm border-2 ${meta.border} ${meta.bg} ${dragOver === col ? 'ring-2 ring-primary' : ''}`}
              onDragOver={e => onDragOver(e, col)}
              onDrop={e => onDrop(e, col)}
            >
              <div className="flex items-center justify-between px-3 py-3 border-b border-stroke/50">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>{COL_LABEL[col]}</span>
                  <span className="text-xs text-bodydark">({colCards.length})</span>
                </div>
                <span className="text-xs text-bodydark">₹{(colValue/1000).toFixed(0)}K</span>
              </div>

              <div className="p-2 space-y-2 min-h-[200px]">
                {colCards.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-bodydark/60 italic">Drop leads here</div>
                )}
                {colCards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => onDragStart(col, card.id)}
                    className={`rounded bg-white border border-stroke p-3 shadow-default cursor-grab active:cursor-grabbing transition-all hover:shadow-card ${dragging?.id === card.id ? 'opacity-50 scale-95' : ''} ${updating === card.id ? 'animate-pulse' : ''}`}
                  >
                    <div className="font-medium text-sm text-black mb-0.5">{card.company}</div>
                    <div className="text-xs text-bodydark mb-1.5">{card.contact}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {card.category && <span className="text-[10px] rounded bg-meta-5/10 text-meta-5 px-1.5 py-0.5">{card.category}</span>}
                      {card.product  && <span className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5">{card.product}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">{card.value > 0 ? `₹${card.value.toLocaleString()}` : '—'}</span>
                      <span className="text-[10px] text-bodydark bg-gray-1 rounded-full px-2 py-0.5">{card.visits} / 5 visits</span>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t border-stroke">
                      <Link to={`/crm/leads/${card.id}`} className="text-[10px] text-primary hover:underline">View</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-bodydark text-center">Drag cards between columns to update lead stage</p>
    </div>
  );
}

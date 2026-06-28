export function StatusBadge({ status }) {
  const MAP = {
    active:    'badge-green',
    approved:  'badge-green',
    present:   'badge-green',
    on_leave:  'badge-indigo',
    pending:   'badge-amber',
    late:      'badge-amber',
    half_day:  'badge-blue',
    absent:    'badge-red',
    inactive:  'badge-gray',
    rejected:  'badge-red',
    cancelled: 'badge-gray',
    draft:     'badge-gray',
    review:    'badge-amber',
    processing:'badge-blue',
    disbursed: 'badge-green',
  };
  const cls = MAP[status] || 'badge-gray';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export function Badge({ label, color = 'gray' }) {
  return <span className={`badge badge-${color}`}>{label}</span>;
}

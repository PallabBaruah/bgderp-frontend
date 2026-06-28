import { useState, useEffect } from 'react';
import { gstConfigApi } from '../api/client';

const FALLBACK = [
  { value: 0, label: '0%', shortLabel: '0%' },
  { value: 5, label: '5%', shortLabel: '5%' },
  { value: 12, label: '12%', shortLabel: '12%' },
  { value: 18, label: '18%', shortLabel: '18%' },
  { value: 28, label: '28%', shortLabel: '28%' },
];

// Returns GST rate options from admin-configured GSTConfig, falling back to standard Indian slabs.
export function useGSTRates() {
  const [rates, setRates] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gstConfigApi.list()
      .then(r => {
        const configs = Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.results || []);
        const active = configs.filter(c => c.is_active);
        if (active.length === 0) { setRates(FALLBACK); return; }
        const seen = new Set();
        const mapped = active
          .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))
          .filter(c => {
            const v = parseFloat(c.rate);
            if (seen.has(v)) return false;
            seen.add(v);
            return true;
          })
          .map(c => ({ value: parseFloat(c.rate), label: `${c.name} (${parseFloat(c.rate)}%)`, shortLabel: `${parseFloat(c.rate)}%` }));
        setRates(mapped);
      })
      .catch(() => setRates(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading };
}

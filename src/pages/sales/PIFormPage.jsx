import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DocumentForm from './DocumentForm';
import { salesApi } from '../../api/client';

export default function PIFormPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id && id !== 'new') {
      salesApi.getPI(id).then(r => { setDoc(r.data); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center text-bodydark">Loading…</div>;
  return <DocumentForm docType="pi" existing={doc} />;
}

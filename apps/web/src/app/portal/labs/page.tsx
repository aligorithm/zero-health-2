'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, LabResult } from '@/lib/api';
import { Empty, prettyWhen } from '@/components/ui';
import { LabImage } from '@/components/lists';

export default function LabsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LabResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<LabResult[]>('/lab-results');
      if (!cancelled) setRows(ok && Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const isStaff = user.role !== 'patient';

  return (
    <>
      <div className="page-head">
        <h1>Lab results</h1>
        <p>{isStaff ? 'All results across the panel.' : 'Your results. Select one for details.'}</p>
      </div>
      <div className="panel">
        {rows === null ? (
          <p className="empty">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty text="No results yet." />
        ) : (
          rows.map((l) => (
            <div className="row" key={l.id}>
              <div>
                <a className="t row-title-link" href={`/portal/labs/${l.id}`}>
                  {l.panel}
                  {isStaff && l.patient_name ? ` · ${l.patient_name}` : ''}
                </a>
                <div className="s">
                  {l.value}
                  {l.recorded_by_name ? ` · ${l.recorded_by_name}` : ''} · {prettyWhen(l.created_at)}
                </div>
              </div>
              {l.image_path && <LabImage name={l.image_path} alt={l.panel} />}
            </div>
          ))
        )}
      </div>
    </>
  );
}

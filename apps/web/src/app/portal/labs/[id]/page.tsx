'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, LabResult } from '@/lib/api';
import { prettyWhen } from '@/components/ui';

export default function LabDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const [lab, setLab] = useState<LabResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<LabResult>(`/lab-results/${params.id}`);
      if (cancelled) return;
      if (ok) setLab(data);
      else setError(data.error || 'Could not load this result.');
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!user) return null;
  if (error) {
    return (
      <div className="panel">
        <h2>Lab result</h2>
        <p className="empty">{error}</p>
        <a className="back-link" href="/portal/labs">
          ← All results
        </a>
      </div>
    );
  }
  if (!lab) return <p className="empty">Loading…</p>;

  const isStaff = user.role !== 'patient';

  return (
    <>
      <a className="back-link" href="/portal/labs">
        ← All results
      </a>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <h1>{lab.panel}</h1>
        <p>
          Collected {prettyWhen(lab.created_at)}
          {lab.recorded_by_name ? ` · performed by ${lab.recorded_by_name}` : ''}
        </p>
      </div>

      <div className="panel">
        <h2>Result</h2>
        <div className="detail-grid">
          <div>
            <div className="lbl">Panel</div>
            <div>{lab.panel}</div>
          </div>
          <div>
            <div className="lbl">Value</div>
            <div>{lab.value}</div>
          </div>
          {isStaff && (
            <div>
              <div className="lbl">Patient</div>
              <div>{lab.patient_name || `Patient ${lab.patient_id}`}</div>
            </div>
          )}
          <div>
            <div className="lbl">Collected</div>
            <div>{prettyWhen(lab.created_at)}</div>
          </div>
          <div>
            <div className="lbl">Performed by</div>
            <div>{lab.recorded_by_name || 'Unknown'}</div>
          </div>
        </div>
      </div>

      {lab.interpretation && (
        <div className="panel">
          <h2>Clinical interpretation</h2>
          <p className="empty" style={{ marginBottom: 0 }}>{lab.interpretation}</p>
        </div>
      )}

      {lab.image_path && (
        <div className="panel">
          <h2>Result image</h2>
          <div className="lab-detail-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${lab.image_path}`} alt={`Result image for ${lab.panel}`} />
          </div>
        </div>
      )}
    </>
  );
}

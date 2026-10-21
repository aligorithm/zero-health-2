'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, LabResult, Prescription } from '@/lib/api';
import { LabList, RxList } from '@/components/lists';
import { AccessDenied } from '@/components/ui';

export default function RecordsPage() {
  const { user } = useAuth();
  const [rx, setRx] = useState<Prescription[] | null>(null);
  const [labs, setLabs] = useState<LabResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rxRes, labRes] = await Promise.all([
        api<Prescription[]>('/me/prescriptions'),
        api<LabResult[]>('/me/lab-results'),
      ]);
      if (!cancelled) {
        setRx(rxRes.ok ? rxRes.data : []);
        setLabs(labRes.ok ? labRes.data : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.role !== 'patient') return <AccessDenied />;

  return (
    <>
      <div className="page-head">
        <h1>My records</h1>
        <p>Your prescriptions and lab results.</p>
      </div>
      <div className="panel">
        <h2>
          Prescriptions
          <span className="s" style={{ fontWeight: 400 }}>
            show the code at the pharmacy
          </span>
        </h2>
        {rx === null ? <p className="empty">Loading…</p> : <RxList rows={rx} showCode />}
      </div>
      <div className="panel">
        <h2>
          Lab results
          <a className="s" style={{ fontWeight: 400 }} href="/portal/labs">
            All results →
          </a>
        </h2>
        {labs === null ? <p className="empty">Loading…</p> : <LabList rows={labs} showImages />}
      </div>
    </>
  );
}

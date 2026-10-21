'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, PatientPanelUser } from '@/lib/api';
import { PatientsPanel } from '@/components/patients-panel';
import { AccessDenied } from '@/components/ui';

export default function PatientsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PatientPanelUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<PatientPanelUser[]>('/patients');
      if (!cancelled) setRows(ok ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.role === 'patient') return <AccessDenied />;

  return (
    <>
      <div className="page-head">
        <h1>Patients</h1>
        <p>Your patient panel.</p>
      </div>
      <div className="panel">
        {rows === null ? <p className="empty">Loading…</p> : <PatientsPanel rows={rows} role={user.role} />}
      </div>
    </>
  );
}

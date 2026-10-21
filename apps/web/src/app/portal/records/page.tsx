'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, LabResult, Prescription } from '@/lib/api';
import { LabList, RxList } from '@/components/lists';
import { AccessDenied } from '@/components/ui';

export default function RecordsPage() {
  const { user } = useAuth();
  const [rx, setRx] = useState<Prescription[] | null>(null);
  const [labs, setLabs] = useState<LabResult[] | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [rxRes, labRes] = await Promise.all([
      api<Prescription[]>('/me/prescriptions'),
      api<LabResult[]>('/me/lab-results'),
    ]);
    setRx(rxRes.ok ? rxRes.data : []);
    setLabs(labRes.ok ? labRes.data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [refillBusy, setRefillBusy] = useState(0);
  const [refillNotice, setRefillNotice] = useState('');

  async function requestRefill(rx: Prescription): Promise<void> {
    setRefillBusy(rx.id);
    setRefillNotice('');
    const { ok, data } = await api<Prescription>(`/prescriptions/${rx.id}/refill`, { method: 'POST' });
    setRefillBusy(0);
    if (!ok) {
      setRefillNotice(data.error || 'Could not request refill.');
      return;
    }
    setRefillNotice(`Refill requested for ${rx.medication}. Your doctor will review it.`);
    await load();
  }

  if (!user || user.role !== 'patient') return <AccessDenied />;

  return (
    <>
      <div className="page-head">
        <h1>My records</h1>
        <p>Your prescriptions and lab results.</p>
      </div>
      {refillNotice && <div className="collect-notice">{refillNotice}</div>}
      <div className="panel">
        <h2>
          Prescriptions
          <span className="s" style={{ fontWeight: 400 }}>
            show the code at the pharmacy
          </span>
        </h2>
        {rx === null ? (
          <p className="empty">Loading…</p>
        ) : (
          rx.map((r) => (
            <div className="row" key={r.id}>
              <div>
                <div className="t">
                  {r.medication}
                  {r.status === 'pending' && r.collection_code && (
                    <>
                      {' '}
                      <span className="code-chip">{r.collection_code}</span>
                    </>
                  )}
                </div>
                <div className="s">
                  {r.dosage}
                  {r.frequency ? ` · ${r.frequency}` : ''}
                  {r.status === 'collected' && r.collected_at ? ` · collected ${r.collected_at}` : ''}
                </div>
                {r.instructions && <div className="s">{r.instructions}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {r.status === 'collected' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => requestRefill(r)} disabled={refillBusy === r.id}>
                    {refillBusy === r.id ? 'Requesting…' : 'Request refill'}
                  </button>
                )}
                <span className={`pill ${r.status}`}>
                  {r.status === 'refill-requested' ? 'Refill requested' : r.status === 'pending' ? 'Awaiting collection' : r.status === 'collected' ? 'Collected' : r.status}
                </span>
              </div>
            </div>
          ))
        )}
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

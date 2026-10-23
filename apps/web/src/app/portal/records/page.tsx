'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, LabResult, MedicalHistory, Prescription } from '@/lib/api';
import { LabList, RxList } from '@/components/lists';
import { AccessDenied } from '@/components/ui';

export default function RecordsPage() {
  const { user } = useAuth();
  const [rx, setRx] = useState<Prescription[] | null>(null);
  const [labs, setLabs] = useState<LabResult[] | null>(null);

  const [history, setHistory] = useState<MedicalHistory | null>(null);
  const [historyLocked, setHistoryLocked] = useState(false);
  const [historyJson, setHistoryJson] = useState(
    '{\n  "conditions": ["Synthetic condition"],\n  "medications": [],\n  "allergies": []\n}'
  );
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState('');
  const [importNotice, setImportNotice] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const [rxRes, labRes, histRes] = await Promise.all([
      api<Prescription[]>('/me/prescriptions'),
      api<LabResult[]>('/me/lab-results'),
      api<MedicalHistory | null>('/me/medical-history'),
    ]);
    setRx(rxRes.ok ? rxRes.data : []);
    setLabs(labRes.ok ? labRes.data : []);
    if (histRes.status === 402) {
      setHistoryLocked(true);
      return;
    }
    setHistoryLocked(false);
    setHistory(histRes.ok ? histRes.data : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function importHistory(): Promise<void> {
    setImportBusy(true);
    setImportError('');
    setImportNotice('');
    let parsed: { conditions?: string[]; medications?: string[]; allergies?: string[] };
    try {
      parsed = JSON.parse(historyJson);
    } catch {
      setImportBusy(false);
      setImportError('That is not valid JSON.');
      return;
    }
    const { ok, data } = await api<MedicalHistory>('/me/medical-history', {
      method: 'POST',
      body: parsed,
    });
    setImportBusy(false);
    if (!ok) {
      setImportError(data.error || 'Import failed.');
      return;
    }
    setImportNotice('Medical history imported.');
    await load();
  }

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

      {historyLocked ? (
        <div className="panel upsell">
          <h2>Medical history import</h2>
          <p className="empty" style={{ marginBottom: 14 }}>
            Importing your medical history is part of Zero Health Plus.
          </p>
          <a className="btn btn-primary" href="/portal/plus">
            See plans
          </a>
        </div>
      ) : (
        <div className="panel">
          <h2>Medical history</h2>
          {importNotice && <div className="collect-notice">{importNotice}</div>}
          {history ? (
            <>
              <div className="detail-grid">
                <div>
                  <div className="lbl">Conditions</div>
                  <div>{(JSON.parse(history.conditions || '[]') as string[]).join(', ') || 'None recorded'}</div>
                </div>
                <div>
                  <div className="lbl">Medications</div>
                  <div>{(JSON.parse(history.medications || '[]') as string[]).join(', ') || 'None recorded'}</div>
                </div>
                <div>
                  <div className="lbl">Allergies</div>
                  <div>{(JSON.parse(history.allergies || '[]') as string[]).join(', ') || 'None recorded'}</div>
                </div>
                <div>
                  <div className="lbl">Imported</div>
                  <div>{history.created_at}</div>
                </div>
              </div>
              <p className="empty" style={{ marginTop: 12 }}>
                Import again below to replace it.
              </p>
            </>
          ) : (
            <p className="empty">No history imported yet.</p>
          )}
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="hist_json">Import history (JSON)</label>
            <textarea
              id="hist_json"
              value={historyJson}
              onChange={(e) => setHistoryJson(e.target.value)}
              spellCheck={false}
              style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13 }}
            />
          </div>
          <div className="err">{importError}</div>
          <button className="btn btn-primary" onClick={importHistory} disabled={importBusy}>
            {importBusy ? 'Importing…' : 'Import history'}
          </button>
        </div>
      )}
    </>
  );
}

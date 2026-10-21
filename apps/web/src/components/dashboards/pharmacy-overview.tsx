'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Prescription, User } from '@/lib/api';
import { Empty, Pill } from '../ui';
import { Modal } from '../modal';

export function PharmacyOverview({ user }: { user: User }) {
  const [rows, setRows] = useState<Prescription[] | null>(null);
  const [target, setTarget] = useState<Prescription | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<Prescription[]>('/prescriptions');
    setRows(ok && Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function collect(): Promise<void> {
    if (!target) return;
    setBusy(true);
    setError('');
    const { ok, status, data } = await api<Prescription>(`/prescriptions/${target.id}/collect`, {
      method: 'POST',
      body: { code: code.trim().toUpperCase() },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || `Collection failed (HTTP ${status}).`);
      return;
    }
    setTarget(null);
    setCode('');
    setNotice(`Prescription ${data.id} collected for ${data.patient_name || 'patient'}.`);
    await load();
  }

  const pending = (rows || []).filter((r) => r.status === 'pending');
  const collected = (rows || []).filter((r) => r.status === 'collected');
  const cancelled = (rows || []).filter((r) => r.status === 'cancelled');

  return (
    <>
      <div className="page-head">
        <h1>Pharmacy overview</h1>
        <p>Signed in as {user.role}. Verify the collection code before handing anything over.</p>
      </div>
      {notice && <div className="collect-notice">{notice}</div>}
      {rows === null ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <div className="lbl">Awaiting collection</div>
              <div className="val v">{pending.length}</div>
            </div>
            <div className="stat">
              <div className="lbl">Collected</div>
              <div className="val">{collected.length}</div>
            </div>
          </div>

          <div className="panel">
            <h2>Dispensing queue</h2>
            {pending.length === 0 ? (
              <Empty text="Nothing waiting for collection." />
            ) : (
              pending.map((r) => (
                <div className="row" key={r.id}>
                  <div>
                    <div className="t">
                      {r.medication} · {r.patient_name || 'Patient'}
                    </div>
                    <div className="s">
                      {r.dosage}
                      {r.frequency ? ` · ${r.frequency}` : ''}
                      {r.prescriber_name ? ` · prescribed by ${r.prescriber_name}` : ''}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setTarget(r);
                      setCode('');
                      setError('');
                    }}
                  >
                    Collect
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <h2>Collected</h2>
            {collected.length === 0 ? (
              <Empty text="No collected prescriptions yet." />
            ) : (
              collected.map((r) => (
                <div className="row" key={r.id}>
                  <div>
                    <div className="t">
                      {r.medication} · {r.patient_name || 'Patient'}
                    </div>
                    <div className="s">collected {r.collected_at}</div>
                  </div>
                  <Pill status={r.status} />
                </div>
              ))
            )}
          </div>

          {cancelled.length > 0 && (
            <div className="panel">
              <h2>Cancelled</h2>
              {cancelled.map((r) => (
                <div className="row" key={r.id}>
                  <div>
                    <div className="t">
                      {r.medication} · {r.patient_name || 'Patient'}
                    </div>
                    <div className="s">{r.dosage}</div>
                  </div>
                  <Pill status={r.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {target && (
        <Modal
          title="Collect prescription"
          sub={`${target.medication} for ${target.patient_name || 'patient'}. Ask the patient for their collection code.`}
          onClose={() => setTarget(null)}
        >
          <div className="field">
            <label htmlFor="collect_code">Collection code</label>
            <input
              id="collect_code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="6-character code"
              style={{ fontFamily: 'ui-monospace,monospace', letterSpacing: '0.15em', textTransform: 'uppercase' }}
              maxLength={6}
            />
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={collect} disabled={busy || code.trim().length === 0}>
              {busy ? 'Checking…' : 'Verify and collect'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

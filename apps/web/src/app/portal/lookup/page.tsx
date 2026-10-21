'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { AccessDenied } from '@/components/ui';

type Kind = 'prescriptions' | 'lab-results';

export default function LookupPage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind>('prescriptions');
  const [id, setId] = useState('2');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string>('');

  if (!user || user.role !== 'patient') return <AccessDenied />;

  async function fetchRecord(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setOutput('');
    const { status, data } = await api<unknown>(`/${kind}/${id}`);
    setBusy(false);
    setOutput(`HTTP ${status}\n` + JSON.stringify(data, null, 2));
  }

  return (
    <>
      <div className="page-head">
        <h1>Record lookup</h1>
        <p>Fetch a record by its ID.</p>
      </div>
      <div className="panel">
        <form className="inline-form" onSubmit={fetchRecord}>
          <div style={{ flex: 0 }}>
            <label htmlFor="lookup_kind">Record type</label>
            <select
              id="lookup_kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              <option value="prescriptions">Prescription</option>
              <option value="lab-results">Lab result</option>
            </select>
          </div>
          <div style={{ flex: 0 }}>
            <label htmlFor="lookup_id">ID</label>
            <input
              id="lookup_id"
              type="number"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="ID"
              style={{ maxWidth: 120 }}
            />
          </div>
          <div style={{ flex: 0 }}>
            <button className="btn btn-ghost" type="submit" disabled={busy || !id} style={{ marginTop: 21 }}>
              {busy ? 'Fetching…' : 'Fetch'}
            </button>
          </div>
        </form>
        <div className="out" aria-live="polite">
          {output || 'No request yet.'}
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Appointment, LabResult, PatientPanelUser, Prescription } from '@/lib/api';
import { AccessDenied, Empty, Pill, prettyWhen } from '@/components/ui';

type SearchType = 'patients' | 'prescriptions' | 'appointments' | 'lab-results';

const TYPES_BY_ROLE: Record<string, SearchType[]> = {
  doctor: ['patients', 'prescriptions', 'appointments', 'lab-results'],
  admin: ['patients', 'prescriptions', 'appointments', 'lab-results'],
  pharmacist: ['prescriptions'],
  labtech: ['lab-results'],
};

const LABELS: Record<SearchType, string> = {
  patients: 'Patients',
  prescriptions: 'Prescriptions',
  appointments: 'Appointments',
  'lab-results': 'Lab results',
};

interface SearchResponse {
  query: string;
  type: SearchType;
  results:
    | PatientPanelUser[]
    | Prescription[]
    | Appointment[]
    | LabResult[];
}

export default function SearchPage() {
  const { user } = useAuth();
  const allowed = user ? TYPES_BY_ROLE[user.role] || [] : [];
  const [q, setQ] = useState('');
  const [type, setType] = useState<SearchType>(allowed[0] || 'patients');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (allowed.length > 0) setType(allowed[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  if (!user || allowed.length === 0) return <AccessDenied />;

  async function run(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true);
    const { ok, data } = await api<SearchResponse>(
      `/search?q=${encodeURIComponent(q.trim())}&type=${type}`
    );
    setBusy(false);
    setSearched(true);
    setResult(ok ? data : null);
  }

  const results = result?.results || [];

  return (
    <>
      <div className="page-head">
        <h1>Search</h1>
        <p>Find patients, prescriptions, appointments, and lab results.</p>
      </div>
      <div className="panel">
        <form className="inline-form" onSubmit={run}>
          <div style={{ flex: 1 }}>
            <label htmlFor="search_q">Query</label>
            <input
              id="search_q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={type === 'patients' ? 'Name or email…' : 'Name, medication, or panel…'}
            />
          </div>
          {allowed.length > 1 && (
            <div style={{ flex: 0 }}>
              <label htmlFor="search_type">Type</label>
              <select id="search_type" value={type} onChange={(e) => setType(e.target.value as SearchType)}>
                {allowed.map((t) => (
                  <option key={t} value={t}>
                    {LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ flex: 0 }}>
            <button className="btn btn-primary" type="submit" disabled={busy || !q.trim()} style={{ marginTop: 21 }}>
              {busy ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {searched && (
        <div className="panel">
          <h2>
            Results
            <span className="s" style={{ fontWeight: 400 }}>
              {results.length} match{results.length === 1 ? '' : 'es'} for &quot;{result?.query}&quot;
            </span>
          </h2>
          {!result ? (
            <Empty text="Search failed." />
          ) : results.length === 0 ? (
            <Empty text="Nothing found." />
          ) : result.type === 'patients' ? (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Email</th>
                  <th>Current Rx</th>
                </tr>
              </thead>
              <tbody>
                {(results as PatientPanelUser[]).map((p) => (
                  <tr key={p.id}>
                    <td>{p.full_name}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{p.email}</td>
                    <td>{p.active_rx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : result.type === 'prescriptions' ? (
            <table>
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Patient</th>
                  <th>Dosage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(results as Prescription[]).map((r) => (
                  <tr key={r.id}>
                    <td>{r.medication}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{r.patient_name || ''}</td>
                    <td>{r.dosage}</td>
                    <td>
                      <Pill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : result.type === 'appointments' ? (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Patient</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(results as Appointment[]).map((a) => (
                  <tr key={a.id}>
                    <td>{prettyWhen(a.scheduled_for)}</td>
                    <td>{a.kind}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{a.patient_name || ''}</td>
                    <td>
                      <Pill status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Panel</th>
                  <th>Patient</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {(results as LabResult[]).map((l) => (
                  <tr key={l.id}>
                    <td>{l.panel}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{l.patient_name || ''}</td>
                    <td>{l.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

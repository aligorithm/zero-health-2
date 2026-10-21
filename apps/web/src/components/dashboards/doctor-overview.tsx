'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Appointment, PatientPanelUser, Prescription, User } from '@/lib/api';
import { PatientsPanel } from '../patients-panel';
import { Modal } from '../modal';
import { prettyWhen } from '../ui';

export function DoctorOverview({ user }: { user: User }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [panel, setPanel] = useState<PatientPanelUser[] | null>(null);
  const [queue, setQueue] = useState<Prescription[]>([]);
  const [notesAppt, setNotesAppt] = useState<Appointment | null>(null);
  const [notesText, setNotesText] = useState('');
  const [outcomeText, setOutcomeText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const [a, p, q] = await Promise.all([
      api<Appointment[]>('/appointments'),
      api<PatientPanelUser[]>('/patients'),
      api<Prescription[]>('/prescriptions'),
    ]);
    setAppts(a.ok ? a.data : []);
    setPanel(p.ok ? p.data : []);
    setQueue(q.ok && Array.isArray(q.data) ? q.data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNotes(): Promise<void> {
    if (!notesAppt) return;
    setBusy(true);
    setError('');
    const { ok, data } = await api<Appointment>(`/appointments/${notesAppt.id}/notes`, {
      method: 'PUT',
      body: { notes: notesText, outcome: outcomeText },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Could not save.');
      return;
    }
    setNotesAppt(null);
    await load();
  }

  const upcoming = (appts || []).filter((a) => a.status === 'scheduled');
  const activeRx = queue.filter((r) => r.status === 'active').length;

  return (
    <>
      <div className="page-head">
        <h1>Clinical overview</h1>
        <p>Signed in as {user.role}.</p>
      </div>
      {appts === null || panel === null ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <div className="lbl">Patients</div>
              <div className="val v">{panel.length}</div>
            </div>
            <div className="stat">
              <div className="lbl">Scheduled visits</div>
              <div className="val">{upcoming.length}</div>
            </div>
            <div className="stat">
              <div className="lbl">Active prescriptions</div>
              <div className="val">{activeRx}</div>
            </div>
          </div>
          <div className="panel">
            <h2>Upcoming appointments</h2>
            <AppointmentListWithNotes
              rows={appts}
              onNotes={(a) => {
                setNotesAppt(a);
                setNotesText(a.notes || '');
                setOutcomeText(a.outcome || '');
                setError('');
              }}
            />
          </div>
          <div className="panel">
            <h2>Patient panel</h2>
            <PatientsPanel rows={panel} role={user.role} />
          </div>
        </>
      )}

      {notesAppt && (
        <Modal
          title="Appointment chart"
          sub={`${notesAppt.patient_name || 'Patient'} · ${notesAppt.kind} · ${notesAppt.scheduled_for}`}
          onClose={() => setNotesAppt(null)}
        >
          <div className="field">
            <label htmlFor="note_text">Notes (visible to the patient)</label>
            <textarea
              id="note_text"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Observations, pre-visit instructions, follow-up guidance."
            />
          </div>
          <div className="field">
            <label htmlFor="outcome_text">Outcome and follow-ups</label>
            <textarea
              id="outcome_text"
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
              placeholder="Results of the appointment and any follow-ups needed."
            />
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setNotesAppt(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveNotes} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function AppointmentListWithNotes({
  rows,
  onNotes,
}: {
  rows: Appointment[];
  onNotes: (a: Appointment) => void;
}) {
  if (!rows || rows.length === 0) return <p className="empty">No appointments.</p>;
  return (
    <>
      {rows.map((a) => (
        <div className="row" key={a.id}>
          <div style={{ minWidth: 0 }}>
            <a className="t row-title-link" href={`/portal/appointments/${a.id}`}>
              {a.patient_name || 'Patient'}
            </a>
            <div className="s">
              {prettyWhen(a.scheduled_for)} · {a.kind} · {a.modality}
            </div>
            {a.notes && <div className="s">Note: {a.notes}</div>}
            {a.outcome && <div className="s">Outcome: {a.outcome}</div>}
            {a.patient_feedback && <div className="s">Feedback: {a.patient_feedback}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNotes(a)}>
            Note
          </button>
        </div>
      ))}
    </>
  );
}

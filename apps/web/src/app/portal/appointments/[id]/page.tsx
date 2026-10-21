'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, Appointment } from '@/lib/api';
import { Pill, prettyWhen } from '@/components/ui';

const VISIT_LABELS: Record<string, string> = {
  'new-concern': 'New concern',
  'existing-condition': 'Existing condition',
  'follow-up': 'Follow-up',
  'routine-review': 'Routine review',
  'lab-test': 'Lab test',
};
import { Modal } from '@/components/modal';

export default function AppointmentDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<'notes' | 'outcome' | 'feedback' | 'reschedule' | null>(null);
  const [text, setText] = useState('');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<Appointment>(`/appointments/${params.id}`);
    if (ok) {
      setAppt(data);
      setError('');
    } else {
      setError(data.error || 'Could not load appointment.');
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;
  if (error) {
    return (
      <div className="panel">
        <h2>Appointment</h2>
        <p className="empty">{error}</p>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/portal/appointments')}>
          Back to appointments
        </button>
      </div>
    );
  }
  if (!appt) return <p className="empty">Loading…</p>;

  const isPatient = user.role === 'patient';
  const isClinician = appt.clinician_id === user.id;
  const canManage = (isPatient && appt.patient_id === user.id) || isClinician || user.role === 'admin';
  const canChart = isClinician || user.role === 'admin';

  async function saveNotes(): Promise<void> {
    if (!editing || !appt) return;
    setBusy(true);
    setNotice('');
    const body =
      editing === 'feedback'
        ? { patient_feedback: text }
        : editing === 'outcome'
          ? { outcome: text }
          : { notes: text };
    const { ok, data } = await api<Appointment>(`/appointments/${appt.id}/notes`, {
      method: 'PUT',
      body,
    });
    setBusy(false);
    if (!ok) {
      setNotice(data.error || 'Could not save.');
      return;
    }
    setAppt(data);
    setEditing(null);
  }

  async function reschedule(): Promise<void> {
    if (!appt || !when) return;
    setBusy(true);
    setNotice('');
    const { ok, data } = await api<Appointment>(`/appointments/${appt.id}/reschedule`, {
      method: 'PUT',
      body: { scheduled_for: when },
    });
    setBusy(false);
    if (!ok) {
      setNotice(data.error || 'Could not reschedule.');
      return;
    }
    setAppt(data);
    setEditing(null);
    setNotice('Appointment rescheduled.');
  }

  async function saveRating(value: number): Promise<void> {
    if (!appt) return;
    setBusy(true);
    setNotice('');
    const { ok, data } = await api<Appointment>(`/appointments/${appt.id}/rating`, {
      method: 'PUT',
      body: { rating: value },
    });
    setBusy(false);
    if (!ok) {
      setNotice(data.error || 'Could not save rating.');
      return;
    }
    setAppt(data);
  }

  async function cancel(): Promise<void> {
    if (!appt) return;
    setBusy(true);
    setNotice('');
    const { ok, data } = await api<Appointment>(`/appointments/${appt.id}/cancel`, { method: 'PUT' });
    setBusy(false);
    if (!ok) {
      setNotice(data.error || 'Could not cancel.');
      return;
    }
    setAppt(data);
    setNotice('Appointment cancelled.');
  }

  return (
    <>
      <a className="back-link" href="/portal/appointments">
        ← All appointments
      </a>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <h1 style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {appt.kind} <Pill status={appt.status} />
        </h1>
        <p>
          {prettyWhen(appt.scheduled_for)} · {appt.modality}
          {isPatient
            ? ` · with ${appt.clinician_name || 'your clinician'}`
            : ` · patient ${appt.patient_name || ''}`}
        </p>
      </div>

      {notice && <div className="collect-notice">{notice}</div>}

      <div className="panel">
        <h2>Details</h2>
        <div className="detail-grid">
          <div>
            <div className="lbl">Type</div>
            <div>{appt.kind}</div>
          </div>
          <div>
            <div className="lbl">When</div>
            <div>{prettyWhen(appt.scheduled_for)}</div>
          </div>
          <div>
            <div className="lbl">Modality</div>
            <div>{appt.modality}</div>
          </div>
          <div>
            <div className="lbl">Status</div>
            <div>{appt.status}</div>
          </div>
        </div>
        {canManage && appt.status === 'scheduled' && (
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing('reschedule');
                setWhen(appt.scheduled_for.slice(0, 16));
                setNotice('');
              }}
            >
              Reschedule
            </button>
            <button className="btn btn-ghost btn-sm" onClick={cancel} disabled={busy}>
               Cancel appointment
             </button>
           </div>
         )}
       </div>

      <div className="panel">
        <h2>Visit intake</h2>
        <div className="detail-grid">
          <div>
            <div className="lbl">Visit type</div>
            <div>{VISIT_LABELS[appt.visit_type || ''] || appt.visit_type || 'Not specified'}</div>
          </div>
          <div>
            <div className="lbl">Reason</div>
            <div>{appt.kind}</div>
          </div>
          <div>
            <div className="lbl">Reported symptoms</div>
            <div>{appt.symptoms || 'None reported'}</div>
          </div>
          <div>
            <div className="lbl">Current medication</div>
            <div>{appt.current_medications || 'None reported'}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>
          Doctor notes
          {canChart && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing('notes');
                setText(appt.notes || '');
                setNotice('');
              }}
            >
              {appt.notes ? 'Edit' : 'Add'}
            </button>
          )}
        </h2>
        {appt.notes ? <p className="empty" style={{ marginBottom: 0 }}>{appt.notes}</p> : <p className="empty">No notes yet.</p>}
      </div>

      <div className="panel">
        <h2>
          Outcome and follow-ups
          {canChart && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing('outcome');
                setText(appt.outcome || '');
                setNotice('');
              }}
            >
              {appt.outcome ? 'Edit' : 'Add'}
            </button>
          )}
        </h2>
        {appt.outcome ? <p className="empty" style={{ marginBottom: 0 }}>{appt.outcome}</p> : <p className="empty">No outcome recorded yet.</p>}
      </div>

      <div className="panel">
        <h2>Visit rating</h2>
        {isPatient && appt.patient_id === user.id ? (
          <div className="stars" role="radiogroup" aria-label="Rate your visit">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`star ${(appt.rating || 0) >= n ? 'star-filled' : ''}`}
                onClick={() => saveRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                disabled={busy}
              >
                ★
              </button>
            ))}
            {appt.rating ? <span className="s" style={{ marginLeft: 8 }}>{appt.rating} of 5</span> : <span className="s" style={{ marginLeft: 8 }}>Tap to rate</span>}
          </div>
        ) : appt.rating ? (
          <p className="empty" style={{ marginBottom: 0 }}>{'★'.repeat(appt.rating)} ({appt.rating} of 5)</p>
        ) : (
          <p className="empty">Not rated yet.</p>
        )}
      </div>

      <div className="panel">
        <h2>
          {isPatient ? 'Your feedback' : 'Patient feedback'}
          {isPatient && appt.patient_id === user.id && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditing('feedback');
                setText(appt.patient_feedback || '');
                setNotice('');
              }}
            >
              {appt.patient_feedback ? 'Edit' : 'Add'}
            </button>
          )}
        </h2>
        {appt.patient_feedback ? <p className="empty" style={{ marginBottom: 0 }}>{appt.patient_feedback}</p> : <p className="empty">No feedback yet.</p>}
      </div>

      {editing && editing !== 'reschedule' && (
        <Modal
          title={
            editing === 'notes' ? 'Doctor notes' : editing === 'outcome' ? 'Outcome and follow-ups' : 'Your feedback'
          }
          sub={`${appt.kind} on ${prettyWhen(appt.scheduled_for)}`}
          onClose={() => setEditing(null)}
        >
          <div className="field">
            <label htmlFor="appt_edit">
              {editing === 'notes'
                ? 'Visible to the patient before and after the visit.'
                : editing === 'outcome'
                  ? 'Results of the appointment and any follow-ups needed.'
                  : 'How the visit went.'}
            </label>
            <textarea id="appt_edit" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveNotes} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {editing === 'reschedule' && (
        <Modal title="Reschedule" sub={`${appt.kind} with ${appt.clinician_name || appt.patient_name || 'the care team'}`} onClose={() => setEditing(null)}>
          <div className="field">
            <label htmlFor="appt_when">New date and time</label>
            <input id="appt_when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={reschedule} disabled={busy || !when}>
              {busy ? 'Saving…' : 'Reschedule'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Appointment, Clinician, LabResult, Message, Prescription, User } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AppointmentLinkList, MessageList, RxList } from '../lists';
import { prettyWhen } from '../ui';
import { Modal } from '../modal';

interface PatientData {
  rx: Prescription[];
  appts: Appointment[];
  msgs: Message[];
  labs: LabResult[];
}

type Category = 'consultation' | 'lab';

const VISIT_LABELS: Record<string, string> = {
  'new-concern': 'new concern',
  'existing-condition': 'existing condition',
  'follow-up': 'follow-up',
  'routine-review': 'routine review',
  'lab-test': 'lab test',
};

export function PatientDashboard({ user }: { user: User }) {
  const [data, setData] = useState<PatientData | null>(null);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [booking, setBooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category>('consultation');
  const [clinicianId, setClinicianId] = useState('');
  const [visitType, setVisitType] = useState('new-concern');
  const [scheduledFor, setScheduledFor] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [kind, setKind] = useState('General consultation');
  const [symptoms, setSymptoms] = useState('');
  const [medications, setMedications] = useState('');
  const [modality, setModality] = useState('video');

  const load = useCallback(async (): Promise<void> => {
    const [rx, appts, msgs, labs] = await Promise.all([
      api<Prescription[]>('/me/prescriptions'),
      api<Appointment[]>('/me/appointments'),
      api<Message[]>('/me/messages'),
      api<LabResult[]>('/me/lab-results'),
    ]);
    setData({
      rx: rx.ok ? rx.data : [],
      appts: appts.ok ? appts.data : [],
      msgs: msgs.ok ? msgs.data : [],
      labs: labs.ok ? labs.data : [],
    });
  }, []);

  useEffect(() => {
    load();
    api<Clinician[]>('/clinicians').then(({ ok, data: d }) => {
      if (ok && Array.isArray(d)) {
        setClinicians(d);
        const firstDoctor = d.find((c) => c.role === 'doctor');
        if (firstDoctor) setClinicianId(String(firstDoctor.id));
      }
    });
  }, [load]);

  const eligibleClinicians = clinicians.filter((c) =>
    category === 'consultation' ? c.role === 'doctor' : c.role === 'labtech'
  );

  function switchCategory(next: Category): void {
    setCategory(next);
    const first = clinicians.find((c) => (next === 'consultation' ? c.role === 'doctor' : c.role === 'labtech'));
    if (first) setClinicianId(String(first.id));
    setKind(next === 'consultation' ? 'General consultation' : 'Blood panel');
    setModality(next === 'consultation' ? 'video' : 'in-person');
  }

  function startBooking(): void {
    setStep(1);
    setSymptoms('');
    setMedications('');
    setScheduledFor('');
    setSlotDate('');
    setSlots([]);
    setError('');
    setBooking(true);
  }

  async function book(): Promise<void> {
    setBusy(true);
    setError('');
    const { ok, data } = await api<Appointment>('/appointments', {
      method: 'POST',
      body: {
        clinician_id: Number(clinicianId),
        scheduled_for: scheduledFor,
        kind,
        modality,
        visit_type: category === 'lab' ? 'lab-test' : visitType,
        symptoms,
        current_medications: medications,
      },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Booking failed.');
      return;
    }
    setBooking(false);
    setStep(1);
    await load();
  }

  async function loadSlots(date: string): Promise<void> {
    setSlotDate(date);
    setScheduledFor('');
    setSlotsLoading(true);
    const { ok, data: d } = await api<{ slots: string[] }>(
      `/clinicians/${clinicianId}/availability?date=${date}`
    );
    setSlotsLoading(false);
    setSlots(ok && Array.isArray(d.slots) ? d.slots : []);
  }

  const upcomingDates: string[] = Array.from({ length: 10 }, (_, i) =>
    new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10)
  );

  const toCollect = data ? data.rx.filter((r) => r.status === 'pending').length : 0;
  const nextAppt = data
    ? data.appts.find((a) => a.status === 'scheduled' && a.scheduled_for >= new Date().toISOString().slice(0, 16))
    : undefined;

  return (
    <>
      <div className="page-head">
        <h1>Welcome, {user.full_name.split(' ').pop()}</h1>
        <p>Your care at a glance.</p>
      </div>
      {!data ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <div className="lbl">Prescriptions to collect</div>
              <div className="val v">{toCollect}</div>
            </div>
            <div className="stat">
              <div className="lbl">Upcoming visits</div>
              <div className="val">{data.appts.filter((a) => a.status === 'scheduled').length}</div>
            </div>
            <div className="stat">
              <div className="lbl">Lab results</div>
              <div className="val">{data.labs.length}</div>
            </div>
            <div className="stat">
              <div className="lbl">Messages</div>
              <div className="val">{data.msgs.length}</div>
            </div>
          </div>

          {nextAppt && (
            <div className="panel next-visit">
              <div>
                <div className="lbl">Next visit</div>
                <div className="t">
                  {nextAppt.kind} · {prettyWhen(nextAppt.scheduled_for)}
                </div>
                <div className="s">
                  {nextAppt.modality} with {nextAppt.clinician_name || 'your clinician'}
                </div>
              </div>
              <a className="btn btn-ghost btn-sm" href={`/portal/appointments/${nextAppt.id}`}>
                View
              </a>
            </div>
          )}

          <div className="cols">
            <div>
              <div className="panel">
                <h2>
                  Prescriptions
                  <a className="s" style={{ fontWeight: 400 }} href="/portal/records">
                    All records →
                  </a>
                </h2>
                <RxList rows={data.rx} showCode />
              </div>
              <div className="panel">
                <h2>
                  Messages
                  <a className="s" style={{ fontWeight: 400 }} href="/portal/messages">
                    All conversations →
                  </a>
                </h2>
                <MessageList rows={data.msgs.slice(-3)} />
              </div>
            </div>
            <div className="panel" style={{ height: 'fit-content' }}>
              <h2>
                Appointments
                <button className="btn btn-ghost btn-sm" onClick={startBooking}>
                  Book
                </button>
              </h2>
              <AppointmentLinkList rows={data.appts.filter((a) => a.status === 'scheduled')} />
            </div>
          </div>
        </>
      )}

      {booking && (
        <Modal title="Book an appointment" onClose={() => setBooking(false)}>
          <div className="steps" aria-label={`Step ${step} of 3`}>
            {['Visit', 'Details', 'Time'].map((label, i) => (
              <div key={label} className={`step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
                <span className="step-dot">{step > i + 1 ? '✓' : i + 1}</span>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="field">
                <label htmlFor="bk_cat">What kind of visit is this?</label>
                <select id="bk_cat" value={category} onChange={(e) => switchCategory(e.target.value as Category)}>
                  <option value="consultation">Consultation with a doctor</option>
                  <option value="lab">Lab test (blood panel, ECG, …)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="bk_who">{category === 'consultation' ? 'Doctor' : 'Lab technician'}</label>
                <select id="bk_who" value={clinicianId} onChange={(e) => setClinicianId(e.target.value)}>
                  {eligibleClinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                      {c.specialization ? ` · ${c.specialization}` : ''}
                      {c.review_count ? ` · ★ ${c.avg_rating} (${c.review_count})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {category === 'consultation' && (
                <div className="field">
                  <label htmlFor="bk_vt">Is this something new or an existing concern?</label>
                  <select id="bk_vt" value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                    <option value="new-concern">A new concern</option>
                    <option value="existing-condition">An existing condition</option>
                    <option value="follow-up">A follow-up</option>
                    <option value="routine-review">A routine review</option>
                  </select>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="field">
                <label htmlFor="bk_kind">{category === 'consultation' ? 'What is the appointment for?' : 'Which test?'}</label>
                <input
                  id="bk_kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  placeholder={category === 'consultation' ? 'e.g. Persistent headache for a week' : 'Blood panel, ECG…'}
                />
              </div>
              {category === 'consultation' && (
                <>
                  <div className="field">
                    <label htmlFor="bk_sym">What symptoms are you experiencing?</label>
                    <textarea
                      id="bk_sym"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Describe what you have been feeling, when it started, and how often it happens."
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="bk_med">Are you currently taking any medication?</label>
                    <textarea
                      id="bk_med"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      placeholder="List anything you take regularly, including supplements, or write none."
                    />
                  </div>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="field">
                <label>Pick a day</label>
                <div className="chips">
                  {upcomingDates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip ${slotDate === d ? 'chip-active' : ''}`}
                      onClick={() => loadSlots(d)}
                    >
                      {new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </button>
                  ))}
                </div>
              </div>
              {slotDate && (
                <div className="field">
                  <label>Available times</label>
                  {slotsLoading ? (
                    <p className="empty">Loading…</p>
                  ) : slots.length === 0 ? (
                    <p className="empty">No free slots that day, try another.</p>
                  ) : (
                    <div className="slot-grid">
                      {slots.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`slot-btn ${scheduledFor === s ? 'slot-active' : ''}`}
                          onClick={() => setScheduledFor(s)}
                        >
                          {s.slice(11)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="bk_modality">Modality</label>
                <select id="bk_modality" value={modality} onChange={(e) => setModality(e.target.value)}>
                  <option value="video">Video</option>
                  <option value="in-person">In person</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div className="booking-summary">
                <b>{kind}</b>
                <br />
                {category === 'consultation' ? 'Consultation' : 'Lab test'} with{' '}
                {eligibleClinicians.find((c) => String(c.id) === clinicianId)?.full_name}
                {category === 'consultation' && ` (${VISIT_LABELS[visitType]})`}
                {scheduledFor ? ` · ${scheduledFor.replace('T', ' ')}` : ' · pick a time above'}
              </div>
            </>
          )}

          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setBooking(false)} disabled={busy}>
              Cancel
            </button>
            {step > 1 && (
              <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !clinicianId}
              >
                Continue
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={book}
                disabled={busy || !clinicianId || !scheduledFor || !kind}
              >
                {busy ? 'Booking…' : 'Book appointment'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Appointment, Dependant } from '@/lib/api';
import { Avatar, Empty, Pill, prettyWhen } from '@/components/ui';
import { Modal } from '@/components/modal';
import { AppointmentLinkList } from '@/components/lists';

interface ClinicianOption {
  id: number;
  full_name: string;
  role: string;
  specialization?: string | null;
}

export default function FamilyPage() {
  const { user } = useAuth();
  const [dependants, setDependants] = useState<Dependant[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [bookingFor, setBookingFor] = useState<Dependant | null>(null);
  const [appointmentsFor, setAppointmentsFor] = useState<{ dep: Dependant; rows: Appointment[] } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [relationship, setRelationship] = useState('');
  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [clinicianId, setClinicianId] = useState('');
  const [when, setWhen] = useState('');
  const [kind, setKind] = useState('Check-up');

  const load = useCallback(async (): Promise<void> => {
    const { ok, status, data } = await api<Dependant[]>('/dependants');
    if (status === 402) {
      setLocked(true);
      setDependants([]);
      return;
    }
    setLocked(false);
    setDependants(ok && Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
    api<ClinicianOption[]>('/clinicians').then(({ ok, data }) => {
      if (ok && Array.isArray(data)) {
        setClinicians(data);
        const first = data.find((c) => c.role === 'doctor');
        if (first) setClinicianId(String(first.id));
      }
    });
  }, [load]);

  if (!user) return null;

  async function addDependant(): Promise<void> {
    setBusy(true);
    setError('');
    const { ok, data } = await api<Dependant>('/dependants', {
      method: 'POST',
      body: { full_name: name, date_of_birth: dob, relationship },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Could not add dependant.');
      return;
    }
    setAdding(false);
    setName('');
    setDob('');
    setRelationship('');
    setNotice(`${data.full_name} added to your family account.`);
    await load();
  }

  async function bookForDependant(): Promise<void> {
    if (!bookingFor) return;
    setBusy(true);
    setError('');
    const { ok, data } = await api<Appointment>(`/dependants/${bookingFor.id}/appointments`, {
      method: 'POST',
      body: { clinician_id: Number(clinicianId), scheduled_for: when, kind, modality: 'in-person' },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Could not book.');
      return;
    }
    setBookingFor(null);
    setNotice(`Booked "${data.kind}" for ${bookingFor.full_name} on ${prettyWhen(data.scheduled_for)}.`);
    await load();
    await showAppointments(bookingFor);
  }

  async function showAppointments(dep: Dependant): Promise<void> {
    const { ok, data } = await api<Appointment[]>(`/dependants/${dep.id}/appointments`);
    setAppointmentsFor({ dep, rows: ok && Array.isArray(data) ? data : [] });
  }

  if (locked) {
    return (
      <>
        <div className="page-head">
          <h1>Family</h1>
          <p>Manage care for your children and dependants.</p>
        </div>
        <div className="panel upsell">
          <h2>Zero Health Plus required</h2>
          <p className="empty" style={{ marginBottom: 14 }}>
            Family accounts are part of Zero Health Plus. Upgrade to add dependants, book their
            appointments, and see their visit history.
          </p>
          <a className="btn btn-primary" href="/portal/plus">
            See plans
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Family</h1>
        <p>Manage care for your children and dependants.</p>
      </div>
      {notice && <div className="collect-notice">{notice}</div>}
      <div className="panel">
        <h2>
          Dependants
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
            Add dependant
          </button>
        </h2>
        {dependants === null ? (
          <p className="empty">Loading…</p>
        ) : dependants.length === 0 ? (
          <Empty text="No dependants yet. Add your first family member." />
        ) : (
          dependants.map((d) => (
            <div className="row" key={d.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <Avatar name={d.full_name} size={38} />
                <div>
                  <div className="t">{d.full_name}</div>
                  <div className="s">
                    {d.relationship || 'dependant'}
                    {d.date_of_birth ? ` · born ${d.date_of_birth}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setBookingFor(d);
                    setError('');
                  }}
                >
                  Book
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => showAppointments(d)}>
                  Visits
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {appointmentsFor && (
        <div className="panel">
          <h2>
            Visits for {appointmentsFor.dep.full_name}
            <button className="btn btn-ghost btn-sm" onClick={() => setAppointmentsFor(null)}>
              Close
            </button>
          </h2>
          {appointmentsFor.rows.length === 0 ? (
            <Empty text="No visits booked yet." />
          ) : (
            appointmentsFor.rows.map((a) => (
              <div className="row" key={a.id}>
                <div>
                  <div className="t">
                    {a.kind} · {a.clinician_name || 'Clinician'}
                  </div>
                  <div className="s">
                    {prettyWhen(a.scheduled_for)} · {a.modality}
                  </div>
                </div>
                <Pill status={a.status} />
              </div>
            ))
          )}
        </div>
      )}

      {adding && (
        <Modal title="Add dependant" sub="A family member whose care you manage." onClose={() => setAdding(false)}>
          <div className="field">
            <label htmlFor="dep_name">Full name</label>
            <input id="dep_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kiddo Nathan" />
          </div>
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="dep_dob">Date of birth</label>
              <input id="dep_dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="dep_rel">Relationship</label>
              <input id="dep_rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="child" />
            </div>
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={addDependant} disabled={busy || !name.trim()}>
              {busy ? 'Adding…' : 'Add dependant'}
            </button>
          </div>
        </Modal>
      )}

      {bookingFor && (
        <Modal title="Book appointment" sub={`For ${bookingFor.full_name}`} onClose={() => setBookingFor(null)}>
          <div className="field">
            <label htmlFor="dep_doc">Clinician</label>
            <select id="dep_doc" value={clinicianId} onChange={(e) => setClinicianId(e.target.value)}>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                  {c.specialization ? ` · ${c.specialization}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="dep_when">Date and time</label>
              <input id="dep_when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="dep_kind">Reason</label>
              <input id="dep_kind" value={kind} onChange={(e) => setKind(e.target.value)} />
            </div>
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setBookingFor(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={bookForDependant} disabled={busy || !clinicianId || !when || !kind}>
              {busy ? 'Booking…' : 'Book appointment'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

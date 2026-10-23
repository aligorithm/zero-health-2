'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, Appointment, VisitMessage } from '@/lib/api';
import { Avatar, Pill } from '@/components/ui';

export default function VisitRoomPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [messages, setMessages] = useState<VisitMessage[]>([]);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (): Promise<void> => {
    const { ok, status, data } = await api<{ appointment: Appointment; messages: VisitMessage[] }>(
      `/appointments/${params.id}/visit`
    );
    if (status === 402) {
      setError('plus');
      return;
    }
    if (!ok) {
      setError(data.error || 'Could not open the visit room.');
      return;
    }
    setAppointment(data.appointment);
    setMessages(data.messages || []);
  }, [params.id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!user) return null;

  if (error === 'plus') {
    return (
      <div className="panel upsell">
        <h2>Zero Health Plus required</h2>
        <p className="empty" style={{ marginBottom: 14 }}>
          Video visits are part of Zero Health Plus. Upgrade to join this consultation.
        </p>
        <a className="btn btn-primary" href="/portal/plus">
          See plans
        </a>
      </div>
    );
  }
  if (error) {
    return (
      <div className="panel">
        <h2>Video visit</h2>
        <p className="empty">{error}</p>
        <a className="back-link" href="/portal/appointments">
          ← All appointments
        </a>
      </div>
    );
  }
  if (!appointment) return <p className="empty">Connecting…</p>;

  const otherName = user.id === appointment.clinician_id
    ? appointment.patient_name || 'Patient'
    : appointment.clinician_name || 'Clinician';
  const myLabel = appointment.dependant_id ? `You (for ${appointment.dependant_name})` : 'You';

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput('');
    await api(`/appointments/${params.id}/visit/messages`, { method: 'POST', body: { body: text } });
    setBusy(false);
    await load();
  }

  async function endVisit(): Promise<void> {
    setBusy(true);
    await api(`/appointments/${params.id}/visit/end`, { method: 'POST' });
    setBusy(false);
    router.push('/portal/appointments');
  }

  return (
    <>
      <div className="page-head">
        <h1 style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {appointment.kind} <Pill status={appointment.status} />
        </h1>
        <p>
          Visit room · {prettyWhenSafe(appointment.scheduled_for)}
          {appointment.dependant_name ? ` · for ${appointment.dependant_name}` : ''}
        </p>
      </div>

      <div className="visit-layout">
        <div className="visit-stage">
          <div className="visit-grid">
            <div className="visit-tile">
              <div className={`visit-video ${camOn ? '' : 'visit-cam-off'}`}>
                {camOn ? <div className="visit-shimmer" /> : <Avatar name={user.full_name} size={64} />}
              </div>
              <div className="visit-tile-name">
                {myLabel}
                <span className={`visit-mic ${micOn ? 'on' : 'off'}`}>{micOn ? '🎙' : '🔇'}</span>
              </div>
            </div>
            <div className="visit-tile">
              <div className="visit-video">
                <div className="visit-shimmer" />
              </div>
              <div className="visit-tile-name">{otherName}</div>
            </div>
          </div>
          <div className="visit-controls">
            <button className="btn btn-ghost" onClick={() => setMicOn(!micOn)} aria-pressed={!micOn}>
              {micOn ? 'Mute' : 'Unmute'}
            </button>
            <button className="btn btn-ghost" onClick={() => setCamOn(!camOn)} aria-pressed={!camOn}>
              {camOn ? 'Stop video' : 'Start video'}
            </button>
            <button className="btn btn-primary" onClick={endVisit} disabled={busy}>
              End visit
            </button>
          </div>
        </div>

        <div className="visit-chat">
          <div className="thread-scroll" ref={chatRef}>
            {messages.length === 0 ? (
              <p className="empty">No messages yet. Say hello to {otherName}.</p>
            ) : (
              messages.map((m) => (
                <div className={`msg ${m.from_user_id === user.id ? 'user' : 'bot'}`} key={m.id}>
                  {m.from_user_id !== user.id && <div className="tag">{m.from_name || 'Clinician'}</div>}
                  {m.body}
                </div>
              ))
            )}
          </div>
          <form
            className="composer thread-composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message in visit…"
              aria-label="Message in visit"
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function prettyWhenSafe(s: string): string {
  return (s || '').replace('T', ' ');
}

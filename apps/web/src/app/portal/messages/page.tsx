'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, apiForm, Conversation, Doctor, Message, PatientPanelUser } from '@/lib/api';
import { Avatar, Empty } from '@/components/ui';
import { Modal } from '@/components/modal';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [recipients, setRecipients] = useState<{ id: number; label: string }[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<Conversation[]>('/conversations');
    setRows(ok && Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      let list: { id: number; label: string }[] = [];
      if (user.role === 'patient') {
        const { ok, data } = await api<Doctor[]>('/doctors');
        if (ok && Array.isArray(data)) list = data.map((d) => ({ id: d.id, label: `${d.full_name} (doctor)` }));
      } else {
        const { ok, data } = await api<PatientPanelUser[]>('/patients');
        if (ok && Array.isArray(data)) list = data.map((p) => ({ id: p.id, label: `${p.full_name} (patient)` }));
        if (user.role === 'admin' || user.role === 'doctor') {
          const docs = await api<Doctor[]>('/doctors');
          if (docs.ok && Array.isArray(docs.data)) {
            list = [
              ...list,
              ...docs.data.filter((d) => d.id !== user.id).map((d) => ({ id: d.id, label: `${d.full_name} (doctor)` })),
            ];
          }
        }
      }
      if (!cancelled) {
        setRecipients(list);
        if (list.length > 0) setRecipientId(String(list[0].id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  async function send(): Promise<void> {
    setBusy(true);
    setError('');
    const form = new FormData();
    form.set('recipient_id', recipientId);
    form.set('body', body);
    if (attachment) form.set('attachment', attachment);
    const { ok, data } = await apiForm<Message>('/messages', form);
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Could not send message.');
      return;
    }
    setComposing(false);
    setBody('');
    setAttachment(null);
    router.push(`/portal/messages/${recipientId}`);
  }

  return (
    <>
      <div className="page-head">
        <h1>Messages</h1>
        <p>Conversations with your care team.</p>
      </div>
      <div className="panel">
        <h2>
          Conversations
          <button className="btn btn-ghost btn-sm" onClick={() => setComposing(true)} disabled={recipients.length === 0}>
            New message
          </button>
        </h2>
        {rows === null ? (
          <p className="empty">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty text="No conversations yet." />
        ) : (
          rows.map((c) => (
            <a className="row row-link" key={c.user_id} href={`/portal/messages/${c.user_id}`}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <Avatar name={c.name} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div className="t">
                    {c.name} <span className="s">({c.role})</span>
                  </div>
                  <div className="s" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_body}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
                <span className="s">{c.last_at}</span>
              </div>
            </a>
          ))
        )}
      </div>

      {composing && (
        <Modal title="New message" onClose={() => setComposing(false)}>
          <div className="field">
            <label htmlFor="msg_to">To</label>
            <select id="msg_to" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="msg_body">Message</label>
            <textarea id="msg_body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message." />
          </div>
          <div className="field">
            <label htmlFor="msg_attach">Attach an image (optional)</label>
            <input
              id="msg_attach"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            />
            {attachment && <div className="s" style={{ marginTop: 6 }}>{attachment.name} ({Math.round(attachment.size / 1024)} KB)</div>}
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setComposing(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={send} disabled={busy || !recipientId || !body.trim()}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

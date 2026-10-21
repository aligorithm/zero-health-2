'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, apiForm, Message, ThreadResponse, User } from '@/lib/api';
import { Avatar } from '@/components/ui';

export default function ThreadPage() {
  const { user } = useAuth();
  const params = useParams<{ userId: string }>();
  const [counterpart, setCounterpart] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<ThreadResponse>(`/messages/with/${params.userId}`);
    if (ok && data) {
      setCounterpart(data.counterpart);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } else {
      setError(data?.error || 'Could not load conversation.');
    }
  }, [params.userId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (!user) return null;
  if (error) {
    return (
      <div className="panel">
        <h2>Conversation</h2>
        <p className="empty">{error}</p>
        <a className="back-link" href="/portal/messages">
          ← All conversations
        </a>
      </div>
    );
  }

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput('');
    const form = new FormData();
    form.set('recipient_id', String(params.userId));
    form.set('body', text);
    if (attachment) form.set('attachment', attachment);
    const { ok } = await apiForm<Message>('/messages', form);
    setBusy(false);
    setAttachment(null);
    if (!ok) return;
    await load();
  }

  return (
    <div className="thread-page">
      <a className="back-link" href="/portal/messages">
        ← All conversations
      </a>
      <div className="panel thread-panel">
        <div className="thread-head">
          {counterpart && (
            <>
              <Avatar name={counterpart.full_name} size={38} />
              <div>
                <div className="t">{counterpart.full_name}</div>
                <div className="s">{counterpart.role}</div>
              </div>
            </>
          )}
        </div>

        <div className="thread-scroll">
          {messages === null ? (
            <p className="empty">Loading…</p>
          ) : messages.length === 0 ? (
            <p className="empty">No messages yet. Say hello.</p>
          ) : (
            messages.map((m) => {
              const mine = m.from_user_id === user.id;
              return (
                <div className={`msg ${mine ? 'user' : 'bot'}`} key={m.id}>
                  {m.body}
                  {m.attachment_path && (
                    <a className="msg-attachment" href={`/api/files/${m.attachment_path}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/${m.attachment_path}`} alt="Message attachment" />
                    </a>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {attachment && (
          <div className="attach-bar">
            <span className="attach-chip">
              📎 {attachment.name} ({Math.round(attachment.size / 1024)} KB)
              <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                ✕
              </button>
            </span>
          </div>
        )}
        <form
          className="composer thread-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="attach-btn" title="Attach an image">
            📎
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              aria-label="Attach an image"
            />
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${counterpart?.full_name || ''}…`}
            aria-label="Message"
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </form>

      </div>
    </div>
  );
}

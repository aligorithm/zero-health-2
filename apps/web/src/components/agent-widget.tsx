'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ChatHistoryEntry, LabResult } from '@/lib/api';
import { Logo } from './ui';

interface ChatMessage {
  who: 'user' | 'bot';
  text: string;
}

const sampleDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const SUGGESTIONS = [
  'What are my prescriptions?',
  'When is my next appointment?',
  `Book an appointment with Dr. Strange on ${sampleDate} at 15:00`,
];

export function AgentWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { who: 'bot', text: 'Hi, I am Zero Agent. Ask me about your care, or use a suggestion below.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [labs, setLabs] = useState<LabResult[] | null>(null);
  const [labId, setLabId] = useState('');
  const historyLoadedRef = useRef(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    let cancelled = false;
    (async () => {
      const [labRes, histRes] = await Promise.all([
        api<LabResult[]>('/me/lab-results'),
        api<ChatHistoryEntry[]>('/agent/history'),
      ]);
      if (cancelled) return;
      const labRows = labRes.ok && Array.isArray(labRes.data) ? labRes.data : [];
      setLabs(labRows);
      if (labRows.length > 0) setLabId(String(labRows[0].id));
      if (histRes.ok && Array.isArray(histRes.data) && histRes.data.length > 0) {
        const restored: ChatMessage[] = histRes.data.flatMap((h) => [
          { who: 'user' as const, text: h.message },
          { who: 'bot' as const, text: h.response },
        ]);
        setMessages(restored);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function addMessage(who: 'user' | 'bot', text: string): void {
    setMessages((m) => [...m, { who, text }]);
  }

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setInput('');
    addMessage('user', trimmed);
    const { ok, data } = await api<{ output?: string }>('/agent/chat', {
      method: 'POST',
      body: { message: trimmed },
    });
    setBusy(false);
    addMessage('bot', ok && data.output ? data.output : '(no response, is the API running?)');
  }

  async function summarize(): Promise<void> {
    if (!labId || busy) return;
    const lab = labs?.find((l) => String(l.id) === labId);
    setBusy(true);
    addMessage('user', `Summarize my result "${lab?.panel ?? labId}" (record ${labId})`);
    const { ok, data } = await api<{ output?: string }>(`/agent/summarize/${labId}`);
    setBusy(false);
    addMessage('bot', ok && data.output ? data.output : '(no response, is the API running?)');
  }

  return (
    <>
      {open && (
        <div className="agent-panel" role="dialog" aria-label="Zero Agent chat">
          <div className="agent-head">
            <span className="agent-head-logo">
              <Logo size={22} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t">Zero Agent</div>
              <div className="s">AI assistant</div>
            </div>
          </div>

          <div className="agent-body" ref={threadRef}>
            {messages.map((m, i) => (
              <div className={`msg ${m.who === 'bot' ? 'bot' : 'user'}`} key={i}>
                {m.who === 'bot' && <div className="tag">Zero Agent</div>}
                {m.text}
              </div>
            ))}
          </div>

          <div className="agent-foot">
            <div className="agent-chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
            {labs && labs.length > 0 && (
              <div className="agent-records">
                <select
                  id="agent_lab_select"
                  value={labId}
                  onChange={(e) => setLabId(e.target.value)}
                  aria-label="Lab result to summarize"
                >
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.panel} · record {l.id}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-ghost"
                  id="agent_summarize"
                  onClick={summarize}
                  disabled={busy}
                >
                  Summarize
                </button>
              </div>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                id="agent_input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Zero Agent…"
                aria-label="Message Zero Agent"
              />
              <button className="btn btn-primary" id="agent_send" type="submit" disabled={busy || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        className="agent-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Zero Agent"
        aria-expanded={open}
        title="Zero Agent"
      >
        {open ? (
          '✕'
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </>
  );
}

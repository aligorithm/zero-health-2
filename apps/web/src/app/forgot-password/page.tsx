'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LabBanner, Logo } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError('');
    const { ok, data } = await api<{ message?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email: email.trim() },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Something went wrong, please try again.');
      return;
    }
    setSent(true);
  }

  return (
    <>
      <LabBanner />
      <main className="auth-wrap" aria-label="Forgot password">
        <h1 className="sr-only">Reset your password</h1>
        <div className="auth-card">
          <div className="logo center">
            <Logo size={28} />
            <span className="brand">Zero Health</span>
          </div>

          {sent ? (
            <div className="seed-hint" style={{ marginTop: 0 }}>
              <b>Check your inbox</b>
              <br />
              If an account exists for {email.trim()}, we have sent a reset link by email. It is
              valid for 15 minutes. (In this lab, if no SMTP server is configured, emails are
              printed to the API console instead of being delivered.)
              <div style={{ marginTop: 14 }}>
                <Link href="/reset-password" className="btn btn-primary" style={{ width: '100%' }}>
                  Enter reset token
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="fp_email">Email</label>
                <input
                  id="fp_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.test"
                />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <div className="err">{error}</div>
            </form>
          )}

          <div className="auth-alt">
            <Link href="/login">Back to sign in</Link>
          </div>
        </div>
      </main>
    </>
  );
}

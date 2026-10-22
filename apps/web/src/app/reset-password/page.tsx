'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui';
import { LabBanner } from '@/components/lab-banner';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<><LabBanner /><div className="portal-loading">Loading…</div></>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!token.trim() || !password) {
      setError('Enter your reset token and a new password.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const { ok, data } = await api<{ message?: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token: token.trim(), password },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Reset failed, please try again.');
      return;
    }
    setDone(true);
  }

  return (
    <>
      <LabBanner />
      <main className="auth-wrap" aria-label="Reset password">
        <h1 className="sr-only">Set a new password</h1>
        <div className="auth-card">
          <div className="logo center">
            <Logo size={28} />
            <span className="brand">Zero Health</span>
          </div>

          {done ? (
            <div className="seed-hint" style={{ marginTop: 0 }}>
              <b>Password updated</b>
              <br />
              You can sign in with your new password now.
              <div style={{ marginTop: 14 }}>
                <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                  Sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="rp_token">Reset token</label>
                <input
                  id="rp_token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="From the API console"
                  style={{ fontFamily: 'ui-monospace,monospace', fontSize: 13 }}
                />
              </div>
              <div className="field">
                <label htmlFor="rp_pw">New password</label>
                <input
                  id="rp_pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="field">
                <label htmlFor="rp_pw2">Confirm new password</label>
                <input
                  id="rp_pw2"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
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

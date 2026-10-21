'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, LoginResponse, setToken } from '@/lib/api';
import { LabBanner, Logo } from '@/components/ui';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (isRegister && (!fullName || !email || !password)) {
      setError('All fields are required.');
      return;
    }
    if (!isRegister && (!email || !password)) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);

    if (isRegister) {
      const reg = await api<unknown>('/auth/register', {
        method: 'POST',
        body: { email, password, full_name: fullName },
      });
      if (!reg.ok) {
        setBusy(false);
        setError(reg.data.error || 'Registration failed.');
        return;
      }
    }

    const { ok, data } = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setBusy(false);
    if (!ok) {
      setError(isRegister ? 'Registered, but login failed.' : data.error || 'Login failed.');
      return;
    }
    setToken(data.token);
    router.push('/portal');
  }

  return (
    <>
      <LabBanner />
      <main className="auth-wrap" aria-label="Sign in">
        <h1 className="sr-only">Sign in to Zero Health</h1>
        <div className="auth-card">
          <div className="logo center">
            <Logo size={28} />
            <span className="brand">Zero Health</span>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={`tab ${!isRegister ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`tab ${isRegister ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} noValidate>
            {isRegister && (
              <div className="field">
                <label htmlFor="f_name">Full name</label>
                <input
                  id="f_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jordan Ellis"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="f_email">Email</label>
              <input
                id="f_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.test"
              />
            </div>
            <div className="field">
              <label htmlFor="f_pw">Password</label>
              <input
                id="f_pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="err">{error}</div>

          {!isRegister && (
            <div className="auth-alt">
              <a href="/forgot-password">Forgot password?</a>
            </div>
          )}

          <div className="seed-hint">
            <b>Demo accounts</b> · password <code>Password1!</code>
            <br />
            patient.alpha@example.test · dr.one@example.test · admin@example.test
          </div>
        </div>
      </main>
    </>
  );
}

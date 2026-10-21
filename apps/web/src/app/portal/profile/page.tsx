'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, User } from '@/lib/api';

const GENDERS = [
  { value: '', label: 'Not specified' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer not to say', label: 'Prefer not to say' },
];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const initialized = useRef(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    specialization: '',
    license_number: '',
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    setForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth || '',
      gender: user.gender || '',
      address: user.address || '',
      specialization: user.specialization || '',
      license_number: user.license_number || '',
    });
  }, [user]);

  if (!user) return null;

  function set(key: keyof typeof form, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(): Promise<void> {
    setBusy(true);
    setError('');
    setSaved(false);
    const { ok, data } = await api<User>('/me', { method: 'PATCH', body: form });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Could not save profile.');
      return;
    }
    setSaved(true);
    await refreshUser();
  }

  return (
    <>
      <div className="page-head">
        <h1>Profile</h1>
        <p>Your account and contact details.</p>
      </div>
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="profile-rows">
          <div>
            <div className="lbl">Email</div>
            <div>{user.email}</div>
          </div>
          <div>
            <div className="lbl">Role</div>
            <div>
              <span className="pill active">{user.role}</span>
            </div>
          </div>
          <div>
            <div className="lbl">Member since</div>
            <div>{user.created_at || ''}</div>
          </div>
        </div>

        <div className="field" style={{ marginTop: 20 }}>
          <label htmlFor="p_name">Full name</label>
          <input id="p_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        </div>
        <div className="inline-form" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="p_phone">Phone</label>
            <input id="p_phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1-555-0100" />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="p_dob">Date of birth</label>
            <input id="p_dob" type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="p_gender">Gender</label>
          <select id="p_gender" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            {GENDERS.map((g) => (
              <option key={g.value || 'none'} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p_address">Address</label>
          <input id="p_address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, city" />
        </div>
        {user.role === 'doctor' && (
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="p_spec">Specialization</label>
              <input id="p_spec" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="Family Medicine" />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="p_lic">License number</label>
              <input id="p_lic" value={form.license_number} onChange={(e) => set('license_number', e.target.value)} placeholder="MD-000-0000" />
            </div>
          </div>
        )}
        <div className="err">{saved ? '' : error}</div>
        {saved && <div className="collect-notice">Profile saved.</div>}
        <button className="btn btn-primary" onClick={save} disabled={busy || !form.full_name.trim()}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </>
  );
}

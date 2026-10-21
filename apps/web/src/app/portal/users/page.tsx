'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, User } from '@/lib/api';
import { AccessDenied, Avatar, Empty } from '@/components/ui';
import { Modal } from '@/components/modal';

const ROLE_OPTIONS = ['patient', 'doctor', 'pharmacist', 'labtech', 'admin'];

export default function UsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<User[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password1!');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('patient');

  const load = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<User[]>('/admin/users');
    setRows(ok && Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || user.role !== 'admin') return <AccessDenied />;

  async function createUser(): Promise<void> {
    setBusy(true);
    setError('');
    const { ok, data } = await api<User>('/admin/users', {
      method: 'POST',
      body: { email, password, full_name: fullName, role },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Could not create user.');
      return;
    }
    setCreating(false);
    setEmail('');
    setFullName('');
    setNotice(`User ${data.id} (${data.email}) created as ${data.role}.`);
    await load();
  }

  async function changeRole(target: User, newRole: string): Promise<void> {
    setNotice('');
    const { ok, data } = await api<User>(`/admin/users/${target.id}/role`, {
      method: 'PATCH',
      body: { role: newRole },
    });
    if (!ok) {
      setNotice(data.error || 'Could not change role.');
      return;
    }
    setNotice(`${target.full_name} is now ${data.role}.`);
    await load();
  }

  async function deleteUser(): Promise<void> {
    if (!deleteTarget) return;
    setBusy(true);
    const { ok, data } = await api<unknown>(`/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
    setBusy(false);
    setDeleteTarget(null);
    if (!ok) {
      setNotice(data.error || 'Could not delete user.');
      return;
    }
    setNotice(`User ${deleteTarget.full_name} deleted.`);
    await load();
  }

  return (
    <>
      <div className="page-head">
        <h1>Users</h1>
        <p>All accounts. Provision staff roles here.</p>
      </div>
      {notice && <div className="collect-notice">{notice}</div>}
      <div className="panel">
        <h2>
          {rows === null ? 'Accounts' : `${rows.length} accounts`}
          <button className="btn btn-ghost btn-sm" onClick={() => { setCreating(true); setError(''); }}>
            New user
          </button>
        </h2>
        {rows === null ? (
          <p className="empty">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty text="No users." />
        ) : (
          <table>
            <thead>
              <tr>
                <th className="hide-sm">ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th className="hide-sm">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="hide-sm">{u.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.full_name} size={30} />
                      {u.full_name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      aria-label={`Role for ${u.full_name}`}
                      disabled={u.id === user.id}
                      style={{ padding: '6px 8px', fontSize: 12.5 }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hide-sm" style={{ color: 'var(--text-dim)' }}>{u.created_at || ''}</td>
                  <td>
                    {u.id !== user.id && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(u)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <Modal title="New user" sub="Provision an account with any role." onClose={() => setCreating(false)}>
          <div className="field">
            <label htmlFor="nu_name">Full name</label>
            <input id="nu_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. James Whitfield" />
          </div>
          <div className="field">
            <label htmlFor="nu_email">Email</label>
            <input id="nu_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.test" />
          </div>
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="nu_pw">Password</label>
              <input id="nu_pw" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="nu_role">Role</label>
              <select id="nu_role" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setCreating(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={createUser} disabled={busy || !email || !password || !fullName}>
              {busy ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete user"
          sub={`${deleteTarget.full_name} (${deleteTarget.email}) will be removed.`}
          onClose={() => setDeleteTarget(null)}
        >
          <p className="empty" style={{ marginBottom: 6 }}>
            This cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={deleteUser} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete user'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, AdminStats, PatientPanelUser, User } from '@/lib/api';
import { PatientsPanel } from '../patients-panel';

export function LabOverview({ user }: { user: User }) {
  const [panel, setPanel] = useState<PatientPanelUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<PatientPanelUser[]>('/patients');
      if (!cancelled) setPanel(ok ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Lab overview</h1>
        <p>Signed in as {user.role}. Record results from the patient panel.</p>
      </div>
      <div className="panel">
        {panel === null ? <p className="empty">Loading…</p> : <PatientsPanel rows={panel} role={user.role} />}
      </div>
    </>
  );
}

export function AdminOverview({ user }: { user: User }) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<AdminStats>('/admin/stats');
      if (!cancelled) setStats(ok ? data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Admin overview</h1>
        <p>Signed in as {user.role}. System statistics across the platform.</p>
      </div>
      {!stats ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <div className="lbl">Users</div>
              <div className="val v">{stats.users_total}</div>
            </div>
            <div className="stat">
              <div className="lbl">Patients</div>
              <div className="val">{stats.patients}</div>
            </div>
            <div className="stat">
              <div className="lbl">Rx awaiting collection</div>
              <div className="val">{stats.prescriptions_pending}</div>
            </div>
            <div className="stat">
              <div className="lbl">Rx collected</div>
              <div className="val">{stats.prescriptions_collected}</div>
            </div>
          </div>
          <div className="stat-row">
            <div className="stat">
              <div className="lbl">Appointments upcoming</div>
              <div className="val">{stats.appointments_upcoming}</div>
            </div>
            <div className="stat">
              <div className="lbl">Lab results</div>
              <div className="val">{stats.lab_results_total}</div>
            </div>
            <div className="stat">
              <div className="lbl">Messages</div>
              <div className="val">{stats.messages_total}</div>
            </div>
            <div className="stat">
              <div className="lbl">Job applications</div>
              <div className="val">{stats.applications_total}</div>
            </div>
          </div>
          <div className="panel">
            <h2>Staff</h2>
            <div className="row">
              <div>
                <div className="t">Role breakdown</div>
                <div className="s">
                  {stats.doctors} doctors · {stats.pharmacists} pharmacists · {stats.labtechs} lab
                  technicians · {stats.admins} admins
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

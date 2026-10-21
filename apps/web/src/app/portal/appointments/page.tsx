'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Appointment } from '@/lib/api';
import { AppointmentLinkList } from '@/components/lists';
import { AccessDenied, Empty } from '@/components/ui';

type Filter = 'upcoming' | 'past' | 'cancelled' | 'all';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<Appointment[]>('/appointments');
      if (!cancelled) setRows(ok && Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isStaff = user && user.role !== 'patient';
  if (!user || (isStaff && user.role !== 'doctor' && user.role !== 'labtech' && user.role !== 'admin')) {
    return <AccessDenied />;
  }

  const filtered = useMemo(() => {
    if (!rows) return [];
    const now = new Date().toISOString().slice(0, 16);
    if (filter === 'upcoming') return rows.filter((a) => a.status === 'scheduled' && a.scheduled_for >= now);
    if (filter === 'past') return rows.filter((a) => a.status !== 'scheduled' && a.scheduled_for >= now).concat(rows.filter((a) => a.scheduled_for < now && a.status !== 'cancelled'));
    if (filter === 'cancelled') return rows.filter((a) => a.status === 'cancelled');
    return rows;
  }, [rows, filter]);

  const title = user.role === 'patient' ? 'Appointments' : 'Schedule';
  const sub = user.role === 'patient'
    ? 'Your visits and lab tests. Select one to view details, reschedule, or cancel.'
    : 'Appointments assigned to you. Select one to view details or add notes.';

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="chips" role="tablist" aria-label="Appointment filters">
        {(['upcoming', 'past', 'cancelled', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`chip ${filter === f ? 'chip-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'upcoming' ? 'Upcoming' : f === 'past' ? 'Past' : f === 'cancelled' ? 'Cancelled' : 'All'}
          </button>
        ))}
      </div>
      <div className="panel">
        {rows === null ? (
          <p className="empty">Loading…</p>
        ) : filtered.length === 0 ? (
          <Empty text={`No ${filter === 'all' ? '' : filter} appointments.`} />
        ) : (
          <AppointmentLinkList rows={filtered} />
        )}
      </div>
    </>
  );
}

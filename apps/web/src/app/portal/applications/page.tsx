'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, JobApplication } from '@/lib/api';
import { JOBS } from '@/content/jobs';
import { AccessDenied, Empty } from '@/components/ui';

function jobTitle(slug: string): string {
  const job = JOBS.find((j) => j.slug === slug);
  return job ? job.title : slug;
}

function reference(id: number): string {
  return 'ZH-' + String(id).padStart(4, '0');
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<JobApplication[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await api<JobApplication[]>('/admin/applications');
      if (!cancelled) setRows(ok && Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || user.role !== 'admin') return <AccessDenied />;

  return (
    <>
      <div className="page-head">
        <h1>Applications</h1>
        <p>Job applications received through the careers page.</p>
      </div>
      <div className="panel">
        {rows === null ? (
          <p className="empty">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty text="No applications yet." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Candidate</th>
                <th className="hide-sm">Email</th>
                <th>Role</th>
                <th className="hide-sm">Source</th>
                <th className="hide-sm">Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <RowGroup
                  key={a.id}
                  application={a}
                  open={openId === a.id}
                  onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function RowGroup({
  application: a,
  open,
  onToggle,
}: {
  application: JobApplication;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="clickable" onClick={onToggle}>
        <td style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>{reference(a.id)}</td>
        <td>{a.full_name}</td>
        <td className="hide-sm" style={{ color: "var(--text-dim)" }}>{a.email}</td>
        <td>{jobTitle(a.job_slug)}</td>
        <td className="hide-sm" style={{ color: "var(--text-dim)" }}>{a.source || ""}</td>
        <td className="hide-sm" style={{ color: "var(--text-dim)" }}>{a.created_at}</td>
      </tr>
      {open && (
        <tr className="detail-row">
          <td colSpan={6}>
            <div className="detail-block">
              <b>Why they want to work here</b>
              <p>{a.motivation}</p>
              {a.phone && (
                <p>
                  <b>Phone</b> {a.phone}
                </p>
              )}
              {a.links && (
                <p>
                  <b>Links</b> {a.links}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

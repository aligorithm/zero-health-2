'use client';

import { useState } from 'react';
import type { Appointment, LabResult, Message, Prescription } from '@/lib/api';
import { Empty, Pill, prettyWhen } from './ui';

export function CollectionCode({ code }: { code: string }) {
  return <span className="code-chip" title="Collection code, show this at the pharmacy">{code}</span>;
}

export function RxList({ rows, showCode = false }: { rows: Prescription[]; showCode?: boolean }) {
  if (!rows || rows.length === 0) return <Empty text="No prescriptions." />;
  return (
    <>
      {rows.map((r) => (
        <div className="row" key={r.id}>
          <div>
            <div className="t">
              {r.medication}
              {showCode && r.status === 'pending' && r.collection_code && (
                <>
                  {' '}
                  <CollectionCode code={r.collection_code} />
                </>
              )}
            </div>
            <div className="s">
              {r.dosage}
              {r.frequency ? ` · ${r.frequency}` : ''}
              {r.status === 'collected' && r.collected_at ? ` · collected ${r.collected_at}` : ''}
            </div>
            {showCode && r.instructions && <div className="s">{r.instructions}</div>}
          </div>
          <Pill status={r.status} />
        </div>
      ))}
    </>
  );
}

export function AppointmentLinkList({ rows }: { rows: Appointment[] }) {
  if (!rows || rows.length === 0) return <Empty text="Nothing scheduled." />;
  return (
    <>
      {rows.map((a) => {
        const who = a.clinician_name || a.patient_name || 'Clinician';
        return (
          <a className="row row-link" key={a.id} href={`/portal/appointments/${a.id}`}>
            <div>
              <div className="t">{who}</div>
              <div className="s">
                {prettyWhen(a.scheduled_for)} · {a.kind} · {a.modality}
              </div>
              {a.notes && <div className="s">Note: {a.notes}</div>}
            </div>
            <Pill status={a.status} />
          </a>
        );
      })}
    </>
  );
}

export function LabImage({ name, alt }: { name: string; alt: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <button
        className="lab-thumb"
        onClick={() => setZoom(true)}
        title="View image"
        aria-label={`View image for ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/files/${name}`} alt={alt} />
      </button>
      {zoom && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setZoom(false)}>
          <div className="lab-lightbox">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${name}`} alt={alt} />
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function LabList({ rows, showImages = false }: { rows: LabResult[]; showImages?: boolean }) {
  if (!rows || rows.length === 0) return <Empty text="No results." />;
  return (
    <>
      {rows.map((l) => (
        <a className="row row-link" key={l.id} href={`/portal/labs/${l.id}`}>
          <div>
            <div className="t">
              {l.panel}
              {l.patient_name ? ` · ${l.patient_name}` : ''}
            </div>
            <div className="s">
              {l.value}
              {l.interpretation ? ` · ${l.interpretation}` : ''}
            </div>
          </div>
          {showImages && l.image_path && <LabImage name={l.image_path} alt={l.panel} />}
        </a>
      ))}
    </>
  );
}

export function MessageList({ rows }: { rows: Message[] }) {
  if (!rows || rows.length === 0) return <Empty text="No messages." />;
  return (
    <>
      {rows.map((m) => (
        <div className="row" key={m.id}>
          <div>
            <div className="t">
              {m.from_name} → {m.to_name}
            </div>
            <div className="s">{m.body}</div>
          </div>
          <span className="s">{m.created_at}</span>
        </div>
      ))}
    </>
  );
}

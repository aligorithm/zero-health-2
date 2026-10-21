'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiForm, LabResult, PatientPanelUser, Prescription } from '@/lib/api';
import { Avatar, Empty } from './ui';
import { Modal } from './modal';

interface Target {
  id: number;
  name: string;
}

export function PatientsPanel({
  rows,
  role,
}: {
  rows: PatientPanelUser[];
  role: string;
}) {
  const router = useRouter();
  const [rxTarget, setRxTarget] = useState<Target | null>(null);
  const [labTarget, setLabTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string | null>(null);

  // Prescription form
  const [medication, setMedication] = useState('Amoxicillin');
  const [dosage, setDosage] = useState('250mg twice daily');
  const [frequency, setFrequency] = useState('twice daily');
  const [duration, setDuration] = useState('10 days');
  const [instructions, setInstructions] = useState('');

  // Lab result form
  const [panel, setPanel] = useState('Complete Blood Count');
  const [value, setValue] = useState('Within reference range');
  const [interpretation, setInterpretation] = useState('');
  const [image, setImage] = useState<File | null>(null);

  const canPrescribe = role === 'doctor' || role === 'admin';
  const canRecordLab = role === 'doctor' || role === 'labtech';
  const canReport = role === 'doctor' || role === 'admin';

  if (!rows || rows.length === 0) return <Empty text="No patients." />;

  function closeAll(): void {
    setRxTarget(null);
    setLabTarget(null);
    setError('');
    setResult(null);
    setBusy(false);
  }

  async function submitPrescription(): Promise<void> {
    if (!rxTarget) return;
    setBusy(true);
    setError('');
    const { status, data } = await api<Prescription>('/prescriptions', {
      method: 'POST',
      body: {
        patient_id: rxTarget.id,
        medication,
        dosage,
        frequency,
        duration,
        instructions,
      },
    });
    setBusy(false);
    if (status !== 200) {
      setError(data.error || 'Failed to create prescription.');
      return;
    }
    setRxTarget(null);
    setResult(`Prescription ${data.id} created. Collection code: ${data.collection_code}`);
  }

  async function submitLabResult(): Promise<void> {
    if (!labTarget) return;
    setBusy(true);
    setError('');
    const form = new FormData();
    form.set('patient_id', String(labTarget.id));
    form.set('panel', panel);
    form.set('value', value);
    form.set('interpretation', interpretation);
    if (image) form.set('image', image);
    const { status, data } = await apiForm<LabResult>('/lab-results', form);
    setBusy(false);
    if (status !== 200) {
      setError(data.error || 'Failed to record lab result.');
      return;
    }
    setLabTarget(null);
    setImage(null);
    setResult(`Lab result ${data.id} recorded for ${labTarget.name}.`);
  }

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Email</th>
            <th className="hide-sm">Active Rx</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={p.full_name} size={30} />
                  {p.full_name}
                </div>
              </td>
              <td style={{ color: 'var(--text-dim)' }}>
                {p.email}
                {p.phone && <div className="s">{p.phone}</div>}
              </td>
              <td className="hide-sm">{p.active_rx}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  {canPrescribe && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        closeAll();
                        setRxTarget({ id: p.id, name: p.full_name });
                      }}
                    >
                      Prescribe
                    </button>
                  )}
                  {canRecordLab && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        closeAll();
                        setLabTarget({ id: p.id, name: p.full_name });
                      }}
                    >
                      Lab result
                    </button>
                  )}
                  {canReport && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => router.push(`/portal/report/${p.id}`)}
                    >
                      Report
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result && <div className="out">{result}</div>}

      {rxTarget && (
        <Modal title="New prescription" sub={`For ${rxTarget.name}`} onClose={closeAll}>
          <div className="field">
            <label htmlFor="rx_med">Medication</label>
            <input id="rx_med" value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="Amoxicillin" />
          </div>
          <div className="field">
            <label htmlFor="rx_dose">Dosage</label>
            <input id="rx_dose" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="250mg twice daily" />
          </div>
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="rx_freq">Frequency</label>
              <input id="rx_freq" value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="twice daily" />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="rx_dur">Duration</label>
              <input id="rx_dur" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="10 days" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="rx_instr">Instructions</label>
            <textarea id="rx_instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Take with water." />
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeAll} disabled={busy}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={submitPrescription}
              disabled={busy || !medication || !dosage}
            >
              {busy ? 'Saving…' : 'Create order'}
            </button>
          </div>
        </Modal>
      )}

      {labTarget && (
        <Modal title="New lab result" sub={`For ${labTarget.name}`} onClose={closeAll}>
          <div className="field">
            <label htmlFor="lab_panel">Panel</label>
            <input id="lab_panel" value={panel} onChange={(e) => setPanel(e.target.value)} placeholder="Complete Blood Count" />
          </div>
          <div className="field">
            <label htmlFor="lab_value">Value</label>
            <input id="lab_value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Within reference range" />
          </div>
          <div className="field">
            <label htmlFor="lab_interp">Interpretation</label>
            <textarea id="lab_interp" value={interpretation} onChange={(e) => setInterpretation(e.target.value)} placeholder="No abnormalities detected." />
          </div>
          <div className="field">
            <label htmlFor="lab_image">Result image (optional)</label>
            <input
              id="lab_image"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            {image && <div className="s" style={{ marginTop: 6 }}>{image.name} ({Math.round(image.size / 1024)} KB)</div>}
          </div>
          <div className="err">{error}</div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={closeAll} disabled={busy}>
              Close
            </button>
            <button className="btn btn-primary" onClick={submitLabResult} disabled={busy || !panel || !value}>
              {busy ? 'Saving…' : 'Record result'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { api, JobApplicationResult } from '@/lib/api';

const SOURCES = [
  'An ad that followed me across the internet',
  'A podcast I was forced to listen to in a waiting room',
  'A recruiter who read my LinkedIn backwards',
  'I am an investor doing diligence, ignore me',
  'Other',
];

interface Props {
  jobSlug: string;
  jobTitle: string;
}

export function ApplyForm({ jobSlug, jobTitle }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [links, setLinks] = useState('');
  const [source, setSource] = useState(SOURCES[0]);
  const [motivation, setMotivation] = useState('');
  const [passion, setPassion] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError('Please tell us your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please tell us your email.');
      return;
    }
    if (!motivation.trim()) {
      setError('Please tell us why you want to work here.');
      return;
    }
    if (!passion) {
      setError('Passion is mandatory.');
      return;
    }
    setBusy(true);
    const { ok, data } = await api<JobApplicationResult>('/job-applications', {
      method: 'POST',
      body: {
        job_slug: jobSlug,
        full_name: fullName,
        email,
        phone,
        links,
        motivation,
        source,
      },
    });
    setBusy(false);
    if (!ok) {
      setError(data.error || 'Application failed, please try again.');
      return;
    }
    setReference(data.reference);
  }

  if (reference) {
    return (
      <div className="apply-box">
        <div className="apply-status" role="status">
          Application received for {jobTitle}. Your reference is <b>{reference}</b>. Zero Agent will
          screen it against 4,000 other applicants and will definitely, probably, get back to you.
        </div>
        <p className="apply-note">Zero Health is an equal opportunity employer.</p>
      </div>
    );
  }

  return (
    <div className="panel apply-box">
      <h2>Apply for this role</h2>
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="a_name">Full name</label>
          <input
            id="a_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="field">
          <label htmlFor="a_email">Email</label>
          <input
            id="a_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.test"
          />
        </div>
        <div className="field">
          <label htmlFor="a_phone">Phone (optional)</label>
          <input
            id="a_phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1-555-0100"
          />
        </div>
        <div className="field">
          <label htmlFor="a_links">Portfolio or LinkedIn (optional)</label>
          <input
            id="a_links"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder="https://linkedin.example.test/in/you"
          />
        </div>
        <div className="field">
          <label htmlFor="a_source">How did you hear about us?</label>
          <select id="a_source" value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a_motivation">Why do you want to work here?</label>
          <textarea
            id="a_motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Tell us about your journey, your metrics, or your gong."
          />
        </div>
        <label className="check-row" htmlFor="a_passion">
          <input
            id="a_passion"
            type="checkbox"
            checked={passion}
            onChange={(e) => setPassion(e.target.checked)}
          />
          <span>
            I confirm that I am passionate about wellness, growth, and the color purple.
          </span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit application'}
        </button>
        <div className="err">{error}</div>
      </form>
    </div>
  );
}

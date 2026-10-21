export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <circle cx="15" cy="15" r="12" stroke="#8B5CF6" strokeWidth="2.5" />
      <path
        d="M3 15 H9 L11 10 L14 19 L16 13 H21"
        stroke="#A78BFA"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LabBanner() {
  return (
    <div className="lab-banner" role="region" aria-label="Lab notice">
      ⚠ <b>Zero Health Lab</b> · intentionally vulnerable · do not deploy publicly
    </div>
  );
}

export function MeshBackground() {
  return (
    <div className="mesh-bg" aria-hidden="true">
      <div className="mesh-blob b1"></div>
      <div className="mesh-blob b2"></div>
      <div className="mesh-blob b3"></div>
      <div className="mesh-blob b4"></div>
    </div>
  );
}

export function initials(name: string | null | undefined): string {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size <= 30 ? 11 : 13 }}>
      {initials(name)}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting collection',
  collected: 'Collected',
  cancelled: 'Cancelled',
  scheduled: 'Scheduled',
};

export function Pill({ status, label }: { status: string; label?: string }) {
  return <span className={`pill ${status}`}>{label || STATUS_LABELS[status] || status}</span>;
}

export function prettyWhen(s: string | null | undefined): string {
  return (s || '').replace('T', ' ');
}

export function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

export function AccessDenied() {
  return (
    <div className="panel">
      <h2>Not available</h2>
      <p className="empty">This view is not part of your portal.</p>
    </div>
  );
}

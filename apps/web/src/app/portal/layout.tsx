'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { api, Conversation, getToken } from '@/lib/api';
import { Logo, Avatar } from '@/components/ui';
import { LabBanner } from '@/components/lab-banner';
import { AgentWidget } from '@/components/agent-widget';

interface NavItem {
  href: string;
  label: string;
  badge?: 'messages';
}

const NAV: Record<string, NavItem[]> = {
  patient: [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/appointments', label: 'Appointments' },
    { href: '/portal/records', label: 'My records' },
    { href: '/portal/messages', label: 'Messages', badge: 'messages' },
    { href: '/portal/family', label: 'Family' },
    { href: '/portal/lookup', label: 'Record lookup' },
    { href: '/portal/profile', label: 'Profile' },
    { href: '/portal/plus', label: 'Plus ✦' },
  ],
  doctor: [
    { href: '/portal', label: 'Overview' },
    { href: '/portal/appointments', label: 'Appointments' },
    { href: '/portal/patients', label: 'Patients' },
    { href: '/portal/labs', label: 'Lab results' },
    { href: '/portal/messages', label: 'Messages', badge: 'messages' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/profile', label: 'Profile' },
  ],
  pharmacist: [
    { href: '/portal', label: 'Overview' },
    { href: '/portal/patients', label: 'Patients' },
    { href: '/portal/messages', label: 'Messages', badge: 'messages' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/profile', label: 'Profile' },
  ],
  labtech: [
    { href: '/portal', label: 'Overview' },
    { href: '/portal/appointments', label: 'Appointments' },
    { href: '/portal/patients', label: 'Patients' },
    { href: '/portal/labs', label: 'Lab results' },
    { href: '/portal/messages', label: 'Messages', badge: 'messages' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/profile', label: 'Profile' },
  ],
  admin: [
    { href: '/portal', label: 'Overview' },
    { href: '/portal/appointments', label: 'Appointments' },
    { href: '/portal/users', label: 'Users' },
    { href: '/portal/applications', label: 'Applications' },
    { href: '/portal/messages', label: 'Messages', badge: 'messages' },
    { href: '/portal/search', label: 'Search' },
    { href: '/portal/profile', label: 'Profile' },
  ],
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const refreshUnread = useCallback(async (): Promise<void> => {
    const { ok, data } = await api<Conversation[]>('/conversations');
    if (ok && Array.isArray(data)) {
      setUnread(data.reduce((sum, c) => sum + (c.unread || 0), 0));
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const timer = setInterval(refreshUnread, 15000);
    return () => clearInterval(timer);
  }, [user, pathname, refreshUnread]);

  // Report page views to analytics.
  useEffect(() => {
    if (!pathname) return;
    const token = getToken();
    void fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  if (loading) {
    return (
      <>
        <LabBanner />
        <div className="portal-loading">Loading…</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LabBanner />
        <div className="portal-loading">Redirecting to sign in…</div>
      </>
    );
  }

  const nav = NAV[user.role] || NAV.patient;

  return (
    <>
      <LabBanner />
      <header className="mobile-bar">
        <button
          className="nav-burger"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          aria-controls="portal-nav"
          onClick={() => setNavOpen(!navOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Logo />
        <span className="brand">Zero Health</span>
      </header>
      {navOpen && <div className="nav-backdrop" aria-hidden="true" onClick={() => setNavOpen(false)} />}
      <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
        <aside className="side" id="portal-nav">
          <div className="logo">
            <Logo />
            <span className="brand">Zero Health</span>
          </div>
          <span className="role-tag">{user.role}</span>
          {nav.map((item) => (
            <button
              key={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => {
                router.push(item.href);
                setNavOpen(false);
              }}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge === 'messages' && unread !== null && unread > 0 && (
                <span className="nav-badge">{unread}</span>
              )}
            </button>
          ))}
          <div className="side-foot">
            <Avatar name={user.full_name} />
            <div className="who">
              <div className="n">{user.full_name}</div>
              <div className="r">{user.role}</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
            >
              ⎋
            </button>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
      <AgentWidget />
    </>
  );
}

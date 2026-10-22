import Link from 'next/link';
import { Logo, MeshBackground } from '@/components/ui';
import { LabBanner } from '@/components/lab-banner';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LabBanner />
      <MeshBackground />
      

      <nav className="l-nav">
        <Link href="/" className="logo">
          <Logo size={30} />
          <span className="brand">Zero Health</span>
        </Link>
        <div className="l-navlinks">
          <Link href="/#features">Platform</Link>
          <Link href="/#portals">Portals</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/blog">Blog</Link>
        </div>
        <div className="l-nav-cta">
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/login" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="l-footer">
        <Link href="/" className="logo">
          <Logo size={26} />
          <span className="brand" style={{ fontSize: 15 }}>
            Zero Health
          </span>
        </Link>
        <div className="l-footer-links">
          <Link href="/jobs">Jobs</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/login">Sign in</Link>
        </div>
        <span className="muted">Not a real medical service</span>
      </footer>
    </>
  );
}

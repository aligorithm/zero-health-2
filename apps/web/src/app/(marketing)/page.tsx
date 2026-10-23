import Link from 'next/link';
import { POSTS } from '@/content/posts';

export default function LandingPage() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <span className="dot"></span> The connected care platform
        </div>
        <h1>
          Healthcare that
          <br />
          <span className="grad">keeps up with you</span>
        </h1>
        <p>
          Book consultations, manage prescriptions, and message your care team in one place. Built
          for patients and clinicians alike.
        </p>
        <div className="hero-cta">
          <Link href="/login" className="btn btn-primary btn-lg">
            Start free
          </Link>
          <a href="#features" className="btn btn-ghost btn-lg">
            Explore the platform
          </a>
        </div>
        <div className="trust">
          <div className="item">
            <span className="num">24/7</span>
            <span className="lbl">Virtual care</span>
          </div>
          <div className="item">
            <span className="num">5 min</span>
            <span className="lbl">Avg. wait time</span>
          </div>
          <div className="item">
            <span className="num">98%</span>
            <span className="lbl">Patient satisfaction</span>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-head">
          <h2>Everything your care needs</h2>
          <p>One platform connecting patients, doctors, pharmacists, and labs in real time.</p>
        </div>
        <div className="grid">
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <h3>Smart scheduling</h3>
            <p>Find the right clinician and book in seconds, with instant video consults or in-person visits.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 7a2 2 0 012-2h12a2 2 0 012 2M4 7v12a2 2 0 002 2h12a2 2 0 002-2V7M9 11h6M9 15h4" />
              </svg>
            </div>
            <h3>Prescriptions</h3>
            <p>Renew, track, and route prescriptions straight to your pharmacy with full visibility.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 2v6l-5 9a2 2 0 002 3h12a2 2 0 002-3l-5-9V2M9 2h6M7 14h10" />
              </svg>
            </div>
            <h3>Lab results</h3>
            <p>Get results fast with plain-language summaries you can actually understand.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3>Secure messaging</h3>
            <p>Message your care team directly and keep every conversation in one place.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
              </svg>
            </div>
            <h3>Zero Agent</h3>
            <p>An AI assistant that helps patients and staff navigate care, 24 hours a day.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
              </svg>
            </div>
            <h3>Your data, protected</h3>
            <p>Enterprise-grade controls keep your health information private and in your hands.</p>
          </div>
        </div>
      </section>

      <section className="portals" id="portals">
        <div className="portals-inner">
          <div>
            <h2>Built for every role</h2>
            <p>Zero Health connects everyone in the care journey with a portal tailored to how they work.</p>
            <div className="portal-list">
              <div className="portal-row">
                <span className="chk">✓</span> Patient portal · appointments, prescriptions, results
              </div>
              <div className="portal-row">
                <span className="chk">✓</span> Doctor portal · consults, patient history, prescribing
              </div>
              <div className="portal-row">
                <span className="chk">✓</span> Pharmacist dashboard · dispensing queue, verification
              </div>
              <div className="portal-row">
                <span className="chk">✓</span> Lab technician dashboard · result entry, panels
              </div>
              <div className="portal-row">
                <span className="chk">✓</span> Admin console · users, roles, configuration
              </div>
            </div>
          </div>
          <div className="mock">
            <div className="mock-bar">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <div className="mock-body">
              <div className="mock-line v" style={{ width: '40%' }}></div>
              <div className="mock-line" style={{ width: '85%' }}></div>
              <div className="mock-line" style={{ width: '70%' }}></div>
              <div className="mock-cards">
                <div className="mock-mini"></div>
                <div className="mock-mini"></div>
                <div className="mock-mini"></div>
                <div className="mock-mini"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="section-head">
          <h2>Zero Health Plus</h2>
          <p>Care that moves even faster, for the price of a coffee.</p>
        </div>
        <div className="grid">
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <h3>Video consults</h3>
            <p>Face-to-face visits from any appointment, without leaving the portal.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M4 20c0-3 2-5 5-5s5 2 5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M14 20c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4"/></svg>
            </div>
            <h3>Family accounts</h3>
            <p>Manage appointments and records for your children and dependants.</p>
          </div>
          <div className="card">
            <div className="ico">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>
            </div>
            <h3>History import</h3>
            <p>Bring your medical history into Zero Health in one import.</p>
          </div>
        </div>
        <div className="plan-grid" style={{ marginTop: 26 }}>
          <div className="plan-card plan-selected" style={{ cursor: 'default' }}>
            <div className="plan-name">Monthly</div>
            <div className="plan-price">$5<span>/month</span></div>
            <div className="s">Everything in Plus, billed monthly</div>
          </div>
          <div className="plan-card" style={{ cursor: 'default' }}>
            <div className="plan-name">Annual</div>
            <div className="plan-price">$50<span>/year</span></div>
            <div className="s">Two months free, billed yearly</div>
          </div>
        </div>
        <div className="section-cta">
          <Link href="/login" className="btn btn-primary">
            Get Zero Health Plus
          </Link>
        </div>
      </section>

      <section className="section" id="blog-teaser">
        <div className="section-head">
          <h2>From the blog</h2>
          <p>Announcements, research, and brand journeys from the Zero Health team.</p>
        </div>
        <div className="list-grid">
          {POSTS.slice(0, 3).map((post) => (
            <div className="list-card" key={post.slug}>
              <div className="meta">
                <span className="tag">{post.tag}</span>
                <span>{post.date}</span>
              </div>
              <h3>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="excerpt">{post.excerpt}</p>
            </div>
          ))}
        </div>
        <div className="section-cta">
          <Link href="/blog" className="btn btn-ghost">
            All articles
          </Link>
        </div>
      </section>
    </>
  );
}

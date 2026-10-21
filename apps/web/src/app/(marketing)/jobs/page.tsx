import Link from 'next/link';
import { JOBS } from '@/content/jobs';

export const metadata = {
  title: 'Jobs · Zero Health',
  description: 'Open roles at Zero Health.',
};

export default function JobsPage() {
  return (
    <div className="page-container">
      <h1 className="sr-only">Jobs at Zero Health</h1>
      <div className="section-head" style={{ marginBottom: 36 }}>
        <h2>Join the journey</h2>
        <p>Help us redefine care, disrupt healthcare, and quarterly both.</p>
      </div>

      <div className="job-list">
        {JOBS.map((job) => (
          <Link href={`/jobs/${job.slug}`} className="job-row" key={job.slug}>
            <div className="job-main">
              <div className="job-title">{job.title}</div>
              <div className="job-sub">{job.excerpt}</div>
            </div>
            <div className="job-meta">
              <span className="tag">{job.department}</span>
              <span className="job-meta-line">{job.location}</span>
              <span className="job-meta-line">{job.type}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

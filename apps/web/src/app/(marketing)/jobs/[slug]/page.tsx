import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JOBS } from '@/content/jobs';
import { ApplyForm } from '@/components/apply-form';

interface Props {
  params: { slug: string };
}

export function generateStaticParams(): Array<{ slug: string }> {
  return JOBS.map((job) => ({ slug: job.slug }));
}

export function generateMetadata({ params }: Props) {
  const job = JOBS.find((j) => j.slug === params.slug);
  return { title: job ? `${job.title} · Zero Health` : 'Job · Zero Health' };
}

export default function JobDetailPage({ params }: Props) {
  const job = JOBS.find((j) => j.slug === params.slug);
  if (!job) notFound();

  return (
    <div className="page-container">
      <Link href="/jobs" className="back-link">
        ← All roles
      </Link>
      <h1>{job.title}</h1>
      <div className="meta">
        <span className="tag">{job.department}</span>
        <span>{job.location}</span>
        <span>{job.type}</span>
        <span>Posted {job.posted}</span>
        <span>{job.salary}</span>
      </div>

      <div className="prose">
        {job.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        <h2>What you will do</h2>
        <ul>
          {job.responsibilities.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>

        <h2>What we are looking for</h2>
        <ul>
          {job.requirements.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>

        {job.niceToHave && (
          <>
            <h2>Nice to have</h2>
            <p>{job.niceToHave}</p>
          </>
        )}
      </div>

      <ApplyForm jobSlug={job.slug} jobTitle={job.title} />
    </div>
  );
}

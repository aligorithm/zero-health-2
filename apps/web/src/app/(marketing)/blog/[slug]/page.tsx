import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POSTS } from '@/content/posts';

interface Props {
  params: { slug: string };
}

export function generateStaticParams(): Array<{ slug: string }> {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props) {
  const post = POSTS.find((p) => p.slug === params.slug);
  return { title: post ? `${post.title} · Zero Health` : 'Article · Zero Health' };
}

export default function PostPage({ params }: Props) {
  const post = POSTS.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <article className="page-container">
      <Link href="/blog" className="back-link">
        ← All articles
      </Link>
      <h1>{post.title}</h1>
      <div className="meta">
        <span className="tag">{post.tag}</span>
        <span>{post.date}</span>
        <span>{post.readTime}</span>
        <span>
          By {post.author}, {post.authorRole}
        </span>
      </div>

      <div className="prose">
        {post.blocks.map((block, i) => (
          <section key={i}>
            {block.heading && <h2>{block.heading}</h2>}
            {block.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

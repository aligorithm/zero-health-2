import Link from 'next/link';
import { POSTS } from '@/content/posts';

export const metadata = {
  title: 'Blog · Zero Health',
  description: 'Announcements, research, and brand journeys from Zero Health.',
};

export default function BlogPage() {
  return (
    <div className="page-container">
      <h1 className="sr-only">The Zero Health blog</h1>
      <div className="section-head" style={{ marginBottom: 36 }}>
        <h2>The Zero Health blog</h2>
        <p>Product news, landmark internal research, and the occasional brand journey.</p>
      </div>

      <div className="post-list">
        {POSTS.map((post) => (
          <Link href={`/blog/${post.slug}`} className="post-row" key={post.slug}>
            <div className="meta">
              <span className="tag">{post.tag}</span>
              <span>{post.date}</span>
              <span>{post.readTime}</span>
            </div>
            <h3 className="post-title">{post.title}</h3>
            <p className="excerpt">{post.excerpt}</p>
            <p className="post-author">
              By {post.author}, {post.authorRole}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

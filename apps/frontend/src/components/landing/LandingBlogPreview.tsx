import { useEffect, useState } from "react";

type BlogPostPreview = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publish_date: string | null;
};

const BLOG_URL = import.meta.env.VITE_BLOG_URL || "https://blog.odinvestor.net";

export function LandingBlogPreview() {
  const [posts, setPosts] = useState<BlogPostPreview[]>([]);

  useEffect(() => {
    fetch(`${BLOG_URL}/api/latest`)
      .then((r) => r.json())
      .then((data) => setPosts(data))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="px-6 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Blog
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl">
            Latest from the blog
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 items-center gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <a
              key={post.slug}
              href={`${BLOG_URL}/${post.slug}`}
              className="group rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-7 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
            >
              {post.publish_date && (
                <p className="text-xs font-medium text-emerald-400/80">
                  {new Date(post.publish_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              <h3 className="mt-3 text-xl font-semibold text-emerald-50 group-hover:text-white transition-colors">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="mt-3 text-sm leading-relaxed text-emerald-200/80 line-clamp-3">
                  {post.excerpt}
                </p>
              )}
              {post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a
            href={BLOG_URL}
            className="inline-flex h-11 items-center rounded-lg border border-emerald-300/40 bg-emerald-900/20 px-6 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/40 transition-colors"
          >
            View all posts →
          </a>
        </div>
      </div>
    </section>
  );
}

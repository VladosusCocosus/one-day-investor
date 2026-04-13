import Html from "@kitajs/html";
import type { BlogPost } from "../db";
import type { User } from "@types";
import { renderBlock, TagPill } from "../components";
import { Layout } from "../layout";

export function PostPage({ post, user }: { post: BlogPost; user?: User | null }) {
  const date = post.publish_date
    ? new Date(post.publish_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Draft";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publish_date || undefined,
    dateModified: post.updated_at || undefined,
    author: {
      "@type": "Organization",
      name: "One Day Investor",
      url: "https://odinvestor.net",
    },
    publisher: {
      "@type": "Organization",
      name: "One Day Investor",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${process.env.BLOG_URL || "https://blog.odinvestor.net"}/${post.slug}`,
    },
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
  };

  return (
    <Layout
      title={post.title}
      description={post.excerpt}
      ogImage={post.og_image}
      canonicalPath={`/${post.slug}`}
      publishDate={post.publish_date}
      modifiedDate={post.updated_at}
      ogType="article"
      jsonLd={jsonLd}
      user={user}
    >
      {/* Post metadata */}
      <div class="px-6 pt-8 md:px-8">
        <div class="mx-auto max-w-[760px]">
          <a
            href="/"
            class="inline-flex items-center gap-1.5 text-sm text-emerald-300 hover:text-emerald-200 transition-colors"
          >
            &larr; All posts
          </a>
          <p class="mt-4 text-xs font-medium text-emerald-400/80">{date}</p>
          {post.tags.length > 0 && (
            <div class="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagPill
                  tag={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render content blocks */}
      {post.content.map((block) => renderBlock(block))}
    </Layout>
  );
}

export function NotFoundPage({ user }: { user?: User | null }) {
  return (
    <Layout title="Not Found" user={user}>
      <section class="px-6 py-32 text-center md:px-8">
        <h1 class="text-4xl font-bold text-emerald-50">Post not found</h1>
        <p class="mt-4 text-lg text-emerald-200/80">
          The post you're looking for doesn't exist.
        </p>
        <a
          href="/"
          class="mt-8 inline-flex h-10 items-center rounded-md bg-emerald-50 px-5 text-sm font-semibold text-emerald-950 hover:bg-white transition-colors"
        >
          Back to blog
        </a>
      </section>
    </Layout>
  );
}

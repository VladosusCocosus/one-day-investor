import Html from "@kitajs/html";
import type { BlogPost } from "../db";
import type { User } from "@types";
import { TagPill } from "../components";
import { Layout } from "../layout";

function PostCard({ post }: { post: BlogPost }) {
  const date = post.publish_date
    ? new Date(post.publish_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Draft";

  return (
    <a
      href={`/${post.slug}`}
      class="group block rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-8 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
    >
      <p class="text-xs font-medium text-emerald-400/80">{date}</p>
      <h2 class="mt-3 text-2xl font-bold tracking-tight text-emerald-50 group-hover:text-white sm:text-3xl">
        {post.title}
      </h2>
      {post.excerpt && (
        <p class="mt-3 text-base leading-relaxed text-emerald-200/80 line-clamp-3">
          {post.excerpt}
        </p>
      )}
      {post.tags.length > 0 && (
        <div class="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span class="inline-flex items-center rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

export function ListPage({
  posts,
  allTags,
  activeTag,
  user,
}: {
  posts: BlogPost[];
  allTags: string[];
  activeTag?: string;
  user?: User | null;
}) {
  return (
    <Layout
      title={activeTag ? `#${activeTag}` : "Blog"}
      description="Thoughts on investing, wealth-building, and the One Day Investor philosophy."
      user={user}
    >
      {/* Hero */}
      <section class="px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16">
        <div class="mx-auto max-w-[960px] text-center">
          <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <span
              class="h-2 w-2 rounded-[2px]"
              style="background: linear-gradient(135deg, #6ee7b7, #10b981)"
            ></span>
            Blog
          </p>
          <h1 class="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-emerald-50 sm:text-5xl md:text-6xl">
            {activeTag ? (
              <>
                Posts tagged{" "}
                <span class="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
                  #{activeTag}
                </span>
              </>
            ) : (
              <>
                Thoughts on the{" "}
                <span class="bg-gradient-to-r from-emerald-50 via-emerald-200 to-emerald-300 bg-clip-text text-transparent">
                  long game.
                </span>
              </>
            )}
          </h1>
        </div>
      </section>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <section class="px-6 pb-12 md:px-8">
          <div class="mx-auto flex max-w-[960px] flex-wrap justify-center gap-2">
            <TagPill tag="All" active={!activeTag} href="/" />
            {allTags.map((tag) => (
              <TagPill
                tag={tag}
                active={activeTag === tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Posts grid */}
      <section class="px-6 pb-24 md:px-8 md:pb-32">
        <div class="mx-auto max-w-[960px]">
          {posts.length === 0 ? (
            <p class="text-center text-lg text-emerald-200/60">
              No posts yet. Check back soon.
            </p>
          ) : (
            <div class="space-y-6">
              {posts.map((post) => (
                <PostCard post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

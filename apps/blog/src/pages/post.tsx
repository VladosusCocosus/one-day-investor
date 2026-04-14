import Html from "@kitajs/html";
import type { BlogPost } from "../db";
import type { User } from "@types";
import { renderBlock, TagPill, LikeButton, SignInModal } from "../components";
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

      {/* Like button below content */}
      <LikeButton slug={post.slug} />

      {/* Sign-in modal (hidden by default) */}
      <SignInModal />

      {/* Client-side like interactivity */}
      <script>
        {`
          (function() {
            var slug = "${post.slug}";
            var isLoggedIn = ${user ? "true" : "false"};
            var btn = document.getElementById("like-btn");
            var heart = document.getElementById("like-heart");
            var countEl = document.getElementById("like-count");
            var modal = document.getElementById("signin-modal");
            var dismiss = document.getElementById("signin-dismiss");
            var liked = false;
            var count = 0;

            function updateUI() {
              countEl.textContent = count;
              if (liked) {
                heart.setAttribute("fill", "currentColor");
                heart.classList.remove("text-emerald-300");
                heart.classList.add("text-emerald-400");
              } else {
                heart.setAttribute("fill", "none");
                heart.classList.remove("text-emerald-400");
                heart.classList.add("text-emerald-300");
              }
            }

            function showModal() {
              modal.style.display = "flex";
            }

            function hideModal() {
              modal.style.display = "none";
            }

            // Fetch initial state
            fetch("/api/posts/" + slug + "/likes", { credentials: "include" })
              .then(function(r) { return r.json(); })
              .then(function(data) {
                count = data.count;
                liked = data.liked;
                updateUI();
              });

            btn.addEventListener("click", function() {
              if (!isLoggedIn) {
                showModal();
                return;
              }
              // Optimistic update
              liked = !liked;
              count += liked ? 1 : -1;
              updateUI();

              fetch("/api/posts/" + slug + "/like", {
                method: liked ? "POST" : "DELETE",
                credentials: "include",
              })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                  count = data.count;
                  liked = data.liked;
                  updateUI();
                })
                .catch(function() {
                  // Revert on error
                  liked = !liked;
                  count += liked ? 1 : -1;
                  updateUI();
                });
            });

            // Modal dismissal
            dismiss.addEventListener("click", hideModal);
            modal.addEventListener("click", function(e) {
              if (e.target === modal) hideModal();
            });
            document.addEventListener("keydown", function(e) {
              if (e.key === "Escape") hideModal();
            });
          })();
        `}
      </script>
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

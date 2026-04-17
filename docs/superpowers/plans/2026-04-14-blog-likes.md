# Blog Likes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a like/unlike toggle to blog posts with a sign-in modal for anonymous users.

**Architecture:** New `post_likes` table in the blog database with composite PK `(post_id, user_id)`. Three JSON API endpoints for get/like/unlike. Server-rendered like button + sign-in modal with inline JS for interactivity.

**Tech Stack:** PostgreSQL, Elysia (blog server), KitaJS/HTML (server-side JSX), inline vanilla JS for client-side behavior.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/database/modules/blog/index.ts` | `post_likes` table init + like query functions |
| `apps/blog/src/index.tsx` | 3 API routes for likes |
| `apps/blog/src/components.tsx` | `LikeButton` and `SignInModal` server components |
| `apps/blog/src/pages/post.tsx` | Integrate like button + modal + inline script into post page |

---

### Task 1: Database — post_likes table and query functions

**Files:**
- Modify: `packages/database/modules/blog/index.ts`

- [ ] **Step 1: Add post_likes table creation to `initBlogSchema()`**

In `packages/database/modules/blog/index.ts`, add after the existing `ALTER TABLE` statement at line 65:

```typescript
  await blogPool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )
  `);
```

- [ ] **Step 2: Add like query functions**

Add these functions at the end of `packages/database/modules/blog/index.ts`:

```typescript
export async function getLikeInfo(
  postId: number,
  userId?: string | null
): Promise<{ count: number; liked: boolean }> {
  const countResult = await blogPool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM post_likes WHERE post_id = $1",
    [postId]
  );
  const count = parseInt(countResult.rows[0].count, 10);

  if (!userId) return { count, liked: false };

  const likeResult = await blogPool.query(
    "SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2",
    [postId, userId]
  );
  return { count, liked: likeResult.rowCount! > 0 };
}

export async function addLike(postId: number, userId: string): Promise<void> {
  await blogPool.query(
    "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [postId, userId]
  );
}

export async function removeLike(postId: number, userId: string): Promise<void> {
  await blogPool.query(
    "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
    [postId, userId]
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/database/modules/blog/index.ts
git commit -m "feat(blog): add post_likes table and query functions"
```

---

### Task 2: API — likes endpoints

**Files:**
- Modify: `apps/blog/src/index.tsx`

- [ ] **Step 1: Add like imports**

In `apps/blog/src/index.tsx`, update the import block from `"./db"` (lines 8–20) to include the new functions:

```typescript
import {
  initBlogSchema,
  listLatestPosts,
  listPublishedPosts,
  listAllPosts,
  getPostBySlug,
  getPostById,
  getAllTags,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  setOgImage,
  getLikeInfo,
  addLike,
  removeLike,
} from "./db";
```

- [ ] **Step 2: Add the three API endpoints**

Add these routes after the `/api/latest` route (after line 62) and before the `/robots.txt` route:

```typescript
  .get("/api/posts/:slug/likes", async ({ params, cookie }) => {
    const post = await getPostBySlug(params.slug);
    if (!post) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    const user = await resolveUser(cookie);
    const info = await getLikeInfo(post.id, user?.id);
    return info;
  })

  .post("/api/posts/:slug/like", async ({ params, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const post = await getPostBySlug(params.slug);
    if (!post) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    await addLike(post.id, user.id);
    const info = await getLikeInfo(post.id, user.id);
    return info;
  })

  .delete("/api/posts/:slug/like", async ({ params, cookie }) => {
    const user = await resolveUser(cookie);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const post = await getPostBySlug(params.slug);
    if (!post) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    await removeLike(post.id, user.id);
    const info = await getLikeInfo(post.id, user.id);
    return info;
  })
```

- [ ] **Step 3: Commit**

```bash
git add apps/blog/src/index.tsx
git commit -m "feat(blog): add likes API endpoints"
```

---

### Task 3: UI — LikeButton and SignInModal components

**Files:**
- Modify: `apps/blog/src/components.tsx`

- [ ] **Step 1: Add LikeButton component**

Add this component at the end of `apps/blog/src/components.tsx` (before the closing of the file, after the `TagPill` component):

```typescript
export function LikeButton({ slug }: { slug: string }) {
  return (
    <div class="px-6 pt-6 pb-2 md:px-8">
      <div class="mx-auto max-w-[760px] flex items-center gap-3">
        <button
          id="like-btn"
          data-slug={slug}
          class="group flex items-center gap-2 rounded-full border border-emerald-900/50 bg-emerald-950/40 px-4 py-2 text-sm transition-colors hover:border-emerald-700/50 hover:bg-emerald-900/30"
        >
          <svg
            id="like-heart"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-emerald-300 transition-colors group-hover:text-emerald-200"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span id="like-count" class="text-emerald-200 tabular-nums">...</span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add SignInModal component**

Add this component right after `LikeButton`:

```typescript
export function SignInModal() {
  return (
    <div
      id="signin-modal"
      class="fixed inset-0 z-[100] hidden items-center justify-center"
      style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px);"
    >
      <div
        class="mx-4 max-w-[360px] rounded-2xl border border-emerald-500/30 p-8 text-center shadow-2xl"
        style="background: rgba(6, 78, 54, 0.95); backdrop-filter: blur(12px);"
      >
        <div class="text-3xl">&#x2764;&#xFE0F;</div>
        <p class="mt-4 text-lg font-semibold text-emerald-50">
          Sign in to like this post
        </p>
        <p class="mt-2 text-sm leading-relaxed text-emerald-200/80">
          Join One Day Investor to save your favorites and get personalized insights.
        </p>
        <a
          href="https://odinvestor.net/login"
          class="mt-6 inline-flex h-10 items-center rounded-md bg-emerald-50 px-6 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-white"
        >
          Sign in
        </a>
        <p
          id="signin-dismiss"
          class="mt-3 cursor-pointer text-sm text-emerald-300 transition-colors hover:text-emerald-200"
        >
          Maybe later
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/blog/src/components.tsx
git commit -m "feat(blog): add LikeButton and SignInModal components"
```

---

### Task 4: Integration — wire up like button in post page with client-side JS

**Files:**
- Modify: `apps/blog/src/pages/post.tsx`

- [ ] **Step 1: Import the new components**

In `apps/blog/src/pages/post.tsx`, update the import from `"../components"` (line 4):

```typescript
import { renderBlock, TagPill, LikeButton, SignInModal } from "../components";
```

- [ ] **Step 2: Add LikeButton, SignInModal, and inline script to PostPage**

Replace the return block of `PostPage` (lines 39–77) with:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/blog/src/pages/post.tsx
git commit -m "feat(blog): integrate like button and sign-in modal into post page"
```

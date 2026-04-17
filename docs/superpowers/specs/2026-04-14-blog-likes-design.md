# Blog Likes Feature

## Overview

Add a like/unlike toggle to blog posts. One like per user per post. Anonymous users see a sign-in modal when they try to like.

## Database

New `post_likes` table in the **blog database** (separate from main app database):

```sql
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
```

- Composite primary key enforces one like per user per post
- `user_id` is a UUID matching the main app's `users.id` — no foreign key since it's a cross-database reference
- `ON DELETE CASCADE` cleans up likes when a post is deleted

New database functions in `packages/database/modules/blog/index.ts`:

- `getLikeCount(postId)` — returns total like count for a post
- `getUserLike(postId, userId)` — checks if a specific user has liked a post
- `addLike(postId, userId)` — inserts a like (uses `ON CONFLICT DO NOTHING`)
- `removeLike(postId, userId)` — deletes a like
- `getLikeInfo(postId, userId?)` — combined query returning `{ count, liked }` in one call

Schema initialization added to `initBlogSchema()` alongside the posts table creation.

## API Endpoints

Three new routes in `apps/blog/src/index.tsx`:

| Method | Path | Auth Required | Response |
|--------|------|---------------|----------|
| `GET` | `/api/posts/:slug/likes` | No | `{ count: number, liked: boolean }` |
| `POST` | `/api/posts/:slug/like` | Yes | `{ count: number, liked: true }` |
| `DELETE` | `/api/posts/:slug/like` | Yes | `{ count: number, liked: false }` |

- GET: Resolves user from cookie if present to determine `liked` status. Returns `liked: false` for anonymous users.
- POST/DELETE: Returns 401 JSON `{ error: "Unauthorized" }` if no valid session.
- All endpoints resolve the post by slug first; return 404 if post not found.

## UI Components

### Like Button

Rendered server-side in `apps/blog/src/pages/post.tsx`, positioned below the hero block (before the first content block).

HTML structure:
```html
<div id="like-section" data-slug="..." data-user="true|false">
  <button id="like-btn">
    <svg><!-- heart icon (outline or filled) --></svg>
    <span id="like-count">...</span>
  </button>
</div>
```

Styling:
- Heart icon in `emerald-300`, filled `emerald-400` when liked
- Count in `emerald-200`, `text-sm`
- Subtle hover transition on the heart
- Centered below the hero, consistent with the post page layout

### Client-Side Behavior

Inline `<script>` at the bottom of the post page (same pattern as the nav scroll script in layout.tsx):

1. **On load**: `GET /api/posts/{slug}/likes` — populate heart state and count
2. **Click (logged in)**: Toggle via `POST` or `DELETE`, update UI optimistically (flip heart + increment/decrement count immediately, revert on error)
3. **Click (not logged in)**: Show the sign-in modal

The `data-user` attribute (set server-side based on `resolveUser()`) determines which click path to take.

### Sign-In Modal

Rendered server-side as hidden HTML in the post page. Shown/hidden via JS class toggle.

Structure:
- **Backdrop**: Fixed overlay, `rgba(0, 0, 0, 0.5)`, click-to-dismiss
- **Card**: Centered, emerald-themed (`bg-[#064e36]/95`, `border-emerald-500/30`, `backdrop-blur`, `rounded-2xl`)
- **Content**:
  - Heart emoji (decorative)
  - Heading: "Sign in to like this post"
  - Subtext: "Join One Day Investor to save your favorites and get personalized insights."
  - CTA button: Links to `https://odinvestor.net/login` — styled as `bg-emerald-50 text-emerald-950` (matches existing CTA buttons)
  - Dismiss link: "Maybe later" in `emerald-300`

Dismiss triggers: clicking backdrop, clicking "Maybe later", or pressing Escape.

## Files Modified

| File | Change |
|------|--------|
| `packages/database/modules/blog/index.ts` | Add `post_likes` table init + query functions |
| `apps/blog/src/index.tsx` | Add 3 API routes |
| `apps/blog/src/pages/post.tsx` | Add like button below hero + sign-in modal HTML + inline script |
| `apps/blog/src/components.tsx` | Add `LikeButton` and `SignInModal` server components |

## Not in Scope

- Like counts on the blog list page (can be added later)
- Like animations (keep it simple for now)
- Like notifications
- Like history / "posts you liked" page

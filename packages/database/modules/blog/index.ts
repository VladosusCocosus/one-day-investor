import { blogPool } from "./pool";

export { migrateBlogPostsFromJson } from "./migrate";

export type Block =
  | { type: "hero"; label?: string; title: string; subtitle?: string }
  | { type: "prose"; label?: string; heading?: string; paragraphs: string[] }
  | { type: "pull-quote"; text: string }
  | {
      type: "comparison";
      label?: string;
      heading?: string;
      intro?: string;
      left: { label: string; items: string[] };
      right: { label: string; items: string[] };
      outro?: string;
    }
  | { type: "closing"; text: string; author: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "markdown"; label?: string; heading?: string; body: string }
  | {
      type: "chart";
      chartType: "bar" | "horizontal-bar" | "line" | "donut";
      heading?: string;
      caption?: string;
      height?: number;
      data: {
        labels: string[];
        series: number[] | { name: string; values: number[] }[];
      };
      options?: {
        colors?: string[];
        suffix?: string;
        prefix?: string;
        stacked?: boolean;
      };
    };

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  content: Block[];
  og_image: string | null;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
};

type BlogPostRow = Omit<BlogPost, "tags" | "content"> & {
  tags: string;
  content: string;
};

function rowToPost(row: BlogPostRow): BlogPost {
  return {
    ...row,
    tags: JSON.parse(row.tags),
    content: JSON.parse(row.content),
  };
}

/** Run once on startup to ensure table exists */
export async function initBlogSchema(): Promise<void> {
  await blogPool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      tags JSONB DEFAULT '[]',
      content JSONB NOT NULL DEFAULT '[]',
      og_image TEXT,
      publish_date DATE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  // Add og_image column if table already existed without it
  await blogPool.query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS og_image TEXT
  `);
  await blogPool.query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_hash TEXT
  `);
  await blogPool.query(`
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )
  `);
  await blogPool.query(`
    CREATE TABLE IF NOT EXISTS post_translations (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      lang TEXT NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      content JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (post_id, lang)
    )
  `);
}

export async function setOgImage(id: number, key: string): Promise<void> {
  await blogPool.query(
    "UPDATE posts SET og_image = $1, updated_at = now() WHERE id = $2",
    [key, id]
  );
}

export async function listLatestPosts(limit: number = 3): Promise<BlogPost[]> {
  const result = await blogPool.query<BlogPostRow>(
    `SELECT id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at
     FROM posts
     WHERE publish_date IS NOT NULL
     ORDER BY publish_date DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(rowToPost);
}

export async function listPublishedPosts(tag?: string): Promise<BlogPost[]> {
  let result;
  if (tag) {
    result = await blogPool.query<BlogPostRow>(
      `SELECT id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at
       FROM posts
       WHERE publish_date IS NOT NULL AND tags ? $1
       ORDER BY publish_date DESC`,
      [tag]
    );
  } else {
    result = await blogPool.query<BlogPostRow>(
      `SELECT id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at
       FROM posts
       WHERE publish_date IS NOT NULL
       ORDER BY publish_date DESC`
    );
  }
  return result.rows.map(rowToPost);
}

export async function listAllPosts(): Promise<BlogPost[]> {
  const result = await blogPool.query<BlogPostRow>(
    `SELECT id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at
     FROM posts
     ORDER BY created_at DESC`
  );
  return result.rows.map(rowToPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const result = await blogPool.query<BlogPostRow>(
    `SELECT id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at
     FROM posts WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] ? rowToPost(result.rows[0]) : null;
}

export async function getPostById(id: number): Promise<BlogPost | null> {
  const result = await blogPool.query<BlogPostRow>(
    `SELECT id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at
     FROM posts WHERE id = $1`,
    [id]
  );
  return result.rows[0] ? rowToPost(result.rows[0]) : null;
}

export async function getAllTags(): Promise<string[]> {
  const result = await blogPool.query<{ tag: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(tags) AS tag
     FROM posts
     WHERE publish_date IS NOT NULL
     ORDER BY tag`
  );
  return result.rows.map((r) => r.tag);
}

export async function createBlogPost(post: {
  slug: string;
  title: string;
  excerpt?: string;
  tags?: string[];
  content: Block[];
  publish_date?: string | null;
}): Promise<BlogPost> {
  const result = await blogPool.query<BlogPostRow>(
    `INSERT INTO posts (slug, title, excerpt, tags, content, publish_date)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
     RETURNING id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at`,
    [
      post.slug,
      post.title,
      post.excerpt ?? "",
      JSON.stringify(post.tags ?? []),
      JSON.stringify(post.content),
      post.publish_date ?? null,
    ]
  );
  return rowToPost(result.rows[0]);
}

export async function updateBlogPost(
  id: number,
  post: {
    slug?: string;
    title?: string;
    excerpt?: string;
    tags?: string[];
    content?: Block[];
    publish_date?: string | null;
  }
): Promise<BlogPost | null> {
  const existing = await getPostById(id);
  if (!existing) return null;

  const result = await blogPool.query<BlogPostRow>(
    `UPDATE posts
     SET slug = $1, title = $2, excerpt = $3, tags = $4::jsonb, content = $5::jsonb,
         publish_date = $6, updated_at = now()
     WHERE id = $7
     RETURNING id, slug, title, excerpt, tags::text, content::text, og_image, publish_date, created_at, updated_at`,
    [
      post.slug ?? existing.slug,
      post.title ?? existing.title,
      post.excerpt ?? existing.excerpt,
      JSON.stringify(post.tags ?? existing.tags),
      JSON.stringify(post.content ?? existing.content),
      post.publish_date !== undefined ? post.publish_date : existing.publish_date,
      id,
    ]
  );
  return result.rows[0] ? rowToPost(result.rows[0]) : null;
}

export async function deleteBlogPost(id: number): Promise<boolean> {
  const result = await blogPool.query("DELETE FROM posts WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

// ── Post translations ──

export type PostTranslation = {
  post_id: number;
  lang: string;
  title: string;
  excerpt: string;
  content: Block[];
};

type PostTranslationRow = Omit<PostTranslation, "content"> & { content: string };

function rowToTranslation(row: PostTranslationRow): PostTranslation {
  return { ...row, content: JSON.parse(row.content) };
}

export async function getPostTranslation(
  postId: number,
  lang: string
): Promise<PostTranslation | null> {
  if (lang === "en") return null; // English is the default in `posts`
  const result = await blogPool.query<PostTranslationRow>(
    `SELECT post_id, lang, title, excerpt, content::text
     FROM post_translations WHERE post_id = $1 AND lang = $2`,
    [postId, lang]
  );
  return result.rows[0] ? rowToTranslation(result.rows[0]) : null;
}

export async function upsertPostTranslation(
  postId: number,
  lang: string,
  data: { title: string; excerpt: string; content: Block[] }
): Promise<PostTranslation> {
  const result = await blogPool.query<PostTranslationRow>(
    `INSERT INTO post_translations (post_id, lang, title, excerpt, content)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (post_id, lang) DO UPDATE
       SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
           content = EXCLUDED.content, updated_at = now()
     RETURNING post_id, lang, title, excerpt, content::text`,
    [postId, lang, data.title, data.excerpt, JSON.stringify(data.content)]
  );
  return rowToTranslation(result.rows[0]);
}

export async function listPostTranslations(
  postId: number
): Promise<PostTranslation[]> {
  const result = await blogPool.query<PostTranslationRow>(
    `SELECT post_id, lang, title, excerpt, content::text
     FROM post_translations WHERE post_id = $1 ORDER BY lang`,
    [postId]
  );
  return result.rows.map(rowToTranslation);
}

export async function deletePostTranslation(
  postId: number,
  lang: string
): Promise<boolean> {
  const result = await blogPool.query(
    "DELETE FROM post_translations WHERE post_id = $1 AND lang = $2",
    [postId, lang]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Apply translation overlay to a post (returns new object, doesn't mutate) */
export function applyTranslation(post: BlogPost, translation: PostTranslation): BlogPost {
  return {
    ...post,
    title: translation.title,
    excerpt: translation.excerpt,
    content: translation.content,
  };
}

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

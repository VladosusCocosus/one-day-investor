import { blogPool } from "./pool";

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
  | { type: "image"; src: string; alt?: string; caption?: string };

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
}

export async function setOgImage(id: number, key: string): Promise<void> {
  await blogPool.query(
    "UPDATE posts SET og_image = $1, updated_at = now() WHERE id = $2",
    [key, id]
  );
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

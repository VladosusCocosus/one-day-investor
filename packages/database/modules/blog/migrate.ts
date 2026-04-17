import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { createLogger } from "@logger";
import { blogPool } from "./pool";

const log = createLogger("blog-migrate");

type PostFile = {
  slug: string;
  title: string;
  excerpt?: string;
  tags: string[];
  publish_date: string | null;
  content: unknown[];
};

/**
 * Sync JSON post files into the `posts` table by slug.
 *
 * - Each file is hashed (sha256 of raw bytes); the hash is stored in
 *   `posts.content_hash` and used to detect changes across boots.
 * - On first sight of a slug, the row is inserted. On hash mismatch, all
 *   fields except `slug`, `id`, `og_image`, `created_at` are updated.
 * - Rows whose slug is absent from the JSON set are left untouched.
 * - Slug is the key: renaming a slug in a JSON file creates a new row;
 *   the old row survives with its likes and og_image.
 * - Per-file failures are logged and skipped — one bad file must not
 *   prevent the container from booting.
 */
export async function migrateBlogPostsFromJson(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch (err) {
    log.error({ err, dir }, "Post migrator: content directory missing, skipping");
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const name of entries) {
    const filePath = path.join(dir, name);
    try {
      const bytes = await readFile(filePath);
      const hash = createHash("sha256").update(bytes).digest("hex");
      const parsed = JSON.parse(bytes.toString("utf8")) as PostFile;

      if (
        !parsed.slug ||
        !parsed.title ||
        !Array.isArray(parsed.tags) ||
        !Array.isArray(parsed.content)
      ) {
        throw new Error("Missing required fields (slug/title/tags/content)");
      }

      const existing = await blogPool.query<{
        id: number;
        content_hash: string | null;
      }>("SELECT id, content_hash FROM posts WHERE slug = $1", [parsed.slug]);

      if (existing.rowCount === 0) {
        await blogPool.query(
          `INSERT INTO posts (slug, title, excerpt, tags, content, publish_date, content_hash)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
          [
            parsed.slug,
            parsed.title,
            parsed.excerpt ?? "",
            JSON.stringify(parsed.tags),
            JSON.stringify(parsed.content),
            parsed.publish_date ?? null,
            hash,
          ]
        );
        created++;
        log.info({ slug: parsed.slug, file: name }, "Post created");
        continue;
      }

      const row = existing.rows[0];
      if (row.content_hash === hash) {
        skipped++;
        log.info({ slug: parsed.slug }, "Post unchanged, skipped");
        continue;
      }

      await blogPool.query(
        `UPDATE posts
           SET title = $1, excerpt = $2, tags = $3::jsonb, content = $4::jsonb,
               publish_date = $5, content_hash = $6, updated_at = now()
         WHERE id = $7`,
        [
          parsed.title,
          parsed.excerpt ?? "",
          JSON.stringify(parsed.tags),
          JSON.stringify(parsed.content),
          parsed.publish_date ?? null,
          hash,
          row.id,
        ]
      );
      updated++;
      log.info(
        { slug: parsed.slug, oldHash: row.content_hash, newHash: hash },
        "Post updated"
      );
    } catch (err) {
      failed++;
      log.error({ err, file: name }, "Post migrator failed on file");
    }
  }

  log.info(
    { created, updated, skipped, failed, total: entries.length },
    "Post migration complete"
  );
}

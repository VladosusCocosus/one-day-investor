import { Pool, Client, types } from "pg";
import config from "@config";
import { createLogger } from "@logger";

// Keep DATE as string (same as main pool)
types.setTypeParser(1082, (value: string) => value);

const log = createLogger("blog-db");

const blogDbName = process.env.BLOG_POSTGRES_DB || "blog";

/** Create the blog database if it doesn't exist yet */
async function ensureDatabase(): Promise<void> {
  const client = new Client({
    port: config.get("postgres.port"),
    host: config.get("postgres.host"),
    password: config.get("postgres.password"),
    database: "postgres",
    user: config.get("postgres.user"),
  });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [blogDbName]
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${blogDbName}"`);
      log.info({ database: blogDbName }, "Blog database created");
    }
  } catch (err) {
    log.error({ err }, "Failed to ensure blog database exists");
  } finally {
    await client.end();
  }
}

await ensureDatabase();

export const blogPool = new Pool({
  port: config.get("postgres.port"),
  host: config.get("postgres.host"),
  password: config.get("postgres.password"),
  database: blogDbName,
  user: config.get("postgres.user"),
  max: 20,
});

blogPool.on("error", (err) => {
  log.error({ err }, "Unexpected blog database pool error");
});

blogPool.on("connect", () => {
  log.debug("New blog database connection established");
});

log.info(
  { host: config.get("postgres.host"), database: blogDbName },
  "Blog database pool initialized"
);

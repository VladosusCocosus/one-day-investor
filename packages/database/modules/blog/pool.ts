import { Pool, types } from "pg";
import config from "@config";
import { createLogger } from "@logger";

// Keep DATE as string (same as main pool)
types.setTypeParser(1082, (value: string) => value);

const log = createLogger("blog-db");

export const blogPool = new Pool({
  port: config.get("postgres.port"),
  host: config.get("postgres.host"),
  password: config.get("postgres.password"),
  database: process.env.BLOG_POSTGRES_DB || "blog",
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
  { host: config.get("postgres.host"), database: process.env.BLOG_POSTGRES_DB || "blog" },
  "Blog database pool initialized"
);

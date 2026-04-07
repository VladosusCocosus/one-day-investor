import { Pool } from "pg";
import config from "@config";
import { createLogger } from "@logger";

const log = createLogger("database");

export const pool = new Pool({
  port: config.get("postgres.port"),
  host: config.get("postgres.host"),
  password: config.get("postgres.password"),
  database: config.get("postgres.database"),
  user: config.get("postgres.user"),
  max: 100,
});

pool.on("error", (err) => {
  log.error({ err }, "Unexpected database pool error");
});

pool.on("connect", () => {
  log.debug("New database connection established");
});

log.info(
  { host: config.get("postgres.host"), database: config.get("postgres.database") },
  "Database pool initialized"
);

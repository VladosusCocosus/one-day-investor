import { Pool, types } from "pg";
import config from "@config";
import { createLogger } from "@logger";

const log = createLogger("database");

// Postgres DATE (OID 1082) — return the raw "YYYY-MM-DD" string instead of a
// JS Date. The default parser builds a Date at local midnight, which then
// shifts by the local timezone offset whenever the value is serialized as
// ISO/UTC, turning "2026-04-01" into "2026-03-31" on negative-offset clients.
// Strings round-trip cleanly through JSON and SQL.
types.setTypeParser(1082, (value: string) => value);

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

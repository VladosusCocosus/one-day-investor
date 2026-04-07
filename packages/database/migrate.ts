import { default as migrate } from "node-pg-migrate";
import { pool } from "./pool";

const client = await pool.connect();

try {
  await migrate({
    dbClient: client,
    migrationsTable: "pgmigrations",
    dir: `${import.meta.dirname}/migrations`,
    direction: "up",
    log: console.log,
  });
} finally {
  client.release();
  await pool.end();
}

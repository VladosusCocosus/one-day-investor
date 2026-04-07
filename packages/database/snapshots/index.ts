import { pool } from "../pool";
import type { Snapshot, SnapshotEntry } from "@types";

export type { Snapshot, SnapshotEntry } from "@types";

export interface SnapshotWithTotal {
  id: string;
  month: Date;
  total: string;
  created_at: Date;
}

export interface SnapshotWithEntries {
  id: string;
  month: Date;
  created_at: Date;
  entries: SnapshotEntry[];
}

export async function findSnapshotsByUserId(userId: string): Promise<SnapshotWithTotal[]> {
  const result = await pool.query<SnapshotWithTotal>(
    `SELECT s.id, s.month, s.created_at,
            COALESCE(SUM(e.amount), 0) AS total
     FROM snapshots s
     LEFT JOIN snapshot_entries e ON e.snapshot_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.month DESC`,
    [userId]
  );
  return result.rows;
}

export async function findSnapshotById(
  id: string,
  userId: string
): Promise<SnapshotWithEntries | null> {
  const snapshotResult = await pool.query<Snapshot>(
    "SELECT * FROM snapshots WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) return null;

  const entriesResult = await pool.query<SnapshotEntry>(
    "SELECT * FROM snapshot_entries WHERE snapshot_id = $1",
    [id]
  );

  return {
    id: snapshot.id,
    month: snapshot.month,
    created_at: snapshot.created_at,
    entries: entriesResult.rows,
  };
}

export async function findLatestSnapshot(userId: string): Promise<SnapshotWithEntries | null> {
  const snapshotResult = await pool.query<Snapshot>(
    "SELECT * FROM snapshots WHERE user_id = $1 ORDER BY month DESC LIMIT 1",
    [userId]
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) return null;

  const entriesResult = await pool.query<SnapshotEntry>(
    "SELECT * FROM snapshot_entries WHERE snapshot_id = $1",
    [snapshot.id]
  );

  return {
    id: snapshot.id,
    month: snapshot.month,
    created_at: snapshot.created_at,
    entries: entriesResult.rows,
  };
}

export async function createSnapshot(params: {
  user_id: string;
  month: Date;
  entries: { service_id: string; amount: number }[];
}): Promise<SnapshotWithEntries> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const snapshotResult = await client.query<Snapshot>(
      "INSERT INTO snapshots (user_id, month) VALUES ($1, $2) RETURNING *",
      [params.user_id, params.month]
    );
    const snapshot = snapshotResult.rows[0];

    const entries: SnapshotEntry[] = [];
    for (const entry of params.entries) {
      const entryResult = await client.query<SnapshotEntry>(
        "INSERT INTO snapshot_entries (snapshot_id, service_id, amount) VALUES ($1, $2, $3) RETURNING *",
        [snapshot.id, entry.service_id, entry.amount]
      );
      entries.push(entryResult.rows[0]);
    }

    await client.query("COMMIT");
    return {
      id: snapshot.id,
      month: snapshot.month,
      created_at: snapshot.created_at,
      entries,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateSnapshot(
  id: string,
  userId: string,
  entries: { service_id: string; amount: number }[]
): Promise<SnapshotWithEntries | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const snapshotResult = await client.query<Snapshot>(
      "SELECT * FROM snapshots WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    const snapshot = snapshotResult.rows[0];
    if (!snapshot) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("DELETE FROM snapshot_entries WHERE snapshot_id = $1", [id]);

    const newEntries: SnapshotEntry[] = [];
    for (const entry of entries) {
      const entryResult = await client.query<SnapshotEntry>(
        "INSERT INTO snapshot_entries (snapshot_id, service_id, amount) VALUES ($1, $2, $3) RETURNING *",
        [id, entry.service_id, entry.amount]
      );
      newEntries.push(entryResult.rows[0]);
    }

    await client.query("COMMIT");
    return {
      id: snapshot.id,
      month: snapshot.month,
      created_at: snapshot.created_at,
      entries: newEntries,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSnapshot(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM snapshots WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

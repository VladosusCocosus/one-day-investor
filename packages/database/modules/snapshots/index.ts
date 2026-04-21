import { pool } from "../../pool";
import type { Snapshot, SnapshotEntry } from "@types";

export type { Snapshot, SnapshotEntry } from "@types";

export interface SnapshotWithTotal {
  id: string;
  month: string;
  total: string;
  created_at: Date;
}

export interface SnapshotWithEntries {
  id: string;
  month: string;
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
    "SELECT id, month, created_at FROM snapshots WHERE id = $1 AND user_id = $2",
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
  month: string;
  entries: {
    service_id: string;
    amount: number;
    pocket_asset_id?: string | null;
    quantity?: number | null;
    price?: number | null;
  }[];
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
      const amount = entry.pocket_asset_id && entry.quantity != null && entry.price != null
        ? entry.quantity * entry.price
        : entry.amount;
      // ON CONFLICT matches the UNIQUE NULLS NOT DISTINCT constraint on
      // (snapshot_id, service_id, pocket_asset_id). If the caller accidentally
      // sends two rows with the same triple (e.g. duplicate common entries),
      // the second upserts over the first instead of crashing the whole
      // transaction — the user's last-written value wins.
      const entryResult = await client.query<SnapshotEntry>(
        `INSERT INTO snapshot_entries (snapshot_id, service_id, amount, pocket_asset_id, quantity, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (snapshot_id, service_id, pocket_asset_id)
           DO UPDATE SET amount = EXCLUDED.amount,
                         quantity = EXCLUDED.quantity,
                         price = EXCLUDED.price
         RETURNING *`,
        [
          snapshot.id,
          entry.service_id,
          amount,
          entry.pocket_asset_id ?? null,
          entry.quantity ?? null,
          entry.price ?? null,
        ]
      );
      entries.push(entryResult.rows[0]);
    }

    await client.query(
      `INSERT INTO reminder_state (user_id, last_snapshot_at, last_reminder_sent_at)
       VALUES ($1, now(), NULL)
       ON CONFLICT (user_id) DO UPDATE
         SET last_snapshot_at = EXCLUDED.last_snapshot_at,
             last_reminder_sent_at = NULL`,
      [params.user_id]
    );

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
  entries: {
    service_id: string;
    amount: number;
    pocket_asset_id?: string | null;
    quantity?: number | null;
    price?: number | null;
  }[]
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
      const amount = entry.pocket_asset_id && entry.quantity != null && entry.price != null
        ? entry.quantity * entry.price
        : entry.amount;
      // ON CONFLICT matches the UNIQUE NULLS NOT DISTINCT constraint on
      // (snapshot_id, service_id, pocket_asset_id). If the caller accidentally
      // sends two rows with the same triple (e.g. duplicate common entries),
      // the second upserts over the first instead of crashing the whole
      // transaction — the user's last-written value wins.
      const entryResult = await client.query<SnapshotEntry>(
        `INSERT INTO snapshot_entries (snapshot_id, service_id, amount, pocket_asset_id, quantity, price)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (snapshot_id, service_id, pocket_asset_id)
           DO UPDATE SET amount = EXCLUDED.amount,
                         quantity = EXCLUDED.quantity,
                         price = EXCLUDED.price
         RETURNING *`,
        [
          id,
          entry.service_id,
          amount,
          entry.pocket_asset_id ?? null,
          entry.quantity ?? null,
          entry.price ?? null,
        ]
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

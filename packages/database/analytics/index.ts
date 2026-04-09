import { pool } from "../pool";

export async function findDistribution(userId: string, month: string) {
  // Accept both "YYYY-MM" and "YYYY-MM-DD"; snapshots.month is a DATE column,
  // so a bare YYYY-MM must be normalized to the first of the month.
  const normalized = /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month;
  const { rows } = await pool.query(
    `SELECT s2.name, e.amount
     FROM snapshot_entries e
     JOIN snapshots sn ON sn.id = e.snapshot_id
     JOIN services s2 ON s2.id = e.service_id
     WHERE sn.user_id = $1 AND sn.month = $2
     ORDER BY e.amount DESC`,
    [userId, normalized]
  );
  return rows;
}

export async function findTimeline(userId: string) {
  const { rows } = await pool.query(
    `SELECT s.month, COALESCE(SUM(e.amount), 0) as total
     FROM snapshots s
     LEFT JOIN snapshot_entries e ON e.snapshot_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id, s.month
     ORDER BY s.month ASC`,
    [userId]
  );
  return rows;
}

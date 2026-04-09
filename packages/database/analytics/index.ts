import { pool } from "../pool";

export async function findDistribution(userId: string, month: string) {
  // Accept both "YYYY-MM" and "YYYY-MM-DD"; snapshots.month is a DATE column,
  // so a bare YYYY-MM must be normalized to the first of the month.
  const normalized = /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : month;
  const { rows } = await pool.query(
    `WITH services as (
        SELECT trim(concat(s3.name, ' ', s2.name)) as name, e.amount
        FROM snapshot_entries e
                 JOIN snapshots sn ON sn.id = e.snapshot_id
                 JOIN services s2 ON s2.id = e.service_id
                 LEFT JOIN services s3 on s2.parent_id = s3.id
        WHERE sn.user_id = $1 AND sn.month = $2
        ORDER BY e.amount DESC
    ) select name, sum(amount) from services group by name`,
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

// Returns the most recently created snapshot's month and total, or null if
// the user has no snapshots. "Most recent" is determined by created_at, so
// back-filling an older month after a newer one still gives the back-fill.
export async function findCurrentTotal(
  userId: string
): Promise<{ month: string; total: number } | null> {
  const { rows } = await pool.query(
    `SELECT s.month, COALESCE(SUM(e.amount), 0) as total
     FROM snapshots s
     LEFT JOIN snapshot_entries e ON e.snapshot_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id, s.month, s.created_at
     ORDER BY s.month DESC
     LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) return null;
  return { month: rows[0].month, total: Number(rows[0].total) };
}

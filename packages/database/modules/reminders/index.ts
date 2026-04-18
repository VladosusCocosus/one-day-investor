import { pool } from "../../pool";
import config from "@config";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20ac",
  USD: "$",
  GBP: "\u00a3",
};

interface DueRow {
  user_id: string;
  email: string;
  name: string | null;
  snapshot_day: number;
  goal: string;                // numeric comes back as string from pg
  currency: string;
  last_snapshot_month: Date;
  last_snapshot_created_at: Date;
  last_snapshot_total: string; // numeric → string
}

export interface ReminderData {
  user_id: string;
  email: string;
  name: string;               // full name, used for the "To:" header
  firstName: string;          // "Pavel" — derived below
  currentMonthLabel: string;  // "April" — the month we're nagging them about
  lastMonthLabel: string;     // "March 2026"
  lastCreatedAtLabel: string; // "Mar 1"
  lastTotal: number;          // 21240
  goal: number;               // 50000
  symbol: string;             // "€"
  ctaHref: string;            // "https://odinvestor.net/snapshots"
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCurrentMonthLabel(now: Date): string {
  return now.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function firstNameOf(name: string | null): string {
  if (!name) return "there";
  const trimmed = name.trim().split(/\s+/)[0];
  return trimmed.length > 0 ? trimmed : "there";
}

export async function findDueUsers(): Promise<ReminderData[]> {
  const { rows } = await pool.query<DueRow>(
    `SELECT
         rs.user_id,
         u.email,
         u.name,
         us.snapshot_day,
         us.goal,
         us.currency,
         ls.month AS last_snapshot_month,
         ls.created_at AS last_snapshot_created_at,
         ls.total AS last_snapshot_total
     FROM reminder_state rs
     JOIN users u           ON u.id = rs.user_id
     JOIN user_settings us  ON us.user_id = rs.user_id
     JOIN LATERAL (
         SELECT s.month, s.created_at, COALESCE(SUM(e.amount), 0) AS total
         FROM snapshots s
         LEFT JOIN snapshot_entries e ON e.snapshot_id = s.id
         WHERE s.user_id = rs.user_id
         GROUP BY s.id, s.month, s.created_at
         ORDER BY s.created_at DESC
         LIMIT 1
     ) ls ON TRUE
     WHERE
         us.notify_snapshot_reminders = TRUE
         AND date_trunc('month', now())
           > date_trunc('month', rs.last_snapshot_at)
         AND EXTRACT(DAY FROM now())::int >= us.snapshot_day
         AND (rs.last_reminder_sent_at IS NULL
              OR rs.last_reminder_sent_at < rs.last_snapshot_at)`,
  );

  const now = new Date();
  const ctaHref = `${config.get("frontendUrl")}/snapshots`;

  return rows.map((row) => {
    const symbol = CURRENCY_SYMBOLS[row.currency] ?? "\u20ac";
    return {
      user_id: row.user_id,
      email: row.email,
      name: row.name ?? row.email,
      firstName: firstNameOf(row.name),
      currentMonthLabel: formatCurrentMonthLabel(now),
      lastMonthLabel: formatMonthYear(row.last_snapshot_month),
      lastCreatedAtLabel: formatShortDate(row.last_snapshot_created_at),
      lastTotal: Number(row.last_snapshot_total),
      goal: Number(row.goal),
      symbol,
      ctaHref,
    };
  });
}

export async function markReminderSent(userId: string): Promise<void> {
  await pool.query(
    "UPDATE reminder_state SET last_reminder_sent_at = now() WHERE user_id = $1",
    [userId]
  );
}

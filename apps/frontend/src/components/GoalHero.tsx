import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

interface GoalHeroProps {
  goal: number;
  currentTotal: number | null;
  symbol: string;
  onSave: (goal: number) => void;
}

function formatAmount(n: number, symbol: string): string {
  return `${symbol}${Number(n).toLocaleString()}`;
}

function formatCompact(n: number, symbol: string): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${symbol}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${symbol}${Math.round(n)}`;
}

export function GoalHero({
  goal,
  currentTotal,
  symbol,
  onSave,
}: GoalHeroProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));

  const startEdit = () => {
    setDraft(String(goal));
    setEditing(true);
  };

  const commit = () => {
    if (!editing) return;
    const n = Number(draft);
    if (!Number.isNaN(n) && n > 0 && n !== goal) {
      onSave(n);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(String(goal));
    setEditing(false);
  };

  const reached = currentTotal !== null && currentTotal >= goal;
  const percent =
    currentTotal !== null && goal > 0
      ? Math.round((currentTotal / goal) * 100)
      : 0;
  const progressWidth = Math.min(100, percent);

  const wrapperClass = reached
    ? "rounded-xl p-5 text-primary-foreground relative overflow-hidden bg-gradient-to-br from-primary/85 via-primary/65 to-amber-300/45"
    : "rounded-xl p-5 text-primary-foreground relative overflow-hidden bg-gradient-to-br from-primary/85 to-primary/55";

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/75">
          {t("goal.label")}
        </span>
        {reached && (
          <span className="rounded-full border border-primary-foreground/35 bg-primary-foreground/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
            ✓ {t("goal.reached")}
          </span>
        )}
      </div>

      {editing ? (
        <input
          type="number"
          min={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="mt-1 w-full bg-primary-foreground/15 border border-primary-foreground/30 rounded-md px-2 py-1 text-3xl font-extrabold tracking-tight tabular-nums text-primary-foreground outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="mt-1 block w-full text-left text-3xl font-extrabold tracking-tight tabular-nums cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50"
        >
          {reached && currentTotal !== null ? (
            <>
              {formatAmount(currentTotal, symbol)}
              <span className="ml-1 text-lg font-semibold text-primary-foreground/55">
                {" / "}
                {formatCompact(goal, symbol)}
              </span>
            </>
          ) : (
            formatAmount(goal, symbol)
          )}
        </button>
      )}

      {currentTotal === null && !editing && (
        <Link
          to="/snapshots"
          className="mt-3 inline-block text-xs text-primary-foreground/90 underline underline-offset-2"
        >
          {t("goal.takeFirstSnapshot")}
        </Link>
      )}

      {currentTotal !== null && (
        <>
          <div className="mt-4 h-1.5 rounded-full bg-primary-foreground/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-foreground shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-medium tabular-nums text-primary-foreground/90">
            {reached
              ? `${percent}% · +${formatAmount(currentTotal - goal, symbol)} ${t("goal.overGoal")}`
              : `${formatAmount(currentTotal, symbol)} · ${percent}% ${t("goal.reached")}`}
          </div>
        </>
      )}
    </div>
  );
}

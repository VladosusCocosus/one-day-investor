// Emerald Fintech chart palette — mirrors --chart-1..6 in index.css
export const CHART_COLORS = [
  "hsl(160, 84%, 25%)", // --chart-1 emerald deep
  "hsl(160, 70%, 40%)", // --chart-2 emerald mid
  "hsl(150, 60%, 55%)", // --chart-3 green
  "hsl(170, 55%, 55%)", // --chart-4 teal
  "hsl(145, 45%, 65%)", // --chart-5 sage
  "hsl(175, 40%, 45%)", // --chart-6 deep teal
];

export function formatMonthLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatAmount(value: number): string {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(1)}K`;
  }
  return `€${Math.round(value)}`;
}

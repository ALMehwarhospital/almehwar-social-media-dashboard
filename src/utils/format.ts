export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  if (Math.abs(n) >= 1_000_000) return `${round(n / 1_000_000, 2)}M`;
  if (Math.abs(n) >= 1_000) return `${round(n / 1_000, 1)}K`;
  return `${Math.round(n)}`;
}

export function formatFull(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

// Canonical rate unit across the dashboard is a ratio from 0–1.
// The UI owns conversion to percentage points.
export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "N/A";
  return `${(n * 100).toFixed(digits)}%`;
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function pctChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous === 0
  ) return 0;
  return round(((current - previous) / previous) * 100, 1);
}

export function trendOf(
  current: number | null | undefined,
  previous: number | null | undefined,
  flatBand = 2
): "up" | "down" | "flat" {
  const change = pctChange(current, previous);
  if (Math.abs(change) < flatBand) return "flat";
  return change > 0 ? "up" : "down";
}

export function monthLabel(monthKey: string): string {
  const [, m] = monthKey.split("-");
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[parseInt(m, 10)] ?? monthKey;
}

export function formatSeconds(s: number | null | undefined): string {
  if (s === null || s === undefined || !Number.isFinite(s)) return "N/A";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

import { incompleteMetric } from "./socialDataQuality";
export const PERFORMANCE_PLATFORMS = ["Facebook", "Instagram", "YouTube", "TikTok"] as const;

export type OverviewPerformanceRow = { month: string; platform: string; [key: string]: unknown };
export type PerformanceMetric = "views" | "interactions" | "shares" | "newFollowers" | "contentPublished" | "reach" | "profileVisits" | "linkClicks" | "profileLinkTaps" | "leads";
export type PerformanceMonth = {
  month: string;
  current: boolean;
  partial: boolean;
  values: Record<PerformanceMetric, number | null>;
  coverage: Record<PerformanceMetric, string[]>;
};

const COMPLETE_METRICS: PerformanceMetric[] = ["views", "interactions", "shares", "newFollowers", "contentPublished"];
const AVAILABLE_METRICS: PerformanceMetric[] = ["reach", "profileVisits", "linkClicks", "profileLinkTaps", "leads"];
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function published(row: OverviewPerformanceRow): number | null {
  if (!finite(row.posts) && !finite(row.videos)) return null;
  return (finite(row.posts) ? row.posts : 0) + (finite(row.videos) ? row.videos : 0);
}

/** Canonical Monthly Overview replaces historical fallback for each entire month. */
export function buildPerformanceSeries(
  canonical: OverviewPerformanceRow[],
  historical: OverviewPerformanceRow[],
  currentMonth: string,
): PerformanceMonth[] {
  const months = [...new Set([...canonical, ...historical].map(row => row.month))]
    .filter(month => /^\d{4}-\d{2}$/.test(month) && month <= currentMonth).sort();
  return months.map(month => {
    const source = canonical.some(row => row.month === month) ? canonical : historical;
    // One row per connected platform; LinkedIn is outside the four-platform totals.
    const rows = PERFORMANCE_PLATFORMS.flatMap(platform => {
      const row = source.find(item => item.month === month && item.platform === platform);
      return row ? [row] : [];
    });
    const values = {} as PerformanceMonth["values"];
    const coverage = {} as PerformanceMonth["coverage"];
    for (const metric of [...COMPLETE_METRICS, ...AVAILABLE_METRICS]) {
      const available = rows.map(row => ({ platform: row.platform, value: metric === "contentPublished" ? published(row) : row[metric] }))
        .filter((item): item is { platform: string; value: number } => finite(item.value) && !incompleteMetric(rows.find(row => row.platform === item.platform), metric));
      coverage[metric] = available.map(item => item.platform);
      values[metric] = available.length && (!COMPLETE_METRICS.includes(metric) || available.length === PERFORMANCE_PLATFORMS.length)
        ? available.reduce((sum, item) => sum + item.value, 0) : null;
    }
    return { month, current: month === currentMonth, partial: rows.some(row => /partial/i.test(String(row.note ?? "") + String(row.status ?? ""))), values, coverage };
  });
}

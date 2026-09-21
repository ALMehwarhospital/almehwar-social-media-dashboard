import { socialDashboard } from "../data/socialDashboard";
import type {
  ContentFormat,
  ContentItem,
  ContentPillar,
  Platform,
  SpendType,
} from "../types/dashboard";

const data = socialDashboard;

export interface ContentFilters {
  platform?: Platform;
  pillar?: ContentPillar | string;
  format?: ContentFormat | string;
  spendType?: SpendType | string;
}

function available(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sumAvailable(values: Array<number | null | undefined>): number | null {
  const reported = values.filter(available);
  return reported.length ? reported.reduce((sum, value) => sum + value, 0) : null;
}

function averageAvailable(values: Array<number | null | undefined>): number | null {
  const reported = values.filter(available);
  return reported.length
    ? reported.reduce((sum, value) => sum + value, 0) / reported.length
    : null;
}

export function getPreviousMonth(month: string): string | undefined {
  const idx = data.meta.months.indexOf(month);
  return idx > 0 ? data.meta.months[idx - 1] : undefined;
}

export function getMonthlyPerformance(month: string) {
  return data.monthlyPerformance.find((m) => m.month === month);
}

export function getPlatformPerformance(month: string, platform?: Platform) {
  return data.platformPerformance.filter(
    (p) => p.month === month && (platform ? p.platform === platform : true)
  );
}

export function getPlatformSeries(platform: Platform) {
  return data.meta.months.map((month) =>
    data.platformPerformance.find((p) => p.month === month && p.platform === platform)
  );
}

function matchesContentFilters(item: ContentItem | undefined, filters?: ContentFilters) {
  if (!item) return false;
  if (filters?.platform && item.platform !== filters.platform) return false;
  if (filters?.pillar && item.pillar !== filters.pillar) return false;
  if (filters?.format && item.format !== filters.format) return false;
  if (filters?.spendType && item.spendType !== filters.spendType) return false;
  return true;
}

export function getContent(month?: string, filters?: ContentFilters) {
  return data.contentPerformance.filter((c) => {
    if (month && c.month !== month) return false;
    return matchesContentFilters(c, filters);
  });
}

export function getContentById(contentId: string) {
  return data.contentPerformance.find((c) => c.id === contentId);
}

export function getVideos(month?: string, filters?: ContentFilters) {
  return data.videoAnalysis.filter((v) => {
    if (month && v.month !== month) return false;
    const content = getContentById(v.contentId);
    return matchesContentFilters(content, filters);
  });
}

function percentile(
  value: number | null | undefined,
  values: Array<number | null | undefined>
): number | null {
  if (!available(value)) return null;
  const reported = values.filter(available);
  if (!reported.length) return null;
  if (reported.length === 1) return 50;
  const below = reported.filter((v) => v < value).length;
  const equal = reported.filter((v) => v === value).length;
  return Math.round(((below + equal * 0.5) / reported.length) * 100);
}

// Legacy diagnostic helper. Missing metrics are excluded from both the
// percentile population and the weighted score rather than being treated as 0.
export function getContentPerformanceScoreBreakdown(contentId: string) {
  const content = getContentById(contentId);
  if (!content) return undefined;

  const peers = data.contentPerformance.filter(
    (c) =>
      c.month === content.month &&
      c.platform === content.platform &&
      c.spendType === content.spendType &&
      c.format === content.format
  );

  const components = {
    engagement: percentile(content.engagementRate, peers.map((p) => p.engagementRate)),
    value: percentile(content.valueRate, peers.map((p) => p.valueRate)),
    followers: percentile(content.followersGained, peers.map((p) => p.followersGained)),
    clicks: percentile(content.linkClicks, peers.map((p) => p.linkClicks)),
    leads: percentile(content.leads, peers.map((p) => p.leads)),
  };

  const weighted = [
    [components.engagement, 0.3],
    [components.value, 0.25],
    [components.followers, 0.2],
    [components.clicks, 0.15],
    [components.leads, 0.1],
  ] as const;
  const usable = weighted.filter(([value]) => available(value));
  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  const score = totalWeight
    ? Math.round(usable.reduce((sum, [value, weight]) => sum + (value as number) * weight, 0) / totalWeight)
    : null;

  return {
    score,
    components,
    peerCount: peers.length,
    peerLabel: `${content.platform} · ${content.spendType} · ${content.format}`,
  };
}

export function getCreative(month?: string, filters?: ContentFilters) {
  return data.creativeAnalysis.filter((c) => {
    if (month && c.month !== month) return false;
    if (filters?.platform && c.platform !== filters.platform) return false;
    if (filters?.pillar && c.pillar !== filters.pillar) return false;
    if (filters?.format && c.format !== filters.format) return false;
    if (filters?.spendType && c.spendType !== filters.spendType) return false;
    return true;
  });
}

export function getHealthScore(month: string) {
  return data.healthScores.find((h) => h.month === month);
}

export function getInsights(month?: string) {
  return month ? data.insights.filter((i) => i.month === month) : data.insights;
}

export function getProblems(month?: string) {
  return month ? data.problems.filter((p) => p.month === month) : data.problems;
}

export function getActionPlan(month?: string) {
  return month ? data.actionPlan.filter((a) => a.month === month) : data.actionPlan;
}

export function getNotes(month?: string) {
  return month ? data.notes.filter((n) => n.month === month) : data.notes;
}

export function getDataQuality(month?: string) {
  return month ? data.dataQuality.filter((d) => d.month === month) : data.dataQuality;
}

export function pillarSummary(month: string, filters?: ContentFilters) {
  const items = getContent(month, filters);
  const byPillar = new Map<string, typeof items>();
  for (const item of items) {
    const arr = byPillar.get(item.pillar) ?? [];
    arr.push(item);
    byPillar.set(item.pillar, arr);
  }

  return Array.from(byPillar.entries()).map(([pillar, arr]) => {
    const totalReach = sumAvailable(arr.map((i) => i.reach));
    const totalInteractions = sumAvailable(arr.map((i) => i.interactions));
    const avgReach = averageAvailable(arr.map((i) => i.reach));
    const avgEngagement = averageAvailable(arr.map((i) => i.engagementRate));
    const followersGained = sumAvailable(arr.map((i) => i.followersGained));
    const clicks = sumAvailable(arr.map((i) => i.linkClicks));

    return {
      pillar,
      posts: arr.length,
      totalReach,
      avgReach: avgReach === null ? null : Math.round(avgReach),
      totalInteractions,
      avgEngagement,
      followersGained,
      clicks,
    };
  });
}

export function formatSummary(month: string, filters?: ContentFilters) {
  const items = getContent(month, filters);
  const byFormat = new Map<string, typeof items>();
  for (const item of items) {
    const arr = byFormat.get(item.format) ?? [];
    arr.push(item);
    byFormat.set(item.format, arr);
  }

  return Array.from(byFormat.entries()).map(([format, arr]) => {
    const avgReach = averageAvailable(arr.map((i) => i.reach));
    const avgEngagement = averageAvailable(arr.map((i) => i.engagementRate));
    const avgViews = averageAvailable(arr.map((i) => i.views));
    const avgFollowers = averageAvailable(arr.map((i) => i.followersGained));

    return {
      format,
      posts: arr.length,
      avgReach: avgReach === null ? null : Math.round(avgReach),
      avgEngagement,
      avgViews: avgViews === null ? null : Math.round(avgViews),
      avgFollowersGained: avgFollowers === null ? null : Math.round(avgFollowers * 10) / 10,
    };
  });
}

export const dashboard = data;

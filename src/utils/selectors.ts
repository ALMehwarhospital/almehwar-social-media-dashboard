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

function availableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function percentile(value: number | null, values: Array<number | null>) {
  if (!availableNumber(value)) return null;
  const available = values.filter(availableNumber);
  if (available.length <= 1) return available.length ? 50 : null;
  const below = available.filter((v) => v < value).length;
  const equal = available.filter((v) => v === value).length;
  return Math.round(((below + equal * 0.5) / available.length) * 100);
}

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
  const usable = weighted.filter(([value]) => value !== null);
  const weightTotal = usable.reduce((sum, [, weight]) => sum + weight, 0);
  const score = weightTotal
    ? Math.round(usable.reduce((sum, [value, weight]) => sum + (value as number) * weight, 0) / weightTotal)
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

function sumMetric(items: ContentItem[], key: keyof ContentItem): number | null {
  const values = items.map((item) => item[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function avgMetric(items: ContentItem[], key: keyof ContentItem): number | null {
  const values = items.map((item) => item[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
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
    const totalReach = sumMetric(arr, "reach");
    const totalInteractions = sumMetric(arr, "interactions");
    const avgEngagement = avgMetric(arr, "engagementRate");
    const followersGained = sumMetric(arr, "followersGained");
    const clicks = sumMetric(arr, "linkClicks");
    return {
      pillar,
      posts: arr.length,
      totalReach,
      avgReach: totalReach === null ? null : Math.round(totalReach / arr.filter(i=>availableNumber(i.reach)).length),
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
  return Array.from(byFormat.entries()).map(([format, arr]) => ({
    format,
    posts: arr.length,
    avgReach: avgMetric(arr, "reach"),
    avgEngagement: avgMetric(arr, "engagementRate"),
    avgViews: avgMetric(arr, "views"),
    avgFollowersGained: avgMetric(arr, "followersGained"),
  }));
}

export const dashboard = data;

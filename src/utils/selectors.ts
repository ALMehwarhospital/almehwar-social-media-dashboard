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


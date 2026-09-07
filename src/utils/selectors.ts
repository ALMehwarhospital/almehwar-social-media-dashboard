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

function percentile(value: number, values: number[]) {
  if (values.length <= 1) return 50;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return Math.round(((below + equal * 0.5) / values.length) * 100);
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

  const score = Math.round(
    components.engagement * 0.3 +
      components.value * 0.25 +
      components.followers * 0.2 +
      components.clicks * 0.15 +
      components.leads * 0.1
  );

  return {
    score,
    components,
    peerCount: peers.length,
    peerLabel: `${content.platform} · ${content.spendType} · ${content.format}`,
  };
}

export function getCreative(month?: string, filters?: ContentFilters) {
  return data.creativeAnalysis
    .filter((c) => {
      if (month && c.month !== month) return false;
      const content = getContentById(c.contentId);
      return matchesContentFilters(content, filters);
    })
    .map((c) => {
      const performance = getContentPerformanceScoreBreakdown(c.contentId);
      return performance ? { ...c, performanceScore: performance.score } : c;
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
    const totalReach = arr.reduce((s, i) => s + i.reach, 0);
    const totalInteractions = arr.reduce((s, i) => s + i.interactions, 0);
    const avgEngagement = arr.reduce((s, i) => s + i.engagementRate, 0) / arr.length;
    const followersGained = arr.reduce((s, i) => s + i.followersGained, 0);
    const clicks = arr.reduce((s, i) => s + i.linkClicks, 0);
    return {
      pillar,
      posts: arr.length,
      totalReach,
      avgReach: Math.round(totalReach / arr.length),
      totalInteractions,
      avgEngagement: Math.round(avgEngagement * 100) / 100,
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
    avgReach: Math.round(arr.reduce((s, i) => s + i.reach, 0) / arr.length),
    avgEngagement:
      Math.round((arr.reduce((s, i) => s + i.engagementRate, 0) / arr.length) * 100) / 100,
    avgViews: Math.round(arr.reduce((s, i) => s + i.views, 0) / arr.length),
    avgFollowersGained:
      Math.round((arr.reduce((s, i) => s + i.followersGained, 0) / arr.length) * 10) / 10,
  }));
}

export const dashboard = data;

import { useMemo } from "react";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { getMonthlyPerformance, getPreviousMonth, getHealthScore, getPlatformPerformance, getDataQuality } from "../utils/selectors";
import { socialDashboard } from "../data/socialDashboard";
import { KpiCard } from "../components/dashboard/KpiCard";
import { HealthScore } from "../components/dashboard/HealthScore";
import { WhatChanged } from "../components/dashboard/WhatChanged";
import { PlatformCard } from "../components/dashboard/PlatformCard";
import { SectionHeader, EmptyState } from "../components/dashboard/Primitives";
import { AlertCircle } from "lucide-react";
import { monthLabel, pctChange } from "../utils/format";
import type { MonthlyKpiSet } from "../types/dashboard";

function buildHeadline(current: MonthlyKpiSet, previous?: MonthlyKpiSet) {
  if (!previous) return "A clean baseline month — ready for sharper comparisons as more data comes in.";
  const reach = pctChange(current.reach, previous.reach);
  const interactions = pctChange(current.interactions, previous.interactions);
  const leads = pctChange(current.leads, previous.leads);
  const followers = pctChange(current.newFollowers, previous.newFollowers);

  if (reach !== null && interactions !== null && reach > 5 && interactions < -5) return "Attention expanded, but audience participation weakened — reach is not yet translating into engagement.";
  if (leads !== null && reach !== null && leads > 10 && reach >= 0) return "Business outcomes strengthened this month, with lead growth outpacing top-of-funnel movement.";
  if (reach !== null && interactions !== null && reach < -5 && interactions < -5) return "Visibility and interaction both softened — distribution and content resonance need attention together.";
  if (followers !== null && reach !== null && followers < -5 && reach > 0) return "More people are seeing the brand, but fewer are choosing to stay connected.";
  if (interactions !== null && followers !== null && interactions > 5 && followers > 0) return "Content resonance improved, with stronger interaction and healthier audience growth.";
  return "Performance is mixed this month — unavailable metrics are excluded from comparisons rather than treated as zero.";
}

const CONNECTED_PLATFORMS = ["Facebook", "Instagram", "YouTube", "TikTok"] as const;

function connectedRows(rows:any[]) {
  return rows.filter(r => CONNECTED_PLATFORMS.includes(r.platform));
}

function sumComplete(rows:any[], key:string): number | null {
  const active = connectedRows(rows);
  if (active.length !== CONNECTED_PLATFORMS.length) return null;
  const values = active.map(r => r[key]);
  if (values.some(v => typeof v !== "number" || !Number.isFinite(v))) return null;
  return values.reduce((sum:number,value:number)=>sum+value,0);
}

function completePublished(rows:any[]): number | null {
  const active = connectedRows(rows);
  if (active.length !== CONNECTED_PLATFORMS.length) return null;
  const values = active.map(publishedCount);
  if (values.some(v => v === null)) return null;
  return (values as number[]).reduce((sum,value)=>sum+value,0);
}

function aggregateOverview(rows:any[]) {
  const views = sumComplete(rows,"views");
  const interactions = sumComplete(rows,"interactions");
  const shares = sumComplete(rows,"shares");
  const newFollowers = sumComplete(rows,"newFollowers");
  const followersStart = sumComplete(rows,"followersStart");
  const contentPublished = completePublished(rows);
  return {
    views,
    interactions,
    shares,
    newFollowers,
    audienceGrowthRate: newFollowers !== null && followersStart !== null && followersStart > 0
      ? newFollowers/followersStart
      : null,
    contentPublished,
    viewsPerContent: views !== null && contentPublished !== null && contentPublished > 0
      ? views/contentPublished
      : null,
    interactionsPerContent: interactions !== null && contentPublished !== null && contentPublished > 0
      ? interactions/contentPublished
      : null,
  };
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function publishedCount(row:any): number | null {
  const posts = typeof row.posts === "number" ? row.posts : null;
  const videos = typeof row.videos === "number" ? row.videos : null;
  if (posts === null && videos === null) return null;
  return (posts ?? 0) + (videos ?? 0);
}

function platformBasis(platform:string) {
  if (platform === "Facebook" || platform === "Instagram") return "Reach";
  if (platform === "TikTok") return "Views";
  return "Impressions";
}

export default function Overview() {
  const { month } = useFilters();
  const live = useDecisionLive();

  const liveRows = useMemo(
    () => live.data?.data.overview.filter((r:any) => r.month === month) ?? [],
    [live.data, month]
  );
  const isSourceMonth = Boolean(live.data && liveRows.length);
  const isCurrentMonth = Boolean(live.data && month === live.data.currentMonth);

  if (month === currentMonthKey() && live.loading && !live.data) {
    return <EmptyState message="Loading live overview data…" />;
  }
  if (month === currentMonthKey() && !live.data && live.error) {
    return <EmptyState message="Live overview is temporarily unavailable. No demo data is shown." />;
  }
  if (live.data && month === live.data.currentMonth && liveRows.length === 0) {
    return <EmptyState message="The live source loaded, but no Monthly Overview rows were returned for the current month." />;
  }

  if (isSourceMonth) {
    const monthKeys = Array.from(new Set((live.data?.data.overview ?? []).map((r:any)=>r.month)))
      .filter((key):key is string=>typeof key === "string" && key <= month)
      .sort();
    const aggregateSeries = monthKeys.map(key => ({
      month:key,
      ...aggregateOverview((live.data?.data.overview ?? []).filter((r:any)=>r.month===key)),
    }));
    const total = aggregateSeries.find(item=>item.month===month) ?? aggregateOverview(liveRows);
    const currentIndex = aggregateSeries.findIndex(item=>item.month===month);
    const previousTotal = currentIndex > 0 ? aggregateSeries[currentIndex-1] : undefined;
    const sparklineFor = (key:keyof ReturnType<typeof aggregateOverview>) => aggregateSeries
      .map(item=>item[key])
      .filter((value):value is number=>typeof value === "number" && Number.isFinite(value));

    const platforms = liveRows.map((r:any) => ({
      month: r.month,
      platform: r.platform,
      reach: r.reach,
      impressions: r.impressions,
      views: r.views,
      interactions: r.interactions,
      shares: r.shares,
      engagementRate: r.engagementRate,
      engagementDenominator: platformBasis(r.platform),
      followersGrowth: r.newFollowers,
      clicks: r.linkClicks,
      profileVisits: r.profileVisits,
      profileLinkTaps: r.profileLinkTaps,
      messages: r.messages,
      contentPublished: publishedCount(r),
      status: r.status,
      observation: r.note,
      uniqueMediaViewers28d: r.uniqueMediaViewers28d,
    }));

    return (
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-mint-600 mb-2">{live.isLive ? "LIVE API" : live.deliverySource === "snapshot" ? "SNAPSHOT" : "CURRENT"} · {monthLabel(month)} 2026 · {isCurrentMonth ? "MTD" : "CLOSED MONTH"}</p>
            <h1 className="font-display text-3xl sm:text-4xl text-navy-900 max-w-3xl">Source data from the canonical Google Sheet pipeline.</h1>
            <p className="text-xs text-fog-500 mt-3 max-w-3xl">{isCurrentMonth ? "Live MTD is not compared directly with a closed full month. " : "This closed month is read from the same source used by the live dashboard. "}A cross-platform total appears only when that metric is available for all four connected platforms; partial sums are never presented as a total.</p>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full bg-mint-100 text-mint-700">{live.isLive ? "LIVE API" : live.deliverySource === "snapshot" ? "SNAPSHOT" : "SOURCE UNAVAILABLE"}</span>
            <p className="text-[10px] text-fog-400 mt-1">Updated {live.data?.generatedAt}</p>
          </div>
        </div>

        <section>
          <SectionHeader eyebrow="Cross-Platform Totals" title="Four-Platform Overview" description={`Facebook, Instagram, YouTube and TikTok only.${isCurrentMonth ? " Current month values are MTD; TikTok may remain partial until a full-month snapshot baseline is available." : " Closed-month totals use the same four-platform scope."}`}/>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="Total Views" current={total.views} previous={previousTotal?.views} sparkline={sparklineFor("views")} accent="blue"/>
            <KpiCard label="Total Interactions" current={total.interactions} previous={previousTotal?.interactions} sparkline={sparklineFor("interactions")} accent="mint"/>
            <KpiCard label="Total Shares" current={total.shares} previous={previousTotal?.shares} sparkline={sparklineFor("shares")} accent="amber"/>
            <KpiCard label="New Followers" current={total.newFollowers} previous={previousTotal?.newFollowers} sparkline={sparklineFor("newFollowers")} accent="blue"/>
            <KpiCard label="Audience Growth Rate" current={total.audienceGrowthRate} previous={previousTotal?.audienceGrowthRate} sparkline={sparklineFor("audienceGrowthRate")} format="percent" accent="mint"/>
            <KpiCard label="Content Published" current={total.contentPublished} previous={previousTotal?.contentPublished} sparkline={sparklineFor("contentPublished")} accent="amber" context="Posts + videos across the four connected platforms."/>
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Content Efficiency" title="Output Efficiency" description="Derived from the same four-platform totals above."/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard label="Views per Content" current={total.viewsPerContent} previous={previousTotal?.viewsPerContent} sparkline={sparklineFor("viewsPerContent")} accent="blue"/>
            <KpiCard label="Interactions per Content" current={total.interactionsPerContent} previous={previousTotal?.interactionsPerContent} sparkline={sparklineFor("interactionsPerContent")} accent="mint"/>
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Source Data" title="Platform Snapshot" description={`${monthLabel(month)} is read directly from Monthly Overview. Each card shows only metrics relevant and available for that platform; LinkedIn remains API Pending until its connector is completed.`}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((p:any)=><PlatformCard key={p.platform} data={p}/>)}
          </div>
        </section>
      </div>
    );
  }

  const current = getMonthlyPerformance(month);
  const prevMonth = getPreviousMonth(month);
  const previous = prevMonth ? getMonthlyPerformance(prevMonth) : undefined;
  const health = getHealthScore(month);
  const platforms = getPlatformPerformance(month);
  const previousPlatforms = prevMonth ? getPlatformPerformance(prevMonth) : [];
  const dataQuality = getDataQuality(month);
  if (!current) return <EmptyState message="No data for the selected month." />;

  const sparklineFor = (key: keyof typeof current.total) => socialDashboard.monthlyPerformance
    .filter((m) => socialDashboard.meta.months.indexOf(m.month) <= socialDashboard.meta.months.indexOf(month))
    .map((m) => m.total[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const published = platforms.reduce((sum, p) => sum + (p.contentPublished ?? 0), 0);
  const previousPublished = previousPlatforms.reduce((sum, p) => sum + (p.contentPublished ?? 0), 0);

  return (
    <div className="space-y-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-mint-600 mb-2">{monthLabel(month)} 2026 · ALMEHWAR Social Media Pulse</p>
        <h1 className="font-display text-3xl sm:text-4xl text-navy-900 max-w-3xl">{buildHeadline(current.total, previous?.total)}</h1>
      </div>

      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Tracked Reach" current={current.total.reach} previous={previous?.total.reach} sparkline={sparklineFor("reach")} accent="mint"/>
          <KpiCard label="Total Views" current={current.total.views} previous={previous?.total.views} sparkline={sparklineFor("views")} accent="blue"/>
          <KpiCard label="Interactions" current={current.total.interactions} previous={previous?.total.interactions} sparkline={sparklineFor("interactions")} accent="mint"/>
          <KpiCard label="Content Published" current={published} previous={previous ? previousPublished : undefined} accent="amber" context="Posts + videos across tracked platforms."/>
          <KpiCard label="New Followers" current={current.total.newFollowers} previous={previous?.total.newFollowers} sparkline={sparklineFor("newFollowers")} accent="blue"/>
          <KpiCard label="Tracked Profile Visits" current={current.total.profileVisits} previous={previous?.total.profileVisits} sparkline={sparklineFor("profileVisits")} accent="mint"/>
          <KpiCard label="Tracked Link Clicks" current={current.total.linkClicks} previous={previous?.total.linkClicks} sparkline={sparklineFor("linkClicks")} accent="blue"/>
          <KpiCard label="Tracked Leads" current={current.total.leads} previous={previous?.total.leads} sparkline={sparklineFor("leads")} accent="amber"/>
        </div>
        <p className="text-xs text-fog-500 mt-3">Tracked totals only include platforms where that metric exists in the source. Engagement Rate is never blended across platforms because denominators differ.</p>
      </section>

      <section>
        <SectionHeader eyebrow="Real Source Data" title="Platform Snapshot" description="All five platforms are shown from the Monthly Overview source. Missing platform metrics are displayed as N/A instead of fake zeros."/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{platforms.map((p)=><PlatformCard key={p.platform} data={p}/>)}</div>
      </section>

      {health && <section><SectionHeader eyebrow="Diagnostic" title="Social Media Health Score" description="A blended diagnostic read of visibility, engagement, growth, content quality, conversion, and creative performance."/><HealthScore score={health}/></section>}
      {previous && <section><SectionHeader eyebrow="Editorial" title="What Changed This Month"/><WhatChanged current={current.total} previous={previous.total}/></section>}
      {dataQuality.length > 0 && <section className="rounded-2xl border border-signal-amber/30 bg-signal-amber/8 p-5"><div className="flex items-center gap-2 text-signal-amber mb-3"><AlertCircle size={16}/><p className="text-xs font-semibold uppercase tracking-wide">Data Quality Check</p></div><ul className="space-y-1.5">{dataQuality.map((d)=><li key={d.id} className="text-sm text-navy-700 flex gap-2"><span className="text-signal-amber">•</span>{d.message}</li>)}</ul></section>}
    </div>
  );
}

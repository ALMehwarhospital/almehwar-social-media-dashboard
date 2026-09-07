import { useFilters } from "../utils/FilterContext";
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

  if (reach > 5 && interactions < -5) return "Attention expanded, but audience participation weakened — reach is not yet translating into engagement.";
  if (leads > 10 && reach >= 0) return "Tracked leads strengthened this month while top-of-funnel visibility held or improved.";
  if (reach < -5 && interactions < -5) return "Visibility and interaction both softened — distribution and content resonance need attention together.";
  if (followers < -5 && reach > 0) return "More people are seeing the brand, but fewer are choosing to stay connected.";
  if (interactions > 5 && followers > 0) return "Content resonance improved, with stronger interaction and healthier audience growth.";
  return "Performance is mixed this month — the useful signal is in how visibility, action and audience growth move together.";
}

export default function Overview() {
  const { month } = useFilters();
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
    .map((m) => m.total[key] as number);
  const published = platforms.reduce((sum, p) => sum + p.contentPublished, 0);
  const previousPublished = previousPlatforms.reduce((sum, p) => sum + p.contentPublished, 0);

  return (
    <div className="space-y-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-mint-600 mb-2">{monthLabel(month)} 2026 · ALMEHWAR Social Media Pulse</p>
        <h1 className="font-display text-3xl sm:text-4xl text-navy-900 max-w-3xl">{buildHeadline(current.total, previous?.total)}</h1>
      </div>

      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Tracked Reach" current={current.total.reach} previous={previous?.total.reach} sparkline={sparklineFor("reach")} accent="mint" context="Sum of source values where Reach is available."/>
          <KpiCard label="Total Views" current={current.total.views} previous={previous?.total.views} sparkline={sparklineFor("views")} accent="blue"/>
          <KpiCard label="Interactions" current={current.total.interactions} previous={previous?.total.interactions} sparkline={sparklineFor("interactions")} accent="mint"/>
          <KpiCard label="Content Published" current={published} previous={previous ? previousPublished : undefined} accent="amber" context="Posts + videos recorded in the source."/>
          <KpiCard label="New Followers" current={current.total.newFollowers} previous={previous?.total.newFollowers} sparkline={sparklineFor("newFollowers")} accent="blue"/>
          <KpiCard label="Tracked Profile Visits" current={current.total.profileVisits} previous={previous?.total.profileVisits} sparkline={sparklineFor("profileVisits")} accent="mint" context="Available source values only."/>
          <KpiCard label="Tracked Link Clicks" current={current.total.linkClicks} previous={previous?.total.linkClicks} sparkline={sparklineFor("linkClicks")} accent="blue" context="Available source values only."/>
          <KpiCard label="Tracked Leads" current={current.total.leads} previous={previous?.total.leads} sparkline={sparklineFor("leads")} accent="amber" context="Leads column only; missing platform values are not estimated."/>
        </div>
        <p className="text-xs text-fog-500 mt-3">Engagement Rate is intentionally not blended here. Each platform is evaluated with its own stated denominator in the platform section below.</p>
      </section>

      {health && <section><SectionHeader eyebrow="Diagnostic" title="Social Media Health Score" description="A blended diagnostic read of visibility, engagement, growth, content quality, conversion, and creative performance."/><HealthScore score={health}/></section>}
      {previous && <section><SectionHeader eyebrow="Editorial" title="What Changed This Month"/><WhatChanged current={current.total} previous={previous.total}/></section>}
      <section><SectionHeader eyebrow="By Channel" title="Platform Snapshot" description="Real source metrics only. No interpretation/status scoring has been added yet."/><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{platforms.map((p)=><PlatformCard key={p.platform} data={p}/>)}</div></section>
      {dataQuality.length > 0 && <section className="rounded-2xl border border-signal-amber/30 bg-signal-amber/8 p-5"><div className="flex items-center gap-2 text-signal-amber mb-3"><AlertCircle size={16}/><p className="text-xs font-semibold uppercase tracking-wide">Data Quality Check</p></div><ul className="space-y-1.5">{dataQuality.map((d)=><li key={d.id} className="text-sm text-navy-700 flex gap-2"><span className="text-signal-amber">•</span>{d.message}</li>)}</ul></section>}
    </div>
  );
}

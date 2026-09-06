import { useState } from "react";
import { socialDashboard } from "../data/socialDashboard";
import { getPlatformSeries } from "../utils/selectors";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { monthLabel, formatNumber, formatPercent, pctChange } from "../utils/format";
import { TrendTag } from "../components/dashboard/Primitives";
import type { Platform } from "../types/dashboard";

const PLATFORMS: Platform[] = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn"];

const MONTH_METRICS: { key: "reach" | "views" | "interactions" | "engagementRate" | "newFollowers" | "linkClicks" | "leads"; label: string; isPercent?: boolean }[] = [
  { key: "reach", label: "Reach" },
  { key: "views", label: "Views" },
  { key: "interactions", label: "Interactions" },
  { key: "engagementRate", label: "Engagement Rate", isPercent: true },
  { key: "newFollowers", label: "New Followers" },
  { key: "linkClicks", label: "Link Clicks" },
  { key: "leads", label: "Messages / Leads" },
];

export default function Comparisons() {
  const months = socialDashboard.meta.months;
  const [platformA, setPlatformA] = useState<Platform>("Instagram");
  const [platformB, setPlatformB] = useState<Platform>("TikTok");
  const seriesA = getPlatformSeries(platformA);
  const seriesB = getPlatformSeries(platformB);
  if (months.length < 2) return <EmptyState message="Not enough months to compare." />;
  return (
    <div className="space-y-10">
      <SectionHeader eyebrow="Compare" title="Comparisons" description="Month-over-month totals and head-to-head platform comparisons." />
      <section>
        <SectionHeader eyebrow="Timeline" title="Month-over-Month" />
        <Card><div className="overflow-x-auto -mx-5"><table className="w-full text-sm min-w-[620px]"><thead><tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8"><th className="px-5 py-2 font-medium">Metric</th>{months.map((m)=><th key={m} className="px-3 py-2 font-medium text-right">{monthLabel(m)}</th>)}</tr></thead><tbody>{MONTH_METRICS.map((metric)=><tr key={metric.key} className="border-b border-navy-900/5 last:border-0"><td className="px-5 py-2.5 font-medium text-navy-900">{metric.label}</td>{months.map((m,i)=>{const row=socialDashboard.monthlyPerformance.find((mp)=>mp.month===m);const value=row?.total[metric.key]??0;const prevRow=i>0?socialDashboard.monthlyPerformance.find((mp)=>mp.month===months[i-1]):undefined;const change=prevRow?pctChange(value,prevRow.total[metric.key]):null;return <td key={m} className="px-3 py-2.5 text-right"><span className="tabular-nums text-navy-900 font-medium">{metric.isPercent?formatPercent(value):formatNumber(value)}</span>{change!==null&&<span className={`ml-2 text-[11px] ${change>=0?"text-mint-600":"text-signal-coral"}`}>{change>=0?"+":""}{change}%</span>}</td>})}</tr>)}</tbody></table></div></Card>
      </section>
      <section>
        <SectionHeader eyebrow="Head to Head" title="Platform vs Platform" description="Pick two platforms to compare, month by month." action={<div className="flex items-center gap-2"><PlatformSelect value={platformA} onChange={setPlatformA}/><span className="text-fog-400 text-xs">vs</span><PlatformSelect value={platformB} onChange={setPlatformB}/></div>} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><PlatformCompareCard platform={platformA} series={seriesA} accent="mint"/><PlatformCompareCard platform={platformB} series={seriesB} accent="blue"/></div>
      </section>
    </div>
  );
}
function PlatformSelect({value,onChange}:{value:Platform;onChange:(p:Platform)=>void}){return <select value={value} onChange={(e)=>onChange(e.target.value as Platform)} className="text-sm font-medium bg-white border border-navy-900/10 rounded-full px-3 py-1.5 cursor-pointer">{PLATFORMS.map((p)=><option key={p} value={p}>{p}</option>)}</select>}
function PlatformCompareCard({platform,series,accent}:{platform:Platform;series:ReturnType<typeof getPlatformSeries>;accent:"mint"|"blue"}){const latest=series[series.length-1];const prev=series[series.length-2];if(!latest)return null;const change=prev?pctChange(latest.reach,prev.reach):0;return <Card><div className="flex items-center justify-between mb-4"><h3 className="font-display text-lg text-navy-900">{platform}</h3>{prev&&<TrendTag direction={change>=0?"up":"down"} value={change}/>}</div><div className="space-y-2.5">{series.map((row,i)=>row&&<div key={i} className="flex items-center gap-3"><span className="text-xs text-fog-500 w-10 shrink-0">{monthLabel(row.month)}</span><div className="flex-1 h-2 rounded-full bg-warm-100 overflow-hidden"><div className={`h-full rounded-full ${accent==="mint"?"bg-mint-500":"bg-signal-blue"}`} style={{width:`${Math.min(100,(row.reach/Math.max(...series.map((s)=>s?.reach??0)))*100)}%`}}/></div><span className="text-xs font-mono text-navy-700 w-16 text-right">{formatNumber(row.reach)}</span></div>)}</div><p className="text-fog-500 text-xs mt-3 pt-3 border-t border-navy-900/6">{latest.engagementRate}% engagement ({latest.engagementDenominator}) · +{latest.followersGrowth} followers this month</p></Card>}

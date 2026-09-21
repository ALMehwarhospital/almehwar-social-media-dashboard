import { useState } from "react";
import { socialDashboard } from "../data/socialDashboard";
import { getPlatformSeries } from "../utils/selectors";
import { useDecisionLive } from "../utils/useDecisionLive";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { monthLabel, formatNumber, formatPercent, pctChange } from "../utils/format";
import { TrendTag } from "../components/dashboard/Primitives";
import type { Platform } from "../types/dashboard";

const PLATFORMS: Platform[] = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn"];

const MONTH_METRICS: { key: "reach" | "views" | "interactions" | "newFollowers" | "linkClicks" | "leads"; label: string }[] = [
  { key: "reach", label: "Reach" },
  { key: "views", label: "Views" },
  { key: "interactions", label: "Interactions" },
  { key: "newFollowers", label: "New Followers" },
  { key: "linkClicks", label: "Link Clicks" },
  { key: "leads", label: "Messages / Leads" },
];

function basis(platform:string){
  if(platform==="Facebook"||platform==="Instagram") return "Reach";
  if(platform==="TikTok") return "Views";
  return "Impressions";
}

export default function Comparisons() {
  const months = socialDashboard.meta.months;
  const [platformA, setPlatformA] = useState<Platform>("Instagram");
  const [platformB, setPlatformB] = useState<Platform>("TikTok");
  const seriesA = getPlatformSeries(platformA);
  const seriesB = getPlatformSeries(platformB);
  const live = useDecisionLive();
  const liveRows = live.data?.data.overview.filter((r:any)=>r.month===live.data?.currentMonth) ?? [];

  if (months.length < 2) return <EmptyState message="Not enough closed months to compare." />;

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Compare"
        title="Comparisons"
        description="Closed-month comparisons stay separate from the current LIVE MTD period so partial September data is not treated as a full-month result."
        action={live.isLive ? <span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-mint-100 text-mint-700">LIVE MTD AVAILABLE</span> : undefined}
      />

      {liveRows.length > 0 && <section>
        <SectionHeader eyebrow="Current Month" title="LIVE MTD Snapshot" description="Current-month values are shown for context only. They are not ranked against or percent-compared with closed full months."/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {liveRows.map((r:any)=><Card key={r.platform}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg text-navy-900">{r.platform}</h3>
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${String(r.status).includes("Pending")?"bg-signal-amber/15 text-signal-amber":"bg-mint-100 text-mint-700"}`}>{r.status || "LIVE MTD"}</span>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-fog-500">Reach <b className="float-right text-navy-900">{formatNumber(r.reach)}</b></p>
              <p className="text-fog-500">Views <b className="float-right text-navy-900">{formatNumber(r.views)}</b></p>
              <p className="text-fog-500">Interactions <b className="float-right text-navy-900">{formatNumber(r.interactions)}</b></p>
              <p className="text-fog-500">New Followers <b className="float-right text-navy-900">{r.newFollowers==null?"N/A":`+${formatNumber(r.newFollowers)}`}</b></p>
              <p className="text-fog-500">Eng. Rate <b className="float-right text-navy-900">{formatPercent(r.engagementRate)}</b></p>
            </div>
            <p className="text-[10px] text-fog-400 mt-3">ER basis: {basis(r.platform)}</p>
          </Card>)}
        </div>
      </section>}

      <section>
        <SectionHeader eyebrow="Closed Months" title="Month-over-Month" description="June–August are complete closed months, so percentage changes are directly comparable." />
        <Card>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8">
                  <th className="px-5 py-2 font-medium">Metric</th>
                  {months.map((m)=><th key={m} className="px-3 py-2 font-medium text-right">{monthLabel(m)}</th>)}
                </tr>
              </thead>
              <tbody>
                {MONTH_METRICS.map((metric)=><tr key={metric.key} className="border-b border-navy-900/5 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-navy-900">{metric.label}</td>
                  {months.map((m,i)=>{
                    const row=socialDashboard.monthlyPerformance.find((mp)=>mp.month===m);
                    const value=row?.total[metric.key]??0;
                    const prevRow=i>0?socialDashboard.monthlyPerformance.find((mp)=>mp.month===months[i-1]):undefined;
                    const change=prevRow?pctChange(value,prevRow.total[metric.key]):null;
                    return <td key={m} className="px-3 py-2.5 text-right">
                      <span className="tabular-nums text-navy-900 font-medium">{formatNumber(value)}</span>
                      {change!==null&&<span className={`ml-2 text-[11px] ${change>=0?"text-mint-600":"text-signal-coral"}`}>{change>=0?"+":""}{change}%</span>}
                    </td>;
                  })}
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          eyebrow="Head to Head"
          title="Platform vs Platform"
          description="Closed-month Reach trend only. Engagement Rate is described per platform because denominators differ."
          action={<div className="flex items-center gap-2"><PlatformSelect value={platformA} onChange={setPlatformA}/><span className="text-fog-400 text-xs">vs</span><PlatformSelect value={platformB} onChange={setPlatformB}/></div>}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PlatformCompareCard platform={platformA} series={seriesA} accent="mint"/>
          <PlatformCompareCard platform={platformB} series={seriesB} accent="blue"/>
        </div>
      </section>
    </div>
  );
}

function PlatformSelect({value,onChange}:{value:Platform;onChange:(p:Platform)=>void}){
  return <select value={value} onChange={(e)=>onChange(e.target.value as Platform)} className="text-sm font-medium bg-white border border-navy-900/10 rounded-full px-3 py-1.5 cursor-pointer">{PLATFORMS.map((p)=><option key={p} value={p}>{p}</option>)}</select>;
}

function PlatformCompareCard({platform,series,accent}:{platform:Platform;series:ReturnType<typeof getPlatformSeries>;accent:"mint"|"blue"}){
  const valid=series.filter(Boolean);
  const latest=valid[valid.length-1];
  const prev=valid[valid.length-2];
  if(!latest)return <Card><p className="text-sm text-fog-500">No closed-month data for {platform}.</p></Card>;
  const change=prev&&latest.reach>0&&prev.reach>0?pctChange(latest.reach,prev.reach):null;
  const maxReach=Math.max(1,...valid.map((s)=>s?.reach??0));
  return <Card>
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display text-lg text-navy-900">{platform}</h3>
      {change!==null&&<TrendTag direction={change>=0?"up":"down"} value={change}/>}
    </div>
    <div className="space-y-2.5">
      {series.map((row,i)=>row&&<div key={i} className="flex items-center gap-3">
        <span className="text-xs text-fog-500 w-10 shrink-0">{monthLabel(row.month)}</span>
        <div className="flex-1 h-2 rounded-full bg-warm-100 overflow-hidden">
          {row.reach>0&&<div className={`h-full rounded-full ${accent==="mint"?"bg-mint-500":"bg-signal-blue"}`} style={{width:`${Math.min(100,(row.reach/maxReach)*100)}%`}}/>}
        </div>
        <span className="text-xs font-mono text-navy-700 w-16 text-right">{row.reach>0?formatNumber(row.reach):"N/A"}</span>
      </div>)}
    </div>
    <p className="text-fog-500 text-xs mt-3 pt-3 border-t border-navy-900/6">
      {formatPercent(latest.engagementRate)} engagement using {latest.engagementDenominator} · +{formatNumber(latest.followersGrowth)} followers in {monthLabel(latest.month)}
    </p>
  </Card>;
}

import { useMemo, useState } from "react";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { getPlatformPerformance } from "../utils/selectors";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { PlatformCard } from "../components/dashboard/PlatformCard";
import { PlatformBarChart } from "../components/charts/PlatformBarChart";
import { formatNumber, formatPercent, monthLabel } from "../utils/format";

const METRICS=[
  {key:"reach",label:"Reach",isPercent:false},
  {key:"views",label:"Views",isPercent:false},
  {key:"interactions",label:"Interactions",isPercent:false},
  {key:"engagementRate",label:"Engagement Rate",isPercent:true},
  {key:"followersGrowth",label:"New Followers",isPercent:false},
  {key:"clicks",label:"Link Clicks",isPercent:false},
  {key:"profileLinkTaps",label:"Profile Link Taps",isPercent:false}
] as const;

function publishedCount(row:any):number|null{
  const posts=typeof row.posts==="number"?row.posts:null;
  const videos=typeof row.videos==="number"?row.videos:null;
  if(posts===null&&videos===null)return null;
  return (posts??0)+(videos??0);
}

function basis(platform:string){
  if(platform==="Facebook"||platform==="Instagram") return "Reach";
  if(platform==="TikTok") return "Views";
  return "Impressions";
}

function metricNote(key:(typeof METRICS)[number]["key"]){
  if(key==="reach") return "Only platforms with a reported Reach value are included in the chart.";
  if(key==="engagementRate") return "Engagement denominators differ by platform, so compare directionally rather than as a strict apples-to-apples ranking.";
  if(key==="clicks") return "Only platforms with reported click data are included.";
  if(key==="profileLinkTaps") return "This is currently reported for Instagram from Meta profile insights.";
  if(key==="followersGrowth") return "This compares new followers gained during the selected month.";
  return `This compares reported ${key==="views"?"views":"interactions"} for the selected month.`;
}

function currentMonthKey(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

export default function Platforms(){
  const {month,platform}=useFilters();
  const [metric,setMetric]=useState<(typeof METRICS)[number]>(METRICS[0]);
  const live=useDecisionLive();

  const platforms=useMemo(()=>{
    if(live.data && month===live.data.currentMonth){
      return live.data.data.overview
        .filter((r:any)=>r.month===month && (platform==="All" || r.platform===platform))
        .map((r:any)=>({
          month:r.month,
          platform:r.platform,
          reach:r.reach,
          views:r.views,
          interactions:r.interactions,
          engagementRate:r.engagementRate,
          engagementDenominator:basis(r.platform),
          followersGrowth:r.newFollowers,
          clicks:r.linkClicks,
          profileLinkTaps:r.profileLinkTaps,
          messages:r.messages,
          contentPublished:publishedCount(r),
          status:r.status,
          observation:r.note
        }));
    }
    return getPlatformPerformance(month,platform==="All"?undefined:platform) as any[];
  },[live.data,month,platform]);

  if(month===currentMonthKey() && live.loading && !live.data) return <EmptyState message="Loading live platform data…"/>;
  if(month===currentMonthKey() && !live.data && live.error) return <EmptyState message="Live platform data is temporarily unavailable. No demo data is shown."/>;
  if(platforms.length===0)return <EmptyState message="No real platform data for this selection."/>;

  const available=platforms.filter((p:any)=>typeof p[metric.key]==="number" && Number.isFinite(p[metric.key]));
  const barData=available.map((p:any)=>({platform:p.platform,value:p[metric.key] as number}));

  return <div className="space-y-10">
    <SectionHeader
      eyebrow="Channels"
      title="Platform Performance"
      description="Monthly Overview is the source of truth. The current month comes from the canonical Google Sheet pipeline; unavailable values remain N/A."
      action={<span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${live.data&&month===live.data.currentMonth?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>{live.data&&month===live.data.currentMonth ? (live.isLive ? "LIVE API · MTD" : live.deliverySource==="snapshot" ? "SNAPSHOT · MTD" : "CURRENT MTD") : "CLOSED MONTH"}</span>}
    />
    <Card>
      <div className="flex flex-wrap gap-2 mb-5">{METRICS.map((m)=><button key={m.key} onClick={()=>setMetric(m)} className={`text-xs px-3 py-1.5 rounded-full ${metric.key===m.key?"bg-navy-900 text-warm-50":"bg-warm-100 text-fog-600"}`}>{m.label}</button>)}</div>
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-widest text-mint-600 font-semibold">Comparing platforms by</p>
        <h3 className="font-display text-2xl text-navy-900">{metric.label} · {monthLabel(month)}</h3>
        <p className="text-xs text-fog-500 mt-1 max-w-3xl">{metricNote(metric.key)}</p>
      </div>
      {barData.length ? <PlatformBarChart data={barData} valueLabel={metric.label} isPercent={metric.isPercent}/> : <EmptyState message="This metric is not available for the selected platforms."/>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-5">
        {platforms.map((p:any)=>{
          const value=p[metric.key];
          const ok=typeof value==="number"&&Number.isFinite(value);
          return <div key={p.platform} className="rounded-xl bg-warm-100 p-3">
            <p className="text-[10px] uppercase text-fog-400">{p.platform}</p>
            <p className="font-display text-lg text-navy-900 mt-1">{ok?(metric.isPercent?formatPercent(value):formatNumber(value)):"N/A"}</p>
          </div>;
        })}
      </div>
    </Card>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{platforms.map((p:any)=><PlatformCard key={p.platform} data={p}/>)}</div>
  </div>;
}

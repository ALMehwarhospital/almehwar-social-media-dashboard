import { useState } from "react";
import { useFilters } from "../utils/FilterContext";
import { getPlatformPerformance } from "../utils/selectors";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { PlatformCard } from "../components/dashboard/PlatformCard";
import { PlatformBarChart } from "../components/charts/PlatformBarChart";
import { formatNumber, formatPercent, monthLabel } from "../utils/format";
import type { PlatformPerformance } from "../types/dashboard";

const METRICS=[
  {key:"reach",label:"Reach",isPercent:false},
  {key:"views",label:"Views",isPercent:false},
  {key:"interactions",label:"Interactions",isPercent:false},
  {key:"engagementRate",label:"Engagement Rate",isPercent:true},
  {key:"followersGrowth",label:"New Followers",isPercent:false},
  {key:"clicks",label:"Link Clicks",isPercent:false}
] as const;

function isAvailable(p: PlatformPerformance, key:(typeof METRICS)[number]['key']){
  if(key==='reach' && (p.platform==='LinkedIn' || p.platform==='TikTok')) return false;
  if(key==='clicks' && (p.platform==='YouTube' || p.platform==='TikTok')) return false;
  return true;
}

function metricNote(key:(typeof METRICS)[number]['key']){
  if(key==='reach') return 'Reach comparison excludes LinkedIn and TikTok because Reach is not available in the source for those platforms.';
  if(key==='engagementRate') return 'Engagement Rate is shown as reported per platform. Denominators differ: Reach, Views or Impressions, so use this directionally rather than as a strict apples-to-apples ranking.';
  if(key==='clicks') return 'Link Click comparison includes only platforms with click data in the source; missing values are shown as N/A.';
  if(key==='followersGrowth') return 'This compares new followers gained during the selected month.';
  return `This compares reported ${key==='views'?'views':'interactions'} for the selected month.`;
}

export default function Platforms(){
  const{month,platform}=useFilters();
  const[metric,setMetric]=useState<(typeof METRICS)[number]>(METRICS[0]);
  const platforms=getPlatformPerformance(month,platform==="All"?undefined:platform);
  if(platforms.length===0)return <EmptyState message="No platform data for this selection."/>;
  const available=platforms.filter(p=>isAvailable(p,metric.key));
  const barData=available.map((p)=>({platform:p.platform,value:p[metric.key] as number}));

  return <div className="space-y-10">
    <SectionHeader eyebrow="Channels" title="Platform Performance" description="All values come from the same Monthly Overview source used by the Overview page."/>
    <Card>
      <div className="flex flex-wrap gap-2 mb-5">{METRICS.map((m)=><button key={m.key} onClick={()=>setMetric(m)} className={`text-xs px-3 py-1.5 rounded-full ${metric.key===m.key?"bg-navy-900 text-warm-50":"bg-warm-100 text-fog-600"}`}>{m.label}</button>)}</div>
      <div className="mb-4"><p className="text-[11px] uppercase tracking-widest text-mint-600 font-semibold">Comparing platforms by</p><h3 className="font-display text-2xl text-navy-900">{metric.label} · {monthLabel(month)}</h3><p className="text-xs text-fog-500 mt-1 max-w-3xl">{metricNote(metric.key)}</p></div>
      <PlatformBarChart data={barData} valueLabel={metric.label} isPercent={metric.isPercent}/>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-5">{platforms.map(p=>{const ok=isAvailable(p,metric.key);const value=p[metric.key] as number;return <div key={p.platform} className="rounded-xl bg-warm-100 p-3"><p className="text-[10px] uppercase text-fog-400">{p.platform}</p><p className="font-display text-lg text-navy-900 mt-1">{ok?(metric.isPercent?formatPercent(value):formatNumber(value)):'N/A'}</p></div>})}</div>
    </Card>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{platforms.map((p)=><PlatformCard key={p.platform} data={p}/>)}</div>
  </div>
}

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

const PLATFORM_ORDER=["Facebook","Instagram","TikTok","YouTube","LinkedIn"] as const;

function PlatformLogo({platform}:{platform:string}){
  if(platform==="Facebook") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#1877F2"/><path fill="#fff" d="M22.8 35V21.3h4.6l.7-5.3h-5.3v-3.4c0-1.5.4-2.6 2.7-2.6h2.9V5.3c-.5-.1-2.2-.2-4.2-.2-4.1 0-6.9 2.5-6.9 7.1V16h-4.6v5.3h4.6V35h5.5Z"/></svg>;
  if(platform==="Instagram") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true"><defs><linearGradient id="ig-gradient" x1="4" y1="36" x2="36" y2="4" gradientUnits="userSpaceOnUse"><stop stopColor="#FFDC80"/><stop offset=".35" stopColor="#F77737"/><stop offset=".68" stopColor="#C13584"/><stop offset="1" stopColor="#405DE6"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#ig-gradient)"/><rect x="9" y="9" width="22" height="22" rx="7" fill="none" stroke="#fff" strokeWidth="2.5"/><circle cx="20" cy="20" r="5.2" fill="none" stroke="#fff" strokeWidth="2.5"/><circle cx="27.3" cy="12.8" r="1.6" fill="#fff"/></svg>;
  if(platform==="TikTok") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#101820"/><path d="M23.5 9c.5 3.8 2.7 6 6.5 6.3v4.4a13 13 0 0 1-6.5-2.1v8.2a7.7 7.7 0 1 1-6.7-7.6v4.5a3.3 3.3 0 1 0 2.2 3.1V9h4.5Z" fill="#25F4EE" opacity=".9"/><path d="M25.1 8c.5 3.8 2.7 6 6.5 6.3v4.4a13 13 0 0 1-6.5-2.1v8.2a7.7 7.7 0 1 1-6.7-7.6v4.5a3.3 3.3 0 1 0 2.2 3.1V8h4.5Z" fill="#FE2C55" opacity=".9"/><path d="M24.3 8.5c.5 3.8 2.7 6 6.5 6.3v3.1a13 13 0 0 1-6.5-2.1V25a6.3 6.3 0 1 1-6.7-6.3v3.2a3.3 3.3 0 1 0 2.2 3.1V8.5h4.5Z" fill="#fff"/></svg>;
  if(platform==="YouTube") return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#FF0033"/><path fill="#fff" d="m17 13.5 11 6.5-11 6.5v-13Z"/></svg>;
  return <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#0A66C2"/><circle cx="11.5" cy="12" r="2.5" fill="#fff"/><path fill="#fff" d="M9.2 16h4.6v14H9.2zM16.6 16h4.4v1.9h.1c.6-1.2 2.1-2.5 4.3-2.5 4.6 0 5.5 3 5.5 7V30h-4.6v-6.7c0-1.6 0-3.7-2.3-3.7s-2.7 1.8-2.7 3.6V30h-4.6V16Z"/></svg>;
}

function audienceLabel(platform:string){
  return platform==="YouTube" ? "Subscribers" : "Followers";
}

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
          impressions:r.impressions,
          views:r.views,
          likes:r.likes,
          comments:r.comments,
          shares:r.shares,
          interactions:r.interactions,
          engagementRate:r.engagementRate,
          engagementDenominator:basis(r.platform),
          followersGrowth:r.newFollowers,
          clicks:r.linkClicks,
          profileLinkTaps:r.profileLinkTaps,
          profileVisits:r.profileVisits,
          messages:r.messages,
          leads:r.leads,
          uniqueMediaViewers28d:r.uniqueMediaViewers28d,
          contentPublished:publishedCount(r),
          status:r.status,
          observation:r.note
        }));
    }
    return (getPlatformPerformance(month,platform==="All"?undefined:platform) as any[]).map((r:any)=>{
      const source=live.data?.data.overview.find((o:any)=>o.month===month&&o.platform===r.platform);
      return {
        ...r,
        impressions:r.impressions??source?.impressions??null,
        likes:r.likes??source?.likes??null,
        comments:r.comments??source?.comments??null,
        shares:r.shares??source?.shares??null,
        profileVisits:r.profileVisits??source?.profileVisits??null,
        profileLinkTaps:r.profileLinkTaps??source?.profileLinkTaps??null,
        clicks:r.clicks??source?.linkClicks??null,
        messages:r.messages??source?.messages??null,
        leads:r.leads??source?.leads??null,
        uniqueMediaViewers28d:r.uniqueMediaViewers28d??source?.uniqueMediaViewers28d??null,
      };
    });
  },[live.data,month,platform]);

  if(month===currentMonthKey() && live.loading && !live.data) return <EmptyState message="Loading live platform data…"/>;
  if(month===currentMonthKey() && !live.data && live.error) return <EmptyState message="Live platform data is temporarily unavailable. No demo data is shown."/>;
  if(platforms.length===0)return <EmptyState message="No real platform data for this selection."/>;

  const available=platforms.filter((p:any)=>typeof p[metric.key]==="number" && Number.isFinite(p[metric.key]));
  const barData=available.map((p:any)=>({platform:p.platform,value:p[metric.key] as number}));
  const isLiveMonth=Boolean(live.data && month===live.data.currentMonth);
  const audienceRows=PLATFORM_ORDER
    .filter(name=>platform==="All" || name===platform)
    .map(name=>{
      const row=live.data?.data.overview.find((r:any)=>r.month===month&&r.platform===name);
      const start=name==="LinkedIn"?null:(typeof row?.followersStart==="number"?row.followersStart:null);
      const end=name==="LinkedIn"?null:(typeof row?.followersEnd==="number"?row.followersEnd:null);
      return {platform:name,start,end};
    });

  return <div className="space-y-10">
    <SectionHeader
      eyebrow="Channels"
      title="Platform Performance"
      description="Monthly Overview is the source of truth. The current month comes from the canonical Google Sheet pipeline; unavailable values remain N/A."
      action={<span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${live.data&&month===live.data.currentMonth?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>{live.data&&month===live.data.currentMonth ? (live.isLive ? "LIVE API · MTD" : live.deliverySource==="snapshot" ? "SNAPSHOT · MTD" : "CURRENT MTD") : "CLOSED MONTH"}</span>}
    />
    <section>
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-widest text-mint-600 font-semibold">Audience</p>
        <h3 className="font-display text-2xl text-navy-900">Platform Audience · {monthLabel(month)}</h3>
        <p className="text-xs text-fog-500 mt-1">Current-month cards show the latest available audience count. Closed months show the recorded start and end values.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {audienceRows.map(row=>{
          const label=audienceLabel(row.platform);
          const availableEnd=typeof row.end==="number"&&Number.isFinite(row.end);
          const availableStart=typeof row.start==="number"&&Number.isFinite(row.start);
          return <Card key={row.platform}>
            <div className="flex items-start justify-between gap-3">
              <PlatformLogo platform={row.platform}/>
              <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${isLiveMonth&&row.platform!=="LinkedIn"?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>
                {row.platform==="LinkedIn"?"API Pending":isLiveMonth?"Live MTD":"Closed Month"}
              </span>
            </div>
            <p className="mt-4 text-xs font-medium text-fog-500">{row.platform}</p>
            <p className="mt-1 font-display text-3xl text-navy-900">{availableEnd?formatNumber(row.end):"N/A"}</p>
            <p className="text-[11px] text-fog-500">{isLiveMonth?`Current ${label}`:`Ending ${label}`}</p>
            <div className="mt-4 border-t border-navy-900/8 pt-3 text-xs">
              {row.platform==="LinkedIn"
                ? <p className="text-fog-400">Live audience will appear after API approval.</p>
                : isLiveMonth
                  ? <p className="text-fog-500">Month start <b className="float-right text-navy-900">{availableStart?formatNumber(row.start):"N/A"}</b></p>
                  : <div className="flex items-center justify-between text-fog-500"><span>{availableStart?formatNumber(row.start):"N/A"}</span><span>→</span><b className="text-navy-900">{availableEnd?formatNumber(row.end):"N/A"}</b></div>}
            </div>
          </Card>;
        })}
      </div>
    </section>
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

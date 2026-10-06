import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ExternalLink, Film, FileText, Lightbulb, PhoneCall, TriangleAlert } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import { formatNumber, formatPercent, monthLabel } from "../utils/format";

const CONNECTED_PLATFORMS = ["Facebook", "Instagram", "YouTube", "TikTok"] as const;

function finite(value:unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function completeSum(rows:any[], key:string):number|null {
  const connected = CONNECTED_PLATFORMS.map(platform=>rows.find(row=>row.platform===platform));
  if (connected.some(row=>!row || !finite(row[key]))) return null;
  return connected.reduce((sum,row)=>sum+row[key],0);
}

function publishedCount(row:any):number|null {
  const posts = finite(row?.posts) ? row.posts : null;
  const videos = finite(row?.videos) ? row.videos : null;
  if (posts===null && videos===null) return null;
  return (posts??0)+(videos??0);
}

function completePublished(rows:any[]):number|null {
  const connected = CONNECTED_PLATFORMS.map(platform=>rows.find(row=>row.platform===platform));
  const values = connected.map(publishedCount);
  if (values.some(value=>value===null)) return null;
  return (values as number[]).reduce((sum,value)=>sum+value,0);
}

function sumAvailable(rows:any[],key:string):number|null {
  const values=rows.map(row=>row[key]).filter(finite);
  return values.length?values.reduce((sum,value)=>sum+value,0):null;
}

function bestBy(rows:any[],key:string) {
  return rows.filter(row=>finite(row[key])).sort((a,b)=>b[key]-a[key])[0]??null;
}

function FactCard({label,value,note}:{label:string;value:string;note:string}) {
  return <Card><p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p><p className="font-display text-2xl text-navy-900 mt-1">{value}</p><p className="text-[10px] text-fog-500 mt-2 leading-relaxed">{note}</p></Card>;
}

function ContentHighlight({item,label}:{item:any;label:string}) {
  return <Card><p className="text-[10px] uppercase tracking-wide text-mint-600 font-semibold">{label}</p><p className="font-display text-lg text-navy-900 mt-2 line-clamp-2">{item?.name||"N/A"}</p>{item&&<><p className="text-xs text-fog-500 mt-2">{item.platform} · {item.format||"Content"}</p><div className="grid grid-cols-3 gap-2 mt-4"><div><p className="text-[9px] uppercase text-fog-400">Views</p><p className="font-semibold text-navy-900">{formatNumber(item.views)}</p></div><div><p className="text-[9px] uppercase text-fog-400">Interactions</p><p className="font-semibold text-navy-900">{formatNumber(item.interactions)}</p></div><div><p className="text-[9px] uppercase text-fog-400">Shares</p><p className="font-semibold text-navy-900">{formatNumber(item.shares)}</p></div></div>{item.url&&<a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-signal-blue mt-4 hover:underline">Open content <ExternalLink size={12}/></a>}</>}</Card>;
}

export default function ExecutiveSummary(){
  const {month}=useFilters();
  const live=useDecisionLive();
  const overview=useMemo(()=>live.data?.data.overview.filter((row:any)=>row.month===month)??[],[live.data,month]);
  const content=useMemo(()=>live.data?.data.content.filter((row:any)=>row.month===month)??[],[live.data,month]);
  const videos=useMemo(()=>live.data?.data.video.filter((row:any)=>row.month===month)??[],[live.data,month]);
  const creative=useMemo(()=>live.data?.data.creative.filter((row:any)=>row.month===month)??[],[live.data,month]);
  const calls=useMemo(()=>(live.data?.data.inboundCalls??[]).filter((row:any)=>row.periodMonth===month),[live.data,month]);
  const recommendations=useMemo(()=>live.data?.data.recommendations.filter((row:any)=>row.month===month)??[],[live.data,month]);
  const actions=useMemo(()=>live.data?.data.actionPlan.filter((row:any)=>row.month===month)??[],[live.data,month]);

  if(live.loading&&!live.data) return <EmptyState message="Loading the monthly executive summary…"/>;
  if(!live.data&&live.error) return <EmptyState message="The real dashboard source is temporarily unavailable. No summary is generated from demo data."/>;
  if(!overview.length) return <EmptyState message="No Monthly Overview data is available for this month."/>;

  const isCurrent=month===live.data?.currentMonth;
  const totals={
    views:completeSum(overview,"views"),interactions:completeSum(overview,"interactions"),
    shares:completeSum(overview,"shares"),followers:completeSum(overview,"newFollowers"),
    published:completePublished(overview),
  };
  const strongestPlatform=bestBy(overview.filter((row:any)=>CONNECTED_PLATFORMS.includes(row.platform)),"views");
  const topContent=bestBy(content.filter((row:any)=>finite(row.views)&&row.views>0),"interactions");
  const topVideo=bestBy(videos.filter((row:any)=>finite(row.views)&&row.views>0),"interactions");
  const reviewedCreative=creative.filter((row:any)=>row.reviewStatus==="Reviewed"&&finite(row.creativeScore));
  const callTotals={inbound:sumAvailable(calls,"inboundCalls"),opd:sumAvailable(calls,"opdReservations"),clinics:sumAvailable(calls,"clinics")};
  const linkedInPending=overview.some((row:any)=>row.platform==="LinkedIn"&&String(row.status||"").toUpperCase().includes("PENDING"));
  const gaps=[
    linkedInPending?"LinkedIn is still API Pending.":null,
    reviewedCreative.length<creative.length?`${creative.length-reviewedCreative.length} creative items still need human review.`:null,
    !calls.length?"Inbound call data has not been loaded for this month yet.":null,
  ].filter(Boolean) as string[];

  return <div className="space-y-9">
    <SectionHeader eyebrow="Management View" title="Executive Summary" description={`A factual snapshot of ${monthLabel(month)} 2026. Current-month figures are MTD; closed months remain fixed. Missing data stays N/A.`} action={<div className="text-right"><span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full ${isCurrent?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-600"}`}>{isCurrent?(live.isLive?"LIVE API · MTD":"SNAPSHOT · MTD"):"CLOSED MONTH"}</span><p className="text-[10px] text-fog-400 mt-1">Updated {live.data?.generatedAt}</p></div>}/>

    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <FactCard label="Total Views" value={formatNumber(totals.views)} note="Complete four-platform total."/>
      <FactCard label="Interactions" value={formatNumber(totals.interactions)} note="Complete four-platform total."/>
      <FactCard label="Shares" value={formatNumber(totals.shares)} note="Complete four-platform total."/>
      <FactCard label="New Followers" value={formatNumber(totals.followers)} note="Facebook, Instagram, YouTube and TikTok."/>
      <FactCard label="Content Published" value={formatNumber(totals.published)} note="Posts and videos across the four platforms."/>
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-5">
      <Card><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-mint-600"/><h3 className="font-display text-xl text-navy-900">Management Brief</h3></div><div className="space-y-3 mt-4 text-sm text-navy-800">
        <p><b>{formatNumber(totals.published)}</b> content items generated <b>{formatNumber(totals.views)}</b> views and <b>{formatNumber(totals.interactions)}</b> interactions across the four connected platforms.</p>
        <p>{strongestPlatform?<><b>{strongestPlatform.platform}</b> currently leads platform views with <b>{formatNumber(strongestPlatform.views)}</b>.</>:"A platform view leader cannot be calculated from the available data."}</p>
        <p>{topContent?<><b>{topContent.platform}</b> has the highest-interaction content item in this selection with <b>{formatNumber(topContent.interactions)}</b> interactions.</>:"No content item has enough data for an interaction ranking yet."}</p>
        <p className="text-fog-500">These are descriptive facts only. Causes and recommended actions remain in the Recommendations workflow for team review.</p>
      </div></Card>
      <Card><div className="flex items-center gap-2"><TriangleAlert size={18} className="text-signal-amber"/><h3 className="font-display text-xl text-navy-900">Data Readiness</h3></div>{gaps.length?<ul className="space-y-2 mt-4">{gaps.map(gap=><li key={gap} className="text-sm text-navy-700 flex gap-2"><span className="text-signal-amber">•</span>{gap}</li>)}</ul>:<p className="text-sm text-mint-700 mt-4">All tracked summary sources are ready for this month.</p>}</Card>
    </section>

    <section><SectionHeader eyebrow="Content Highlights" title="What Performed Best" description="Straight rankings from the selected month. No creative score is inferred from performance."/><div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><ContentHighlight item={topContent} label="Highest interactions · Content"/><ContentHighlight item={topVideo} label="Highest interactions · Video"/></div></section>

    <section><SectionHeader eyebrow="Operational Snapshot" title="Decision & Business Signals" description="Recommendations, actions and calls are kept separate; no call is attributed to social media without a verified link."/><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <FactCard label="Recommendations" value={formatNumber(recommendations.length)} note="Saved for this selected month."/>
      <FactCard label="Action Items" value={formatNumber(actions.length)} note="Planned or active actions."/>
      <FactCard label="Inbound Calls" value={formatNumber(callTotals.inbound)} note={`${calls.length} reporting day${calls.length===1?"":"s"}.`}/>
      <FactCard label="OPD Reservations" value={formatNumber(callTotals.opd)} note="Reported by the call-center source."/>
      <FactCard label="Clinic Calls" value={formatNumber(callTotals.clinics)} note="Not automatically attributed to campaigns."/>
    </div></section>

    <Card><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[
      {to:"/content",label:"Inspect Content",icon:FileText,note:`${content.length} items`},
      {to:"/video",label:"Inspect Videos",icon:Film,note:`${videos.length} videos`},
      {to:"/recommendations",label:"Review Decisions",icon:Lightbulb,note:`${recommendations.length} recommendations`},
    ].map(item=>{const Icon=item.icon;return <Link key={item.to} to={item.to} className="flex items-center justify-between rounded-xl bg-warm-100 p-4 hover:bg-hospital-mist/70"><span className="flex items-center gap-3"><Icon size={18} className="text-signal-blue"/><span><b className="block text-sm text-navy-900">{item.label}</b><span className="text-[10px] text-fog-500">{item.note}</span></span></span><ArrowRight size={15} className="text-fog-400"/></Link>;})}</div>{calls.length>0&&<div className="flex items-center gap-2 mt-4 text-xs text-fog-500"><PhoneCall size={14}/>Call-center totals are contextual business signals, not claimed social-media conversions.</div>}</Card>
  </div>;
}

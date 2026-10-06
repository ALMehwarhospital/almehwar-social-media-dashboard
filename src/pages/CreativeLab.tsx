import { useMemo, useState } from "react";
import { ExternalLink, FlaskConical, ImageIcon, Lightbulb, PlayCircle, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useDecisionLive } from "../utils/useDecisionLive";
import { useFilters } from "../utils/FilterContext";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { CreativeRadar } from "../components/creative/CreativeRadar";
import { PerformanceMatrix } from "../components/creative/PerformanceMatrix";
import type { ContentFormat, Platform } from "../types/dashboard";

const QUADRANTS = ["Strong Creative / Strong Performance","Strong Creative / Weak Performance","Weak Creative / Strong Performance","Needs Rework"] as const;
const quadrantClasses:Record<string,string> = {
  "Strong Creative / Strong Performance":"bg-mint-100 text-mint-700",
  "Strong Creative / Weak Performance":"bg-signal-blue/10 text-signal-blue",
  "Weak Creative / Strong Performance":"bg-signal-amber/15 text-signal-amber",
  "Needs Rework":"bg-signal-coral/10 text-signal-coral",
};
type ScoreComponent = {label:string;score:number;weight:number};
type PerformanceAnalysis = {score:number|null;confidence:"High"|"Medium"|"Low"|"Insufficient";mature:boolean;status:"High Performer"|"Competitive"|"Needs Attention"|"Needs More Data";reason:string;peerCount:number;components:ScoreComponent[];source:"Automatic"|"Stored"|"N/A"};
type CreativeType = "All"|"Static Design"|"Carousel"|"Reel / Short Video"|"Long Video";
type ReviewFilter = "All"|"Needs Review"|"Reviewed";

function available(value:any):value is number { return typeof value === "number" && Number.isFinite(value); }
function hasCreativeReview(item:any) { return item.reviewStatus === "Reviewed" && available(item.creativeScore); }
function canonicalUrl(value:any) { return String(value || "").trim().toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/[?#].*$/,"").replace(/\/$/,""); }
function itemKeys(item:any) {
  const keys:string[]=[];
  for (const id of [item.id,item.contentId,item.videoId,item.mediaId,item.postId]) if (id) keys.push(`id:${String(id)}`);
  if (item.url) keys.push(`url:${canonicalUrl(item.url)}`);
  if (item.name || item.title) keys.push(`name:${item.platform}|${String(item.name || item.title).trim().toLowerCase()}`);
  return keys;
}
function formatGroup(item:any) {
  const raw=String(item.format || "").toLowerCase();
  if (raw.includes("carousel")) return "Carousel";
  if (raw.includes("long")) return "Long Video";
  if (raw.includes("reel") || raw.includes("short")) return "Reel / Short Video";
  if (raw.includes("static") || raw.includes("image") || raw.includes("post")) return "Static Design";
  if (available(item.durationSeconds)) return item.durationSeconds>90?"Long Video":"Reel / Short Video";
  return "Other";
}
function isVideoCreative(item:any) { return /video|reel|short/i.test(formatGroup(item)); }
function average(values:any[]) { const valid=values.filter(available) as number[]; return valid.length?valid.reduce((sum,value)=>sum+value,0)/valid.length:null; }
function watchQuality(item:any) {
  const ratio=available(item.avgWatchTimeSeconds)&&available(item.durationSeconds)&&item.durationSeconds>0?Math.min(1,item.avgWatchTimeSeconds/item.durationSeconds):null;
  return average([item.avgPercentWatched,item.completionRate,item.retention25,item.retention50,item.retention75,ratio]);
}
function valueActionRate(item:any) {
  if (available(item.valueRate)) return item.valueRate;
  const actions=[item.shares,item.saves].filter(available) as number[];
  const denominator=available(item.reach)?item.reach:available(item.views)?item.views:item.impressions;
  return actions.length&&available(denominator)&&denominator>0?actions.reduce((sum,value)=>sum+value,0)/denominator:null;
}
function intentRate(item:any) {
  const actions=[item.linkClicks,item.profileVisits,item.leads,item.messages].filter(available) as number[];
  const denominator=available(item.reach)?item.reach:available(item.views)?item.views:item.impressions;
  return actions.length&&available(denominator)&&denominator>0?actions.reduce((sum,value)=>sum+value,0)/denominator:null;
}
function distributionValue(item:any) { return available(item.views)?item.views:available(item.impressions)?item.impressions:available(item.reach)?item.reach:null; }
function percentile(values:number[],value:number) {
  if (values.length<=1) return .5;
  const below=values.filter((candidate)=>candidate<value).length;
  const equal=values.filter((candidate)=>candidate===value).length;
  return (below+Math.max(0,equal-1)/2)/(values.length-1);
}
function lowerQuartile(values:number[]) { if (!values.length) return 0; const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.floor((sorted.length-1)*.25)]; }

function calculatePerformance(items:any[],currentMonth:string) {
  const groups=new Map<string,any[]>();
  for (const item of items) { const key=`${item.platform}|${formatGroup(item)}`; groups.set(key,[...(groups.get(key)||[]),item]); }
  return items.map((item:any)=>{
    const peers=groups.get(`${item.platform}|${formatGroup(item)}`)||[item];
    const raw=isVideoCreative(item)?[
      {label:"Viewing quality",weight:35,value:watchQuality(item),read:(peer:any)=>watchQuality(peer)},
      {label:"Engagement",weight:30,value:item.engagementRate,read:(peer:any)=>peer.engagementRate},
      {label:"Shares & saves",weight:20,value:valueActionRate(item),read:(peer:any)=>valueActionRate(peer)},
      {label:"Distribution",weight:15,value:distributionValue(item),read:(peer:any)=>distributionValue(peer)},
    ]:[
      {label:"Engagement",weight:35,value:item.engagementRate,read:(peer:any)=>peer.engagementRate},
      {label:"Shares & saves",weight:25,value:valueActionRate(item),read:(peer:any)=>valueActionRate(peer)},
      {label:"Distribution",weight:25,value:distributionValue(item),read:(peer:any)=>distributionValue(peer)},
      {label:"Intent",weight:15,value:intentRate(item),read:(peer:any)=>intentRate(peer)},
    ];
    const components:ScoreComponent[]=raw.flatMap((component)=>{
      if (!available(component.value)) return [];
      const values=peers.map(component.read).filter(available) as number[];
      return values.length?[{label:component.label,weight:component.weight,score:Math.round(percentile(values,component.value as number)*100)}]:[];
    });
    const weight=components.reduce((sum,component)=>sum+component.weight,0);
    const automatic=components.length>=2&&weight>0?Math.round(components.reduce((sum,component)=>sum+component.score*component.weight,0)/weight):null;
    const stored=available(item.performanceScore)?item.performanceScore:null;
    const score=automatic??stored;
    const source:PerformanceAnalysis["source"]=automatic!==null?"Automatic":stored!==null?"Stored":"N/A";
    const distribution=distributionValue(item);
    const peerDistribution=peers.map(distributionValue).filter(available) as number[];
    const mature=item.month!==currentMonth||(available(distribution)&&distribution>=Math.max(50,lowerQuartile(peerDistribution)));
    const confidence:PerformanceAnalysis["confidence"]=score===null?"Insufficient":components.length>=3&&peers.length>=5?"High":components.length>=2&&peers.length>=3?"Medium":"Low";
    const status:PerformanceAnalysis["status"]=score===null||!mature?"Needs More Data":score>=70?"High Performer":score<40?"Needs Attention":"Competitive";
    const strongest=components.length?[...components].sort((a,b)=>b.score-a.score)[0]:null;
    const weakest=components.length?[...components].sort((a,b)=>a.score-b.score)[0]:null;
    const reason=status==="Needs More Data"?(score===null?"Not enough comparable metrics yet.":"Performance is still maturing."):status==="High Performer"?`Strongest signal: ${strongest?.label||"overall performance"}.`:status==="Needs Attention"?`Main gap: ${weakest?.label||"overall performance"}.`:`Competitive result; strongest in ${strongest?.label||"available metrics"}.`;
    const analysis:PerformanceAnalysis={score,source,confidence,mature,status,reason,peerCount:peers.length,components};
    const creativeStrong=available(item.creativeScore)&&item.creativeScore>=70;
    const performanceStrong=score!==null&&score>=70;
    const quadrant=creativeStrong&&performanceStrong?QUADRANTS[0]:creativeStrong?QUADRANTS[1]:performanceStrong?QUADRANTS[2]:QUADRANTS[3];
    return {...item,performanceScore:score,analysis,quadrant};
  });
}

function statusClasses(status:PerformanceAnalysis["status"]) {
  if (status==="High Performer") return "bg-mint-100 text-mint-700";
  if (status==="Needs Attention") return "bg-signal-coral/10 text-signal-coral";
  if (status==="Needs More Data") return "bg-signal-amber/15 text-signal-amber";
  return "bg-signal-blue/10 text-signal-blue";
}
function CreativeThumbnail({item,compact=false}:{item:any;compact?:boolean}) {
  const [failed,setFailed]=useState(false); const src=String(item.previewUrl||"").trim();
  return <div className={`relative overflow-hidden bg-warm-100 border border-navy-900/6 shrink-0 ${compact?"w-14 h-14 rounded-lg":"w-full min-h-56 max-h-[520px] rounded-xl"}`}>
    {src&&!failed?<img src={src} alt={`${item.platform||"Content"} creative preview`} referrerPolicy="no-referrer" loading={compact?"lazy":"eager"} onError={()=>setFailed(true)} className={compact?"w-full h-full object-cover":"w-full max-h-[520px] object-contain"}/>:<div className={`flex flex-col items-center justify-center text-fog-400 ${compact?"w-full h-full":"min-h-56"}`}><ImageIcon size={compact?18:34}/>{!compact&&<p className="text-xs mt-2">Cover pending from {item.platform||"platform"}</p>}</div>}
    {isVideoCreative(item)&&<span className={`absolute flex items-center justify-center rounded-full bg-navy-900/75 text-white ${compact?"right-1 bottom-1 w-5 h-5":"right-3 bottom-3 w-9 h-9"}`}><PlayCircle size={compact?13:22}/></span>}
  </div>;
}
function TabGroup({label,items,value,onChange}:{label:string;items:string[];value:string;onChange:(value:any)=>void}) {
  return <div><p className="text-[10px] uppercase tracking-wide text-fog-400 mb-1.5">{label}</p><div className="flex flex-wrap gap-1.5">{items.map((item)=><button key={item} onClick={()=>onChange(item)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${value===item?"bg-navy-900 text-white":"bg-warm-100 text-fog-600 hover:bg-hospital-mist"}`}>{item}</button>)}</div></div>;
}

export default function CreativeLab() {
  const {month,platform,setPlatform,pillar,format,setFormat,spendType}=useFilters();
  const live=useDecisionLive();
  const [reviewFilter,setReviewFilter]=useState<ReviewFilter>("All");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const allMonthCreative=useMemo(()=>{
    const creative:any[]=(live.data?.data.creative??[]).filter((item:any)=>item.month===month);
    const content:any[]=(live.data?.data.content??[]).filter((item:any)=>item.month===month);
    const video:any[]=(live.data?.data.video??[]).filter((item:any)=>item.month===month);
    const contentIndex=new Map<string,any>(); const videoIndex=new Map<string,any>();
    content.forEach((item)=>itemKeys(item).forEach((key)=>contentIndex.set(key,item)));
    video.forEach((item)=>itemKeys(item).forEach((key)=>videoIndex.set(key,item)));
    const merged=creative.map((item:any)=>{
      const keys=itemKeys(item); const contentMatch=keys.map((key)=>contentIndex.get(key)).find(Boolean)||{}; const videoMatch=keys.map((key)=>videoIndex.get(key)).find(Boolean)||{};
      return {...contentMatch,...videoMatch,...item,previewUrl:item.previewUrl||contentMatch.previewUrl||videoMatch.previewUrl||""};
    });
    return calculatePerformance(merged,live.data?.currentMonth||month);
  },[live.data,month]);
  const creative=useMemo(()=>allMonthCreative.filter((item:any)=>{
    if (platform!=="All"&&item.platform!==platform) return false;
    if (pillar!=="All"&&item.pillar!==pillar) return false;
    if (format!=="All"&&item.format!==format) return false;
    if (spendType!=="All"&&item.spendType!==spendType) return false;
    if (reviewFilter==="Reviewed"&&!hasCreativeReview(item)) return false;
    if (reviewFilter==="Needs Review"&&hasCreativeReview(item)) return false;
    return true;
  }).sort((a:any,b:any)=>(b.performanceScore??-1)-(a.performanceScore??-1)),[allMonthCreative,platform,pillar,format,spendType,reviewFilter]);
  const reviewed=creative.filter(hasCreativeReview);
  const pending=creative.filter((item:any)=>!hasCreativeReview(item));
  const scored=creative.filter((item:any)=>available(item.performanceScore));
  const matrixItems=reviewed.filter((item:any)=>available(item.performanceScore));
  const selected=creative.find((item:any)=>item.id===selectedId)||creative[0];
  const summary=useMemo(()=>{
    const counts=Object.fromEntries(QUADRANTS.map((quadrant)=>[quadrant,0])) as Record<string,number>;
    matrixItems.forEach((item:any)=>counts[item.quadrant]=(counts[item.quadrant]||0)+1);
    return {counts,avgCreative:reviewed.length?Math.round(reviewed.reduce((sum:number,item:any)=>sum+item.creativeScore,0)/reviewed.length):null,avgPerformance:scored.length?Math.round(scored.reduce((sum:number,item:any)=>sum+item.performanceScore,0)/scored.length):null};
  },[reviewed,scored,matrixItems]);
  const platformTabs:(Platform|"All")[]=["All","Facebook","Instagram","TikTok","YouTube"];
  const typeTabs:CreativeType[]=["All","Static Design","Carousel","Reel / Short Video","Long Video"];
  const typeValue:CreativeType=format==="Static post"?"Static Design":format==="Reel"?"Reel / Short Video":format==="Long video"?"Long Video":format==="Carousel"?"Carousel":"All";
  const setType=(value:CreativeType)=>{ const formats:Record<CreativeType,ContentFormat|"All">={All:"All","Static Design":"Static post",Carousel:"Carousel","Reel / Short Video":"Reel","Long Video":"Long video"}; setFormat(formats[value]); };
  if (live.loading&&!live.data) return <EmptyState message="Loading real creative inventory…"/>;
  if (!live.data&&live.error) return <EmptyState message="Real creative data is temporarily unavailable. No demo data is shown."/>;
  const selectedReviewed=selected&&hasCreativeReview(selected);

  return <div className="space-y-8">
    <SectionHeader eyebrow="Creative" title="Creative Lab" description="Performance is calculated automatically from real platform metrics. Creative quality remains a separate human review—no Hook, Design, Script or CTA score is invented." action={<div className="text-right"><span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full ${live.isLive?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>{live.isLive?"LIVE API":live.deliverySource==="snapshot"?"SNAPSHOT":"SOURCE UNAVAILABLE"}</span>{live.data?.generatedAt&&<p className="text-[10px] text-fog-400 mt-1">Updated {live.data.generatedAt}</p>}</div>}/>
    <Card className="space-y-4"><TabGroup label="Platform" items={platformTabs} value={platform} onChange={setPlatform}/><TabGroup label="Creative type" items={typeTabs} value={typeValue} onChange={setType}/><TabGroup label="Review status" items={["All","Needs Review","Reviewed"]} value={reviewFilter} onChange={setReviewFilter}/></Card>
    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{[["Total Content",creative.length,"text-navy-900"],["Auto Scored",scored.length,"text-signal-blue"],["Creative Reviewed",reviewed.length,"text-mint-700"],["Needs Review",pending.length,"text-signal-amber"],["Avg Performance",summary.avgPerformance===null?"N/A":`${summary.avgPerformance}/100`,"text-navy-900"],["Avg Creative",summary.avgCreative===null?"N/A":`${summary.avgCreative}/100`,"text-navy-900"]].map(([label,value,color])=><Card key={label as string}><p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p><p className={`font-display text-2xl mt-1 ${color}`}>{value}</p></Card>)}</section>
    {!creative.length?<EmptyState message="No real creative records for this selection."/>:<section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <Card className="lg:max-h-[820px] overflow-y-auto"><p className="text-xs font-semibold uppercase tracking-wide text-fog-500 mb-1">Creative inventory</p><p className="text-[10px] text-fog-400 mb-3">Ranked by comparable performance · {reviewed.length} reviewed · {pending.length} pending</p><div className="space-y-1.5">{creative.map((item:any)=><button key={item.id} onClick={()=>setSelectedId(item.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selected?.id===item.id?"bg-navy-900 text-warm-50":"hover:bg-warm-100 text-navy-700"}`}><div className="flex items-start gap-3"><CreativeThumbnail key={`${item.id}-${item.previewUrl||"pending"}`} item={item} compact/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 font-medium">{item.name}</p><span className={`text-[9px] px-2 py-.5 rounded-full shrink-0 ${statusClasses(item.analysis.status)}`}>{item.performanceScore??"N/A"}</span></div><p className={`text-xs mt-1 ${selected?.id===item.id?"text-warm-100/70":"text-fog-500"}`}>{item.platform} · {formatGroup(item)} · {item.analysis.status}</p><p className={`text-[10px] mt-1 ${selected?.id===item.id?"text-warm-100/50":"text-fog-400"}`}>{hasCreativeReview(item)?`Creative ${item.creativeScore}/100`:"Creative review pending"}{item.live?" · LIVE MTD":""}</p></div></div></button>)}</div></Card>
      {selected&&<Card><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3"><div><p className="text-fog-500 text-xs">{selected.platform} · {selected.pillar} · {formatGroup(selected)}{selected.live?" · LIVE MTD":""}</p><h3 className="font-display text-xl text-navy-900 max-w-2xl mt-1">{selected.name}</h3><div className="flex flex-wrap items-center gap-2 mt-2"><span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusClasses(selected.analysis.status)}`}>{selected.analysis.status}</span>{selectedReviewed?<span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${quadrantClasses[selected.quadrant]}`}>{selected.quadrant}</span>:<span className="text-[10px] px-2.5 py-1 rounded-full bg-signal-amber/15 text-signal-amber">Creative Review Pending</span>}{selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-signal-blue hover:underline">Open post <ExternalLink size={11}/></a>}</div></div><div className="flex gap-5 shrink-0"><div className="text-right"><p className="font-display text-3xl text-mint-700">{selectedReviewed?selected.creativeScore:"N/A"}</p><p className="text-fog-500 text-[11px]">Creative /100</p></div><div className="text-right"><p className="font-display text-3xl text-navy-900">{selected.performanceScore??"N/A"}</p><p className="text-fog-500 text-[11px]">Performance /100</p></div></div></div>
        <CreativeThumbnail key={`${selected.id}-${selected.previewUrl||"pending"}`} item={selected}/>
        <div className="mt-4 rounded-xl border border-navy-900/6 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold">Automatic performance index</p><p className="text-sm text-navy-800 mt-1">{selected.analysis.reason}</p></div><span className="text-[10px] px-2.5 py-1 rounded-full bg-warm-100 text-fog-600">{selected.analysis.confidence} confidence · {selected.analysis.peerCount} peers</span></div>{selected.analysis.components.length>0?<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">{selected.analysis.components.map((component:ScoreComponent)=><div key={component.label} className="rounded-xl bg-warm-100 p-3"><div className="flex justify-between gap-2 text-xs"><span className="text-fog-500">{component.label}</span><span className="font-semibold text-navy-900">{component.score}</span></div><div className="h-1.5 rounded-full bg-white mt-2 overflow-hidden"><div className="h-full bg-mint-500 rounded-full" style={{width:`${component.score}%`}}/></div><p className="text-[9px] text-fog-400 mt-1">Weight {component.weight}%</p></div>)}</div>:<p className="text-xs text-fog-500 mt-3">N/A until at least two comparable performance metrics are available.</p>}<p className="text-[9px] text-fog-400 mt-2">Compared only with {selected.platform} {formatGroup(selected)} content in {month}. Missing metrics are excluded and weights are redistributed.</p></div>
        {!selectedReviewed?<div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-4 mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-signal-amber">Creative review pending</p><p className="text-sm text-navy-800 mt-2 leading-relaxed">Performance can be measured automatically, but creative quality needs a human review. Hook, Design, Script, Editing and CTA remain N/A until that review is completed.</p>{selected.previewStatus&&<p className="text-[10px] text-fog-500 mt-2">Preview: {selected.previewStatus}</p>}</div>:<><CreativeRadar scores={selected.scores as any}/><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4"><div className="rounded-xl bg-mint-100 p-3"><div className="flex items-center gap-1.5 text-mint-700 text-[11px] font-semibold uppercase mb-1"><TrendingUp size={13}/> Strength</div><p className="text-sm text-navy-900">{selected.mainStrength}</p></div><div className="rounded-xl bg-signal-coral/10 p-3"><div className="flex items-center gap-1.5 text-signal-coral text-[11px] font-semibold uppercase mb-1"><TrendingDown size={13}/> Problem</div><p className="text-sm text-navy-900">{selected.mainWeakness}</p></div><div className="rounded-xl bg-navy-900 p-3"><div className="flex items-center gap-1.5 text-signal-amber text-[11px] font-semibold uppercase mb-1"><Lightbulb size={13}/> Recommended change</div><p className="text-sm text-warm-50">{selected.recommendedImprovement}</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><div className="rounded-xl border border-navy-900/8 bg-warm-100 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-fog-500 font-semibold"><Search size={13}/> Evidence</div><p className="text-sm text-navy-800 mt-2 leading-relaxed">{selected.evidence}</p></div><div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-4"><p className="text-[10px] uppercase tracking-wide text-signal-amber font-semibold">Working hypothesis</p><p className="text-sm text-navy-800 mt-2 leading-relaxed">{selected.hypothesis||"No separate hypothesis recorded."}</p></div></div><div className="rounded-xl border border-signal-blue/20 bg-signal-blue/5 p-4 mt-3"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-signal-blue font-semibold"><FlaskConical size={13}/> Next test</div><p className="text-sm font-medium text-navy-900 mt-2">{selected.nextTest}</p></div><div className="mt-4 pt-3 border-t border-navy-900/6 text-[10px] text-fog-500 flex flex-col sm:flex-row gap-2 sm:justify-between"><span>{selected.observation}</span><span className="sm:text-right">Review: {selected.reviewer} · {selected.reviewDate}{selected.reviewBasis?` · ${selected.reviewBasis}`:""}</span></div></>}
      </Card>}
    </section>}
    <section><SectionHeader eyebrow="Matrix" title="Creative × Performance" description="Only content with both a human Creative Score and a measurable Performance Score enters this matrix. Everything else stays visible above without invented ratings."/>{matrixItems.length?<><section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">{QUADRANTS.map((quadrant)=><Card key={quadrant}><span className={`inline-flex text-[9px] leading-tight px-2 py-1 rounded-full ${quadrantClasses[quadrant]}`}>{quadrant}</span><p className="font-display text-2xl text-navy-900 mt-2">{summary.counts[quadrant]}</p></Card>)}</section><Card><PerformanceMatrix items={matrixItems as any}/></Card></>:<EmptyState message="No items currently have both creative review and measurable performance."/>}</section>
  </div>;
}

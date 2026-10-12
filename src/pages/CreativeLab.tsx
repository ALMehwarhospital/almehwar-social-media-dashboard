import { useMemo, useState } from "react";
import { ExternalLink, ImageIcon, PlayCircle } from "lucide-react";
import { SearchableList } from "../components/content/SearchableList";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import { useDecisionLive } from "../utils/useDecisionLive";
import { useFilters } from "../utils/FilterContext";
import { calculatePerformance, formatGroup, isVideoCreative, itemKeys } from "../utils/creativePerformance";
import { directionReview, type CreativeDirection } from "../utils/creativeDirection";
import { formatNumber, formatPercent } from "../utils/format";

const REVIEW_SHEET="https://docs.google.com/spreadsheets/d/1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8/edit#gid=866016218";
const directionLabel=(direction:CreativeDirection)=>direction==="Unassigned"?"Set direction":`${direction} direction`;
const mean=(values:any[])=>{const numbers=values.filter(v=>typeof v==="number"&&Number.isFinite(v));return numbers.length?Math.round(numbers.reduce((sum,v)=>sum+v,0)/numbers.length):null;};
function Score({label,value,pending="Pending"}:{label:string;value:number|null;pending?:string}) {
  return <div className="rounded-xl bg-warm-100 px-4 py-3"><p className="text-[10px] text-fog-500 uppercase tracking-wide">{label}</p><p className="font-display text-2xl text-navy-900 mt-1">{value===null?<span className="text-sm text-fog-400">{pending}</span>:<>{value}<span className="text-xs text-fog-400 ml-1">/100</span></>}</p></div>;
}
function CreativeThumbnail({item,compact=false}:{item:any;compact?:boolean}) {
  const [failed,setFailed]=useState(false);
  const src=String(item.previewUrl||"").trim();
  return <div className={`relative bg-warm-100 overflow-hidden ${compact?"w-14 h-14 rounded-lg shrink-0":"rounded-xl min-h-56 flex items-center justify-center"}`}>
    {src&&!failed?<img src={src} alt={`${item.platform} content preview`} loading={compact?"lazy":"eager"} referrerPolicy="no-referrer" onError={()=>setFailed(true)} className={compact?"w-full h-full object-cover":"w-full max-h-[560px] object-contain"}/>:<div className="flex flex-col items-center justify-center p-5 text-fog-400"><ImageIcon size={compact?18:32}/>{!compact&&<span className="text-xs mt-2">Preview unavailable</span>}</div>}
    {isVideoCreative(item)&&<PlayCircle className="absolute bottom-2 right-2 text-white bg-navy-900/75 rounded-full" size={compact?18:28}/>}
  </div>;
}
function Comparison({items}:{items:any[]}) {
  const groups=new Map<string,any[]>();
  for(const item of items) {
    if(!item.analysis.mature||item.performanceScore===null||!["Old","New"].includes(item.directionReview.direction)) continue;
    // Include coverage so missing watch metrics cannot alter the comparison weights.
    const coverage=item.analysis.components.map((c:any)=>c.label).join("/");
    const key=[item.platform,formatGroup(item),item.spendType||"Total / Unsplit",coverage].join("|");
    groups.set(key,[...(groups.get(key)||[]),item]);
  }
  const comparable=[...groups.entries()].filter(([,rows])=>rows.some(i=>i.directionReview.direction==="Old")&&rows.some(i=>i.directionReview.direction==="New"));
  if(!comparable.length) return <p className="text-xs text-fog-400 py-2">Comparison pending: classified Old + New content, same platform / format / spend, 7+ days.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-fog-400 text-left"><th className="py-2">Comparable content</th><th>Old n</th><th>New n</th><th>Old performance</th><th>New performance</th><th>Δ points</th></tr></thead><tbody>{comparable.map(([key,rows])=>{
    const old=rows.filter(i=>i.directionReview.direction==="Old"),fresh=rows.filter(i=>i.directionReview.direction==="New");
    const a=mean(old.map(i=>i.performanceScore)),b=mean(fresh.map(i=>i.performanceScore));
    return <tr key={key} className="border-t border-navy-900/6"><td className="py-3">{key.split("|").slice(0,3).join(" · ")}</td><td>{old.length}</td><td>{fresh.length}</td><td>{a}/100</td><td>{b}/100</td><td>{a!==null&&b!==null?`${b-a>0?"+":""}${b-a}`:"—"}</td></tr>;
  })}</tbody></table></div>;
}
export default function CreativeLab() {
  const {month,platform,pillar,format,spendType}=useFilters();
  const live=useDecisionLive();
  const [direction,setDirection]=useState<"All"|CreativeDirection>("All");
  const [selectedKey,setSelectedKey]=useState<string|null>(null);
  const all=useMemo(()=>{
    const content=(live.data?.data.content??[]).filter(i=>i.month===month);
    const video=(live.data?.data.video??[]).filter(i=>i.month===month);
    const index=new Map<string,any>();
    content.forEach(i=>itemKeys(i).forEach(k=>index.set(k,i)));
    const videoIndex=new Map<string,any>();video.forEach(i=>itemKeys(i).forEach(k=>videoIndex.set(k,i)));
    const merged=(live.data?.data.creative??[]).filter(i=>i.month===month).map(item=>{
      const keys=itemKeys(item),post=keys.map(k=>index.get(k)).find(Boolean)||{},clip=keys.map(k=>videoIndex.get(k)).find(Boolean)||{};
      const result={...clip,...item,...post, id:item.id, scores:item.scores, creativeScore:item.creativeScore, reviewStatus:item.reviewStatus,
        reviewer:item.reviewer,reviewDate:item.reviewDate,reviewBasis:item.reviewBasis,
        previewUrl:item.previewUrl||post.previewUrl||clip.previewUrl||"",spendType:post.spendType||clip.spendType||item.spendType};
      return {...result,directionReview:directionReview(result)};
    });
    return calculatePerformance(merged,live.data?.currentMonth||month);
  },[live.data,month]);
  const filtered=useMemo(()=>all.filter(i=>(platform==="All"||i.platform===platform)&&(pillar==="All"||i.pillar===pillar)&&(format==="All"||i.format===format)&&(spendType==="All"||i.spendType===spendType)),[all,platform,pillar,format,spendType]);
  const items=filtered.filter(i=>direction==="All"||i.directionReview.direction===direction).sort((a,b)=>(b.performanceScore??-1)-(a.performanceScore??-1));
  const selected=items.find(i=>`${month}|${i.id}`===selectedKey)||items[0];
  if(live.loading&&!live.data) return <EmptyState message="Loading creative inventory…"/>;
  if(!live.data) return <EmptyState message="Creative data is temporarily unavailable."/>;
  const stats=selected?[{label:"Views",value:selected.views},{label:"Interactions",value:selected.interactions},{label:"Shares",value:selected.shares},{label:"Saves",value:selected.saves},{label:"Engagement",value:selected.engagementRate,percent:true},{label:"Avg watch",value:selected.avgWatchTimeSeconds,seconds:true}].filter(s=>typeof s.value==="number"&&Number.isFinite(s.value)):[];
  return <div className="space-y-5">
    <SectionHeader eyebrow="Creative" title="Creative Lab" action={<a href={REVIEW_SHEET} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-signal-blue">Review in Sheet <ExternalLink size={12}/></a>}/>
    <Card className="p-3"><img src={`${import.meta.env.BASE_URL}images/creative-direction-summary.svg`} alt="Old: medical information, expert presentation, clear templates. New: medical stories, human care, visual proof and premium experience. New direction criteria weights: Hook 20%, Story 15%, Human care 15%, Visual proof 15%, Experience 15%, Brand 10%, Platform fit 10%." className="w-full rounded-xl"/></Card>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-fog-500">{items.length} content · {items.filter(i=>i.directionReview.reviewed).length} reviewed</p><label className="flex items-center gap-2 text-xs text-fog-500">Direction<select aria-label="Creative direction" value={direction} onChange={e=>setDirection(e.target.value as "All"|CreativeDirection)} className="rounded-lg border border-navy-900/10 px-3 py-2 bg-white text-navy-900">{["All","Old","New","Transition","Unassigned"].map(d=><option key={d} value={d}>{d==="All"?"All directions":directionLabel(d as CreativeDirection)}</option>)}</select></label></div>
    {!items.length?<EmptyState message="No creative content for this selection."/>:<section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      <Card className="p-3 lg:max-h-[940px] overflow-y-auto"><SearchableList key={[month,platform,pillar,format,spendType,direction].join("|")} items={items} label="Search creatives" renderItems={rows=><div className="space-y-2">{rows.map((item:any)=><button key={item.id} onClick={()=>setSelectedKey(`${month}|${item.id}`)} className={`w-full text-left p-2 rounded-xl ${selected?.id===item.id?"bg-navy-900 text-white":"hover:bg-warm-100 text-navy-900"}`}><div className="flex gap-3"><CreativeThumbnail key={`${item.id}|${item.previewUrl}`} item={item} compact/><div className="min-w-0"><p className="text-xs font-semibold line-clamp-2">{item.name}</p><p className="text-[10px] opacity-60 mt-1">{item.platform} · {directionLabel(item.directionReview.direction)}</p><p className="text-[10px] mt-1">Creative {item.directionReview.score??"—"} · Performance {item.performanceScore??"—"}</p></div></div></button>)}</div>}/></Card>
      {selected&&<Card className="space-y-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-xs text-fog-500">{selected.platform} · {formatGroup(selected)} · {directionLabel(selected.directionReview.direction)}</p><h3 className="text-base font-semibold text-navy-900 mt-1 line-clamp-2" title={selected.name}>{selected.name}</h3></div>{selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" aria-label="Open selected content" className="text-signal-blue shrink-0"><ExternalLink size={17}/></a>}</div>
        <CreativeThumbnail key={`${selected.id}|${selected.previewUrl}`} item={selected}/>
        <div className="grid grid-cols-2 gap-3"><Score label="Direction execution" value={selected.directionReview.score}/><Score label={`Performance${selected.analysis.mature?"":" · provisional"}`} value={selected.performanceScore} pending="More data"/></div>
        <div className="rounded-xl border border-navy-900/6 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-navy-900">Performance calculation</p><span className="text-[10px] text-fog-500">{month} · {selected.platform} · {formatGroup(selected)} · {selected.spendType || "Total / Unsplit"}</span></div>
          {selected.analysis.components.length>0&&<div className="overflow-x-auto"><table className="w-full text-[11px] text-left"><thead className="text-fog-400"><tr><th className="py-2 pr-3">Metric</th><th className="pr-3">Actual</th><th className="pr-3">Relative score</th><th className="pr-3">Weight</th><th>Points</th></tr></thead><tbody>{selected.analysis.components.map((c:any)=><tr key={c.label} className="border-t border-navy-900/6"><td className="py-2 pr-3"><span className="font-semibold text-navy-900">{c.label}</span><span className="block text-[9px] text-fog-500 mt-0.5">{c.basis}</span></td><td className="pr-3 whitespace-nowrap">{c.label==="Distribution"?formatNumber(c.value):formatPercent(c.value)}</td><td className="pr-3 whitespace-nowrap" title={`Relative rank among ${c.comparisonCount} items with this metric`}>{c.score}/100 · n={c.comparisonCount}</td><td className="pr-3">{Math.round(c.effectiveWeight*10)/10}%</td><td>{Math.round(c.points*10)/10}</td></tr>)}</tbody></table></div>}
          <p className="text-[10px] text-fog-500">{selected.performanceScore===null?"Requires 2 metrics and 3 comparable items per metric.":`Score = sum of weighted points, rounded → ${selected.performanceScore}/100.`}</p>
          <p className="text-[9px] text-fog-400">Relative rank, not an absolute success rate. Missing metrics are excluded and weights recalculated.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{selected.directionReview.components.map((c:any)=><div key={c.key} className="rounded-lg border border-navy-900/6 p-2.5"><div className="flex justify-between gap-2 text-[10px]"><span className="text-fog-500">{c.label}</span><span className="font-semibold text-navy-900">{c.score??"—"}</span></div><div className="bg-warm-100 h-1 rounded-full mt-2"><div className="bg-mint-500 h-1 rounded-full" style={{width:`${c.score??0}%`}}/></div></div>)}</div>
        {stats.length>0&&<div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-navy-900/6 pt-3">{stats.map(s=><div key={s.label}><p className="text-[9px] text-fog-400">{s.label}</p><p className="text-xs font-semibold text-navy-900">{s.percent?formatPercent(s.value):s.seconds?`${Math.round(s.value*10)/10}s`:formatNumber(s.value)}</p></div>)}</div>}
        <p className="text-[10px] text-fog-400" title="Relative weighted percentile, compared within the same month, platform, format and spend type. Missing metrics are excluded; at least three comparable items and two metrics are required.">{selected.analysis.peerCount} peers · {selected.analysis.components.length} metrics{selected.directionReview.reviewed?` · ${selected.reviewer}`:" · Review pending"}</p>
      </Card>}
    </section>}
    {month>="2026-10"&&<Card><p className="text-sm font-semibold text-navy-900 mb-2">Old × New · Performance /100</p><Comparison items={filtered}/></Card>}
  </div>;
}

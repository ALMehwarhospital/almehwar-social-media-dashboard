import { useMemo, useState } from "react";
import { ExternalLink, ImageIcon, PlayCircle } from "lucide-react";
import { SearchableList } from "../components/content/SearchableList";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import { useDecisionLive } from "../utils/useDecisionLive";
import { useFilters } from "../utils/FilterContext";
import { formatGroup, isVideoCreative, itemKeys } from "../utils/creativeInventory";
import { directionReview, type CreativeDirection } from "../utils/creativeDirection";
import { reportedMetrics, metricDisplay, comparableMetricGroups } from "../utils/creativeMetrics";
import { NEW_CRITERIA } from "../utils/creativeDirection";

const REVIEW_SHEET="https://docs.google.com/spreadsheets/d/1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8/edit#gid=866016218";
const directionLabel=(direction:CreativeDirection)=>direction==="Unassigned"?"Set direction":`${direction} direction`;

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
  const groups=comparableMetricGroups(items);
  if(!groups.length)return <p className="text-xs text-fog-500 py-2">Comparison pending: source must record equal measurement windows and confirmed Organic / Paid split. Cumulative snapshots are not a fair baseline.</p>;
  return <div className="space-y-4">{groups.map(group=><div key={group.key}><p className="text-xs text-fog-500 mb-2">{group.key.split("|").join(" · ")} · Old n={group.oldCount} · New n={group.newCount}</p><div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr className="text-fog-400"><th className="py-2">Metric · mean per item</th><th>Old</th><th>New</th></tr></thead><tbody>{group.metrics.map(m=><tr key={m.key} className="border-t border-navy-900/6"><td className="py-2">{m.label}</td><td>{metricDisplay({...m,value:m.oldValue})}</td><td>{metricDisplay({...m,value:m.newValue})}</td></tr>)}</tbody></table></div></div>)}</div>;
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
    return merged;
  },[live.data,month]);
  const filtered=useMemo(()=>all.filter(i=>(platform==="All"||i.platform===platform)&&(pillar==="All"||i.pillar===pillar)&&(format==="All"||i.format===format)&&(spendType==="All"||i.spendType===spendType)),[all,platform,pillar,format,spendType]);
  const items=filtered.filter(i=>direction==="All"||i.directionReview.direction===direction).sort((a,b)=>(b.views??-1)-(a.views??-1));
  const selected=items.find(i=>`${month}|${i.id}`===selectedKey)||items[0];
  if(live.loading&&!live.data) return <EmptyState message="Loading creative inventory…"/>;
  if(!live.data) return <EmptyState message="Creative data is temporarily unavailable."/>;
  const metrics=selected?reportedMetrics(selected):[];
  return <div className="space-y-5">
    <SectionHeader eyebrow="Creative" title="Creative Lab" action={<a href={REVIEW_SHEET} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-signal-blue">Review in Sheet <ExternalLink size={12}/></a>}/>
    <Card className="p-3"><img src={`${import.meta.env.BASE_URL}images/creative-direction-summary.svg`} alt="Old: medical information, expert presentation, clear templates. New: medical stories, human care, visual proof and premium experience. Seven equally weighted internal creative criteria. Full content review and supporting evidence are required." className="w-full rounded-xl"/></Card>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-fog-500">{items.length} content · {items.filter(i=>i.directionReview.reviewed).length} reviewed</p><label className="flex items-center gap-2 text-xs text-fog-500">Direction<select aria-label="Creative direction" value={direction} onChange={e=>setDirection(e.target.value as "All"|CreativeDirection)} className="rounded-lg border border-navy-900/10 px-3 py-2 bg-white text-navy-900">{["All","Old","New","Transition","Unassigned"].map(d=><option key={d} value={d}>{d==="All"?"All directions":directionLabel(d as CreativeDirection)}</option>)}</select></label></div>
    {!items.length?<EmptyState message="No creative content for this selection."/>:<section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
      <Card className="p-3 lg:max-h-[940px] overflow-y-auto"><SearchableList key={[month,platform,pillar,format,spendType,direction].join("|")} items={items} label="Search creatives" renderItems={rows=><div className="space-y-2">{rows.map((item:any)=><button key={item.id} onClick={()=>setSelectedKey(`${month}|${item.id}`)} className={`w-full text-left p-2 rounded-xl ${selected?.id===item.id?"bg-navy-900 text-white":"hover:bg-warm-100 text-navy-900"}`}><div className="flex gap-3"><CreativeThumbnail key={`${item.id}|${item.previewUrl}`} item={item} compact/><div className="min-w-0"><p className="text-xs font-semibold line-clamp-2">{item.name}</p><p className="text-[10px] opacity-60 mt-1">{item.platform} · {directionLabel(item.directionReview.direction)}</p><p className="text-[10px] mt-1">Creative {item.directionReview.score??"Pending"} · Views {typeof item.views==="number"?new Intl.NumberFormat("en-US").format(item.views):"—"}</p></div></div></button>)}</div>}/></Card>
      {selected&&<Card className="space-y-4"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-xs text-fog-500">{selected.platform} · {formatGroup(selected)} · {directionLabel(selected.directionReview.direction)}</p><h3 className="text-base font-semibold text-navy-900 mt-1 line-clamp-2" title={selected.name}>{selected.name}</h3></div>{selected.url&&<a href={selected.url} target="_blank" rel="noreferrer" aria-label="Open selected content" className="text-signal-blue shrink-0"><ExternalLink size={17}/></a>}</div>
        <CreativeThumbnail key={`${selected.id}|${selected.previewUrl}`} item={selected}/>
        <Score label="Creative execution · internal rubric" value={selected.directionReview.score}/>
        <p className="text-[10px] text-fog-500">{selected.directionReview.reference} · {selected.directionReview.reviewType}{selected.directionReview.reviewed?` · ${selected.reviewer}`:""}</p>
        {selected.directionReview.archivedScore!==null&&!selected.directionReview.reviewed&&<p className="text-[10px] text-fog-400">Archived source rating: {selected.directionReview.archivedScore}/100 · requires a full-content verification.</p>}
        <div className="rounded-xl border border-navy-900/6 p-3 space-y-2">
          <p className="text-xs font-semibold text-navy-900">Reported performance · no composite score</p>
          <div className="overflow-x-auto"><table className="w-full text-[11px] text-left"><thead className="text-fog-400"><tr><th className="py-2 pr-3">Metric</th><th className="pr-3">Actual</th><th>Definition / basis</th></tr></thead><tbody>{metrics.map(m=><tr key={m.key} className="border-t border-navy-900/6"><td className="py-2 pr-3 font-semibold text-navy-900">{m.label}</td><td className="pr-3 whitespace-nowrap">{metricDisplay(m)}</td><td className="text-fog-500">{m.basis}</td></tr>)}</tbody></table></div>
          <p className="text-[9px] text-fog-400">{selected.source||"Platform source"} · {selected.platform==="YouTube"?"Reporting-period figures":"Cumulative figures; content age affects counts"} · {selected.spendType||"Total / Unsplit"}</p>
          <details className="text-[10px] text-fog-500"><summary className="cursor-pointer">Metric references</summary><div className="flex flex-wrap gap-3 mt-2"><a href={REVIEW_SHEET} target="_blank" rel="noreferrer" className="text-signal-blue">Source Sheet</a><a href="https://developers.google.com/youtube/analytics/metrics" target="_blank" rel="noreferrer" className="text-signal-blue">YouTube definitions</a><a href="https://developers.facebook.com/docs/graph-api/reference/insights/" target="_blank" rel="noreferrer" className="text-signal-blue">Meta definitions</a></div></details>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{selected.directionReview.components.map((c:any)=><div key={c.key} className="rounded-lg border border-navy-900/6 p-2.5"><div className="flex justify-between gap-2 text-[10px]"><span className="text-fog-500">{c.label}</span><span className="font-semibold text-navy-900">{c.score??"—"}</span></div><p className="text-[9px] text-fog-400 mt-1">Weight {Math.round(c.weight*100)/100}%</p><div className="bg-warm-100 h-1 rounded-full mt-2"><div className="bg-mint-500 h-1 rounded-full" style={{width:`${c.score??0}%`}}/></div></div>)}</div>
        <details className="text-xs text-fog-500"><summary className="cursor-pointer">Creative rubric / reference</summary>
          <p className="text-[10px] mt-2">Internal review rubric; not a platform benchmark. Review the full content, record evidence, and mark verification in the Sheet.</p>
          {selected.directionReview.direction==="New"||selected.directionReview.direction==="Transition"?<div className="mt-3 overflow-x-auto"><table className="min-w-[700px] w-full text-[10px] text-left"><thead><tr><th>Criterion</th>{[0,25,50,75,100].map(n=><th key={n}>{n}</th>)}</tr></thead><tbody>{NEW_CRITERIA.map(c=><tr key={c.key} className="border-t border-navy-900/6 align-top"><td className="py-2 pr-2 font-semibold">{c.label}</td>{c.anchors.map((label,i)=><td key={i} className="p-2">{label}</td>)}</tr>)}</tbody></table></div>:<p className="mt-2 text-[10px]">Original 1–5 criteria and weights apply. Non-applicable CTA is excluded; editing applies only to videos.</p>}
          <a href="https://docs.google.com/spreadsheets/d/1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8/edit#gid=2012328121" target="_blank" rel="noreferrer" className="inline-block mt-2 text-signal-blue">Internal scoring guide</a>
        </details>
      </Card>}
    </section>}
    {month>="2026-10"&&<Card><p className="text-sm font-semibold text-navy-900 mb-2">Old × New · Reported metrics</p><Comparison items={filtered}/></Card>}
  </div>;
}

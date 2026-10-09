import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Clock, ExternalLink, ImageIcon, PlayCircle, Scale, Trophy } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { formatNumber, formatPercent, formatSeconds } from "../utils/format";

type VideoTab = "overview" | "top" | "lowest" | "retention" | "compare";
type AnalysisComponent = { label:string; score:number; weight:number };
type VideoAnalysisResult = {
  score:number|null;
  confidence:"High"|"Medium"|"Low"|"Insufficient";
  mature:boolean;
  status:"Top Performer"|"Needs Attention"|"Competitive"|"Needs More Data";
  reason:string;
  components:AnalysisComponent[];
  watchQuality:number|null;
  valueActionRate:number|null;
  peerCount:number;
};

function available(value:any) {
  return typeof value === "number" && Number.isFinite(value);
}

function canonicalUrl(value:any) {
  return String(value || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "")
    .replace(/[?#].*$/, "").replace(/\/$/, "");
}

function normalizeVideo(v:any, previewUrl = "") {
  const nested = v.scores || {};
  const diagnosis = typeof v.diagnosis === "string"
    ? v.diagnosis
    : v.diagnosis?.explanation || v.diagnosis?.problem || "";
  return {
    ...v,
    hookScore:v.hookScore ?? nested.hook ?? null,
    scriptScore:v.scriptScore ?? nested.script ?? null,
    editingScore:v.editingScore ?? nested.editing ?? null,
    ctaScore:v.ctaScore ?? nested.cta ?? null,
    overallScore:v.overallScore ?? nested.overall ?? null,
    diagnosisText:diagnosis,
    previewUrl:v.previewUrl || previewUrl || "",
  };
}

function formatGroup(v:any) {
  const raw = String(v.format || "").toLowerCase();
  if (raw.includes("long")) return "Long video";
  if (raw.includes("reel") || raw.includes("short")) return "Short / Reel";
  if (available(v.durationSeconds)) return v.durationSeconds > 90 ? "Long video" : "Short / Reel";
  return "Video";
}

function average(values:any[]) {
  const valid = values.filter(available) as number[];
  return valid.length ? valid.reduce((sum,value)=>sum+value,0)/valid.length : null;
}

function watchQuality(v:any) {
  const durationRatio = available(v.avgWatchTimeSeconds) && available(v.durationSeconds) && v.durationSeconds > 0
    ? Math.min(1,v.avgWatchTimeSeconds/v.durationSeconds)
    : null;
  return average([v.avgPercentWatched,v.completionRate,v.retention25,v.retention50,v.retention75,durationRatio]);
}

function valueActionRate(v:any) {
  if (available(v.valueRate)) return v.valueRate;
  const actions = [v.shares,v.saves].filter(available) as number[];
  if (!actions.length) return null;
  const denominator = v.platform === "Facebook" || v.platform === "Instagram"
    ? (available(v.reach) ? v.reach : v.views)
    : v.views;
  if (!available(denominator) || denominator <= 0) return null;
  return actions.reduce((sum,value)=>sum+value,0)/denominator;
}

function distributionValue(v:any) {
  if (available(v.views)) return v.views;
  if (available(v.impressions)) return v.impressions;
  return available(v.reach) ? v.reach : null;
}

function percentile(values:number[], value:number) {
  if (values.length <= 1) return 0.5;
  const below = values.filter((candidate)=>candidate<value).length;
  const equal = values.filter((candidate)=>candidate===value).length;
  return (below + Math.max(0,equal-1)/2)/(values.length-1);
}

function lowerQuartile(values:number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.floor((sorted.length-1)*0.25)];
}

function scoreVideos(videos:any[], currentMonth:string) {
  const groups = new Map<string,any[]>();
  for (const video of videos) {
    const key = `${video.platform}|${formatGroup(video)}`;
    groups.set(key,[...(groups.get(key) || []),video]);
  }

  return videos.map((video:any) => {
    const peers = groups.get(`${video.platform}|${formatGroup(video)}`) || [video];
    const rawComponents = [
      {label:"Viewing quality",weight:35,value:watchQuality(video),read:(peer:any)=>watchQuality(peer)},
      {label:"Engagement",weight:30,value:video.engagementRate,read:(peer:any)=>peer.engagementRate},
      {label:"Shares & saves",weight:20,value:valueActionRate(video),read:(peer:any)=>valueActionRate(peer)},
      {label:"Distribution",weight:15,value:distributionValue(video),read:(peer:any)=>distributionValue(peer)},
    ];
    const components:AnalysisComponent[] = rawComponents.flatMap((component)=>{
      if (!available(component.value)) return [];
      const peerValues = peers.map(component.read).filter(available) as number[];
      if (!peerValues.length) return [];
      return [{label:component.label,weight:component.weight,score:Math.round(percentile(peerValues,component.value as number)*100)}];
    });
    const weightTotal = components.reduce((sum,component)=>sum+component.weight,0);
    const score = components.length >= 2 && weightTotal > 0
      ? Math.round(components.reduce((sum,component)=>sum+component.score*component.weight,0)/weightTotal)
      : null;
    const peerDistribution = peers.map(distributionValue).filter(available) as number[];
    const maturityThreshold = Math.max(50,lowerQuartile(peerDistribution));
    const distribution = distributionValue(video);
    const mature = video.month !== currentMonth || (available(distribution) && distribution >= maturityThreshold);
    const confidence:VideoAnalysisResult["confidence"] = score === null ? "Insufficient"
      : components.length >= 3 && peers.length >= 5 ? "High"
        : components.length >= 2 && peers.length >= 3 ? "Medium" : "Low";
    const status:VideoAnalysisResult["status"] = !mature || score === null ? "Needs More Data"
      : score >= 70 ? "Top Performer" : score < 40 ? "Needs Attention" : "Competitive";
    const strongest = components.length ? [...components].sort((a,b)=>b.score-a.score)[0] : null;
    const weakest = components.length ? [...components].sort((a,b)=>a.score-b.score)[0] : null;
    const reason = status === "Needs More Data"
      ? score === null ? "Not enough comparable metrics yet." : "Performance is still maturing."
      : status === "Top Performer" ? `Strongest signal: ${strongest?.label || "overall performance"}.`
        : status === "Needs Attention" ? `Main gap: ${weakest?.label || "overall performance"}.`
          : `Competitive result; strongest in ${strongest?.label || "available metrics"}.`;
    const analysis:VideoAnalysisResult = {
      score,confidence,mature,status,reason,components,
      watchQuality:watchQuality(video),valueActionRate:valueActionRate(video),peerCount:peers.length,
    };
    return {...video,analysis};
  });
}

function statusClasses(status:VideoAnalysisResult["status"]) {
  if (status === "Top Performer") return "bg-mint-100 text-mint-700";
  if (status === "Needs Attention") return "bg-signal-coral/10 text-signal-coral";
  if (status === "Needs More Data") return "bg-signal-amber/15 text-signal-amber";
  return "bg-signal-blue/10 text-signal-blue";
}

function VideoThumbnail({item,compact=false}:{item:any;compact?:boolean}) {
  const [failed,setFailed] = useState(false);
  const src = String(item.previewUrl || "").trim();
  return <div className={`relative overflow-hidden bg-warm-100 border border-navy-900/6 shrink-0 ${compact?"w-16 h-16 rounded-xl":"w-full h-44 rounded-xl"}`}>
    {src && !failed ? <img src={src} alt={`${item.platform || "Video"} cover`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className="w-full h-full object-cover"/>
      : <div className="w-full h-full flex items-center justify-center text-fog-300"><ImageIcon size={compact?20:34}/></div>}
    <span className={`absolute flex items-center justify-center rounded-full bg-navy-900/75 text-white ${compact?"right-1.5 bottom-1.5 w-6 h-6":"right-3 bottom-3 w-9 h-9"}`}><PlayCircle size={compact?14:22}/></span>
  </div>;
}

function RankedVideoCard({video,rank,onSelect}:{video:any;rank:number;onSelect:(id:string)=>void}) {
  return <div className="w-full rounded-2xl border border-navy-900/6 bg-white p-3 shadow-card hover:border-signal-blue/25 transition-colors">
    <button onClick={()=>onSelect(video.id)} className="w-full text-left"><div className="flex gap-3"><div className="relative"><VideoThumbnail item={video} compact/><span className="absolute -left-2 -top-2 w-7 h-7 rounded-full bg-navy-900 text-white text-xs font-semibold flex items-center justify-center">{rank}</span></div>
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-navy-900 line-clamp-2">{video.name}</p><span className="font-display text-xl text-navy-900 shrink-0">{video.analysis.score ?? "N/A"}</span></div>
        <p className="text-[10px] text-fog-500 mt-1">{video.platform} · {formatGroup(video)} · {formatNumber(video.views)} views</p><p className="text-[10px] text-fog-400 mt-1 line-clamp-1">{video.analysis.reason}</p></div>
    </div></button>
    {video.url&&<a href={video.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-signal-blue mt-2 ml-[76px] hover:underline">Open video <ExternalLink size={11}/></a>}
  </div>;
}

function VideoDetail({selected}:{selected:any}) {
  const scoreEntries = [["Hook",selected.hookScore],["Script",selected.scriptScore],["Editing",selected.editingScore],["CTA",selected.ctaScore]];
  const hasScores = scoreEntries.some(([,value])=>available(value)) || available(selected.overallScore);
  const hasRetention = [selected.retention25,selected.retention50,selected.retention75].some(available);
  return <Card>
    <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-5"><VideoThumbnail item={selected}/><div><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div><div className="flex flex-wrap items-center gap-2"><span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusClasses(selected.analysis.status)}`}>{selected.analysis.status}</span><span className="text-[10px] px-2.5 py-1 rounded-full bg-warm-100 text-fog-600">{selected.analysis.confidence} confidence</span></div>
        <p className="text-xs text-fog-500 mt-2">{selected.platform} · {formatSeconds(selected.durationSeconds)} · {selected.live?"LIVE MTD":selected.month}</p><h3 className="font-display text-xl text-navy-900 mt-1">{selected.name}</h3><p className="text-[11px] text-fog-400 mt-1">{selected.spendType || "Total / Unsplit"} · {selected.pillar || "Other"} · {selected.format || "Video"}</p>
        {selected.url && <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-signal-blue font-semibold mt-2 hover:underline">Open content <ExternalLink size={12}/></a>}</div>
      <div className="flex gap-5 shrink-0"><div className="text-right"><p className="font-display text-3xl text-mint-700">{selected.analysis.score ?? "N/A"}</p><p className="text-xs text-fog-500">Performance /100</p></div><div className="text-right"><p className="font-display text-3xl text-navy-900">{available(selected.overallScore)?selected.overallScore:"N/A"}</p><p className="text-xs text-fog-500">Reviewed /5</p></div></div>
    </div></div></div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">{[["Avg Watch",formatSeconds(selected.avgWatchTimeSeconds)],["Avg Viewed",formatPercent(selected.avgPercentWatched)],["Completion",formatPercent(selected.completionRate)],["Engagement",formatPercent(selected.engagementRate)]].map(([label,value])=><div className="bg-warm-100 rounded-xl p-3" key={label}><p className="text-xs text-fog-500">{label}</p><p className="font-display text-xl mt-1">{value}</p></div>)}</div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">{[["Views",formatNumber(selected.views)],["Reach",formatNumber(selected.reach)],["Impressions",formatNumber(selected.impressions)],["Interactions",formatNumber(selected.interactions)],["Shares",formatNumber(selected.shares)],["Saves",formatNumber(selected.saves)],["Followers",selected.followersGained==null?"N/A":`+${formatNumber(selected.followersGained)}`],["Denominator",selected.engagementDenominator || "N/A"]].map(([label,value])=><div className="border border-navy-900/6 rounded-xl p-3" key={label}><p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p><p className="text-sm font-medium text-navy-900 mt-1">{value}</p></div>)}</div>

    {selected.analysis.components.length>0 && <div className="mt-5"><p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold mb-2">Performance index breakdown</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{selected.analysis.components.map((component:AnalysisComponent)=><div key={component.label} className="rounded-xl border border-navy-900/6 p-3"><div className="flex justify-between gap-2 text-xs"><span className="text-fog-500">{component.label}</span><span className="font-semibold text-navy-900">{component.score}</span></div><div className="h-1.5 rounded-full bg-warm-100 mt-2 overflow-hidden"><div className="h-full bg-mint-500 rounded-full" style={{width:`${component.score}%`}}/></div><p className="text-[9px] text-fog-400 mt-1">Weight {component.weight}%</p></div>)}</div><p className="text-[10px] text-fog-400 mt-2">Compared with {selected.analysis.peerCount} {selected.platform} {formatGroup(selected)} videos in this month. Missing metrics are excluded and weights are redistributed.</p></div>}
    {hasRetention && <div className="mt-5"><p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold mb-2">Retention checkpoints</p><div className="grid grid-cols-3 gap-3">{[["25%",selected.retention25],["50%",selected.retention50],["75%",selected.retention75]].map(([label,value])=><div key={label as string} className="rounded-xl bg-hospital-mist/55 p-3 text-center"><p className="text-xs text-fog-500">{label}</p><p className="font-display text-xl text-navy-900 mt-1">{formatPercent(value as number|null)}</p></div>)}</div></div>}
    <div className="mt-5"><p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold mb-2">Creative / video review</p>{hasScores?<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{scoreEntries.map(([label,value])=><div key={label as string} className="text-center border rounded-xl p-2"><p className="text-xs text-fog-500">{label}</p><p className="font-display text-xl">{available(value)?value:"N/A"}</p></div>)}</div>:<div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-3 text-sm text-navy-700">Creative review is pending. The performance index does not create Hook, Script, Editing or CTA scores.</div>}</div>
    {selected.diagnosisText && <div className="rounded-xl bg-signal-amber/10 p-3 mt-4"><p className="text-xs uppercase font-semibold text-signal-amber">Diagnosis</p><p className="text-sm mt-1 text-navy-800">{selected.diagnosisText}</p></div>}
    {selected.lastSynced && <p className="text-[10px] text-fog-400 mt-4">Last synced: {selected.lastSynced}</p>}
  </Card>;
}

export default function VideoAnalysis(){
  const {month,platform,pillar,format,spendType} = useFilters();
  const live = useDecisionLive();
  const [tab,setTab] = useState<VideoTab>("overview");
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [compareAId,setCompareAId] = useState("");
  const [compareBId,setCompareBId] = useState("");

  const allMonthVideos = useMemo(()=>{
    const rawVideos:any[] = live.data?.data.video ?? [];
    const creative:any[] = live.data?.data.creative ?? [];
    const byUrl = new Map<string,any>();
    const byId = new Map<string,any>();
    const byName = new Map<string,any>();
    for (const item of creative.filter((candidate:any)=>candidate.month===month)) {
      if (item.url) byUrl.set(canonicalUrl(item.url),item);
      for (const id of [item.id,item.contentId,item.videoId]) if (id) byId.set(String(id),item);
      byName.set(`${item.platform}|${String(item.name || "").trim().toLowerCase()}`,item);
    }
    const normalized = rawVideos.filter((video:any)=>video.month===month).map((video:any)=>{
      const match = [video.id,video.contentId,video.videoId].map((id)=>id?byId.get(String(id)):null).find(Boolean)
        || (video.url ? byUrl.get(canonicalUrl(video.url)) : null)
        || byName.get(`${video.platform}|${String(video.name || "").trim().toLowerCase()}`);
      return normalizeVideo(video,match?.previewUrl);
    });
    return scoreVideos(normalized,live.data?.currentMonth || month);
  },[live.data,month]);

  const videos = useMemo(()=>allMonthVideos.filter((video:any)=>{
    if (platform!=="All" && video.platform!==platform) return false;
    if (pillar!=="All" && video.pillar!==pillar) return false;
    if (format!=="All" && video.format!==format) return false;
    if (spendType!=="All" && video.spendType!==spendType) return false;
    return true;
  }),[allMonthVideos,platform,pillar,format,spendType]);
  const ranked = useMemo(()=>videos.filter((video:any)=>video.analysis.mature && video.analysis.score!==null).sort((a:any,b:any)=>b.analysis.score-a.analysis.score),[videos]);
  const topVideos = useMemo(()=>ranked.filter((video:any)=>video.analysis.status==="Top Performer"),[ranked]);
  const attentionVideos = useMemo(()=>[...ranked].filter((video:any)=>video.analysis.status==="Needs Attention").sort((a:any,b:any)=>a.analysis.score-b.analysis.score),[ranked]);
  const lowestVideos = useMemo(()=>[...ranked].sort((a:any,b:any)=>a.analysis.score-b.analysis.score),[ranked]);
  const needsData = useMemo(()=>videos.filter((video:any)=>video.analysis.status==="Needs More Data"),[videos]);
  const retentionVideos = useMemo(()=>videos.filter((video:any)=>available(video.analysis.watchQuality)).sort((a:any,b:any)=>b.analysis.watchQuality-a.analysis.watchQuality),[videos]);
  const selected = videos.find((video:any)=>video.id===selectedId) || ranked[0] || videos[0];
  const compareA = videos.find((video:any)=>video.id===compareAId) || videos[0];
  const compareB = videos.find((video:any)=>video.id===compareBId) || videos[1] || videos[0];

  if (live.loading && !live.data) return <EmptyState message="Loading real video data…"/>;
  if (!live.data && live.error) return <EmptyState message="Real video data is temporarily unavailable. No demo data is shown."/>;
  if (!videos.length) return <EmptyState message="No real video data for this selection."/>;

  const tabs:{id:VideoTab;label:string;icon:any}[] = [
    {id:"overview",label:"Overview",icon:BarChart3},{id:"top",label:"Top Performers",icon:Trophy},
    {id:"lowest",label:"Lowest Performers",icon:AlertTriangle},{id:"retention",label:"Retention & Watch",icon:Clock},
    {id:"compare",label:"Compare",icon:Scale},
  ];
  const chooseVideo = (id:string) => { setSelectedId(id); if (tab!=="overview") setTab("overview"); };

  return <div className="space-y-8">
    <SectionHeader eyebrow="Video" title="Video Analysis" description="Videos are ranked against comparable content from the same platform and video type. Performance uses real metrics only; creative review remains separate." action={<div className="text-right"><span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full ${live.isLive?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>{live.isLive?"LIVE API":live.deliverySource==="snapshot"?"SNAPSHOT":"SOURCE UNAVAILABLE"}</span>{live.data?.generatedAt && <p className="text-[10px] text-fog-400 mt-1">Updated {live.data.generatedAt}</p>}</div>}/>

    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">{[["Tracked Videos",videos.length,"text-navy-900"],["Scored",ranked.length,"text-signal-blue"],["Top Performers",topVideos.length,"text-mint-700"],["Needs Attention",attentionVideos.length,"text-signal-coral"],["Needs More Data",needsData.length,"text-signal-amber"]].map(([label,value,color])=><Card key={label as string}><p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p><p className={`font-display text-2xl mt-1 ${color}`}>{value}</p></Card>)}</section>

    <nav className="flex flex-wrap gap-2 rounded-2xl bg-white border border-navy-900/6 p-2 shadow-card">{tabs.map((item)=>{const Icon=item.icon;return <button key={item.id} onClick={()=>setTab(item.id)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${tab===item.id?"bg-navy-900 text-white":"text-fog-600 hover:bg-warm-100"}`}><Icon size={14}/>{item.label}</button>;})}</nav>

    {tab==="overview" && <>
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card><div className="flex items-center justify-between mb-3"><div><p className="text-[10px] uppercase tracking-wide text-mint-700 font-semibold">Best results</p><h3 className="font-display text-xl text-navy-900">Top Performing Videos</h3></div><Trophy size={20} className="text-mint-600"/></div><div className="space-y-2">{(topVideos.length?topVideos:ranked).slice(0,3).map((video:any,index:number)=><RankedVideoCard key={video.id} video={video} rank={index+1} onSelect={setSelectedId}/>)}</div></Card>
        <Card><div className="flex items-center justify-between mb-3"><div><p className="text-[10px] uppercase tracking-wide text-signal-coral font-semibold">Relative ranking</p><h3 className="font-display text-xl text-navy-900">Lowest Performing Videos</h3><p className="text-[10px] text-fog-400 mt-1">Lowest comparable scores—not automatically failed content.</p></div><AlertTriangle size={20} className="text-signal-coral"/></div>{lowestVideos.length?<div className="space-y-2">{lowestVideos.slice(0,3).map((video:any,index:number)=><RankedVideoCard key={video.id} video={video} rank={index+1} onSelect={setSelectedId}/>)}</div>:<div className="rounded-xl bg-warm-100 p-4 text-sm text-fog-500">No mature videos have enough comparable data yet.</div>}</Card>
      </section>
      {needsData.length>0 && <Card><div className="flex items-start gap-3"><Clock size={18} className="text-signal-amber mt-0.5"/><div><p className="text-sm font-semibold text-navy-900">{needsData.length} video{needsData.length===1?"":"s"} need more data</p><p className="text-xs text-fog-500 mt-1">They are excluded from Top and Needs Attention until they have enough distribution or comparable metrics.</p></div></div></Card>}
      {selected && <section><SectionHeader eyebrow="Explorer" title="Selected Video" description="Performance Index explains the result; reviewed creative scores remain independent."/><VideoDetail selected={selected}/></section>}
      <section><SectionHeader eyebrow="Inventory" title="All Videos" description="Choose any video to inspect its real metrics and score coverage."/><Card className="max-h-[560px] overflow-y-auto"><div className="grid grid-cols-1 lg:grid-cols-2 gap-2">{[...videos].sort((a:any,b:any)=>(b.analysis.score??-1)-(a.analysis.score??-1)).map((video:any)=><button key={video.id} onClick={()=>setSelectedId(video.id)} className={`w-full text-left p-3 rounded-xl transition-colors ${selected?.id===video.id?"bg-navy-900 text-white":"bg-warm-100 hover:bg-hospital-mist/70"}`}><div className="flex gap-3"><VideoThumbnail item={video} compact/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="font-medium text-sm line-clamp-2">{video.name}</p><span className="font-display text-xl shrink-0">{video.analysis.score??"N/A"}</span></div><p className="text-xs opacity-70 mt-1">{video.platform} · {formatNumber(video.views)} views</p><p className="text-[10px] opacity-60 mt-1">{video.analysis.status} · {video.analysis.confidence}</p></div></div></button>)}</div></Card></section>
    </>}

    {tab==="top" && <section><SectionHeader eyebrow="Ranking" title="Top Performing Videos" description="Only mature videos with enough comparable metrics are ranked."/>{ranked.length?<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{ranked.map((video:any,index:number)=><RankedVideoCard key={video.id} video={video} rank={index+1} onSelect={chooseVideo}/>)}</div>:<EmptyState message="No videos have enough data for ranking yet."/>}</section>}
    {tab==="lowest" && <section><SectionHeader eyebrow="Relative ranking" title="Lowest Performing Videos" description="Mature videos ordered from the lowest comparable Performance Index upward. This is a prioritisation list, not a judgement that every item failed."/>{lowestVideos.length?<><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{lowestVideos.map((video:any,index:number)=><RankedVideoCard key={video.id} video={video} rank={index+1} onSelect={chooseVideo}/>)}</div>{attentionVideos.length>0&&<p className="text-xs text-fog-500 mt-3">{attentionVideos.length} video{attentionVideos.length===1?" is":"s are"} below the Needs Attention threshold.</p>}</>:<EmptyState message="No mature videos have enough comparable data for a lowest-performance ranking."/>}</section>}

    {tab==="retention" && <section><SectionHeader eyebrow="Viewing quality" title="Retention & Watch" description="Ranked by the available watch-quality signals. Missing checkpoints stay N/A."/><Card className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="text-[10px] uppercase tracking-wide text-fog-400 border-b border-navy-900/6">{["#","Video","Platform","Avg Watch","Avg Viewed","Completion","Retention 50%","Watch Score"].map((label)=><th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody>{retentionVideos.map((video:any,index:number)=><tr key={video.id} className="border-b border-navy-900/5 hover:bg-warm-100/70 cursor-pointer" onClick={()=>chooseVideo(video.id)}><td className="px-3 py-3 text-xs text-fog-400">{index+1}</td><td className="px-3 py-3"><p className="text-sm font-medium text-navy-900 max-w-[260px] line-clamp-2">{video.name}</p></td><td className="px-3 py-3 text-xs text-fog-600">{video.platform}</td><td className="px-3 py-3 text-sm">{formatSeconds(video.avgWatchTimeSeconds)}</td><td className="px-3 py-3 text-sm">{formatPercent(video.avgPercentWatched)}</td><td className="px-3 py-3 text-sm">{formatPercent(video.completionRate)}</td><td className="px-3 py-3 text-sm">{formatPercent(video.retention50)}</td><td className="px-3 py-3 font-display text-lg text-mint-700">{Math.round(video.analysis.watchQuality*100)}</td></tr>)}</tbody></table></Card></section>}

    {tab==="compare" && <section><SectionHeader eyebrow="Side by side" title="Compare Videos" description="Choose two videos. Keep platform and format filters narrow for the fairest comparison."/><Card><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">{[{value:compareA?.id,set:setCompareAId,label:"Video A"},{value:compareB?.id,set:setCompareBId,label:"Video B"}].map((control)=><label key={control.label} className="text-xs text-fog-500">{control.label}<select value={control.value || ""} onChange={(event)=>control.set(event.target.value)} className="mt-1 w-full rounded-xl border border-navy-900/10 bg-warm-50 px-3 py-2.5 text-sm text-navy-900">{videos.map((video:any)=><option key={video.id} value={video.id}>{video.platform} · {video.name}</option>)}</select></label>)}</div>{compareA && compareB && <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-navy-900/6"><th className="p-3 text-[10px] uppercase text-fog-400">Metric</th><th className="p-3 text-sm text-navy-900 max-w-[260px]">{compareA.name}</th><th className="p-3 text-sm text-navy-900 max-w-[260px]">{compareB.name}</th></tr></thead><tbody>{[["Platform",compareA.platform,compareB.platform],["Performance Index",compareA.analysis.score??"N/A",compareB.analysis.score??"N/A"],["Confidence",compareA.analysis.confidence,compareB.analysis.confidence],["Views",formatNumber(compareA.views),formatNumber(compareB.views)],["Interactions",formatNumber(compareA.interactions),formatNumber(compareB.interactions)],["Engagement",formatPercent(compareA.engagementRate),formatPercent(compareB.engagementRate)],["Avg Watch",formatSeconds(compareA.avgWatchTimeSeconds),formatSeconds(compareB.avgWatchTimeSeconds)],["Avg Viewed",formatPercent(compareA.avgPercentWatched),formatPercent(compareB.avgPercentWatched)],["Completion",formatPercent(compareA.completionRate),formatPercent(compareB.completionRate)],["Shares",formatNumber(compareA.shares),formatNumber(compareB.shares)],["Saves",formatNumber(compareA.saves),formatNumber(compareB.saves)]].map(([label,a,b])=><tr key={label as string} className="border-b border-navy-900/5"><td className="p-3 text-xs text-fog-500">{label}</td><td className="p-3 text-sm font-medium text-navy-900">{a}</td><td className="p-3 text-sm font-medium text-navy-900">{b}</td></tr>)}</tbody></table></div>}</Card></section>}
  </div>;
}

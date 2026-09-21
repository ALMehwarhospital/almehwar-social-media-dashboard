import { useMemo, useState } from "react";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { ContentTable } from "../components/content/ContentTable";
import { formatNumber, formatPercent } from "../utils/format";

const RANK = [
  ["reach","Reach"],
  ["engagementRate","Engagement Rate"],
  ["interactions","Interactions"],
  ["followersGained","Followers Gained"],
  ["linkClicks","Link Clicks"]
] as const;

function metricValue(item:any, key:string) {
  const value = item[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function avgAvailable(items:any[], key:string) {
  const vals = items.map(i=>i[key]).filter(v=>typeof v==="number" && Number.isFinite(v));
  return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
}

function sumAvailable(items:any[], key:string) {
  const vals = items.map(i=>i[key]).filter(v=>typeof v==="number" && Number.isFinite(v));
  return vals.length ? vals.reduce((a,b)=>a+b,0) : 0;
}

export default function ContentIntelligence(){
  const { month, platform, pillar, format, spendType } = useFilters();
  const [rank,setRank] = useState<string>("reach");
  const live = useDecisionLive();

  const items = useMemo(() => {
    const source = live.data?.data.content ?? [];
    return source.filter((c:any) => {
      if (c.month !== month) return false;
      if (platform !== "All" && c.platform !== platform) return false;
      if (pillar !== "All" && c.pillar !== pillar) return false;
      if (format !== "All" && c.format !== format) return false;
      if (spendType !== "All" && c.spendType !== spendType) return false;
      return true;
    });
  }, [live.data, month, platform, pillar, format, spendType]);

  if(live.loading && !live.data) return <EmptyState message="Loading real content data…"/>;
  if(!live.data && live.error) return <EmptyState message="Real content data is temporarily unavailable. No demo data is shown."/>;
  if(!items.length) return <EmptyState message="No real content data for this selection."/>;

  const sorted = [...items].sort((a,b)=>metricValue(b,rank)-metricValue(a,rank));
  const peerRatio = (item:any) => {
    const peers = items.filter((p:any)=>p.platform===item.platform && p.spendType===item.spendType && p.format===item.format);
    const vals = peers.map((p:any)=>metricValue(p,rank)).filter((v:number)=>v>0);
    const avg = vals.length ? vals.reduce((a:number,b:number)=>a+b,0)/vals.length : 0;
    return avg>0 ? metricValue(item,rank)/avg : 1;
  };
  const underperformers = [...items].sort((a,b)=>peerRatio(a)-peerRatio(b));

  const byPillar = new Map<string,any[]>();
  items.forEach((i:any)=>{
    const key=i.pillar || "Other";
    byPillar.set(key,[...(byPillar.get(key)||[]),i]);
  });
  const pillars = [...byPillar.entries()].map(([name,arr])=>({
    pillar:name,
    posts:arr.length,
    avgReach:avgAvailable(arr,"reach"),
    avgEngagement:avgAvailable(arr,"engagementRate"),
    followersGained:sumAvailable(arr,"followersGained")
  })).sort((a,b)=>(b.avgEngagement??-1)-(a.avgEngagement??-1));

  const byFormat = new Map<string,any[]>();
  items.forEach((i:any)=>{
    const key=i.format || "Other";
    byFormat.set(key,[...(byFormat.get(key)||[]),i]);
  });
  const formats = [...byFormat.entries()].map(([name,arr])=>({
    format:name,
    posts:arr.length,
    avgEngagement:avgAvailable(arr,"engagementRate")
  })).sort((a,b)=>(b.avgEngagement??-1)-(a.avgEngagement??-1));

  const pendingClassification = items.filter((i:any)=>i.pillarSource==="pending-classification").length;
  const isLiveMonth = Boolean(live.data && month===live.data.currentMonth);

  return <div className="space-y-10">
    <SectionHeader
      eyebrow="Content"
      title="Content Intelligence"
      description="Real Content Performance history plus current-month platform raw data. Missing metrics stay N/A instead of being replaced with zeros."
      action={
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${live.isLive?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>
            {live.isLive?"LIVE FROM SHEET":"SNAPSHOT"}
          </span>
          <select value={rank} onChange={e=>setRank(e.target.value)} className="text-xs bg-white border rounded-full px-3 py-2">
            {RANK.map(([k,l])=><option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      }
    />

    {isLiveMonth && (
      <div className="rounded-xl border border-mint-300/30 bg-mint-100/60 p-3 text-xs text-navy-700">
        LIVE MTD: {items.length} content items loaded for {month}. {pendingClassification>0 ? `${pendingClassification} current-month items are awaiting Content Pillar classification, so they remain under Other until reviewed.` : ""}
      </div>
    )}

    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <p className="text-xs uppercase tracking-wide text-mint-600 font-semibold mb-1">Top Performing Content</p>
        <p className="text-[11px] text-fog-500 mb-3">Highest reported result for the selected metric.</p>
        <ContentTable items={sorted.slice(0,5)} metric={rank as any}/>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-wide text-signal-coral font-semibold mb-1">Contextual Underperformers</p>
        <p className="text-[11px] text-fog-500 mb-3">Lowest result relative to the same platform, spend type and format.</p>
        <ContentTable items={underperformers.slice(0,5)} metric={rank as any}/>
      </Card>
    </section>

    <section>
      <SectionHeader eyebrow="Pillars" title="Content Pillar Analysis" description={pendingClassification ? "Current-month pillar classification is still pending for newly synced content." : "Uses the same active filters as the content table."}/>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillars.slice(0,6).map(p=><Card key={p.pillar}>
          <p className="font-display text-lg">{p.pillar}</p>
          <p className="text-xs text-fog-500 mt-1">{p.posts} items</p>
          <div className="mt-4 text-sm space-y-1">
            <p>Avg Reach <b>{formatNumber(p.avgReach)}</b></p>
            <p>Avg Engagement <b>{formatPercent(p.avgEngagement)}</b></p>
            <p>Followers <b>{p.followersGained ? `+${p.followersGained}` : "N/A"}</b></p>
          </div>
        </Card>)}
      </div>
    </section>

    <section>
      <SectionHeader eyebrow="Formats" title="Format Analysis" description="Average engagement uses only content where an engagement rate is actually available."/>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {formats.map(f=><Card key={f.format}>
          <p className="font-medium">{f.format}</p>
          <p className="font-display text-2xl mt-2">{formatPercent(f.avgEngagement)}</p>
          <p className="text-xs text-fog-500">Avg engagement</p>
          <p className="text-[10px] text-fog-400 mt-1">{f.posts} items</p>
        </Card>)}
      </div>
    </section>
  </div>;
}

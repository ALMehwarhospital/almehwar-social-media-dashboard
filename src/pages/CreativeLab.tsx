import { useMemo, useState } from "react";
import { useDecisionLive } from "../utils/useDecisionLive";
import { useFilters } from "../utils/FilterContext";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { CreativeRadar } from "../components/creative/CreativeRadar";
import { PerformanceMatrix } from "../components/creative/PerformanceMatrix";
import { ExternalLink, FlaskConical, Lightbulb, Search, TrendingDown, TrendingUp } from "lucide-react";

const QUADRANTS = [
  "Strong Creative / Strong Performance",
  "Strong Creative / Weak Performance",
  "Weak Creative / Strong Performance",
  "Needs Rework",
] as const;

const quadrantClasses: Record<string,string> = {
  "Strong Creative / Strong Performance": "bg-mint-100 text-mint-700",
  "Strong Creative / Weak Performance": "bg-signal-blue/10 text-signal-blue",
  "Weak Creative / Strong Performance": "bg-signal-amber/15 text-signal-amber",
  "Needs Rework": "bg-signal-coral/10 text-signal-coral",
};

function isReviewed(c:any) {
  return c.reviewStatus === "Reviewed" && typeof c.creativeScore === "number" && typeof c.performanceScore === "number";
}

export default function CreativeLab() {
  const { month, platform, pillar, format, spendType } = useFilters();
  const live = useDecisionLive();

  const creative = useMemo(() => {
    const source:any[] = live.data?.data.creative ?? [];
    return source
      .filter((c:any) => {
        if (month && c.month !== month) return false;
        if (platform !== "All" && c.platform !== platform) return false;
        if (pillar !== "All" && c.pillar !== pillar) return false;
        if (format !== "All" && c.format !== format) return false;
        if (spendType !== "All" && c.spendType !== spendType) return false;
        return true;
      })
      .sort((a:any,b:any) => Number(isReviewed(b)) - Number(isReviewed(a)));
  }, [live.data, month, platform, pillar, format, spendType]);

  const reviewed = useMemo(() => creative.filter(isReviewed), [creative]);
  const pending = useMemo(() => creative.filter((c:any)=>!isReviewed(c)), [creative]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = creative.find((c:any) => c.id === selectedId) ?? creative[0];

  const summary = useMemo(() => {
    const counts = Object.fromEntries(QUADRANTS.map((q) => [q, 0])) as Record<string,number>;
    reviewed.forEach((item:any) => { counts[item.quadrant] = (counts[item.quadrant] ?? 0) + 1; });
    const avgCreative = reviewed.length ? Math.round(reviewed.reduce((s:number,c:any)=>s+c.creativeScore,0)/reviewed.length) : null;
    const avgPerformance = reviewed.length ? Math.round(reviewed.reduce((s:number,c:any)=>s+c.performanceScore,0)/reviewed.length) : null;
    return { counts, avgCreative, avgPerformance };
  }, [reviewed]);

  if (live.loading && !live.data) {
    return <EmptyState message="Loading real creative inventory…" />;
  }
  if (!live.data && live.error) {
    return <EmptyState message="Real creative data is temporarily unavailable. No demo data is shown." />;
  }
  if (creative.length === 0) {
    return <EmptyState message="No real creative records for this selection." />;
  }

  const selectedReviewed = selected && isReviewed(selected);

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Creative"
        title="Creative Lab"
        description="All tracked content is visible across Facebook, Instagram, YouTube and TikTok. Reviewed items show real scores; everything else stays Pending Review instead of receiving invented ratings."
        action={
          <div className="text-right">
            <span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full ${live.isLive ? "bg-mint-100 text-mint-700" : "bg-warm-100 text-fog-500"}`}>
              {live.isLive ? "LIVE FROM SHEET" : "SNAPSHOT"}
            </span>
            {live.data?.generatedAt && <p className="text-[10px] text-fog-400 mt-1">Updated {live.data.generatedAt}</p>}
          </div>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-3">
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Total Content</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{creative.length}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Reviewed</p>
          <p className="font-display text-2xl text-mint-700 mt-1">{reviewed.length}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Pending</p>
          <p className="font-display text-2xl text-signal-amber mt-1">{pending.length}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Avg Creative</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{summary.avgCreative ?? "N/A"}{summary.avgCreative!==null && <span className="text-xs text-fog-400">/100</span>}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Avg Performance</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{summary.avgPerformance ?? "N/A"}{summary.avgPerformance!==null && <span className="text-xs text-fog-400">/100</span>}</p>
        </Card>
        {QUADRANTS.map((q) => (
          <Card key={q}>
            <span className={`inline-flex text-[9px] leading-tight px-2 py-1 rounded-full ${quadrantClasses[q]}`}>{q}</span>
            <p className="font-display text-2xl text-navy-900 mt-2">{summary.counts[q]}</p>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <Card className="lg:max-h-[760px] overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-fog-500 mb-1">Creative inventory</p>
          <p className="text-[10px] text-fog-400 mb-3">{reviewed.length} reviewed · {pending.length} pending</p>
          <div className="space-y-1.5">
            {creative.map((c:any) => {
              const done=isReviewed(c);
              return <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selected?.id===c.id?"bg-navy-900 text-warm-50":"hover:bg-warm-100 text-navy-700"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 font-medium">{c.name}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 ${done?"bg-mint-100 text-mint-700":"bg-signal-amber/15 text-signal-amber"}`}>
                    {done?"Reviewed":"Pending"}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${selected?.id===c.id?"text-warm-100/70":"text-fog-500"}`}>
                  {c.platform}{done ? ` · Creative ${c.creativeScore} · Performance ${c.performanceScore}` : ""}
                </p>
                <p className={`text-[10px] mt-1 ${selected?.id===c.id?"text-warm-100/50":"text-fog-400"}`}>
                  {c.pillar} · {c.format}{c.live ? " · LIVE MTD" : ""}
                </p>
              </button>;
            })}
          </div>
        </Card>

        {selected && <Card>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-fog-500 text-xs">{selected.platform} · {selected.pillar} · {selected.format}{selected.live ? " · LIVE MTD" : ""}</p>
              <h3 className="font-display text-xl text-navy-900 max-w-2xl mt-1">{selected.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {selectedReviewed ? <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${quadrantClasses[selected.quadrant]}`}>
                  {selected.quadrant}
                </span> : <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-signal-amber/15 text-signal-amber">Pending Review</span>}
                {selectedReviewed && <span className="text-[10px] px-2.5 py-1 rounded-full bg-warm-100 text-fog-600">Confidence: {selected.reviewConfidence || "—"}</span>}
                {selected.url && <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-signal-blue hover:underline">
                  Open post <ExternalLink size={11}/>
                </a>}
              </div>
            </div>

            <div className="flex gap-5 shrink-0">
              <div className="text-right">
                <p className="font-display text-3xl text-mint-700">{selectedReviewed ? selected.creativeScore : "N/A"}</p>
                <p className="text-fog-500 text-[11px]">Creative /100</p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl text-navy-900">{selectedReviewed ? selected.performanceScore : "N/A"}</p>
                <p className="text-fog-500 text-[11px]">Performance /100</p>
              </div>
            </div>
          </div>

          {!selectedReviewed ? <>
            {selected.previewUrl && <div className="rounded-xl overflow-hidden border border-navy-900/6 bg-warm-100 mb-4"><img src={selected.previewUrl} alt="" className="w-full max-h-[430px] object-contain"/></div>}
            <div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-signal-amber">Review pending</p>
              <p className="text-sm text-navy-800 mt-2 leading-relaxed">This content is tracked in the creative inventory, but no creative score has been assigned yet. The dashboard will not infer Hook, Script, Editing, CTA or Creative Score from performance metrics.</p>
              {selected.previewStatus && <p className="text-[10px] text-fog-500 mt-2">Preview: {selected.previewStatus}</p>}
            </div>
          </> : <>
            <CreativeRadar scores={selected.scores as any}/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-mint-100 p-3">
                <div className="flex items-center gap-1.5 text-mint-700 text-[11px] font-semibold uppercase mb-1"><TrendingUp size={13}/> Strength</div>
                <p className="text-sm text-navy-900">{selected.mainStrength}</p>
              </div>
              <div className="rounded-xl bg-signal-coral/10 p-3">
                <div className="flex items-center gap-1.5 text-signal-coral text-[11px] font-semibold uppercase mb-1"><TrendingDown size={13}/> Problem</div>
                <p className="text-sm text-navy-900">{selected.mainWeakness}</p>
              </div>
              <div className="rounded-xl bg-navy-900 p-3">
                <div className="flex items-center gap-1.5 text-signal-amber text-[11px] font-semibold uppercase mb-1"><Lightbulb size={13}/> Recommended change</div>
                <p className="text-sm text-warm-50">{selected.recommendedImprovement}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border border-navy-900/8 bg-warm-100 p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-fog-500 font-semibold"><Search size={13}/> Evidence</div>
                <p className="text-sm text-navy-800 mt-2 leading-relaxed">{selected.evidence}</p>
              </div>
              <div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-4">
                <p className="text-[10px] uppercase tracking-wide text-signal-amber font-semibold">Working hypothesis</p>
                <p className="text-sm text-navy-800 mt-2 leading-relaxed">{selected.hypothesis || "No separate hypothesis recorded."}</p>
              </div>
            </div>

            <div className="rounded-xl border border-signal-blue/20 bg-signal-blue/5 p-4 mt-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-signal-blue font-semibold"><FlaskConical size={13}/> Next test</div>
              <p className="text-sm font-medium text-navy-900 mt-2">{selected.nextTest}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-navy-900/6 text-[10px] text-fog-500 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <span>{selected.observation}</span>
              <span className="sm:text-right">Review: {selected.reviewer} · {selected.reviewDate}{selected.reviewBasis ? ` · ${selected.reviewBasis}` : ""}</span>
            </div>
          </>}
        </Card>}
      </section>

      <section>
        <SectionHeader eyebrow="Matrix" title="Creative × Performance" description="Only reviewed content enters the matrix. Pending items stay visible in the inventory but do not affect averages or quadrant counts."/>
        {reviewed.length ? <Card><PerformanceMatrix items={reviewed as any}/></Card> : <EmptyState message="No reviewed creative items in this selection yet."/>}
      </section>
    </div>
  );
}

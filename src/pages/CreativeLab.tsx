import { useMemo, useState } from "react";
import { useFilters } from "../utils/FilterContext";
import { getCreative } from "../utils/selectors";
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

export default function CreativeLab() {
  const { month, platform, pillar, format, spendType } = useFilters();
  const filters = {
    platform: platform === "All" ? undefined : platform,
    pillar: pillar === "All" ? undefined : pillar,
    format: format === "All" ? undefined : format,
    spendType: spendType === "All" ? undefined : spendType,
  };

  const creative = useMemo(
    () => getCreative(month, filters),
    [month, platform, pillar, format, spendType]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = creative.find((c) => c.id === selectedId) ?? creative[0];

  const summary = useMemo(() => {
    const counts = Object.fromEntries(QUADRANTS.map((q) => [q, 0])) as Record<string,number>;
    creative.forEach((item) => { counts[item.quadrant] = (counts[item.quadrant] ?? 0) + 1; });
    const avgCreative = creative.length ? Math.round(creative.reduce((s,c)=>s+c.creativeScore,0)/creative.length) : 0;
    const avgPerformance = creative.length ? Math.round(creative.reduce((s,c)=>s+c.performanceScore,0)/creative.length) : 0;
    return { counts, avgCreative, avgPerformance };
  }, [creative]);

  if (creative.length === 0) {
    return <EmptyState message="No reviewed creative analysis for this selection." />;
  }

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Creative"
        title="Creative Lab"
        description="Reviewed creative quality from the analysis sheet, kept separate from contextual performance. Scores use the 1–5 review rubric and roll up to a 100-point Creative Score."
      />

      <section className="grid grid-cols-2 xl:grid-cols-7 gap-3">
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Reviewed</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{creative.length}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Avg Creative</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{summary.avgCreative}<span className="text-xs text-fog-400">/100</span></p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">Avg Performance</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{summary.avgPerformance}<span className="text-xs text-fog-400">/100</span></p>
        </Card>
        {QUADRANTS.map((q) => (
          <Card key={q} className="xl:col-span-1">
            <span className={`inline-flex text-[9px] leading-tight px-2 py-1 rounded-full ${quadrantClasses[q]}`}>{q}</span>
            <p className="font-display text-2xl text-navy-900 mt-2">{summary.counts[q]}</p>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <Card className="lg:max-h-[690px] overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-fog-500 mb-3">Select reviewed content</p>
          <div className="space-y-1.5">
            {creative.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selected?.id===c.id?"bg-navy-900 text-warm-50":"hover:bg-warm-100 text-navy-700"}`}
              >
                <p className="line-clamp-2 font-medium">{c.name}</p>
                <p className={`text-xs mt-1 ${selected?.id===c.id?"text-warm-100/70":"text-fog-500"}`}>
                  {c.platform} · Creative {c.creativeScore} · Performance {c.performanceScore}
                </p>
                <p className={`text-[10px] mt-1 ${selected?.id===c.id?"text-warm-100/50":"text-fog-400"}`}>
                  {c.pillar} · {c.format}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {selected && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-fog-500 text-xs">{selected.platform} · {selected.pillar} · {selected.format}</p>
                <h3 className="font-display text-xl text-navy-900 max-w-2xl mt-1">{selected.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${quadrantClasses[selected.quadrant]}`}>
                    {selected.quadrant}
                  </span>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-warm-100 text-fog-600">
                    Confidence: {selected.reviewConfidence ?? "—"}
                  </span>
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-signal-blue hover:underline">
                      Open post <ExternalLink size={11}/>
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-5 shrink-0">
                <div className="text-right">
                  <p className="font-display text-3xl text-mint-700">{selected.creativeScore}</p>
                  <p className="text-fog-500 text-[11px]">Creative /100</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl text-navy-900">{selected.performanceScore}</p>
                  <p className="text-fog-500 text-[11px]">Performance /100</p>
                </div>
              </div>
            </div>

            <CreativeRadar scores={selected.scores}/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-mint-100 p-3">
                <div className="flex items-center gap-1.5 text-mint-700 text-[11px] font-semibold uppercase mb-1">
                  <TrendingUp size={13}/> Strength
                </div>
                <p className="text-sm text-navy-900">{selected.mainStrength}</p>
              </div>
              <div className="rounded-xl bg-signal-coral/10 p-3">
                <div className="flex items-center gap-1.5 text-signal-coral text-[11px] font-semibold uppercase mb-1">
                  <TrendingDown size={13}/> Problem
                </div>
                <p className="text-sm text-navy-900">{selected.mainWeakness}</p>
              </div>
              <div className="rounded-xl bg-navy-900 p-3">
                <div className="flex items-center gap-1.5 text-signal-amber text-[11px] font-semibold uppercase mb-1">
                  <Lightbulb size={13}/> Recommended change
                </div>
                <p className="text-sm text-warm-50">{selected.recommendedImprovement}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl border border-navy-900/8 bg-warm-100 p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-fog-500 font-semibold">
                  <Search size={13}/> Evidence
                </div>
                <p className="text-sm text-navy-800 mt-2 leading-relaxed">{selected.evidence}</p>
              </div>
              <div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-4">
                <p className="text-[10px] uppercase tracking-wide text-signal-amber font-semibold">Working hypothesis</p>
                <p className="text-sm text-navy-800 mt-2 leading-relaxed">{selected.hypothesis || "No separate hypothesis recorded."}</p>
              </div>
            </div>

            <div className="rounded-xl border border-signal-blue/20 bg-signal-blue/5 p-4 mt-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-signal-blue font-semibold">
                <FlaskConical size={13}/> Next test
              </div>
              <p className="text-sm font-medium text-navy-900 mt-2">{selected.nextTest}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-navy-900/6 text-[10px] text-fog-500 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <span>{selected.observation}</span>
              <span className="sm:text-right">Review: {selected.reviewer} · {selected.reviewDate}{selected.reviewBasis ? ` · ${selected.reviewBasis}` : ""}</span>
            </div>
          </Card>
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Matrix"
          title="Creative × Performance"
          description="70/100 is the working threshold on both axes. The matrix separates creative quality from observed performance without assuming one causes the other."
        />
        <Card><PerformanceMatrix items={creative}/></Card>
      </section>
    </div>
  );
}

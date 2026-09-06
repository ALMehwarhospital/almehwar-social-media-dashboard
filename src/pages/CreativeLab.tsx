import { useMemo, useState } from "react";
import { useFilters } from "../utils/FilterContext";
import { getCreative, getContent } from "../utils/selectors";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { CreativeRadar } from "../components/creative/CreativeRadar";
import { PerformanceMatrix } from "../components/creative/PerformanceMatrix";
import { formatPercent } from "../utils/format";
import { Lightbulb, TrendingUp, TrendingDown } from "lucide-react";

export default function CreativeLab() {
  const { month, platform } = useFilters();
  const creative = useMemo(() => getCreative(month, platform === "All" ? undefined : platform), [month, platform]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = creative.find((c) => c.id === selectedId) ?? creative[0];
  const content = getContent(month, { platform: platform === "All" ? undefined : platform });
  const highestValue = [...content].sort((a, b) => b.valueRate - a.valueRate)[0];
  const lowestValue = [...content].sort((a, b) => a.valueRate - b.valueRate)[0];
  if (creative.length === 0) return <EmptyState message="No creative analysis for this selection." />;
  return (
    <div className="space-y-10">
      <SectionHeader eyebrow="Creative" title="Creative Lab" description="Every content piece scored on idea, hook, script, design, editing, branding, and CTA." />
      <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card className="lg:max-h-[520px] overflow-y-auto"><p className="text-xs font-semibold uppercase tracking-wide text-fog-500 mb-3">Select content</p><div className="space-y-1.5">{creative.map((c)=><button key={c.id} onClick={()=>setSelectedId(c.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${selected?.id===c.id?"bg-navy-900 text-warm-50":"hover:bg-warm-100 text-navy-700"}`}><p className="line-clamp-1 font-medium">{c.name}</p><p className={`text-xs ${selected?.id===c.id?"text-warm-100/70":"text-fog-500"}`}>{c.platform} · Creative {c.creativeScore}/5</p></button>)}</div></Card>
        {selected&&<Card><div className="flex items-start justify-between mb-2"><div><p className="text-fog-500 text-xs">{selected.platform}</p><h3 className="font-display text-xl text-navy-900 max-w-md">{selected.name}</h3></div><div className="text-right"><p className="font-display text-3xl text-mint-700">{selected.creativeScore}</p><p className="text-fog-500 text-[11px]">Creative Score / 5</p></div></div><CreativeRadar scores={selected.scores}/><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4"><div className="rounded-xl bg-mint-100 p-3"><div className="flex items-center gap-1.5 text-mint-700 text-[11px] font-semibold uppercase mb-1"><TrendingUp size={13}/> Main Strength</div><p className="text-sm text-navy-900">{selected.mainStrength}</p></div><div className="rounded-xl bg-signal-coral/10 p-3"><div className="flex items-center gap-1.5 text-signal-coral text-[11px] font-semibold uppercase mb-1"><TrendingDown size={13}/> Main Weakness</div><p className="text-sm text-navy-900">{selected.mainWeakness}</p></div><div className="rounded-xl bg-navy-900 p-3"><div className="flex items-center gap-1.5 text-signal-amber text-[11px] font-semibold uppercase mb-1"><Lightbulb size={13}/> Improve</div><p className="text-sm text-warm-50">{selected.recommendedImprovement}</p></div></div></Card>}
      </section>
      <section><SectionHeader eyebrow="Matrix" title="Creative Performance Matrix" description="Where creative quality and real-world performance align — and where they don't."/><Card><PerformanceMatrix items={creative}/></Card></section>
      <section><SectionHeader eyebrow="Value" title="Content Value Rate" description="(Shares + Saves) ÷ Reach or Views — content people found worth keeping."/><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Card><p className="text-[11px] font-semibold uppercase tracking-wide text-mint-600 mb-2">Highest Value Content</p><p className="font-medium text-navy-900 line-clamp-2">{highestValue?.name}</p><p className="font-display text-2xl text-mint-700 mt-2">{formatPercent(highestValue?.valueRate??0)}</p><p className="text-fog-500 text-xs mt-1">{highestValue?.platform} · {highestValue?.pillar}</p></Card><Card><p className="text-[11px] font-semibold uppercase tracking-wide text-signal-coral mb-2">Lowest Value Content</p><p className="font-medium text-navy-900 line-clamp-2">{lowestValue?.name}</p><p className="font-display text-2xl text-signal-coral mt-2">{formatPercent(lowestValue?.valueRate??0)}</p><p className="text-fog-500 text-xs mt-1">{lowestValue?.platform} · {lowestValue?.pillar}</p></Card></div></section>
    </div>
  );
}

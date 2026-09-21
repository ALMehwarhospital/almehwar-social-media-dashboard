import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { formatNumber, formatPercent, formatSeconds } from "../utils/format";

function normalizeVideo(v:any) {
  const nested = v.scores || {};
  const diagnosis = typeof v.diagnosis === "string"
    ? v.diagnosis
    : v.diagnosis?.explanation || v.diagnosis?.problem || "";

  return {
    ...v,
    hookScore: v.hookScore ?? nested.hook ?? null,
    scriptScore: v.scriptScore ?? nested.script ?? null,
    editingScore: v.editingScore ?? nested.editing ?? null,
    ctaScore: v.ctaScore ?? nested.cta ?? null,
    overallScore: v.overallScore ?? nested.overall ?? null,
    diagnosisText: diagnosis,
  };
}

function available(value:any) {
  return typeof value === "number" && Number.isFinite(value);
}

export default function VideoAnalysis(){
  const { month, platform, pillar, format, spendType } = useFilters();
  const live = useDecisionLive();

  const videos = useMemo(() => {
    const source = live.data?.data.video ?? [];
    return source
      .map(normalizeVideo)
      .filter((v:any) => {
        if (v.month !== month) return false;
        if (platform !== "All" && v.platform !== platform) return false;
        if (pillar !== "All" && v.pillar !== pillar) return false;
        if (format !== "All" && v.format !== format) return false;
        if (spendType !== "All" && v.spendType !== spendType) return false;
        return true;
      });
  }, [live.data, month, platform, pillar, format, spendType]);

  const [selectedId,setSelectedId] = useState<string|null>(null);
  const selected = videos.find((v:any)=>v.id===selectedId) ?? videos[0];

  if(live.loading && !live.data) return <EmptyState message="Loading real video data…"/>;
  if(!live.data && live.error) return <EmptyState message="Real video data is temporarily unavailable. No demo data is shown."/>;
  if(!videos.length) return <EmptyState message="No real video data for this selection."/>;

  const scoreEntries = selected ? [
    ["Hook", selected.hookScore],
    ["Script", selected.scriptScore],
    ["Editing", selected.editingScore],
    ["CTA", selected.ctaScore],
  ] : [];

  const hasScores = scoreEntries.some(([,v])=>available(v)) || available(selected?.overallScore);
  const hasRetention = selected && [selected.retention25,selected.retention50,selected.retention75]
    .some(available);

  return <div className="space-y-10">
    <SectionHeader
      eyebrow="Video"
      title="Video Analysis"
      description="Real Video Analysis history plus current-month platform metrics. Creative/video scores are shown only when a real review exists; missing data remains N/A."
      action={
        <div className="text-right">
          <span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full ${live.isLive?"bg-mint-100 text-mint-700":"bg-warm-100 text-fog-500"}`}>
            {live.isLive?"LIVE FROM SHEET":"SNAPSHOT"}
          </span>
          {live.data?.generatedAt && <p className="text-[10px] text-fog-400 mt-1">Updated {live.data.generatedAt}</p>}
        </div>
      }
    />

    <section className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      <Card className="lg:max-h-[760px] overflow-y-auto">
        <div className="space-y-2">
          {videos.map((v:any)=><button
            key={v.id}
            onClick={()=>setSelectedId(v.id)}
            className={`w-full text-left p-3 rounded-xl ${selected?.id===v.id?"bg-navy-900 text-white":"bg-warm-100"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm line-clamp-2">{v.name}</p>
              {v.live && <span className="text-[9px] px-2 py-0.5 rounded-full bg-mint-100 text-mint-700 shrink-0">LIVE</span>}
            </div>
            <p className="text-xs opacity-70 mt-1">{v.platform} · {formatNumber(v.views)} views</p>
            <p className="text-[10px] opacity-60 mt-1">{v.spendType || "Total / Unsplit"} · {v.pillar || "Other"} · {v.format || "Video"}</p>
          </button>)}
        </div>
      </Card>

      {selected && <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs text-fog-500">{selected.platform} · {formatSeconds(selected.durationSeconds)} · {selected.live ? "LIVE MTD" : selected.month}</p>
            <h3 className="font-display text-xl text-navy-900 mt-1">{selected.name}</h3>
            <p className="text-[11px] text-fog-400 mt-1">{selected.spendType || "Total / Unsplit"} · {selected.pillar || "Other"} · {selected.format || "Video"}</p>
            {selected.url && <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-signal-blue font-semibold mt-2 hover:underline">Open content <ExternalLink size={12}/></a>}
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-3xl text-mint-700">{available(selected.overallScore) ? selected.overallScore : "N/A"}</p>
            <p className="text-xs text-fog-500">Reviewed score / 5</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            ["Avg Watch", formatSeconds(selected.avgWatchTimeSeconds)],
            ["Avg Viewed", formatPercent(selected.avgPercentWatched)],
            ["Completion", formatPercent(selected.completionRate)],
            ["Engagement", formatPercent(selected.engagementRate)]
          ].map(([k,v])=><div className="bg-warm-100 rounded-xl p-3" key={k}>
            <p className="text-xs text-fog-500">{k}</p>
            <p className="font-display text-xl mt-1">{v}</p>
          </div>)}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {[
            ["Views", formatNumber(selected.views)],
            ["Reach", formatNumber(selected.reach)],
            ["Impressions", formatNumber(selected.impressions)],
            ["Interactions", formatNumber(selected.interactions)],
            ["Shares", formatNumber(selected.shares)],
            ["Saves", formatNumber(selected.saves)],
            ["Followers", selected.followersGained == null ? "N/A" : `+${formatNumber(selected.followersGained)}`],
            ["Denominator", selected.engagementDenominator || "N/A"],
          ].map(([k,v])=><div className="border border-navy-900/6 rounded-xl p-3" key={k}>
            <p className="text-[10px] uppercase tracking-wide text-fog-400">{k}</p>
            <p className="text-sm font-medium text-navy-900 mt-1">{v}</p>
          </div>)}
        </div>

        {hasRetention && <div className="mt-5">
          <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold mb-2">Retention checkpoints</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["25%", selected.retention25],
              ["50%", selected.retention50],
              ["75%", selected.retention75],
            ].map(([label,value])=><div key={label as string} className="rounded-xl bg-hospital-mist/55 p-3 text-center">
              <p className="text-xs text-fog-500">{label}</p>
              <p className="font-display text-xl text-navy-900 mt-1">{formatPercent(value as number|null)}</p>
            </div>)}
          </div>
        </div>}

        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold mb-2">Creative / Video review</p>
          {hasScores ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {scoreEntries.map(([k,v])=><div key={k as string} className="text-center border rounded-xl p-2">
              <p className="text-xs text-fog-500">{k}</p>
              <p className="font-display text-xl">{available(v) ? v : "N/A"}</p>
            </div>)}
          </div> : <div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-3 text-sm text-navy-700">
            Creative/video review is pending. Scores are not inferred from views, watch time or engagement.
          </div>}
        </div>

        {selected.diagnosisText && <div className="rounded-xl bg-signal-amber/10 p-3 mt-4">
          <p className="text-xs uppercase font-semibold text-signal-amber">Diagnosis</p>
          <p className="text-sm mt-1 text-navy-800">{selected.diagnosisText}</p>
        </div>}

        {selected.lastSynced && <p className="text-[10px] text-fog-400 mt-4">Last synced: {selected.lastSynced}</p>}
      </Card>}
    </section>
  </div>;
}

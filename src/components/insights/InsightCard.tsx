import type { Insight } from "../../types/dashboard";

const ROWS: { key: keyof Insight; label: string; tag: string }[] = [
  { key: "observation", label: "Observation", tag: "bg-signal-blue/10 text-signal-blue" },
  { key: "data", label: "Data", tag: "bg-navy-900/5 text-navy-700 font-mono" },
  { key: "interpretation", label: "Interpretation", tag: "bg-mint-100 text-mint-700" },
  { key: "hypothesis", label: "Hypothesis", tag: "bg-signal-amber/15 text-signal-amber" },
  { key: "recommendedAction", label: "Recommended Action", tag: "bg-navy-900 text-warm-50" },
];

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-900/6 shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-navy-900">{insight.title}</h3>
        {insight.relatedPlatform && (
          <span className="text-[11px] font-medium text-fog-500 bg-warm-100 px-2.5 py-1 rounded-full">{insight.relatedPlatform}</span>
        )}
      </div>
      <div className="space-y-2.5">
        {ROWS.map((row) => (
          <div key={row.key} className="flex gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-fog-400 w-28 shrink-0 pt-1">{row.label}</span>
            <p className={`text-sm rounded-lg px-2.5 py-1.5 flex-1 ${row.tag}`}>{insight[row.key] as string}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

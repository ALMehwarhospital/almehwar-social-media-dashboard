import { formatNumber, formatPercent } from "../../utils/format";

type FunnelData = {
  reach: number;
  profileVisits: number;
  linkClicks: number;
  leads: number;
};

export function FunnelView({ funnel }: { funnel: FunnelData }) {
  const profileVisitRate = funnel.reach ? (funnel.profileVisits / funnel.reach) * 100 : 0;
  const clickRate = funnel.profileVisits ? (funnel.linkClicks / funnel.profileVisits) * 100 : 0;
  const leadToReach = funnel.reach ? (funnel.leads / funnel.reach) * 100 : 0;

  const steps = [
    { label: "Reach", value: funnel.reach },
    { label: "Profile Visits", value: funnel.profileVisits, rate: profileVisitRate },
    { label: "Link Clicks", value: funnel.linkClicks, rate: clickRate },
  ];

  return (
    <div>
      <div className="space-y-1">
        {steps.map((step, i) => {
          const width = Math.max(48, 100 - i * 20);
          return (
            <div key={step.label} className="flex flex-col items-center">
              {i > 0 && step.rate !== undefined && (
                <div className="text-[10px] font-mono text-fog-400 py-1">↓ {formatPercent(step.rate)} step conversion</div>
              )}
              <div
                className={`rounded-xl px-4 py-3 text-center transition-all ${i === 0 ? "bg-navy-900 text-warm-50" : "bg-mint-50 border border-mint-500/10 text-navy-900"}`}
                style={{ width: `${width}%` }}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-60">{step.label}</p>
                <p className="font-display text-xl tabular-nums">{formatNumber(step.value)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-signal-amber/25 bg-signal-amber/10 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-signal-amber font-semibold">Messages / Leads</p>
            <p className="font-display text-2xl text-navy-900 mt-1">{formatNumber(funnel.leads)}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg text-navy-900">{formatPercent(leadToReach)}</p>
            <p className="text-[10px] text-fog-500">of reach</p>
          </div>
        </div>
        <p className="text-xs text-navy-700 mt-2">Shown as a separate outcome because direct messages and paid leads can bypass profile visits and link clicks. No false sequential attribution is assumed.</p>
      </div>
    </div>
  );
}

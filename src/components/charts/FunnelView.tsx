import { formatNumber, formatPercent } from "../../utils/format";

type FunnelData = {
  reach: number;
  profileVisits: number;
  profileVisitRate: number;
  linkClicks: number;
  clickRate: number;
  leads: number;
  leadRate: number;
};

export function FunnelView({ funnel }: { funnel: FunnelData }) {
  const steps = [
    { label: "Reach", value: funnel.reach },
    { label: "Profile Visits", value: funnel.profileVisits, rate: funnel.profileVisitRate },
    { label: "Link Clicks", value: funnel.linkClicks, rate: funnel.clickRate },
    { label: "Messages / Leads", value: funnel.leads, rate: funnel.leadRate },
  ];
  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const width = Math.max(35, 100 - i * 18);
        return (
          <div key={step.label} className="flex flex-col items-center">
            {i > 0 && step.rate !== undefined && (
              <div className="text-[10px] font-mono text-fog-400 py-1">↓ {formatPercent(step.rate)} conversion</div>
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
  );
}

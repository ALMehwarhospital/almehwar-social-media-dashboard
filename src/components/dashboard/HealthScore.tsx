import type { MonthlyHealthScore } from "../../types/dashboard";

const LABELS: Record<keyof MonthlyHealthScore["breakdown"], string> = {
  visibility: "Visibility",
  engagement: "Engagement",
  audienceGrowth: "Audience Growth",
  contentQuality: "Content Quality",
  conversion: "Conversion",
  creativePerformance: "Creative Performance",
};

function scoreColor(score: number) {
  if (score >= 70) return "#3C7391";
  if (score >= 50) return "#916C3C";
  if (score >= 35) return "#DEAF71";
  return "#453015";
}

export function HealthScore({ score }: { score: MonthlyHealthScore }) {
  const r = 64;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score.overall / 100);

  return (
    <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-warm-50 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center shadow-lift">
      <div className="flex flex-col items-center justify-self-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 150 150" className="w-40 h-40 -rotate-90">
            <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(226,234,239,0.16)" strokeWidth="12" />
            <circle
              cx="75" cy="75" r={r} fill="none"
              stroke={scoreColor(score.overall)}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl">{score.overall}</span>
            <span className="text-warm-100/60 text-[11px] uppercase tracking-wide">out of 100</span>
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-mint-300 mt-4">Social Media Health Score</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {(Object.keys(score.breakdown) as (keyof typeof score.breakdown)[]).map((key) => {
          const value = score.breakdown[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-warm-100/80">{LABELS[key]}</span>
                <span className="font-mono font-medium">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${value}%`, backgroundColor: scoreColor(value), transition: "width 0.8s ease" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { formatNumber, formatPercent, pctChange, trendOf } from "../../utils/format";
import { TrendTag } from "./Primitives";

interface KpiCardProps {
  label: string;
  current: number | null;
  previous?: number | null;
  sparkline?: number[];
  suffix?: string;
  context?: string;
  accent?: "mint" | "blue" | "amber";
  format?: "number" | "percent";
}

export function KpiCard({ label, current, previous, sparkline, suffix = "", context, accent = "mint", format = "number" }: KpiCardProps) {
  const canCompare = current !== null && previous !== undefined && previous !== null;
  const change = canCompare ? pctChange(current, previous) : null;
  const direction = canCompare ? trendOf(current, previous) : null;
  const strokeColor = { mint: "#2FBF9F", blue: "#3D74E6", amber: "#E8963C" }[accent];

  return (
    <div className="bg-white rounded-2xl border border-navy-900/6 shadow-card p-5 flex flex-col justify-between min-h-[168px]">
      <div className="flex items-start justify-between">
        <p className="text-fog-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        {canCompare && direction && change !== null && <TrendTag direction={direction} value={change} />}
      </div>

      <div className="flex items-end justify-between mt-3">
        <p className="font-display text-3xl text-navy-900 tabular-nums">
          {format === "percent" ? formatPercent(current) : formatNumber(current)}{suffix}
        </p>
        {sparkline && sparkline.length > 1 && (
          <div className="w-20 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline.map((v, i) => ({ v, i }))}>
                <Line type="monotone" dataKey="v" stroke={strokeColor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {context && <p className="text-fog-500 text-xs mt-2 leading-snug">{context}</p>}
    </div>
  );
}

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { formatNumber, pctChange, trendOf } from "../../utils/format";
import { TrendTag } from "./Primitives";

interface KpiCardProps {
  label: string;
  current: number;
  previous?: number;
  sparkline?: number[];
  suffix?: string;
  context?: string;
  accent?: "mint" | "blue" | "amber";
}

export function KpiCard({ label, current, previous, sparkline, suffix = "", context, accent = "mint" }: KpiCardProps) {
  const change = previous !== undefined ? pctChange(current, previous) : 0;
  const direction = previous !== undefined ? trendOf(current, previous) : "flat";
  const strokeColor = { mint: "#2FBF9F", blue: "#3D74E6", amber: "#E8963C" }[accent];

  return (
    <div className="bg-white rounded-2xl border border-navy-900/6 shadow-card p-5 flex flex-col justify-between min-h-[168px]">
      <div className="flex items-start justify-between">
        <p className="text-fog-500 text-xs font-medium uppercase tracking-wide">{label}</p>
        {previous !== undefined && <TrendTag direction={direction} value={change} />}
      </div>

      <div className="flex items-end justify-between mt-3">
        <p className="font-display text-3xl text-navy-900 tabular-nums">
          {formatNumber(current)}{suffix}
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

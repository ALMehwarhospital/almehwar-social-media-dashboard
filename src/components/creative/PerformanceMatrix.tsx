import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { CreativeAnalysis } from "../../types/dashboard";

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "#3C7391",
  Instagram: "#916C3C",
  TikTok: "#0E3145",
  YouTube: "#DEAF71",
  LinkedIn: "#453015",
};

export function PerformanceMatrix({ items }: { items: CreativeAnalysis[] }) {
  const data = items.map((i) => ({
    x: i.creativeScore,
    y: i.performanceScore,
    name: i.name,
    platform: i.platform,
  }));

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2 absolute inset-0 p-2 pointer-events-none text-[11px] font-semibold uppercase tracking-wide">
        <span className="text-fog-400 self-end">Rebuild</span>
        <span className="text-mint-600 self-end justify-self-end">Winners</span>
        <span className="text-signal-amber self-start">Content Opportunity</span>
        <span className="text-signal-blue self-start justify-self-end">Wrong Distribution</span>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
            <XAxis type="number" dataKey="x" name="Creative Score" domain={[1, 5]} tick={{ fontSize: 11, fill: "#7D6D59" }} label={{ value: "Creative Score", position: "insideBottom", offset: -5, fontSize: 11, fill: "#7D6D59" }} />
            <YAxis type="number" dataKey="y" name="Performance" domain={[0, 100]} tick={{ fontSize: 11, fill: "#7D6D59" }} label={{ value: "Performance", angle: -90, position: "insideLeft", fontSize: 11, fill: "#7D6D59" }} />
            <ZAxis range={[80, 80]} />
            <ReferenceLine x={3} stroke="#E2EAEF" />
            <ReferenceLine y={50} stroke="#E2EAEF" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#C7D4DC" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-hospital-mist rounded-lg px-3 py-2 text-xs shadow-lift">
                    <p className="font-semibold text-navy-900">{d.name}</p>
                    <p className="text-fog-500">{d.platform} · Creative {d.x} · Performance {d.y}</p>
                  </div>
                );
              }}
            />
            <Scatter
              data={data}
              shape={(props: any) => (
                <circle cx={props.cx} cy={props.cy} r={5.5} fill={PLATFORM_COLORS[props.payload.platform] ?? "#3C7391"} fillOpacity={0.88} />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

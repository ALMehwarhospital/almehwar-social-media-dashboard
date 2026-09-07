import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { CreativeAnalysis } from "../../types/dashboard";

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "#3D74E6",
  Instagram: "#E2604F",
  TikTok: "#0B1E33",
  YouTube: "#E8963C",
  LinkedIn: "#2FBF9F",
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
        <span className="text-[#2FBF9F] self-end justify-self-end">Winners</span>
        <span className="text-[#E8963C] self-start">Content Opportunity</span>
        <span className="text-[#3D74E6] self-start justify-self-end">Wrong Distribution</span>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
            <XAxis type="number" dataKey="x" name="Creative Score" domain={[1, 5]} tick={{ fontSize: 11, fill: "#7D6D59" }} label={{ value: "Creative Score", position: "insideBottom", offset: -5, fontSize: 11, fill: "#7D6D59" }} />
            <YAxis type="number" dataKey="y" name="Performance" domain={[0, 100]} tick={{ fontSize: 11, fill: "#7D6D59" }} label={{ value: "Performance", angle: -90, position: "insideLeft", fontSize: 11, fill: "#7D6D59" }} />
            <ZAxis range={[80, 80]} />
            <ReferenceLine x={3} stroke="#D8D2C2" />
            <ReferenceLine y={50} stroke="#D8D2C2" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#D8D2C2" }}
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
                <circle cx={props.cx} cy={props.cy} r={5.5} fill={PLATFORM_COLORS[props.payload.platform] ?? "#2FBF9F"} fillOpacity={0.88} />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

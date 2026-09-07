import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { CreativeScoreCard } from "../../types/dashboard";

const LABELS: Record<keyof CreativeScoreCard, string> = {
  idea: "Idea",
  hook: "Hook",
  script: "Script / Copy",
  design: "Design / Visual",
  editing: "Editing",
  brandConsistency: "Branding",
  cta: "CTA",
};

export function CreativeRadar({ scores }: { scores: CreativeScoreCard }) {
  const data = (Object.keys(scores) as (keyof CreativeScoreCard)[]).map((key) => ({
    axis: LABELS[key],
    score: scores[key],
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#E2EAEF" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#5F4E3A" }} />
          <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#2FBF9F" fill="#2FBF9F" fillOpacity={0.35} strokeWidth={2.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

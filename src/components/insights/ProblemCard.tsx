import { AlertTriangle } from "lucide-react";
import type { DetectedProblem } from "../../types/dashboard";
import { PriorityPill } from "../dashboard/Primitives";

export function ProblemCard({ problem }: { problem: DetectedProblem }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-900/6 shadow-card p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-signal-coral">
          <AlertTriangle size={16} />
          <p className="font-display text-base text-navy-900">{problem.title}</p>
        </div>
        <PriorityPill priority={problem.severity} />
      </div>
      <p className="text-fog-600 text-sm leading-relaxed">{problem.description}</p>
      {problem.relatedPlatform && (
        <span className="inline-block mt-3 text-[11px] font-medium text-fog-500 bg-warm-100 px-2.5 py-1 rounded-full">
          {problem.relatedPlatform}
        </span>
      )}
    </div>
  );
}

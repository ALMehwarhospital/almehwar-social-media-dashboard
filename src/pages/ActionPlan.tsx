import { useState } from "react";
import { useFilters } from "../utils/FilterContext";
import { getActionPlan } from "../utils/selectors";
import { SectionHeader, Card, EmptyState, PriorityPill } from "../components/dashboard/Primitives";
import type { ActionStatus } from "../types/dashboard";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";

const STATUS_CONFIG: Record<ActionStatus, { icon: typeof Circle; cls: string }> = {
  "Not Started": { icon: Circle, cls: "text-fog-400" },
  "In Progress": { icon: CircleDot, cls: "text-signal-blue" },
  Done: { icon: CheckCircle2, cls: "text-mint-600" },
};

export default function ActionPlan() {
  const { month } = useFilters();
  const [showAllMonths, setShowAllMonths] = useState(false);
  const items = getActionPlan(showAllMonths ? undefined : month);

  const grouped = {
    High: items.filter((i) => i.priority === "High"),
    Medium: items.filter((i) => i.priority === "Medium"),
    Low: items.filter((i) => i.priority === "Low"),
  };

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Next Steps"
        title="Action Plan"
        description="What the team should do next, ranked by priority."
        action={
          <button
            onClick={() => setShowAllMonths((s) => !s)}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-warm-100 text-fog-600 hover:bg-warm-200"
          >
            {showAllMonths ? "This month only" : "All months"}
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState message="No action items recorded for this selection." />
      ) : (
        (["High", "Medium", "Low"] as const).map((priority) =>
          grouped[priority].length > 0 && (
            <section key={priority}>
              <div className="flex items-center gap-2 mb-4">
                <PriorityPill priority={priority} />
                <p className="text-fog-500 text-xs">{grouped[priority].length} item{grouped[priority].length !== 1 ? "s" : ""}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {grouped[priority].map((item) => {
                  const StatusIcon = STATUS_CONFIG[item.status].icon;
                  return (
                    <Card key={item.id}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="font-display text-lg text-navy-900 leading-snug">{item.problem}</p>
                        <span className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${STATUS_CONFIG[item.status].cls}`}>
                          <StatusIcon size={14} />
                          {item.status}
                        </span>
                      </div>
                      <p className="text-navy-700 text-sm mb-3 leading-relaxed">{item.action}</p>
                      <div className="flex items-center justify-between text-xs text-fog-500 pt-3 border-t border-navy-900/6">
                        <span>Owner: <span className="text-navy-800 font-medium">{item.owner}</span></span>
                        <span className="text-right max-w-[55%]">{item.expectedImpact}</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )
        )
      )}
    </div>
  );
}

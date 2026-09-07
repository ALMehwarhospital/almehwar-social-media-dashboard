import { useState } from "react";
import { ArrowRight, CheckCircle2, Circle, CircleDot, PauseCircle, AlertTriangle } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { getActionPlan } from "../utils/selectors";
import { SectionHeader, Card, EmptyState, PriorityPill } from "../components/dashboard/Primitives";
import type { ActionStatus } from "../types/dashboard";

const STATUS_CONFIG: Record<ActionStatus, { icon: typeof Circle; cls: string }> = {
  "Not Started": { icon: Circle, cls: "text-fog-400" },
  "In Progress": { icon: CircleDot, cls: "text-signal-blue" },
  "On Hold": { icon: PauseCircle, cls: "text-signal-amber" },
  Done: { icon: CheckCircle2, cls: "text-mint-600" },
};

const FLOW = ["Recommendation", "Action", "Test", "Result", "Learning"];

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
        eyebrow="Execution"
        title="Action Plan"
        description="Only approved or test-ready recommendations move here. Every action should have an owner, a measurable success condition, and a result we can learn from."
        action={
          <button
            onClick={() => setShowAllMonths((s) => !s)}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-warm-100 text-fog-600 hover:bg-warm-200"
          >
            {showAllMonths ? "This month only" : "All months"}
          </button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {FLOW.map((step, index) => (
            <div key={step} className="flex items-center gap-2 sm:gap-3">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${index === 0 ? "bg-signal-blue/10 text-signal-blue" : index === FLOW.length - 1 ? "bg-navy-900 text-white" : "bg-hospital-mist/70 text-navy-800"}`}>
                {step}
              </span>
              {index < FLOW.length - 1 && <ArrowRight size={14} className="text-fog-400" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-fog-500 mt-3">The goal is not to collect tasks. It is to close the loop: execute a decision, measure the result, and keep the learning for the next cycle.</p>
      </Card>

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
                  const hasMeasurement = Boolean(item.targetKpi || item.baseline !== undefined || item.target !== undefined || item.deadline || item.testPeriod);
                  return (
                    <Card key={item.id}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold">Source recommendation / problem</p>
                          <p className="font-display text-lg text-navy-900 leading-snug mt-1">{item.problem}</p>
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${STATUS_CONFIG[item.status].cls}`}>
                          <StatusIcon size={14} />
                          {item.status}
                        </span>
                      </div>

                      <div className="rounded-xl bg-hospital-mist/55 border border-navy-900/5 p-3 mb-3">
                        <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold">Action</p>
                        <p className="text-navy-800 text-sm mt-1 leading-relaxed font-medium">{item.action}</p>
                      </div>

                      {hasMeasurement ? (
                        <div className="grid grid-cols-2 gap-2 mb-3 rounded-xl bg-warm-100 p-3">
                          {item.targetKpi && <div><p className="text-[10px] uppercase text-fog-400">Target KPI</p><p className="text-xs font-medium text-navy-800 mt-0.5">{item.targetKpi}</p></div>}
                          {item.baseline !== undefined && <div><p className="text-[10px] uppercase text-fog-400">Baseline</p><p className="text-xs font-medium text-navy-800 mt-0.5">{String(item.baseline)}</p></div>}
                          {item.target !== undefined && <div><p className="text-[10px] uppercase text-fog-400">Target</p><p className="text-xs font-medium text-navy-800 mt-0.5">{String(item.target)}</p></div>}
                          {item.deadline && <div><p className="text-[10px] uppercase text-fog-400">Deadline</p><p className="text-xs font-medium text-navy-800 mt-0.5">{item.deadline}</p></div>}
                          {item.testPeriod && <div><p className="text-[10px] uppercase text-fog-400">Test Period</p><p className="text-xs font-medium text-navy-800 mt-0.5">{item.testPeriod}</p></div>}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-start rounded-xl bg-signal-amber/10 border border-signal-amber/20 p-3 mb-3">
                          <AlertTriangle size={14} className="text-signal-amber shrink-0 mt-0.5" />
                          <p className="text-xs text-navy-700">Measurement not defined yet. Add a target KPI, baseline, target, deadline and/or test period before moving this action into execution.</p>
                        </div>
                      )}

                      {(item.result || item.finalLearning) && (
                        <div className="space-y-2 mb-3">
                          {item.result && <div className="rounded-xl border border-mint-300/30 bg-mint-100/70 p-3"><p className="text-[10px] uppercase tracking-wide text-mint-700 font-semibold">Result</p><p className="text-sm text-navy-800 mt-1">{item.result}</p></div>}
                          {item.finalLearning && <div className="rounded-xl border border-signal-blue/15 bg-signal-blue/5 p-3"><p className="text-[10px] uppercase tracking-wide text-signal-blue font-semibold">Final learning</p><p className="text-sm text-navy-800 mt-1">{item.finalLearning}</p></div>}
                        </div>
                      )}

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

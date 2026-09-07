import { useState } from "react";
import { ArrowRight, MessageSquareText, Sparkles, TriangleAlert } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { getInsights, getProblems, getNotes } from "../utils/selectors";
import { SectionHeader, Card, EmptyState, PriorityPill } from "../components/dashboard/Primitives";
import type { NoteCategory } from "../types/dashboard";

const NOTE_COLORS: Record<NoteCategory, string> = {
  Creative: "bg-signal-coral/10 text-signal-coral",
  Content: "bg-mint-100 text-mint-700",
  Platform: "bg-signal-blue/10 text-signal-blue",
  Campaign: "bg-signal-amber/15 text-signal-amber",
  Management: "bg-navy-900/8 text-navy-700",
};

const FLOW = ["Evidence", "Finding", "Discussion", "Decision", "Action Plan"];

export default function Recommendations() {
  const { month } = useFilters();
  const [showAllMonths, setShowAllMonths] = useState(false);
  const scope = showAllMonths ? undefined : month;
  const insights = getInsights(scope);
  const problems = getProblems(scope);
  const notes = getNotes(scope);

  const stats = [
    { label: "Findings", value: insights.length },
    { label: "Issues to watch", value: problems.length },
    { label: "Discussion notes", value: notes.length },
    { label: "Recommended moves", value: insights.filter((i) => Boolean(i.recommendedAction)).length },
  ];

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Decision Layer"
        title="Findings & Recommendations"
        description="Turn performance signals into a shared point of view: what we saw, what it may mean, what we recommend, and what the team decides before anything becomes an action."
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
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${index === FLOW.length - 1 ? "bg-navy-900 text-white" : "bg-hospital-mist/70 text-navy-800"}`}>
                {step}
              </span>
              {index < FLOW.length - 1 && <ArrowRight size={14} className="text-fog-400" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-fog-500 mt-3">Nothing moves to execution just because it appeared in the data. The team reviews the evidence, discusses the recommendation, then decides what deserves an action.</p>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-navy-900/6 shadow-card px-4 py-4">
            <p className="text-[10px] uppercase tracking-wide text-fog-400">{stat.label}</p>
            <p className="font-display text-2xl text-navy-900 mt-1 tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <section>
        <SectionHeader
          eyebrow="What the data is telling us"
          title="Findings"
          description="Each finding keeps evidence, interpretation and the recommended move separate so the team can challenge the reasoning before approving it."
        />
        {insights.length === 0 ? (
          <EmptyState message="No findings or recommendations recorded for this selection." />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {insights.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-signal-blue" />
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-signal-blue">Finding</span>
                      {item.relatedPlatform && <span className="text-[10px] px-2 py-0.5 rounded-full bg-hospital-mist/70 text-navy-700">{item.relatedPlatform}</span>}
                    </div>
                    <h3 className="font-display text-xl text-navy-900 leading-snug">{item.title}</h3>
                  </div>
                </div>

                <div className="rounded-xl bg-warm-100 border border-navy-900/6 p-3 mb-4">
                  <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold">Evidence / Data</p>
                  <p className="text-sm text-navy-800 mt-1 leading-relaxed">{item.data}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl bg-white border border-navy-900/6 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold">What we observed</p>
                    <p className="text-sm text-navy-700 mt-1 leading-relaxed">{item.observation}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-navy-900/6 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-fog-400 font-semibold">What it may mean</p>
                    <p className="text-sm text-navy-700 mt-1 leading-relaxed">{item.interpretation}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-signal-amber/20 bg-signal-amber/8 p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-wide text-signal-amber font-semibold">Working hypothesis</p>
                  <p className="text-sm text-navy-700 mt-1 leading-relaxed">{item.hypothesis}</p>
                </div>

                <div className="rounded-xl border border-signal-blue/20 bg-signal-blue/8 p-4">
                  <p className="text-[10px] uppercase tracking-wide text-signal-blue font-semibold">Recommended move</p>
                  <p className="text-sm font-medium text-navy-900 mt-1 leading-relaxed">{item.recommendedAction}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Risks & friction"
          title="Issues to Watch"
          description="Problems are kept here as discussion items first. If the team agrees they deserve intervention, they can move into the Action Plan."
        />
        {problems.length === 0 ? (
          <EmptyState message="No issues flagged for this selection." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((problem) => (
              <Card key={problem.id}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <TriangleAlert size={17} className="text-signal-amber shrink-0 mt-0.5" />
                  <PriorityPill priority={problem.severity} />
                </div>
                <h3 className="font-display text-lg text-navy-900 leading-snug">{problem.title}</h3>
                <p className="text-sm text-navy-700 mt-2 leading-relaxed">{problem.description}</p>
                {problem.relatedPlatform && <p className="text-[11px] text-fog-400 mt-3">Related platform: <span className="text-navy-700 font-medium">{problem.relatedPlatform}</span></p>}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader
          eyebrow="Discussion layer"
          title="Team & AI Notes"
          description="Context, objections and additional observations live here so the final decision is not based on numbers alone."
        />
        {notes.length === 0 ? (
          <EmptyState message="No discussion notes recorded for this selection." />
        ) : (
          <Card>
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="flex gap-3 pb-3 border-b border-navy-900/5 last:border-0 last:pb-0">
                  <MessageSquareText size={15} className="text-fog-400 shrink-0 mt-1" />
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full h-fit shrink-0 ${NOTE_COLORS[note.category]}`}>{note.category}</span>
                  <div>
                    <p className="text-sm text-navy-800 leading-relaxed">{note.text}</p>
                    <p className="text-fog-400 text-[11px] mt-1">{note.author} · {note.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

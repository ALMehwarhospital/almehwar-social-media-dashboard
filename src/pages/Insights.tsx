import { useState } from "react";
import { useDecisionLive } from "../utils/useDecisionLive";
import { ArrowRight, CheckCircle2, LoaderCircle, MessageSquareText, Plus, Save, Sparkles, TriangleAlert, X } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { getInsights, getProblems, getNotes } from "../utils/selectors";
import { SectionHeader, Card, EmptyState, PriorityPill } from "../components/dashboard/Primitives";
import type { Insight, NoteCategory, Platform, Priority } from "../types/dashboard";
import { createSharedAction, createSharedRecommendation, updateSharedRecommendation } from "../data/decisionWrite";

const NOTE_COLORS: Record<NoteCategory, string> = {
  Creative: "bg-signal-coral/10 text-signal-coral",
  Content: "bg-mint-100 text-mint-700",
  Platform: "bg-signal-blue/10 text-signal-blue",
  Campaign: "bg-signal-amber/15 text-signal-amber",
  Management: "bg-navy-900/8 text-navy-700",
};

const FLOW = ["Evidence", "Finding", "Discussion", "Decision", "Action Plan"];
const PLATFORMS:(Platform|"")[]=["","Facebook","Instagram","TikTok","YouTube","LinkedIn"];
const PRIORITIES:Priority[]=["High","Medium","Low"];
const emptyRecommendation={title:"",observation:"",data:"",interpretation:"",hypothesis:"",recommendedAction:"",relatedPlatform:"" as Platform|"",priority:"Medium" as Priority,addedBy:"Marketing Team"};
const emptyAction={owner:"",expectedImpact:"",targetKpi:"",baseline:"",target:"",deadline:"",testPeriod:""};

interface SharedRecommendation extends Insight {
  decision?: string;
  teamComment?: string;
  addedBy?: string;
}

function SharedRecommendationCard({item,onChanged,canEdit}:{item:SharedRecommendation;onChanged:()=>Promise<void>;canEdit:boolean}) {
  const [comment,setComment]=useState(item.teamComment||"");
  const [showAction,setShowAction]=useState(false);
  const [action,setAction]=useState(emptyAction);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const decision=item.decision==="Pending"?"Draft":item.decision||"Draft";
  const step = decision==="Draft"?0:decision==="Discussed"?1:decision==="Approved"?2:decision==="Added to Action Plan"?3:-1;
  const update=async(nextDecision:"Discussed"|"Approved"|"Rejected")=>{
    setSaving(true);setError("");
    try { await updateSharedRecommendation({id:item.id,decision:nextDecision,teamComment:comment}); await onChanged(); }
    catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setSaving(false);}
  };
  const convert=async()=>{
    if(!action.owner.trim()||!action.targetKpi.trim()||!action.expectedImpact.trim()) return;
    setSaving(true);setError("");
    try { await createSharedAction({recommendationId:item.id,...action,addedBy:item.addedBy||"Marketing Team"}); setShowAction(false); await onChanged(); }
    catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setSaving(false);}
  };
  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2 mb-2"><span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-mint-100 text-mint-700">SAVED IN SHEET</span><span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-warm-100 text-fog-600">{decision}</span>{item.relatedPlatform&&<span className="text-[10px] px-2 py-1 rounded-full bg-hospital-mist text-navy-700">{item.relatedPlatform}</span>}</div><h3 className="font-display text-xl text-navy-900">{item.title}</h3><p className="text-[11px] text-fog-400 mt-1">{item.month} · {item.addedBy||"Marketing Team"}</p></div><PriorityPill priority={item.priority||"Medium"}/></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><div className="rounded-xl bg-warm-100 p-3"><p className="text-[10px] uppercase text-fog-400">Evidence</p><p className="text-sm text-navy-800 mt-1">{item.data}</p></div><div className="rounded-xl bg-warm-100 p-3"><p className="text-[10px] uppercase text-fog-400">Finding</p><p className="text-sm text-navy-800 mt-1">{item.observation}</p></div><div className="rounded-xl border border-navy-900/6 p-3"><p className="text-[10px] uppercase text-fog-400">Interpretation</p><p className="text-sm text-navy-700 mt-1">{item.interpretation}</p></div><div className="rounded-xl border border-signal-blue/15 bg-signal-blue/5 p-3"><p className="text-[10px] uppercase text-signal-blue">Recommended move</p><p className="text-sm text-navy-800 mt-1">{item.recommendedAction}</p></div></div>
    {canEdit&&decision!=="Added to Action Plan"&&decision!=="Rejected"&&<div className="mt-4"><label className="text-[10px] uppercase text-fog-400">Team comment<textarea value={comment} onChange={event=>setComment(event.target.value)} placeholder="Add the discussion note or approval reason" className="mt-1 w-full rounded-xl border border-navy-900/10 bg-warm-50 px-3 py-2 text-sm normal-case"/></label></div>}
    {canEdit&&<div className="flex flex-wrap gap-2 mt-4">{step<2&&step>=0&&<button disabled={saving} onClick={()=>update(decision==="Draft"?"Discussed":"Approved")} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 disabled:opacity-50 text-white px-3 py-2 text-xs font-semibold">{saving?<LoaderCircle size={13} className="animate-spin"/>:null}{decision==="Draft"?"Mark Discussed":"Approve Recommendation"}<ArrowRight size={13}/></button>}{decision==="Approved"&&<button disabled={saving} onClick={()=>setShowAction(value=>!value)} className="inline-flex items-center gap-2 rounded-xl bg-mint-600 disabled:opacity-50 text-white px-3 py-2 text-xs font-semibold"><CheckCircle2 size={13}/>Create Action Plan</button>}{decision!=="Added to Action Plan"&&decision!=="Rejected"&&<button disabled={saving} onClick={()=>update("Rejected")} className="rounded-xl bg-warm-100 disabled:opacity-50 text-fog-600 px-3 py-2 text-xs font-semibold">Reject</button>}</div>}
    {error&&<p className="text-xs text-signal-coral mt-3">{error}</p>}
    {showAction&&<div className="rounded-xl border border-mint-300/30 bg-mint-100/40 p-4 mt-4"><p className="text-xs font-semibold uppercase text-mint-700">Action details</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">{[["Owner","owner"],["Expected impact","expectedImpact"],["Target KPI","targetKpi"],["Baseline","baseline"],["Target","target"],["Deadline","deadline"],["Test period","testPeriod"]].map(([label,key])=><label key={key} className="text-[10px] uppercase text-fog-400">{label}<input value={(action as any)[key]} onChange={event=>setAction(current=>({...current,[key]:event.target.value}))} className="mt-1 w-full rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm normal-case"/></label>)}</div><button onClick={convert} disabled={saving||!action.owner.trim()||!action.targetKpi.trim()||!action.expectedImpact.trim()} className="inline-flex items-center gap-2 mt-3 rounded-xl bg-navy-900 disabled:opacity-40 text-white px-3 py-2 text-xs font-semibold"><Save size={13}/>Add Approved Action</button></div>}
  </Card>;
}

export default function Recommendations() {
  const { month } = useFilters();
  const [showAllMonths, setShowAllMonths] = useState(true);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState(emptyRecommendation);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const scope = showAllMonths ? undefined : month;
  const decisionLive = useDecisionLive();
  const insights = decisionLive.data
    ? decisionLive.data.data.recommendations.filter((i) => showAllMonths || i.month === month)
    : getInsights(scope);
  const problems = decisionLive.data ? [] : getProblems(scope);
  const notes = decisionLive.data ? [] : getNotes(scope);
  const workflowRecommendations=(decisionLive.data?.data.recommendations||[])
    .filter(item=>showAllMonths||item.month===month) as SharedRecommendation[];

  const saveRecommendation=async()=>{
    setSaving(true);setSaveError("");
    try {
      await createSharedRecommendation({month,title:form.title,observation:form.observation,data:form.data,interpretation:form.interpretation,hypothesis:form.hypothesis||undefined,recommendedAction:form.recommendedAction,relatedPlatform:form.relatedPlatform||undefined,priority:form.priority,addedBy:form.addedBy||"Marketing Team"});
      setForm(emptyRecommendation);setShowForm(false);await decisionLive.refresh();
    } catch(err){setSaveError(err instanceof Error?err.message:String(err));}
    finally{setSaving(false);}
  };

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
        description="Evidence becomes a recommendation only after review. New items move through Draft, Discussed and Approved before they can enter the Action Plan."
        action={
          <div className="flex flex-wrap justify-end items-center gap-2">
            <span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full ${decisionLive.isLive ? "bg-mint-100 text-mint-700" : "bg-warm-100 text-fog-500"}`}>
              {decisionLive.data ? "SAVED SHEET DATA" : "SOURCE UNAVAILABLE"}
            </span>
            <button
              onClick={() => setShowAllMonths((s) => !s)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-warm-100 text-fog-600 hover:bg-warm-200"
            >
              {showAllMonths ? "This month only" : "All months"}
            </button>
            <button onClick={()=>setShowForm(value=>!value)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-navy-900 text-white">
              {showForm?<X size={14}/>:<Plus size={14}/>} {showForm?"Close":"Add Recommendation"}
            </button>
          </div>
        }
      />

      {showForm&&<Card><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wide text-signal-blue font-semibold">New shared draft</p><h3 className="font-display text-xl text-navy-900 mt-1">Add Recommendation</h3><p className="text-xs text-fog-500 mt-1">This draft is saved in the private Recommendations sheet and becomes visible to the whole team.</p></div><span className="text-[10px] px-2 py-1 rounded-full bg-signal-amber/15 text-signal-amber">DRAFT</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <label className="text-[10px] uppercase text-fog-400 md:col-span-2">Title / Finding<input value={form.title} onChange={event=>setForm(current=>({...current,title:event.target.value}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"/></label>
          <label className="text-[10px] uppercase text-fog-400">Platform<select value={form.relatedPlatform} onChange={event=>setForm(current=>({...current,relatedPlatform:event.target.value as Platform|""}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"><option value="">All / Cross-platform</option>{PLATFORMS.filter(Boolean).map(value=><option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-[10px] uppercase text-fog-400">Priority<select value={form.priority} onChange={event=>setForm(current=>({...current,priority:event.target.value as Priority}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case">{PRIORITIES.map(value=><option key={value}>{value}</option>)}</select></label>
          {[["Evidence / Data","data"],["What we observed","observation"],["What it may mean","interpretation"],["Working hypothesis","hypothesis"],["Recommended move","recommendedAction"]].map(([label,key])=><label key={key} className={`text-[10px] uppercase text-fog-400 ${key==="recommendedAction"?"md:col-span-2":""}`}>{label}<textarea value={(form as any)[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))} rows={key==="recommendedAction"?3:2} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"/></label>)}
          <label className="text-[10px] uppercase text-fog-400">Added by<input value={form.addedBy} onChange={event=>setForm(current=>({...current,addedBy:event.target.value}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"/></label>
        </div>
        <button disabled={saving||!form.title.trim()||!form.data.trim()||!form.observation.trim()||!form.interpretation.trim()||!form.recommendedAction.trim()} onClick={saveRecommendation} className="inline-flex items-center gap-2 mt-4 rounded-xl bg-navy-900 disabled:opacity-40 text-white px-4 py-2.5 text-xs font-semibold">{saving?<LoaderCircle size={14} className="animate-spin"/>:<Save size={14}/>}Save to Google Sheet</button>{saveError&&<p className="text-xs text-signal-coral mt-3">{saveError}</p>}
      </Card>}

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

      <section>
        <SectionHeader eyebrow="Team Workflow" title="Recommendation Workflow" description="Shared Google Sheet records move from Draft to Discussed and Approved. Only an Approved recommendation can enter the Action Plan."/>
        {workflowRecommendations.length?<div className="grid grid-cols-1 gap-4">{workflowRecommendations.map(item=><SharedRecommendationCard key={item.id} item={item} canEdit={true} onChanged={decisionLive.refresh}/>)}</div>:<EmptyState message="No shared recommendation records for this selection."/>}
      </section>

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
                  <p className="text-sm text-navy-700 mt-1 leading-relaxed">{item.hypothesis || "No separate hypothesis recorded."}</p>
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
          description="Problems are shown only when they come from the same active data source as the rest of this decision layer. Static and live sources are never mixed."
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
          description="Context and discussion notes are shown only from the active decision source; live recommendations are not mixed with stale local notes."
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

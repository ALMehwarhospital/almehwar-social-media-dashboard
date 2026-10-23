import { useState } from "react";
import { LoaderCircle, Plus, Save, X } from "lucide-react";
import { useFilters } from "../utils/FilterContext";
import { SectionHeader, Card } from "../components/dashboard/Primitives";
import type { Platform, Priority } from "../types/dashboard";
import { createSharedRecommendation } from "../data/decisionWrite";
import { getDashboardToken } from "../data/dashboardAuth";

const PLATFORMS:(Platform|"")[]=["","Facebook","Instagram","TikTok","YouTube","LinkedIn"];
const PRIORITIES:Priority[]=["High","Medium","Low"];
const emptyRecommendation={title:"",observation:"",data:"",interpretation:"",hypothesis:"",recommendedAction:"",relatedPlatform:"" as Platform|"",priority:"Medium" as Priority,addedBy:"Marketing Team"};

export default function Recommendations() {
  const canEdit = Boolean(getDashboardToken());
  const { month } = useFilters();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyRecommendation);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const saveRecommendation = async () => {
    setSaving(true); setSaveError(""); setSaved(false);
    try {
      await createSharedRecommendation({month,title:form.title,observation:form.observation,data:form.data,interpretation:form.interpretation,hypothesis:form.hypothesis||undefined,recommendedAction:form.recommendedAction,relatedPlatform:form.relatedPlatform||undefined,priority:form.priority,addedBy:form.addedBy||"Marketing Team"});
      setForm(emptyRecommendation); setShowForm(false); setSaved(true);
    } catch (err) { setSaveError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <SectionHeader title="Add Recommendation" description="Create a new recommendation for the selected month." />
    {!canEdit && <Card><p className="text-sm text-fog-500">Adding recommendations is unavailable in public view. Existing recommendations remain visible in the reports.</p></Card>}
    {canEdit && <button type="button" disabled={saving} onClick={() => { setShowForm(value => !value); setSaved(false); }} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-navy-900 text-white disabled:opacity-50" aria-expanded={showForm}>
      {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Close" : "Add Recommendation"}
    </button>}
    {saved && <p role="status" className="text-sm text-mint-700">Recommendation saved successfully.</p>}
      {canEdit&&showForm&&<Card><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wide text-signal-blue font-semibold">New shared draft</p><h3 className="font-display text-xl text-navy-900 mt-1">Add Recommendation</h3><p className="text-xs text-fog-500 mt-1">Add a recommendation for the selected month.</p></div><span className="text-[10px] px-2 py-1 rounded-full bg-signal-amber/15 text-signal-amber">DRAFT</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <label className="text-[10px] uppercase text-fog-400 md:col-span-2">Title / Finding<input value={form.title} onChange={event=>setForm(current=>({...current,title:event.target.value}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"/></label>
          <label className="text-[10px] uppercase text-fog-400">Platform<select value={form.relatedPlatform} onChange={event=>setForm(current=>({...current,relatedPlatform:event.target.value as Platform|""}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"><option value="">All / Cross-platform</option>{PLATFORMS.filter(Boolean).map(value=><option key={value} value={value}>{value}</option>)}</select></label>
          <label className="text-[10px] uppercase text-fog-400">Priority<select value={form.priority} onChange={event=>setForm(current=>({...current,priority:event.target.value as Priority}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case">{PRIORITIES.map(value=><option key={value}>{value}</option>)}</select></label>
          {[["Evidence / Data","data"],["What we observed","observation"],["What it may mean","interpretation"],["Working hypothesis","hypothesis"],["Recommended move","recommendedAction"]].map(([label,key])=><label key={key} className={`text-[10px] uppercase text-fog-400 ${key==="recommendedAction"?"md:col-span-2":""}`}>{label}<textarea value={(form as any)[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))} rows={key==="recommendedAction"?3:2} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"/></label>)}
          <label className="text-[10px] uppercase text-fog-400">Added by<input value={form.addedBy} onChange={event=>setForm(current=>({...current,addedBy:event.target.value}))} className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm normal-case"/></label>
        </div>
        <button disabled={saving||!form.title.trim()||!form.data.trim()||!form.observation.trim()||!form.interpretation.trim()||!form.recommendedAction.trim()} onClick={saveRecommendation} className="inline-flex items-center gap-2 mt-4 rounded-xl bg-navy-900 disabled:opacity-40 text-white px-4 py-2.5 text-xs font-semibold">{saving?<LoaderCircle size={14} className="animate-spin"/>:<Save size={14}/>}Save to Google Sheet</button>{saveError&&<p className="text-xs text-signal-coral mt-3">{saveError}</p>}
      </Card>}
  </div>;
}

export type CreativeDirection = "Old" | "New" | "Transition" | "Unassigned";
export const NEW_CRITERIA = [
  { key:"hook", label:"Hook", weight:20 },
  { key:"story", label:"Storytelling", weight:15 },
  { key:"human", label:"Human care", weight:15 },
  { key:"proof", label:"Visual proof", weight:15 },
  { key:"experience", label:"Premium experience", weight:15 },
  { key:"brand", label:"Brand signature", weight:10 },
  { key:"platform", label:"Platform fit", weight:10 },
] as const;
const OLD_CRITERIA = [
  { key:"idea", label:"Idea" }, { key:"hook", label:"Hook" },
  { key:"script", label:"Script / Copy" }, { key:"design", label:"Design" },
  { key:"editing", label:"Editing" }, { key:"brandConsistency", label:"Branding" },
  { key:"cta", label:"CTA" },
] as const;
const validScore=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;

/** Shared metadata comes through the existing authenticated Review Basis field. */
export function directionReview(item:any) {
  let record:any=null;
  try { const parsed=JSON.parse(String(item.reviewBasis||"")); if(parsed.schema==="direction-v1") record=parsed; } catch { /* Legacy prose is not a direction classification. */ }
  const selected=record?.direction;
  const direction:CreativeDirection=["Old","New","Transition"].includes(selected)?selected
    : /^\d{4}-\d{2}$/.test(String(item.month))&&item.month<"2026-10"?"Old":"Unassigned";
  const newRubric=direction==="New"||direction==="Transition";
  if(newRubric) {
    const values=Array.isArray(record?.scores)?record.scores:[];
    const complete=values.length===7&&values.every(validScore)&&Boolean(String(item.reviewer||"").trim());
    return {direction,score:complete?Math.round(values.reduce((sum:number,v:number,i:number)=>sum+v*NEW_CRITERIA[i].weight,0)/100):null,
      components:NEW_CRITERIA.map((c,i)=>({...c,score:validScore(values[i])?values[i]:null})),reviewed:complete};
  }
  const legacy=direction==="Old"&&item.reviewStatus==="Reviewed"&&validScore(item.creativeScore)&&Boolean(String(item.reviewer||"").trim());
  return {direction,score:legacy?item.creativeScore:null,reviewed:legacy,
    components:(direction==="Unassigned"?[]:OLD_CRITERIA.filter(c=>c.key!=="editing"||/video|reel|short/i.test(String(item.format||"")))).map(c=>({key:c.key,label:c.label,weight:0,score:legacy&&typeof item.scores?.[c.key]==="number"&&item.scores[c.key]>=0&&item.scores[c.key]<=5?item.scores[c.key]*20:null}))};
}

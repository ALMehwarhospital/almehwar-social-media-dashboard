import { isVideoCreative } from "./creativeInventory";
export type CreativeDirection="Old"|"New"|"Transition"|"Unassigned";
export const NEW_CRITERIA=[
 {key:"hook",label:"Hook",anchors:["No clear opening","Generic opening","Clear problem or benefit","Immediate relevant hook","Specific compelling hook with a fulfilled payoff"]},
 {key:"story",label:"Storytelling",anchors:["No clear progression","Disconnected information","Clear beginning and value","Situation, medical value and coherent resolution","Every element advances a focused memorable story"]},
 {key:"human",label:"Human care",anchors:["No human care shown","Human presence only","A relevant care interaction","Listening, reassurance or personal care clearly shown","Specific authentic interactions carry the message"]},
 {key:"proof",label:"Visual proof",anchors:["No supporting evidence","Decorative or unrelated shots","Some visuals support the claim","Clear relevant demonstrations support the message","Every key claim has a clear relevant visual proof"]},
 {key:"experience",label:"Premium experience",anchors:["No care experience shown","General luxury claim only","One relevant privacy or care detail","Specific privacy or personalized care details","A coherent patient experience demonstrates the promised standard"]},
 {key:"brand",label:"Brand signature",anchors:["Off-brand","Logo without consistent execution","Recognizable identity and appropriate tone","Consistent typography, palette and medical credibility","Distinctive consistent execution without excess branding"]},
 {key:"platform",label:"Platform fit",anchors:["Unusable format or cover","Major readability or pacing issues","Readable appropriate format","Purposeful cover, framing and pace for the platform","Consistently effective native execution throughout"]},
] as const;
const OLD_CRITERIA=[{key:"idea",label:"Idea"},{key:"hook",label:"Hook"},{key:"script",label:"Script / Copy"},{key:"design",label:"Design"},{key:"editing",label:"Editing"},{key:"brandConsistency",label:"Branding"},{key:"cta",label:"CTA"}] as const;
export const OLD_VIDEO_WEIGHTS=[15,20,15,15,15,10,10];
export const OLD_STATIC_WEIGHTS=[20,15,20,20,0,10,15];
export const DIRECTOR_CRITERIA = {
 Old: [
  {key:"message",label:"Message & relevance",question:"One clear useful message for the intended audience"},
  {key:"credibility",label:"Medical credibility",question:"Specific service, expert or clearly explained medical value"},
  {key:"design",label:"Visual clarity",question:"Readable hierarchy; visuals support the message without clutter"},
  {key:"brand",label:"Brand consistency",question:"Recognizable AlMehwar identity and credible professional tone"},
  {key:"action",label:"Action & platform fit",question:"Purposeful next step; suitable framing, cover and pacing"},
 ],
 New: [
  {key:"hook",label:"Hook & relevance",question:"A specific audience need captures attention immediately"},
  {key:"story",label:"Story & medical value",question:"A clear situation, meaningful care and a coherent payoff"},
  {key:"care",label:"Human care & experience",question:"Observable reassurance, personal care or patient experience"},
  {key:"proof",label:"Visual proof",question:"Relevant care or demonstrations support the claims; decorative shots are not proof"},
  {key:"execution",label:"Brand & native execution",question:"Premium identity, readable design and purposeful platform execution"},
 ],
} as const;
export const DIRECTOR_ANCHORS=[{points:0,label:"Absent / contradicts the brief"},{points:5,label:"Present, but weak or generic"},{points:10,label:"Clear basic execution"},{points:15,label:"Strong, specific execution"},{points:20,label:"Consistently excellent execution"}];
const finite=(v:any)=>typeof v==="number"&&Number.isFinite(v);
export function directionReview(item:any) {
 let record:any=null;try{const p=JSON.parse(String(item.reviewBasis||""));if(["direction-v1","direction-v2","creative-v3"].includes(p.schema))record=p;}catch{/* Archived prose remains in source. */}
 const direction:CreativeDirection=["Old","New","Transition"].includes(record?.direction)?record.direction:/^\d{4}-\d{2}$/.test(String(item.month))&&item.month<"2026-10"?"Old":"Unassigned";
 const verified=["direction-v2","creative-v3"].includes(record?.schema)&&record?.verified===true&&Boolean(String(record?.evidence||"").trim())&&Boolean(String(item.reviewer||"").trim());
 const archivedScore=finite(item.creativeScore)?item.creativeScore:null;
 const reviewType=/\bAI\b/i.test(String(item.reviewer))?verified?"Verified AI review":"Archived AI review":verified?"Verified review":"Review pending";
 if(record?.schema==="creative-v3") {
  const criteria=direction==="Old"?DIRECTOR_CRITERIA.Old:DIRECTOR_CRITERIA.New;
  const scores=record.scores, reasons=record.reasons;
  const complete=verified&&direction!=="Unassigned"&&Array.isArray(scores)&&scores.length===5&&scores.every((v:any)=>[0,5,10,15,20].includes(v))&&Array.isArray(reasons)&&reasons.length===5&&reasons.every((s:any)=>typeof s==="string"&&s.trim());
  return {direction,reviewed:complete,score:complete?scores.reduce((s:number,v:number)=>s+v,0):null,archivedScore,reviewType,evidence:record.evidence,reference:"Director rubric v3 · internal · 5 × 20 points",components:criteria.map((c,i)=>({...c,weight:20,score:complete?scores[i]*5:null,points:complete?scores[i]:null,maxPoints:20,reason:complete?reasons[i]:c.question}))};
 }
 if(direction==="New"||direction==="Transition"){
  const values=Array.isArray(record?.scores)?record.scores:[];const complete=verified&&values.length===7&&values.every((v:any)=>[0,25,50,75,100].includes(v));
  return {direction,reviewed:complete,score:complete?Math.round(values.reduce((s:number,v:number)=>s+v,0)/7):null,archivedScore,reviewType,evidence:record?.evidence||"",reference:"Premium rubric v1 · internal · equal weights",components:NEW_CRITERIA.map((c,i)=>({...c,weight:100/7,score:complete?values[i]:null}))};
 }
 const weights=isVideoCreative(item)?OLD_VIDEO_WEIGHTS:OLD_STATIC_WEIGHTS;
 const scored=OLD_CRITERIA.map((c,i)=>({...c,weight:weights[i],value:item.scores?.[c.key]}));
 const required=["idea","hook","script","design","brandConsistency",...(isVideoCreative(item)?["editing"]:[])];
 const valid=(v:any)=>finite(v)&&v>=1&&v<=5;
 const complete=direction==="Old"&&verified&&required.every(k=>valid(item.scores?.[k]))&&scored.every(c=>c.weight===0||c.value==null||valid(c.value));
 const included=scored.filter(c=>c.weight>0&&valid(c.value)),total=included.reduce((s,c)=>s+c.weight,0);
 return {direction,reviewed:complete,score:complete&&total?Math.round(included.reduce((s,c)=>s+c.value*c.weight,0)/total*20):null,archivedScore,reviewType,evidence:record?.evidence||"",reference:"Old rubric v1 · internal · original source weights",components:direction==="Unassigned"?[]:scored.filter(c=>c.weight>0&&(!complete||c.value!=null)).map(c=>({...c,baseWeight:c.weight,weight:complete&&total?c.weight/total*100:c.weight,score:complete&&valid(c.value)?c.value*20:null}))};
}

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
const finite=(v:any)=>typeof v==="number"&&Number.isFinite(v);
export function directionReview(item:any) {
 let record:any=null;try{const p=JSON.parse(String(item.reviewBasis||""));if(["direction-v1","direction-v2"].includes(p.schema))record=p;}catch{/* Archived prose remains in source. */}
 const direction:CreativeDirection=["Old","New","Transition"].includes(record?.direction)?record.direction:/^\d{4}-\d{2}$/.test(String(item.month))&&item.month<"2026-10"?"Old":"Unassigned";
 const verified=record?.schema==="direction-v2"&&record?.verified===true&&Boolean(String(record?.evidence||"").trim())&&Boolean(String(item.reviewer||"").trim());
 const archivedScore=finite(item.creativeScore)?item.creativeScore:null;
 const reviewType=/\bAI\b/i.test(String(item.reviewer))?verified?"Verified AI review":"Archived AI review":verified?"Verified review":"Review pending";
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

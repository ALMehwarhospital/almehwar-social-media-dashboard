import type { ActionPlanItem, Insight, Platform, Priority } from "../types/dashboard";

export type RecommendationDecision = "Draft" | "Discussed" | "Approved" | "Rejected" | "Added to Action Plan";

export interface LocalRecommendation extends Insight {
  source:"Browser Draft";
  decision:RecommendationDecision;
  teamComment:string;
  addedBy:string;
  createdAt:string;
  updatedAt:string;
}

export interface LocalActionPlanItem extends ActionPlanItem {
  source:"Browser Draft";
  sourceRecommendationId:string;
  createdAt:string;
}

const RECOMMENDATIONS_KEY="almehwar.recommendationDrafts.v1";
const ACTIONS_KEY="almehwar.actionDrafts.v1";
export const DECISION_DRAFT_EVENT="almehwar:decision-drafts-updated";

function read<T>(key:string):T[] {
  if(typeof window==="undefined") return [];
  try {
    const parsed=JSON.parse(window.localStorage.getItem(key)||"[]");
    return Array.isArray(parsed)?parsed:[];
  } catch { return []; }
}

function write<T>(key:string,items:T[]) {
  window.localStorage.setItem(key,JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(DECISION_DRAFT_EVENT));
}

function id(prefix:string) {
  return `${prefix}-${typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function listLocalRecommendations():LocalRecommendation[] { return read<LocalRecommendation>(RECOMMENDATIONS_KEY); }
export function listLocalActions():LocalActionPlanItem[] { return read<LocalActionPlanItem>(ACTIONS_KEY); }

export function createLocalRecommendation(input:{
  month:string;title:string;observation:string;data:string;interpretation:string;hypothesis?:string;
  recommendedAction:string;relatedPlatform?:Platform;priority:Priority;addedBy:string;
}):LocalRecommendation {
  const now=new Date().toISOString();
  const item:LocalRecommendation={id:id("recommendation"),...input,source:"Browser Draft",decision:"Draft",status:"Open",teamComment:"",createdAt:now,updatedAt:now};
  write(RECOMMENDATIONS_KEY,[item,...listLocalRecommendations()]);
  return item;
}

export function updateLocalRecommendation(itemId:string,patch:Partial<Pick<LocalRecommendation,"decision"|"teamComment"|"status">>) {
  const items=listLocalRecommendations().map(item=>item.id===itemId?{...item,...patch,updatedAt:new Date().toISOString()}:item);
  write(RECOMMENDATIONS_KEY,items);
}

export function createLocalAction(input:{recommendation:LocalRecommendation;owner:string;expectedImpact:string;targetKpi:string;baseline?:string;target?:string;deadline?:string;testPeriod?:string;}):LocalActionPlanItem {
  const item:LocalActionPlanItem={
    id:id("action"),month:input.recommendation.month,problem:input.recommendation.title,
    action:input.recommendation.recommendedAction,owner:input.owner,priority:input.recommendation.priority||"Medium",
    expectedImpact:input.expectedImpact,status:"Planned",targetKpi:input.targetKpi,baseline:input.baseline||undefined,
    target:input.target||undefined,deadline:input.deadline||undefined,testPeriod:input.testPeriod||undefined,
    addedBy:"Team",source:"Browser Draft",sourceRecommendationId:input.recommendation.id,createdAt:new Date().toISOString(),
  };
  write(ACTIONS_KEY,[item,...listLocalActions()]);
  updateLocalRecommendation(input.recommendation.id,{decision:"Added to Action Plan",status:"Converted"});
  return item;
}

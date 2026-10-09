import { DECISION_LIVE_API } from "./decisionLive";
import { getDashboardToken } from "./dashboardAuth";
import type { Platform, Priority } from "../types/dashboard";

type RecommendationDecision = "Draft" | "Discussed" | "Approved" | "Rejected" | "Added to Action Plan";

interface WriteResponse<T> {
  success: boolean;
  generatedAt?: string;
  result?: T;
  error?: string;
}

export interface RecommendationWriteInput {
  month: string;
  title: string;
  observation: string;
  data: string;
  interpretation: string;
  hypothesis?: string;
  recommendedAction: string;
  relatedPlatform?: Platform;
  priority: Priority;
  addedBy: string;
}

export interface ActionWriteInput {
  recommendationId: string;
  owner: string;
  expectedImpact: string;
  targetKpi: string;
  baseline?: string;
  target?: string;
  deadline?: string;
  testPeriod?: string;
  addedBy?: string;
}

async function postDecision<T>(action: string, payload: unknown): Promise<T> {
  const token = getDashboardToken();
  if (!token) throw new Error("Dashboard login is required.");
  const response = await fetch(DECISION_LIVE_API, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload, token }),
  });
  if (!response.ok) throw new Error(`Dashboard write source returned ${response.status}`);
  const json = await response.json() as WriteResponse<T>;
  if (!json.success) throw new Error(json.error || "The dashboard write was not saved.");
  return json.result as T;
}

export function createSharedRecommendation(input: RecommendationWriteInput) {
  return postDecision<{ id: string; row: number }>("createRecommendation", input);
}

export function updateSharedRecommendation(input: {
  id: string;
  decision: RecommendationDecision;
  teamComment?: string;
}) {
  return postDecision<{ id: string; decision: RecommendationDecision }>("updateRecommendation", input);
}

export function createSharedAction(input: ActionWriteInput) {
  return postDecision<{ id: string; row: number }>("createAction", input);
}

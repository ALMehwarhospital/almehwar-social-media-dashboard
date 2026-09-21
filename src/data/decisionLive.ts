import type { ActionPlanItem, Insight } from "../types/dashboard";

export const DECISION_LIVE_API = "https://script.google.com/macros/s/AKfycbypAHZgLI5YhTnqkw2bviO4-DL446iOP2Sw1cmcLmf5eajComltTpZ4HHzRwIdHN5ef/exec";
const SOCIAL_LIVE_SNAPSHOT = `${import.meta.env.BASE_URL}data/social-dashboard-live.json`;

export interface DecisionLiveResponse {
  success: boolean;
  mode: "LIVE";
  generatedAt: string;
  currentMonth: string;
  source: string;
  counts: {
    overview: number;
    contentHistorical: number;
    contentLive: number;
    videoHistorical: number;
    videoLive: number;
    creative: number;
    creativeReviewed: number;
    creativePending: number;
  };
  data: {
    overview: any[];
    content: any[];
    video: any[];
    creative: any[];
    recommendations: Array<Insight & {
      date?: string;
      type?: string;
      teamComment?: string;
      decision?: string;
      priority?: "High" | "Medium" | "Low";
      status?: string;
      addedBy?: string;
      lastUpdate?: string;
    }>;
    actionPlan: Array<ActionPlanItem & {
      date?: string;
      lastUpdate?: string;
    }>;
  };
}

export function decisionLiveConfigured() {
  return DECISION_LIVE_API.startsWith("https://script.google.com/macros/s/");
}

async function fetchJson(url:string, timeoutMs:number):Promise<DecisionLiveResponse>{
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Social Dashboard LIVE source returned ${response.status}`);
    const json = (await response.json()) as DecisionLiveResponse;
    if (!json.success) throw new Error("Social Dashboard LIVE source returned success=false");
    return json;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchDecisionSnapshot(): Promise<DecisionLiveResponse> {
  return fetchJson(`${SOCIAL_LIVE_SNAPSHOT}?t=${Date.now()}`, 10000);
}

export async function fetchDecisionApi(): Promise<DecisionLiveResponse> {
  if (!decisionLiveConfigured()) throw new Error("Social Dashboard LIVE API is not configured yet.");
  return fetchJson(`${DECISION_LIVE_API}?section=all&t=${Date.now()}`, 65000);
}

export async function fetchDecisionLive(): Promise<DecisionLiveResponse> {
  let lastError:unknown = new Error("Social Dashboard data is unavailable");

  try {
    return await fetchDecisionApi();
  } catch (error) {
    lastError = error;
  }

  try {
    return await fetchDecisionSnapshot();
  } catch (error) {
    lastError = error;
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

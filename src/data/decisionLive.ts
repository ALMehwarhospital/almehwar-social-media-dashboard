import type { ActionPlanItem, Insight } from "../types/dashboard";

export const DECISION_LIVE_API = "https://script.google.com/macros/s/AKfycbypAHZgLI5YhTnqkw2bviO4-DL446iOP2Sw1cmcLmf5eajComltTpZ4HHzRwIdHN5ef/exec";

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

export async function fetchDecisionLive(): Promise<DecisionLiveResponse> {
  if (!decisionLiveConfigured()) {
    throw new Error("Social Dashboard LIVE API is not configured yet.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const separator = DECISION_LIVE_API.includes("?") ? "&" : "?";
    const response = await fetch(`${DECISION_LIVE_API}${separator}section=all&t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Social Dashboard LIVE API returned ${response.status}`);

    const json = (await response.json()) as DecisionLiveResponse;
    if (!json.success) throw new Error("Social Dashboard LIVE API returned success=false");
    return json;
  } finally {
    window.clearTimeout(timeout);
  }
}

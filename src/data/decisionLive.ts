import type { ActionPlanItem, CreativeAnalysis, Insight } from "../types/dashboard";

export const DECISION_LIVE_API = "";

export interface DecisionLiveResponse {
  success: boolean;
  mode: "LIVE";
  generatedAt: string;
  source: string;
  counts: {
    creative: number;
    recommendations: number;
    actionPlan: number;
  };
  data: {
    creative: CreativeAnalysis[];
    recommendations: Array<Insight & {
      sourceMonth?: string;
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
      sourceMonth?: string;
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
    throw new Error("Decision LIVE API is not configured yet.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const separator = DECISION_LIVE_API.includes("?") ? "&" : "?";
    const response = await fetch(`${DECISION_LIVE_API}${separator}section=all&t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Decision LIVE API returned ${response.status}`);

    const json = (await response.json()) as DecisionLiveResponse;
    if (!json.success) throw new Error("Decision LIVE API returned success=false");
    return json;
  } finally {
    window.clearTimeout(timeout);
  }
}

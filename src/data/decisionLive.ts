import type { ActionPlanItem, Insight } from "../types/dashboard";
import { DECISION_LIVE_API } from "./apiConfig";
import { getDashboardToken } from "./dashboardAuth";

export { DECISION_LIVE_API } from "./apiConfig";
const SOCIAL_LIVE_SNAPSHOT = `${import.meta.env.BASE_URL}data/social-dashboard-live.json`;
const SOCIAL_HISTORY_PREFIX = `${import.meta.env.BASE_URL}data/social-history-`;
const SOCIAL_HISTORY_INDEX = `${import.meta.env.BASE_URL}data/social-history-index.json`;

export interface DecisionHistoryArchive {
  source: string;
  generatedAt: string;
  month: string;
  content: any[];
  video: any[];
  counts: { content: number; video: number };
}

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
    inboundCalls?: number;
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
    inboundCalls?: any[];
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

async function fetchDecisionArchiveMonth(month:string): Promise<DecisionHistoryArchive> {
  const response = await fetch(`${SOCIAL_HISTORY_PREFIX}${month}.json?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Social history archive returned ${response.status}`);
  const archive = await response.json() as DecisionHistoryArchive;
  if (!archive?.month || !Array.isArray(archive.content) || !Array.isArray(archive.video)) {
    throw new Error("Social history archive is invalid");
  }
  return archive;
}

export async function fetchDecisionHistoryArchives(): Promise<DecisionHistoryArchive[]> {
  let months:string[] = [];
  try {
    const response = await fetch(`${SOCIAL_HISTORY_INDEX}?t=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const index = await response.json() as { months?:unknown };
      if (Array.isArray(index.months)) months = index.months.filter((month):month is string=>/^\d{4}-\d{2}$/.test(String(month)));
    }
  } catch {
    // A missing index is safe; the API/snapshot remains the primary source.
  }
  const settled = await Promise.allSettled(months.map(fetchDecisionArchiveMonth));
  return settled.flatMap(result=>result.status==="fulfilled" ? [result.value] : []);
}

export async function fetchDecisionHistoryArchive(): Promise<DecisionHistoryArchive> {
  const archives = await fetchDecisionHistoryArchives();
  if (!archives.length) throw new Error("No social history archives are available");
  return archives[archives.length-1];
}

function mergeRows(current:any[], historical:any[]) {
  const merged = new Map<string,any>();
  const canonicalUrl = (value:unknown) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");
  const key = (row:any) => {
    const stableUrl = canonicalUrl(row.url);
    const stableId = String(row.contentId || row.videoId || "").trim();
    const fallback = `${String(row.date || "").trim()}|${String(row.name || "").trim().toLowerCase()}`;
    return [row.month,row.platform,stableUrl || stableId || fallback].join("|");
  };
  for (const row of historical || []) merged.set(key(row), row);
  for (const row of current || []) merged.set(key(row), row);
  return [...merged.values()];
}

export function mergeDecisionHistory(response:DecisionLiveResponse, archive:DecisionHistoryArchive|null):DecisionLiveResponse {
  if (!archive) return response;
  const content = mergeRows(response.data.content, archive.content);
  const video = mergeRows(response.data.video, archive.video);
  const currentContent = content.filter(row=>row.month===response.currentMonth).length;
  const currentVideo = video.filter(row=>row.month===response.currentMonth).length;
  return {
    ...response,
    counts: {
      ...response.counts,
      contentHistorical: content.length-currentContent,
      contentLive: currentContent,
      videoHistorical: video.length-currentVideo,
      videoLive: currentVideo,
    },
    data: { ...response.data, content, video },
  };
}

export function mergeDecisionHistories(response:DecisionLiveResponse, archives:DecisionHistoryArchive[]):DecisionLiveResponse {
  return archives.reduce((current, archive)=>mergeDecisionHistory(current, archive), response);
}

export async function fetchDecisionApi(): Promise<DecisionLiveResponse> {
  if (!decisionLiveConfigured()) throw new Error("Social Dashboard LIVE API is not configured yet.");
  const token = getDashboardToken();
  if (!token) throw new Error("Dashboard login is required.");
  return fetchJson(`${DECISION_LIVE_API}?section=all&token=${encodeURIComponent(token)}&t=${Date.now()}`, 65000);
}

export async function fetchDecisionLive(): Promise<DecisionLiveResponse> {
  let lastError:unknown = new Error("Social Dashboard LIVE data is unavailable");

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

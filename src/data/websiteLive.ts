import { normalizeWebsiteResponse, sourceFreshness } from "../utils/websiteQuality";
import { websiteData } from "./websiteData";
export const WEBSITE_LIVE_API = "https://script.google.com/macros/s/AKfycbyWYEVWvc4pKdV-n5c3sOmz29Kt7Pbhyx1ct0mUmDY8u9jUO7N_IaBfYtVtYAWT7245/exec";

const WEBSITE_LIVE_SNAPSHOT = `${import.meta.env.BASE_URL}data/website-live.json`;
const WEBSITE_HISTORY_PREFIX = `${import.meta.env.BASE_URL}data/website-history-`;

export interface WebsiteLiveResponse {
  success: boolean;
  mode: "LIVE";
  periodMonth: string;
  generatedAt: string;
  lastSynced: string | null;
  sync: { ga4: string | null; searchConsole: string | null };
  data: {
    website: any[];
    traffic: any[];
    sources: any[];
    pages: any[];
    conversions: any[];
    searchConsole: { overview: any[]; details: any[] };
  };
}

export type WebsiteDeliveredResponse = WebsiteLiveResponse & {
  deliverySource: "api" | "snapshot" | "archive";
  deliveryNote?: string;
};

async function fetchJson(url: string, timeoutMs: number): Promise<WebsiteLiveResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Website source returned ${response.status}`);
    const json = (await response.json()) as WebsiteLiveResponse;
    if (!json.success) throw new Error("Website source returned success=false");
    if (!json.data || !/^\d{4}-\d{2}$/.test(json.periodMonth)) throw new Error("Invalid website response");
    return normalizeWebsiteResponse(json);
  } finally {
    window.clearTimeout(timeout);
  }
}

function historicalWebsite(month: string): WebsiteDeliveredResponse | null {
  const archived = websiteData[month];
  if (!archived) return null;
  return {
    success: true, mode: "LIVE", periodMonth: month, generatedAt: "", lastSynced: null,
    sync: { ga4: null, searchConsole: null }, deliverySource: "archive",
    deliveryNote: "Historical GA4 and Search Console archive, shared with Website Intelligence. Source sync timestamps were not recorded.",
    data: {
      website: [{ periodMonth: month, ...archived.overview, viewsSession: archived.overview.viewsPerSession }],
      traffic: [], sources: [], pages: [],
      conversions: [{ periodMonth: month, ...archived.conversions }],
      searchConsole: { overview: [{ periodMonth: month, clicks: archived.search.clicks, impressions: archived.search.impressions, ctr: archived.search.ctr, averagePosition: archived.search.avgPosition, status: "Verified" }], details: [] },
    },
  };
}

const inFlight = new Map<string, Promise<WebsiteDeliveredResponse>>();
export function fetchWebsiteLive(month?: string, options: { refresh?: boolean; onSnapshot?: (data: WebsiteDeliveredResponse) => void } = {}): Promise<WebsiteDeliveredResponse> {
  const key = month || "current";
  if (!options.refresh && inFlight.has(key)) return inFlight.get(key)!;
  const request = loadWebsite(month, options.refresh, options.onSnapshot).finally(() => { if (inFlight.get(key) === request) inFlight.delete(key); });
  inFlight.set(key, request);
  return request;
}

async function loadWebsite(month?: string, refresh = false, onSnapshot?: (data: WebsiteDeliveredResponse) => void): Promise<WebsiteDeliveredResponse> {
  const stamp = Date.now();
  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit" }).format(new Date());
  const expectedMonth = month || currentMonth;
  const historical = month ? historicalWebsite(month) : null;
  if (historical) return historical;
  if (month && month < currentMonth) {
    try {
      const archived = await fetchJson(`${WEBSITE_HISTORY_PREFIX}${month}.json?t=${stamp}`, 10000);
      if (archived.periodMonth === month) return { ...archived, deliverySource: "snapshot" };
    } catch {
      // Older months without a dedicated archive continue through the existing routes.
    }
  }
  let snapshotError: unknown;
  let fallback: WebsiteDeliveredResponse | null = null;
  try {
    const snapshot = await fetchJson(`${WEBSITE_LIVE_SNAPSHOT}?t=${stamp}`, 10000);
    if (snapshot.periodMonth === expectedMonth) {
      fallback = { ...snapshot, deliverySource: "snapshot" };
      const stale = sourceFreshness(snapshot.sync?.ga4, snapshot.periodMonth, 36).stale || sourceFreshness(snapshot.sync?.searchConsole, snapshot.periodMonth, 48).stale;
      if (!refresh && !stale) return fallback;
      onSnapshot?.({ ...fallback, deliveryNote: "Showing the available snapshot while checking the website API for a newer report." });
    }
  } catch (error) {
    snapshotError = error;
  }

  try {
    const monthParam = month ? `&month=${encodeURIComponent(month)}` : "";
    const api = await fetchJson(`${WEBSITE_LIVE_API}?t=${stamp}${monthParam}`, 30000);
    if (api.periodMonth !== expectedMonth) {
      throw new Error(`Website API returned ${api.periodMonth} instead of ${expectedMonth}. Deploy the month-aware API update.`);
    }
    return { ...api, deliverySource: "api" };
  } catch (apiError) {
    if (fallback) return { ...fallback, deliveryNote: "Direct website refresh failed. Showing the last available snapshot with its original source timestamps." };
    const lastError = apiError ?? snapshotError;
    if (lastError instanceof DOMException && lastError.name === "AbortError") {
      throw new Error("Website data request timed out");
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}


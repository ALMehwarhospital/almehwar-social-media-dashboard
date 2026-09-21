export const WEBSITE_LIVE_API = "https://script.google.com/macros/s/AKfycbyWYEVWvc4pKdV-n5c3sOmz29Kt7Pbhyx1ct0mUmDY8u9jUO7N_IaBfYtVtYAWT7245/exec";

const WEBSITE_LIVE_SNAPSHOT = `${import.meta.env.BASE_URL}data/website-live.json`;

export interface WebsiteLiveResponse {
  success: boolean;
  mode: "LIVE";\n  deliverySource?: "api" | "snapshot";
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

async function fetchJson(url: string, timeoutMs: number): Promise<WebsiteLiveResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`LIVE API returned ${response.status}`);

    const json = (await response.json()) as WebsiteLiveResponse;
    if (!json.success) throw new Error("LIVE API returned success=false");
    return json;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchWebsiteLive(): Promise<WebsiteLiveResponse> {
  const stamp = Date.now();
  let lastError: unknown = new Error("Website data is unavailable");

  try {
    const api = await fetchJson(`${WEBSITE_LIVE_API}?t=${stamp}`, 20000);
    return { ...api, deliverySource: "api" };
  } catch (error) {
    lastError = error;
  }

  try {
    const snapshot = await fetchJson(`${WEBSITE_LIVE_SNAPSHOT}?t=${stamp}`, 10000);
    return { ...snapshot, deliverySource: "snapshot" };
  } catch (error) {
    lastError = error;
  }

  if (lastError instanceof DOMException && lastError.name === "AbortError") {
    throw new Error("Website data request timed out");
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

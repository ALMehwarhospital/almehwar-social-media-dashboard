export const WEBSITE_LIVE_API = "https://script.google.com/macros/s/AKfycbyWYEVWvc4pKdV-n5c3sOmz29Kt7Pbhyx1ct0mUmDY8u9jUO7N_IaBfYtVtYAWT7245/exec";

const WEBSITE_LIVE_SNAPSHOT = `${import.meta.env.BASE_URL}data/website-live.json`;

export type WebsiteDeliverySource = "api" | "snapshot";

export interface WebsiteLiveResponse {
  success: boolean;
  mode: "LIVE";
  periodMonth: string;
  generatedAt: string;
  lastSynced: string | null;
  sync: { ga4: string | null; searchConsole: string | null };
  deliverySource?: WebsiteDeliverySource;
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

    if (!response.ok) throw new Error(`Website source returned ${response.status}`);

    const json = (await response.json()) as WebsiteLiveResponse;
    if (!json.success) throw new Error("Website source returned success=false");
    return json;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchWebsiteLive(): Promise<WebsiteLiveResponse> {
  const stamp = Date.now();
  let apiError: unknown = null;

  // The API is authoritative. The checked-in snapshot is only a fallback cache.
  try {
    const data = await fetchJson(`${WEBSITE_LIVE_API}?t=${stamp}`, 20000);
    return { ...data, deliverySource: "api" };
  } catch (error) {
    apiError = error;
  }

  try {
    const data = await fetchJson(`${WEBSITE_LIVE_SNAPSHOT}?t=${stamp}`, 10000);
    return { ...data, deliverySource: "snapshot" };
  } catch (snapshotError) {
    const lastError = snapshotError || apiError;
    if (lastError instanceof DOMException && lastError.name === "AbortError") {
      throw new Error("Website data request timed out");
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

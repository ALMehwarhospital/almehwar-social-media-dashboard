export const WEBSITE_LIVE_API = "https://script.google.com/macros/s/AKfycbyWYEVWvc4pKdV-n5c3sOmz29Kt7Pbhyx1ct0mUmDY8u9jUO7N_IaBfYtVtYAWT7245/exec";

const WEBSITE_LIVE_SNAPSHOT = `${import.meta.env.BASE_URL}data/website-live.json`;

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
  const attempts = [
    { url: `${WEBSITE_LIVE_SNAPSHOT}?t=${stamp}`, timeout: 15000 },
    { url: `${WEBSITE_LIVE_API}?t=${stamp}`, timeout: 15000 },
  ];

  let lastError: unknown = new Error("LIVE website data is unavailable");

  for (const attempt of attempts) {
    try {
      return await fetchJson(attempt.url, attempt.timeout);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof DOMException && lastError.name === "AbortError") {
    throw new Error("LIVE data request timed out");
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

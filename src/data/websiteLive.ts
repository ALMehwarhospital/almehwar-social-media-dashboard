export const WEBSITE_LIVE_API = "https://script.google.com/macros/s/AKfycbyWYEVWvc4pKdV-n5c3sOmz29Kt7Pbhyx1ct0mUmDY8u9jUO7N_IaBfYtVtYAWT7245/exec";

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

export async function fetchWebsiteLive(): Promise<WebsiteLiveResponse> {
  const response = await fetch(`${WEBSITE_LIVE_API}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`LIVE API returned ${response.status}`);
  const json = (await response.json()) as WebsiteLiveResponse;
  if (!json.success) throw new Error("LIVE API returned success=false");
  return json;
}

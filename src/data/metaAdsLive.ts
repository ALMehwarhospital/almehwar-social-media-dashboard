import { DECISION_LIVE_API } from "./apiConfig";
import { getDashboardToken } from "./dashboardAuth";

export interface MetaAdsCampaign {
  month: string;
  dateStart: string;
  dateStop: string;
  campaignId: string;
  name: string;
  objective: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  leads: number | null;
  messagingConversations: number | null;
  messagingFirstReplies: number | null;
  syncedAt: string;
}

export interface MetaAdsResponse {
  success: boolean;
  source: string;
  currency: string | null;
  generatedAt: string;
  campaigns: MetaAdsCampaign[];
  ads?: MetaAdsLinkedAd[];
  error?: string;
}

export interface MetaAdsLinkedAd {
  campaignId: string;
  adId: string;
  adName: string;
  status: string;
  facebookPostId: string;
  instagramMediaId: string;
  instagramUrl: string;
  creativeId: string;
}

export async function fetchMetaAds(): Promise<MetaAdsResponse> {
  const token = getDashboardToken();
  if (!token) throw new Error("Dashboard login is required.");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      `${DECISION_LIVE_API}?section=metaads&token=${encodeURIComponent(token)}&t=${Date.now()}`,
      { cache: "no-store", signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`Meta Ads API returned ${response.status}`);
    const json = await response.json() as MetaAdsResponse;
    if (!json.success || !Array.isArray(json.campaigns)) {
      throw new Error(json.error || "Meta Ads API is not deployed yet.");
    }
    return json;
  } finally {
    window.clearTimeout(timeout);
  }
}

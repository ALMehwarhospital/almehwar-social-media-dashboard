import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  decisionLiveConfigured,
  fetchDecisionApi,
  fetchDecisionSnapshot,
  type DecisionLiveResponse,
} from "../data/decisionLive";

const REFRESH_MS = 5 * 60 * 1000;

export type DeliverySource = "api" | "snapshot" | null;

interface DecisionLiveState {
  data: DecisionLiveResponse | null;
  error: string | null;
  loading: boolean;
  deliverySource: DeliverySource;
  isLive: boolean;
  isSnapshot: boolean;
  configured: boolean;
  sourceLabel: string;
  asOf: string | null;
}

const DecisionLiveContext = createContext<DecisionLiveState | null>(null);

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function denominatorFor(platform: string): "Reach" | "Views" | "Impressions" {
  if (platform === "Facebook" || platform === "Instagram") return "Reach";
  if (platform === "TikTok") return "Views";
  return "Impressions";
}

function denominatorValue(row: any, denominator?: string): number | null {
  const basis = denominator || denominatorFor(String(row.platform || ""));
  const key =
    basis === "Reach" ? "reach" :
    basis === "Views" ? "views" :
    basis === "Impressions" ? "impressions" :
    "";
  const value = key ? row[key] : null;
  return finite(value) ? value : null;
}

function normalizeRateFromPercentagePoints(value: unknown): number | null {
  return finite(value) ? value / 100 : null;
}

function canonicalEngagementRate(row: any): number | null {
  const denominator = denominatorValue(row, row.engagementDenominator);
  if (finite(row.interactions) && denominator !== null && denominator > 0) {
    return row.interactions / denominator;
  }
  return normalizeRateFromPercentagePoints(row.engagementRate);
}

function canonicalValueRate(row: any): number | null {
  const denominator = denominatorValue(row, row.engagementDenominator);
  const shares = finite(row.shares) ? row.shares : null;
  const saves = finite(row.saves) ? row.saves : null;
  if ((shares !== null || saves !== null) && denominator !== null && denominator > 0) {
    return (shares ?? 0) / denominator + (saves ?? 0) / denominator;
  }
  return normalizeRateFromPercentagePoints(row.valueRate);
}

function normalizeOverview(row: any) {
  return {
    ...row,
    engagementRate: canonicalEngagementRate(row),
  };
}

function normalizeContent(row: any) {
  return {
    ...row,
    engagementRate: canonicalEngagementRate(row),
    valueRate: canonicalValueRate(row),
  };
}

const VIDEO_RATE_FIELDS = [
  "avgPercentWatched",
  "completionRate",
  "retention3s",
  "retention25",
  "retention50",
  "retention75",
] as const;

function normalizeVideo(row: any) {
  const normalized: any = {
    ...row,
    engagementRate: canonicalEngagementRate(row),
  };
  for (const key of VIDEO_RATE_FIELDS) {
    normalized[key] = normalizeRateFromPercentagePoints(row[key]);
  }
  return normalized;
}

function normalizeDecisionResponse(input: DecisionLiveResponse): DecisionLiveResponse {
  return {
    ...input,
    data: {
      ...input.data,
      overview: (input.data.overview ?? []).map(normalizeOverview),
      content: (input.data.content ?? []).map(normalizeContent),
      video: (input.data.video ?? []).map(normalizeVideo),
      creative: input.data.creative ?? [],
      recommendations: input.data.recommendations ?? [],
      actionPlan: input.data.actionPlan ?? [],
    },
  };
}

export function DecisionLiveProvider({ children }: { children: ReactNode }) {
  const configured = decisionLiveConfigured();
  const [data, setData] = useState<DecisionLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(configured);
  const [deliverySource, setDeliverySource] = useState<DeliverySource>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let active = true;

    const apply = (response: DecisionLiveResponse, source: Exclude<DeliverySource, null>) => {
      if (!active) return;
      setData(normalizeDecisionResponse(response));
      setDeliverySource(source);
      setError(null);
    };

    const loadApi = async () => {
      try {
        const response = await fetchDecisionApi();
        apply(response, "api");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    const initialLoad = async () => {
      setLoading(true);

      // Fast cache for first paint. It is explicitly labelled SNAPSHOT until
      // the authoritative Apps Script request succeeds.
      try {
        const snapshot = await fetchDecisionSnapshot();
        apply(snapshot, "snapshot");
      } catch {
        // Snapshot is optional; continue to the authoritative API.
      }

      await loadApi();
      if (active) setLoading(false);
    };

    initialLoad();

    const timer = window.setInterval(loadApi, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadApi();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [configured]);

  const value = useMemo<DecisionLiveState>(() => {
    const isLive = deliverySource === "api" && Boolean(data?.success);
    const isSnapshot = deliverySource === "snapshot" && Boolean(data?.success);
    return {
      data,
      error,
      loading,
      deliverySource,
      isLive,
      isSnapshot,
      configured,
      sourceLabel: isLive ? "LIVE API" : isSnapshot ? "SNAPSHOT" : "SOURCE UNAVAILABLE",
      asOf: data?.generatedAt ?? null,
    };
  }, [data, error, loading, deliverySource, configured]);

  return (
    <DecisionLiveContext.Provider value={value}>
      {children}
    </DecisionLiveContext.Provider>
  );
}

export function useDecisionLive() {
  const context = useContext(DecisionLiveContext);
  if (!context) {
    throw new Error("useDecisionLive must be used within DecisionLiveProvider");
  }
  return context;
}

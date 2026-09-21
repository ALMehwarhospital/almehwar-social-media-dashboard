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

export type DecisionDeliverySource = "api" | "snapshot" | null;

function normalizeRate(value: unknown): unknown {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  return Math.abs(value) > 1 ? value / 100 : value;
}

function normalizeRows(rows: any[]) {
  return rows.map((row) => ({
    ...row,
    engagementRate: normalizeRate(row.engagementRate),
    valueRate: normalizeRate(row.valueRate),
  }));
}

function normalizeDecisionResponse(response: DecisionLiveResponse): DecisionLiveResponse {
  return {
    ...response,
    data: {
      ...response.data,
      overview: normalizeRows(response.data.overview ?? []),
      content: normalizeRows(response.data.content ?? []),
      video: normalizeRows(response.data.video ?? []),
      creative: response.data.creative ?? [],
      recommendations: response.data.recommendations ?? [],
      actionPlan: response.data.actionPlan ?? [],
    },
  };
}

interface DecisionLiveState {
  data: DecisionLiveResponse | null;
  error: string | null;
  loading: boolean;
  configured: boolean;
  deliverySource: DecisionDeliverySource;
  isLive: boolean;
  sourceLabel: string;
  asOf: string | null;
}

const DecisionLiveContext = createContext<DecisionLiveState | null>(null);

export function DecisionLiveProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DecisionLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(decisionLiveConfigured());
  const [deliverySource, setDeliverySource] = useState<DecisionDeliverySource>(null);

  useEffect(() => {
    if (!decisionLiveConfigured()) {
      setLoading(false);
      return;
    }

    let active = true;

    const apply = (response: DecisionLiveResponse, source: Exclude<DecisionDeliverySource, null>) => {
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

      try {
        const snapshot = await fetchDecisionSnapshot();
        apply(snapshot, "snapshot");
      } catch {
        // Snapshot is only a fast cache. Failure here should not block the API attempt.
      }

      try {
        const response = await fetchDecisionApi();
        apply(response, "api");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setLoading(false);
      }
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
  }, []);

  const value = useMemo<DecisionLiveState>(() => ({
    data,
    error,
    loading,
    configured: decisionLiveConfigured(),
    deliverySource,
    isLive: deliverySource === "api",
    sourceLabel:
      deliverySource === "api"
        ? "LIVE API"
        : deliverySource === "snapshot"
          ? "SNAPSHOT"
          : "SOURCE UNAVAILABLE",
    asOf: data?.generatedAt ?? null,
  }), [data, error, loading, deliverySource]);

  return <DecisionLiveContext.Provider value={value}>{children}</DecisionLiveContext.Provider>;
}

export function useDecisionLive() {
  const value = useContext(DecisionLiveContext);
  if (!value) throw new Error("useDecisionLive must be used within DecisionLiveProvider");
  return value;
}

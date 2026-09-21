import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  decisionLiveConfigured,
  fetchDecisionApi,
  fetchDecisionSnapshot,
  type DecisionLiveResponse
} from "../data/decisionLive";

const REFRESH_MS = 5 * 60 * 1000;
type DeliverySource = "api" | "snapshot" | null;

interface DecisionLiveState {
  data: DecisionLiveResponse | null;
  error: string | null;
  loading: boolean;
  isLive: boolean;
  configured: boolean;
  deliverySource: DeliverySource;
}

const DecisionLiveContext = createContext<DecisionLiveState | null>(null);

function normalizeRates(response: DecisionLiveResponse): DecisionLiveResponse {
  const normalizeRow = (row: any) => {
    if (!row || typeof row !== "object") return row;
    const next = { ...row };
    for (const key of ["engagementRate", "valueRate"]) {
      if (typeof next[key] === "number" && Number.isFinite(next[key])) next[key] = next[key] / 100;
    }
    return next;
  };
  return {
    ...response,
    data: {
      ...response.data,
      overview: response.data.overview.map(normalizeRow),
      content: response.data.content.map(normalizeRow),
      video: response.data.video.map(normalizeRow),
      creative: response.data.creative.map(normalizeRow),
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

    const loadApi = async () => {
      try {
        const response = normalizeRates(await fetchDecisionApi());
        if (!active) return;
        setData(response);
        setDeliverySource("api");
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    const initialLoad = async () => {
      setLoading(true);
      try {
        const snapshot = normalizeRates(await fetchDecisionSnapshot());
        if (!active) return;
        setData(snapshot);
        setDeliverySource("snapshot");
        setError(null);
      } catch {
        // If the cache is unavailable, fall through to the API.
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

  const value = useMemo<DecisionLiveState>(() => ({
    data,
    error,
    loading,
    isLive: deliverySource === "api",
    configured,
    deliverySource,
  }), [data, error, loading, configured, deliverySource]);

  return <DecisionLiveContext.Provider value={value}>{children}</DecisionLiveContext.Provider>;
}

export function useDecisionLive() {
  const ctx = useContext(DecisionLiveContext);
  if (!ctx) throw new Error("useDecisionLive must be used within DecisionLiveProvider");
  return ctx;
}

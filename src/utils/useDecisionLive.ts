import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  decisionLiveConfigured,
  fetchDecisionApi,
  fetchDecisionSnapshot,
  type DecisionLiveResponse
} from "../data/decisionLive";
import { normalizeDecisionResponse } from "./normalizeDecisionResponse";

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
        const response = normalizeDecisionResponse(await fetchDecisionApi());
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
        const snapshot = normalizeDecisionResponse(await fetchDecisionSnapshot());
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

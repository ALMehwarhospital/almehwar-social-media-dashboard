import { useEffect, useState } from "react";
import {
  decisionLiveConfigured,
  fetchDecisionApi,
  fetchDecisionSnapshot,
  type DecisionLiveResponse
} from "../data/decisionLive";

const REFRESH_MS = 5 * 60 * 1000;

export function useDecisionLive() {
  const [data, setData] = useState<DecisionLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(decisionLiveConfigured());

  useEffect(() => {
    if (!decisionLiveConfigured()) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadApi = async () => {
      try {
        const response = await fetchDecisionApi();
        if (!active) return;
        setData(response);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    const initialLoad = async () => {
      setLoading(true);
      try {
        const snapshot = await fetchDecisionSnapshot();
        if (!active) return;
        setData(snapshot);
        setError(null);
        setLoading(false);
      } catch {
        try {
          const response = await fetchDecisionApi();
          if (!active) return;
          setData(response);
          setError(null);
        } catch (err) {
          if (!active) return;
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      // Refresh with the newest Apps Script data after the fast snapshot renders.
      loadApi();
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

  return {
    data,
    error,
    loading,
    isLive: Boolean(data?.success),
    configured: decisionLiveConfigured(),
  };
}

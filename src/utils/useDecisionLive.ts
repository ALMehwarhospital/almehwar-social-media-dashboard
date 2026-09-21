import { useEffect, useState } from "react";
import { decisionLiveConfigured, fetchDecisionLive, type DecisionLiveResponse } from "../data/decisionLive";

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

    const load = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const response = await fetchDecisionLive();
        if (!active) return;
        setData(response);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active && showLoading) setLoading(false);
      }
    };

    load(true);
    const timer = window.setInterval(() => load(false), REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") load(false);
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

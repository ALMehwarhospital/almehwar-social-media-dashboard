import { useEffect, useState } from "react";
import { decisionLiveConfigured, fetchDecisionLive, type DecisionLiveResponse } from "../data/decisionLive";

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
    setLoading(true);

    fetchDecisionLive()
      .then((response) => {
        if (!active) return;
        setData(response);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
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

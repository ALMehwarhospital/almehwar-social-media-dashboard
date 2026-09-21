import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { socialDashboard } from "../data/socialDashboard";
import { useDecisionLive } from "./useDecisionLive";
import type { ContentFormat, ContentPillar, Platform, SpendType } from "../types/dashboard";

interface FilterState {
  month: string;
  setMonth: (m: string) => void;
  platform: Platform | "All";
  setPlatform: (p: Platform | "All") => void;
  spendType: SpendType | "All";
  setSpendType: (s: SpendType | "All") => void;
  pillar: ContentPillar | "All";
  setPillar: (p: ContentPillar | "All") => void;
  format: ContentFormat | "All";
  setFormat: (f: ContentFormat | "All") => void;
  months: string[];
}

const FilterContext = createContext<FilterState | null>(null);

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const live = useDecisionLive();
  const fallbackMonth = currentMonthKey();
  const canonicalMonth = live.data?.currentMonth || fallbackMonth;
  const apiMonths = live.data
    ? [
        ...live.data.data.overview.map((r:any)=>r.month),
        ...live.data.data.content.map((r:any)=>r.month),
        ...live.data.data.video.map((r:any)=>r.month),
        ...live.data.data.creative.map((r:any)=>r.month),
      ].filter(Boolean)
    : [];
  const months = Array.from(new Set([...socialDashboard.meta.months, ...apiMonths, canonicalMonth])).sort();
  const [month, setMonth] = useState(canonicalMonth);
  const [platform, setPlatform] = useState<Platform | "All">("All");
  const [spendType, setSpendType] = useState<SpendType | "All">("All");
  const [pillar, setPillar] = useState<ContentPillar | "All">("All");
  const [format, setFormat] = useState<ContentFormat | "All">("All");

  const value = useMemo(
    () => ({
      month, setMonth,
      platform, setPlatform,
      spendType, setSpendType,
      pillar, setPillar,
      format, setFormat,
      months,
    }),
    [month, platform, spendType, pillar, format, months.join("|")]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

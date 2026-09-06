import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { socialDashboard } from "../data/socialDashboard";
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

export function FilterProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(socialDashboard.meta.currentMonth);
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
      months: socialDashboard.meta.months,
    }),
    [month, platform, spendType, pillar, format]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

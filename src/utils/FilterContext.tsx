import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  const browserMonth = currentMonthKey();

  const months = useMemo(() => {
    const values = new Set<string>(socialDashboard.meta.months);
    if (live.data?.currentMonth) values.add(live.data.currentMonth);
    for (const row of live.data?.data.overview ?? []) {
      if (typeof row.month === "string" && row.month) values.add(row.month);
    }
    for (const row of live.data?.data.content ?? []) {
      if (typeof row.month === "string" && row.month) values.add(row.month);
    }
    if (!values.size) values.add(browserMonth);
    return Array.from(values).sort();
  }, [live.data, browserMonth]);

  const preferredMonth = live.data?.currentMonth || browserMonth;
  const [month, setMonth] = useState(preferredMonth);
  const [platform, setPlatform] = useState<Platform | "All">("All");
  const [spendType, setSpendType] = useState<SpendType | "All">("All");
  const [pillar, setPillar] = useState<ContentPillar | "All">("All");
  const [format, setFormat] = useState<ContentFormat | "All">("All");

  useEffect(() => {
    if (!months.includes(month) && months.includes(preferredMonth)) {
      setMonth(preferredMonth);
    }
  }, [month, months, preferredMonth]);

  const value = useMemo(
    () => ({
      month,
      setMonth,
      platform,
      setPlatform,
      spendType,
      setSpendType,
      pillar,
      setPillar,
      format,
      setFormat,
      months,
    }),
    [month, platform, spendType, pillar, format, months]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

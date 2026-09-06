import { ChevronDown } from "lucide-react";
import { useFilters, PLATFORMS, PILLARS, FORMATS } from "../../utils/FilterContext";
import type { Platform, ContentPillar, ContentFormat, SpendType } from "../../types/dashboard";

function Select<T extends string>({ value, onChange, options, allLabel }: { value: T | "All"; onChange: (v: T | "All") => void; options: readonly T[]; allLabel: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "All")}
        className="appearance-none bg-white border border-navy-900/10 rounded-lg pl-3 pr-8 py-2 text-xs text-navy-800 hover:border-navy-900/20 focus:outline-none focus:ring-2 focus:ring-mint-500/25 cursor-pointer"
      >
        <option value="All">{allLabel}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fog-400 pointer-events-none" />
    </div>
  );
}

const SPEND = ["Organic", "Paid"] as const;

export function FilterBar() {
  const f = useFilters();
  const { month, setMonth, platform, setPlatform, spendType, setSpendType, pillar, setPillar, format, setFormat, months } = f;

  return (
    <div className="sticky top-0 lg:top-0 z-20 bg-warm-100/95 backdrop-blur-sm border-b border-navy-900/6 px-4 sm:px-8 py-3 flex items-center gap-2 flex-wrap">
      <div className="relative">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="appearance-none bg-navy-900 text-warm-50 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
        >
          {months.map((m) => (
            <option key={m} value={m}>{new Date(m + "-01").toLocaleString("en", { month: "long" })} 2026</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-100/70 pointer-events-none" />
      </div>
      <div className="w-px h-5 bg-navy-900/10 mx-1 hidden sm:block" />
      <Select value={platform} onChange={setPlatform} options={PLATFORMS} allLabel="All platforms" />
      <Select value={spendType} onChange={setSpendType} options={SPEND} allLabel="Organic + Paid" />
      <Select value={pillar} onChange={setPillar} options={PILLARS} allLabel="All pillars" />
      <Select value={format} onChange={setFormat} options={FORMATS} allLabel="All formats" />
    </div>
  );
}

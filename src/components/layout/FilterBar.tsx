import { ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useFilters } from "../../utils/FilterContext";

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

const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn"] as const;
const PILLARS = ["Medical Education", "Doctors Content", "Hospital Services", "Events", "Conferences", "ASA Academy", "Patient Experience", "Awareness", "Branding", "Promotional", "Other"] as const;
const FORMATS = ["Reel", "Long video", "Static post", "Carousel", "Story", "Other"] as const;
const SPEND = ["Organic", "Paid"] as const;

function formatMonthOption(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString("en", { month: "long" });
  return `${label} ${year}`;
}

export function FilterBar() {
  const f = useFilters();
  const { pathname } = useLocation();
  const { month, setMonth, platform, setPlatform, spendType, setSpendType, pillar, setPillar, format, setFormat, months } = f;

  const isContentPage = ["/content", "/video", "/creative"].includes(pathname);
  const showMonth = pathname !== "/comparisons";
  const showPlatform = isContentPage || pathname === "/platforms";
  const showSpend = isContentPage || pathname === "/performance";
  const showPillar = isContentPage;
  const showFormat = isContentPage;

  if (!showMonth && !showPlatform && !showSpend && !showPillar && !showFormat) return null;

  return (
    <div className="sticky top-0 lg:top-0 z-20 bg-warm-100/95 backdrop-blur-sm border-b border-navy-900/6 px-4 sm:px-8 py-3 flex items-center gap-2 flex-wrap">
      {showMonth && (
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="appearance-none bg-navy-900 text-warm-50 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {months.map((m) => (
              <option key={m} value={m}>{formatMonthOption(m)}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-100/70 pointer-events-none" />
        </div>
      )}
      {(showPlatform || showSpend || showPillar || showFormat) && <div className="w-px h-5 bg-navy-900/10 mx-1 hidden sm:block" />}
      {showPlatform && <Select value={platform} onChange={setPlatform} options={PLATFORMS} allLabel="All platforms" />}
      {showSpend && <Select value={spendType} onChange={setSpendType} options={SPEND} allLabel="Organic + Paid" />}
      {showPillar && <Select value={pillar} onChange={setPillar} options={PILLARS} allLabel="All pillars" />}
      {showFormat && <Select value={format} onChange={setFormat} options={FORMATS} allLabel="All formats" />}
    </div>
  );
}

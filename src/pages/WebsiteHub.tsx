import WebsiteLive from "./WebsiteLive";
import Website from "./Website";
import HistoricalArticles from "./HistoricalArticles";
import { useFilters } from "../utils/FilterContext";

const label = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleString("en", { month: "short" });

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function WebsiteHub() {
  const { month, setMonth, months } = useFilters();
  const live = month === currentMonthKey();
  const historical = months.filter((m) => m < currentMonthKey());

  function chooseMonth(m: string) {
    setMonth(m);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-900/10 bg-white px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-fog-500 font-semibold">Website period</p>
          <p className="text-xs text-fog-600 mt-0.5">
            {live ? "LIVE data: current month → latest sync." : "Choose a fixed historical month or LIVE for the current month."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-fog-100 p-1">
          {historical.map((m) => (
            <button
              key={m}
              onClick={() => chooseMonth(m)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                !live && month === m
                  ? "bg-white text-navy-900 shadow-sm"
                  : "text-fog-600 hover:text-navy-900"
              }`}
            >
              {label(m)}
            </button>
          ))}
          <button
            onClick={() => setMonth(currentMonthKey())}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
              live
                ? "bg-navy-900 text-white shadow-sm"
                : "text-fog-600 hover:text-navy-900"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-mint-300 animate-pulse" : "bg-fog-400"}`} />
            LIVE
          </button>
        </div>
      </div>
      {live ? <WebsiteLive /> : month <= "2026-08" ? <div className="space-y-8"><HistoricalArticles month={month}/><Website /></div> : <div className="space-y-8"><HistoricalArticles month={month}/><WebsiteLive /></div>}
    </div>
  );
}

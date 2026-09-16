import WebsiteLive from "./WebsiteLive";

export default function WebsiteHub() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-navy-900/10 bg-white px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-fog-500 font-semibold">Website data period</p>
        <p className="text-sm font-semibold text-navy-900 mt-1">1 Sep 2026 → latest sync</p>
        <p className="text-xs text-fog-600 mt-1">The exact GA4 and Search Console sync times are shown in the LIVE panel below.</p>
      </div>
      <WebsiteLive />
    </div>
  );
}

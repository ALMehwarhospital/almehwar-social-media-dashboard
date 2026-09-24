import { formatNumber, formatPercent } from "../../utils/format";

function missing(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function PlatformCard({ data }: { data: any }) {
  const engagementBasis = data.engagementDenominator || "platform source";
  return (
    <div className="bg-white rounded-2xl border border-navy-900/6 shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-fog-500 text-xs font-medium">{missing(data.contentPublished) ? "N/A content items published" : `${formatNumber(data.contentPublished)} content items published`}</p>
          <h3 className="font-display text-xl text-navy-900">{data.platform}</h3>
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${String(data.status || "").toUpperCase().includes("PENDING") || String(data.status || "").toUpperCase().includes("PARTIAL") ? "bg-signal-amber/15 text-signal-amber" : String(data.status || "").toUpperCase().includes("NOT EVALUATED") ? "bg-fog-100 text-fog-600" : "bg-mint-100 text-mint-700"}`}>
          {data.status || "Source data"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
        {!missing(data.reach) && <div><p className="text-fog-400 text-[11px]">Reach</p><p className="font-mono text-navy-900">{formatNumber(data.reach)}</p></div>}
        {!missing(data.views) && <div><p className="text-fog-400 text-[11px]">Views</p><p className="font-mono text-navy-900">{formatNumber(data.views)}</p></div>}
        {!missing(data.interactions) && <div><p className="text-fog-400 text-[11px]">Interactions</p><p className="font-mono text-navy-900">{formatNumber(data.interactions)}</p></div>}
        {!missing(data.shares) && <div><p className="text-fog-400 text-[11px]">Shares</p><p className="font-mono text-navy-900">{formatNumber(data.shares)}</p></div>}
        {!missing(data.engagementRate) && <div><p className="text-fog-400 text-[11px]">Eng. Rate</p><p className="font-mono text-navy-900">{formatPercent(data.engagementRate)}</p><p className="text-[9px] text-fog-400">by {engagementBasis}</p></div>}
        {!missing(data.followersGrowth) && <div><p className="text-fog-400 text-[11px]">New Followers</p><p className="font-mono text-navy-900">+{formatNumber(data.followersGrowth)}</p></div>}
        {!missing(data.clicks) && <div><p className="text-fog-400 text-[11px]">Link Clicks</p><p className="font-mono text-navy-900">{formatNumber(data.clicks)}</p></div>}
        {!missing(data.impressions) && <div><p className="text-fog-400 text-[11px]">Impressions</p><p className="font-mono text-navy-900">{formatNumber(data.impressions)}</p></div>}
        {!missing(data.profileVisits) && <div><p className="text-fog-400 text-[11px]">Profile Visits</p><p className="font-mono text-navy-900">{formatNumber(data.profileVisits)}</p></div>}
        {!missing(data.profileLinkTaps) && <div><p className="text-fog-400 text-[11px]">Instagram Link Taps</p><p className="font-mono text-navy-900">{formatNumber(data.profileLinkTaps)}</p></div>}
        {data.platform === "Facebook" && <div className="col-span-2"><p className="text-fog-400 text-[11px]">Unique Viewers (28D)</p><p className="font-mono text-navy-900">{missing(data.uniqueMediaViewers28d) ? "N/A" : formatNumber(data.uniqueMediaViewers28d)}</p></div>}
      </div>

      <div className="mt-auto pt-3 border-t border-navy-900/6">
        <p className="text-fog-600 text-xs leading-relaxed">{data.observation || "Live source data. Missing metrics stay N/A."}</p>
      </div>
    </div>
  );
}

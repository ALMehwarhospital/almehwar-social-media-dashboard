import { formatNumber, formatPercent } from "../../utils/format";
import { coverageNote, partialCoverage } from "../../utils/socialDataQuality";

function missing(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function PlatformCard({ data }: { data: any }) {
  const engagementBasis = data.engagementDenominator || "platform source";
  const isFacebook = data.platform === "Facebook";
  const audienceGrowthLabel = data.platform === "YouTube" ? "New Subscribers" : "New Followers";
  const sourceNote = String(data.sourceNote || data.observation || "").trim();
  const automatic = /^AUTO(?:\b|\|)/i.test(sourceNote);
  const observation = partialCoverage({ note: sourceNote, status: data.status })
    ? coverageNote({ note: sourceNote, status: data.status })
    : automatic
      ? `Automatically collected platform data.${/pending/i.test(`${sourceNote} ${data.status}`) ? " Some metrics are still pending." : ""}${/MTD|month.to.date/i.test(sourceNote) ? " Figures cover the month to date." : ""}${/Reporting API latency/i.test(sourceNote) ? " Some YouTube metrics may arrive later." : ""} Missing metrics stay N/A.`
      : sourceNote || "Source data. Missing metrics stay N/A.";
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
        {(isFacebook || !missing(data.reach)) && <div><p className="text-fog-400 text-[11px]">{isFacebook ? "Reach (Manual)" : "Reach"}</p><p className="font-mono text-navy-900">{missing(data.reach) ? "N/A" : formatNumber(data.reach)}</p>{isFacebook && <p className="text-[9px] text-fog-400">Entered at month-end</p>}</div>}
        {data.platform === "Facebook" && <div><p className="text-fog-400 text-[11px]">Unique Viewers (28D)</p><p className="font-mono text-navy-900">{missing(data.uniqueMediaViewers28d) ? "N/A" : formatNumber(data.uniqueMediaViewers28d)}</p></div>}
        {!missing(data.impressions) && <div><p className="text-fog-400 text-[11px]">Impressions</p><p className="font-mono text-navy-900">{formatNumber(data.impressions)}</p></div>}
        {!missing(data.views) && <div><p className="text-fog-400 text-[11px]">Views</p><p className="font-mono text-navy-900">{formatNumber(data.views)}</p></div>}
        {!missing(data.interactions) && <div><p className="text-fog-400 text-[11px]">Interactions</p><p className="font-mono text-navy-900">{formatNumber(data.interactions)}</p></div>}
        {(isFacebook || !missing(data.engagementRate)) && <div><p className="text-fog-400 text-[11px]">Eng. Rate</p><p className="font-mono text-navy-900">{missing(data.engagementRate) ? "N/A" : formatPercent(data.engagementRate)}</p><p className="text-[9px] text-fog-400">{isFacebook ? "Calculated from manual Reach" : `by ${engagementBasis}`}</p></div>}
        {!missing(data.likes) && <div><p className="text-fog-400 text-[11px]">Likes</p><p className="font-mono text-navy-900">{formatNumber(data.likes)}</p></div>}
        {!missing(data.comments) && <div><p className="text-fog-400 text-[11px]">Comments</p><p className="font-mono text-navy-900">{formatNumber(data.comments)}</p></div>}
        {!missing(data.shares) && <div><p className="text-fog-400 text-[11px]">Shares</p><p className="font-mono text-navy-900">{formatNumber(data.shares)}</p></div>}
        {!missing(data.followersGrowth) && <div><p className="text-fog-400 text-[11px]">{audienceGrowthLabel}</p><p className="font-mono text-navy-900">+{formatNumber(data.followersGrowth)}</p></div>}
        {!missing(data.profileVisits) && <div><p className="text-fog-400 text-[11px]">Profile Visits</p><p className="font-mono text-navy-900">{formatNumber(data.profileVisits)}</p></div>}
        {!missing(data.clicks) && <div><p className="text-fog-400 text-[11px]">Link Clicks</p><p className="font-mono text-navy-900">{formatNumber(data.clicks)}</p></div>}
        {!missing(data.profileLinkTaps) && <div><p className="text-fog-400 text-[11px]">Instagram Link Taps</p><p className="font-mono text-navy-900">{formatNumber(data.profileLinkTaps)}</p></div>}
        {!missing(data.messages) && <div><p className="text-fog-400 text-[11px]">Messages</p><p className="font-mono text-navy-900">{formatNumber(data.messages)}</p></div>}
        {!missing(data.leads) && <div><p className="text-fog-400 text-[11px]">Leads</p><p className="font-mono text-navy-900">{formatNumber(data.leads)}</p></div>}
      </div>

      <div className="mt-auto pt-3 border-t border-navy-900/6">
        <p className="text-fog-600 text-xs leading-relaxed">{observation}</p>
        {automatic && <details className="mt-2 text-[10px] text-fog-500"><summary className="cursor-pointer font-medium">Source details</summary><p className="mt-2 break-words leading-relaxed">{sourceNote}</p></details>}
      </div>
    </div>
  );
}


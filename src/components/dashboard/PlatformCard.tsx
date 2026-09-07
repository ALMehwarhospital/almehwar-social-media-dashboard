import type { PlatformPerformance } from "../../types/dashboard";
import { formatNumber, formatPercent } from "../../utils/format";

function missing(data:PlatformPerformance,key:'reach'|'clicks'){
  if(key==='reach') return data.platform==='LinkedIn'||data.platform==='TikTok';
  return data.platform==='YouTube'||data.platform==='TikTok';
}

export function PlatformCard({ data }: { data: PlatformPerformance }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-900/6 shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-fog-500 text-xs font-medium">{data.contentPublished} content items published</p>
          <h3 className="font-display text-xl text-navy-900">{data.platform}</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-mint-100 text-mint-700">Source data</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
        <div><p className="text-fog-400 text-[11px]">Reach</p><p className="font-mono text-navy-900">{missing(data,'reach')?'N/A':formatNumber(data.reach)}</p></div>
        <div><p className="text-fog-400 text-[11px]">Views</p><p className="font-mono text-navy-900">{formatNumber(data.views)}</p></div>
        <div><p className="text-fog-400 text-[11px]">Interactions</p><p className="font-mono text-navy-900">{formatNumber(data.interactions)}</p></div>
        <div><p className="text-fog-400 text-[11px]">Eng. Rate</p><p className="font-mono text-navy-900">{formatPercent(data.engagementRate)}</p><p className="text-[9px] text-fog-400">by {data.engagementDenominator}</p></div>
        <div><p className="text-fog-400 text-[11px]">New Followers</p><p className="font-mono text-navy-900">+{formatNumber(data.followersGrowth)}</p></div>
        <div><p className="text-fog-400 text-[11px]">Link Clicks</p><p className="font-mono text-navy-900">{missing(data,'clicks')?'N/A':formatNumber(data.clicks)}</p></div>
      </div>

      <div className="mt-auto pt-3 border-t border-navy-900/6">
        <p className="text-fog-600 text-xs leading-relaxed">{data.observation}</p>
      </div>
    </div>
  );
}

import type { ContentItem } from "../../types/dashboard";
import { formatNumber, formatPercent } from "../../utils/format";

const PLATFORM_DOT: Record<string, string> = {
  Facebook: "bg-signal-blue", Instagram: "bg-signal-coral", TikTok: "bg-navy-900",
  YouTube: "bg-signal-amber", LinkedIn: "bg-mint-500",
};

export function ContentTable({ items, metric }: { items: ContentItem[]; metric: keyof ContentItem }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8">
            <th className="px-5 py-2 font-medium">Content</th>
            <th className="px-3 py-2 font-medium">Pillar</th>
            <th className="px-3 py-2 font-medium">Format</th>
            <th className="px-3 py-2 font-medium text-right">Reach</th>
            <th className="px-3 py-2 font-medium text-right">Engagement</th>
            <th className="px-3 py-2 font-medium text-right">Followers</th>
            <th className="px-5 py-2 font-medium text-right">{String(metric)}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-navy-900/5 last:border-0 hover:bg-warm-100/60">
              <td className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[item.platform]}`} />
                  <span className="font-medium text-navy-900 line-clamp-1 max-w-[220px]">{item.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-fog-500 text-xs">{item.pillar}</td>
              <td className="px-3 py-2.5 text-fog-500 text-xs">{item.format}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-navy-900">{formatNumber(item.reach)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-navy-900">{formatPercent(item.engagementRate)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-navy-900">+{item.followersGained}</td>
              <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-mint-700">
                {typeof item[metric] === "number"
                  ? metric === "engagementRate" || metric === "valueRate"
                    ? formatPercent(item[metric] as number)
                    : formatNumber(item[metric] as number)
                  : String(item[metric])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

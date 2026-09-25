import { formatNumber, formatPercent } from "../../utils/format";

const PLATFORM_DOT: Record<string, string> = {
  Facebook: "bg-signal-blue", Instagram: "bg-signal-coral", TikTok: "bg-navy-900",
  YouTube: "bg-signal-amber", LinkedIn: "bg-mint-500",
};

function interactionRate(item: any): number | null {
  return typeof item.views === "number" && item.views > 0 && typeof item.interactions === "number"
    ? item.interactions / item.views
    : null;
}

export function ContentTable({ items }: { items: any[] }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm min-w-[1120px]">
        <thead>
          <tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8">
            <th className="pl-5 pr-3 py-2 font-medium w-12">#</th>
            <th className="px-3 py-2 font-medium">Content</th>
            <th className="px-3 py-2 font-medium">Platform</th>
            <th className="px-3 py-2 font-medium">Content Pillar</th>
            <th className="px-3 py-2 font-medium">Format</th>
            <th className="px-3 py-2 font-medium text-right">Views</th>
            <th className="px-3 py-2 font-medium text-right">Interactions</th>
            <th className="px-3 py-2 font-medium text-right">Shares</th>
            <th className="px-3 py-2 font-medium text-right">Interaction Rate</th>
            <th className="pl-3 pr-5 py-2 font-medium text-right">Open Link</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-navy-900/5 last:border-0 hover:bg-warm-100/60">
              <td className="pl-5 pr-3 py-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{index + 1}</span>
              </td>
              <td className="px-3 py-3">
                <span className="font-medium text-navy-900 line-clamp-2 max-w-[320px]" dir="auto">{item.name}</span>
              </td>
              <td className="px-3 py-3 text-xs">
                <span className="inline-flex items-center gap-2 whitespace-nowrap text-navy-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[item.platform] ?? "bg-fog-400"}`} />
                  {item.platform}
                </span>
              </td>
              <td className="px-3 py-3 text-xs">
                <span className="inline-flex whitespace-nowrap rounded-full bg-warm-100 px-2.5 py-1 font-medium text-navy-700">
                  {item.pillar || "Other"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-fog-500 text-xs">{item.format}</td>
              <td className="px-3 py-3 text-right tabular-nums text-navy-900">{formatNumber(item.views)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-navy-900">{formatNumber(item.interactions)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-navy-900">{formatNumber(item.shares)}</td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-mint-700">{formatPercent(interactionRate(item))}</td>
              <td className="pl-3 pr-5 py-3 text-right">
                {typeof item.url === "string" && /^https?:\/\//.test(item.url) ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex whitespace-nowrap rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:border-mint-500 hover:bg-mint-100 hover:text-mint-700">
                    Open Link ↗
                  </a>
                ) : <span className="text-xs text-fog-400">N/A</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

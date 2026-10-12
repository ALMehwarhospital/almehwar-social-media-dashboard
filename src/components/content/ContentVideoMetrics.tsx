import { formatNumber, formatPercent, formatSeconds } from "../../utils/format";
import { isVideoContent } from "../../utils/contentVideos";

function watchTime(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return value < 60 ? `${value.toLocaleString("en", { maximumFractionDigits: 1 })}s` : formatSeconds(value);
}

export function ContentVideoMetrics({ item }: { item: any }) {
  if (!isVideoContent(item)) return null;
  const metrics = item.videoMetrics || item;
  const entries = [
    ["Duration", formatSeconds(metrics.durationSeconds)],
    ["Average Watch Time", watchTime(metrics.avgWatchTimeSeconds)],
    ["Average Viewed", formatPercent(metrics.avgPercentWatched)],
    ["Completion Rate", formatPercent(metrics.completionRate)],
    ["Retention 3s", formatPercent(metrics.retention3s)],
    ["Retention 25%", formatPercent(metrics.retention25)],
    ["Retention 50%", formatPercent(metrics.retention50)],
    ["Retention 75%", formatPercent(metrics.retention75)],
    ["Saves", formatNumber(metrics.saves)],
    ["Followers Gained", formatNumber(metrics.followersGained)],
    ["Reach", formatNumber(metrics.reach)],
    ["Impressions", formatNumber(metrics.impressions)],
  ];
  return <div className="mt-2 max-w-[360px]">
    <p className="text-[11px] text-fog-500">Average Watch: <b className="text-navy-800">{watchTime(metrics.avgWatchTimeSeconds)}</b> · Duration: {formatSeconds(metrics.durationSeconds)}</p>
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-semibold text-signal-blue">Video metrics</summary>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 rounded-xl bg-warm-100 p-3">
        {entries.map(([label, value]) => <div key={label}><dt className="text-[10px] text-fog-500">{label}</dt><dd className="mt-1 font-semibold text-navy-900 tabular-nums">{value}</dd></div>)}
      </dl>
      <p className="text-[10px] text-fog-500 mt-2">Missing video metrics stay N/A. YouTube views use the reporting period; TikTok video views are cumulative snapshots.</p>
      {metrics.lastSynced && <p className="text-[10px] text-fog-400 mt-1">Updated {metrics.lastSynced}</p>}
    </details>
  </div>;
}

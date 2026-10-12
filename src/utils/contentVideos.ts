import { classifyContentRow } from "./normalizeDecisionResponse";
import { mergeSocialRows } from "./mergeSocialRows";

const VIDEO_METRICS = ["durationSeconds", "avgWatchTimeSeconds", "avgPercentWatched", "completionRate", "retention3s", "retention25", "retention50", "retention75", "saves", "followersGained", "reach", "impressions", "engagementRate", "engagementDenominator", "lastSynced"] as const;

export function isVideoContent(item: any): boolean {
  return item?.videoMetrics !== undefined || /reel|video|short/i.test(String(item?.format || ""));
}

/** One inventory; content retains its existing metrics, video adds viewing data. */
export function mergeContentWithVideos(content: any[], videos: any[]) {
  return mergeSocialRows(content, videos.map(video => ({
    ...video,
    videoMetrics: Object.fromEntries(VIDEO_METRICS.map(key => [key, video[key]])),
  }))).map(classifyContentRow);
}

import { parseSocialTime } from "./socialDataQuality";

export function websiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === "boolean" || String(value).trim() === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(number) ? number : null;
}

export function sumWebsiteValues(values: unknown[]): number | null {
  const reported = values.map(websiteNumber).filter((value): value is number => value !== null);
  return reported.length ? reported.reduce((sum, value) => sum + value, 0) : null;
}

export function aggregateSearchRows(rows: any[], keyFor: (row: any) => string) {
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = keyFor(row);
    if (key) groups.set(key, [...(groups.get(key) || []), row]);
  }
  return new Map([...groups].map(([key, items]) => {
    const clicks = sumWebsiteValues(items.map(row => row.clicks));
    const impressions = sumWebsiteValues(items.map(row => row.impressions));
    const positioned = items.filter(row => websiteNumber(row.averagePosition) !== null && (websiteNumber(row.impressions) ?? 0) > 0);
    const weight = sumWebsiteValues(positioned.map(row => row.impressions));
    return [key, { clicks, impressions,
      ctr: clicks !== null && impressions !== null && impressions > 0 ? clicks / impressions : null,
      position: weight ? positioned.reduce((sum, row) => sum + websiteNumber(row.averagePosition)! * websiteNumber(row.impressions)!, 0) / weight : null,
    }];
  }));
}

export function sourceFreshness(updated: unknown, month: string, maxHours: number, now = Date.now()) {
  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit" }).format(new Date(now));
  const time = updated ? parseSocialTime(updated) : null;
  return { missing: time === null, stale: month === currentMonth && (time === null || now - time > maxHours * 3600000) };
}

export function searchConsoleState(response: any, now = Date.now()) {
  const month = String(response?.periodMonth || "");
  const row = response?.data?.searchConsole?.overview?.find((item: any) => !item.periodMonth || item.periodMonth === month);
  const updated = row?.lastSynced || response?.sync?.searchConsole || null;
  const clicks = websiteNumber(row?.clicks), impressions = websiteNumber(row?.impressions);
  const status = String(row?.status || "").trim();
  const pending = /pending|unavailable|error|not.ready/i.test(status);
  const verified = row?.verified === true || /^(ready|verified|reporting|complete)$/i.test(status);
  // Legacy all-zero rows have no evidence of a completed Search Console report.
  const ready = !!row && !pending && (verified || (impressions !== null && impressions > 0) || (clicks !== null && clicks > 0));
  const freshness = sourceFreshness(updated, month, 48, now);
  return {
    ready, updated, stale: freshness.stale,
    status: freshness.stale ? "Sync overdue" : ready ? "Reporting" : "Awaiting verified data",
    message: freshness.stale
      ? "Search Console sync is overdue. Refreshing the dashboard does not refresh Google's source data."
      : ready ? "Verified recorded Search Console figures. Missing metrics stay N/A."
      : "No verified Search Console report is available for this period. Unconfirmed zero rows stay N/A.",
    clicks: ready ? clicks : null,
    impressions: ready ? impressions : null,
    ctr: ready && impressions !== null && impressions > 0 ? websiteNumber(row?.ctr ?? row?.cTR) ?? (clicks !== null ? clicks / impressions : null) : null,
    position: ready && impressions !== null && impressions > 0 ? websiteNumber(row?.averagePosition) : null,
  };
}

const METRICS = new Set(["totalUsers", "activeUsers", "newUsers", "sessions", "engagedSessions", "engagementRate", "avgSessionDurationSec", "pageViews", "viewsSession", "eventCount", "sessionShare", "formStarts", "formStartUsers", "formSubmits", "formSubmitUsers", "formCompletionRate", "userCompletionRate", "ga4KeyEvents", "clicks", "impressions", "ctr", "cTR", "averagePosition"]);

export function normalizeWebsiteResponse<T extends { periodMonth: string; data: any }>(response: T): T {
  const rows = (values: unknown) => Array.isArray(values) ? values
    .filter(row => row && (!row.periodMonth || row.periodMonth === response.periodMonth))
    .map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, METRICS.has(key) ? websiteNumber(value) : value]))) : [];
  const data = response.data || {};
  return { ...response, data: {
    ...data, website: rows(data.website), traffic: rows(data.traffic), sources: rows(data.sources), pages: rows(data.pages), conversions: rows(data.conversions),
    searchConsole: { overview: rows(data.searchConsole?.overview), details: rows(data.searchConsole?.details) },
  } };
}

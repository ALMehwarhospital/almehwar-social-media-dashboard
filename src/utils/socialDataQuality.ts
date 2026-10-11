/** Snapshot deltas may cover only part of a past calendar month. */
export function partialCoverage(row: any): boolean {
  return /partial/i.test(`${row?.note || ""} ${row?.status || ""}`);
}

export function incompleteMetric(row: any, key: string): boolean {
  return partialCoverage(row) && ["views", "interactions", "shares", "likes", "comments", "engagementRate"].includes(key);
}

export function coverageNote(row: any): string {
  if (!partialCoverage(row)) return String(row?.note || "");
  const start = String(row?.note || "").match(/PARTIAL\s+from\s+([\d/.-]+)/i)?.[1];
  return `Partial activity coverage${start ? ` from ${start}` : ""}. Views and interactions do not represent the full calendar month.`;
}

/** Convert source wall-clock timestamps in the spreadsheet's Africa/Cairo zone. */
export function parseSocialTime(value: unknown): number | null {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const match = iso || dmy;
  if (!match) {
    const time = Date.parse(raw);
    return Number.isFinite(time) ? time : null;
  }
  const year = Number(iso ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(iso ? match[3] : match[1]);
  const wall = Date.UTC(year, month - 1, day, Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0));
  if (month < 1 || month > 12 || day < 1 || new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) return null;
  // Intl supplies Cairo's offset for the date, including daylight saving time.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", timeZoneName: "longOffset" }).formatToParts(new Date(wall));
  const offset = parts.find(part => part.type === "timeZoneName")?.value.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!offset) return null;
  return wall - (offset[1] === "+" ? 1 : -1) * (Number(offset[2]) * 60 + Number(offset[3])) * 60000;
}

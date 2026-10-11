type Row = Record<string, any>;

function identity(row: Row): string {
  const raw = String(row.url || String(row.notes || "").match(/https?:\/\/[^\s]+/)?.[0] || "").trim();
  if (raw) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
        const id = host === "youtu.be" ? url.pathname.split("/")[1] : url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
        if (id) return `id:${id}`; // YouTube IDs are case-sensitive.
      }
      const id = url.pathname.match(/\/(?:video|videos|reel|reels|p|shorts)\/([^/]+)/)?.[1];
      if (id) return `id:${id}`;
      if (row.contentId || row.videoId) return `id:${String(row.contentId || row.videoId)}`;
      return `${host}${url.pathname.replace(/\/$/, "")}${url.searchParams.get("story_fbid") ? `?story_fbid=${url.searchParams.get("story_fbid")}` : ""}`;
    } catch { /* A malformed URL can still have a usable source ID. */ }
  }
  return row.contentId || row.videoId ? `id:${String(row.contentId || row.videoId)}` : "";
}

function date(value: unknown): string {
  const raw = String(value || "");
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : raw.slice(0, 10);
}

function sameTitle(a: Row, b: Row): boolean {
  const text = (row: Row) => String(row.name || "").trim().toLowerCase().replace(/\s+/g, " ");
  const left = text(a), right = text(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const truncated = (short: string, long: string) => /(?:\.\.\.|…)$/.test(short) && short.length > 24 && long.startsWith(short.replace(/(?:\.\.\.|…)$/, "").trim());
  return truncated(left, right) || truncated(right, left);
}

/** Newer source metrics win; archives supply missing links and stable identities. */
export function mergeSocialRows(current: Row[], historical: Row[]): Row[] {
  const merged: Row[] = [];
  for (const row of [...(historical || []), ...(current || [])]) {
    const id = identity(row);
    const scoped = merged.map((item, index) => ({ item, index })).filter(({ item }) => item.month === row.month && item.platform === row.platform);
    const exact = id ? scoped.find(({ item }) => identity(item) === id) : undefined;
    const aliases = exact ? [] : scoped.filter(({ item }) => (!id || !identity(item)) && date(item.date) === date(row.date) && sameTitle(item, row));
    const match = exact || (aliases.length === 1 ? aliases[0] : undefined);
    if (!match) { merged.push({ ...row }); continue; }
    const next = { ...match.item, ...row };
    for (const key of ["url", "contentId", "videoId"]) if (!row[key] && match.item[key]) next[key] = match.item[key];
    merged[match.index] = next;
  }
  return merged;
}

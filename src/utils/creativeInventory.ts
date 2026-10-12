export function available(value:any):value is number { return typeof value === "number" && Number.isFinite(value); }

function canonicalUrl(value:any) {
  const raw=String(value || "").trim();
  try { const url=new URL(raw); const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if (host==="youtu.be") return `youtube:${url.pathname.split("/")[1]}`;
    if (host.endsWith("youtube.com")) return `youtube:${url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop()}`;
    return `${host}${url.pathname.replace(/\/$/,"")}`;
  } catch { return raw; }
}
export function itemKeys(item:any) {
  const keys:string[]=[];
  for (const id of [item.id,item.contentId,item.videoId,item.mediaId,item.postId]) if (id) keys.push(`id:${String(id)}`);
  if (item.url) keys.push(`url:${canonicalUrl(item.url)}`);
  if (item.name || item.title) keys.push(`name:${item.platform}|${String(item.name || item.title).trim().toLowerCase()}`);
  return keys;
}
export function formatGroup(item:any) {
  const raw=String(item.format || "").toLowerCase();
  if (raw.includes("carousel")) return "Carousel";
  if (raw.includes("long")) return "Long Video";
  if (raw.includes("reel") || raw.includes("short")) return "Reel / Short Video";
  if (raw.includes("static") || raw.includes("image") || raw.includes("post")) return "Static Design";
  if (available(item.durationSeconds)) return item.durationSeconds>90?"Long Video":"Reel / Short Video";
  return "Needs classification";
}
export function isVideoCreative(item:any) { return /video|reel|short/i.test(formatGroup(item)); }

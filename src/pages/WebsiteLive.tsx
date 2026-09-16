import { useEffect, useMemo, useState } from "react";
import { Activity, Eye, MousePointerClick, Search, Target, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, SectionHeader } from "../components/dashboard/Primitives";
import { fetchWebsiteLive, type WebsiteLiveResponse } from "../data/websiteLive";

const n = (v: number) => new Intl.NumberFormat("en").format(Math.round(v || 0));
const pct = (v: number, d = 1) => `${((v || 0) * 100).toFixed(d)}%`;
const short = (v: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v || 0);

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon: any }) {
  return <Card className="p-4 sm:p-5"><div className="flex justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-fog-500">{label}</p><p className="font-display text-2xl sm:text-3xl text-navy-900 mt-1">{value}</p></div><div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center"><Icon size={17}/></div></div><p className="text-[11px] text-fog-500 mt-3">{note || "Current month to date"}</p></Card>;
}

export default function WebsiteLive() {
  const [data, setData] = useState<WebsiteLiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetchWebsiteLive().then(setData).catch((e) => setError(e instanceof Error ? e.message : String(e))); }, []);

  const queries = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { query: string; clicks: number; impressions: number; weightedPosition: number }>();
    for (const r of data.data.searchConsole.details) {
      const q = String(r.searchQuery || "").trim(); if (!q) continue;
      const clicks = Number(r.clicks || 0), impressions = Number(r.impressions || 0), pos = Number(r.averagePosition || 0);
      const x = map.get(q) || { query: q, clicks: 0, impressions: 0, weightedPosition: 0 };
      x.clicks += clicks; x.impressions += impressions; x.weightedPosition += pos * impressions; map.set(q, x);
    }
    return [...map.values()].map(x => ({ ...x, ctr: x.impressions ? x.clicks / x.impressions : 0, position: x.impressions ? x.weightedPosition / x.impressions : 0 })).sort((a,b) => b.clicks-a.clicks).slice(0,8);
  }, [data]);

  if (error) return <Card><p className="font-semibold text-signal-coral">LIVE data could not load.</p><p className="text-xs text-fog-600 mt-2">{error}</p></Card>;
  if (!data) return <Card><p className="text-sm text-fog-600">Loading LIVE website data…</p></Card>;

  const w = data.data.website[0] || {};
  const c = data.data.conversions[0] || {};
  const sc = data.data.searchConsole.overview[0] || {};
  const traffic = data.data.traffic.slice(0,8);
  const sources = data.data.sources.slice(0,10);
  const pages = data.data.pages.filter((x:any) => x.landingPage !== "(not set)").slice(0,8);
  const appointment = data.data.pages.filter((x:any) => String(x.landingPage || "").includes("book-an-appointment") || String(x.landingPage || "").includes("احجز-موعدا")).reduce((s:number,x:any)=>s+Number(x.sessions||0),0);
  const label = new Date(`${data.periodMonth}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" });

  return <div className="space-y-10">
    <div className="rounded-3xl bg-navy-900 text-warm-50 p-6 sm:p-8"><div className="flex items-center gap-2 text-mint-300 text-xs font-semibold uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-mint-300 animate-pulse"/>LIVE · {label} MTD</div><h1 className="font-display text-3xl sm:text-4xl mt-3">Website performance, live from GA4 and Search Console.</h1><p className="text-warm-100/65 text-sm mt-3">Current month to date. GA4 refreshes automatically; Search Console follows its normal reporting delay.</p><div className="flex flex-wrap gap-3 mt-4 text-[11px] text-warm-100/60"><span>GA4 synced: {data.sync.ga4 || "—"}</span><span>Search Console synced: {data.sync.searchConsole || "—"}</span></div></div>

    <section><SectionHeader eyebrow="GA4 · LIVE" title="Website pulse" description="Current month-to-date metrics. No comparison with a full previous month is shown because that would be misleading."/><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat label="Active Users" value={n(w.activeUsers)} icon={Users}/><Stat label="Sessions" value={n(w.sessions)} icon={Activity}/><Stat label="Page Views" value={n(w.pageViews)} icon={Eye}/><Stat label="Engaged Sessions" value={n(w.engagedSessions)} icon={Target}/><Stat label="Engagement Rate" value={pct(w.engagementRate)} icon={Target}/><Stat label="Views / Session" value={Number(w.viewsSession||0).toFixed(2)} icon={Eye}/><Stat label="Appointment Landing Sessions" value={n(appointment)} icon={MousePointerClick}/><Stat label="Tracked Form Submits" value={n(c.formSubmits)} note="GA4 form_submit only — not total leads" icon={MousePointerClick}/></div></section>

    <section><SectionHeader eyebrow="GA4 · Acquisition" title="Channel groups and session sources" description="Channel Group and Session Source are intentionally kept separate."/><div className="grid lg:grid-cols-2 gap-5"><Card><h3 className="font-semibold text-navy-900">Traffic by channel</h3><div className="space-y-3 mt-4">{traffic.map((x:any)=><div key={x.channelGroup}><div className="flex justify-between text-xs"><span>{x.channelGroup}</span><span className="font-semibold">{n(x.sessions)} · {pct(x.sessionShare)}</span></div><div className="h-2 bg-fog-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-navy-900 rounded-full" style={{width:`${Math.min(100,Number(x.sessionShare||0)*100)}%`}}/></div></div>)}</div></Card><Card><h3 className="font-semibold text-navy-900">Top session sources</h3><div className="h-72 mt-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={sources} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={short} fontSize={10}/><YAxis type="category" dataKey="sessionSource" width={105} fontSize={10}/><Tooltip/><Bar dataKey="sessions" fill="#3C7391" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer></div></Card></div></section>

    <section><SectionHeader eyebrow="GA4 · Landing Intent" title="Top landing pages" description="Where sessions started this month."/><Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-fog-500"><th className="text-left py-2">Landing page</th><th className="text-right">Sessions</th><th className="text-right">Engagement</th></tr></thead><tbody>{pages.map((x:any)=><tr key={x.landingPage} className="border-t border-navy-900/5"><td className="py-3 max-w-[520px] truncate" dir="auto">{x.landingPage}</td><td className="text-right font-semibold">{n(x.sessions)}</td><td className="text-right">{pct(x.engagementRate)}</td></tr>)}</tbody></table></Card></section>

    <section><SectionHeader eyebrow="Search Console · LIVE" title="Google organic search visibility" description="Official headline totals come from Search Console Overview Raw; detailed query rows are used only for query analysis."/><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat label="Search Clicks" value={n(sc.clicks)} icon={MousePointerClick}/><Stat label="Impressions" value={n(sc.impressions)} icon={Eye}/><Stat label="CTR" value={pct(sc.ctr,2)} icon={Target}/><Stat label="Average Position" value={Number(sc.averagePosition||0).toFixed(2)} note="Lower is better" icon={Search}/></div><Card className="overflow-x-auto mt-5"><h3 className="font-semibold text-navy-900 mb-3">Top detailed queries</h3><table className="w-full text-sm"><thead><tr className="text-xs text-fog-500"><th className="text-left py-2">Query</th><th className="text-right">Clicks</th><th className="text-right">Impressions</th><th className="text-right">CTR</th><th className="text-right">Position</th></tr></thead><tbody>{queries.map(q=><tr key={q.query} className="border-t border-navy-900/5"><td className="py-3" dir="auto">{q.query}</td><td className="text-right font-semibold">{n(q.clicks)}</td><td className="text-right">{n(q.impressions)}</td><td className="text-right">{pct(q.ctr)}</td><td className="text-right">{q.position.toFixed(2)}</td></tr>)}</tbody></table></Card></section>
  </div>;
}

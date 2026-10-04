import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, ExternalLink, Eye, FileText, MousePointerClick, Search, Target, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, SectionHeader } from "../components/dashboard/Primitives";
import { fetchWebsiteLive, type WebsiteDeliveredResponse } from "../data/websiteLive";
import { canonicalArticlePath, fetchArticlesForMonth, type ArticleRecord } from "../data/articleLive";
import { useFilters } from "../utils/FilterContext";

const finite = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
const n = (v: unknown) => { const value = finite(v); return value === null ? "N/A" : new Intl.NumberFormat("en").format(Math.round(value)); };
const pct = (v: unknown, d = 1) => { const value = finite(v); return value === null ? "N/A" : `${(value * 100).toFixed(d)}%`; };
const decimal = (v: unknown, d = 2) => { const value = finite(v); return value === null ? "N/A" : value.toFixed(d); };
const short = (v: unknown) => { const value = finite(v); return value === null ? "N/A" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); };

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon: any }) {
  return <Card className="p-4 sm:p-5"><div className="flex justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-fog-500">{label}</p><p className="font-display text-2xl sm:text-3xl text-navy-900 mt-1">{value}</p></div><div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center"><Icon size={17}/></div></div><p className="text-[11px] text-fog-500 mt-3">{note || "Selected month"}</p></Card>;
}

export default function WebsiteLive() {
  const { month } = useFilters();
  const [data, setData] = useState<WebsiteDeliveredResponse | null>(null);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null); setArticles([]); setError(null); setArticleError(null);
    fetchWebsiteLive(month).then(value => { if(active) setData(value); }).catch(e => { if(active) setError(e instanceof Error ? e.message : String(e)); });
    fetchArticlesForMonth(month).then(value => { if(active) setArticles(value); }).catch(e => { if(active) setArticleError(e instanceof Error ? e.message : String(e)); });
    return () => { active=false; };
  }, [month]);

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

  const articlePerformance = useMemo(() => {
    if(!data) return [];
    const pageMap=new Map<string,any>();
    for(const page of data.data.pages){ pageMap.set(canonicalArticlePath(String(page.fullURL||page.landingPage||"")),page); }
    const searchMap=new Map<string,{clicks:number;impressions:number;weightedPosition:number}>();
    for(const row of data.data.searchConsole.details){
      const key=canonicalArticlePath(String(row.landingPage||""));
      const clicks=Number(row.clicks||0), impressions=Number(row.impressions||0), position=Number(row.averagePosition||0);
      const current=searchMap.get(key)||{clicks:0,impressions:0,weightedPosition:0};
      current.clicks+=clicks; current.impressions+=impressions; current.weightedPosition+=position*impressions; searchMap.set(key,current);
    }
    return articles.map(article=>{
      const key=canonicalArticlePath(article.link), page=pageMap.get(key), search=searchMap.get(key);
      return {
        ...article,
        sessions: page ? Number(page.sessions ?? 0) : null,
        pageViews: page ? Number(page.pageViews ?? 0) : null,
        engagementRate: page ? finite(page.engagementRate) : null,
        clicks: search ? search.clicks : null,
        impressions: search ? search.impressions : null,
        position: search?.impressions ? search.weightedPosition / search.impressions : null,
      };
    }).sort((a,b)=>((b.sessions ?? 0)+(b.clicks ?? 0))-((a.sessions ?? 0)+(a.clicks ?? 0)));
  },[data,articles]);

  if (error) return <Card><p className="font-semibold text-signal-coral">Website data could not load.</p><p className="text-xs text-fog-600 mt-2">{error}</p></Card>;
  if (!data) return <Card><p className="text-sm text-fog-600">Loading website data for {month}…</p></Card>;

  const w = data.data.website[0] || {}, c = data.data.conversions[0] || {}, sc = data.data.searchConsole.overview[0] || {};
  const searchConsoleReady = Number(sc.impressions || 0) > 0 || Number(sc.clicks || 0) > 0;
  const searchClicks = searchConsoleReady ? finite(sc.clicks) : null;
  const searchImpressions = searchConsoleReady ? finite(sc.impressions) : null;
  const searchPosition = searchConsoleReady ? finite(sc.averagePosition) : null;
  const searchCtr = searchConsoleReady ? (finite(sc.ctr) ?? finite(sc.cTR) ?? (searchClicks !== null && searchImpressions !== null && searchImpressions > 0 ? searchClicks / searchImpressions : null)) : null;
  const traffic = data.data.traffic.slice(0,8), sources = data.data.sources.slice(0,10);
  const pages = data.data.pages.filter((x:any) => x.landingPage !== "(not set)").slice(0,8);
  const appointment = data.data.pages.filter((x:any) => String(x.landingPage || "").includes("book-an-appointment") || String(x.landingPage || "").includes("احجز-موعدا")).reduce((s:number,x:any)=>s+Number(x.sessions||0),0);
  const label = new Date(`${month}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" });
  const articleSessions=articlePerformance.some(row=>row.sessions!==null)?articlePerformance.reduce((sum,row)=>sum+(row.sessions??0),0):null;
  const articleViews=articlePerformance.some(row=>row.pageViews!==null)?articlePerformance.reduce((sum,row)=>sum+(row.pageViews??0),0):null;
  const articleClicks=articlePerformance.some(row=>row.clicks!==null)?articlePerformance.reduce((sum,row)=>sum+(row.clicks??0),0):null;
  const articleImpressions=articlePerformance.some(row=>row.impressions!==null)?articlePerformance.reduce((sum,row)=>sum+(row.impressions??0),0):null;
  const articleWeightedEngagement=articleSessions?articlePerformance.reduce((sum,row)=>sum+(row.engagementRate||0)*(row.sessions??0),0)/articleSessions:null;

  return <div className="space-y-10">
    <div className="rounded-3xl bg-navy-900 text-warm-50 p-6 sm:p-8"><div className="flex items-center gap-2 text-mint-300 text-xs font-semibold uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-mint-300 animate-pulse"/>{data.deliverySource === "api" ? "LIVE API" : "SNAPSHOT"} · {label}</div><h1 className="font-display text-3xl sm:text-4xl mt-3">Website performance from GA4 and Search Console.</h1><p className="text-warm-100/65 text-sm mt-3">{data.deliverySource === "api" ? `Selected-month data for ${label}.` : `Cached snapshot as of ${data.generatedAt}.`} Search Console follows its normal reporting delay.</p><div className="flex flex-wrap gap-3 mt-4 text-[11px] text-warm-100/60"><span>GA4 synced: {data.sync.ga4 || "—"}</span><span>Search Console synced: {data.sync.searchConsole || "—"}</span></div></div>

    <section><SectionHeader eyebrow="GA4" title="Website pulse" description={`Website totals for ${label}.`}/><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat label="Active Users" value={n(w.activeUsers)} icon={Users}/><Stat label="Sessions" value={n(w.sessions)} icon={Activity}/><Stat label="Page Views" value={n(w.pageViews)} icon={Eye}/><Stat label="Engaged Sessions" value={n(w.engagedSessions)} icon={Target}/><Stat label="Engagement Rate" value={pct(w.engagementRate)} icon={Target}/><Stat label="Views / Session" value={decimal(w.viewsSession)} icon={Eye}/><Stat label="Appointment Landing Sessions" value={n(appointment)} icon={MousePointerClick}/><Stat label="Tracked Form Submits" value={n(c.formSubmits)} note="GA4 form_submit only — not total leads" icon={MousePointerClick}/></div></section>

    <section><SectionHeader eyebrow="Articles · WordPress + GA4 + Search Console" title="Article Performance" description={`Articles published in ${label}, matched to their traffic and organic-search performance in the same month.`}/>{articleError?<Card><p className="text-sm text-signal-coral">Article list could not load.</p><p className="text-xs text-fog-500 mt-1">{articleError}</p></Card>:<><div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"><Stat label="Published Articles" value={n(articlePerformance.length)} note={`Published in ${label}`} icon={FileText}/><Stat label="Article Sessions" value={n(articleSessions)} note="GA4 landing sessions" icon={Activity}/><Stat label="Article Page Views" value={n(articleViews)} note="GA4 page views" icon={BookOpen}/><Stat label="Search Clicks" value={n(articleClicks)} note="Google organic clicks" icon={MousePointerClick}/><Stat label="Search Impressions" value={n(articleImpressions)} note="Google organic impressions" icon={Eye}/><Stat label="Avg Engagement" value={pct(articleWeightedEngagement)} note="Weighted by article sessions" icon={Target}/></div><Card className="overflow-x-auto mt-5"><table className="w-full min-w-[1000px] text-sm"><thead><tr className="text-xs text-fog-500"><th className="text-left py-2">Article</th><th className="text-left">Published</th><th className="text-right">Sessions</th><th className="text-right">Views</th><th className="text-right">Search Clicks</th><th className="text-right">Impressions</th><th className="text-right">Engagement</th><th className="text-right">Link</th></tr></thead><tbody>{articlePerformance.map(article=><tr key={article.id} className="border-t border-navy-900/5 align-top"><td className="py-4 pr-5 max-w-[420px]"><p className="font-semibold text-navy-900">{article.title}</p><p className="text-xs text-fog-500 mt-1 line-clamp-2">{article.summary || "No summary available."}</p></td><td className="py-4 whitespace-nowrap">{new Date(article.date).toLocaleDateString("en",{month:"short",day:"numeric"})}</td><td className="py-4 text-right font-semibold">{n(article.sessions)}</td><td className="py-4 text-right">{n(article.pageViews)}</td><td className="py-4 text-right">{n(article.clicks)}</td><td className="py-4 text-right">{n(article.impressions)}</td><td className="py-4 text-right">{pct(article.engagementRate)}</td><td className="py-4 text-right"><a href={article.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-mint-700 font-semibold hover:underline">Open Article <ExternalLink size={13}/></a></td></tr>)}</tbody></table>{!articlePerformance.length&&<p className="text-sm text-fog-500 py-6">No articles were published in this month.</p>}</Card></>}</section>

    <section><SectionHeader eyebrow="GA4 · Acquisition" title="Channel groups and session sources" description="Channel Group and Session Source are intentionally kept separate."/><div className="grid lg:grid-cols-2 gap-5"><Card><h3 className="font-semibold text-navy-900">Traffic by channel</h3><div className="space-y-3 mt-4">{traffic.map((x:any)=><div key={x.channelGroup}><div className="flex justify-between text-xs"><span>{x.channelGroup}</span><span className="font-semibold">{n(x.sessions)} · {pct(x.sessionShare)}</span></div><div className="h-2 bg-fog-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-navy-900 rounded-full" style={{width:`${Math.min(100,Number(x.sessionShare||0)*100)}%`}}/></div></div>)}</div></Card><Card><h3 className="font-semibold text-navy-900">Top session sources</h3><div className="h-72 mt-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={sources} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={short} fontSize={10}/><YAxis type="category" dataKey="sessionSource" width={105} fontSize={10}/><Tooltip/><Bar dataKey="sessions" fill="#3C7391" radius={[0,8,8,0]}/></BarChart></ResponsiveContainer></div></Card></div></section>

    <section><SectionHeader eyebrow="GA4 · Landing Intent" title="Top landing pages" description="Where sessions started in the selected month."/><Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-fog-500"><th className="text-left py-2">Landing page</th><th className="text-right">Sessions</th><th className="text-right">Engagement</th></tr></thead><tbody>{pages.map((x:any)=><tr key={x.landingPage} className="border-t border-navy-900/5"><td className="py-3 max-w-[520px] truncate" dir="auto">{x.landingPage}</td><td className="text-right font-semibold">{n(x.sessions)}</td><td className="text-right">{pct(x.engagementRate)}</td></tr>)}</tbody></table></Card></section>

    <section><SectionHeader eyebrow="Search Console" title="Google organic search visibility" description={searchConsoleReady ? "Official headline totals come from Search Console Overview Raw; detailed query rows are used only for query analysis." : "Search Console has not published verified data for this month yet. Pending values stay N/A rather than being shown as zero."}/><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat label="Search Clicks" value={n(searchClicks)} note={searchConsoleReady?undefined:"Data pending"} icon={MousePointerClick}/><Stat label="Impressions" value={n(searchImpressions)} note={searchConsoleReady?undefined:"Data pending"} icon={Eye}/><Stat label="CTR" value={pct(searchCtr,2)} note={searchConsoleReady?undefined:"Data pending"} icon={Target}/><Stat label="Average Position" value={decimal(searchPosition)} note={searchConsoleReady?"Lower is better":"Data pending"} icon={Search}/></div><Card className="overflow-x-auto mt-5"><h3 className="font-semibold text-navy-900 mb-3">Top detailed queries</h3><table className="w-full text-sm"><thead><tr className="text-xs text-fog-500"><th className="text-left py-2">Query</th><th className="text-right">Clicks</th><th className="text-right">Impressions</th><th className="text-right">CTR</th><th className="text-right">Position</th></tr></thead><tbody>{queries.map(q=><tr key={q.query} className="border-t border-navy-900/5"><td className="py-3" dir="auto">{q.query}</td><td className="text-right font-semibold">{n(q.clicks)}</td><td className="text-right">{n(q.impressions)}</td><td className="text-right">{pct(q.ctr)}</td><td className="text-right">{q.position.toFixed(2)}</td></tr>)}</tbody></table>{!queries.length&&<p className="text-sm text-fog-500 py-5">Search Console data is pending for this month.</p>}</Card></section>
  </div>;
}

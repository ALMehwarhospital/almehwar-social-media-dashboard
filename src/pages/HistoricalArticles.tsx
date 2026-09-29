import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, ExternalLink, Eye, FileText, MousePointerClick, Target } from "lucide-react";
import { Card, SectionHeader } from "../components/dashboard/Primitives";
import { canonicalArticlePath, fetchArticlesForMonth, type ArticleRecord } from "../data/articleLive";

interface HistoricalMetric {
  sessions: number | null;
  pageViews: number | null;
  engagementRate: number | null;
  clicks: number | null;
  impressions: number | null;
  position: number | null;
}
type PerformanceArchive = { months: Record<string, Record<string, HistoricalMetric>> };
type ArticleWithPerformance = ArticleRecord & HistoricalMetric;
const number = (value: number | null) => value === null || !Number.isFinite(value) ? "N/A" : new Intl.NumberFormat("en").format(Math.round(value));
const percentage = (value: number | null) => value === null || !Number.isFinite(value) ? "N/A" : `${(value * 100).toFixed(1)}%`;
function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: any }) {
  return <Card className="p-4 sm:p-5"><div className="flex justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-fog-500">{label}</p><p className="font-display text-2xl sm:text-3xl text-navy-900 mt-1">{value}</p></div><div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center"><Icon size={17}/></div></div><p className="text-[11px] text-fog-500 mt-3">{note}</p></Card>;
}

export default function HistoricalArticles({ month }: { month: string }) {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [metrics, setMetrics] = useState<Record<string, HistoricalMetric> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metricError, setMetricError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setArticles([]); setMetrics(null); setError(null); setMetricError(null);
    Promise.allSettled([
      fetchArticlesForMonth(month),
      fetch(`${import.meta.env.BASE_URL}data/article-performance-historical.json`, { cache: "no-store" })
        .then(response => { if (!response.ok) throw new Error(`Archive returned ${response.status}`); return response.json() as Promise<PerformanceArchive>; }),
    ]).then(([articleResult, archiveResult]) => {
      if (!active) return;
      if (articleResult.status === "fulfilled") setArticles(articleResult.value);
      else setError(String(articleResult.reason));
      if (archiveResult.status === "fulfilled") setMetrics(archiveResult.value.months?.[month] ?? {});
      else setMetricError(String(archiveResult.reason));
      setLoading(false);
    });
    return () => { active = false; };
  }, [month]);

  const performance = useMemo<ArticleWithPerformance[]>(() => articles.map(article => {
    const matched = metrics?.[canonicalArticlePath(article.link)];
    return { ...article, sessions: matched?.sessions ?? null, pageViews: matched?.pageViews ?? null,
      engagementRate: matched?.engagementRate ?? null, clicks: matched?.clicks ?? null,
      impressions: matched?.impressions ?? null, position: matched?.position ?? null };
  }).sort((a, b) => (b.sessions ?? -1) - (a.sessions ?? -1)), [articles, metrics]);
  const total = (key: "sessions" | "pageViews" | "clicks" | "impressions"): number | null => {
    if (!performance.length || metrics === null) return null;
    const values = performance.map(item => item[key]).filter((value): value is number => value !== null && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const weightedRows = performance.filter(item => item.sessions !== null && item.engagementRate !== null && item.sessions > 0);
  const weightedSessions = weightedRows.reduce((sum, item) => sum + (item.sessions ?? 0), 0);
  const engagement = weightedSessions ? weightedRows.reduce((sum, item) => sum + (item.sessions ?? 0) * (item.engagementRate ?? 0), 0) / weightedSessions : null;
  const period = new Date(`${month}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" });

  return <section className="space-y-5">
    <SectionHeader eyebrow="Articles · WordPress + GA4 + Search Console" title="Article Performance" description={`Articles published in ${period}, matched with their performance during that month. Historical archive from the canonical Google Sheet.`}/>
    {loading ? <Card><p className="text-sm text-fog-600">Loading articles and historical performance…</p></Card> :
     error ? <Card><p className="text-sm text-signal-coral font-semibold">Article list could not load.</p><p className="text-xs text-fog-500 mt-2">{error}</p></Card> :
     <>
       {metricError && <Card><p className="text-sm text-signal-coral">Historical performance unavailable: {metricError}. Article titles and links remain available.</p></Card>}
       <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
         <Stat label="Published Articles" value={number(performance.length)} note={`Published in ${period}`} icon={FileText}/>
         <Stat label="Article Sessions" value={number(total("sessions"))} note="GA4 landing sessions" icon={Activity}/>
         <Stat label="Article Page Views" value={number(total("pageViews"))} note="GA4 matched landing-page views" icon={BookOpen}/>
         <Stat label="Search Clicks" value={number(total("clicks"))} note="Google organic clicks" icon={MousePointerClick}/>
         <Stat label="Search Impressions" value={number(total("impressions"))} note="Google organic impressions" icon={Eye}/>
         <Stat label="Avg Engagement" value={percentage(engagement)} note="Weighted by matched sessions" icon={Target}/>
       </div>
       <Card className="overflow-x-auto">
         <table className="w-full min-w-[1050px] text-sm"><thead><tr className="text-xs text-fog-500">
           <th className="text-left py-2">Article</th><th className="text-left">Published</th>
           <th className="text-right">Sessions</th><th className="text-right">Views</th><th className="text-right">Search Clicks</th>
           <th className="text-right">Impressions</th><th className="text-right">Engagement</th><th className="text-right">Link</th>
         </tr></thead><tbody>{performance.map(article => <tr key={article.id} className="border-t border-navy-900/5 align-top">
           <td className="py-4 pr-5 max-w-[420px]"><p className="font-semibold text-navy-900" dir="auto">{article.title}</p><p className="text-xs text-fog-500 mt-1 line-clamp-2" dir="auto">{article.summary || "No summary available."}</p></td>
           <td className="py-4 whitespace-nowrap">{new Date(article.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
           <td className="py-4 text-right font-semibold">{number(article.sessions)}</td><td className="py-4 text-right">{number(article.pageViews)}</td>
           <td className="py-4 text-right">{number(article.clicks)}</td><td className="py-4 text-right">{number(article.impressions)}</td>
           <td className="py-4 text-right">{percentage(article.engagementRate)}</td>
           <td className="py-4 text-right"><a href={article.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-mint-700 font-semibold hover:underline whitespace-nowrap">Open Article <ExternalLink size={13}/></a></td>
         </tr>)}</tbody></table>
         {!performance.length && <p className="text-sm text-fog-500 py-6">No articles were published in this month.</p>}
       </Card>
       <p className="text-xs text-fog-500">N/A means the matching URL or metric was not available in the historical export; it does not mean zero. Search Console detailed rows are not the same as site-wide headline totals.</p>
     </>}
  </section>;
}

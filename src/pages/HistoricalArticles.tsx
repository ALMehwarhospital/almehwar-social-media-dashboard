import { useEffect, useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { Card, SectionHeader } from "../components/dashboard/Primitives";
import { fetchArticlesForMonth, type ArticleRecord } from "../data/articleLive";

export default function HistoricalArticles({ month }: { month: string }) {
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setArticles([]);
    fetchArticlesForMonth(month)
      .then(result => { if (active) setArticles(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);

  const period = new Date(`${month}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" });
  return <section className="space-y-4">
    <SectionHeader eyebrow="WordPress · Historical" title="Published Articles" description={`Articles published in ${period}. This list loads separately from the slow historical Website API. Article-level GA4/Search Console metrics are not inferred from incomplete landing-page snapshots.`}/>
    {loading ? <Card><p className="text-sm text-fog-600">Loading published articles…</p></Card> :
      error ? <Card><p className="text-sm text-signal-coral font-semibold">Article list could not load.</p><p className="text-xs text-fog-500 mt-2">{error}</p></Card> :
      <Card className="overflow-x-auto">
        <div className="flex items-center gap-2 mb-4 text-navy-900"><BookOpen size={17}/><span className="font-semibold">{articles.length} published articles</span></div>
        {articles.length ? <table className="w-full text-sm min-w-[650px]">
          <thead><tr className="text-xs text-fog-500"><th className="text-left py-2">Article</th><th className="text-left">Published</th><th className="text-right">Link</th></tr></thead>
          <tbody>{articles.map(article => <tr key={article.id} className="border-t border-navy-900/5 align-top">
            <td className="py-3 pr-5"><p className="font-semibold text-navy-900" dir="auto">{article.title}</p><p className="text-xs text-fog-500 mt-1 line-clamp-2" dir="auto">{article.summary}</p></td>
            <td className="py-3 whitespace-nowrap">{new Date(article.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</td>
            <td className="py-3 text-right"><a href={article.link} target="_blank" rel="noreferrer" className="text-mint-700 font-semibold inline-flex items-center gap-1 whitespace-nowrap">Open Article <ExternalLink size={13}/></a></td>
          </tr>)}</tbody>
        </table> : <p className="text-sm text-fog-500">No published articles returned for this month.</p>}
      </Card>}
  </section>;
}

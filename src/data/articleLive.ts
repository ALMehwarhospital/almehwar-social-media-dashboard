const WORDPRESS_POSTS_API = "https://almehwarhospital.com/wp-json/wp/v2/posts";

export interface ArticleRecord {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: string;
  summary: string;
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function plainText(html: string): string {
  const document = new DOMParser().parseFromString(html || "", "text/html");
  return (document.body.textContent || "").replace(/\s+/g, " ").trim();
}

export function canonicalArticlePath(url: string): string {
  try {
    const parsed = new URL(url, "https://almehwarhospital.com");
    return safeDecode(parsed.pathname).replace(/\/+$/, "") || "/";
  } catch {
    return safeDecode(String(url || "").split(/[?#]/)[0]).replace(/\/+$/, "") || "/";
  }
}

export async function fetchArticlesForMonth(month: string): Promise<ArticleRecord[]> {
  const [year, monthNumber] = month.split("-").map(Number);
  const after = new Date(Date.UTC(year, monthNumber - 1, 1)).toISOString();
  const before = new Date(Date.UTC(year, monthNumber, 1)).toISOString();
  const url = new URL(WORDPRESS_POSTS_API);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("after", after);
  url.searchParams.set("before", before);
  url.searchParams.set("orderby", "date");
  url.searchParams.set("order", "desc");
  url.searchParams.set("_fields", "id,date,slug,link,title,excerpt");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Article source returned ${response.status}`);
  const rows = await response.json() as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    date: String(row.date || ""),
    slug: String(row.slug || ""),
    link: String(row.link || ""),
    title: plainText(String(row.title?.rendered || "")),
    summary: plainText(String(row.excerpt?.rendered || "")),
  }));
}

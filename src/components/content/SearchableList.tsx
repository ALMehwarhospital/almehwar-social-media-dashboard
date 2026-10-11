import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

function searchable(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").toLocaleLowerCase();
}

export function SearchableList({ items, label, pageSize = 12, renderItems }: {
  items: any[]; label: string; pageSize?: number; renderItems: (rows: any[], offset: number) => ReactNode;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const matches = useMemo(() => {
    const terms = searchable(query).trim().split(/\s+/).filter(Boolean);
    return terms.length ? items.filter(item => {
      const text = searchable([item.name, item.title, item.platform, item.url, item.id, item.contentId, item.videoId, item.pillar, item.format].filter(Boolean).join(" "));
      return terms.every(term => text.includes(term));
    }) : items;
  }, [items, query]);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <label htmlFor={inputId} className="flex-1 min-w-[180px] text-xs font-semibold text-navy-800">{label}
        <input id={inputId} type="search" dir="auto" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Title, platform, pillar or link…" className="mt-1 block w-full rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-mint-500/30" />
      </label>
      {query && <button onClick={() => { setQuery(""); setPage(1); }} className="px-3 py-2.5 text-xs font-semibold text-signal-blue">Clear search</button>}
    </div>
    <p role="status" className="text-xs text-fog-500">{matches.length ? `Showing ${offset + 1}–${Math.min(offset + pageSize, matches.length)} of ${matches.length}` : "No matching items"}{query ? ` · ${items.length} in this selection` : ""}</p>
    {matches.length ? renderItems(matches.slice(offset, offset + pageSize), offset) : <p className="rounded-xl bg-warm-100 p-4 text-sm text-fog-500">Try another title or clear the search.</p>}
    {pages > 1 && <nav aria-label={`${label} pages`} className="flex items-center justify-between gap-3 text-xs">
      <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-navy-900/15 px-3 py-2 font-semibold disabled:opacity-40">Previous</button>
      <span>Page {currentPage} of {pages}</span>
      <button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-navy-900/15 px-3 py-2 font-semibold disabled:opacity-40">Next</button>
    </nav>}
    <p className="text-[10px] text-fog-400">Search filters this list only. Totals and scores use the month and filters above.</p>
  </div>;
}

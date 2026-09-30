import { useMemo, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { socialDashboard } from "../data/socialDashboard";
import { useDecisionLive } from "../utils/useDecisionLive";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import { formatNumber, formatPercent, monthLabel } from "../utils/format";

type CampaignKey = "headache" | "dental" | "urology" | "electrophysiology" | "heart" | "emergency" | "icu" | "checkups" | "physiotherapy" | "oncology";
type SocialPlatform = "Facebook" | "Instagram";
type PlatformFilter = "All" | SocialPlatform;
type MetricKey = "reach" | "views" | "interactions" | "shares";

interface CampaignDefinition { key: CampaignKey; label: string; pattern: RegExp; }
interface CampaignContent {
  id: string; campaign: CampaignDefinition; date: string; month: string; platform: SocialPlatform;
  name: string; format: string; url: string; reach: number | null; views: number | null;
  interactions: number | null; shares: number | null;
}
interface MetricTotal { value: number | null; covered: number; total: number; }
interface CampaignTotals {
  published: number; reach: MetricTotal; views: MetricTotal; interactions: MetricTotal; shares: MetricTotal;
  engagementRate: number | null; engagementCovered: number; platforms: SocialPlatform[];
}

// Specific services come first so each post belongs to one campaign only.
const CAMPAIGNS: CampaignDefinition[] = [
  { key: "headache", label: "Headache Clinic", pattern: /عيادة\s*الصداع|الصداع|صداع|headache|migraine|الشقيقة/i },
  { key: "dental", label: "Dental Clinic", pattern: /الأسنان|الاسنان|أسنان|سنان|dental|dentist|oral|tooth|teeth/i },
  { key: "urology", label: "Urology", pattern: /المسالك|البولي|البولية|الكلى|البروستاتا|الحصوات|حصوات|urolog|kidney|prostate|stone/i },
  { key: "electrophysiology", label: "Electrophysiology", pattern: /كهربية\s*القلب|كهرباء\s*القلب|اضطراب\s*النظم|النبض|نبضة|ضربات\s*القلب|arrhythm|electrophysi|heart\s*rhythm/i },
  { key: "physiotherapy", label: "Physiotherapy", pattern: /العلاج\s*الطبيعي|تأهيل|physio|physiotherapy|rehab/i },
  { key: "oncology", label: "Oncology", pattern: /الأورام|اورام|السرطان|سرطان|oncology|cancer|tumou?r/i },
  { key: "icu", label: "ICU", pattern: /الرعاية\s*المركزة|العناية\s*المركزة|عناية\s*مركزة|icu|intensive\s*care|critical\s*care/i },
  { key: "checkups", label: "Checkups", pattern: /الفحص\s*الشامل|الفحوصات|تحاليل|check[ -]?up|screening|فحص/i },
  { key: "heart", label: "Heart Clinic", pattern: /القلب|قلبي|heart|cardiac|cardio/i },
  { key: "emergency", label: "Emergency", pattern: /الطوارئ|طوارئ|emergency|urgent/i },
];
const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "reach", label: "Tracked Reach" }, { key: "views", label: "Views" },
  { key: "interactions", label: "Interactions" }, { key: "shares", label: "Shares" },
];

function finite(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function inferCampaign(row: any): CampaignDefinition | null {
  const text = [row?.name, row?.title, row?.caption, row?.notes].filter(Boolean).join(" ");
  return CAMPAIGNS.find((campaign) => campaign.pattern.test(text)) ?? null;
}
function extractUrl(row: any): string {
  const direct = String(row?.url || row?.link || row?.permalink || "").trim();
  if (/^https?:\/\//i.test(direct)) return direct;
  return String(row?.notes || "").match(/https?:\/\/[^\s|]+/i)?.[0] ?? "";
}
function normalizeRow(row: any, index: number): CampaignContent | null {
  if (row?.platform !== "Facebook" && row?.platform !== "Instagram") return null;
  const campaign = inferCampaign(row); if (!campaign) return null;
  return {
    id: String(row?.id || `${row.platform}-${row.month}-${index}`), campaign, date: String(row?.date || ""),
    month: String(row?.month || ""), platform: row.platform, name: String(row?.name || row?.title || "Untitled content"),
    format: String(row?.format || row?.type || "N/A"), url: extractUrl(row), reach: finite(row?.reach), views: finite(row?.views),
    interactions: finite(row?.interactions), shares: finite(row?.shares),
  };
}
function metricTotal(rows: CampaignContent[], key: MetricKey): MetricTotal {
  const values = rows.map((row) => row[key]).filter((value): value is number => value !== null);
  return { value: values.length ? values.reduce((sum, value) => sum + value, 0) : null, covered: values.length, total: rows.length };
}
function totals(rows: CampaignContent[]): CampaignTotals {
  const eligible = rows.filter((row) => row.reach !== null && row.interactions !== null && row.reach > 0);
  const reach = eligible.reduce((sum, row) => sum + (row.reach ?? 0), 0);
  const interactions = eligible.reduce((sum, row) => sum + (row.interactions ?? 0), 0);
  return {
    published: rows.length, reach: metricTotal(rows, "reach"), views: metricTotal(rows, "views"),
    interactions: metricTotal(rows, "interactions"), shares: metricTotal(rows, "shares"),
    engagementRate: reach > 0 ? interactions / reach : null, engagementCovered: eligible.length,
    platforms: (["Facebook", "Instagram"] as SocialPlatform[]).filter((platform) => rows.some((row) => row.platform === platform)),
  };
}
function coverage(metric: MetricTotal): string { return metric.total > 0 && metric.covered < metric.total ? `${metric.covered}/${metric.total} tracked` : ""; }
function displayDate(value: string): string {
  if (!value) return "N/A"; const parts = value.split(/[\/-]/);
  if (parts.length === 3 && parts[0].length <= 2) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Comparisons() {
  const live = useDecisionLive();
  const [campaignFilter, setCampaignFilter] = useState<"All" | CampaignKey>("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("All");
  const allRows = useMemo(() => {
    const source = live.data?.data.content?.length ? live.data.data.content : socialDashboard.contentPerformance;
    return source.map(normalizeRow).filter((row): row is CampaignContent => Boolean(row));
  }, [live.data]);
  const months = useMemo(() => [...new Set(allRows.map((row) => row.month).filter(Boolean))].sort().reverse(), [allRows]);
  const filteredRows = useMemo(() => allRows.filter((row) =>
    (campaignFilter === "All" || row.campaign.key === campaignFilter) && (monthFilter === "All" || row.month === monthFilter) &&
    (platformFilter === "All" || row.platform === platformFilter)), [allRows, campaignFilter, monthFilter, platformFilter]);
  const campaignRows = useMemo(() => CAMPAIGNS.map((campaign) => {
    const rows = allRows.filter((row) => row.campaign.key === campaign.key && (monthFilter === "All" || row.month === monthFilter) && (platformFilter === "All" || row.platform === platformFilter));
    return { campaign, rows, summary: totals(rows) };
  }).filter((item) => item.rows.length > 0), [allRows, monthFilter, platformFilter]);
  const platformRows = useMemo(() => (["Facebook", "Instagram"] as SocialPlatform[]).map((platform) => {
    const rows = filteredRows.filter((row) => row.platform === platform); return { platform, summary: totals(rows) };
  }), [filteredRows]);
  const monthlyRows = useMemo(() => {
    const groups = new Map<string, CampaignContent[]>();
    filteredRows.forEach((row) => { const key = `${row.month}|${row.platform}`; groups.set(key, [...(groups.get(key) ?? []), row]); });
    return [...groups.entries()].map(([key, rows]) => { const [month, platform] = key.split("|") as [string, SocialPlatform]; return { month, platform, summary: totals(rows) }; })
      .sort((a, b) => b.month.localeCompare(a.month) || a.platform.localeCompare(b.platform));
  }, [filteredRows]);

  return <div className="space-y-10">
    <SectionHeader eyebrow="Campaign Intelligence · Facebook + Instagram" title="Campaign Comparisons"
      description="First version uses the content metrics currently available for both platforms. Requests, leads, calls, bookings and revenue are intentionally excluded until they have campaign-level attribution."
      action={live.data ? <span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-mint-100 text-mint-700">{live.isLive ? "LIVE API" : "SNAPSHOT"}</span> : undefined} />

    <Card><div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FilterSelect label="Campaign" value={campaignFilter} onChange={(value) => setCampaignFilter(value as "All" | CampaignKey)}><option value="All">All campaigns</option>{CAMPAIGNS.map((campaign) => <option key={campaign.key} value={campaign.key}>{campaign.label}</option>)}</FilterSelect>
      <FilterSelect label="Month" value={monthFilter} onChange={setMonthFilter}><option value="All">All months</option>{months.map((month) => <option key={month} value={month}>{monthLabel(month)} {month.split("-")[0]}</option>)}</FilterSelect>
      <FilterSelect label="Platform" value={platformFilter} onChange={(value) => setPlatformFilter(value as PlatformFilter)}><option value="All">Facebook + Instagram</option><option value="Facebook">Facebook</option><option value="Instagram">Instagram</option></FilterSelect>
    </div><p className="mt-4 text-xs text-fog-500">Metrics are cumulative content-level results grouped by the month each post was published. They are not yet paid-campaign results by active month.</p></Card>

    <section><SectionHeader eyebrow="Campaign View" title="Available Campaign Metrics" description="Tracked Reach is labelled separately because some Facebook rows do not expose Reach. Coverage appears under every incomplete metric." />
      {campaignRows.length ? <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[980px]">
        <thead><tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8"><th className="px-5 py-3 font-medium">Campaign</th><th className="px-3 py-3 font-medium">Platforms</th><th className="px-3 py-3 font-medium text-right">Published</th>{METRICS.map((metric) => <th key={metric.key} className="px-3 py-3 font-medium text-right">{metric.label}</th>)}<th className="px-5 py-3 font-medium text-right">Eng. Rate</th></tr></thead>
        <tbody>{campaignRows.map(({ campaign, summary }) => <tr key={campaign.key} onClick={() => setCampaignFilter(campaign.key)} className={`border-b border-navy-900/5 last:border-0 cursor-pointer hover:bg-warm-50 ${campaignFilter === campaign.key ? "bg-mint-50" : ""}`}>
          <td className="px-5 py-3.5 font-semibold text-navy-900">{campaign.label}</td><td className="px-3 py-3.5 text-xs text-fog-600">{summary.platforms.join(" + ")}</td><td className="px-3 py-3.5 text-right font-mono text-navy-900">{formatNumber(summary.published)}</td>
          {METRICS.map((metric) => <MetricCell key={metric.key} metric={summary[metric.key]} />)}
          <td className="px-5 py-3.5 text-right"><span className="font-mono font-medium text-navy-900">{formatPercent(summary.engagementRate)}</span>{summary.engagementCovered < summary.published && <small className="block text-[9px] text-signal-amber">{summary.engagementCovered}/{summary.published} tracked</small>}</td>
        </tr>)}</tbody></table></div></Card> : <Card><EmptyState message="No matching campaign content for the selected filters." /></Card>}
    </section>

    <section><SectionHeader eyebrow="Head to Head" title="Facebook vs Instagram" description="The same campaign and month filters are applied to both platforms." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{platformRows.map(({ platform, summary }) => <Card key={platform}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-xl text-navy-900">{platform}</h3><span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${platform === "Facebook" ? "bg-signal-blue/10 text-signal-blue" : "bg-signal-coral/10 text-signal-coral"}`}>{formatNumber(summary.published)} contents</span></div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">{METRICS.map((metric) => <div key={metric.key}><p className="text-[11px] uppercase tracking-wide text-fog-500">{metric.label}</p><p className="mt-1 font-display text-xl text-navy-900">{formatNumber(summary[metric.key].value)}</p>{coverage(summary[metric.key]) && <p className="text-[10px] text-signal-amber">{coverage(summary[metric.key])}</p>}</div>)}
          <div><p className="text-[11px] uppercase tracking-wide text-fog-500">Engagement Rate</p><p className="mt-1 font-display text-xl text-navy-900">{formatPercent(summary.engagementRate)}</p>{summary.engagementCovered < summary.published && <p className="text-[10px] text-signal-amber">{summary.engagementCovered}/{summary.published} tracked</p>}</div>
        </div></Card>)}</div>
    </section>

    <section><SectionHeader eyebrow="Timeline" title="Monthly Breakdown" description="One line per platform per publish month, using the same available metrics." />
      {monthlyRows.length ? <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]">
        <thead><tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8"><th className="px-5 py-3 font-medium">Month</th><th className="px-3 py-3 font-medium">Platform</th><th className="px-3 py-3 font-medium text-right">Published</th>{METRICS.map((metric) => <th key={metric.key} className="px-3 py-3 font-medium text-right">{metric.label}</th>)}<th className="px-5 py-3 font-medium text-right">Eng. Rate</th></tr></thead>
        <tbody>{monthlyRows.map(({ month, platform, summary }) => <tr key={`${month}-${platform}`} className="border-b border-navy-900/5 last:border-0"><td className="px-5 py-3 font-semibold text-navy-900">{monthLabel(month)} {month.split("-")[0]}</td><td className="px-3 py-3 text-fog-600">{platform}</td><td className="px-3 py-3 text-right font-mono">{summary.published}</td>{METRICS.map((metric) => <MetricCell key={metric.key} metric={summary[metric.key]} />)}<td className="px-5 py-3 text-right font-mono font-medium">{formatPercent(summary.engagementRate)}</td></tr>)}</tbody>
      </table></div></Card> : <Card><EmptyState message="No monthly data for the selected filters." /></Card>}
    </section>

    <section><SectionHeader eyebrow="Content Detail" title="Matched Campaign Content" description="Open the original post to verify the creative or refine its campaign classification." />
      {filteredRows.length ? <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm min-w-[1100px]">
        <thead><tr className="text-left text-fog-500 text-[11px] uppercase tracking-wide border-b border-navy-900/8"><th className="px-5 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Campaign</th><th className="px-3 py-3 font-medium">Platform</th><th className="px-3 py-3 font-medium">Content</th><th className="px-3 py-3 font-medium">Format</th>{METRICS.map((metric) => <th key={metric.key} className="px-3 py-3 font-medium text-right">{metric.label}</th>)}<th className="px-5 py-3 font-medium text-right">Link</th></tr></thead>
        <tbody>{[...filteredRows].sort((a, b) => b.month.localeCompare(a.month) || b.date.localeCompare(a.date)).map((row) => <tr key={row.id} className="border-b border-navy-900/5 last:border-0 align-top"><td className="px-5 py-3 whitespace-nowrap text-xs text-fog-600">{displayDate(row.date)}</td><td className="px-3 py-3 font-medium text-navy-900 whitespace-nowrap">{row.campaign.label}</td><td className="px-3 py-3 text-fog-600">{row.platform}</td><td className="px-3 py-3 max-w-[320px]"><p className="line-clamp-2 text-navy-900" dir="auto">{row.name}</p></td><td className="px-3 py-3 text-fog-600 whitespace-nowrap">{row.format}</td>{METRICS.map((metric) => <td key={metric.key} className="px-3 py-3 text-right font-mono">{formatNumber(row[metric.key])}</td>)}<td className="px-5 py-3 text-right">{row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-mint-700 font-semibold text-xs hover:underline">Open <ExternalLink size={12} /></a> : <span className="text-fog-400 text-xs">N/A</span>}</td></tr>)}</tbody>
      </table></div></Card> : <Card><EmptyState message="No campaign content matches the selected filters." /></Card>}
    </section>
  </div>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="block"><span className="block text-[11px] font-semibold uppercase tracking-wide text-fog-500 mb-1.5">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-warm-50 border border-navy-900/10 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-900 cursor-pointer">{children}</select></label>;
}
function MetricCell({ metric }: { metric: MetricTotal }) {
  return <td className="px-3 py-3.5 text-right"><span className="font-mono font-medium text-navy-900">{formatNumber(metric.value)}</span>{coverage(metric) && <small className="block text-[9px] text-signal-amber">{coverage(metric)}</small>}</td>;
}

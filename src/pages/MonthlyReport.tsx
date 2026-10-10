import { useEffect, useMemo, useState } from "react";
import {
  Activity, CheckCircle2, ExternalLink, FileText, Globe2,
  Lightbulb, PhoneCall, Share2, TriangleAlert, Users,
} from "lucide-react";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import {
  CAMPAIGN_TO_OPD_DEPARTMENT, OPD_SIGNALS, type CampaignSignalKey,
} from "../data/campaignSignals";
import { fetchInboundCallsSnapshot, mergeInboundCalls, type InboundCallRow } from "../data/inboundCalls";
import { fetchWebsiteLive, type WebsiteDeliveredResponse } from "../data/websiteLive";
import { useFilters } from "../utils/FilterContext";
import { formatFull, formatNumber, formatPercent, monthLabel } from "../utils/format";
import { useDecisionLive } from "../utils/useDecisionLive";

const PLATFORMS = ["Facebook", "Instagram", "YouTube", "TikTok"] as const;
const CAMPAIGNS: Array<{ key: CampaignSignalKey; label: string; pattern: RegExp }> = [
  { key: "dental", label: "Dental Clinic", pattern: /الأسنان|الاسنان|أسنان|سنان|dental|dentist|oral|tooth|teeth/i },
  { key: "headache", label: "Headache Clinic", pattern: /عيادة\s*الصداع|الصداع|صداع|headache|migraine|الشقيقة/i },
  { key: "urology", label: "Urology", pattern: /المسالك|البولي|البولية|الكلى|البروستاتا|الحصوات|حصوات|urolog|kidney|prostate|stone/i },
  { key: "electrophysiology", label: "Electrophysiology", pattern: /كهربية\s*القلب|كهرباء\s*القلب|اضطراب\s*النظم|النبض|نبضة|ضربات\s*القلب|arrhythm|electrophysi|heart\s*rhythm/i },
  { key: "heart", label: "Heart Clinic", pattern: /القلب|قلبي|heart|cardiac|cardio/i },
  { key: "physiotherapy", label: "Physiotherapy", pattern: /العلاج\s*الطبيعي|تأهيل|physio|physiotherapy|rehab/i },
  { key: "oncology", label: "Oncology", pattern: /الأورام|اورام|السرطان|سرطان|oncology|cancer|tumou?r/i },
  { key: "icu", label: "ICU", pattern: /الرعاية\s*المركزة|العناية\s*المركزة|عناية\s*مركزة|icu|intensive\s*care|critical\s*care/i },
  { key: "checkups", label: "Checkups", pattern: /الفحص\s*الشامل|الفحوصات|تحاليل|check[ -]?up|screening|فحص/i },
  { key: "emergency", label: "Emergency", pattern: /الطوارئ|طوارئ|emergency|urgent/i },
];

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sumAvailable(rows: any[], key: string): number | null {
  const values = rows.map(row => row[key]).filter(finite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function completeSum(rows: any[], key: string): number | null {
  const selected = PLATFORMS.map(platform => rows.find(row => row.platform === platform));
  if (selected.some(row => !row || !finite(row[key]))) return null;
  return selected.reduce((sum, row) => sum + row[key], 0);
}

function published(row: any): number | null {
  const posts = finite(row?.posts) ? row.posts : null;
  const videos = finite(row?.videos) ? row.videos : null;
  return posts === null && videos === null ? null : (posts ?? 0) + (videos ?? 0);
}

function completePublished(rows: any[]): number | null {
  const values = PLATFORMS.map(platform => published(rows.find(row => row.platform === platform)));
  return values.some(value => value === null) ? null : (values as number[]).reduce((sum, value) => sum + value, 0);
}

function best(rows: any[], key: string) {
  return [...rows].filter(row => finite(row[key])).sort((a, b) => b[key] - a[key])[0] ?? null;
}

function money(value: number | null | undefined) {
  return finite(value) ? `${formatFull(value)} EGP` : "N/A";
}

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: any }) {
  return <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wide text-fog-500">{label}</p><p className="font-display text-2xl text-navy-900 mt-1">{value}</p></div><Icon size={17} className="text-mint-600"/></div><p className="text-[10px] text-fog-500 mt-2">{note}</p></Card>;
}

function contentTitle(row: any) {
  return String(row?.name || row?.title || "Untitled content");
}

export default function MonthlyReport() {
  const { month } = useFilters();
  const live = useDecisionLive();
  const [website, setWebsite] = useState<WebsiteDeliveredResponse | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [callSnapshot, setCallSnapshot] = useState<InboundCallRow[]>([]);

  useEffect(() => {
    let active = true;
    setWebsite(null); setWebsiteError(null);
    fetchWebsiteLive(month).then(value => { if (active) setWebsite(value); }).catch(error => { if (active) setWebsiteError(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [month]);

  useEffect(() => { fetchInboundCallsSnapshot().then(setCallSnapshot).catch(() => setCallSnapshot([])); }, []);

  const overview = useMemo(() => live.data?.data.overview.filter((row: any) => row.month === month) ?? [], [live.data, month]);
  const content = useMemo(() => live.data?.data.content.filter((row: any) => row.month === month) ?? [], [live.data, month]);
  const videos = useMemo(() => live.data?.data.video.filter((row: any) => row.month === month) ?? [], [live.data, month]);
  const recommendations = useMemo(() => live.data?.data.recommendations.filter((row: any) => row.month === month) ?? [], [live.data, month]);
  const actions = useMemo(() => live.data?.data.actionPlan.filter((row: any) => row.month === month) ?? [], [live.data, month]);
  const liveCalls = Array.isArray(live.data?.data.inboundCalls) ? live.data!.data.inboundCalls as InboundCallRow[] : [];
  const calls = useMemo(() => mergeInboundCalls(callSnapshot, liveCalls).filter(row => row.periodMonth === month), [callSnapshot, liveCalls, month]);

  if (live.loading && !live.data) return <EmptyState message="Preparing the monthly management report…"/>;
  if (!live.data || !overview.length) return <EmptyState message="No verified monthly data is available for this report."/>;

  const totals = {
    views: completeSum(overview, "views"), interactions: completeSum(overview, "interactions"),
    shares: completeSum(overview, "shares"), followers: completeSum(overview, "newFollowers"),
    published: completePublished(overview),
  };
  const topContent = [...content].filter(row => finite(row.interactions)).sort((a, b) => b.interactions - a.interactions).slice(0, 3);
  const topVideos = [...videos].filter(row => finite(row.interactions)).sort((a, b) => b.interactions - a.interactions).slice(0, 3);
  const leadingPlatform = best(overview.filter(row => PLATFORMS.includes(row.platform)), "views");
  const callTotal = (key: keyof InboundCallRow) => {
    const values = calls.map(row => row[key]).filter(finite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const callTotals = { inbound: callTotal("inboundCalls"), opd: callTotal("opdReservations"), clinics: callTotal("clinics") };
  const websiteTotals = website?.data.website[0] ?? {};
  const searchTotals = website?.data.searchConsole.overview[0] ?? {};
  const conversionTotals = website?.data.conversions[0] ?? {};
  const opd = OPD_SIGNALS[month];

  const campaignRows = CAMPAIGNS.map(campaign => {
    const rows = content.filter((row: any) => (row.platform === "Facebook" || row.platform === "Instagram") && campaign.pattern.test([row.name, row.title, row.caption, row.notes].filter(Boolean).join(" ")));
    const department = CAMPAIGN_TO_OPD_DEPARTMENT[campaign.key];
    const operational = department ? opd?.departments.find(item => item.department === department) : null;
    return {
      ...campaign,
      published: rows.length,
      interactions: sumAvailable(rows, "interactions"),
      reach: sumAvailable(rows, "reach"),
      visits: operational?.volume ?? null,
      revenue: operational?.revenue ?? null,
    };
  }).filter(row => row.published > 0 || row.visits !== null).sort((a, b) => (b.interactions ?? 0) - (a.interactions ?? 0)).slice(0, 6);

  const activeActions = actions.filter((row: any) => !["Done", "Closed"].includes(String(row.status || "")));
  const isCurrent = month === live.data.currentMonth;
  const label = new Date(`${month}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" });

  return <div className="monthly-report space-y-9">
    <header className="rounded-3xl bg-navy-900 text-warm-50 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div><p className="text-mint-300 text-[11px] font-semibold uppercase tracking-[0.18em]">Monthly Management Report</p><h1 className="font-display text-3xl sm:text-4xl mt-2">AlMehwar Hospital · {label}</h1><p className="text-warm-100/65 text-sm mt-3 max-w-2xl">One management view across social media, website, call-center and hospital operational signals. No unverified attribution is assumed.</p></div>
        <div className="sm:text-right"><span className={`inline-flex text-[10px] font-semibold px-3 py-1.5 rounded-full ${isCurrent ? "bg-mint-500/20 text-mint-200" : "bg-white/10 text-warm-100"}`}>{isCurrent ? (live.isLive ? "LIVE API · MTD" : "SNAPSHOT · MTD") : "CLOSED MONTH"}</span><p className="text-[10px] text-warm-100/45 mt-2">Generated {new Date().toLocaleDateString("en-GB")}</p></div>
      </div>
    </header>

    <section>
      <SectionHeader eyebrow="Executive KPIs" title="Monthly Performance" description="Totals require complete data from Facebook, Instagram, YouTube and TikTok; incomplete totals remain N/A."/>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label="Total Views" value={formatNumber(totals.views)} note="Four connected platforms" icon={Activity}/>
        <Metric label="Interactions" value={formatNumber(totals.interactions)} note="Four-platform total" icon={CheckCircle2}/>
        <Metric label="Shares" value={formatNumber(totals.shares)} note="Four-platform total" icon={Share2}/>
        <Metric label="New Followers" value={formatNumber(totals.followers)} note="Audience gained" icon={Users}/>
        <Metric label="Content Published" value={formatNumber(totals.published)} note="Posts and videos" icon={FileText}/>
      </div>
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-5">
      <Card><h3 className="font-display text-xl text-navy-900">Management Brief</h3><div className="space-y-3 mt-4 text-sm text-navy-800">
        <p><b>{formatNumber(totals.published)}</b> published items generated <b>{formatNumber(totals.views)}</b> views and <b>{formatNumber(totals.interactions)}</b> interactions.</p>
        <p>{leadingPlatform ? <><b>{leadingPlatform.platform}</b> leads reported platform views with <b>{formatNumber(leadingPlatform.views)}</b>.</> : "A platform leader cannot be calculated from the available data."}</p>
        <p>The website recorded <b>{formatNumber(websiteTotals.sessions)}</b> sessions, while the call center recorded <b>{formatNumber(callTotals.inbound)}</b> inbound calls.</p>
        <p className="text-fog-500">Calls, visits and revenue are contextual business outcomes—not automatically attributed to social or paid campaigns.</p>
      </div></Card>
      <Card><div className="flex items-center gap-2"><TriangleAlert size={17} className="text-signal-amber"/><h3 className="font-display text-xl text-navy-900">Report Readiness</h3></div><ul className="space-y-2 mt-4 text-sm text-navy-700">
        <li>• LinkedIn remains API Pending.</li>
        <li>• {websiteError ? `Website source unavailable: ${websiteError}` : `Website source: ${website?.deliverySource === "api" ? "LIVE API" : "snapshot"}.`}</li>
        <li>• {calls.length ? `${calls.length} call-center reporting days loaded.` : "Call-center data is not available for this month."}</li>
        <li>• Paid campaign results remain excluded from monthly totals until a month-level export exists.</li>
      </ul></Card>
    </section>

    <section>
      <SectionHeader eyebrow="Platforms" title="Platform Snapshot" description="Only metrics reported by each platform are shown; N/A is never treated as zero."/>
      <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead><tr className="bg-warm-100 text-[10px] uppercase tracking-wide text-fog-500">{["Platform", "Views", "Interactions", "Shares", "New Followers", "Published", "Status"].map(head => <th key={head} className={`px-4 py-3 ${head === "Platform" ? "text-left" : "text-right"}`}>{head}</th>)}</tr></thead><tbody>{overview.filter(row => PLATFORMS.includes(row.platform)).map((row: any) => <tr key={row.platform} className="border-t border-navy-900/5"><td className="px-4 py-3 font-semibold text-navy-900">{row.platform}</td><td className="px-4 py-3 text-right">{formatNumber(row.views)}</td><td className="px-4 py-3 text-right">{formatNumber(row.interactions)}</td><td className="px-4 py-3 text-right">{formatNumber(row.shares)}</td><td className="px-4 py-3 text-right">{formatNumber(row.newFollowers)}</td><td className="px-4 py-3 text-right">{formatNumber(published(row))}</td><td className="px-4 py-3 text-right text-xs text-fog-600">{row.status || "Reported"}</td></tr>)}</tbody></table></div></Card>
    </section>

    <section>
      <SectionHeader eyebrow="Content" title="Top Monthly Content" description="Ranked by recorded interactions within the selected month."/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[{ title: "Top Content", rows: topContent }, { title: "Top Videos", rows: topVideos }].map(group => <Card key={group.title}><h3 className="font-display text-xl text-navy-900">{group.title}</h3><div className="space-y-3 mt-4">{group.rows.map((row: any, index: number) => <div key={row.id || index} className="flex gap-3 border-t border-navy-900/5 pt-3 first:border-0 first:pt-0"><span className="font-display text-xl text-mint-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-navy-900 line-clamp-2">{contentTitle(row)}</p><p className="text-[10px] text-fog-500 mt-1">{row.platform} · {formatNumber(row.interactions)} interactions · {formatNumber(row.views)} views</p>{row.url && <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-signal-blue mt-1">Open <ExternalLink size={10}/></a>}</div></div>)}{!group.rows.length && <p className="text-sm text-fog-500">No rankable items.</p>}</div></Card>)}
      </div>
    </section>

    <section>
      <SectionHeader eyebrow="Website & Calls" title="Business Signals" description="Digital and operational signals are reported side by side without claiming direct attribution."/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Website Sessions" value={formatNumber(websiteTotals.sessions)} note="GA4" icon={Globe2}/>
        <Metric label="Search Clicks" value={formatNumber(searchTotals.clicks)} note="Search Console" icon={Globe2}/>
        <Metric label="Form Submits" value={formatNumber(conversionTotals.formSubmits)} note="GA4 form_submit only" icon={FileText}/>
        <Metric label="Inbound Calls" value={formatNumber(callTotals.inbound)} note={`${calls.length} reporting days`} icon={PhoneCall}/>
        <Metric label="Clinic Calls" value={formatNumber(callTotals.clinics)} note="Call-center category" icon={PhoneCall}/>
        <Metric label="OPD Reservations" value={formatNumber(callTotals.opd)} note="Operational signal" icon={CheckCircle2}/>
        <Metric label="OPD Visits" value={formatNumber(opd?.consultationVolume)} note={opd?.asOf || "Not available"} icon={Users}/>
        <Metric label="OPD Revenue" value={money(opd?.consultationRevenue)} note="Consultation revenue" icon={Activity}/>
      </div>
    </section>

    <section>
      <SectionHeader eyebrow="Campaign Context" title="Campaign & Clinic Snapshot" description="Facebook/Instagram content performance and clinic operations are separate signals. Visits and revenue are not claimed as campaign conversions."/>
      <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-warm-100 text-[10px] uppercase tracking-wide text-fog-500">{["Campaign", "Content", "Interactions", "Available Reach", "Clinic Visits", "Clinic Revenue"].map(head => <th key={head} className={`px-4 py-3 ${head === "Campaign" ? "text-left" : "text-right"}`}>{head}</th>)}</tr></thead><tbody>{campaignRows.map(row => <tr key={row.key} className="border-t border-navy-900/5"><td className="px-4 py-3 font-semibold text-navy-900">{row.label}</td><td className="px-4 py-3 text-right">{formatNumber(row.published)}</td><td className="px-4 py-3 text-right">{formatNumber(row.interactions)}</td><td className="px-4 py-3 text-right">{formatNumber(row.reach)}</td><td className="px-4 py-3 text-right">{formatNumber(row.visits)}</td><td className="px-4 py-3 text-right">{money(row.revenue)}</td></tr>)}{!campaignRows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-fog-500">No campaign or clinic signals for this month.</td></tr>}</tbody></table></div></Card>
    </section>

    <section>
      <SectionHeader eyebrow="Decisions" title="Recommendations & Action Plan" description="Only recorded team workflow items are included."/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card><div className="flex items-center gap-2"><Lightbulb size={17} className="text-signal-amber"/><h3 className="font-display text-xl text-navy-900">Recommendations</h3></div><div className="space-y-3 mt-4">{recommendations.slice(0, 5).map((row: any) => <div key={row.id} className="border-t border-navy-900/5 pt-3 first:border-0 first:pt-0"><div className="flex justify-between gap-3"><p className="text-sm font-medium text-navy-900">{row.title || row.observation}</p><span className="text-[9px] rounded-full bg-warm-100 px-2 py-1 h-fit whitespace-nowrap">{row.decision || row.status || "Draft"}</span></div><p className="text-[10px] text-fog-500 mt-1 line-clamp-2">{row.recommendedAction}</p></div>)}{!recommendations.length && <p className="text-sm text-fog-500">No recommendations recorded.</p>}</div></Card>
        <Card><div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-mint-600"/><h3 className="font-display text-xl text-navy-900">Active Actions</h3></div><div className="space-y-3 mt-4">{activeActions.slice(0, 5).map((row: any) => <div key={row.id} className="border-t border-navy-900/5 pt-3 first:border-0 first:pt-0"><div className="flex justify-between gap-3"><p className="text-sm font-medium text-navy-900">{row.action}</p><span className="text-[9px] rounded-full bg-mint-100 text-mint-700 px-2 py-1 h-fit whitespace-nowrap">{row.status || "Planned"}</span></div><p className="text-[10px] text-fog-500 mt-1">Owner: {row.owner || "Not assigned"} · KPI: {row.targetKpi || "Not defined"}</p></div>)}{!activeActions.length && <p className="text-sm text-fog-500">No active actions recorded.</p>}</div></Card>
      </div>
    </section>

    <footer className="border-t border-navy-900/10 pt-4 text-[10px] text-fog-500 flex flex-col sm:flex-row gap-2 justify-between"><span>AlMehwar Social Intelligence · Management Report</span><span>MTD values remain open until the month is closed. Missing data is shown as N/A.</span></footer>
  </div>;
}

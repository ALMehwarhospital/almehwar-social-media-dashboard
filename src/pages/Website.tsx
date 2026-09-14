import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Eye,
  FileCheck2,
  FormInput,
  Globe2,
  MousePointerClick,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import { websiteData, websiteMonths, type WebsiteMonthData } from "../data/websiteData";
import { useFilters } from "../utils/FilterContext";

const CHART_COLORS = ["#0E3145", "#3C7391", "#916C3C", "#DEAF71", "#6D8F7A", "#9AA7AF", "#C8B28A", "#B76E5E"];

function compact(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function integer(value: number) {
  return new Intl.NumberFormat("en").format(Math.round(value));
}

function pct(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function seconds(value: number) {
  const mins = Math.floor(value / 60);
  const secs = Math.round(value % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function change(current: number, previous?: number) {
  if (previous === undefined || previous === 0) return null;
  return (current - previous) / previous;
}

function monthName(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
}

function channelValue(data: WebsiteMonthData, channel: string) {
  return data.traffic.find((item) => item.channel === channel);
}

function appointmentSessions(data: WebsiteMonthData) {
  return data.landingPages
    .filter((page) => page.path.includes("book-an-appointment") || page.path.includes("احجز-موعدا"))
    .reduce((sum, page) => sum + page.sessions, 0);
}

function pageType(path: string) {
  if (path === "/" || path === "/ar") return "Homepage";
  if (path.includes("book-an-appointment") || path.includes("احجز-موعدا")) return "Appointment";
  if (path.includes("/doctors/")) return "Doctor profile";
  if (path.includes("workshop")) return "Workshop";
  if (path.includes("opd-schedule")) return "OPD schedule";
  return "Other";
}

function buildHeadline(current: WebsiteMonthData, previous?: WebsiteMonthData) {
  if (!previous) return "Search-led traffic establishes a strong website baseline, while conversion tracking still needs tightening.";

  const sessions = change(current.overview.sessions, previous.overview.sessions) ?? 0;
  const completion = current.conversions.completionRate - previous.conversions.completionRate;
  const organicShare = (channelValue(current, "Organic Search")?.share ?? 0) - (channelValue(previous, "Organic Search")?.share ?? 0);

  if (sessions > 0.1 && completion < 0) return "Traffic is scaling, but conversion efficiency is not keeping pace with demand.";
  if (organicShare < -0.05) return "Acquisition is diversifying beyond organic search — useful growth, but the mix needs active management.";
  if (sessions > 0.05) return "Website demand is growing, with stronger traffic and more high-intent visits.";
  return "Website performance is broadly stable — the next gains will come from conversion and search efficiency.";
}

function MetricCard({
  label,
  value,
  previous,
  icon: Icon,
  context,
  format = integer,
}: {
  label: string;
  value: number;
  previous?: number;
  icon: LucideIcon;
  context?: string;
  format?: (v: number) => string;
}) {
  const delta = change(value, previous);
  const positive = delta !== null && delta >= 0;
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fog-500">{label}</p>
          <p className="font-display text-2xl sm:text-3xl text-navy-900 mt-1">{format(value)}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center shrink-0">
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-3 min-h-[34px]">
        {delta !== null ? (
          <div className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-mint-700" : "text-signal-coral"}`}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta * 100).toFixed(1)}% vs previous month
          </div>
        ) : (
          <p className="text-xs text-fog-400">Baseline month</p>
        )}
        {context && <p className="text-[11px] text-fog-500 mt-1">{context}</p>}
      </div>
    </Card>
  );
}

function InsightCard({ tone, title, body, action }: { tone: "good" | "watch" | "info"; title: string; body: string; action: string }) {
  const cls = tone === "good"
    ? "bg-mint-100/70 border-mint-500/20"
    : tone === "watch"
      ? "bg-signal-amber/8 border-signal-amber/25"
      : "bg-fog-100/60 border-navy-900/8";
  const iconCls = tone === "good" ? "text-mint-700" : tone === "watch" ? "text-signal-amber" : "text-blue-600";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="flex items-start gap-3">
        <Sparkles size={17} className={`mt-0.5 shrink-0 ${iconCls}`} />
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          <p className="text-xs text-navy-700/80 mt-1 leading-relaxed">{body}</p>
          <p className="text-[11px] text-fog-600 mt-2"><span className="font-semibold text-navy-700">Next move:</span> {action}</p>
        </div>
      </div>
    </div>
  );
}

export default function Website() {
  const { month } = useFilters();
  const current = websiteData[month];
  if (!current) return <EmptyState message="No website data for the selected month." />;

  const monthIndex = websiteMonths.indexOf(month);
  const previous = monthIndex > 0 ? websiteData[websiteMonths[monthIndex - 1]] : undefined;

  const trendData = websiteMonths
    .filter((m) => websiteMonths.indexOf(m) <= monthIndex)
    .map((m) => ({
      month: monthName(m).split(" ")[0],
      activeUsers: websiteData[m].overview.activeUsers,
      sessions: websiteData[m].overview.sessions,
      pageViews: websiteData[m].overview.pageViews,
    }));

  const trafficChart = current.traffic.slice(0, 6).map((item) => ({
    ...item,
    sharePct: Number((item.share * 100).toFixed(2)),
  }));

  const organic = channelValue(current, "Organic Search");
  const previousOrganic = previous ? channelValue(previous, "Organic Search") : undefined;
  const paidSocial = channelValue(current, "Paid Social");
  const previousPaidSocial = previous ? channelValue(previous, "Paid Social") : undefined;
  const aiAssistant = channelValue(current, "AI Assistant");
  const organicSocial = channelValue(current, "Organic Social");

  const topPages = current.landingPages.filter((page) => page.path !== "(not set)").slice(0, 8);
  const topQueries = current.search.topQueries.slice(0, 8);
  const queryChart = current.search.topQueries.slice(0, 5).map((q) => ({ query: q.query, clicks: q.clicks }));

  const currentAppointment = appointmentSessions(current);
  const previousAppointment = previous ? appointmentSessions(previous) : undefined;
  const appointmentChange = previousAppointment ? change(currentAppointment, previousAppointment) : null;

  const seoOpportunity = [...current.search.topQueries]
    .filter((q) => q.position <= 8 && q.ctr < 0.05)
    .sort((a, b) => b.impressions - a.impressions)[0];

  const sessionChange = previous ? change(current.overview.sessions, previous.overview.sessions) : null;
  const formStartChange = previous ? change(current.conversions.formStarts, previous.conversions.formStarts) : null;
  const completionDelta = previous ? current.conversions.completionRate - previous.conversions.completionRate : null;
  const paidShareDelta = previousPaidSocial ? (paidSocial?.share ?? 0) - previousPaidSocial.share : null;

  return (
    <div className="space-y-10">
      <div className="rounded-3xl bg-navy-900 text-warm-50 p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-mint-500/10" />
        <div className="absolute right-12 -bottom-20 w-52 h-52 rounded-full bg-blue-500/10" />
        <div className="relative max-w-4xl">
          <div className="flex items-center gap-2 text-mint-300 mb-3">
            <Globe2 size={17} />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">Website Intelligence · {monthName(month)}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">{buildHeadline(current, previous)}</h1>
          <p className="text-warm-100/65 text-sm mt-3 max-w-3xl">GA4 + Google Search Console combined into one decision view: demand, acquisition, landing-page intent, SEO visibility and conversion friction.</p>
        </div>
      </div>

      <section>
        <SectionHeader eyebrow="Executive Read" title="Website Pulse" description="The small set of KPIs that tells us whether demand is growing, sessions are healthy, and traffic is turning into action." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Users" value={current.overview.activeUsers} previous={previous?.overview.activeUsers} icon={Users} />
          <MetricCard label="Sessions" value={current.overview.sessions} previous={previous?.overview.sessions} icon={Activity} />
          <MetricCard label="Page Views" value={current.overview.pageViews} previous={previous?.overview.pageViews} icon={Eye} />
          <MetricCard label="Form Submits" value={current.conversions.formSubmits} previous={previous?.conversions.formSubmits} icon={FileCheck2} context="Operational conversion event" />
          <MetricCard label="Engagement Rate" value={current.overview.engagementRate} previous={previous?.overview.engagementRate} icon={Target} format={(v) => pct(v, 1)} />
          <MetricCard label="Avg Session Duration" value={current.overview.avgSessionDuration} previous={previous?.overview.avgSessionDuration} icon={Clock3} format={seconds} />
          <MetricCard label="Organic Search Share" value={organic?.share ?? 0} previous={previousOrganic?.share} icon={Search} format={(v) => pct(v, 1)} context="Share inside channel report" />
          <MetricCard label="Search Clicks" value={current.search.clicks} previous={previous?.search.clicks} icon={MousePointerClick} context="Google organic clicks" />
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Growth + Acquisition" title="Where the website is growing from" description="Monthly scale on the left; current traffic mix on the right. This separates growth from the source driving it." />
        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-5">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-navy-900">3-month demand trend</h3>
                <p className="text-xs text-fog-500 mt-0.5">Active users, sessions and page views</p>
              </div>
              {sessionChange !== null && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sessionChange >= 0 ? "bg-mint-100 text-mint-700" : "bg-signal-coral/10 text-signal-coral"}`}>
                  Sessions {sessionChange >= 0 ? "+" : ""}{(sessionChange * 100).toFixed(1)}% MoM
                </span>
              )}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} tickFormatter={compact} width={45} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                  <Line type="monotone" dataKey="activeUsers" name="Active users" stroke="#3C7391" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#916C3C" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pageViews" name="Page views" stroke="#0E3145" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="mb-2">
              <h3 className="font-semibold text-navy-900">Traffic mix</h3>
              <p className="text-xs text-fog-500 mt-0.5">Session share by channel</p>
            </div>
            <div className="grid sm:grid-cols-[180px_1fr] lg:grid-cols-1 xl:grid-cols-[180px_1fr] items-center gap-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficChart} dataKey="sharePct" nameKey="channel" innerRadius={52} outerRadius={78} paddingAngle={2}>
                      {trafficChart.map((entry, index) => <Cell key={entry.channel} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {trafficChart.slice(0, 5).map((item, index) => (
                  <div key={item.channel} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-navy-700 truncate">{item.channel}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-navy-900">{pct(item.share, 1)}</span>
                      <span className="text-fog-400 ml-1">· {integer(item.sessions)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-navy-900/6">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-fog-500">Paid Social</p>
                <p className="font-semibold text-navy-900 mt-0.5">{pct(paidSocial?.share ?? 0, 1)}</p>
                {paidShareDelta !== null && <p className="text-[10px] text-fog-500">{paidShareDelta >= 0 ? "+" : ""}{(paidShareDelta * 100).toFixed(1)}pp MoM</p>}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-fog-500">Organic Social</p>
                <p className="font-semibold text-navy-900 mt-0.5">{pct(organicSocial?.share ?? 0, 1)}</p>
                <p className="text-[10px] text-fog-500">{integer(organicSocial?.sessions ?? 0)} sessions</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-fog-500">AI Assistant</p>
                <p className="font-semibold text-navy-900 mt-0.5">{pct(aiAssistant?.share ?? 0, 1)}</p>
                <p className="text-[10px] text-fog-500">{integer(aiAssistant?.sessions ?? 0)} sessions</p>
              </div>
            </div>
          </Card>
        </div>
        <p className="text-[11px] text-fog-500 mt-2">Monthly totals come from Website Raw. Channel reporting is used for acquisition mix only because Google can return small aggregation differences between reports.</p>
      </section>

      <section>
        <SectionHeader eyebrow="Landing Intent" title="Which pages are actually pulling people in" description="Top landing pages show where demand starts — doctors, appointments, workshops and the main hospital entry points." />
        <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-5">
          <Card className="overflow-hidden p-0">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-900">Top landing pages</h3>
                <p className="text-xs text-fog-500 mt-0.5">Ranked by landing sessions</p>
              </div>
              <span className="text-[11px] font-medium bg-fog-100 text-fog-600 px-2 py-1 rounded-full">(not set) excluded</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-100/80 text-[10px] uppercase tracking-wide text-fog-500">
                  <tr>
                    <th className="text-left px-5 py-2.5">Landing page</th>
                    <th className="text-left px-3 py-2.5">Intent</th>
                    <th className="text-right px-3 py-2.5">Sessions</th>
                    <th className="text-right px-5 py-2.5">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((page) => (
                    <tr key={page.path} className="border-t border-navy-900/5">
                      <td className="px-5 py-3 max-w-[360px]"><p dir="auto" className="font-mono text-xs text-navy-800 truncate" title={page.path}>{page.path}</p></td>
                      <td className="px-3 py-3"><span className="text-[10px] font-semibold bg-mint-100 text-mint-700 px-2 py-1 rounded-full whitespace-nowrap">{pageType(page.path)}</span></td>
                      <td className="px-3 py-3 text-right font-semibold text-navy-900">{integer(page.sessions)}</td>
                      <td className="px-5 py-3 text-right text-navy-700">{pct(page.engagementRate, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2 text-blue-600">
                <Target size={16} />
                <p className="text-[11px] uppercase tracking-wide font-semibold">Appointment intent</p>
              </div>
              <p className="font-display text-3xl text-navy-900 mt-3">{integer(currentAppointment)}</p>
              <p className="text-xs text-fog-500 mt-1">Landing sessions across English + Arabic appointment pages.</p>
              {appointmentChange !== null && (
                <p className={`text-xs font-semibold mt-3 ${appointmentChange >= 0 ? "text-mint-700" : "text-signal-coral"}`}>
                  {appointmentChange >= 0 ? "+" : ""}{(appointmentChange * 100).toFixed(1)}% vs previous month
                </p>
              )}
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-mint-700">
                <TrendingUp size={16} />
                <p className="text-[11px] uppercase tracking-wide font-semibold">Top doctor entry</p>
              </div>
              {(() => {
                const doctor = topPages.filter((p) => p.path.includes("/doctors/")).sort((a, b) => b.sessions - a.sessions)[0];
                return doctor ? (
                  <>
                    <p className="font-display text-3xl text-navy-900 mt-3">{integer(doctor.sessions)}</p>
                    <p dir="auto" className="text-xs text-fog-500 mt-1 break-words">{doctor.path}</p>
                  </>
                ) : <p className="text-sm text-fog-500 mt-3">No doctor page in the top landing pages.</p>;
              })()}
            </Card>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="SEO Intelligence" title="What people are searching for on Google" description="Search Console separates brand demand from doctor-name demand and exposes high-impression queries that are under-clicked." />
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-fog-500">Clicks</p>
            <p className="font-display text-2xl text-navy-900 mt-1">{integer(current.search.clicks)}</p>
            {previous && <p className={`text-[11px] mt-1 ${(change(current.search.clicks, previous.search.clicks) ?? 0) >= 0 ? "text-mint-700" : "text-signal-coral"}`}>{((change(current.search.clicks, previous.search.clicks) ?? 0) * 100).toFixed(1)}% MoM</p>}
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-fog-500">Impressions</p>
            <p className="font-display text-2xl text-navy-900 mt-1">{compact(current.search.impressions)}</p>
            {previous && <p className={`text-[11px] mt-1 ${(change(current.search.impressions, previous.search.impressions) ?? 0) >= 0 ? "text-mint-700" : "text-signal-coral"}`}>{((change(current.search.impressions, previous.search.impressions) ?? 0) * 100).toFixed(1)}% MoM</p>}
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-fog-500">CTR</p>
            <p className="font-display text-2xl text-navy-900 mt-1">{pct(current.search.ctr, 2)}</p>
            {previous && <p className="text-[11px] text-fog-500 mt-1">{((current.search.ctr - previous.search.ctr) * 100).toFixed(2)}pp MoM</p>}
          </Card>
        </div>

        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <Card>
            <h3 className="font-semibold text-navy-900">Top queries by clicks</h3>
            <p className="text-xs text-fog-500 mt-0.5 mb-4">Fast visual read of organic demand</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queryChart} layout="vertical" margin={{ left: 10, right: 10, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#5F6F78" }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="query" type="category" width={130} tick={{ fontSize: 10, fill: "#0E3145" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                  <Bar dataKey="clicks" fill="#3C7391" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="px-5 pt-5 pb-3">
              <h3 className="font-semibold text-navy-900">Search query detail</h3>
              <p className="text-xs text-fog-500 mt-0.5">Clicks, visibility, CTR and average Google position</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-warm-100/80 text-[10px] uppercase tracking-wide text-fog-500">
                  <tr>
                    <th className="text-left px-5 py-2.5">Query</th>
                    <th className="text-right px-3 py-2.5">Clicks</th>
                    <th className="text-right px-3 py-2.5">Impr.</th>
                    <th className="text-right px-3 py-2.5">CTR</th>
                    <th className="text-right px-5 py-2.5">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.map((query) => (
                    <tr key={`${query.query}-${query.position}`} className="border-t border-navy-900/5">
                      <td className="px-5 py-3 max-w-[290px]"><p dir="auto" className="text-xs font-medium text-navy-800 truncate" title={query.query}>{query.query}</p></td>
                      <td className="px-3 py-3 text-right font-semibold text-navy-900">{integer(query.clicks)}</td>
                      <td className="px-3 py-3 text-right text-navy-700">{integer(query.impressions)}</td>
                      <td className="px-3 py-3 text-right text-navy-700">{pct(query.ctr, 1)}</td>
                      <td className="px-5 py-3 text-right text-navy-700">{query.position.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Conversion" title="Demand is visible — now measure how much becomes action" description="The current conversion layer uses GA4 form events. This is useful operationally, but key-event configuration is still missing." />
        <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-5">
          <Card>
            <div className="flex items-center gap-2 text-mint-700 mb-5">
              <FormInput size={17} />
              <h3 className="font-semibold text-navy-900">Form event funnel</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-navy-700">Form starts</span><span className="font-semibold text-navy-900">{integer(current.conversions.formStarts)}</span></div>
                <div className="h-3 rounded-full bg-fog-100 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-navy-700">Form submits</span><span className="font-semibold text-navy-900">{integer(current.conversions.formSubmits)}</span></div>
                <div className="h-3 rounded-full bg-fog-100 overflow-hidden"><div className="h-full bg-mint-500 rounded-full min-w-[4px]" style={{ width: `${Math.max(current.conversions.completionRate * 100, 1)}%` }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-warm-100 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-fog-500">Completion rate</p>
                  <p className="font-display text-2xl text-navy-900 mt-1">{pct(current.conversions.completionRate, 2)}</p>
                </div>
                <div className="rounded-xl bg-warm-100 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-fog-500">Submit users</p>
                  <p className="font-display text-2xl text-navy-900 mt-1">{integer(current.conversions.submitUsers)}</p>
                </div>
              </div>
              {formStartChange !== null && completionDelta !== null && (
                <p className="text-xs text-fog-600 leading-relaxed">Form starts changed <span className="font-semibold text-navy-800">{formStartChange >= 0 ? "+" : ""}{(formStartChange * 100).toFixed(1)}%</span>, while completion changed <span className="font-semibold text-navy-800">{completionDelta >= 0 ? "+" : ""}{(completionDelta * 100).toFixed(2)}pp</span>.</p>
              )}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <InsightCard
              tone={paidShareDelta !== null && paidShareDelta > 0.03 ? "watch" : "info"}
              title="Acquisition mix is changing"
              body={`Organic Search is ${pct(organic?.share ?? 0, 1)} of channel sessions${paidSocial ? `, while Paid Social is ${pct(paidSocial.share, 1)}` : ""}. ${paidShareDelta !== null ? `Paid Social moved ${paidShareDelta >= 0 ? "+" : ""}${(paidShareDelta * 100).toFixed(1)} percentage points month over month.` : ""}`}
              action="Keep Organic and Paid separated in every performance decision; do not credit paid growth to SEO."
            />
            <InsightCard
              tone={appointmentChange !== null && appointmentChange > 0.2 ? "good" : "info"}
              title="High-intent appointment traffic"
              body={`${integer(currentAppointment)} landing sessions started on appointment pages${appointmentChange !== null ? `, ${appointmentChange >= 0 ? "up" : "down"} ${Math.abs(appointmentChange * 100).toFixed(1)}% from the previous month` : ""}.`}
              action="Review appointment-page CTA, phone/WhatsApp paths and form friction before adding more traffic."
            />
            <InsightCard
              tone={completionDelta !== null && completionDelta < 0 ? "watch" : "good"}
              title="Conversion efficiency needs attention"
              body={`${integer(current.conversions.formStarts)} form starts produced ${integer(current.conversions.formSubmits)} submit events, a ${pct(current.conversions.completionRate, 2)} event completion rate.`}
              action="Audit form UX and tracking, then mark form_submit as a GA4 Key Event so conversion reporting becomes native."
            />
            <InsightCard
              tone={seoOpportunity ? "watch" : "good"}
              title={seoOpportunity ? "SEO click-through opportunity" : "SEO demand is healthy"}
              body={seoOpportunity ? `“${seoOpportunity.query}” generated ${integer(seoOpportunity.impressions)} impressions at position ${seoOpportunity.position.toFixed(2)} but only ${pct(seoOpportunity.ctr, 1)} CTR.` : `${integer(current.search.clicks)} organic clicks came from ${integer(current.search.impressions)} search impressions.`}
              action={seoOpportunity ? "Improve title/meta copy and strengthen the matching doctor/service landing page." : "Protect the strongest branded and doctor-name rankings while expanding non-brand service queries."}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-signal-amber/30 bg-signal-amber/8 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-signal-amber mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-navy-900">Tracking note</h3>
            <p className="text-xs text-navy-700/80 mt-1 leading-relaxed">GA4 currently reports <strong>0 Key Events</strong>. This dashboard therefore treats <strong>form_submit</strong> as the operational website conversion, not as a configured GA4 conversion. Raw source layers: Website Raw, Website Traffic Raw, Website Pages Raw, Search Console Raw and Website Conversions Raw.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

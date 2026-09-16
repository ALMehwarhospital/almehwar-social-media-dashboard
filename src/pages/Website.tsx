import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Eye,
  FileCheck2,
  Globe2,
  MousePointerClick,
  Search,
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
import { websiteSourceData } from "../data/websiteSources";
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
        {context && <p className="text-[11px] text-fog-500 mt-1 leading-relaxed">{context}</p>}
      </div>
    </Card>
  );
}

function SourceBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-mint-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mint-700">
      {children}
    </span>
  );
}

export default function Website() {
  const { month } = useFilters();
  const current = websiteData[month];
  if (!current) return <EmptyState message="No website data for the selected month." />;

  const monthIndex = websiteMonths.indexOf(month);
  const previous = monthIndex > 0 ? websiteData[websiteMonths[monthIndex - 1]] : undefined;
  const visibleMonths = websiteMonths.filter((m) => websiteMonths.indexOf(m) <= monthIndex);

  const ga4Trend = visibleMonths.map((m) => ({
    month: monthName(m).split(" ")[0],
    activeUsers: websiteData[m].overview.activeUsers,
    sessions: websiteData[m].overview.sessions,
    pageViews: websiteData[m].overview.pageViews,
  }));

  const searchTrend = visibleMonths.map((m) => ({
    month: monthName(m).split(" ")[0],
    clicks: websiteData[m].search.clicks,
    impressions: websiteData[m].search.impressions,
    avgPosition: websiteData[m].search.avgPosition,
  }));

  const trafficChart = current.traffic.slice(0, 6).map((item) => ({
    ...item,
    sharePct: Number((item.share * 100).toFixed(2)),
  }));

  const sourceRows = websiteSourceData[month] ?? [];
  const sourceChart = sourceRows.slice(0, 8).map((item) => ({ source: item.source, sessions: item.sessions }));
  const organic = channelValue(current, "Organic Search");
  const currentAppointment = appointmentSessions(current);
  const previousAppointment = previous ? appointmentSessions(previous) : undefined;
  const appointmentDelta = previousAppointment ? change(currentAppointment, previousAppointment) : null;
  const topPages = current.landingPages.filter((page) => page.path !== "(not set)").slice(0, 8);
  const detailQueries = current.search.topQueries.slice(0, 8);
  const seoOpportunity = [...current.search.topQueries]
    .filter((q) => q.position <= 8 && q.ctr < 0.05)
    .sort((a, b) => b.impressions - a.impressions)[0];

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
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">Website performance, separated by source of truth.</h1>
          <p className="text-warm-100/65 text-sm mt-3 max-w-3xl">
            Google Analytics 4 explains on-site behavior and acquisition. Google Search Console explains organic Google visibility and search demand. Their metrics are shown separately to avoid mixing definitions.
          </p>
        </div>
      </div>

      <section className="space-y-6">
        <div className="rounded-2xl border border-navy-900/10 bg-warm-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <SourceBadge>Google Analytics 4</SourceBadge>
            <h2 className="font-display text-2xl text-navy-900 mt-2">Traffic, behavior and on-site actions</h2>
            <p className="text-sm text-fog-600 mt-1">Users, sessions, acquisition sources, landing pages and tracked form events.</p>
          </div>
          <div className="text-xs text-fog-500">Source layer: Website Raw + Traffic + Pages + Conversions</div>
        </div>

        <div>
          <SectionHeader eyebrow="GA4 · Executive Read" title="Website pulse" description="Core on-site metrics for the selected month. These are GA4 metrics only." />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Active Users" value={current.overview.activeUsers} previous={previous?.overview.activeUsers} icon={Users} />
            <MetricCard label="Sessions" value={current.overview.sessions} previous={previous?.overview.sessions} icon={Activity} />
            <MetricCard label="Page Views" value={current.overview.pageViews} previous={previous?.overview.pageViews} icon={Eye} />
            <MetricCard label="Engaged Sessions" value={current.overview.engagedSessions} previous={previous?.overview.engagedSessions} icon={Target} />
            <MetricCard label="Engagement Rate" value={current.overview.engagementRate} previous={previous?.overview.engagementRate} icon={TrendingUp} format={(v) => pct(v, 1)} />
            <MetricCard label="Views / Session" value={current.overview.viewsPerSession} previous={previous?.overview.viewsPerSession} icon={BarChart3} format={(v) => v.toFixed(2)} />
            <MetricCard label="Appointment Landing Sessions" value={currentAppointment} previous={previousAppointment} icon={MousePointerClick} context="English + Arabic appointment landing pages" />
            <MetricCard label="Tracked Form Submits" value={current.conversions.formSubmits} previous={previous?.conversions.formSubmits} icon={FileCheck2} context="GA4 form_submit events only — not total leads or registrations" />
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="GA4 · Trend" title="Website traffic performance" description="The charts are split by scale so users/sessions do not get visually flattened by page-view volume." />
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-navy-900">Users vs sessions</h3>
                  <p className="text-xs text-fog-500 mt-0.5">Monthly traffic volume</p>
                </div>
                <div className="flex gap-3 text-[10px] text-fog-600">
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3C7391]" />Active users</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#916C3C]" />Sessions</span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ga4Trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} tickFormatter={compact} width={46} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                    <Line type="monotone" dataKey="activeUsers" name="Active users" stroke="#3C7391" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#916C3C" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <div className="mb-4">
                <h3 className="font-semibold text-navy-900">Page views</h3>
                <p className="text-xs text-fog-500 mt-0.5">Kept on its own scale for clearer month-to-month movement</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ga4Trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} tickFormatter={compact} width={46} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                    <Bar dataKey="pageViews" name="Page views" fill="#0E3145" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="GA4 · Acquisition" title="Where website traffic came from" description="Channel Group answers the marketing-channel question; Session Source shows the concrete source labels Google received." />
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
            <Card>
              <div className="mb-2">
                <h3 className="font-semibold text-navy-900">Traffic by channel</h3>
                <p className="text-xs text-fog-500 mt-0.5">Session share using monthly Website Raw sessions as the denominator</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={trafficChart} dataKey="sharePct" nameKey="channel" innerRadius={55} outerRadius={82} paddingAngle={2}>
                      {trafficChart.map((entry, index) => <Cell key={entry.channel} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} formatter={(value) => [`${value}%`, "Share"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-2">
                {trafficChart.slice(0, 5).map((item, index) => (
                  <div key={item.channel} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-navy-700 truncate">{item.channel}</span>
                    </div>
                    <span className="font-semibold text-navy-900">{pct(item.share, 1)} · {integer(item.sessions)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-navy-900">Top session sources</h3>
                  <p className="text-xs text-fog-500 mt-0.5">Concrete sources such as google, fb, facebook.com and chatgpt.com</p>
                </div>
                <span className="text-[10px] rounded-full bg-fog-100 px-2 py-1 text-fog-600">Source-level snapshot</span>
              </div>

              {sourceRows.length > 0 ? (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourceChart} layout="vertical" margin={{ left: 12, right: 12, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#5F6F78" }} axisLine={false} tickLine={false} tickFormatter={compact} />
                        <YAxis type="category" dataKey="source" width={105} tick={{ fontSize: 10, fill: "#334A57" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                        <Bar dataKey="sessions" name="Sessions" fill="#3C7391" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto mt-3 border-t border-navy-900/6 pt-3">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] uppercase tracking-wide text-fog-500">
                        <tr>
                          <th className="text-left py-2">Source</th>
                          <th className="text-right py-2">Users</th>
                          <th className="text-right py-2">Sessions</th>
                          <th className="text-right py-2">Eng. rate</th>
                          <th className="text-right py-2">Avg eng. time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceRows.slice(0, 10).map((row) => (
                          <tr key={row.source} className="border-t border-navy-900/5">
                            <td className="py-2.5 font-medium text-navy-800">{row.source}</td>
                            <td className="py-2.5 text-right text-navy-700">{integer(row.activeUsers)}</td>
                            <td className="py-2.5 text-right font-semibold text-navy-900">{integer(row.sessions)}</td>
                            <td className="py-2.5 text-right text-navy-700">{pct(row.engagementRate, 1)}</td>
                            <td className="py-2.5 text-right text-navy-700">{row.avgEngagementTimeSec}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-fog-500 mt-3">“(not set)” is kept visible because it represents unclassified GA4 source data, not a real referring website.</p>
                </>
              ) : (
                <div className="min-h-72 flex items-center justify-center rounded-xl bg-fog-100/60 px-6 text-center">
                  <p className="text-sm text-fog-600">Source-level GA4 data is currently loaded for August 2026 only. Channel-level acquisition remains available for this month.</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="GA4 · Landing Intent" title="Which pages pull people into the website" description="Landing sessions show where a visit starts — useful for appointments, doctors, workshops and service demand." />
          <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-5">
            <Card className="overflow-hidden p-0">
              <div className="px-5 pt-5 pb-3">
                <h3 className="font-semibold text-navy-900">Top landing pages</h3>
                <p className="text-xs text-fog-500 mt-0.5">Ranked by landing sessions · (not set) excluded</p>
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
                <p className="text-[10px] uppercase tracking-wide font-semibold text-blue-600">Appointment intent</p>
                <p className="font-display text-3xl text-navy-900 mt-3">{integer(currentAppointment)}</p>
                <p className="text-xs text-fog-500 mt-1">Landing sessions across appointment pages.</p>
                {appointmentDelta !== null && <p className={`text-xs font-semibold mt-3 ${appointmentDelta >= 0 ? "text-mint-700" : "text-signal-coral"}`}>{appointmentDelta >= 0 ? "+" : ""}{(appointmentDelta * 100).toFixed(1)}% vs previous month</p>}
              </Card>
              <Card>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-mint-700">Form tracking status</p>
                <p className="font-display text-3xl text-navy-900 mt-3">{integer(current.conversions.formSubmits)}</p>
                <p className="text-xs text-fog-500 mt-1">GA4 form_submit events only.</p>
                <div className="mt-3 rounded-xl bg-signal-amber/8 border border-signal-amber/20 p-3 text-[11px] leading-relaxed text-navy-700">
                  This is not treated as total leads or registrations because known website form submissions can occur without being captured by this event.
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 pt-2">
        <div className="rounded-2xl border border-blue-500/15 bg-fog-100/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600">Google Search Console</span>
            <h2 className="font-display text-2xl text-navy-900 mt-2">Google organic search visibility</h2>
            <p className="text-sm text-fog-600 mt-1">Search clicks, impressions, CTR, average position and query-level SEO signals.</p>
          </div>
          <div className="text-xs text-fog-500">Headline totals: Search Console Overview Raw</div>
        </div>

        <div>
          <SectionHeader eyebrow="Search Console · Overview" title="Organic Google search performance" description="These totals come from the Search Console overview API and are kept separate from GA4 traffic metrics." />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Search Clicks" value={current.search.clicks} previous={previous?.search.clicks} icon={MousePointerClick} context="Clicks from Google organic search" />
            <MetricCard label="Search Impressions" value={current.search.impressions} previous={previous?.search.impressions} icon={Eye} format={integer} />
            <MetricCard label="Search CTR" value={current.search.ctr} previous={previous?.search.ctr} icon={Target} format={(v) => pct(v, 2)} />
            <MetricCard label="Average Position" value={current.search.avgPosition} previous={previous?.search.avgPosition} icon={Search} format={(v) => v.toFixed(2)} context="Lower is better; average across Google Search impressions" />
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="Search Console · Trend" title="Search demand and visibility over time" description="Clicks and impressions use separate charts so the much larger impression scale does not hide click movement." />
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <div className="mb-4">
                <h3 className="font-semibold text-navy-900">Organic clicks</h3>
                <p className="text-xs text-fog-500 mt-0.5">Visits generated from Google Search results</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={searchTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} tickFormatter={compact} width={46} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                    <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#3C7391" strokeWidth={2.8} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <div className="mb-4">
                <h3 className="font-semibold text-navy-900">Search impressions</h3>
                <p className="text-xs text-fog-500 mt-0.5">How often AlMehwar appeared in Google Search</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={searchTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#5F6F78" }} axisLine={false} tickLine={false} tickFormatter={compact} width={46} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", fontSize: 12 }} />
                    <Bar dataKey="impressions" name="Impressions" fill="#916C3C" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {searchTrend.map((row) => (
              <div key={row.month} className="rounded-xl border border-navy-900/8 bg-white p-3">
                <p className="text-[10px] uppercase tracking-wide text-fog-500">{row.month} avg position</p>
                <p className="font-display text-xl text-navy-900 mt-1">{row.avgPosition.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="Search Console · Queries" title="Search demand signals" description="Detailed search rows help identify brand, doctor-name and service opportunities. Headline totals above remain the authoritative monthly totals." />
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-5">
            <Card className="overflow-hidden p-0">
              <div className="px-5 pt-5 pb-3">
                <h3 className="font-semibold text-navy-900">High-signal detailed query rows</h3>
                <p className="text-xs text-fog-500 mt-0.5">From the detailed Search Console Query × Page layer; these are not query-level monthly totals.</p>
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
                    {detailQueries.map((query) => (
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

            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-2 text-blue-600">
                  <Search size={16} />
                  <p className="text-[11px] uppercase tracking-wide font-semibold">SEO opportunity</p>
                </div>
                {seoOpportunity ? (
                  <>
                    <p dir="auto" className="font-semibold text-navy-900 mt-3">{seoOpportunity.query}</p>
                    <p className="text-xs text-fog-600 mt-2 leading-relaxed">{integer(seoOpportunity.impressions)} impressions · {pct(seoOpportunity.ctr, 1)} CTR · position {seoOpportunity.position.toFixed(2)}</p>
                    <p className="text-[11px] text-fog-500 mt-3">Improve the matching title/meta copy and landing-page relevance, then monitor CTR.</p>
                  </>
                ) : (
                  <p className="text-sm text-fog-500 mt-3">No obvious low-CTR opportunity in the displayed detailed rows.</p>
                )}
              </Card>
              <Card>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={17} className="text-signal-amber mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-navy-900">Do not mix GA4 and Search Console totals</h3>
                    <p className="text-xs text-fog-600 mt-1 leading-relaxed">GA4 Organic Search sessions and Search Console clicks answer different questions and will not match one-to-one. They are intentionally separated in this page.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

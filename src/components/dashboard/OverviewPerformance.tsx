import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDecisionLive } from "../../utils/useDecisionLive";
import { socialDashboard } from "../../data/socialDashboard";
import { formatNumber } from "../../utils/format";
import { buildPerformanceSeries, type PerformanceMetric, type PerformanceMonth, type OverviewPerformanceRow } from "../../utils/performanceSeries";
import { Card, EmptyState, SectionHeader } from "./Primitives";
import { CallCenterPerformance } from "./CallCenterPerformance";

const PRIMARY: { key: PerformanceMetric; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "interactions", label: "Interactions" },
  { key: "shares", label: "Shares" },
  { key: "newFollowers", label: "New Followers" },
  { key: "contentPublished", label: "Content Published" },
];
const SECONDARY: { key: PerformanceMetric; label: string }[] = [
  { key: "profileVisits", label: "Available Profile Visits" },
  { key: "linkClicks", label: "Available Link Clicks" },
  { key: "reach", label: "Available Reach" },
  { key: "profileLinkTaps", label: "Instagram Profile Link Taps" },
  { key: "leads", label: "Available Leads" },
];

function periodLabel(row: PerformanceMonth, metric: PerformanceMetric) {
  const label = new Date(`${row.month}-01T00:00:00`).toLocaleString("en", { month: "short", year: "2-digit" });
  return `${label}${row.current ? " MTD" : row.partialMetrics.includes(metric) ? " *" : ""}`;
}

function PerformanceChart({ series, metric, label, available = false }: {
  series: PerformanceMonth[]; metric: PerformanceMetric; label: string; available?: boolean;
}) {
  const data = series.map(row => ({ label: periodLabel(row, metric), partial: row.partialMetrics.includes(metric), value: row.values[metric], current: row.current, coverage: row.coverage[metric].join(" + ") }));
  const missing = data.filter(row => row.value === null).map(row => row.label);
  return <div>
    <h3 className="font-display text-lg text-navy-900">{label}</h3>
    <p className="text-[11px] text-fog-500 mt-1">{available ? "Sum of available platform metrics; coverage is shown below." : "Facebook + Instagram + YouTube + TikTok."}</p>
    {data.some(row => row.value !== null) ? <div className="h-60 mt-4" role="img" aria-label={`${label} across all available months; current month is MTD`}>
      <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#7D6D59" }} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 10, fill: "#7D6D59" }} tickFormatter={formatNumber} axisLine={false} tickLine={false} width={54} />
        <Tooltip labelFormatter={(label, payload) => `${label}${payload[0]?.payload?.partial ? " · Recorded total, partial coverage" : ""}`} formatter={value => [typeof value === "number" ? value.toLocaleString("en-US") : "N/A", label]} contentStyle={{ borderRadius: 12, border: "1px solid #E2EAEF", color: "#0E3145" }} />
        <Bar dataKey="value" name={label} fill="#3C7391" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {data.map(row => <Cell key={row.label} fill={row.current ? "#D99536" : row.partial ? "#9673B9" : "#3C7391"} />)}
        </Bar>
      </BarChart></ResponsiveContainer>
    </div> : <EmptyState message="This metric is not available in the source yet." />}
    {data.filter(row => row.partial && row.value !== null).map(row => <p key={row.label} className="text-[11px] text-fog-500 mt-2">{row.label}: {row.value!.toLocaleString("en-US")} · Recorded total, partial coverage.</p>)}
    {missing.length > 0 && <p className="text-[11px] text-fog-500 mt-2">N/A: {missing.join(", ")}. Missing values are not zero.</p>}
    {available && <div className="space-y-1 mt-3 text-[10px] text-fog-500">{data.map(row => <p key={row.label}><b>{row.label}:</b> {row.coverage || "No reported platforms"}</p>)}</div>}
  </div>;
}

export function OverviewPerformance({ month }: { month: string }) {
  const live = useDecisionLive();
  const currentMonth = live.data?.currentMonth ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [metric, setMetric] = useState<PerformanceMetric>("profileVisits");
  const series = useMemo(() => {
    const historical: OverviewPerformanceRow[] = socialDashboard.platformPerformance.map(row => ({
      month: row.month, platform: row.platform, views: row.views, interactions: row.interactions,
      reach: row.reach, newFollowers: row.followersGrowth, linkClicks: row.clicks,
      posts: row.contentPublished, videos: null,
    }));
    return buildPerformanceSeries(live.data?.data.overview ?? [], historical, currentMonth);
  }, [live.data, currentMonth]);
  const selected = series.find(row => row.month === month);
  const extraMetric = SECONDARY.find(item => item.key === metric)!;

  return <>
    <section className="space-y-5" aria-labelledby="monthly-performance-title">
      <div id="monthly-performance-title"><SectionHeader eyebrow="Performance Over Time" title="All-Month Performance" description="These charts show every available month, regardless of the month selected above. Amber bars are the current month-to-date (MTD), not a full-month result." /></div>
      {series.some(row => row.partial && !row.current) && <p className="text-xs text-signal-amber">* Purple activity bars show recorded totals with partial platform coverage, including TikTok from 17 September. These are not complete calendar-month results. Missing metrics remain N/A.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {PRIMARY.map(item => <Card key={item.key}><PerformanceChart series={series} metric={item.key} label={item.label} /></Card>)}
        <Card>
          <label htmlFor="overview-trend-metric" className="block text-[10px] uppercase tracking-wide text-fog-500 mb-2">Additional Performance Metric</label>
          <select id="overview-trend-metric" value={metric} onChange={event => setMetric(event.target.value as PerformanceMetric)} className="rounded-lg border border-navy-900/10 bg-warm-100 p-2 text-xs text-navy-900 mb-4 max-w-full">
            {SECONDARY.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <PerformanceChart series={series} metric={metric} label={extraMetric.label} available />
        </Card>
      </div>
    </section>
    <section>
      <SectionHeader eyebrow="Selected Month" title="Additional Performance Signals" description="Available platform metrics for the selected month. These sums are not unique cross-platform audiences; Paid / Organic remains unavailable until the source provides that split." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{SECONDARY.map(item => <Card key={item.key}>
        <p className="text-[10px] uppercase tracking-wide text-fog-400">{item.label}</p>
        <p className="font-display text-2xl text-navy-900 mt-1">{formatNumber(selected?.values[item.key])}</p>
        <p className="text-[10px] text-fog-500 mt-2">{selected?.coverage[item.key].join(" + ") || "Not reported"}</p>
      </Card>)}</div>
    </section>
    <CallCenterPerformance month={month} />
  </>;
}

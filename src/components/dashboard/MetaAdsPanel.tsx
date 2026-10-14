import { useEffect, useMemo, useState } from "react";
import { Card, SectionHeader } from "./Primitives";
import { fetchMetaAds, type MetaAdsResponse } from "../../data/metaAdsLive";

const number = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-EG").format(value);

export function MetaAdsPanel() {
  const [report, setReport] = useState<MetaAdsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("");

  useEffect(() => {
    let active = true;
    fetchMetaAds().then((response) => {
      if (!active) return;
      setReport(response);
      setMonth([...new Set(response.campaigns.map((row) => row.month))].sort().at(-1) || "");
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const months = useMemo(() => [...new Set(report?.campaigns.map((row) => row.month) || [])].sort().reverse(), [report]);
  const rows = useMemo(() => (report?.campaigns || []).filter((row) => row.month === month), [report, month]);
  const totals = useMemo(() => ({
    spend: rows.reduce((sum, row) => sum + row.spend, 0),
    impressions: rows.reduce((sum, row) => sum + row.impressions, 0),
    clicks: rows.reduce((sum, row) => sum + row.clicks, 0),
    leads: rows.reduce((sum, row) => sum + (row.leads || 0), 0),
    messages: rows.reduce((sum, row) => sum + (row.messagingConversations || 0), 0),
    leadCoverage: rows.some((row) => row.leads !== null),
    messageCoverage: rows.some((row) => row.messagingConversations !== null),
  }), [rows]);
  const currency = report?.currency || "currency pending";
  const asOf = rows[0]?.dateStop;

  return <section>
    <SectionHeader eyebrow="Meta Ads · live from private Sheet" title="Paid campaign performance"
      description="Meta Leads and messaging conversations are separate action types. They may overlap and are never added together. Reach is shown per campaign only." />
    {loading ? <Card><p className="text-sm text-fog-500">Loading Meta Ads…</p></Card> : error ? (
      <Card><p className="text-sm text-fog-500">Paid data is not available yet. {error}</p></Card>
    ) : <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <label className="text-xs text-fog-500">Reporting month
          <select value={month} onChange={(event) => setMonth(event.target.value)}
            className="block mt-1 bg-warm-50 border border-navy-900/10 rounded-xl px-3 py-2 text-sm text-navy-900">
            {months.map((value) => <option value={value} key={value}>{value}</option>)}
          </select>
        </label>
        <span className="text-xs text-fog-500">Through {asOf || "—"} · {rows.length} campaigns · refreshed {rows[0]?.syncedAt || "—"}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Metric label="Spend" value={`${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(totals.spend)} ${currency}`} />
        <Metric label="Impressions" value={number(totals.impressions)} />
        <Metric label="Clicks" value={number(totals.clicks)} />
        <Metric label="Meta Leads" value={totals.leadCoverage ? number(totals.leads) : "—"} />
        <Metric label="Conversations started" value={totals.messageCoverage ? number(totals.messages) : "—"} />
      </div>
      <Card className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm text-left">
          <thead className="text-[10px] uppercase text-fog-500 border-b border-navy-900/10">
            <tr>{["Campaign", "Objective", "Spend", "Impressions", "Reach", "Clicks", "Link clicks", "Meta Leads", "Messages"].map((name) => <th key={name} className="py-2 px-2 font-semibold">{name}</th>)}</tr>
          </thead>
          <tbody>{rows.map((row) => <tr key={`${row.month}-${row.campaignId}`} className="border-b border-navy-900/5">
            <td className="py-2 px-2 font-medium text-navy-900" dir="auto">{row.name}</td>
            <td className="py-2 px-2 text-fog-500 text-xs">{row.objective.replace("OUTCOME_", "")}</td>
            <td className="py-2 px-2">{number(row.spend)}</td>
            <td className="py-2 px-2">{number(row.impressions)}</td>
            <td className="py-2 px-2">{number(row.reach)}</td>
            <td className="py-2 px-2">{number(row.clicks)}</td>
            <td className="py-2 px-2">{number(row.linkClicks)}</td>
            <td className="py-2 px-2">{number(row.leads)}</td>
            <td className="py-2 px-2">{number(row.messagingConversations)}</td>
          </tr>)}</tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-fog-500">A blank result means Meta did not return that action type. Campaign reach cannot be summed into account unique reach. Clinic revenue is operational context, not attributed ad revenue.</p>
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><p className="text-[10px] uppercase text-fog-500">{label}</p><p className="font-display text-xl text-navy-900 mt-1">{value}</p></Card>;
}

import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, SectionHeader } from "./Primitives";
import { fetchMetaAds, type MetaAdsLinkedAd, type MetaAdsResponse } from "../../data/metaAdsLive";

const number = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-EG").format(value);
const money = (value: number | null, currency: string) => value === null ? "—" : `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
const ratio = (top: number, bottom: number) => bottom > 0 ? top / bottom : null;
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(2)}%`;

export function MetaAdsPanel() {
  const [report, setReport] = useState<MetaAdsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

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
    linkClicks: rows.reduce((sum, row) => sum + row.linkClicks, 0),
  }), [rows]);
  const currency = report?.currency || "currency pending";
  const asOf = rows[0]?.dateStop;
  const adsByCampaign = useMemo(() => {
    const byCampaign = new Map<string, MetaAdsLinkedAd[]>();
    (report?.ads || []).forEach((ad) => {
      const list = byCampaign.get(ad.campaignId) || [];
      list.push(ad);
      byCampaign.set(ad.campaignId, list);
    });
    return byCampaign;
  }, [report]);

  return <section>
    <SectionHeader eyebrow="Meta Ads · private source" title="Paid campaign performance"
      description="Meta Leads and messaging conversations are separate action types. They may overlap and are never added together. Reach is shown per campaign only." />
    {loading ? <Card><p className="text-sm text-fog-500">Loading Meta Ads…</p></Card> : error ? (
      <Card><p className="text-sm text-fog-500">Paid campaign data cannot be verified in this public dashboard. The Meta Ads feed still requires private access, and the public Web App is currently unavailable. Check the private Meta Ads Reporting sheet for the last saved month. Technical detail: {error}</p></Card>
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
        <Metric label="Link CTR" value={percent(ratio(totals.linkClicks, totals.impressions))} />
        <Metric label="Cost / link click" value={money(ratio(totals.spend, totals.linkClicks), currency)} />
        <Metric label="CPM" value={money(totals.impressions ? totals.spend * 1000 / totals.impressions : null, currency)} />
        <Metric label="Cost / Meta lead" value={totals.leadCoverage ? money(ratio(totals.spend, totals.leads), currency) : "—"} />
        <Metric label="Cost / conversation" value={totals.messageCoverage ? money(ratio(totals.spend, totals.messages), currency) : "—"} />
      </div>
      <Card className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm text-left">
          <thead className="text-[10px] uppercase text-fog-500 border-b border-navy-900/10">
            <tr>{["Campaign", "Objective", "Spend", "Impressions", "Reach", "Clicks", "Link clicks", "Link CTR", "CPC (link)", "CPM", "Meta Leads", "Cost / lead", "Messages", "Cost / conversation"].map((name) => <th key={name} className="py-2 px-2 font-semibold">{name}</th>)}</tr>
          </thead>
          <tbody>{rows.map((row) => {
            const rowKey = `${row.month}-${row.campaignId}`;
            const linkedAds = adsByCampaign.get(row.campaignId) || [];
            return <Fragment key={rowKey}><tr className="border-b border-navy-900/5">
            <td className="py-2 px-2 font-medium text-navy-900" dir="auto"><span>{row.name}</span>{report?.ads && <button type="button" className="block mt-1 text-xs underline text-blue-700" onClick={() => setExpandedCampaign(expandedCampaign === rowKey ? null : rowKey)} aria-expanded={expandedCampaign === rowKey}>{expandedCampaign === rowKey ? "Hide ads" : `View ads (${linkedAds.length})`}</button>}</td>
            <td className="py-2 px-2 text-fog-500 text-xs">{row.objective.replace("OUTCOME_", "")}</td>
            <td className="py-2 px-2">{number(row.spend)}</td>
            <td className="py-2 px-2">{number(row.impressions)}</td>
            <td className="py-2 px-2">{number(row.reach)}</td>
            <td className="py-2 px-2">{number(row.clicks)}</td>
            <td className="py-2 px-2">{number(row.linkClicks)}</td>
            <td className="py-2 px-2">{percent(ratio(row.linkClicks, row.impressions))}</td>
            <td className="py-2 px-2">{money(ratio(row.spend, row.linkClicks), currency)}</td>
            <td className="py-2 px-2">{money(row.impressions ? row.spend * 1000 / row.impressions : null, currency)}</td>
            <td className="py-2 px-2">{number(row.leads)}</td>
            <td className="py-2 px-2">{row.leads === null ? "—" : money(ratio(row.spend, row.leads), currency)}</td>
            <td className="py-2 px-2">{number(row.messagingConversations)}</td>
            <td className="py-2 px-2">{row.messagingConversations === null ? "—" : money(ratio(row.spend, row.messagingConversations), currency)}</td>
          </tr>{expandedCampaign === rowKey && <tr><td colSpan={14} className="bg-warm-50 px-4 py-3"><div className="font-medium text-xs mb-2">Ads linked by Meta campaign ID</div>{linkedAds.length ? <div className="grid gap-2">{linkedAds.map((ad) => <div key={ad.adId} className="flex flex-wrap items-center gap-3 text-xs border-b border-navy-900/10 pb-2"><span className="font-medium" dir="auto">{ad.adName || ad.adId}</span><span className="text-fog-500">{ad.status}</span><a className="underline text-blue-700" href={`https://www.facebook.com/adsmanager/manage/ads?act=236301107947197&selected_ad_ids=${encodeURIComponent(ad.adId)}`} target="_blank" rel="noreferrer">Open ad</a>{ad.facebookPostId && <a className="underline text-blue-700" href={`https://www.facebook.com/${encodeURIComponent(ad.facebookPostId)}`} target="_blank" rel="noreferrer">Facebook post</a>}{ad.instagramUrl && <a className="underline text-blue-700" href={ad.instagramUrl} target="_blank" rel="noreferrer">Instagram post</a>}{!ad.facebookPostId && !ad.instagramUrl && <span className="text-fog-500">No public post link reported</span>}<span className="text-fog-500">Ad ID {ad.adId}</span></div>)}</div> : <p className="text-xs text-fog-500">No linked ads returned for this campaign yet.</p>}</td></tr>}</Fragment>})}</tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-fog-500">Ads are linked by Meta campaign ID. The campaign metrics above cover the selected month; the ad list may include paused or historical ads and is not a breakdown of those metrics. Link CTR = link clicks / impressions. ROAS needs attributed revenue. Campaign reach cannot be summed into unique account reach.</p>
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><p className="text-[10px] uppercase text-fog-500">{label}</p><p className="font-display text-xl text-navy-900 mt-1">{value}</p></Card>;
}

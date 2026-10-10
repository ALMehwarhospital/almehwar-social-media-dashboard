import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, CircleDashed, Clock3,
  Database, RefreshCw, ShieldCheck,
} from "lucide-react";
import { Card, SectionHeader } from "../components/dashboard/Primitives";
import { fetchWebsiteLive, type WebsiteDeliveredResponse } from "../data/websiteLive";
import { useDecisionLive } from "../utils/useDecisionLive";

type HealthTone = "healthy" | "warning" | "pending" | "error";

interface HealthRow {
  name: string;
  detail: string;
  tone: HealthTone;
  status: string;
  updated: string | null;
  records?: number;
}

const TONE = {
  healthy: { icon: CheckCircle2, pill: "bg-mint-100 text-mint-700", iconClass: "text-mint-600" },
  warning: { icon: Clock3, pill: "bg-signal-amber/15 text-signal-amber", iconClass: "text-signal-amber" },
  pending: { icon: CircleDashed, pill: "bg-fog-100 text-fog-600", iconClass: "text-fog-400" },
  error: { icon: AlertTriangle, pill: "bg-signal-coral/12 text-signal-coral", iconClass: "text-signal-coral" },
} as const;

function parseTime(value: unknown): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)
    ? `${raw.replace(" ", "T")}+03:00`
    : raw;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : null;
}

function newest(values: unknown[]): string | null {
  return values
    .map(value => ({ value: String(value || "").trim(), time: parseTime(value) }))
    .filter(item => item.value && item.time !== null)
    .sort((a, b) => Number(b.time) - Number(a.time))[0]?.value ?? null;
}

function ageTone(value: string | null, hours = 36): HealthTone {
  const time = parseTime(value);
  if (time === null) return "warning";
  return Date.now() - time <= hours * 60 * 60 * 1000 ? "healthy" : "warning";
}

function displayTime(value: string | null): string {
  const time = parseTime(value);
  if (time === null) return value || "Not reported";
  return new Date(time).toLocaleString("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function HealthStat({ label, value, note, tone = "healthy" }: {
  label: string; value: string | number; note: string; tone?: HealthTone;
}) {
  const Icon = TONE[tone].icon;
  return <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-wider text-fog-500">{label}</p><p className="font-display text-2xl text-navy-900 mt-1">{value}</p></div>
      <Icon size={18} className={TONE[tone].iconClass}/>
    </div>
    <p className="text-[11px] text-fog-500 mt-2">{note}</p>
  </Card>;
}

export default function DataHealth() {
  const live = useDecisionLive();
  const [website, setWebsite] = useState<WebsiteDeliveredResponse | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(new Date());

  const loadWebsite = useCallback(async () => {
    try {
      setWebsiteError(null);
      setWebsite(await fetchWebsiteLive());
    } catch (error) {
      setWebsiteError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => { loadWebsite(); }, [loadWebsite]);

  const refresh = async () => {
    setChecking(true);
    await Promise.allSettled([live.refresh(), loadWebsite()]);
    setCheckedAt(new Date());
    window.setTimeout(() => setChecking(false), 500);
  };

  const rows = useMemo<HealthRow[]>(() => {
    const data = live.data;
    const month = data?.currentMonth || currentMonth();
    const content = data?.data.content.filter((row: any) => row.month === month) ?? [];
    const video = data?.data.video.filter((row: any) => row.month === month) ?? [];
    const allSocial = [...content, ...video];
    const platformRow = (platform: string): HealthRow => {
      const items = allSocial.filter((row: any) => row.platform === platform);
      const updated = newest(items.map((row: any) => row.lastSynced));
      const tone: HealthTone = items.length === 0 ? "error" : ageTone(updated || data?.generatedAt || null);
      return {
        name: platform,
        detail: `${month} content feed`,
        tone,
        status: items.length === 0 ? "No current data" : tone === "healthy" ? "Healthy" : "Check sync",
        updated: updated || data?.generatedAt || null,
        records: items.length,
      };
    };

    const socialTone: HealthTone = !data ? "error" : live.isLive ? ageTone(data.generatedAt, 12) : "warning";
    const websiteTone: HealthTone = websiteError ? "error" : website ? ageTone(website.lastSynced || website.generatedAt, 36) : "warning";
    const ga4Updated = website?.sync.ga4 || website?.lastSynced || website?.generatedAt || null;
    const searchUpdated = website?.sync.searchConsole || website?.lastSynced || website?.generatedAt || null;
    const calls = data?.data.inboundCalls?.filter((row: any) => String(row.month || row.periodMonth || "") === month) ?? [];

    return [
      {
        name: "Social Dashboard API",
        detail: live.isLive ? "Direct Apps Script connection" : "Cached snapshot fallback",
        tone: socialTone,
        status: !data ? "Unavailable" : live.isLive ? "Live" : "Cached",
        updated: data?.generatedAt || null,
        records: data ? data.counts.contentLive + data.counts.videoLive : 0,
      },
      platformRow("Facebook"),
      platformRow("Instagram"),
      platformRow("YouTube"),
      platformRow("TikTok"),
      {
        name: "LinkedIn",
        detail: "API connection not active yet",
        tone: "pending",
        status: "Expected pending",
        updated: null,
      },
      {
        name: "GA4 Website",
        detail: website?.deliverySource === "api" ? "Live website API" : "Website snapshot",
        tone: websiteTone,
        status: websiteError ? "Unavailable" : websiteTone === "healthy" ? "Healthy" : "Check sync",
        updated: ga4Updated,
        records: website?.data.website.length,
      },
      {
        name: "Search Console",
        detail: "Organic search reporting",
        tone: websiteError ? "error" : searchUpdated ? ageTone(searchUpdated, 48) : "warning",
        status: websiteError ? "Unavailable" : searchUpdated ? "Reporting" : "Not reported",
        updated: searchUpdated,
        records: website?.data.searchConsole.details.length,
      },
      {
        name: "Inbound Calls",
        detail: `${month} call-center report`,
        tone: calls.length ? "healthy" : "warning",
        status: calls.length ? "Reporting" : "No current rows",
        updated: newest(calls.map((row: any) => row.lastSynced || row.date)),
        records: calls.length,
      },
    ];
  }, [live.data, live.isLive, website, websiteError]);

  const issues = rows.filter(row => row.tone === "error" || row.tone === "warning");
  const healthy = rows.filter(row => row.tone === "healthy").length;
  const overallTone: HealthTone = rows.some(row => row.tone === "error") ? "error" : issues.length ? "warning" : "healthy";

  return <div className="space-y-8">
    <SectionHeader
      eyebrow="System Monitor"
      title="Data Health Center"
      description="A quick check of connections and freshness. Missing API metrics such as unsupported Reach remain N/A and are not treated as system failures."
      action={<button type="button" onClick={refresh} disabled={checking} className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-3.5 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
        <RefreshCw size={14} className={checking ? "animate-spin" : ""}/>Refresh now
      </button>}
    />

    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <HealthStat label="Overall status" value={overallTone === "healthy" ? "Healthy" : overallTone === "warning" ? "Review" : "Attention"} note={`Checked ${checkedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`} tone={overallTone}/>
      <HealthStat label="Healthy sources" value={`${healthy}/${rows.length}`} note="Connected and recently reporting" tone={healthy >= rows.length - 2 ? "healthy" : "warning"}/>
      <HealthStat label="Active alerts" value={issues.length} note="LinkedIn pending is excluded" tone={issues.length ? "warning" : "healthy"}/>
    </section>

    {live.error && <div className="rounded-2xl border border-signal-amber/20 bg-signal-amber/8 p-4 text-sm text-navy-800">
      <b>Live API note:</b> {live.error}
    </div>}

    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-navy-900/6 flex items-center gap-2"><Database size={16} className="text-mint-600"/><h3 className="font-semibold text-navy-900">Data sources</h3></div>
      <div className="divide-y divide-navy-900/5">
        {rows.map(row => {
          const Icon = TONE[row.tone].icon;
          return <div key={row.name} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.3fr_.7fr_.8fr_.4fr] items-center gap-3 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0"><Icon size={17} className={`mt-0.5 shrink-0 ${TONE[row.tone].iconClass}`}/><div className="min-w-0"><p className="text-sm font-semibold text-navy-900">{row.name}</p><p className="text-[11px] text-fog-500 truncate">{row.detail}</p></div></div>
            <span className={`justify-self-end sm:justify-self-start text-[10px] font-semibold px-2.5 py-1 rounded-full ${TONE[row.tone].pill}`}>{row.status}</span>
            <p className="hidden sm:block text-xs text-fog-600">{displayTime(row.updated)}</p>
            <p className="hidden sm:block text-right text-xs font-semibold text-navy-700">{row.records ?? "—"}</p>
          </div>;
        })}
      </div>
    </Card>

    <div className="flex items-start gap-3 rounded-2xl bg-navy-900 p-4 text-warm-50">
      <ShieldCheck size={18} className="text-mint-300 mt-0.5 shrink-0"/>
      <p className="text-xs text-warm-100/75">Only connection, freshness and missing-current-data problems create alerts. Platform limitations and legitimately unavailable metrics stay N/A without creating false alarms.</p>
    </div>
  </div>;
}

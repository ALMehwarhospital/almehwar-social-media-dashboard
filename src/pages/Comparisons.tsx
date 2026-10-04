import { useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  ExternalLink,
  MessageCircle,
  Phone,
  TrendingUp,
  UserRoundPlus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { socialDashboard } from "../data/socialDashboard";
import { useDecisionLive } from "../utils/useDecisionLive";
import { Card, EmptyState, SectionHeader } from "../components/dashboard/Primitives";
import { formatNumber, monthLabel } from "../utils/format";
import {
  CAMPAIGN_TO_OPD_DEPARTMENT,
  OPD_SIGNALS,
  PAID_CAMPAIGN_SIGNALS,
  PAID_SIGNAL_PERIOD,
  type CampaignSignalKey,
  type PaidCampaignSignal,
} from "../data/campaignSignals";

type CampaignKey = CampaignSignalKey;
type CompareMode = "months" | "campaigns";
type SocialPlatform = "Facebook" | "Instagram";

interface CampaignDefinition {
  key: CampaignKey;
  label: string;
  shortLabel: string;
  icon: string;
  pattern: RegExp;
}

interface CampaignContent {
  id: string;
  campaign: CampaignDefinition;
  date: string;
  month: string;
  platform: SocialPlatform;
  name: string;
  format: string;
  url: string;
  reach: number | null;
  views: number | null;
  interactions: number | null;
  shares: number | null;
}

interface BusinessMonth {
  month: string;
  calls: number | null;
  reservations: number | null;
}

const CAMPAIGNS: CampaignDefinition[] = [
  { key: "dental", label: "Dental Clinic", shortLabel: "Dental", icon: "🦷", pattern: /الأسنان|الاسنان|أسنان|سنان|dental|dentist|oral|tooth|teeth/i },
  { key: "headache", label: "Headache Clinic", shortLabel: "Headache", icon: "🧠", pattern: /عيادة\s*الصداع|الصداع|صداع|headache|migraine|الشقيقة/i },
  { key: "urology", label: "Urology", shortLabel: "Urology", icon: "🩺", pattern: /المسالك|البولي|البولية|الكلى|البروستاتا|الحصوات|حصوات|urolog|kidney|prostate|stone/i },
  { key: "electrophysiology", label: "Electrophysiology", shortLabel: "EP", icon: "⚡", pattern: /كهربية\s*القلب|كهرباء\s*القلب|اضطراب\s*النظم|النبض|نبضة|ضربات\s*القلب|arrhythm|electrophysi|heart\s*rhythm/i },
  { key: "heart", label: "Heart Clinic", shortLabel: "Heart", icon: "❤️", pattern: /القلب|قلبي|heart|cardiac|cardio/i },
  { key: "physiotherapy", label: "Physiotherapy", shortLabel: "Physio", icon: "🦴", pattern: /العلاج\s*الطبيعي|تأهيل|physio|physiotherapy|rehab/i },
  { key: "oncology", label: "Oncology", shortLabel: "Oncology", icon: "🎗️", pattern: /الأورام|اورام|السرطان|سرطان|oncology|cancer|tumou?r/i },
  { key: "icu", label: "ICU", shortLabel: "ICU", icon: "🏥", pattern: /الرعاية\s*المركزة|العناية\s*المركزة|عناية\s*مركزة|icu|intensive\s*care|critical\s*care/i },
  { key: "checkups", label: "Checkups", shortLabel: "Checkups", icon: "✅", pattern: /الفحص\s*الشامل|الفحوصات|تحاليل|check[ -]?up|screening|فحص/i },
  { key: "emergency", label: "Emergency", shortLabel: "Emergency", icon: "🚑", pattern: /الطوارئ|طوارئ|emergency|urgent/i },
];

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumAvailable(values: unknown[]): number | null {
  const usable = values.map(finite).filter((value): value is number => value !== null);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) : null;
}

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
  const campaign = inferCampaign(row);
  if (!campaign) return null;
  return {
    id: String(row?.id || row.platform + "-" + row.month + "-" + index),
    campaign,
    date: String(row?.date || ""),
    month: String(row?.month || ""),
    platform: row.platform,
    name: String(row?.name || row?.title || "Untitled content"),
    format: String(row?.format || row?.type || "N/A"),
    url: extractUrl(row),
    reach: finite(row?.reach),
    views: finite(row?.views),
    interactions: finite(row?.interactions),
    shares: finite(row?.shares),
  };
}

function money(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value) + " EGP"
    : "N/A";
}

function displayDate(value: string): string {
  if (!value) return "N/A";
  const trimmed = value.trim();
  const dayFirst = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+.*)?$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      parsed.getFullYear() === Number(year) &&
      parsed.getMonth() === Number(month) - 1 &&
      parsed.getDate() === Number(day)
    ) {
      return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  return value;
}

function campaignByKey(key: CampaignKey) {
  return CAMPAIGNS.find((campaign) => campaign.key === key) ?? CAMPAIGNS[0];
}

function paidFor(key: CampaignKey): PaidCampaignSignal | null {
  return PAID_CAMPAIGN_SIGNALS[key] ?? null;
}

function summarizeContent(rows: CampaignContent[]) {
  return {
    published: rows.length,
    reach: sumAvailable(rows.map((row) => row.reach)),
    views: sumAvailable(rows.map((row) => row.views)),
    interactions: sumAvailable(rows.map((row) => row.interactions)),
    shares: sumAvailable(rows.map((row) => row.shares)),
  };
}

function campaignRevenue(key: CampaignKey, month: string): number | null {
  const department = CAMPAIGN_TO_OPD_DEPARTMENT[key];
  const report = OPD_SIGNALS[month];
  if (!department || !report) return null;
  return report.departments.find((item) => item.department === department)?.revenue ?? null;
}

function campaignVolume(key: CampaignKey, month: string): number | null {
  const department = CAMPAIGN_TO_OPD_DEPARTMENT[key];
  const report = OPD_SIGNALS[month];
  if (!department || !report) return null;
  return report.departments.find((item) => item.department === department)?.volume ?? null;
}

export default function Comparisons() {
  const live = useDecisionLive();
  const [mode, setMode] = useState<CompareMode>("months");
  const [primaryKey, setPrimaryKey] = useState<CampaignKey>("dental");
  const [secondaryKey, setSecondaryKey] = useState<CampaignKey>("headache");
  const [monthFilter, setMonthFilter] = useState("All");

  const allRows = useMemo(() => {
    const source = live.data?.data.content?.length ? live.data.data.content : socialDashboard.contentPerformance;
    return source.map(normalizeRow).filter((row): row is CampaignContent => Boolean(row));
  }, [live.data]);

  const months = useMemo(() => {
    const keys = new Set<string>();
    allRows.forEach((row) => { if (/^\d{4}-\d{2}$/.test(row.month)) keys.add(row.month); });
    Object.keys(OPD_SIGNALS).forEach((month) => keys.add(month));
    (live.data?.data.inboundCalls ?? []).forEach((row: any) => {
      if (/^\d{4}-\d{2}$/.test(String(row?.periodMonth || ""))) keys.add(String(row.periodMonth));
    });
    return [...keys].sort();
  }, [allRows, live.data]);

  const primary = campaignByKey(primaryKey);
  const effectiveSecondaryKey = secondaryKey === primaryKey
    ? (CAMPAIGNS.find((campaign) => campaign.key !== primaryKey)?.key ?? secondaryKey)
    : secondaryKey;
  const secondary = campaignByKey(effectiveSecondaryKey);
  const primaryPaid = paidFor(primaryKey);
  const secondaryPaid = paidFor(effectiveSecondaryKey);

  const campaignMonthly = useMemo(() => {
    return months.map((month) => {
      const rows = allRows.filter((row) => row.campaign.key === primaryKey && row.month === month);
      const interactions = sumAvailable(rows.map((row) => row.interactions));
      return {
        month,
        label: monthLabel(month),
        content: rows.length,
        interactions: interactions ?? 0,
        revenue: campaignRevenue(primaryKey, month),
        consultations: campaignVolume(primaryKey, month),
      };
    });
  }, [allRows, months, primaryKey]);

  const businessMonthly = useMemo<BusinessMonth[]>(() => {
    const inbound = live.data?.data.inboundCalls ?? [];
    return months.map((month) => {
      const rows = (inbound as any[]).filter((row) => String(row.periodMonth || "") === month);
      return {
        month,
        calls: sumAvailable(rows.map((row) => row.inboundCalls)),
        reservations: sumAvailable(rows.map((row) => row.opdReservations)),
      };
    });
  }, [live.data, months]);

  const filteredContent = useMemo(() => {
    return allRows
      .filter((row) => row.campaign.key === primaryKey && (monthFilter === "All" || row.month === monthFilter))
      .sort((a, b) => b.month.localeCompare(a.month) || b.date.localeCompare(a.date))
      .slice(0, 12);
  }, [allRows, primaryKey, monthFilter]);

  const secondaryContent = useMemo(() => {
    return allRows
      .filter((row) => row.campaign.key === effectiveSecondaryKey && (monthFilter === "All" || row.month === monthFilter))
      .sort((a, b) => b.month.localeCompare(a.month) || b.date.localeCompare(a.date))
      .slice(0, 12);
  }, [allRows, effectiveSecondaryKey, monthFilter]);

  const primaryContentSummary = useMemo(
    () => summarizeContent(allRows.filter((row) => row.campaign.key === primaryKey && (monthFilter === "All" || row.month === monthFilter))),
    [allRows, primaryKey, monthFilter]
  );
  const secondaryContentSummary = useMemo(
    () => summarizeContent(allRows.filter((row) => row.campaign.key === effectiveSecondaryKey && (monthFilter === "All" || row.month === monthFilter))),
    [allRows, effectiveSecondaryKey, monthFilter]
  );

  const comparisonData = useMemo(() => {
    return [
      {
        metric: "Messages",
        [primary.shortLabel]: primaryPaid?.messagingConversations ?? 0,
        [secondary.shortLabel]: secondaryPaid?.messagingConversations ?? 0,
      },
      {
        metric: "Leads / New Contacts",
        [primary.shortLabel]: primaryPaid?.newMessagingContacts ?? 0,
        [secondary.shortLabel]: secondaryPaid?.newMessagingContacts ?? 0,
      },
    ];
  }, [primary, secondary, primaryPaid, secondaryPaid]);

  const revenueData = useMemo(() => {
    return campaignMonthly
      .filter((row) => row.revenue !== null)
      .map((row) => ({ month: row.label, revenue: row.revenue, consultations: row.consultations }));
  }, [campaignMonthly]);

  const callsData = useMemo(() => {
    return businessMonthly
      .filter((row) => row.calls !== null || row.reservations !== null)
      .map((row) => ({ month: monthLabel(row.month), calls: row.calls, reservations: row.reservations }));
  }, [businessMonthly]);

  const comparisonRevenueData = useMemo(() => {
    return months
      .map((month) => ({
        month: monthLabel(month),
        [primary.shortLabel]: campaignRevenue(primaryKey, month),
        [secondary.shortLabel]: campaignRevenue(effectiveSecondaryKey, month),
        [primary.shortLabel + " Patients"]: campaignVolume(primaryKey, month),
        [secondary.shortLabel + " Patients"]: campaignVolume(effectiveSecondaryKey, month),
      }))
      .filter((row) => row[primary.shortLabel] !== null || row[secondary.shortLabel] !== null);
  }, [months, primary, secondary, primaryKey, effectiveSecondaryKey]);

  const selectedRevenue = monthFilter === "All"
    ? sumAvailable(campaignMonthly.map((row) => row.revenue))
    : campaignRevenue(primaryKey, monthFilter);

  const selectedVolume = monthFilter === "All"
    ? sumAvailable(campaignMonthly.map((row) => row.consultations))
    : campaignVolume(primaryKey, monthFilter);

  const visitsByMonth = useMemo(() => {
    return campaignMonthly
      .filter((row) => row.consultations !== null)
      .map((row) => ({ month: row.label, visits: row.consultations }));
  }, [campaignMonthly]);

  const selectedCalls = monthFilter === "All"
    ? sumAvailable(businessMonthly.map((row) => row.calls))
    : businessMonthly.find((row) => row.month === monthFilter)?.calls ?? null;

  const selectedReservations = monthFilter === "All"
    ? sumAvailable(businessMonthly.map((row) => row.reservations))
    : businessMonthly.find((row) => row.month === monthFilter)?.reservations ?? null;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-navy-900 text-warm-50 p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute right-6 top-2 text-[88px] sm:text-[112px] opacity-15 select-none">{primary.icon}</div>
        <div className="relative max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-mint-300 font-semibold">Campaign Intelligence</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">A clearer view of campaign demand and clinic context.</h1>
          <p className="text-sm text-warm-100/65 mt-3 max-w-2xl">
            Focused on messages and leads, with calls and clinic revenue kept as separate business context rather than forced attribution.
          </p>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <FilterSelect label="View" value={mode} onChange={(value) => setMode(value as CompareMode)}>
            <option value="months">Same campaign across months</option>
            <option value="campaigns">Campaign vs campaign</option>
          </FilterSelect>
          <FilterSelect label="Primary campaign" value={primaryKey} onChange={(value) => setPrimaryKey(value as CampaignKey)}>
            {CAMPAIGNS.map((campaign) => <option key={campaign.key} value={campaign.key}>{campaign.icon} {campaign.label}</option>)}
          </FilterSelect>
          {mode === "campaigns" ? (
            <FilterSelect label="Compare with" value={effectiveSecondaryKey} onChange={(value) => setSecondaryKey(value as CampaignKey)}>
              {CAMPAIGNS.filter((campaign) => campaign.key !== primaryKey).map((campaign) => <option key={campaign.key} value={campaign.key}>{campaign.icon} {campaign.label}</option>)}
            </FilterSelect>
          ) : (
            <FilterSelect label="Content month" value={monthFilter} onChange={setMonthFilter}>
              <option value="All">All months</option>
              {months.slice().reverse().map((month) => <option key={month} value={month}>{monthLabel(month)} {month.split("-")[0]}</option>)}
            </FilterSelect>
          )}
          <div className="rounded-2xl border border-navy-900/10 bg-warm-50 px-4 py-3 flex items-center gap-3">
            <div className="text-4xl">{primary.icon}</div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-fog-500">Selected clinic</p>
              <p className="font-semibold text-navy-900">{primary.label}</p>
              <p className="text-[10px] text-fog-500">{PAID_SIGNAL_PERIOD}</p>
            </div>
          </div>
        </div>
      </Card>

      {mode === "months" ? (
        <>
          <section>
            <SectionHeader
              eyebrow="Paid Campaign Snapshot"
              title={primary.icon + " " + primary.label}
              description="Only the two demand metrics requested are surfaced from the paid-media summary. The current source is aggregated across the stated period, so it is not split into monthly paid results."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignalCard
                label="Messages"
                value={primaryPaid?.messagingConversations ?? null}
                note="Messaging conversations started"
                icon={<MessageCircle size={19} />}
              />
              <SignalCard
                label="Leads / New Contacts"
                value={primaryPaid?.newMessagingContacts ?? null}
                note="New messaging contacts in the supplied export"
                icon={<UserRoundPlus size={19} />}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <BusinessCard label="Published" value={primaryContentSummary.published} icon={<TrendingUp size={18} />} />
              <BusinessCard label="Reach" value={primaryContentSummary.reach} icon={<UserRoundPlus size={18} />} />
              <BusinessCard label="Views" value={primaryContentSummary.views} icon={<TrendingUp size={18} />} />
              <BusinessCard label="Interactions" value={primaryContentSummary.interactions} icon={<MessageCircle size={18} />} />
              <BusinessCard label="Shares" value={primaryContentSummary.shares} icon={<ExternalLink size={18} />} />
            </div>
          </section>

          <section>
            <SectionHeader
              eyebrow="Month-to-Month"
              title="Campaign activity trend"
              description="Monthly chart uses the campaign content that can be matched to this clinic. Paid leads/messages stay in the snapshot above until a true monthly paid export is available."
            />
            <Card>
              {campaignMonthly.some((row) => row.content > 0) ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaignMonthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis yAxisId="left" allowDecimals={false} fontSize={10} />
                      <YAxis yAxisId="right" orientation="right" fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="content" name="Matched Content" stroke="#3C7391" strokeWidth={2.5} />
                      <Line yAxisId="right" type="monotone" dataKey="interactions" name="Interactions" stroke="#DEAF71" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState message="No matched monthly content is available for this campaign yet." />}
            </Card>
          </section>
        </>
      ) : (
        <section>
          <SectionHeader
            eyebrow="Head to Head"
            title={primary.icon + " " + primary.label + " vs " + secondary.icon + " " + secondary.label}
            description={"Messages and new messaging contacts from the same paid-media export period: " + PAID_SIGNAL_PERIOD + "."}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="metric" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={primary.shortLabel} fill="#3C7391" radius={[7, 7, 0, 0]} />
                    <Bar dataKey={secondary.shortLabel} fill="#DEAF71" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="space-y-4">
              <CampaignMiniCard campaign={primary} paid={primaryPaid} summary={primaryContentSummary} />
              <CampaignMiniCard campaign={secondary} paid={secondaryPaid} summary={secondaryContentSummary} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
            <Card>
              <h3 className="font-display text-xl text-navy-900">Clinic revenue comparison</h3>
              <p className="text-xs text-fog-500 mt-1">Consultation revenue by mapped OPD department. Context only, not ad attribution.</p>
              {comparisonRevenueData.length ? (
                <>
                  <div className="h-72 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonRevenueData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={10} tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact" }).format(Number(value))} />
                        <Tooltip formatter={(value) => money(Number(value))} />
                        <Legend />
                        <Bar dataKey={primary.shortLabel} fill="#916C3C" radius={[7, 7, 0, 0]} />
                        <Bar dataKey={secondary.shortLabel} fill="#3C7391" radius={[7, 7, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-navy-900/5">
                    <div className="rounded-xl bg-warm-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-fog-500">{primary.label} · Patients / Visits</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {comparisonRevenueData.map((row) => (
                          <span key={row.month + "-p1"} className="text-xs text-navy-900">
                            <span className="text-fog-500">{row.month}:</span>{" "}
                            <span className="font-mono font-semibold">{formatNumber(row[primary.shortLabel + " Patients"] as number | null)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl bg-warm-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wide text-fog-500">{secondary.label} · Patients / Visits</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {comparisonRevenueData.map((row) => (
                          <span key={row.month + "-p2"} className="text-xs text-navy-900">
                            <span className="text-fog-500">{row.month}:</span>{" "}
                            <span className="font-mono font-semibold">{formatNumber(row[secondary.shortLabel + " Patients"] as number | null)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-fog-500 mt-3">
                    Patient / visit count comes from the OPD department volume in the same operational report as revenue; it is not attributed to advertising.
                  </p>
                </>
              ) : <EmptyState message="Revenue mapping is not available for one or both selected campaigns." />}
            </Card>
            <Card>
              <h3 className="font-display text-xl text-navy-900">Content metrics comparison</h3>
              <p className="text-xs text-fog-500 mt-1">Matched campaign content using the selected month filter.</p>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-fog-500 border-b border-navy-900/10">
                      <th className="py-2">Metric</th>
                      <th className="py-2 text-right">{primary.shortLabel}</th>
                      <th className="py-2 text-right">{secondary.shortLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Published", primaryContentSummary.published, secondaryContentSummary.published],
                      ["Reach", primaryContentSummary.reach, secondaryContentSummary.reach],
                      ["Views", primaryContentSummary.views, secondaryContentSummary.views],
                      ["Interactions", primaryContentSummary.interactions, secondaryContentSummary.interactions],
                      ["Shares", primaryContentSummary.shares, secondaryContentSummary.shares],
                    ].map(([label, a, b]) => (
                      <tr key={String(label)} className="border-b border-navy-900/5 last:border-0">
                        <td className="py-3 font-medium text-navy-900">{String(label)}</td>
                        <td className="py-3 text-right font-mono">{formatNumber(a as number | null)}</td>
                        <td className="py-3 text-right font-mono">{formatNumber(b as number | null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          eyebrow="Campaign Content"
          title={mode === "campaigns" ? "Content from both campaigns" : "What was published for this campaign"}
          description={mode === "campaigns" ? "Both campaign content sets are shown side by side for easier creative comparison." : "A compact content view instead of a long performance table. Open any item to inspect the original post."}
        />
        {mode === "campaigns" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ContentColumn campaign={primary} rows={filteredContent} />
            <ContentColumn campaign={secondary} rows={secondaryContent} />
          </div>
        ) : filteredContent.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredContent.map((row) => <ContentCard key={row.id} row={row} />)}
          </div>
        ) : <Card><EmptyState message="No matched campaign content for the selected month." /></Card>}
      </section>

      <section>
        <SectionHeader
          eyebrow="Business Context · Not Attribution"
          title="Calls and clinic revenue"
          description="These are kept below campaign performance on purpose. They show operational context, not proof that an ad or message created the call, reservation or revenue."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <BusinessCard label="Inbound Calls" value={selectedCalls} icon={<Phone size={18} />} />
          <BusinessCard label="OPD Reservations" value={selectedReservations} icon={<TrendingUp size={18} />} />
          <BusinessCard label={monthFilter === "All" ? "Total Clinic Revenue" : "Clinic Revenue"} value={selectedRevenue} moneyValue icon={<Banknote size={18} />} />
          <BusinessCard label={monthFilter === "All" ? "Total Patients / Visits" : "Patients / Visits"} value={selectedVolume} icon={<UserRoundPlus size={18} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-display text-xl text-navy-900">Inbound calls & reservations</h3>
            <p className="text-xs text-fog-500 mt-1">Hospital-level monthly operational totals.</p>
            {callsData.length ? (
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={callsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calls" name="Inbound Calls" fill="#3C7391" radius={[7, 7, 0, 0]} />
                    <Bar dataKey="reservations" name="OPD Reservations" fill="#DEAF71" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="No call data is available yet." />}
          </Card>

          <Card>
            <h3 className="font-display text-xl text-navy-900">{primary.icon} {primary.label} revenue context</h3>
            <p className="text-xs text-fog-500 mt-1">Department consultation revenue only, when an explicit clinic mapping exists.</p>
            {revenueData.length ? (
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis fontSize={10} tickFormatter={(value) => new Intl.NumberFormat("en", { notation: "compact" }).format(Number(value))} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="revenue" name="Consultation Revenue" fill="#916C3C" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="This campaign does not have a defensible clinic-revenue mapping in the available OPD report." />
            )}
          </Card>
        </div>

        <Card className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl text-navy-900">{primary.icon} Visits by month</h3>
              <p className="text-xs text-fog-500 mt-1">Only the OPD visit volume for the selected clinic, month by month.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-fog-500">Total Visits</p>
              <p className="font-display text-2xl text-navy-900">{formatNumber(sumAvailable(visitsByMonth.map((row) => row.visits)))}</p>
            </div>
          </div>
          {visitsByMonth.length ? (
            <>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="visits" name="Visits" fill="#3C7391" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-navy-900/5">
                {visitsByMonth.map((row) => (
                  <div key={row.month} className="rounded-xl bg-warm-50 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-fog-500">{row.month}</p>
                    <p className="font-display text-xl text-navy-900 mt-1">{formatNumber(row.visits)}</p>
                    <p className="text-[10px] text-fog-500">visits</p>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState message="No monthly visit volume is available for this clinic." />}
        </Card>
      </section>
    </div>
  );
}

function SignalCard({ label, value, note, icon }: { label: string; value: number | null; note: string; icon: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-fog-500">{label}</p>
          <p className="font-display text-3xl text-navy-900 mt-1">{formatNumber(value)}</p>
          <p className="text-[10px] text-fog-500 mt-2">{note}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center">{icon}</div>
      </div>
    </Card>
  );
}

function BusinessCard({ label, value, moneyValue = false, icon }: { label: string; value: number | null; moneyValue?: boolean; icon: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-fog-500">{label}</p>
          <p className="font-display text-xl text-navy-900 mt-1">{moneyValue ? money(value) : formatNumber(value)}</p>
        </div>
        <div className="text-fog-500">{icon}</div>
      </div>
    </Card>
  );
}

function CampaignMiniCard({ campaign, paid, summary }: { campaign: CampaignDefinition; paid: PaidCampaignSignal | null; summary: ReturnType<typeof summarizeContent> }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="text-4xl">{campaign.icon}</div>
        <div>
          <p className="font-semibold text-navy-900">{campaign.label}</p>
          <p className="text-[10px] text-fog-500">{PAID_SIGNAL_PERIOD}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-fog-500">Messages</p>
          <p className="font-display text-xl text-navy-900 mt-1">{formatNumber(paid?.messagingConversations ?? null)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-fog-500">Leads / New Contacts</p>
          <p className="font-display text-xl text-navy-900 mt-1">{formatNumber(paid?.newMessagingContacts ?? null)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-fog-500">Interactions</p>
          <p className="font-display text-xl text-navy-900 mt-1">{formatNumber(summary.interactions)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-fog-500">Shares</p>
          <p className="font-display text-xl text-navy-900 mt-1">{formatNumber(summary.shares)}</p>
        </div>
      </div>
    </Card>
  );
}

function ContentColumn({ campaign, rows }: { campaign: CampaignDefinition; rows: CampaignContent[] }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{campaign.icon}</div>
        <div>
          <h3 className="font-display text-xl text-navy-900">{campaign.label}</h3>
          <p className="text-[10px] text-fog-500">{rows.length} recent matched items</p>
        </div>
      </div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.slice(0, 6).map((row) => <ContentCard key={row.id} row={row} compact />)}
        </div>
      ) : <Card><EmptyState message="No matched content for this campaign." /></Card>}
    </div>
  );
}

function ContentCard({ row, compact = false }: { row: CampaignContent; compact?: boolean }) {
  return (
    <Card className={compact ? "p-4" : "flex flex-col min-h-[190px]"}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-fog-100 text-fog-600">{row.platform}</span>
        <span className="text-[10px] text-fog-500">{displayDate(row.date)}</span>
      </div>
      <p className={"font-semibold text-navy-900 mt-3 line-clamp-3 " + (compact ? "text-sm" : "")} dir="auto">{row.name}</p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div><p className="text-[9px] uppercase text-fog-500">Views</p><p className="text-xs font-mono text-navy-900 mt-1">{formatNumber(row.views)}</p></div>
        <div><p className="text-[9px] uppercase text-fog-500">Reach</p><p className="text-xs font-mono text-navy-900 mt-1">{formatNumber(row.reach)}</p></div>
        <div><p className="text-[9px] uppercase text-fog-500">Interact.</p><p className="text-xs font-mono text-navy-900 mt-1">{formatNumber(row.interactions)}</p></div>
        <div><p className="text-[9px] uppercase text-fog-500">Shares</p><p className="text-xs font-mono text-navy-900 mt-1">{formatNumber(row.shares)}</p></div>
      </div>
      <div className={compact ? "mt-3 flex justify-between items-center" : "mt-auto pt-4 flex items-end justify-between gap-3"}>
        <p className="text-[10px] uppercase tracking-wide text-fog-500">{row.format}</p>
        {row.url ? (
          <a href={row.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-mint-700 hover:underline">
            Open <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-fog-500 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-warm-50 border border-navy-900/10 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-900 cursor-pointer"
      >
        {children}
      </select>
    </label>
  );
}

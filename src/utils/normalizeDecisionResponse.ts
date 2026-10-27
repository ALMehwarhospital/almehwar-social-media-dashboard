import { directionReview } from "./creativeDirection";
import { partialCoverage } from "./socialDataQuality";
import type { DecisionLiveResponse } from "../data/decisionLive";
import { reviewedContentPillars } from "../data/contentPillarReviews";

const PLATFORM_DENOMINATOR: Record<string, "reach" | "views" | "impressions"> = {
  Facebook: "reach",
  Instagram: "reach",
  TikTok: "views",
  YouTube: "impressions",
  LinkedIn: "impressions",
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function canonicalRate(numerator: unknown, denominator: unknown): number | null {
  const n = finiteNumber(numerator);
  const d = finiteNumber(denominator);
  if (n === null || d === null || d <= 0) return null;
  return n / d;
}

function denominatorValue(row: any): number | null {
  const explicit = String(row?.engagementDenominator || "").toLowerCase();
  if (explicit === "unique viewers") return finiteNumber(row.uniqueViewers ?? row.reach);
  if (explicit === "reach") return finiteNumber(row.reach);
  if (explicit === "views") return finiteNumber(row.views);
  if (explicit === "impressions") return finiteNumber(row.impressions);

  const key = PLATFORM_DENOMINATOR[String(row?.platform || "")];
  return key ? finiteNumber(row[key]) : null;
}

function valueDenominatorValue(row:any): number | null {
  return String(row?.platform || "") === "TikTok"
    ? finiteNumber(row.views)
    : finiteNumber(row.reach);
}

const BOUNDED_PERCENT_FIELDS = ["completionRate", "retention3s"] as const;

const PERCENT_FIELDS = [
  "followerGrowth",
  "avgPercentWatched", "retention25", "retention50", "retention75",
  ...BOUNDED_PERCENT_FIELDS,
] as const;

type ContentPillar =
  | "Medical Education"
  | "Doctors Content"
  | "Hospital Services"
  | "Events"
  | "Conferences"
  | "ASA Academy"
  | "Patient Experience"
  | "Awareness"
  | "Branding"
  | "Promotional"
  | "Needs classification";

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function searchableContentText(row: any): string {
  return [row?.name, row?.title, row?.caption, row?.notes, row?.contentPillar, row?.campaign]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[_ـ]/g, " ");
}

function hasAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

/** Reviewed exceptions use the publication's full caption, not its short headline. */
export function inferContentPillar(row: any): ContentPillar {
  const text = searchableContentText(row);
  if (!text) return "Needs classification";
  if (hasAny(text, ["مرض الطفل من الصعب", "لا تفوت اي نبضه", "قلبك يستحق منك", "october is your health month"])) return "Awareness";
  if (hasAny(text, ["من داخل الحرم الجامعي", "العد التنازلي وصل لل 48"])) return "Events";
  if (hasAny(text, ["five stars. infinite stories", "google reviews", "testimonial", "patient story", "success story", "تجربه مريض", "قصه مريض", "قصه نجاح", "راي مريض"])) return "Patient Experience";
  if (hasAny(text, ["learn, interact, and integrate", "conference", "congress", "scientific day", "workshop", "مؤتمر", "كونجرس", "ورشه عمل", "يوم علمي"])) return "Conferences";
  if (hasAny(text, ["asa academy", "scientific academy", "future doctor", "اكاديميه asa"])) return "ASA Academy";
  if (hasAny(text, ["world day", "awareness", "pink october", "اليوم العالمي", "التوعيه", "حمله توعيه", "اكتوبر الوردي"])) return "Awareness";
  if (hasAny(text, ["event", "marathon", "celebration", "activation", "فعاليه", "ماراثون", "احتفاليه", "زياره خبير", "استقبال الخبير"])) return "Events";
  // Explicit discounts, not a routine booking footer, define promotions.
  if (hasAny(text, ["discount", "special offer", "خصم", "عرض خاص", "عروض خاصه"])) return "Promotional";
  if (hasAny(text, ["دكتور", "استشاري", "اخصائي", "consultant", "doctor"]) || /(?:^|\s)(?:dr\.|د\s*[/.]|ا\.د)/.test(text)) return "Doctors Content";
  if (hasAny(text, ["تعرف", "معلومه", "نصيحه", "اعراض", "اسباب", "الوقايه", "medical tip", "symptoms", "causes"])) return "Medical Education";
  if (hasAny(text, ["عياده", "وحده", "قسم", "طوارئ", "رعايه مركزه", "جراحه", "فحص", "تحاليل", "اشعه", "علاج طبيعي", "clinic", "emergency", "icu", "service", "checkup", "physiotherapy"])) return "Hospital Services";
  if (hasAny(text, ["ثقتكم", "اعتماد", "تميز", "quality", "تهنئه", "عام هجري", "almehwar hospital"])) return "Branding";
  return "Needs classification";
}

export function classifyContentRow(row: any) {
  const reviewed = reviewedContentPillars[`${row.platform}|${row.contentId || row.videoId || ""}`];
  if (reviewed) return { ...row, pillar: reviewed, contentPillar: reviewed, pillarSource: "editorial-review" };
  const existing = String(row.pillar || row.contentPillar || "").trim();
  if (existing && !["other", "needs classification"].includes(existing.toLowerCase())) return row;
  const pillar = inferContentPillar(row);
  return { ...row, pillar, contentPillar: pillar,
    pillarSource: pillar === "Needs classification" ? "pending-classification" : "automatic-keywords" };
}

function detectPercentScale(response: DecisionLiveResponse): 1 | 100 {
  const declaredUnit = (response as DecisionLiveResponse & { rateUnit?: string }).rateUnit;
  if (declaredUnit === "percent") return 100;
  if (declaredUnit === "ratio") return 1;
  const ratios: number[] = [];
  const rows = [
    ...(response.data?.overview ?? []),
    ...(response.data?.content ?? []),
    ...(response.data?.video ?? []),
  ];

  for (const row of rows) {
    const raw = finiteNumber(row?.engagementRate);
    const expected = canonicalRate(row?.interactions, denominatorValue(row));
    if (raw === null || expected === null || expected <= 0) continue;
    const ratio = raw / expected;
    if (Number.isFinite(ratio) && ratio > 0) ratios.push(ratio);
  }

  if (ratios.length) {
    ratios.sort((a, b) => a - b);
    const median = ratios[Math.floor(ratios.length / 2)];
    return Math.abs(median - 100) < Math.abs(median - 1) ? 100 : 1;
  }

  // The API contract uses ratios. A value above 1 may be valid retention;
  // its magnitude alone cannot establish percentage-point units.

  return 1;
}

function normalizeRow(row: any, percentScale: 1 | 100) {
  if (!row || typeof row !== "object") return row;

  const next = classifyContentRow({ ...row });
  if ("format" in row && (!row.format || String(row.format).toLowerCase() === "other")) {
    const media = String(row.mediaType || row.type || "").toLowerCase();
    const url = String(row.url || "");
    next.format = /carousel|album/.test(media) ? "Carousel"
      : /story/.test(media) ? "Story"
      : /reel|short/.test(media) || /\/(reel|shorts)\//.test(url) || row.platform === "TikTok" ? "Reel"
      : /image|photo/.test(media) ? "Static post"
      : /video/.test(media) || row.platform === "YouTube" ? "Long video" : "Needs classification";
  }
  if (row.platform === "Facebook" && row.source === "Facebook Raw") {
    next.uniqueViewers = finiteNumber(row.reach);
    next.reachMetric = "uniqueViewers";
    next.engagementDenominator = "Unique viewers";
  }
  next.engagementRate = canonicalRate(
    row.interactions,
    denominatorValue(next),
  );

  const shares = finiteNumber(row.shares);
  const saves = finiteNumber(row.saves);
  const valueDenominator = valueDenominatorValue(row);
  if (shares !== null && saves !== null && valueDenominator !== null && valueDenominator > 0) {
    next.valueRate = (shares + saves) / valueDenominator;
  } else if ("valueRate" in row) {
    next.valueRate = null;
  }

  for (const key of PERCENT_FIELDS) {
    if (!(key in row)) continue;
    const value = finiteNumber(row[key]);
    if (value === null) {
      next[key] = null;
      continue;
    }

    const normalized = value / percentScale;
    const bounded = (BOUNDED_PERCENT_FIELDS as readonly string[]).includes(key);
    next[key] = (key !== "followerGrowth" && normalized < 0) || (bounded && normalized > 1) ? null : normalized;
  }

  return next;
}

function normalizeOverviewRow(row: any, percentScale: 1 | 100, currentMonth: string) {
  const next = normalizeRow(row, percentScale);
  if (!next || typeof next !== "object") return next;

  const isCurrentMonth = String(next.month || "") === currentMonth;
  return {
    ...next,
    live: isCurrentMonth,
    status: partialCoverage(next) ? "PARTIAL MONTH" : isCurrentMonth
      ? (String(next.status || "").toUpperCase() === "API PENDING" ? "API Pending" : next.status || "LIVE MTD")
      : "CLOSED MONTH",
  };
}

function normalizeInboundCallRow(row: any) {
  if (!row || typeof row !== "object") return row;
  const next = { ...row };
  if (!("opdReservations" in next) && "oPDReservations" in next) {
    next.opdReservations = finiteNumber(next.oPDReservations);
  }
  delete next.oPDReservations;
  return next;
}

export function validateDecisionResponse(response: DecisionLiveResponse): string[] {
  const errors: string[] = [];
  if (!response?.success) errors.push("success must be true");
  if (response?.mode !== "LIVE") errors.push("mode must be LIVE");
  if (!/^\d{4}-\d{2}$/.test(String(response?.currentMonth || ""))) errors.push("currentMonth must use YYYY-MM");
  if (!response?.generatedAt) errors.push("generatedAt is required");

  for (const key of ["overview", "content", "video", "creative", "recommendations", "actionPlan"] as const) {
    if (!Array.isArray(response?.data?.[key])) errors.push(`data.${key} must be an array`);
  }

  const overview = Array.isArray(response?.data?.overview) ? response.data.overview : [];
  const currentPlatforms = new Set(
    overview.filter((row:any)=>row?.month===response.currentMonth).map((row:any)=>row?.platform)
  );
  for (const platform of ["Facebook","Instagram","TikTok","YouTube","LinkedIn"]) {
    if (!currentPlatforms.has(platform)) errors.push(`current overview missing ${platform}`);
  }

  if (Array.isArray(response?.data?.creative) && response?.counts) {
    if (typeof response.counts.creative === "number" && response.counts.creative !== response.data.creative.length) {
      errors.push("creative count does not match creative rows");
    }
    if (
      typeof response.counts.creative === "number" &&
      typeof response.counts.creativeReviewed === "number" &&
      typeof response.counts.creativePending === "number" &&
      response.counts.creativeReviewed + response.counts.creativePending !== response.counts.creative
    ) {
      errors.push("creative reviewed + pending does not equal creative total");
    }
  }

  return errors;
}

export function normalizeDecisionResponse(response: DecisionLiveResponse): DecisionLiveResponse {
  const errors = validateDecisionResponse(response);
  if (errors.length) throw new Error(`Invalid dashboard API contract: ${errors.join("; ")}`);

  const percentScale = detectPercentScale(response);
  const creative = response.data.creative.map(row => {
    const next = normalizeRow(row, percentScale);
    return { ...next, reviewStatus: directionReview(next).reviewed ? "Reviewed" : "Pending" };
  });

  return {
    ...response,
    counts: { ...response.counts, creative: creative.length, creativeReviewed: creative.filter(row => row.reviewStatus === "Reviewed").length, creativePending: creative.filter(row => row.reviewStatus !== "Reviewed").length },
    data: {
      ...response.data,
      overview: response.data.overview.map((row) => normalizeOverviewRow(row, percentScale, response.currentMonth)),
      content: response.data.content.map((row) => normalizeRow(row, percentScale)),
      video: response.data.video.map((row) => normalizeRow(row, percentScale)),
      creative,
      inboundCalls: Array.isArray(response.data.inboundCalls)
        ? response.data.inboundCalls.map(normalizeInboundCallRow)
        : [],
    },
  };
}


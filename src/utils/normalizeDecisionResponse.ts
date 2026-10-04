import type { DecisionLiveResponse } from "../data/decisionLive";

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

const BOUNDED_PERCENT_FIELDS = [
  "avgPercentWatched",
  "completionRate",
  "retention3s",
  "retention25",
  "retention50",
  "retention75",
] as const;

const PERCENT_FIELDS = [
  "followerGrowth",
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
  | "Other";

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function searchableContentText(row: any): string {
  return [row?.name, row?.title, row?.caption, row?.notes, row?.contentPillar, row?.campaign]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي");
}

function hasAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function inferContentPillar(row: any): ContentPillar {
  const text = searchableContentText(row);
  if (!text) return "Other";

  if (hasAny(text, ["asa academy", "asa ", "future doctor", "اكاديميه asa", "أكاديمية asa"])) return "ASA Academy";
  if (hasAny(text, ["conference", "congress", "scientific day", "workshop", "مؤتمر", "كونجرس", "ورشه عمل", "يوم علمي"])) return "Conferences";
  if (hasAny(text, ["testimonial", "patient story", "success story", "تجربه مريض", "قصه مريض", "قصه نجاح", "شكرا مستشفي", "رأي مريض", "راي مريض"])) return "Patient Experience";
  if (hasAny(text, ["offer", "discount", "book now", "register now", "عرض", "خصم", "احجز الان", "احجزي الان", "سجل الان"])) return "Promotional";
  if (hasAny(text, ["world day", "awareness", "month", "pink october", "اليوم العالمي", "شهر التوعيه", "التوعيه", "حمله توعيه", "اكتوبر الوردي"])) return "Awareness";
  if (hasAny(text, ["event", "marathon", "celebration", "activation", "فعاليه", "ماراثون", "احتفاليه", "زياره خبير", "استقبال الخبير"])) return "Events";
  if (hasAny(text, ["دكتور", "دكتوره", "استشاري", "اخصائي", "consultant", "doctor", "dr.", "د/ "])) return "Doctors Content";
  if (hasAny(text, ["تعرف", "معلومه", "نصيحه", "اعراض", "اسباب", "الوقايه", "تشخيص", "علاج", "medical tip", "symptoms", "causes", "treatment"])) return "Medical Education";
  if (hasAny(text, ["عياده", "وحده", "قسم", "طوارئ", "رعايه", "عمليه", "جراحه", "فحص", "تحاليل", "اشعه", "علاج طبيعي", "اسنان", "قلب", "اورام", "مسالك", "clinic", "unit", "emergency", "icu", "service", "checkup", "physiotherapy", "dental"])) return "Hospital Services";
  if (hasAny(text, ["مستشفي المحور", "almehwar hospital", "al mehwar hospital", "رعايتك", "ثقتكم", "quality", "اعتماد", "تميز"])) return "Branding";
  return "Other";
}

function detectPercentScale(response: DecisionLiveResponse): 1 | 100 {
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

  for (const row of response.data?.video ?? []) {
    for (const key of PERCENT_FIELDS) {
      const value = finiteNumber(row?.[key]);
      if (value !== null && Math.abs(value) > 1) return 100;
    }
  }

  return 1;
}

function normalizeRow(row: any, percentScale: 1 | 100) {
  if (!row || typeof row !== "object") return row;

  const next = { ...row };
  const existingPillar = String(row.pillar || row.contentPillar || "").trim();
  if (!existingPillar || existingPillar === "Other") {
    const inferredPillar = inferContentPillar(row);
    next.pillar = inferredPillar;
    next.contentPillar = inferredPillar;
    if (inferredPillar !== "Other") next.pillarSource = "automatic-keywords";
  }
  next.engagementRate = canonicalRate(
    row.interactions,
    denominatorValue(row),
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
    next[key] = bounded && (normalized < 0 || normalized > 1) ? null : normalized;
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
    status: isCurrentMonth
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

  return {
    ...response,
    data: {
      ...response.data,
      overview: response.data.overview.map((row) => normalizeOverviewRow(row, percentScale, response.currentMonth)),
      content: response.data.content.map((row) => normalizeRow(row, percentScale)),
      video: response.data.video.map((row) => normalizeRow(row, percentScale)),
      creative: response.data.creative.map((row) => normalizeRow(row, percentScale)),
      inboundCalls: Array.isArray(response.data.inboundCalls)
        ? response.data.inboundCalls.map(normalizeInboundCallRow)
        : [],
    },
  };
}

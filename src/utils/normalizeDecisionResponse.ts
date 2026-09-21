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

function normalizeRow(row: any) {
  if (!row || typeof row !== "object") return row;

  const next = { ...row };
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

  return {
    ...response,
    data: {
      ...response.data,
      overview: response.data.overview.map(normalizeRow),
      content: response.data.content.map(normalizeRow),
      video: response.data.video.map(normalizeRow),
      creative: response.data.creative.map(normalizeRow),
    },
  };
}

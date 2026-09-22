import fs from "node:fs";

const file = process.argv[2] || "public/data/social-dashboard-live.json";
const raw = fs.readFileSync(file, "utf8");
const data = JSON.parse(raw);
const errors = [];
const warnings = [];

if (data?.success !== true) errors.push("success must be true");
if (data?.mode !== "LIVE") errors.push("mode must be LIVE");
if (!/^\d{4}-\d{2}$/.test(String(data?.currentMonth || ""))) errors.push("currentMonth must be YYYY-MM");
if (!data?.generatedAt) errors.push("generatedAt is required");

for (const key of ["overview","content","video","creative","recommendations","actionPlan"]) {
  if (!Array.isArray(data?.data?.[key])) errors.push(`data.${key} must be an array`);
}

const overview = Array.isArray(data?.data?.overview) ? data.data.overview : [];
const currentRows = overview.filter((row) => row?.month === data.currentMonth);
const currentPlatforms = new Set(currentRows.map((row) => row?.platform));
for (const platform of ["Facebook","Instagram","TikTok","YouTube","LinkedIn"]) {
  if (!currentPlatforms.has(platform)) errors.push(`current overview missing ${platform}`);
}

const duplicateCurrentPlatforms = currentRows
  .map((row) => row?.platform)
  .filter((platform, index, all) => platform && all.indexOf(platform) !== index);
for (const platform of [...new Set(duplicateCurrentPlatforms)]) {
  errors.push(`current overview has duplicate ${platform} rows`);
}

const finite = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const canonicalDenominator = {
  Facebook: "reach",
  Instagram: "reach",
  TikTok: "views",
  YouTube: "impressions",
  LinkedIn: "impressions",
};

for (const row of currentRows) {
  const platform = String(row?.platform || "");
  const interactions = finite(row?.interactions);
  const engagementRate = finite(row?.engagementRate);
  const denominatorKey = canonicalDenominator[platform];
  const denominator = denominatorKey ? finite(row?.[denominatorKey]) : null;

  if (engagementRate !== null) {
    if (interactions === null) {
      errors.push(`current ${platform} has engagementRate but interactions is N/A`);
      continue;
    }
    if (denominator === null || denominator <= 0) {
      errors.push(`current ${platform} has engagementRate but canonical ${denominatorKey} denominator is unavailable`);
      continue;
    }
    const expected = interactions / denominator;
    if (Math.abs(engagementRate - expected) > 1e-6) {
      errors.push(`current ${platform} engagementRate does not match interactions / ${denominatorKey}`);
    }
  }
}

const currentYouTube = currentRows.find((row) => row?.platform === "YouTube");
if (currentYouTube) {
  const impressions = finite(currentYouTube.impressions);
  const interactions = finite(currentYouTube.interactions);
  const sourceNote = String(currentYouTube.note || currentYouTube.dataSource || "");

  if (interactions !== null && interactions > 0 && (impressions === null || impressions <= 0)) {
    warnings.push("current YouTube has interactions but Impressions is N/A; Reporting API latency or regression should be checked");
  }
  if (/Reporting API/i.test(sourceNote) && (impressions === null || impressions <= 0)) {
    warnings.push("current YouTube source declares Reporting API but Impressions is unavailable");
  }
}

if (Array.isArray(data?.data?.creative) && data?.counts) {
  if (typeof data.counts.creative === "number" && data.counts.creative !== data.data.creative.length) {
    errors.push(`creative count mismatch: counts=${data.counts.creative}, rows=${data.data.creative.length}`);
  }
  if (
    typeof data.counts.creativeReviewed === "number" &&
    typeof data.counts.creativePending === "number" &&
    typeof data.counts.creative === "number" &&
    data.counts.creativeReviewed + data.counts.creativePending !== data.counts.creative
  ) {
    errors.push("creative reviewed + pending must equal creative total");
  }
}

for (const row of overview) {
  if (row?.month === data.currentMonth) continue;
  if ((row?.platform === "Facebook" || row?.platform === "Instagram") && row?.reach == null) {
    warnings.push(`historical ${row.month} ${row.platform} reach is null; Apps Script historical parser should be checked`);
  }
}

for (const warning of [...new Set(warnings)]) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log(`Dashboard payload valid: ${data.currentMonth}; overview=${overview.length}; content=${data.data.content.length}; creative=${data.data.creative.length}`);

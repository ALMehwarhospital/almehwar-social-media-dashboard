/**
 * Locale-safe numeric utilities for the bound Apps Script project.
 *
 * Preferred rule:
 * - Read numeric Sheet data with Range.getValues(), not getDisplayValues().
 * - Preserve null/blank as null.
 * - Use parseLocaleNumber_ only as a defensive fallback for already-formatted text.
 *
 * This specifically prevents Arabic-locale thousands separators such as:
 *   "36٬677" -> 36677
 *   "1٬552"  -> 1552
 *   "2٫64%"  -> 0.0264 when parseLocalePercent_ is used
 */

function readEffectiveValues_(sheet, a1Range) {
  if (!sheet) throw new Error('readEffectiveValues_: sheet is required');
  return sheet.getRange(a1Range).getValues();
}

function finiteSheetNumber_(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;
  return parseLocaleNumber_(value);
}

function parseLocaleNumber_(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let text = String(value).trim();
  if (!text) return null;

  // Normalize Arabic-Indic digits.
  text = text
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

  // Remove common grouping separators and whitespace.
  text = text
    .replace(/[\u066C,\u00A0\u202F\s]/g, '')
    .replace(/\u066B/g, '.');

  // Strip non-numeric decorations except sign, decimal point and exponent.
  text = text.replace(/[^0-9+\-.eE]/g, '');

  if (!text || text === '+' || text === '-' || text === '.') return null;

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function parseLocalePercent_(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Sheet effective values for percent-formatted cells are already ratios.
    return value;
  }

  const raw = String(value).trim();
  const n = parseLocaleNumber_(raw);
  if (n === null) return null;
  return raw.includes('%') ? n / 100 : n;
}

/**
 * Converts one Monthly Overview row read with getValues() into safe numeric fields.
 * Keep source-reported numeric zero. Keep missing values as null.
 */
function normalizeMonthlyOverviewRow_(row, headerIndex) {
  const get = name => {
    const idx = headerIndex[name];
    return idx === undefined ? null : row[idx];
  };

  return {
    month: normalizeMonthKey_(get('Month')),
    platform: String(get('Platform') || '').trim(),
    followersStart: finiteSheetNumber_(get('Followers Start')),
    followersEnd: finiteSheetNumber_(get('Followers End')),
    newFollowers: finiteSheetNumber_(get('New Followers')),
    posts: finiteSheetNumber_(get('No. of Posts')),
    videos: finiteSheetNumber_(get('No. of Videos')),
    reach: finiteSheetNumber_(get('Reach')),
    impressions: finiteSheetNumber_(get('Impressions')),
    views: finiteSheetNumber_(get('Total Views')),
    profileVisits: finiteSheetNumber_(get('Profile Visits')),
    likes: finiteSheetNumber_(get('Likes')),
    comments: finiteSheetNumber_(get('Comments')),
    shares: finiteSheetNumber_(get('Shares')),
    interactions: finiteSheetNumber_(get('Content interaction')),
    engagementRate: finiteSheetNumber_(get('Engagement Rate')),
    linkClicks: finiteSheetNumber_(get('Link Clicks')),
    messages: finiteSheetNumber_(get('Messages / Inquiries')),
    leads: finiteSheetNumber_(get('Leads')),
    followerGrowth: finiteSheetNumber_(get('Follower Growth %')),
    note: get('Notes') == null ? '' : String(get('Notes'))
  };
}

function headerIndex_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    map[String(header || '').trim()] = index;
  });
  return map;
}

function normalizeMonthKey_(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM');
  }

  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
  return text || null;
}

/**
 * Example replacement for historical Monthly Overview parsing.
 * Adapt this function into the existing API builder rather than creating a second truth layer.
 */
function readMonthlyOverviewCanonical_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Monthly Overview');
  if (!sheet) throw new Error('Monthly Overview sheet not found');

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const matrix = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = matrix[0];
  const index = headerIndex_(headers);

  return matrix
    .slice(1)
    .filter(row => row.some(v => v !== '' && v !== null))
    .map(row => normalizeMonthlyOverviewRow_(row, index));
}

/**
 * Diagnostic only. Expected output proves Arabic separators no longer become null.
 */
function testLocaleNumberParser_() {
  const cases = [
    ['36٬677', 36677],
    ['1٬552', 1552],
    ['4٬169', 4169],
    ['2٫64', 2.64],
    ['٢٬٥٠٠', 2500],
    ['۳٬۲۰۰', 3200]
  ];

  const results = cases.map(([input, expected]) => ({
    input,
    expected,
    actual: parseLocaleNumber_(input),
    pass: parseLocaleNumber_(input) === expected
  }));

  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => !r.pass)) {
    throw new Error('Locale parser diagnostic failed.');
  }
  return results;
}

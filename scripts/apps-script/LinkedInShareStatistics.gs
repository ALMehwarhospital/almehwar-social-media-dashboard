/**
 * LinkedIn Organization Share Statistics helper.
 *
 * Prepared for use after LinkedIn API approval.
 *
 * Required Script Properties:
 *   LINKEDIN_ACCESS_TOKEN
 *   LINKEDIN_ORGANIZATION_URN   e.g. urn:li:organization:123456
 *   LINKEDIN_VERSION           e.g. 202609 (use a currently supported YYYYMM version)
 *
 * Canonical mapping for this workbook:
 * - Impressions      <- impressionCount
 * - Likes            <- likeCount
 * - Comments         <- commentCount
 * - Shares           <- shareCount
 * - Interactions     <- Likes + Comments + Shares
 * - Engagement Rate <- Interactions / Impressions
 * - Link Clicks      <- clickCount
 *
 * Deliberately NOT mapped:
 * - Reach: historical LinkedIn Reach is N/A, so uniqueImpressionsCount is not silently
 *   promoted to Reach without a separate business-definition decision.
 */

const LINKEDIN_SYNC = {
  SHEET_NAME: 'LinkedIn Raw',
  BASE_URL: 'https://api.linkedin.com/rest',
  PROP_ACCESS_TOKEN: 'LINKEDIN_ACCESS_TOKEN',
  PROP_ORG_URN: 'LINKEDIN_ORGANIZATION_URN',
  PROP_VERSION: 'LINKEDIN_VERSION'
};

function testLinkedInShareStatisticsAccess() {
  const cfg = getLinkedInConfig_();
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.now();
  const data = fetchLinkedInShareStats_(cfg, start, end);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

function syncLinkedInCurrentMonthShareStatistics() {
  const cfg = getLinkedInConfig_();
  const tz = Session.getScriptTimeZone() || 'Africa/Cairo';
  const now = new Date();
  const month = Utilities.formatDate(now, tz, 'yyyy-MM');

  const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startMs = startDate.getTime();
  const endMs = now.getTime();

  const response = fetchLinkedInShareStats_(cfg, startMs, endMs);
  const elements = response.elements || [];

  let impressions = 0;
  let clicks = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let uniqueImpressions = 0;

  elements.forEach(element => {
    const s = element.totalShareStatistics || {};
    impressions += safeCount_(s.impressionCount);
    clicks += safeCount_(s.clickCount);
    likes += safeCount_(s.likeCount);
    comments += safeCount_(s.commentCount);
    shares += safeCount_(s.shareCount);
    uniqueImpressions += safeCount_(s.uniqueImpressionsCount || s.uniqueImpressionsCounts);
  });

  const interactions = likes + comments + shares;
  const engagementRate = impressions > 0 ? interactions / impressions : null;

  const payload = {
    month,
    impressions,
    clicks,
    likes,
    comments,
    shares,
    interactions,
    engagementRate,
    uniqueImpressions,
    dataSource: 'LinkedIn Organization Share Statistics — organic',
    syncedAt: new Date()
  };

  const result = writeLinkedInRaw_(payload);
  console.log(JSON.stringify({ payload, result }, null, 2));
  return { payload, result };
}

function fetchLinkedInShareStats_(cfg, startMs, endMs) {
  const urn = encodeURIComponent(cfg.organizationUrn);
  const timeIntervals =
    '(timeRange:(start:' + Math.floor(startMs) + ',end:' + Math.floor(endMs) + '),timeGranularityType:DAY)';

  const url =
    LINKEDIN_SYNC.BASE_URL +
    '/organizationalEntityShareStatistics' +
    '?q=organizationalEntity' +
    '&organizationalEntity=' + urn +
    '&timeIntervals=' + encodeURIComponent(timeIntervals);

  return linkedinFetchJson_(url, cfg);
}

function linkedinFetchJson_(url, cfg) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + cfg.accessToken,
      'Linkedin-Version': cfg.version,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('LinkedIn API failed (' + code + '): ' + text.slice(0, 1200));
  }

  return text ? JSON.parse(text) : {};
}

function getLinkedInConfig_() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty(LINKEDIN_SYNC.PROP_ACCESS_TOKEN);
  const organizationUrn = props.getProperty(LINKEDIN_SYNC.PROP_ORG_URN);
  const version = props.getProperty(LINKEDIN_SYNC.PROP_VERSION);

  const missing = [];
  if (!accessToken) missing.push(LINKEDIN_SYNC.PROP_ACCESS_TOKEN);
  if (!organizationUrn) missing.push(LINKEDIN_SYNC.PROP_ORG_URN);
  if (!version) missing.push(LINKEDIN_SYNC.PROP_VERSION);

  if (missing.length) {
    throw new Error('Missing LinkedIn Script Properties: ' + missing.join(', '));
  }

  if (!/^\d{6}$/.test(version)) {
    throw new Error('LINKEDIN_VERSION must be YYYYMM, e.g. 202609.');
  }

  if (!/^urn:li:organization(?:Brand)?:\d+$/.test(organizationUrn)) {
    throw new Error('LINKEDIN_ORGANIZATION_URN has an unexpected format: ' + organizationUrn);
  }

  return { accessToken, organizationUrn, version };
}

function writeLinkedInRaw_(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LINKEDIN_SYNC.SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet: ' + LINKEDIN_SYNC.SHEET_NAME);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = {};
  headers.forEach((h, i) => index[String(h || '').trim()] = i + 1);

  const required = [
    'Period Month',
    'Impressions',
    'Likes',
    'Comments',
    'Shares',
    'Interactions',
    'Engagement Rate',
    'Link Clicks',
    'Data Source',
    'Last Synced'
  ];

  required.forEach(name => {
    if (!index[name]) throw new Error('LinkedIn Raw missing required column: ' + name);
  });

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const months = sheet
    .getRange(2, index['Period Month'], lastRow - 1, 1)
    .getValues()
    .map(row => normalizeLinkedInMonth_(row[0]));

  let rowNumber = months.findIndex(m => m === payload.month);
  if (rowNumber === -1) {
    rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, index['Period Month']).setValue(payload.month);
  } else {
    rowNumber += 2;
  }

  const writes = {
    'Impressions': payload.impressions,
    'Likes': payload.likes,
    'Comments': payload.comments,
    'Shares': payload.shares,
    'Interactions': payload.interactions,
    'Engagement Rate': payload.engagementRate,
    'Link Clicks': payload.clicks,
    'Data Source': payload.dataSource,
    'Last Synced': payload.syncedAt
  };

  Object.keys(writes).forEach(name => {
    const value = writes[name];
    const cell = sheet.getRange(rowNumber, index[name]);
    if (value === null || value === undefined || value === '') {
      cell.clearContent();
    } else {
      cell.setValue(value);
    }
  });

  return {
    row: rowNumber,
    month: payload.month,
    updatedColumns: Object.keys(writes),
    uniqueImpressionsDiagnosticOnly: payload.uniqueImpressions
  };
}

function normalizeLinkedInMonth_(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
  return text || null;
}

function safeCount_(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

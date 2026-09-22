/**
 * TikTok Business Account organic video insights helper.
 *
 * Purpose:
 * - Use TikTok API for Business /business/video/list/
 * - Pull richer per-video organic metrics that Display API does not expose:
 *   reach, average_time_watched, full_video_watched_rate
 * - Enrich ONLY the latest TikTok Video Snapshots batch.
 *
 * Required Script Properties:
 *   TIKTOK_ACCESS_TOKEN
 *   TIKTOK_CLIENT_ID
 *
 * Important:
 * - This helper does NOT sum per-video Reach into account Monthly Reach.
 *   Reach is unique per video; summing it would double-count people across videos.
 * - full_video_watched_rate is stored as canonical ratio 0–1.
 * - If the API omits a field, keep the snapshot cell blank/N/A.
 */

const TIKTOK_BIZ = {
  BASE_URL: 'https://business-api.tiktok.com/open_api/v1.3',
  SHEET_NAME: 'TikTok Video Snapshots',
  PROP_TOKEN: 'TIKTOK_ACCESS_TOKEN',
  PROP_APP_ID: 'TIKTOK_CLIENT_ID',
  FIELDS: [
    'item_id',
    'create_time',
    'caption',
    'video_views',
    'likes',
    'comments',
    'shares',
    'reach',
    'video_duration',
    'average_time_watched',
    'full_video_watched_rate'
  ],
  MAX_COUNT: 20
};

function testTikTokBusinessInsightsAccess() {
  const cfg = getTikTokBusinessConfig_();

  const tokenInfo = tiktokBusinessFetch_('/tt_user/token_info/get/', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      access_token: cfg.accessToken,
      app_id: cfg.appId
    })
  });

  const creatorId = String(((tokenInfo.data || {}).creator_id) || '').trim();
  if (!creatorId) {
    throw new Error('TikTok Business API token info returned no creator_id.');
  }

  cfg.businessId = creatorId;

  const firstPage = fetchTikTokBusinessVideoPage_(cfg, 0);
  console.log(JSON.stringify({
    tokenInfo: redactTikTokTokenInfo_(tokenInfo),
    firstPageCount: ((firstPage.data || {}).videos || []).length,
    hasMore: Boolean((firstPage.data || {}).has_more)
  }, null, 2));

  return {
    tokenInfo: redactTikTokTokenInfo_(tokenInfo),
    firstPage
  };
}

function syncTikTokBusinessVideoInsightsToLatestSnapshot() {
  const cfg = getTikTokBusinessConfig_();
  cfg.businessId = getTikTokBusinessCreatorId_(cfg);
  const videos = listAllTikTokBusinessVideos_(cfg);
  const byId = new Map();

  videos.forEach(video => {
    const id = String(video.item_id || '').trim();
    if (!id) return;

    byId.set(id, {
      itemId: id,
      reach: finiteTikTokNumber_(video.reach),
      averageWatchTimeSec: finiteTikTokNumber_(video.average_time_watched),
      completionRate: normalizeTikTokRate_(video.full_video_watched_rate),
      videoViews: finiteTikTokNumber_(video.video_views),
      likes: finiteTikTokNumber_(video.likes),
      comments: finiteTikTokNumber_(video.comments),
      shares: finiteTikTokNumber_(video.shares),
      durationSec: finiteTikTokNumber_(video.video_duration)
    });
  });

  const result = enrichLatestTikTokSnapshot_(byId);
  console.log(JSON.stringify({
    businessVideos: videos.length,
    matched: result.matched,
    missing: result.missing
  }, null, 2));

  return {
    success: true,
    businessVideos: videos.length,
    ...result
  };
}

function listAllTikTokBusinessVideos_(cfg) {
  const videos = [];
  let cursor = 0;
  let guard = 0;

  do {
    const response = fetchTikTokBusinessVideoPage_(cfg, cursor);
    const data = response.data || {};
    (data.videos || []).forEach(v => videos.push(v));

    if (!data.has_more) break;
    cursor = Number(data.cursor || 0);
    guard++;

    if (!cursor || guard > 100) {
      throw new Error('TikTok pagination guard triggered.');
    }
  } while (true);

  return videos;
}

function fetchTikTokBusinessVideoPage_(cfg, cursor) {
  const params = [
    'business_id=' + encodeURIComponent(cfg.businessId),
    'fields=' + encodeURIComponent(JSON.stringify(TIKTOK_BIZ.FIELDS)),
    'max_count=' + TIKTOK_BIZ.MAX_COUNT
  ];

  if (cursor) params.push('cursor=' + encodeURIComponent(cursor));

  return tiktokBusinessFetch_(
    '/business/video/list/?' + params.join('&'),
    { headers: { 'Access-Token': cfg.accessToken } }
  );
}

function tiktokBusinessFetch_(path, options) {
  const response = UrlFetchApp.fetch(TIKTOK_BIZ.BASE_URL + path, Object.assign({
    method: 'get',
    muteHttpExceptions: true
  }, options || {}));

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('TikTok Business API HTTP ' + code + ': ' + text.slice(0, 1200));
  }

  const json = text ? JSON.parse(text) : {};
  if (json.code !== undefined && Number(json.code) !== 0) {
    throw new Error('TikTok Business API error ' + json.code + ': ' + (json.message || 'Unknown error'));
  }

  return json;
}

function getTikTokBusinessConfig_() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty(TIKTOK_BIZ.PROP_TOKEN);
  const appId = props.getProperty(TIKTOK_BIZ.PROP_APP_ID);

  const missing = [];
  if (!accessToken) missing.push(TIKTOK_BIZ.PROP_TOKEN);
  if (!appId) missing.push(TIKTOK_BIZ.PROP_APP_ID);
  if (missing.length) {
    throw new Error('Missing TikTok Script Properties: ' + missing.join(', '));
  }

  return { accessToken, appId, businessId: null };
}

function getTikTokBusinessCreatorId_(cfg) {
  const tokenInfo = tiktokBusinessFetch_('/tt_user/token_info/get/', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      access_token: cfg.accessToken,
      app_id: cfg.appId
    })
  });

  const creatorId = String(((tokenInfo.data || {}).creator_id) || '').trim();
  if (!creatorId) {
    throw new Error('TikTok Business API token info returned no creator_id.');
  }

  return creatorId;
}

function enrichLatestTikTokSnapshot_(byId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TIKTOK_BIZ.SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet: ' + TIKTOK_BIZ.SHEET_NAME);

  ensureTikTokBusinessSnapshotHeaders_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { matched: 0, missing: [] };

  const snapshotValues = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const latestSnapshot = latestNonBlank_(snapshotValues.map(r => r[0]));

  if (latestSnapshot === null) {
    throw new Error('No Snapshot At value found in TikTok Video Snapshots.');
  }

  let matched = 0;
  const missing = [];

  snapshotValues.forEach((row, i) => {
    const snapshotAt = row[0];
    const videoId = String(row[1] || '').trim();
    if (!sameSheetValue_(snapshotAt, latestSnapshot) || !videoId) return;

    const metrics = byId.get(videoId);
    const targetRow = i + 2;

    if (!metrics) {
      missing.push(videoId);
      sheet.getRange(targetRow, 13, 1, 4).clearContent();
      return;
    }

    writeNullableTikTokCell_(sheet.getRange(targetRow, 13), metrics.reach);
    writeNullableTikTokCell_(sheet.getRange(targetRow, 14), metrics.averageWatchTimeSec);
    writeNullableTikTokCell_(sheet.getRange(targetRow, 15), metrics.completionRate);
    sheet.getRange(targetRow, 16).setValue(new Date());

    matched++;
  });

  return { matched, missing };
}

function ensureTikTokBusinessSnapshotHeaders_(sheet) {
  const headers = [
    'Business Reach',
    'Business Avg Watch Time Sec',
    'Business Completion Rate',
    'Business Insights Synced At'
  ];

  const existing = sheet.getRange(1, 13, 1, 4).getValues()[0];
  headers.forEach((header, i) => {
    if (existing[i] && String(existing[i]).trim() !== header) {
      throw new Error('Unexpected TikTok Video Snapshots header in column ' + (13 + i) + ': ' + existing[i]);
    }
  });

  sheet.getRange(1, 13, 1, 4).setValues([headers]);
}

function normalizeTikTokRate_(value) {
  const n = finiteTikTokNumber_(value);
  if (n === null) return null;

  // TikTok Business API normally returns a fraction (example 0.0395).
  // Defensive fallback supports a percentage-point response without double scaling.
  if (n >= 0 && n <= 1) return n;
  if (n > 1 && n <= 100) return n / 100;
  return null;
}

function finiteTikTokNumber_(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function writeNullableTikTokCell_(cell, value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    cell.clearContent();
  } else {
    cell.setValue(value);
  }
}

function latestNonBlank_(values) {
  const usable = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (!usable.length) return null;

  return usable.reduce((latest, value) => {
    const a = sheetComparable_(latest);
    const b = sheetComparable_(value);
    return b > a ? value : latest;
  });
}

function sheetComparable_(value) {
  if (value instanceof Date && !isNaN(value)) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(value);
  return isNaN(parsed) ? String(value) : parsed.getTime();
}

function sameSheetValue_(a, b) {
  return sheetComparable_(a) === sheetComparable_(b);
}

function redactTikTokTokenInfo_(response) {
  const clone = JSON.parse(JSON.stringify(response || {}));
  if (clone.data && clone.data.access_token) clone.data.access_token = '[redacted]';
  if (clone.data && clone.data.refresh_token) clone.data.refresh_token = '[redacted]';
  return clone;
}

/**
 * AlMehwar — TikTok Business organic video insights (live pipeline only).
 * Trigger entry point: runTikTokBusinessInsightsPipeline
 *
 * TikTok ER = Interactions / Views.
 * Per-video Business Reach must never be summed into Monthly Overview Reach.
 */

const TIKTOK_BIZ = {
  BASE_URL: 'https://business-api.tiktok.com/open_api/v1.3',
  SHEET_NAME: 'TikTok Video Snapshots',
  PROP_TOKEN: 'TIKTOK_ACCESS_TOKEN',
  PROP_APP_ID: 'TIKTOK_CLIENT_ID',
  FIELDS: [
    'item_id', 'create_time', 'caption', 'video_views', 'likes', 'comments',
    'shares', 'reach', 'video_duration', 'average_time_watched',
    'full_video_watched_rate'
  ],
  MAX_COUNT: 20
};

function runTikTokBusinessInsightsPipeline() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('TikTok Business pipeline skipped: another run is already active.');
    return { success: false, skipped: true, reason: 'locked' };
  }

  try {
    // Keep the shared TikTok token valid before the independent trigger runs.
    if (typeof TIKTOK_refreshAccessToken === 'function') {
      TIKTOK_refreshAccessToken();
    }

    const result = {
      success: true,
      snapshot: TIKTOK_BIZ_syncLatestSnapshot_()
    };
    result.videoAnalysis = TIKTOK_BIZ_syncVideoAnalysis_();
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function TIKTOK_BIZ_syncLatestSnapshot_() {
  const cfg = TIKTOK_BIZ_config_();
  cfg.businessId = TIKTOK_BIZ_creatorId_(cfg);
  const videos = TIKTOK_BIZ_listAllVideos_(cfg);
  const byId = new Map();

  videos.forEach(video => {
    const id = String(video.item_id || '').trim();
    if (!id) return;
    byId.set(id, {
      itemId: id,
      reach: TIKTOK_BIZ_number_(video.reach),
      averageWatchTimeSec: TIKTOK_BIZ_number_(video.average_time_watched),
      completionRate: TIKTOK_BIZ_rate_(video.full_video_watched_rate),
      videoViews: TIKTOK_BIZ_number_(video.video_views),
      likes: TIKTOK_BIZ_number_(video.likes),
      comments: TIKTOK_BIZ_number_(video.comments),
      shares: TIKTOK_BIZ_number_(video.shares),
      durationSec: TIKTOK_BIZ_number_(video.video_duration)
    });
  });

  const result = TIKTOK_BIZ_enrichLatestSnapshot_(byId);
  console.log(JSON.stringify({
    businessVideos: videos.length,
    matched: result.matched,
    missing: result.missing
  }, null, 2));
  return Object.assign({ success: true, businessVideos: videos.length }, result);
}

function TIKTOK_BIZ_syncVideoAnalysis_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const videoSheet = ss.getSheetByName('Video Analysis');
  const snapshotSheet = ss.getSheetByName(TIKTOK_BIZ.SHEET_NAME);
  if (!videoSheet) throw new Error('Missing sheet: Video Analysis');
  if (!snapshotSheet) throw new Error('Missing sheet: ' + TIKTOK_BIZ.SHEET_NAME);

  const snapshotLastRow = snapshotSheet.getLastRow();
  if (snapshotLastRow < 2) return { matched: 0, unmatched: 0, updatedRows: [] };

  const snapshotRows = snapshotSheet.getRange(2, 1, snapshotLastRow - 1, 16).getValues();
  const latestSnapshot = TIKTOK_BIZ_latest_(snapshotRows.map(row => row[0]));
  if (latestSnapshot === null) {
    throw new Error('No Snapshot At value found in TikTok Video Snapshots.');
  }

  const byId = new Map();
  snapshotRows.forEach(row => {
    if (!TIKTOK_BIZ_same_(row[0], latestSnapshot)) return;
    const videoId = String(row[1] || '').trim();
    if (!videoId) return;
    byId.set(videoId, {
      durationSec: TIKTOK_BIZ_number_(row[5]),
      views: TIKTOK_BIZ_number_(row[6]),
      likes: TIKTOK_BIZ_number_(row[7]),
      comments: TIKTOK_BIZ_number_(row[8]),
      shares: TIKTOK_BIZ_number_(row[9]),
      reach: TIKTOK_BIZ_number_(row[12]),
      averageWatchTimeSec: TIKTOK_BIZ_number_(row[13]),
      completionRate: TIKTOK_BIZ_rate_(row[14])
    });
  });

  const lastRow = videoSheet.getLastRow();
  if (lastRow < 2) return { matched: 0, unmatched: 0, updatedRows: [] };

  const rows = videoSheet.getRange(2, 1, lastRow - 1, 32).getValues();
  let matched = 0;
  let unmatched = 0;
  const updatedRows = [];

  rows.forEach((row, index) => {
    if (String(row[1] || '').trim() !== 'TikTok') return;

    const idMatch = String(row[30] || '').match(/\/video\/(\d+)/);
    if (!idMatch) {
      unmatched++;
      return;
    }

    const videoId = idMatch[1];
    const metrics = byId.get(videoId);
    if (!metrics) {
      unmatched++;
      return;
    }

    const sheetRow = index + 2;
    const interactions =
      (metrics.likes === null ? 0 : metrics.likes) +
      (metrics.comments === null ? 0 : metrics.comments) +
      (metrics.shares === null ? 0 : metrics.shares);
    const engagementRate = metrics.views !== null && metrics.views > 0
      ? interactions / metrics.views
      : null;
    const averagePercentWatched =
      metrics.averageWatchTimeSec !== null &&
      metrics.durationSec !== null &&
      metrics.durationSec > 0
        ? metrics.averageWatchTimeSec / metrics.durationSec
        : null;

    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 8), metrics.views); // H
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 9), metrics.reach); // I
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 11), interactions); // K
    videoSheet.getRange(sheetRow, 12).setValue('Views'); // L
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 13), engagementRate); // M
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 14), metrics.averageWatchTimeSec); // N
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 15), averagePercentWatched); // O
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 16), metrics.completionRate); // P
    TIKTOK_BIZ_writeNumber_(videoSheet.getRange(sheetRow, 21), metrics.shares); // U
    videoSheet.getRange(sheetRow, 31).setValue(
      'TikTok Display API + Business API cumulative video snapshot; ' +
      'Reach, Average Watch Time and Completion Rate available via Business API; ' +
      'saves and per-video follower metrics unavailable | ' +
      'https://www.tiktok.com/@almehwar.hospital/video/' + videoId
    );

    matched++;
    updatedRows.push(sheetRow);
  });

  const result = {
    success: true,
    snapshotVideos: byId.size,
    matched,
    unmatched,
    updatedRows
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function TIKTOK_BIZ_config_() {
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

function TIKTOK_BIZ_creatorId_(cfg) {
  const tokenInfo = TIKTOK_BIZ_fetch_('/tt_user/token_info/get/', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ access_token: cfg.accessToken, app_id: cfg.appId })
  });
  const creatorId = String(((tokenInfo.data || {}).creator_id) || '').trim();
  if (!creatorId) {
    throw new Error('TikTok Business API token info returned no creator_id.');
  }
  return creatorId;
}

function TIKTOK_BIZ_listAllVideos_(cfg) {
  const videos = [];
  let cursor = 0;
  let guard = 0;

  do {
    const data = TIKTOK_BIZ_videoPage_(cfg, cursor).data || {};
    (data.videos || []).forEach(video => videos.push(video));
    if (!data.has_more) break;
    cursor = Number(data.cursor || 0);
    guard++;
    if (!cursor || guard > 100) throw new Error('TikTok pagination guard triggered.');
  } while (true);

  return videos;
}

function TIKTOK_BIZ_videoPage_(cfg, cursor) {
  const params = [
    'business_id=' + encodeURIComponent(cfg.businessId),
    'fields=' + encodeURIComponent(JSON.stringify(TIKTOK_BIZ.FIELDS)),
    'max_count=' + TIKTOK_BIZ.MAX_COUNT
  ];
  if (cursor) params.push('cursor=' + encodeURIComponent(cursor));
  return TIKTOK_BIZ_fetch_('/business/video/list/?' + params.join('&'), {
    method: 'get',
    headers: { 'Access-Token': cfg.accessToken }
  });
}

function TIKTOK_BIZ_fetch_(path, options) {
  const response = UrlFetchApp.fetch(
    TIKTOK_BIZ.BASE_URL + path,
    Object.assign({ method: 'get', muteHttpExceptions: true }, options || {})
  );
  const httpCode = response.getResponseCode();
  const text = response.getContentText();
  if (httpCode < 200 || httpCode >= 300) {
    throw new Error('TikTok Business API HTTP ' + httpCode + ': ' + text.slice(0, 1200));
  }

  const json = text ? JSON.parse(text) : {};
  if (json.code !== undefined && Number(json.code) !== 0) {
    throw new Error('TikTok Business API error ' + json.code + ': ' + (json.message || 'Unknown error'));
  }
  return json;
}

function TIKTOK_BIZ_enrichLatestSnapshot_(byId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TIKTOK_BIZ.SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet: ' + TIKTOK_BIZ.SHEET_NAME);
  TIKTOK_BIZ_ensureHeaders_(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { matched: 0, missing: [] };

  const snapshotValues = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const latestSnapshot = TIKTOK_BIZ_latest_(snapshotValues.map(row => row[0]));
  if (latestSnapshot === null) {
    throw new Error('No Snapshot At value found in TikTok Video Snapshots.');
  }

  let matched = 0;
  const missing = [];
  snapshotValues.forEach((row, index) => {
    const videoId = String(row[1] || '').trim();
    if (!TIKTOK_BIZ_same_(row[0], latestSnapshot) || !videoId) return;

    const metrics = byId.get(videoId);
    const targetRow = index + 2;
    if (!metrics) {
      missing.push(videoId);
      sheet.getRange(targetRow, 13, 1, 4).clearContent();
      return;
    }

    TIKTOK_BIZ_writeNumber_(sheet.getRange(targetRow, 13), metrics.reach);
    TIKTOK_BIZ_writeNumber_(sheet.getRange(targetRow, 14), metrics.averageWatchTimeSec);
    TIKTOK_BIZ_writeNumber_(sheet.getRange(targetRow, 15), metrics.completionRate);
    sheet.getRange(targetRow, 16).setValue(new Date());
    matched++;
  });

  return { matched, missing };
}

function TIKTOK_BIZ_ensureHeaders_(sheet) {
  const headers = [
    'Business Reach',
    'Business Avg Watch Time Sec',
    'Business Completion Rate',
    'Business Insights Synced At'
  ];
  const existing = sheet.getRange(1, 13, 1, 4).getValues()[0];
  headers.forEach((header, index) => {
    if (existing[index] && String(existing[index]).trim() !== header) {
      throw new Error(
        'Unexpected TikTok Video Snapshots header in column ' +
        (13 + index) + ': ' + existing[index]
      );
    }
  });
  sheet.getRange(1, 13, 1, 4).setValues([headers]);
}

function TIKTOK_BIZ_rate_(value) {
  const number = TIKTOK_BIZ_number_(value);
  if (number === null) return null;
  if (number >= 0 && number <= 1) return number;
  if (number > 1 && number <= 100) return number / 100;
  return null;
}

function TIKTOK_BIZ_number_(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function TIKTOK_BIZ_writeNumber_(cell, value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    cell.clearContent();
  } else {
    cell.setValue(value);
  }
}

function TIKTOK_BIZ_latest_(values) {
  const usable = values.filter(value => value !== '' && value !== null && value !== undefined);
  if (!usable.length) return null;
  return usable.reduce((latest, value) =>
    TIKTOK_BIZ_comparable_(value) > TIKTOK_BIZ_comparable_(latest) ? value : latest
  );
}

function TIKTOK_BIZ_comparable_(value) {
  if (value instanceof Date && !isNaN(value)) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(value);
  return isNaN(parsed) ? String(value) : parsed.getTime();
}

function TIKTOK_BIZ_same_(a, b) {
  return TIKTOK_BIZ_comparable_(a) === TIKTOK_BIZ_comparable_(b);
}

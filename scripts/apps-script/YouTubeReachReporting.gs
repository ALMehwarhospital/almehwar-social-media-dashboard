/**
 * YouTube Reach Reporting API helper for the bound Apps Script project.
 *
 * Purpose:
 * - Create/reuse the official channel_reach_basic_a1 Reporting API job.
 * - Download available bulk reports.
 * - Aggregate video_thumbnail_impressions by Period Month + Video ID.
 * - Write Thumbnail Impressions and Thumbnail CTR into YouTube Raw columns T:U.
 *
 * Required OAuth scope:
 * https://www.googleapis.com/auth/yt-analytics.readonly
 *
 * Important semantics:
 * - YouTube Reporting API dates use YouTube's reporting day boundaries.
 * - video_thumbnail_impressions_ctr is a percentage in the source report.
 * - This script stores CTR as a canonical ratio 0–1 in the sheet.
 * - Daily CTR is combined with an impressions-weighted average.
 */

const YT_REACH = {
  REPORT_TYPE_ID: 'channel_reach_basic_a1',
  JOB_NAME: 'ALMehwar Channel Reach Basic',
  JOB_PROPERTY: 'YT_REACH_JOB_ID',
  SHEET_NAME: 'YouTube Raw',
  HEADER_ROW: 1,
  COL_PERIOD_MONTH: 1,
  COL_VIDEO_ID: 3,
  COL_THUMBNAIL_IMPRESSIONS: 20,
  COL_THUMBNAIL_CTR: 21,
  BASE_URL: 'https://youtubereporting.googleapis.com/v1'
};

function syncYouTubeReachReporting() {
  const jobId = getOrCreateYouTubeReachJob_();
  const reports = listYouTubeReachReports_(jobId);
  if (!reports.length) {
    console.log('YouTube Reach job exists but no reports are available yet.');
    return { success: true, jobId, reports: 0, updatedRows: 0 };
  }

  const dailyByKey = new Map();

  // Older report first; if YouTube regenerates/corrects a date, the newer report overwrites it.
  reports
    .slice()
    .sort((a, b) => String(a.createTime || '').localeCompare(String(b.createTime || '')))
    .forEach(report => {
      if (!report.downloadUrl) return;
      const rows = downloadYouTubeReachReport_(report.downloadUrl);
      rows.forEach(row => {
        const date = String(row.date || '').trim();
        const videoId = String(row.video_id || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !videoId) return;

        const impressions = finiteNumber_(row.video_thumbnail_impressions);
        const ctrPct = finiteNumber_(row.video_thumbnail_impressions_ctr);
        if (impressions === null || impressions < 0) return;

        const ctrRatio = ctrPct === null ? null : ctrPct / 100;
        const key = date + '|' + videoId;
        dailyByKey.set(key, {
          date,
          month: date.slice(0, 7),
          videoId,
          impressions,
          ctrRatio,
          reportCreateTime: report.createTime || null
        });
      });
    });

  const aggregate = new Map();
  dailyByKey.forEach(item => {
    const key = item.month + '|' + item.videoId;
    const current = aggregate.get(key) || {
      month: item.month,
      videoId: item.videoId,
      impressions: 0,
      weightedCtrNumerator: 0,
      ctrWeight: 0
    };

    current.impressions += item.impressions;
    if (item.ctrRatio !== null && item.impressions > 0) {
      current.weightedCtrNumerator += item.ctrRatio * item.impressions;
      current.ctrWeight += item.impressions;
    }
    aggregate.set(key, current);
  });

  const result = writeYouTubeReachToRaw_(aggregate);
  return {
    success: true,
    jobId,
    reports: reports.length,
    distinctDailyVideoRows: dailyByKey.size,
    updatedRows: result.updatedRows,
    unmatched: result.unmatched
  };
}

function getOrCreateYouTubeReachJob_() {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty(YT_REACH.JOB_PROPERTY);
  if (saved) return saved;

  const jobs = youtubeReportingFetch_('/jobs').jobs || [];
  const existing = jobs.find(job =>
    job.reportTypeId === YT_REACH.REPORT_TYPE_ID ||
    job.name === YT_REACH.JOB_NAME
  );
  if (existing && existing.id) {
    props.setProperty(YT_REACH.JOB_PROPERTY, existing.id);
    return existing.id;
  }

  const created = youtubeReportingFetch_('/jobs', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      reportTypeId: YT_REACH.REPORT_TYPE_ID,
      name: YT_REACH.JOB_NAME
    })
  });

  if (!created || !created.id) {
    throw new Error('YouTube Reporting job creation returned no job id.');
  }

  props.setProperty(YT_REACH.JOB_PROPERTY, created.id);
  return created.id;
}

function listYouTubeReachReports_(jobId) {
  let pageToken = null;
  const reports = [];

  do {
    const qs = pageToken ? '?pageToken=' + encodeURIComponent(pageToken) : '';
    const response = youtubeReportingFetch_('/jobs/' + encodeURIComponent(jobId) + '/reports' + qs);
    (response.reports || []).forEach(r => reports.push(r));
    pageToken = response.nextPageToken || null;
  } while (pageToken);

  return reports;
}

function downloadYouTubeReachReport_(downloadUrl) {
  const response = UrlFetchApp.fetch(downloadUrl, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('YouTube report download failed (' + code + '): ' + response.getContentText().slice(0, 500));
  }

  const csv = response.getContentText();
  const matrix = Utilities.parseCsv(csv);
  if (!matrix.length) return [];

  const headers = matrix[0].map(h => String(h).trim());
  return matrix.slice(1).map(values => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

function writeYouTubeReachToRaw_(aggregate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(YT_REACH.SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet: ' + YT_REACH.SHEET_NAME);

  const lastRow = sheet.getLastRow();
  if (lastRow <= YT_REACH.HEADER_ROW) {
    return { updatedRows: 0, unmatched: Array.from(aggregate.keys()) };
  }

  const width = Math.max(
    YT_REACH.COL_THUMBNAIL_CTR,
    YT_REACH.COL_VIDEO_ID,
    YT_REACH.COL_PERIOD_MONTH
  );

  const values = sheet.getRange(
    YT_REACH.HEADER_ROW + 1,
    1,
    lastRow - YT_REACH.HEADER_ROW,
    width
  ).getValues();

  const matched = new Set();
  let updatedRows = 0;

  values.forEach((row, index) => {
    const month = normalizePeriodMonth_(row[YT_REACH.COL_PERIOD_MONTH - 1]);
    const videoId = String(row[YT_REACH.COL_VIDEO_ID - 1] || '').trim();
    if (!month || !videoId) return;

    const key = month + '|' + videoId;
    const item = aggregate.get(key);
    if (!item) return;

    const ctrRatio = item.ctrWeight > 0
      ? item.weightedCtrNumerator / item.ctrWeight
      : null;

    const targetRow = YT_REACH.HEADER_ROW + 1 + index;
    sheet.getRange(targetRow, YT_REACH.COL_THUMBNAIL_IMPRESSIONS).setValue(item.impressions);
    if (ctrRatio === null) {
      sheet.getRange(targetRow, YT_REACH.COL_THUMBNAIL_CTR).clearContent();
    } else {
      sheet.getRange(targetRow, YT_REACH.COL_THUMBNAIL_CTR).setValue(ctrRatio);
    }

    matched.add(key);
    updatedRows++;
  });

  const unmatched = Array.from(aggregate.keys()).filter(key => !matched.has(key));
  return { updatedRows, unmatched };
}

function youtubeReportingFetch_(path, options) {
  const response = UrlFetchApp.fetch(YT_REACH.BASE_URL + path, Object.assign({
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  }, options || {}));

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error('YouTube Reporting API failed (' + code + '): ' + text.slice(0, 1000));
  }

  return text ? JSON.parse(text) : {};
}

function finiteNumber_(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normalizePeriodMonth_(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM');
  }

  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
  return null;
}

/**
 * Optional one-time diagnostic.
 * Run this first to confirm the script's OAuth token can see the reach report type.
 */
function testYouTubeReachReportingAccess() {
  const response = youtubeReportingFetch_('/reportTypes');
  const reportTypes = response.reportTypes || [];
  const reach = reportTypes.find(r => r.id === YT_REACH.REPORT_TYPE_ID);
  console.log(JSON.stringify(reach || null, null, 2));
  if (!reach) {
    throw new Error('channel_reach_basic_a1 is not visible to this OAuth token.');
  }
  return reach;
}

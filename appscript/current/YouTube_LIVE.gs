/**
 * AlMehwar — YouTube live data + Reach Reporting sync.
 * Used by SOCIAL_RUN_QUICK and SOCIAL_RUN_WEEKLY_DEEP.
 */

const YT_V2_RAW_SHEET = 'YouTube Raw';
const YT_V2_TIMEZONE = 'Africa/Cairo';

const YT_V2_REACH = {
  REPORT_TYPE_ID: 'channel_reach_basic_a1',
  JOB_NAME: 'ALMehwar Channel Reach Basic',
  JOB_PROPERTY: 'YT_REACH_JOB_ID',
  LEGACY_JOB_PROPERTY: 'YOUTUBE_REACH_JOB_ID',
  BASE_URL: 'https://youtubereporting.googleapis.com/v1',
  COL_PERIOD_MONTH: 1,
  COL_VIDEO_ID: 3,
  COL_THUMBNAIL_IMPRESSIONS: 20,
  COL_THUMBNAIL_CTR: 21
};

function YT_V2_pullPeriod_(startDate, endDate, periodMonth) {
  console.log('========================================');
  console.log('🚀 YouTube Raw Sync | ' + periodMonth);

  const report = YouTubeAnalytics.Reports.query({
    ids: 'channel==MINE',
    startDate,
    endDate,
    dimensions: 'video',
    metrics: [
      'views', 'estimatedMinutesWatched', 'averageViewDuration',
      'averageViewPercentage', 'likes', 'comments', 'shares',
      'subscribersGained', 'subscribersLost'
    ].join(','),
    sort: '-views',
    maxResults: 200
  });

  if (!report.rows || !report.rows.length) {
    console.log('No YouTube data found for ' + periodMonth);
    return { success: true, periodMonth, rows: 0 };
  }

  const headers = report.columnHeaders.map(header => header.name);
  const videoIndex = headers.indexOf('video');
  const videoIds = report.rows.map(row => String(row[videoIndex]));
  const videoInfo = {};

  for (let index = 0; index < videoIds.length; index += 50) {
    const response = YouTube.Videos.list('snippet,contentDetails', {
      id: videoIds.slice(index, index + 50).join(',')
    });
    (response.items || []).forEach(video => {
      const publishedAt = video.snippet.publishedAt;
      const publishedDate = publishedAt ? new Date(publishedAt) : null;
      videoInfo[video.id] = {
        title: video.snippet.title || '',
        publishedDateKey: publishedDate
          ? Utilities.formatDate(publishedDate, YT_V2_TIMEZONE, 'yyyy-MM-dd')
          : '',
        publishedDateObject: publishedDate || '',
        durationSec: YT_V2_durationToSeconds_(video.contentDetails.duration),
        url: 'https://www.youtube.com/watch?v=' + video.id
      };
    });
  }

  const rows = report.rows.map(reportRow => {
    const data = {};
    headers.forEach((header, index) => { data[header] = reportRow[index]; });
    const videoId = String(data.video);
    const info = videoInfo[videoId] || {};
    const views = Number(data.views || 0);
    const watchTimeMin = Number(data.estimatedMinutesWatched || 0);
    const avgViewDuration = Number(data.averageViewDuration || 0);
    const avgWatchedPercentage = Number(data.averageViewPercentage || 0);
    const likes = Number(data.likes || 0);
    const comments = Number(data.comments || 0);
    const shares = Number(data.shares || 0);
    const subscribersGained = Number(data.subscribersGained || 0);
    const subscribersLost = Number(data.subscribersLost || 0);
    const publishedThisMonth = Boolean(
      info.publishedDateKey &&
      info.publishedDateKey >= startDate &&
      info.publishedDateKey <= endDate
    );

    return [
      periodMonth,
      info.publishedDateObject || '',
      videoId,
      info.title || '',
      Number(info.durationSec || 0),
      publishedThisMonth,
      views,
      watchTimeMin,
      avgViewDuration,
      avgWatchedPercentage,
      likes,
      comments,
      shares,
      likes + comments + shares,
      subscribersGained,
      subscribersLost,
      subscribersGained - subscribersLost,
      new Date(),
      info.url || 'https://www.youtube.com/watch?v=' + videoId
    ];
  });

  const sheet = YT_V2_prepareRawSheet_();
  const lastRow = sheet.getLastRow();
  const existingMap = {};
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 19).getValues().forEach((row, index) => {
      const month = YT_V2_reachMonthKey_(row[0]);
      const videoId = String(row[2] || '').trim();
      if (month && videoId) existingMap[month + '|' + videoId] = index + 2;
    });
  }

  const newRows = [];
  let updatedCount = 0;
  rows.forEach(row => {
    const existingRow = existingMap[String(row[0]) + '|' + String(row[2])];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, 19).setValues([row]);
      updatedCount++;
    } else {
      newRows.push(row);
    }
  });
  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 19).setValues(newRows);
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 26).sort([
      { column: 1, ascending: false },
      { column: 7, ascending: false }
    ]);
  }
  const oldFilter = sheet.getFilter();
  if (oldFilter) oldFilter.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), 26).createFilter();
  SpreadsheetApp.flush();

  const result = {
    success: true,
    periodMonth,
    videosWithActivity: rows.length,
    publishedInPeriod: rows.filter(row => row[5] === true).length,
    newRows: newRows.length,
    updatedRows: updatedCount,
    views: rows.reduce((sum, row) => sum + Number(row[6] || 0), 0),
    interactions: rows.reduce((sum, row) => sum + Number(row[13] || 0), 0),
    watchTimeMin: rows.reduce((sum, row) => sum + Number(row[7] || 0), 0),
    subscribersGained: rows.reduce((sum, row) => sum + Number(row[14] || 0), 0),
    subscribersLost: rows.reduce((sum, row) => sum + Number(row[15] || 0), 0)
  };
  console.log('✅ YouTube Raw Sync Completed');
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function YT_V2_prepareRawSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(YT_V2_RAW_SHEET);
  if (!sheet) sheet = ss.insertSheet(YT_V2_RAW_SHEET);

  const headers = [
    'Period Month', 'Published Date', 'Video ID', 'Title', 'Duration Sec',
    'Published This Month?', 'Views in Period', 'Watch Time Min',
    'Avg View Duration Sec', 'Avg % Watched', 'Likes', 'Comments', 'Shares',
    'Interactions', 'Subscribers Gained', 'Subscribers Lost', 'Net Subscribers',
    'Last Synced', 'Video URL', 'Thumbnail Impressions', 'Thumbnail CTR',
    'Retention 25%', 'Retention 50%', 'Retention 75%', 'Retention End %',
    'Advanced Metrics Last Synced'
  ];
  sheet.getRange(1, 1, 1, 26).setValues([headers]);
  sheet.getRange('A1:Z1')
    .setBackground('#0E3145')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('C:C').setNumberFormat('@');
  sheet.getRange('B2:B').setNumberFormat('dd/mm/yyyy');
  sheet.getRange('J2:J').setNumberFormat('0.00"%"');
  sheet.getRange('U2:U').setNumberFormat('0.00%');
  sheet.getRange('V2:Y').setNumberFormat('0.00%');
  sheet.getRange('R2:R').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange('Z2:Z').setNumberFormat('dd/mm/yyyy hh:mm');

  [100, 110, 150, 380, 105, 145].forEach((width, index) =>
    sheet.setColumnWidth(index + 1, width)
  );
  for (let column = 7; column <= 17; column++) sheet.setColumnWidth(column, 120);
  sheet.setColumnWidth(18, 155);
  sheet.setColumnWidth(19, 300);
  for (let column = 20; column <= 26; column++) sheet.setColumnWidth(column, 145);
  sheet.getRange('D:D').setWrap(true);
  sheet.getRange('S:S').setWrap(true);
  return sheet;
}

function YT_V2_durationToSeconds_(duration) {
  if (!duration) return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return Number(match[1] || 0) * 86400 +
    Number(match[2] || 0) * 3600 +
    Number(match[3] || 0) * 60 +
    Number(match[4] || 0);
}

function YT_V2_syncReachReporting() {
  const jobId = YT_V2_getOrCreateReachJob_();
  const reports = YT_V2_listReachReports_(jobId);
  if (!reports.length) {
    const emptyResult = {
      success: true,
      jobId,
      reports: 0,
      distinctDailyVideoRows: 0,
      aggregatedVideoMonths: 0,
      updatedRows: 0,
      unmatched: [],
      message: 'Reach job exists, but YouTube has not produced a report yet.'
    };
    console.log(JSON.stringify(emptyResult, null, 2));
    return emptyResult;
  }

  const dailyByKey = new Map();
  reports
    .slice()
    .sort((a, b) => String(a.createTime || '').localeCompare(String(b.createTime || '')))
    .forEach(report => {
      if (!report.downloadUrl) return;
      YT_V2_downloadReachCsv_(report.downloadUrl).forEach(row => {
        const date = YT_V2_reachDateKey_(row.date || row.day || '');
        const videoId = String(row.video_id || '').trim();
        if (!date || !videoId) return;
        const impressions = YT_V2_reachNumber_(row.video_thumbnail_impressions);
        const ctrRatio = YT_V2_reachNumber_(row.video_thumbnail_impressions_ctr);
        if (impressions === null || impressions < 0) return;
        dailyByKey.set(date + '|' + videoId, {
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
    if (item.ctrRatio !== null && Number.isFinite(Number(item.ctrRatio)) && item.impressions > 0) {
      current.weightedCtrNumerator += Number(item.ctrRatio) * item.impressions;
      current.ctrWeight += item.impressions;
    }
    aggregate.set(key, current);
  });

  const writeResult = YT_V2_writeReachToRaw_(aggregate);
  const result = {
    success: true,
    jobId,
    reports: reports.length,
    distinctDailyVideoRows: dailyByKey.size,
    aggregatedVideoMonths: aggregate.size,
    updatedRows: writeResult.updatedRows,
    unmatched: writeResult.unmatched
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function YT_V2_getOrCreateReachJob_() {
  const props = PropertiesService.getScriptProperties();
  const savedJobId = props.getProperty(YT_V2_REACH.JOB_PROPERTY) ||
    props.getProperty(YT_V2_REACH.LEGACY_JOB_PROPERTY);

  if (savedJobId) {
    try {
      const savedJob = YT_V2_reachFetchJson_('/jobs/' + encodeURIComponent(savedJobId));
      if (savedJob && savedJob.id) {
        YT_V2_saveReachJobId_(savedJob.id);
        return savedJob.id;
      }
    } catch (error) {
      console.log('Stored Reach job is invalid; rediscovering. ' + error.message);
    }
  }

  const existing = YT_V2_listReachJobs_().find(job =>
    job.reportTypeId === YT_V2_REACH.REPORT_TYPE_ID || job.name === YT_V2_REACH.JOB_NAME
  );
  if (existing && existing.id) {
    YT_V2_saveReachJobId_(existing.id);
    return existing.id;
  }

  const created = YT_V2_reachFetchJson_('/jobs', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      reportTypeId: YT_V2_REACH.REPORT_TYPE_ID,
      name: YT_V2_REACH.JOB_NAME
    })
  });
  if (!created || !created.id) {
    throw new Error('YouTube Reach job creation returned no Job ID.');
  }
  YT_V2_saveReachJobId_(created.id);
  console.log('✅ YouTube Reach Job ready: ' + created.id);
  return created.id;
}

function YT_V2_saveReachJobId_(jobId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(YT_V2_REACH.JOB_PROPERTY, jobId);
  props.setProperty(YT_V2_REACH.LEGACY_JOB_PROPERTY, jobId);
}

function YT_V2_listReachJobs_() {
  const jobs = [];
  let pageToken = null;
  do {
    const query = pageToken ? '?pageToken=' + encodeURIComponent(pageToken) : '';
    const response = YT_V2_reachFetchJson_('/jobs' + query);
    (response.jobs || []).forEach(job => jobs.push(job));
    pageToken = response.nextPageToken || null;
  } while (pageToken);
  return jobs;
}

function YT_V2_listReachReports_(jobId) {
  const reports = [];
  let pageToken = null;
  do {
    const query = pageToken ? '?pageToken=' + encodeURIComponent(pageToken) : '';
    const response = YT_V2_reachFetchJson_(
      '/jobs/' + encodeURIComponent(jobId) + '/reports' + query
    );
    (response.reports || []).forEach(report => reports.push(report));
    pageToken = response.nextPageToken || null;
  } while (pageToken);
  return reports;
}

function YT_V2_downloadReachCsv_(downloadUrl) {
  const response = UrlFetchApp.fetch(downloadUrl, {
    method: 'get',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error('YouTube Reach report download failed (' + status + '): ' + body.slice(0, 800));
  }
  if (!body) return [];

  const matrix = Utilities.parseCsv(body);
  if (!matrix.length) return [];
  const headers = matrix[0].map(header =>
    String(header || '').replace(/^\uFEFF/, '').trim()
  );
  return matrix.slice(1)
    .filter(values => values.some(cell => String(cell || '').trim() !== ''))
    .map(values => {
      const row = {};
      headers.forEach((header, index) => { row[header] = values[index]; });
      return row;
    });
}

function YT_V2_writeReachToRaw_(aggregate) {
  const sheet = YT_V2_prepareRawSheet_();
  const headerValues = sheet.getRange(1, 1, 1, 21).getDisplayValues()[0];
  const expectedHeaders = {
    1: 'Period Month',
    3: 'Video ID',
    20: 'Thumbnail Impressions',
    21: 'Thumbnail CTR'
  };
  Object.keys(expectedHeaders).forEach(columnText => {
    const column = Number(columnText);
    const actual = String(headerValues[column - 1] || '').trim();
    if (actual !== expectedHeaders[column]) {
      throw new Error(
        'YouTube Raw schema mismatch. Column ' + column +
        ' expected "' + expectedHeaders[column] + '" but found "' + actual + '".'
      );
    }
  });

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { updatedRows: 0, unmatched: Array.from(aggregate.keys()) };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 21).getValues();
  const matched = new Set();
  const impressionWrites = [];
  const ctrWrites = [];
  let updatedRows = 0;

  values.forEach(row => {
    const month = YT_V2_reachMonthKey_(row[YT_V2_REACH.COL_PERIOD_MONTH - 1]);
    const videoId = String(row[YT_V2_REACH.COL_VIDEO_ID - 1] || '').trim();
    const oldImpressions = row[YT_V2_REACH.COL_THUMBNAIL_IMPRESSIONS - 1] || '';
    const oldCtr = row[YT_V2_REACH.COL_THUMBNAIL_CTR - 1] || '';
    if (!month || !videoId) {
      impressionWrites.push([oldImpressions]);
      ctrWrites.push([oldCtr]);
      return;
    }

    const key = month + '|' + videoId;
    const item = aggregate.get(key);
    if (!item) {
      impressionWrites.push([oldImpressions]);
      ctrWrites.push([oldCtr]);
      return;
    }

    impressionWrites.push([item.impressions]);
    ctrWrites.push([item.ctrWeight > 0 ? item.weightedCtrNumerator / item.ctrWeight : '']);
    matched.add(key);
    updatedRows++;
  });

  sheet.getRange(2, YT_V2_REACH.COL_THUMBNAIL_IMPRESSIONS, impressionWrites.length, 1)
    .setValues(impressionWrites);
  sheet.getRange(2, YT_V2_REACH.COL_THUMBNAIL_CTR, ctrWrites.length, 1)
    .setValues(ctrWrites);
  sheet.getRange('U2:U').setNumberFormat('0.00%');
  SpreadsheetApp.flush();

  return {
    updatedRows,
    unmatched: Array.from(aggregate.keys()).filter(key => !matched.has(key))
  };
}

function YT_V2_reachFetchJson_(path, options) {
  const requestOptions = Object.assign({ method: 'get', muteHttpExceptions: true }, options || {});
  requestOptions.headers = Object.assign(
    { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    (options && options.headers) || {}
  );
  const response = UrlFetchApp.fetch(YT_V2_REACH.BASE_URL + path, requestOptions);
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error('YouTube Reporting API failed (' + status + '): ' + text.slice(0, 1200));
  }
  return text ? JSON.parse(text) : {};
}

function YT_V2_reachNumber_(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim()
    .replace(/[,\u066C\u00A0\u202F\s]/g, '')
    .replace(/\u066B/g, '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function YT_V2_reachDateKey_(value) {
  const text = String(value || '').trim();
  if (/^\d{8}$/.test(text)) {
    return text.slice(0, 4) + '-' + text.slice(4, 6) + '-' + text.slice(6, 8);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function YT_V2_reachMonthKey_(value) {
  if (value instanceof Date && !isNaN(value)) {
    return Utilities.formatDate(value, YT_V2_TIMEZONE, 'yyyy-MM');
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
  return null;
}

/**
 * AlMehwar — Search Console live sync.
 * Trigger entry point: GSC_syncLIVE
 *
 * Writes:
 * - Search Console Overview Raw: official totals without dimensions.
 * - Search Console Raw: Query × Landing Page details.
 *
 * The detailed totals can be lower than the official overview because Google
 * omits anonymized queries from dimension-level results.
 */

const GSC_LIVE = {
  SITE_URL: 'https://almehwarhospital.com/',
  OVERVIEW_SHEET: 'Search Console Overview Raw',
  DETAILS_SHEET: 'Search Console Raw',
  ROW_LIMIT: 25000
};

function GSC_syncLIVE() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('Search Console sync skipped: another run is active.');
    return { success: false, skipped: true, reason: 'locked' };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone() || 'Africa/Cairo';
    const now = new Date();
    const periodMonth = Utilities.formatDate(now, tz, 'yyyy-MM');
    const startDate = periodMonth + '-01';
    const endDate = Utilities.formatDate(now, tz, 'yyyy-MM-dd');

    console.log('########################################');
    console.log('🔴 SEARCH CONSOLE LIVE SYNC STARTED');
    console.log('Period: ' + periodMonth);
    console.log('Date Range: ' + startDate + ' → ' + endDate);

    const overview = GSC_LIVE_fetchOverview_(startDate, endDate);
    GSC_LIVE_upsertOverview_(periodMonth, overview);

    console.log('🔎 SEARCH CONSOLE OVERVIEW');
    console.log('Clicks: ' + overview.clicks);
    console.log('Impressions: ' + overview.impressions);
    console.log('CTR: ' + (overview.ctr * 100).toFixed(2) + '%');
    console.log('Average Position: ' + overview.position.toFixed(2));

    const details = GSC_LIVE_fetchDetails_(startDate, endDate, periodMonth);
    GSC_LIVE_replaceDetailsMonth_(periodMonth, details.rows);

    console.log('🔎 SEARCH CONSOLE QUERY + PAGE DETAILS');
    console.log('Rows: ' + details.rows.length);
    console.log('Clicks: ' + details.clicks);
    console.log('Impressions: ' + details.impressions);
    console.log('CTR: ' + (details.ctr * 100).toFixed(2) + '%');

    details.rows
      .slice()
      .sort((a, b) => b[3] - a[3])
      .slice(0, 10)
      .forEach((row, index) => console.log(
        '#' + (index + 1) + ' | ' + row[1] +
        ' | Clicks: ' + row[3] +
        ' | Impr: ' + row[4] +
        ' | CTR: ' + (row[5] * 100).toFixed(2) + '%' +
        ' | Pos: ' + Number(row[6]).toFixed(2)
      ));

    SpreadsheetApp.flush();
    const result = {
      success: true,
      periodMonth,
      through: endDate,
      overview,
      details: {
        rows: details.rows.length,
        clicks: details.clicks,
        impressions: details.impressions,
        ctr: details.ctr
      }
    };
    console.log('✅ SEARCH CONSOLE LIVE SYNC COMPLETED');
    return result;
  } finally {
    lock.releaseLock();
  }
}

function GSC_LIVE_fetchOverview_(startDate, endDate) {
  const json = GSC_LIVE_request_({
    startDate,
    endDate,
    type: 'web'
  });
  if (!json.rows || !json.rows.length) {
    throw new Error('Search Console returned no verified overview rows. Existing monthly data was not overwritten.');
  }
  const row = json.rows[0];
  return {
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0)
  };
}

function GSC_LIVE_fetchDetails_(startDate, endDate, periodMonth) {
  const rows = [];
  let startRow = 0;

  while (true) {
    const json = GSC_LIVE_request_({
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      type: 'web',
      rowLimit: GSC_LIVE.ROW_LIMIT,
      startRow
    });
    const apiRows = json.rows || [];

    apiRows.forEach(row => rows.push([
      periodMonth,
      row.keys && row.keys[0] ? row.keys[0] : '',
      row.keys && row.keys[1] ? row.keys[1] : '',
      Number(row.clicks || 0),
      Number(row.impressions || 0),
      Number(row.ctr || 0),
      Number(row.position || 0),
      new Date()
    ]));

    console.log('Fetched rows: ' + apiRows.length + ' | Start row: ' + startRow);
    if (apiRows.length < GSC_LIVE.ROW_LIMIT) break;
    startRow += GSC_LIVE.ROW_LIMIT;
  }

  const clicks = rows.reduce((sum, row) => sum + Number(row[3] || 0), 0);
  const impressions = rows.reduce((sum, row) => sum + Number(row[4] || 0), 0);
  return {
    rows,
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0
  };
}

function GSC_LIVE_request_(payload) {
  const endpoint = 'https://www.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(GSC_LIVE.SITE_URL) + '/searchAnalytics/query';
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status !== 200) {
    throw new Error('Search Console HTTP ' + status + ': ' + text.slice(0, 1500));
  }
  return text ? JSON.parse(text) : {};
}

function GSC_LIVE_upsertOverview_(periodMonth, metrics) {
  const sheet = GSC_LIVE_prepareOverviewSheet_();
  const lastRow = sheet.getLastRow();
  let targetRow = null;

  if (lastRow >= 2) {
    const months = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let index = 0; index < months.length; index++) {
      if (GSC_LIVE_monthKey_(months[index][0]) === periodMonth) {
        targetRow = index + 2;
        break;
      }
    }
  }

  const row = [[
    periodMonth,
    metrics.clicks,
    metrics.impressions,
    metrics.ctr,
    metrics.position,
    new Date()
  ]];
  sheet.getRange(targetRow || sheet.getLastRow() + 1, 1, 1, 6).setValues(row);

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 6)
      .sort({ column: 1, ascending: false });
  }
}

function GSC_LIVE_replaceDetailsMonth_(periodMonth, newRows) {
  const sheet = GSC_LIVE_prepareDetailsSheet_();
  const lastRow = sheet.getLastRow();
  let keptRows = [];

  if (lastRow >= 2) {
    keptRows = sheet.getRange(2, 1, lastRow - 1, 8).getValues()
      .filter(row => GSC_LIVE_monthKey_(row[0]) !== periodMonth);
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  const allRows = keptRows.concat(newRows);
  if (allRows.length) {
    sheet.getRange(2, 1, allRows.length, 8).setValues(allRows);
    sheet.getRange(2, 1, allRows.length, 8).sort([
      { column: 1, ascending: false },
      { column: 4, ascending: false }
    ]);
  }

  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), 8).createFilter();
}

function GSC_LIVE_prepareOverviewSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GSC_LIVE.OVERVIEW_SHEET);
  if (!sheet) sheet = ss.insertSheet(GSC_LIVE.OVERVIEW_SHEET);

  sheet.getRange(1, 1, 1, 6).setValues([[
    'Period Month', 'Clicks', 'Impressions', 'CTR', 'Average Position', 'Last Synced'
  ]]);
  GSC_LIVE_styleHeader_(sheet.getRange('A1:F1'));
  sheet.setFrozenRows(1);
  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.getRange('D2:D').setNumberFormat('0.00%');
  sheet.getRange('E2:E').setNumberFormat('0.00');
  sheet.getRange('F2:F').setNumberFormat('dd/mm/yyyy hh:mm');
  [120, 120, 140, 110, 150, 170].forEach((width, index) =>
    sheet.setColumnWidth(index + 1, width)
  );
  return sheet;
}

function GSC_LIVE_prepareDetailsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(GSC_LIVE.DETAILS_SHEET);
  if (!sheet) sheet = ss.insertSheet(GSC_LIVE.DETAILS_SHEET);

  sheet.getRange(1, 1, 1, 8).setValues([[
    'Period Month', 'Search Query', 'Landing Page', 'Clicks',
    'Impressions', 'CTR', 'Average Position', 'Last Synced'
  ]]);
  GSC_LIVE_styleHeader_(sheet.getRange('A1:H1'));
  sheet.setFrozenRows(1);
  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.getRange('F2:F').setNumberFormat('0.00%');
  sheet.getRange('G2:G').setNumberFormat('0.00');
  sheet.getRange('H2:H').setNumberFormat('dd/mm/yyyy hh:mm');
  [110, 320, 480, 130, 130, 130, 130, 160].forEach((width, index) =>
    sheet.setColumnWidth(index + 1, width)
  );
  sheet.getRange('B:C').setWrap(true);
  return sheet;
}

function GSC_LIVE_styleHeader_(range) {
  range
    .setBackground('#0E3145')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
}

function GSC_LIVE_monthKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(value, tz, 'yyyy-MM');
  }
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})/);
  return match ? match[1] + '-' + match[2] : text;
}


/** Keep Search Console on a daily schedule without duplicating triggers. */
function GSC_LIVE_ensureDailyTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'GSC_syncLIVE';
  });
  if (!exists) {
    ScriptApp.newTrigger('GSC_syncLIVE').timeBased().everyDays(1).atHour(7).create();
    console.log('Installed daily Search Console sync trigger.');
  }
}

/** Run once in the Apps Script editor to refresh Search Console and repair its schedule. */
function MEHWAR_REPAIR_SEARCH_CONSOLE() {
  const result = GSC_syncLIVE();
  if (!result || !result.success) throw new Error('Search Console sync was skipped or failed.');
  GSC_LIVE_ensureDailyTrigger_();
  Logger.log('Search Console refreshed: ' + result.periodMonth + ' through ' + result.through);
  Logger.log('Clicks: ' + result.overview.clicks + ', impressions: ' + result.overview.impressions);
  Logger.log('Daily trigger: verified for the current account');
  return result;
}

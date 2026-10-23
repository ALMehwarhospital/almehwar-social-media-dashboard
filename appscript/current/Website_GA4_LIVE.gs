/**
 * AlMehwar — GA4 website live sync.
 * Trigger entry point: GA4_V2_syncLIVE
 * GA4 Property: 503135843
 */

const GA4_LIVE = {
  PROPERTY_ID: '503135843',
  BASE_URL: 'https://almehwarhospital.com',
  SHEETS: {
    website: 'Website Raw',
    traffic: 'Website Traffic Raw',
    sources: 'Website Sources Raw',
    pages: 'Website Pages Raw',
    conversions: 'Website Conversions Raw'
  }
};

function GA4_V2_syncLIVE() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('GA4 live sync skipped: another run is active.');
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
    console.log('🔴 LIVE WEBSITE SYNC STARTED');
    console.log('Period: ' + periodMonth);
    console.log('Date Range: ' + startDate + ' → ' + endDate);

    const result = {
      success: true,
      periodMonth,
      through: endDate,
      website: GA4_LIVE_syncOverview_(startDate, endDate, periodMonth),
      traffic: GA4_LIVE_syncDimension_(
        startDate, endDate, periodMonth,
        'sessionDefaultChannelGroup', GA4_LIVE.SHEETS.traffic, 'Channel Group'
      ),
      sources: GA4_LIVE_syncDimension_(
        startDate, endDate, periodMonth,
        'sessionSource', GA4_LIVE.SHEETS.sources, 'Session Source'
      ),
      pages: GA4_LIVE_syncPages_(startDate, endDate, periodMonth),
      conversions: GA4_LIVE_syncConversions_(startDate, endDate, periodMonth)
    };

    SpreadsheetApp.flush();
    console.log('✅ LIVE WEBSITE SYNC COMPLETED');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function GA4_LIVE_syncOverview_(startDate, endDate, periodMonth) {
  const metricNames = [
    'totalUsers', 'activeUsers', 'newUsers', 'sessions', 'engagedSessions',
    'engagementRate', 'averageSessionDuration', 'screenPageViews',
    'screenPageViewsPerSession', 'eventCount'
  ];
  const report = GA4_LIVE_runReport_(startDate, endDate, [], metricNames);
  if (!report.rows || !report.rows.length) {
    console.log('No Website Raw data for ' + periodMonth);
    return { rows: 0 };
  }

  const values = report.rows[0].metricValues.map(item => Number(item.value || 0));
  const row = [
    periodMonth,
    Math.round(values[0]),
    Math.round(values[1]),
    Math.round(values[2]),
    Math.round(values[3]),
    Math.round(values[4]),
    values[5],
    values[6],
    Math.round(values[7]),
    values[8],
    Math.round(values[9]),
    new Date()
  ];
  GA4_LIVE_upsertMonth_(GA4_LIVE_prepareOverviewSheet_(), periodMonth, row);

  return {
    totalUsers: row[1],
    activeUsers: row[2],
    newUsers: row[3],
    sessions: row[4],
    engagedSessions: row[5],
    engagementRate: row[6],
    avgSessionDurationSec: row[7],
    pageViews: row[8],
    viewsPerSession: row[9],
    eventCount: row[10]
  };
}

function GA4_LIVE_syncDimension_(
  startDate,
  endDate,
  periodMonth,
  dimensionName,
  sheetName,
  dimensionHeader
) {
  const report = GA4_LIVE_runReport_(
    startDate,
    endDate,
    [dimensionName],
    ['sessions', 'activeUsers', 'engagedSessions'],
    'sessions'
  );
  if (!report.rows || !report.rows.length) {
    console.log('No ' + dimensionHeader + ' data for ' + periodMonth);
    return { rows: 0, sessions: 0 };
  }

  const totalSessions = GA4_LIVE_trueSessions_(startDate, endDate);
  const rows = report.rows.map(item => {
    const sessions = Number(item.metricValues[0].value || 0);
    const activeUsers = Number(item.metricValues[1].value || 0);
    const engagedSessions = Number(item.metricValues[2].value || 0);
    return [
      periodMonth,
      item.dimensionValues[0].value || '(not set)',
      Math.round(sessions),
      Math.round(activeUsers),
      Math.round(engagedSessions),
      sessions > 0 ? engagedSessions / sessions : 0,
      totalSessions > 0 ? sessions / totalSessions : 0,
      new Date()
    ];
  });

  const sheet = GA4_LIVE_prepareDimensionSheet_(sheetName, dimensionHeader);
  GA4_LIVE_replaceMonth_(sheet, periodMonth, rows, 8, 3);
  console.log(dimensionHeader + ' rows: ' + rows.length + ' | Sessions: ' + totalSessions);
  return { rows: rows.length, sessions: totalSessions };
}

function GA4_LIVE_syncPages_(startDate, endDate, periodMonth) {
  const report = GA4_LIVE_runReport_(
    startDate,
    endDate,
    ['landingPage'],
    [
      'sessions', 'activeUsers', 'engagedSessions', 'engagementRate',
      'averageSessionDuration', 'screenPageViews'
    ],
    'sessions',
    100000
  );
  if (!report.rows || !report.rows.length) {
    console.log('No landing-page data for ' + periodMonth);
    return { rows: 0, sessions: 0 };
  }

  const reportSessions = report.rows.reduce(
    (sum, item) => sum + Number(item.metricValues[0].value || 0),
    0
  );
  const rows = report.rows.map(item => {
    const landingPage = item.dimensionValues[0].value || '(not set)';
    const sessions = Number(item.metricValues[0].value || 0);
    const activeUsers = Number(item.metricValues[1].value || 0);
    const engagedSessions = Number(item.metricValues[2].value || 0);
    const engagementRate = Number(item.metricValues[3].value || 0);
    const avgDuration = Number(item.metricValues[4].value || 0);
    const pageViews = Number(item.metricValues[5].value || 0);
    const fullUrl = landingPage !== '(not set)' && landingPage.startsWith('/')
      ? GA4_LIVE.BASE_URL + landingPage
      : '';
    return [
      periodMonth,
      landingPage,
      fullUrl,
      Math.round(sessions),
      Math.round(activeUsers),
      Math.round(engagedSessions),
      engagementRate,
      avgDuration,
      Math.round(pageViews),
      sessions > 0 ? pageViews / sessions : 0,
      reportSessions > 0 ? sessions / reportSessions : 0,
      new Date()
    ];
  });

  GA4_LIVE_replaceMonth_(GA4_LIVE_preparePagesSheet_(), periodMonth, rows, 12, 4);
  console.log('Landing Pages: ' + rows.length + ' | Sessions: ' + reportSessions);
  return { rows: rows.length, sessions: reportSessions };
}

function GA4_LIVE_syncConversions_(startDate, endDate, periodMonth) {
  const report = GA4_LIVE_runReport_(
    startDate,
    endDate,
    ['eventName'],
    ['eventCount', 'activeUsers', 'keyEvents']
  );
  let formStarts = 0;
  let formStartUsers = 0;
  let formSubmits = 0;
  let formSubmitUsers = 0;
  let keyEvents = 0;

  (report.rows || []).forEach(item => {
    const eventName = item.dimensionValues[0].value;
    const count = Number(item.metricValues[0].value || 0);
    const users = Number(item.metricValues[1].value || 0);
    const keys = Number(item.metricValues[2].value || 0);
    if (eventName === 'form_start') {
      formStarts = count;
      formStartUsers = users;
    } else if (eventName === 'form_submit') {
      formSubmits = count;
      formSubmitUsers = users;
      keyEvents = keys;
    }
  });

  const row = [
    periodMonth,
    formStarts,
    formStartUsers,
    formSubmits,
    formSubmitUsers,
    formStarts > 0 ? formSubmits / formStarts : 0,
    formStartUsers > 0 ? formSubmitUsers / formStartUsers : 0,
    keyEvents,
    new Date()
  ];
  GA4_LIVE_upsertMonth_(GA4_LIVE_prepareConversionsSheet_(), periodMonth, row);
  return {
    formStarts,
    formStartUsers,
    formSubmits,
    formSubmitUsers,
    formCompletionRate: row[5],
    userCompletionRate: row[6],
    keyEvents
  };
}

function GA4_LIVE_runReport_(startDate, endDate, dimensions, metrics, orderMetric, limit) {
  const request = AnalyticsData.newRunReportRequest();
  const dateRange = AnalyticsData.newDateRange();
  dateRange.startDate = startDate;
  dateRange.endDate = endDate;
  request.dateRanges = [dateRange];

  if (dimensions && dimensions.length) {
    request.dimensions = dimensions.map(name => {
      const dimension = AnalyticsData.newDimension();
      dimension.name = name;
      return dimension;
    });
  }
  request.metrics = metrics.map(name => {
    const metric = AnalyticsData.newMetric();
    metric.name = name;
    return metric;
  });
  if (orderMetric) {
    const orderBy = AnalyticsData.newOrderBy();
    const metricOrder = AnalyticsData.newMetricOrderBy();
    metricOrder.metricName = orderMetric;
    orderBy.metric = metricOrder;
    orderBy.desc = true;
    request.orderBys = [orderBy];
  }
  if (limit) request.limit = limit;

  return AnalyticsData.Properties.runReport(
    request,
    'properties/' + GA4_LIVE.PROPERTY_ID
  );
}

function GA4_LIVE_trueSessions_(startDate, endDate) {
  const report = GA4_LIVE_runReport_(startDate, endDate, [], ['sessions']);
  return report.rows && report.rows.length
    ? Number(report.rows[0].metricValues[0].value || 0)
    : 0;
}

function GA4_LIVE_upsertMonth_(sheet, periodMonth, row) {
  const lastRow = sheet.getLastRow();
  let targetRow = null;
  if (lastRow >= 2) {
    const months = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let index = 0; index < months.length; index++) {
      if (GA4_LIVE_monthKey_(months[index][0]) === periodMonth) {
        targetRow = index + 2;
        break;
      }
    }
  }
  sheet.getRange(targetRow || sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, row.length)
      .sort({ column: 1, ascending: false });
  }
}

function GA4_LIVE_replaceMonth_(sheet, periodMonth, newRows, columnCount, metricColumn) {
  const lastRow = sheet.getLastRow();
  let keptRows = [];
  if (lastRow >= 2) {
    keptRows = sheet.getRange(2, 1, lastRow - 1, columnCount).getValues()
      .filter(row => GA4_LIVE_monthKey_(row[0]) !== periodMonth);
    sheet.getRange(2, 1, lastRow - 1, columnCount).clearContent();
  }

  const allRows = keptRows.concat(newRows);
  if (allRows.length) {
    sheet.getRange(2, 1, allRows.length, columnCount).setValues(allRows);
    sheet.getRange(2, 1, allRows.length, columnCount).sort([
      { column: 1, ascending: false },
      { column: metricColumn, ascending: false }
    ]);
  }

  const oldFilter = sheet.getFilter();
  if (oldFilter) oldFilter.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), columnCount).createFilter();
}

function GA4_LIVE_prepareOverviewSheet_() {
  const sheet = GA4_LIVE_sheet_(GA4_LIVE.SHEETS.website, [
    'Period Month', 'Total Users', 'Active Users', 'New Users', 'Sessions',
    'Engaged Sessions', 'Engagement Rate', 'Avg Session Duration Sec',
    'Page Views', 'Views / Session', 'Event Count', 'Last Synced'
  ]);
  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.getRange('G2:G').setNumberFormat('0.00%');
  sheet.getRange('H2:H').setNumberFormat('0.00');
  sheet.getRange('J2:J').setNumberFormat('0.00');
  sheet.getRange('L2:L').setNumberFormat('dd/mm/yyyy hh:mm');
  return sheet;
}

function GA4_LIVE_prepareDimensionSheet_(sheetName, dimensionHeader) {
  const sheet = GA4_LIVE_sheet_(sheetName, [
    'Period Month', dimensionHeader, 'Sessions', 'Active Users',
    'Engaged Sessions', 'Engagement Rate', 'Session Share %', 'Last Synced'
  ]);
  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.getRange('F2:G').setNumberFormat('0.00%');
  sheet.getRange('H2:H').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 220);
  return sheet;
}

function GA4_LIVE_preparePagesSheet_() {
  const sheet = GA4_LIVE_sheet_(GA4_LIVE.SHEETS.pages, [
    'Period Month', 'Landing Page', 'Full URL', 'Sessions', 'Active Users',
    'Engaged Sessions', 'Engagement Rate', 'Avg Session Duration Sec',
    'Page Views', 'Views / Session', 'Landing Session Share %', 'Last Synced'
  ]);
  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.getRange('G2:G').setNumberFormat('0.00%');
  sheet.getRange('H2:H').setNumberFormat('0.00');
  sheet.getRange('J2:J').setNumberFormat('0.00');
  sheet.getRange('K2:K').setNumberFormat('0.00%');
  sheet.getRange('L2:L').setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 420);
  sheet.setColumnWidth(3, 480);
  for (let column = 4; column <= 11; column++) sheet.setColumnWidth(column, 145);
  sheet.setColumnWidth(12, 160);
  sheet.getRange('B:C').setWrap(true);
  return sheet;
}

function GA4_LIVE_prepareConversionsSheet_() {
  const sheet = GA4_LIVE_sheet_(GA4_LIVE.SHEETS.conversions, [
    'Period Month', 'Form Starts', 'Form Start Users', 'Form Submits',
    'Form Submit Users', 'Form Completion Rate', 'User Completion Rate',
    'GA4 Key Events', 'Last Synced'
  ]);
  sheet.getRange('A2:A').setNumberFormat('@');
  sheet.getRange('F2:G').setNumberFormat('0.00%');
  sheet.getRange('I2:I').setNumberFormat('dd/mm/yyyy hh:mm');
  for (let column = 1; column <= 9; column++) sheet.setColumnWidth(column, 150);
  return sheet;
}

function GA4_LIVE_sheet_(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#0E3145')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  return sheet;
}

function GA4_LIVE_monthKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(value, tz, 'yyyy-MM');
  }
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})/);
  return match ? match[1] + '-' + match[2] : text;
}

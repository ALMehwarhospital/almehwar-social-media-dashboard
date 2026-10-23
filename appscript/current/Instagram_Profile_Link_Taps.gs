/**
 * AlMehwar — Instagram Profile Link Taps (live sync only).
 * Trigger entry point: runInstagramProfileLinkTapsPipeline
 * Script Property required: META_PAGE_TOKEN
 */

const IG_PROFILE_TAPS = {
  BASE_URL: 'https://graph.facebook.com',
  TOKEN_PROP: 'META_PAGE_TOKEN',
  MONTHLY_SHEET: 'Monthly Overview',
  PLATFORM_NAME: 'Instagram',
  HEADER_NAME: 'Profile Link Taps'
};

function runInstagramProfileLinkTapsPipeline() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('Instagram Profile Link Taps pipeline skipped: another run is active.');
    return { success: false, skipped: true, reason: 'locked' };
  }

  try {
    return IG_PROFILE_TAPS_syncCurrentMonth_();
  } finally {
    lock.releaseLock();
  }
}

function IG_PROFILE_TAPS_syncCurrentMonth_() {
  const cfg = IG_PROFILE_TAPS_config_();
  const ig = IG_PROFILE_TAPS_connectedAccount_(cfg);
  const window = IG_PROFILE_TAPS_currentMonthWindow_();
  const metric = IG_PROFILE_TAPS_fetch_(cfg, ig.id, window.since, window.until);
  const value = metric && metric.total_value
    ? Number(metric.total_value.value)
    : NaN;

  if (!Number.isFinite(value)) {
    throw new Error('profile_links_taps returned without a finite total_value.');
  }

  const writeResult = IG_PROFILE_TAPS_writeOverview_(
    value,
    window.monthLabel,
    window.periodKey
  );

  const result = {
    success: true,
    username: ig.username || null,
    since: window.since,
    untilExclusive: window.until,
    profileLinksTaps: value,
    monthlyOverviewRow: writeResult.row,
    monthlyOverviewColumn: writeResult.column
  };

  console.log(JSON.stringify(result, null, 2));
  return Object.assign({}, result, writeResult);
}

function IG_PROFILE_TAPS_config_() {
  const props = PropertiesService.getScriptProperties();
  const accessToken = String(props.getProperty(IG_PROFILE_TAPS.TOKEN_PROP) || '').trim();

  if (!accessToken) {
    throw new Error('Missing or empty Script Property: ' + IG_PROFILE_TAPS.TOKEN_PROP);
  }

  return {
    accessToken,
    graphVersion: String(
      props.getProperty('META_GRAPH_VERSION') ||
      props.getProperty('GRAPH_API_VERSION') ||
      'v26.0'
    ).trim()
  };
}

function IG_PROFILE_TAPS_connectedAccount_(cfg) {
  const fields = 'id,name,instagram_business_account{id,username}';
  const url = IG_PROFILE_TAPS.BASE_URL + '/' + cfg.graphVersion +
    '/me?fields=' + encodeURIComponent(fields) +
    '&access_token=' + encodeURIComponent(cfg.accessToken);
  const json = IG_PROFILE_TAPS_fetchJson_(url);
  const ig = json.instagram_business_account;

  if (!ig || !ig.id) {
    throw new Error('No connected Instagram Business Account returned for the current Page token.');
  }

  return { id: String(ig.id), username: ig.username || '' };
}

function IG_PROFILE_TAPS_fetch_(cfg, instagramId, since, until) {
  const params = {
    metric: 'profile_links_taps',
    period: 'day',
    metric_type: 'total_value',
    since,
    until,
    access_token: cfg.accessToken
  };
  const query = Object.keys(params)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');
  const url = IG_PROFILE_TAPS.BASE_URL + '/' + cfg.graphVersion + '/' +
    encodeURIComponent(instagramId) + '/insights?' + query;
  const json = IG_PROFILE_TAPS_fetchJson_(url);
  const metric = (json.data || []).find(item => item.name === 'profile_links_taps');

  if (!metric) {
    throw new Error('profile_links_taps was not returned by Instagram User Insights.');
  }

  return metric;
}

function IG_PROFILE_TAPS_fetchJson_(url) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error('Meta API HTTP ' + status + ': ' + text.slice(0, 1500));
  }

  const json = text ? JSON.parse(text) : {};
  if (json.error) {
    throw new Error('Meta API error: ' + JSON.stringify(json.error));
  }
  return json;
}

function IG_PROFILE_TAPS_currentMonthWindow_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Africa/Cairo';
  const now = new Date();
  const year = Number(Utilities.formatDate(now, tz, 'yyyy'));
  const month = Number(Utilities.formatDate(now, tz, 'M'));
  const day = Number(Utilities.formatDate(now, tz, 'd'));
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    since: Utilities.formatString('%04d-%02d-01', year, month),
    until: Utilities.formatDate(new Date(year, month - 1, day + 1, 12), tz, 'yyyy-MM-dd'),
    monthLabel: monthNames[month - 1],
    periodKey: Utilities.formatString('%04d-%02d', year, month)
  };
}

function IG_PROFILE_TAPS_writeOverview_(value, monthLabel, periodKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(IG_PROFILE_TAPS.MONTHLY_SHEET);
  if (!sheet) throw new Error('Missing sheet: ' + IG_PROFILE_TAPS.MONTHLY_SHEET);

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(item => String(item || '').trim());
  let targetColumn = headers.indexOf(IG_PROFILE_TAPS.HEADER_NAME) + 1;

  if (!targetColumn) {
    targetColumn = lastColumn + 1;
    sheet.getRange(1, targetColumn).setValue(IG_PROFILE_TAPS.HEADER_NAME);
  }

  const lastRow = sheet.getLastRow();
  const rows = sheet.getRange(
    2,
    1,
    Math.max(lastRow - 1, 1),
    Math.max(sheet.getLastColumn(), 2)
  ).getValues();
  let targetRow = null;

  for (let i = 0; i < rows.length; i++) {
    const month = String(rows[i][0] || '').trim().toLowerCase();
    const platform = String(rows[i][1] || '').trim().toLowerCase();
    if (
      month === monthLabel.toLowerCase() &&
      platform === IG_PROFILE_TAPS.PLATFORM_NAME.toLowerCase()
    ) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    throw new Error(
      'Could not find Monthly Overview row for ' + monthLabel +
      ' / ' + IG_PROFILE_TAPS.PLATFORM_NAME
    );
  }

  sheet.getRange(targetRow, targetColumn).setValue(value);

  const noteCell = sheet.getRange(targetRow, 21); // U = Notes
  const existingNote = String(noteCell.getValue() || '').trim();
  const marker = 'Profile Link Taps=' + value + ' via profile_links_taps';
  const cleaned = existingNote
    .replace(/\s*\|\s*Profile Link Taps=\d+(?:\.\d+)? via profile_links_taps/g, '')
    .trim();
  noteCell.setValue((cleaned ? cleaned + ' | ' : '') + marker);

  SpreadsheetApp.flush();
  return {
    row: targetRow,
    column: targetColumn,
    month: monthLabel,
    periodKey
  };
}

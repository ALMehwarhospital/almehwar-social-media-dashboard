/**
 * Instagram Profile Link Taps sync.
 * Uses Script Property: META_PAGE_TOKEN
 * Canonical rule: profile_links_taps stays separate from legacy Link Clicks.
 */
const IG_PROFILE_TAPS = {
  BASE_URL: 'https://graph.facebook.com',
  TOKEN_PROP: 'META_PAGE_TOKEN',
  MONTHLY_SHEET: 'Monthly Overview',
  PLATFORM_NAME: 'Instagram',
  HEADER_NAME: 'Profile Link Taps'
};

function syncInstagramProfileLinkTapsCurrentMonth() {
  const cfg = getInstagramProfileTapsConfig_();
  const ig = getConnectedInstagramBusinessAccount_(cfg);
  const window = getCurrentMonthDateWindow_();
  const metric = fetchInstagramProfileLinksTaps_(cfg, ig.id, window.since, window.until);

  const totalValue =
    metric && metric.total_value && metric.total_value.value !== undefined
      ? Number(metric.total_value.value)
      : null;

  if (!Number.isFinite(totalValue)) {
    throw new Error('profile_links_taps returned without a finite total_value.');
  }

  const writeResult = writeInstagramProfileLinkTapsToMonthlyOverview_(
    totalValue,
    window.monthLabel,
    window.periodKey
  );

  console.log(JSON.stringify({
    success: true,
    username: ig.username || null,
    since: window.since,
    untilExclusive: window.until,
    profileLinksTaps: totalValue,
    monthlyOverviewRow: writeResult.row,
    monthlyOverviewColumn: writeResult.column
  }, null, 2));

  return { success: true, profileLinksTaps: totalValue, ...writeResult };
}

function testInstagramProfileLinksTapsAccess() {
  const cfg = getInstagramProfileTapsConfig_();
  const ig = getConnectedInstagramBusinessAccount_(cfg);
  const window = getCurrentMonthDateWindow_();
  const metric = fetchInstagramProfileLinksTaps_(cfg, ig.id, window.since, window.until);

  console.log(JSON.stringify({
    success: true,
    username: ig.username || null,
    metricName: metric.name || null,
    totalValue:
      metric.total_value && metric.total_value.value !== undefined
        ? metric.total_value.value
        : null,
    since: window.since,
    untilExclusive: window.until
  }, null, 2));

  return { success: true, instagram: ig, metric };
}

function runInstagramProfileLinkTapsPipeline() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    console.log('Instagram Profile Link Taps pipeline skipped: another run is active.');
    return { success: false, skipped: true, reason: 'locked' };
  }

  try {
    return syncInstagramProfileLinkTapsCurrentMonth();
  } finally {
    lock.releaseLock();
  }
}

function installInstagramProfileLinkTapsTrigger() {
  const handler = 'runInstagramProfileLinkTapsPipeline';

  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handler)
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  const trigger = ScriptApp.newTrigger(handler).timeBased().everyHours(6).create();

  console.log('✅ Instagram Profile Link Taps trigger installed: every 6 hours.');
  console.log('Trigger ID: ' + trigger.getUniqueId());

  return {
    success: true,
    handler,
    cadence: 'every 6 hours',
    triggerId: trigger.getUniqueId()
  };
}

function removeInstagramProfileLinkTapsTrigger() {
  const handler = 'runInstagramProfileLinkTapsPipeline';
  let removed = 0;

  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === handler)
    .forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    });

  console.log('Removed Instagram Profile Link Taps triggers: ' + removed);
  return { success: true, removed };
}

function getInstagramProfileTapsConfig_() {
  const props = PropertiesService.getScriptProperties();

  const accessToken =
    String(props.getProperty(IG_PROFILE_TAPS.TOKEN_PROP) || '').trim();

  if (!accessToken) {
    throw new Error('Missing or empty Script Property: ' + IG_PROFILE_TAPS.TOKEN_PROP);
  }

  const graphVersion =
    String(
      props.getProperty('META_GRAPH_VERSION') ||
      props.getProperty('GRAPH_API_VERSION') ||
      'v26.0'
    ).trim();

  return { accessToken, graphVersion };
}

function getConnectedInstagramBusinessAccount_(cfg) {
  const fields = 'id,name,instagram_business_account{id,username}';

  const url =
    IG_PROFILE_TAPS.BASE_URL +
    '/' + cfg.graphVersion +
    '/me?fields=' + encodeURIComponent(fields) +
    '&access_token=' + encodeURIComponent(cfg.accessToken);

  const json = metaInstagramFetch_(url);
  const ig = json.instagram_business_account;

  if (!ig || !ig.id) {
    throw new Error('No connected Instagram Business Account returned for the current Page token.');
  }

  return { id: String(ig.id), username: ig.username || '' };
}

function fetchInstagramProfileLinksTaps_(cfg, instagramId, since, until) {
  const params = [
    'metric=' + encodeURIComponent('profile_links_taps'),
    'period=' + encodeURIComponent('day'),
    'metric_type=' + encodeURIComponent('total_value'),
    'since=' + encodeURIComponent(since),
    'until=' + encodeURIComponent(until),
    'access_token=' + encodeURIComponent(cfg.accessToken)
  ];

  const url =
    IG_PROFILE_TAPS.BASE_URL +
    '/' + cfg.graphVersion +
    '/' + encodeURIComponent(instagramId) +
    '/insights?' + params.join('&');

  const json = metaInstagramFetch_(url);
  const metric = (json.data || []).find(item => item.name === 'profile_links_taps');

  if (!metric) {
    throw new Error('profile_links_taps was not returned by Instagram User Insights.');
  }

  return metric;
}

function metaInstagramFetch_(url) {
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

function getCurrentMonthDateWindow_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const tz =
    ss.getSpreadsheetTimeZone() ||
    Session.getScriptTimeZone() ||
    'Africa/Cairo';

  const now = new Date();
  const year = Number(Utilities.formatDate(now, tz, 'yyyy'));
  const month = Number(Utilities.formatDate(now, tz, 'M'));
  const day = Number(Utilities.formatDate(now, tz, 'd'));

  const since = Utilities.formatString('%04d-%02d-01', year, month);

  const tomorrow = new Date(year, month - 1, day + 1, 12, 0, 0);

  const until = Utilities.formatDate(tomorrow, tz, 'yyyy-MM-dd');

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  return {
    since,
    until,
    monthLabel: monthNames[month - 1],
    periodKey: Utilities.formatString('%04d-%02d', year, month)
  };
}

function writeInstagramProfileLinkTapsToMonthlyOverview_(value, monthLabel, periodKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(IG_PROFILE_TAPS.MONTHLY_SHEET);

  if (!sheet) {
    throw new Error('Missing sheet: ' + IG_PROFILE_TAPS.MONTHLY_SHEET);
  }

  const headerRow = 1;
  const lastColumn = Math.max(sheet.getLastColumn(), 1);

  const headers = sheet
    .getRange(headerRow, 1, 1, lastColumn)
    .getValues()[0]
    .map(value => String(value || '').trim());

  let targetColumn = headers.indexOf(IG_PROFILE_TAPS.HEADER_NAME) + 1;

  if (!targetColumn) {
    targetColumn = lastColumn + 1;
    sheet.getRange(headerRow, targetColumn).setValue(IG_PROFILE_TAPS.HEADER_NAME);
  }

  const lastRow = sheet.getLastRow();

  const rows = sheet
    .getRange(2, 1, Math.max(lastRow - 1, 1), Math.max(sheet.getLastColumn(), 2))
    .getValues();

  let targetRow = null;

  for (let i = 0; i < rows.length; i++) {
    const month = String(rows[i][0] || '').trim();
    const platform = String(rows[i][1] || '').trim();

    if (
      month.toLowerCase() === monthLabel.toLowerCase() &&
      platform.toLowerCase() === IG_PROFILE_TAPS.PLATFORM_NAME.toLowerCase()
    ) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    throw new Error(
      'Could not find Monthly Overview row for ' +
      monthLabel +
      ' / ' +
      IG_PROFILE_TAPS.PLATFORM_NAME
    );
  }

  sheet.getRange(targetRow, targetColumn).setValue(value);

  // U = Notes in current Monthly Overview schema.
  const noteCell = sheet.getRange(targetRow, 21);
  const existingNote = String(noteCell.getValue() || '').trim();

  const marker = 'Profile Link Taps=' + value + ' via profile_links_taps';

  const cleaned = existingNote
    .replace(
      /\s*\|\s*Profile Link Taps=\d+(?:\.\d+)? via profile_links_taps/g,
      ''
    )
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

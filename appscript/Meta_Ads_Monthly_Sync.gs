/**
 * AlMehwar — read-only Meta Ads Insights to a private Sheet tab.
 * Configure Script Property META_ADS_USER_TOKEN. The hospital ad account is set below.
 * The token must belong to a user/system user with ads_read on that account.
 * Never publish this tab as a static GitHub Pages JSON asset.
 */
const MEHWAR_ADS = {
  sheetId: '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8',
  sheetName: 'Meta Ads Monthly Raw',
  adAccountId: '236301107947197',
  graphVersion: 'v24.0',
  timezone: 'Africa/Cairo',
  headers: [
    'Month', 'Campaign ID', 'Campaign Name', 'Objective', 'Account ID',
    'Currency', 'Spend', 'Impressions', 'Reach', 'Clicks', 'Link Clicks',
    'Messaging Conversations Started', 'New Messaging Contacts',
    'Leads', 'Results Detail JSON', 'Source Updated At'
  ]
};

function MEHWAR_ADS_TEST_ACCESS() {
  const cfg = MEHWAR_ADS_config_();
  const account = MEHWAR_ADS_get_(
    'act_' + cfg.accountId,
    { fields: 'id,name,account_status,currency' }, cfg.token
  );
  const sample = MEHWAR_ADS_get_(
    'act_' + cfg.accountId + '/insights',
    { fields: 'account_id,spend,impressions', level: 'account', date_preset: 'yesterday', limit: '1' }, cfg.token
  );
  const result = {
    accountId: account.id,
    accountName: account.name,
    currency: account.currency,
    access: 'Ads Insights read succeeded',
    hasYesterdayInsights: Boolean(sample.data && sample.data.length)
  };
  console.log(JSON.stringify(result)); // Never log an access token or raw lead records.
  return result;
}

function MEHWAR_ADS_SYNC_MONTHLY() {
  const cfg = MEHWAR_ADS_config_();
  const account = MEHWAR_ADS_get_('act_' + cfg.accountId, { fields: 'id,currency' }, cfg.token);
  const month = Utilities.formatDate(new Date(), MEHWAR_ADS.timezone, 'yyyy-MM');
  const results = MEHWAR_ADS_fetchMonth_(month, cfg, account.currency);
  MEHWAR_ADS_writeMonth_(month, results);
  const outcome = { month: month, campaigns: results.length, currency: account.currency };
  console.log(JSON.stringify(outcome));
  return outcome;
}

function MEHWAR_ADS_SYNC_HISTORY() {
  // June–September 2026 plus the current month; each month remains separately auditable.
  const cfg = MEHWAR_ADS_config_();
  const account = MEHWAR_ADS_get_('act_' + cfg.accountId, { fields: 'id,currency' }, cfg.token);
  const today = Utilities.formatDate(new Date(), MEHWAR_ADS.timezone, 'yyyy-MM');
  const months = ['2026-06', '2026-07', '2026-08', '2026-09', today]
    .filter(function(month, index, all) { return all.indexOf(month) === index && month <= today; });
  return months.map(function(month) {
    const rows = MEHWAR_ADS_fetchMonth_(month, cfg, account.currency);
    MEHWAR_ADS_writeMonth_(month, rows);
    return { month: month, campaigns: rows.length };
  });
}

function MEHWAR_ADS_INSTALL_DAILY_TRIGGER() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'MEHWAR_ADS_SYNC_MONTHLY') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('MEHWAR_ADS_SYNC_MONTHLY').timeBased().everyDays(1).atHour(8).create();
}

function MEHWAR_ADS_fetchMonth_(month, cfg, currency) {
  const start = month + '-01';
  const end = Utilities.formatDate(
    new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    MEHWAR_ADS.timezone, 'yyyy-MM-dd'
  );
  const today = Utilities.formatDate(new Date(), MEHWAR_ADS.timezone, 'yyyy-MM-dd');
  const params = {
    fields: 'account_id,campaign_id,campaign_name,objective,spend,impressions,reach,clicks,inline_link_clicks,actions',
    level: 'campaign',
    time_range: JSON.stringify({ since: start, until: end < today ? end : today }),
    action_report_time: 'conversion',
    limit: '200'
  };
  let url = MEHWAR_ADS_url_('act_' + cfg.accountId + '/insights', params, cfg.token);
  const rows = [];
  let pages = 0;
  while (url) {
    if (++pages > 100) throw new Error('Meta Ads pagination exceeded safety limit.');
    const response = MEHWAR_ADS_request_(url);
    (response.data || []).forEach(function(item) {
      const actions = item.actions || [];
      const at = function(type) {
        const found = actions.find(function(a) { return a.action_type === type; });
        return found ? Number(found.value) : null;
      };
      const messageStarted = at('onsite_conversion.messaging_conversation_started_7d');
      const newContacts = at('onsite_conversion.messaging_first_reply');
      const leads = at('lead');
      rows.push([
        month, item.campaign_id || '', item.campaign_name || '', item.objective || '',
        item.account_id || cfg.accountId, currency || '',
        MEHWAR_ADS_number_(item.spend), MEHWAR_ADS_number_(item.impressions),
        MEHWAR_ADS_number_(item.reach), MEHWAR_ADS_number_(item.clicks),
        MEHWAR_ADS_number_(item.inline_link_clicks), messageStarted, newContacts, leads,
        JSON.stringify(actions), new Date().toISOString()
      ]);
    });
    url = response.paging && response.paging.next || null;
  }
  return rows;
}

function MEHWAR_ADS_writeMonth_(month, newRows) {
  const sheet = MEHWAR_ADS_sheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Replace only this month's results, preserving the other months and headers.
    const last = sheet.getLastRow();
    for (let row = last; row >= 2; row--) {
      if (String(sheet.getRange(row, 1).getValue()) === month) sheet.deleteRow(row);
    }
    if (newRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, MEHWAR_ADS.headers.length).setValues(newRows);
  } finally { lock.releaseLock(); }
}

function MEHWAR_ADS_sheet_() {
  const book = SpreadsheetApp.openById(MEHWAR_ADS.sheetId);
  let sheet = book.getSheetByName(MEHWAR_ADS.sheetName);
  if (!sheet) sheet = book.insertSheet(MEHWAR_ADS.sheetName);
  sheet.getRange(1, 1, 1, MEHWAR_ADS.headers.length).setValues([MEHWAR_ADS.headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function MEHWAR_ADS_config_() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('META_ADS_USER_TOKEN');
  const accountId = MEHWAR_ADS.adAccountId;
  if (!token || !/^\d+$/.test(accountId)) throw new Error('Set META_ADS_USER_TOKEN in Script Properties.');
  return { token: token, accountId: accountId };
}

function MEHWAR_ADS_get_(path, params, token) {
  return MEHWAR_ADS_request_(MEHWAR_ADS_url_(path, params, token));
}

function MEHWAR_ADS_url_(path, params, token) {
  const query = Object.keys(params).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
  // The token stays in Apps Script Properties; never print the constructed URL.
  return 'https://graph.facebook.com/' + MEHWAR_ADS.graphVersion + '/' + path + '?' + query + '&access_token=' + encodeURIComponent(token);
}

function MEHWAR_ADS_request_(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  if (response.getResponseCode() >= 400 || data.error) {
    const problem = data.error || {};
    throw new Error('Meta Ads request failed: HTTP ' + response.getResponseCode() + ', code ' + (problem.code || 'unknown') + ', ' + (problem.message || 'check account access and ads_read'));
  }
  return data;
}

function MEHWAR_ADS_number_(value) {
  const n = Number(value);
  return value === null || value === undefined || value === '' || !isFinite(n) ? null : n;
}

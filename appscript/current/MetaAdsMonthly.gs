/**
 * Meta Ads history and daily refresh for the existing Meta Ads Monthly Raw tab.
 * Requires Script Property META_ADS_USER_TOKEN with ads_read for account 236301107947197.
 * Run MEHWAR_ADS_BACKFILL_HISTORY once, then MEHWAR_ADS_INSTALL_DAILY once.
 * Never put the token or raw tab in the public dashboard repository as data.
 */
var MEHWAR_ADS_HISTORY_CONFIG = {
  spreadsheetId: '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8',
  sheetName: 'Meta Ads Monthly Raw',
  account: 'act_236301107947197',
  version: 'v26.0',
  timezone: 'Africa/Cairo',
  firstMonth: '2026-06',
  columns: [
    'Month', 'Date Start', 'Date Stop', 'Account ID', 'Campaign ID',
    'Campaign Name', 'Objective', 'Spend', 'Impressions', 'Reach',
    'Clicks', 'Link Clicks', 'Actions JSON', 'Synced At'
  ]
};

function MEHWAR_ADS_BACKFILL_HISTORY() {
  var cfg = MEHWAR_ADS_HISTORY_CONFIG;
  var today = Utilities.formatDate(new Date(), cfg.timezone, 'yyyy-MM-dd');
  var lastMonth = today.slice(0, 7);
  var year = Number(cfg.firstMonth.slice(0, 4));
  var month = Number(cfg.firstMonth.slice(5, 7));
  var results = [];
  while (year + '-' + ('0' + month).slice(-2) <= lastMonth) {
    var key = year + '-' + ('0' + month).slice(-2);
    results.push(MEHWAR_ADS_HISTORY_sync_(key, today));
    month++;
    if (month === 13) { year++; month = 1; }
  }
  MEHWAR_ADS_SYNC_CREATIVE_LINKS();
  Logger.log(JSON.stringify(results));
  return results;
}

function MEHWAR_ADS_SYNC_CURRENT_MONTH() {
  var cfg = MEHWAR_ADS_HISTORY_CONFIG;
  var today = Utilities.formatDate(new Date(), cfg.timezone, 'yyyy-MM-dd');
  var result = MEHWAR_ADS_HISTORY_sync_(today.slice(0, 7), today);
  MEHWAR_ADS_SYNC_CREATIVE_LINKS();
  Logger.log(JSON.stringify(result));
  return result;
}

/** Refresh the ad-to-post mapping in a private tab; run once to populate it. */
function MEHWAR_ADS_SYNC_CREATIVE_LINKS() {
  var cfg = MEHWAR_ADS_HISTORY_CONFIG;
  var token = PropertiesService.getScriptProperties().getProperty('META_ADS_USER_TOKEN');
  if (!token) throw new Error('Script Property META_ADS_USER_TOKEN is missing.');
  var fields = 'id,name,campaign_id,effective_status,creative{id,effective_object_story_id,object_story_id,effective_instagram_media_id,instagram_permalink_url}';
  var url = 'https://graph.facebook.com/' + cfg.version + '/' + cfg.account +
    '/ads?fields=' + encodeURIComponent(fields) + '&limit=200';
  var rows = [];
  var pages = 0;
  while (url) {
    if (++pages > 100) throw new Error('Meta Ads creative pagination limit reached.');
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
    });
    var data = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200 || data.error) {
      var problem = data.error || {};
      throw new Error('Meta Ads creatives: HTTP ' + response.getResponseCode() +
        ', code ' + (problem.code || '?') + ', ' + (problem.message || 'request failed'));
    }
    (data.data || []).forEach(function(ad) {
      if (!ad.campaign_id || !ad.id) return;
      var creative = ad.creative || {};
      rows.push([
        String(ad.campaign_id), String(ad.id), ad.name || '', ad.effective_status || '',
        String(creative.id || ''),
        String(creative.effective_object_story_id || creative.object_story_id || ''),
        String(creative.effective_instagram_media_id || ''),
        String(creative.instagram_permalink_url || '')
      ]);
    });
    url = data.paging && data.paging.next || null;
  }
  var book = SpreadsheetApp.openById(cfg.spreadsheetId);
  var sheet = book.getSheetByName('Meta Ads Creative Links') ||
    book.insertSheet('Meta Ads Creative Links');
  var headers = [
    'Campaign ID', 'Ad ID', 'Ad Name', 'Status', 'Creative ID',
    'Facebook Post ID', 'Instagram Media ID', 'Instagram URL'
  ];
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var previousRows = sheet.getLastRow();
    if (previousRows > 0) sheet.getRange(1, 1, previousRows, 8).clearContent();
    sheet.getRange(1, 1, 1, 8).setValues([headers]);
    if (rows.length) sheet.getRange(2, 1, rows.length, 8).setValues(rows);
    sheet.setFrozenRows(1);
  } finally {
    lock.releaseLock();
  }
  Logger.log('Meta Ads creative links: ' + rows.length + ' ads.');
  return { ads: rows.length, withFacebookPost: rows.filter(function(r) { return r[5]; }).length,
    withInstagramUrl: rows.filter(function(r) { return r[7]; }).length };
}

function MEHWAR_ADS_INSTALL_DAILY() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'MEHWAR_ADS_SYNC_CURRENT_MONTH') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('MEHWAR_ADS_SYNC_CURRENT_MONTH')
    .timeBased().everyDays(1).atHour(8).create();
  Logger.log('Daily Meta Ads refresh installed. Check project timezone: Africa/Cairo.');
}

function MEHWAR_ADS_HISTORY_sync_(key, today) {
  var cfg = MEHWAR_ADS_HISTORY_CONFIG;
  var start = key + '-01';
  var next = new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0));
  var end = Utilities.formatDate(next, 'UTC', 'yyyy-MM-dd');
  if (end > today) end = today;
  var token = PropertiesService.getScriptProperties().getProperty('META_ADS_USER_TOKEN');
  if (!token) throw new Error('Script Property META_ADS_USER_TOKEN is missing.');
  var fields = 'account_id,campaign_id,campaign_name,objective,spend,impressions,reach,clicks,inline_link_clicks,actions';
  var query = {
    fields: fields,
    level: 'campaign',
    time_range: JSON.stringify({ since: start, until: end }),
    action_report_time: 'conversion',
    limit: '200'
  };
  var encoded = Object.keys(query).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
  }).join('&');
  var url = 'https://graph.facebook.com/' + cfg.version + '/' + cfg.account + '/insights?' + encoded;
  var rows = [];
  var pages = 0;
  var synced = Utilities.formatDate(new Date(), cfg.timezone, 'yyyy-MM-dd HH:mm:ss');
  while (url) {
    if (++pages > 100) throw new Error('Meta Ads pagination limit reached.');
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    var payload = JSON.parse(response.getContentText());
    if (response.getResponseCode() !== 200 || payload.error) {
      var problem = payload.error || {};
      throw new Error('Meta Ads ' + key + ': HTTP ' + response.getResponseCode() +
        ', code ' + (problem.code || '?') + ', ' + (problem.message || 'request failed'));
    }
    (payload.data || []).forEach(function(item) {
      rows.push([
        key, start, end, item.account_id || cfg.account.slice(4),
        item.campaign_id || '', item.campaign_name || '', item.objective || '',
        Number(item.spend || 0), Number(item.impressions || 0),
        Number(item.reach || 0), Number(item.clicks || 0),
        Number(item.inline_link_clicks || 0), JSON.stringify(item.actions || []), synced
      ]);
    });
    url = payload.paging && payload.paging.next || null;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var book = SpreadsheetApp.openById(cfg.spreadsheetId);
    var sheet = book.getSheetByName(cfg.sheetName);
    if (!sheet) throw new Error('Missing sheet: ' + cfg.sheetName);
    var last = sheet.getLastRow();
    if (last < 1) throw new Error('Raw sheet has no header.');
    var headers = sheet.getRange(1, 1, 1, 14).getDisplayValues()[0];
    if (headers.join('|') !== cfg.columns.join('|')) {
      throw new Error('Raw sheet columns changed. Stopped before overwriting data.');
    }
    var existing = last > 1 ? sheet.getRange(2, 1, last - 1, 14).getValues() : [];
    var retained = existing.filter(function(row) { return String(row[0]) !== key; });
    var combined = retained.concat(rows).sort(function(a, b) {
      return String(a[0]).localeCompare(String(b[0])) || String(a[4]).localeCompare(String(b[4]));
    });
    if (last > 1) sheet.getRange(2, 1, last - 1, 14).clearContent();
    if (combined.length) sheet.getRange(2, 1, combined.length, 14).setValues(combined);
  } finally {
    lock.releaseLock();
  }
  return { month: key, period: start + ' to ' + end, campaigns: rows.length };
}
// GitHub source sync validation.

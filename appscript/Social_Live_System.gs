/**
 * ALMEHWAR — SOCIAL LIVE SYSTEM V3
 * Add this as a NEW Apps Script file. It does not replace Website/Search Console code.
 * Reuses existing Meta / TikTok / YouTube functions already in the project.
 */

const SOCIAL_CFG = {
  tz: 'Africa/Cairo',
  overview: 'Monthly Overview',
  fbRaw: 'Facebook Raw',
  igRaw: 'Instagram Raw',
  ytRaw: 'YouTube Raw',
  ttRaw: 'TikTok Video Snapshots',
  content: 'Content Performance',
  video: 'Video Analysis',
  quickHours: 6,
  deepDays: 35
};

function SOCIAL_SETUP() {
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone(SOCIAL_CFG.tz);
  SOCIAL_ensureCurrentMonthRows_();
  SOCIAL_installTriggers_();
  console.log('✅ SOCIAL_SETUP complete. Run SOCIAL_RUN_QUICK once now.');
}

/**
 * Runs safely every day, but only finalizes months older than the current one.
 * It refreshes the previous calendar month, freezes its Overview row, and
 * materializes Content Performance + Video Analysis so rollover cannot hide it.
 */
function SOCIAL_MONTH_ROLLOVER() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const now = new Date();
    const runKey = 'SOCIAL_ROLLOVER_DONE_' + SOCIAL_monthKey_(now);
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(runKey) === 'true') {
      console.log('ℹ️ Monthly rollover already completed for ' + SOCIAL_monthKey_(now));
      return;
    }
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), 1);
    const monthKey = SOCIAL_monthKey_(previousStart);

    SOCIAL_safe_('Previous-month Facebook refresh', () => {
      if (typeof pullFacebookRawForPeriod === 'function') {
        const until = new Date(previousEnd); until.setDate(until.getDate() + 1);
        pullFacebookRawForPeriod(previousStart, until);
      }
    });
    SOCIAL_safe_('Previous-month Instagram refresh', () => {
      if (typeof pullInstagramRawForPeriod === 'function') {
        const until = new Date(previousEnd); until.setDate(until.getDate() + 1);
        pullInstagramRawForPeriod(previousStart, until);
      }
    });
    SOCIAL_safe_('Previous-month Reel matching', () => {
      if (typeof matchInstagramReelsWithFacebook === 'function') matchInstagramReelsWithFacebook();
    });
    SOCIAL_safe_('Previous-month YouTube refresh', () => {
      if (typeof YT_V2_pullPeriod_ === 'function') {
        YT_V2_pullPeriod_(SOCIAL_ymd_(previousStart), SOCIAL_ymd_(previousEnd), monthKey);
      }
    });
    SOCIAL_safe_('YouTube Reach / Impressions sync', SOCIAL_syncYouTubeReach_);

    SOCIAL_finalizeOverviewMonth_(monthKey, previousStart, previousEnd);
    const archive = SOCIAL_archiveClosedMonth_(monthKey);
    SOCIAL_markOverviewMonthClosed_(monthKey);
    SOCIAL_clearDashboardCache_();
    props.setProperty(runKey, 'true');
    console.log(JSON.stringify({success:true, month:monthKey, archive:archive}));
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_RUN_QUICK() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    SOCIAL_ensureCurrentMonthRows_();

    SOCIAL_safe_('Meta recent sync', () => {
      if (typeof pullMetaRawData === 'function') pullMetaRawData();
    });

    SOCIAL_safe_('TikTok snapshot sync', () => {
      if (typeof TIKTOK_importVideoSnapshot === 'function') TIKTOK_importVideoSnapshot();
    });

    SOCIAL_safe_('YouTube current-month sync', SOCIAL_syncYouTubeMonth_);

    // Refresh official YouTube Reporting API reach data after A:S is updated.
    // This fills YouTube Raw T:U, which powers YouTube Impressions + ER.
    SOCIAL_safe_('YouTube Reach / Impressions sync', SOCIAL_syncYouTubeReach_);

    SOCIAL_safe_('Monthly Overview update', SOCIAL_updateOverview_);

    console.log('✅ SOCIAL_RUN_QUICK complete.');
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_RUN_WEEKLY_DEEP() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const start = new Date();
    start.setDate(start.getDate() - SOCIAL_CFG.deepDays);

    SOCIAL_safe_('Facebook deep refresh', () => {
      if (typeof pullFacebookRawForPeriod === 'function') pullFacebookRawForPeriod(start, end);
    });
    SOCIAL_safe_('Instagram deep refresh', () => {
      if (typeof pullInstagramRawForPeriod === 'function') pullInstagramRawForPeriod(start, end);
    });
    SOCIAL_safe_('FB/IG Reel matching', () => {
      if (typeof matchInstagramReelsWithFacebook === 'function') matchInstagramReelsWithFacebook();
    });

    SOCIAL_safe_('YouTube Reach / Impressions sync', SOCIAL_syncYouTubeReach_);
    SOCIAL_safe_('Monthly Overview update', SOCIAL_updateOverview_);

    console.log('✅ SOCIAL_RUN_WEEKLY_DEEP complete.');
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_installTriggers_() {
  ['SOCIAL_RUN_QUICK', 'SOCIAL_RUN_WEEKLY_DEEP', 'SOCIAL_MONTH_ROLLOVER'].forEach(name => {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === name) ScriptApp.deleteTrigger(t);
    });
  });

  ScriptApp.newTrigger('SOCIAL_RUN_QUICK')
    .timeBased()
    .everyHours(SOCIAL_CFG.quickHours)
    .create();

  ScriptApp.newTrigger('SOCIAL_RUN_WEEKLY_DEEP')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(3)
    .create();

  ScriptApp.newTrigger('SOCIAL_MONTH_ROLLOVER')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();
}

function SOCIAL_finalizeOverviewMonth_(monthKey, start, end) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SOCIAL_CFG.overview);
  if (!sh) throw new Error('Monthly Overview not found');
  const data = sh.getDataRange().getValues();
  const label = SOCIAL_monthLabel_(start);
  const results = {
    Facebook: SOCIAL_safeReturn_('Facebook final ' + monthKey, () => SOCIAL_facebookOverview_(start, end)),
    Instagram: SOCIAL_safeReturn_('Instagram final ' + monthKey, () => SOCIAL_instagramOverview_(start, end)),
    YouTube: SOCIAL_safeReturn_('YouTube final ' + monthKey, () => SOCIAL_youtubeOverview_(start, end)),
    TikTok: SOCIAL_safeReturn_('TikTok final ' + monthKey, () => SOCIAL_tiktokOverview_(start, end))
  };

  ['Facebook','Instagram','YouTube','TikTok'].forEach(platform => {
    const row = SOCIAL_findOverviewRow_(data, monthKey, label, platform);
    const result = results[platform];
    if (!row || !result) return;
    const old = data[row - 1];
    const keep = (value, index) => value === '' || value === null || value === undefined ? old[index] : value;
    const reach = platform === 'Facebook' ? old[7] : keep(result.reach, 7);
    const tracked = keep(result.trackedInteractions, 24);
    const er = platform === 'Facebook'
      ? (SOCIAL_num_(reach) !== '' && Number(reach) > 0 && SOCIAL_num_(tracked) !== '' ? Number(tracked) / Number(reach) : old[15])
      : keep(result.er, 15);

    sh.getRange(row, 6, 1, 14).setValues([[
      keep(result.posts,5), keep(result.videos,6), reach, keep(result.impressions,8), keep(result.views,9),
      keep(result.profileVisits,10), keep(result.likes,11), keep(result.comments,12), keep(result.shares,13),
      keep(result.interactions,14), er, keep(result.linkClicks,16), keep(result.messages,17), keep(result.leads,18)
    ]]);
    if (sh.getMaxColumns() >= 25) {
      sh.getRange(row,23,1,3).setValues([[
        keep(result.uniqueMediaViewers28d,22),
        keep(result.contentUniqueViewers,23),
        tracked
      ]]);
    }
    sh.getRange(row,16).setNumberFormat('0.00%');
  });
}

function SOCIAL_archiveClosedMonth_(monthKey) {
  if (typeof SOCIAL_DASH_API_currentContent_ !== 'function' || typeof SOCIAL_DASH_API_currentVideo_ !== 'function') {
    throw new Error('Install the updated Social_Dashboard_Live_API_CLEAN file before running rollover.');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const creative = typeof SOCIAL_DASH_API_creativeSheet_ === 'function' ? SOCIAL_DASH_API_creativeSheet_(ss) : [];
  const content = SOCIAL_DASH_API_currentContent_(ss, monthKey, creative).map(item => { item.live = false; return item; });
  const videos = SOCIAL_DASH_API_currentVideo_(content).map(item => { item.live = false; return item; });
  return {
    contentAdded: SOCIAL_appendArchivedContent_(ss, content),
    videosAdded: SOCIAL_appendArchivedVideos_(ss, videos)
  };
}

function SOCIAL_appendArchivedContent_(ss, items) {
  const sh = ss.getSheetByName(SOCIAL_CFG.content);
  if (!sh) throw new Error('Content Performance not found');
  const existing = {};
  sh.getDataRange().getDisplayValues().slice(1).forEach(row => {
    const url = (String(row[20] || '').match(/https?:\/\/\S+/) || [''])[0];
    existing[SOCIAL_archiveKey_(row[1], url, row[0], row[2])] = true;
  });
  const fresh = items.filter(item => !existing[SOCIAL_archiveKey_(item.platform,item.url,item.date,item.name)]);
  if (!fresh.length) return 0;
  const rows = fresh.map(item => [
    item.date,item.platform,item.name,item.pillar || 'Other',item.format || 'Other',item.spendType || 'Total / Unsplit',
    SOCIAL_sheetValue_(item.reach),SOCIAL_sheetValue_(item.views),SOCIAL_sheetValue_(item.impressions),SOCIAL_sheetValue_(item.interactions),
    item.engagementDenominator || '',SOCIAL_sheetValue_(item.engagementRate),SOCIAL_sheetValue_(item.profileVisits),SOCIAL_sheetValue_(item.linkClicks),
    SOCIAL_sheetValue_(item.followersGained),SOCIAL_sheetValue_(item.shares),SOCIAL_sheetValue_(item.saves),SOCIAL_sheetValue_(item.leads),
    SOCIAL_sheetValue_(item.messages),SOCIAL_sheetValue_(item.valueRate),
    'Archived automatically from ' + (item.source || 'Raw') + (item.url ? ' | ' + item.url : '')
  ]);
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow,1,rows.length,21).setValues(rows);
  sh.getRange(startRow,12,rows.length,1).setNumberFormat('0.00%');
  sh.getRange(startRow,20,rows.length,1).setNumberFormat('0.00%');
  return rows.length;
}

function SOCIAL_appendArchivedVideos_(ss, items) {
  const sh = ss.getSheetByName(SOCIAL_CFG.video);
  if (!sh) throw new Error('Video Analysis not found');
  const existing = {};
  sh.getDataRange().getDisplayValues().slice(1).forEach(row => {
    existing[SOCIAL_archiveKey_(row[1], '', row[0], row[2])] = true;
  });
  const fresh = items.filter(item => !existing[SOCIAL_archiveKey_(item.platform,'',item.date,item.name)]);
  if (!fresh.length) return 0;
  const rows = fresh.map(item => [
    item.date,item.platform,item.name,item.pillar || 'Other',item.format || 'Reel',item.spendType || 'Total / Unsplit',
    SOCIAL_sheetValue_(item.durationSeconds),SOCIAL_sheetValue_(item.views),SOCIAL_sheetValue_(item.reach),SOCIAL_sheetValue_(item.impressions),
    SOCIAL_sheetValue_(item.interactions),item.engagementDenominator || '',SOCIAL_sheetValue_(item.engagementRate),
    SOCIAL_sheetValue_(item.avgWatchTimeSeconds),SOCIAL_sheetValue_(item.avgPercentWatched),SOCIAL_sheetValue_(item.completionRate),
    SOCIAL_sheetValue_(item.retention3s),SOCIAL_sheetValue_(item.retention25),SOCIAL_sheetValue_(item.retention50),SOCIAL_sheetValue_(item.retention75),
    SOCIAL_sheetValue_(item.shares),SOCIAL_sheetValue_(item.saves),SOCIAL_sheetValue_(item.followersGained),item.hookType || '',
    '', '', '', '', '', '', 'Archived automatically from ' + (item.source || 'Raw'), ''
  ]);
  const startRow = sh.getLastRow() + 1;
  sh.getRange(startRow,1,rows.length,32).setValues(rows);
  sh.getRange(startRow,7,rows.length,1).setNumberFormat('0.00');
  sh.getRange(startRow,8,rows.length,4).setNumberFormat('#,##0');
  sh.getRange(startRow,13,rows.length,1).setNumberFormat('0.00%');
  sh.getRange(startRow,14,rows.length,1).setNumberFormat('0.00');
  sh.getRange(startRow,15,rows.length,6).setNumberFormat('0.00%');
  sh.getRange(startRow,21,rows.length,3).setNumberFormat('#,##0');
  return rows.length;
}

function SOCIAL_markOverviewMonthClosed_(monthKey) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.overview);
  if (!sh || sh.getLastRow() < 2) return;
  const values = sh.getDataRange().getValues();
  for (let i=1; i<values.length; i++) {
    const note = String(values[i][20] || '');
    if (note.indexOf('AUTO|' + monthKey + '|') !== 0) continue;
    const parts = note.split('|');
    const oldStatus = parts[2] || '';
    const source = parts.slice(3).join('|');
    const coverage = oldStatus.indexOf('PARTIAL') >= 0 ? ' | Coverage: ' + oldStatus : '';
    sh.getRange(i+1,21).setValue('AUTO|' + monthKey + '|CLOSED MONTH|' + source + coverage);
  }
}

function SOCIAL_archiveKey_(platform, url, date, name) {
  const stable = String(url || '').trim() || (String(date || '').trim() + '|' + String(name || '').trim().toLowerCase());
  return String(platform || '').trim().toLowerCase() + '|' + stable;
}

function SOCIAL_sheetValue_(value) {
  return value === null || value === undefined || value === '' ? '' : value;
}

function SOCIAL_clearDashboardCache_() {
  CacheService.getScriptCache().removeAll([
    'social-dashboard-live-v2-all','social-dashboard-live-v2-overview','social-dashboard-live-v2-content',
    'social-dashboard-live-v2-video','social-dashboard-live-v2-creative','social-dashboard-live-v2-inboundcalls'
  ]);
}

function SOCIAL_syncYouTubeMonth_() {
  if (typeof YT_V2_pullPeriod_ !== 'function') return;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  YT_V2_pullPeriod_(SOCIAL_ymd_(start), SOCIAL_ymd_(now), SOCIAL_monthKey_(now));
}

function SOCIAL_syncYouTubeReach_() {
  // Preferred integrated YouTube_V2 function.
  if (typeof YT_V2_syncReachReporting === 'function') {
    return YT_V2_syncReachReporting();
  }

  // Compatibility with the temporary standalone helper used during setup.
  if (typeof syncYouTubeReachReporting === 'function') {
    return syncYouTubeReachReporting();
  }

  console.log('ℹ️ YouTube Reach sync function not found; Impressions remain N/A until helper is installed.');
  return null;
}

function SOCIAL_ensureCurrentMonthRows_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.overview);
  if (!sh) throw new Error('Monthly Overview not found');

  const now = new Date();
  const key = SOCIAL_monthKey_(now);
  const label = SOCIAL_monthLabel_(now);
  const platforms = ['Facebook','Instagram','LinkedIn','YouTube','TikTok'];
  let data = sh.getDataRange().getValues();

  platforms.forEach(platform => {
    if (SOCIAL_findOverviewRow_(data, key, label, platform)) return;

    const row = sh.getLastRow() + 1;
    const previousEnd = SOCIAL_lastFollowerEnd_(data, platform);

    sh.getRange(row,1).setValue(label);
    sh.getRange(row,2).setValue(platform);
    if (previousEnd !== '') sh.getRange(row,3).setValue(previousEnd);

    if (platform !== 'LinkedIn') {
      sh.getRange(row,5).setFormula(`=IF(D${row}="","",D${row}-C${row})`);
      sh.getRange(row,20).setFormula(`=IF(E${row}="","",E${row}/C${row})`);
      if (platform === 'Facebook' && sh.getMaxColumns() >= 25) {
        sh.getRange(row,16).setFormula(`=IF(OR(H${row}="",Y${row}=""),"",Y${row}/H${row})`);
        sh.getRange(row,16).setNumberFormat('0.00%');
      }
      sh.getRange(row,21).setValue(`AUTO|${key}|LIVE MTD`);
    } else {
      sh.getRange(row,21).setValue(`AUTO|${key}|API Pending`);
    }

    data = sh.getDataRange().getValues();
  });
}

function SOCIAL_findOverviewRow_(data, key, label, platform) {
  for (let i=1; i<data.length; i++) {
    if (String(data[i][1] || '') !== platform) continue;
    const note = String(data[i][20] || '');
    if (note.indexOf(`AUTO|${key}|`) === 0) return i+1;
    if (String(data[i][0] || '') === label && (note === 'Auto / Live MTD' || note === 'API Pending')) return i+1;
  }
  return null;
}

function SOCIAL_lastFollowerEnd_(data, platform) {
  for (let i=data.length-1; i>=1; i--) {
    if (String(data[i][1] || '') === platform && SOCIAL_num_(data[i][3]) !== '') return Number(data[i][3]);
  }
  return '';
}

function SOCIAL_updateOverview_() {
  SOCIAL_ensureCurrentMonthRows_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SOCIAL_CFG.overview);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const key = SOCIAL_monthKey_(now);
  const label = SOCIAL_monthLabel_(now);
  const data = sh.getDataRange().getValues();

  const results = {
    Facebook: SOCIAL_safeReturn_('Facebook MTD', () => SOCIAL_facebookOverview_(start, now)),
    Instagram: SOCIAL_safeReturn_('Instagram MTD', () => SOCIAL_instagramOverview_(start, now)),
    YouTube: SOCIAL_safeReturn_('YouTube MTD', () => SOCIAL_youtubeOverview_(start, now)),
    TikTok: SOCIAL_safeReturn_('TikTok MTD', () => SOCIAL_tiktokOverview_(start, now))
  };

  ['Facebook','Instagram','YouTube','TikTok'].forEach(platform => {
    const row = SOCIAL_findOverviewRow_(data, key, label, platform);
    const r = results[platform];
    if (!row || !r) return;

    // Facebook Monthly Reach is entered manually from Meta Business Suite.
    // Keep the existing value when the API intentionally returns no comparable
    // monthly Reach metric, so an automatic sync never erases the manual number.
    const existingReach = SOCIAL_num_(data[row-1][7]);
    const reachValue = platform === 'Facebook' && r.reach === '' ? existingReach : r.reach;
    const overviewEr = platform === 'Facebook'
      ? (reachValue !== '' && Number(reachValue) > 0 && r.trackedInteractions !== ''
          ? Number(r.trackedInteractions) / Number(reachValue)
          : '')
      : r.er;

    sh.getRange(row,4).setValue(r.followers === '' ? '' : r.followers);
    sh.getRange(row,5).setFormula(`=IF(D${row}="","",D${row}-C${row})`);
    sh.getRange(row,6,1,14).setValues([[
      r.posts,r.videos,reachValue,r.impressions,r.views,r.profileVisits,
      r.likes,r.comments,r.shares,r.interactions,overviewEr,r.linkClicks,r.messages,r.leads
    ]]);
    sh.getRange(row,20).setFormula(`=IF(E${row}="","",E${row}/C${row})`);
    sh.getRange(row,21).setValue(`AUTO|${key}|${r.status}|${r.source}`);
    if (sh.getMaxColumns() >= 25) {
      sh.getRange(row,23,1,3).setValues([[
        r.uniqueMediaViewers28d === undefined ? '' : r.uniqueMediaViewers28d,
        r.contentUniqueViewers === undefined ? '' : r.contentUniqueViewers,
        r.trackedInteractions === undefined ? '' : r.trackedInteractions
      ]]);
      sh.getRange(row,23,1,3).setNumberFormat('#,##0');
      if (platform === 'Facebook') {
        // Reach is typed manually at month-end. This formula updates instantly
        // without needing another sync, then remains frozen with the closed row.
        sh.getRange(row,16).setFormula(`=IF(OR(H${row}="",Y${row}=""),"",Y${row}/H${row})`);
      }
    }
    sh.getRange(row,16).setNumberFormat('0.00%');
    sh.getRange(row,20).setNumberFormat('0.00%');
  });


}

function SOCIAL_facebookOverview_(start, now) {
  const pageId = typeof FACEBOOK_PAGE_ID !== 'undefined' ? FACEBOOK_PAGE_ID : '112261600179406';
  const content = SOCIAL_fbContentTotals_(start, now);

  return {
    followers: SOCIAL_metaFollowers_(pageId),
    ...SOCIAL_metaCounts_(SOCIAL_CFG.fbRaw, start, now, 'facebook'),
    // Monthly Reach remains manual because Meta no longer exposes a directly
    // comparable API metric. The update layer preserves the sheet value.
    reach: '',
    impressions: '',
    views: SOCIAL_fbDailySum_('page_media_view', start, now),
    profileVisits: SOCIAL_fbDailySum_('page_views_total', start, now),
    likes:content.reactions,
    comments:content.comments,
    shares:content.shares,
    interactions:content.interactions,
    trackedInteractions:content.interactions,
    contentUniqueViewers:content.uniqueViewers,
    uniqueMediaViewers28d:SOCIAL_fbUniqueMediaViewers28d_(now),
    er:'',linkClicks:'',messages:'',leads:'',
    source:'Meta Page Insights + Facebook Raw | Reach: manual MBS | Interactions: reactions + comments + shares',
    status:'LIVE MTD'
  };
}

function SOCIAL_fbContentTotals_(start, now) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.fbRaw);
  const out = {uniqueViewers:'', reactions:'', comments:'', shares:'', interactions:''};
  if (!sh || sh.getLastRow() < 2) return out;

  let uniqueViewers=0, reactions=0, comments=0, shares=0, found=false;
  sh.getDataRange().getValues().slice(1).forEach(r => {
    const d = SOCIAL_date_(r[0]);
    if (!d || d < start || d > now) return;

    const uv = SOCIAL_num_(r[7]);
    const re = SOCIAL_num_(r[8]);
    const co = SOCIAL_num_(r[9]);
    const shCount = SOCIAL_num_(r[10]);
    if (uv !== '') uniqueViewers += Number(uv);
    if (re !== '') reactions += Number(re);
    if (co !== '') comments += Number(co);
    if (shCount !== '') shares += Number(shCount);
    if (uv !== '' || re !== '' || co !== '' || shCount !== '') found = true;
  });

  if (!found) return out;
  return {
    uniqueViewers,
    reactions,
    comments,
    shares,
    interactions:reactions + comments + shares
  };
}

function SOCIAL_fbUniqueMediaViewers28d_(asOf) {
  if (typeof metaGet !== 'function') return '';
  try {
    const pageId = typeof FACEBOOK_PAGE_ID !== 'undefined' ? FACEBOOK_PAGE_ID : '112261600179406';
    const since = new Date(asOf); since.setDate(since.getDate()-30);
    const until = new Date(asOf); until.setDate(until.getDate()+1);
    const metric = 'page_total_media_view_unique';
    const r = metaGet(pageId+'/insights', {
      metric,
      period:'days_28',
      since:SOCIAL_ymd_(since),
      until:SOCIAL_ymd_(until)
    });
    const item = (r.data || []).find(x => x.name === metric);
    const values = item && item.values ? item.values : [];
    for (let i=values.length-1; i>=0; i--) {
      if (SOCIAL_num_(values[i].value) !== '') return Number(values[i].value);
    }
    return '';
  } catch(e) {
    console.log('FB Unique Media Viewers 28D: ' + e.message);
    return '';
  }
}

function SOCIAL_instagramOverview_(start, now) {
  const igId = typeof INSTAGRAM_ACCOUNT_ID !== 'undefined' ? INSTAGRAM_ACCOUNT_ID : '17841425470104627';
  const reach = SOCIAL_igMetric_('reach', start, now, false);
  const content = SOCIAL_igContentTotals_(start, now);
  const accountInteractions = SOCIAL_igMetric_('total_interactions', start, now, true);
  const interactions = accountInteractions !== '' ? accountInteractions : content.interactions;
  return {
    followers: SOCIAL_metaFollowers_(igId),
    ...SOCIAL_metaCounts_(SOCIAL_CFG.igRaw, start, now, 'instagram'),
    reach,
    impressions:'',
    views:SOCIAL_igMetric_('views', start, now, true),
    profileVisits:SOCIAL_igMetric_('profile_views', start, now, true),
    likes:content.likes,comments:content.comments,shares:content.shares,interactions,
    er:(reach !== '' && Number(reach)>0 && interactions !== '') ? Number(interactions)/Number(reach) : '',
    linkClicks:'',messages:'',leads:'',
    source:'Instagram Account Insights + Instagram Raw',
    status:'LIVE MTD'
  };
}

function SOCIAL_igContentTotals_(start, now) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.igRaw);
  const out = {likes:'', comments:'', shares:'', interactions:''};
  if (!sh || sh.getLastRow() < 2) return out;

  let likes=0, comments=0, shares=0, interactions=0, found=false, interactionFound=false;
  sh.getDataRange().getValues().slice(1).forEach(r => {
    const d = SOCIAL_date_(r[0]);
    if (!d || d < start || d > now) return;
    const li = SOCIAL_num_(r[9]);
    const co = SOCIAL_num_(r[10]);
    const shCount = SOCIAL_num_(r[11]);
    const total = SOCIAL_num_(r[14]);
    if (li !== '') likes += Number(li);
    if (co !== '') comments += Number(co);
    if (shCount !== '') shares += Number(shCount);
    if (total !== '') { interactions += Number(total); interactionFound = true; }
    if (li !== '' || co !== '' || shCount !== '') found = true;
  });

  if (!found && !interactionFound) return out;
  return {
    likes:found ? likes : '',
    comments:found ? comments : '',
    shares:found ? shares : '',
    interactions:interactionFound ? interactions : (found ? likes+comments+shares : '')
  };
}

function SOCIAL_youtubeOverview_(start, now) {
  const channel = YouTube.Channels.list('statistics',{mine:true});
  const followers = channel.items && channel.items.length ? SOCIAL_num_(channel.items[0].statistics.subscriberCount) : '';

  const report = YouTubeAnalytics.Reports.query({
    ids:'channel==MINE', startDate:SOCIAL_ymd_(start), endDate:SOCIAL_ymd_(now),
    metrics:'views,likes,comments,shares,subscribersGained,subscribersLost'
  });

  let views='',likes='',comments='',shares='',interactions='';
  if (report.rows && report.rows.length) {
    const h = report.columnHeaders.map(x=>x.name);
    const row = report.rows[0];
    const v = name => { const i=h.indexOf(name); return i>=0 ? SOCIAL_num_(row[i]) : ''; };
    views=v('views'); likes=v('likes'); comments=v('comments'); shares=v('shares');
    interactions=SOCIAL_sum_([likes,comments,shares]);
  }

  const monthKey = SOCIAL_monthKey_(start);
  const videos = SOCIAL_youtubeCount_(monthKey);
  const impressions = SOCIAL_youtubeImpressions_(monthKey);

  return {
    followers,posts:0,videos,reach:'',impressions,views,profileVisits:'',likes,comments,shares,interactions,
    er:(impressions !== '' && Number(impressions)>0 && interactions !== '') ? Number(interactions)/Number(impressions) : '',
    linkClicks:'',messages:'',leads:'',
    source:'YouTube Analytics + Data API + Reporting API | Thumbnail Impressions; Reporting API latency applies',
    status:'LIVE MTD'
  };
}


function SOCIAL_tiktokOverview_(start, now) {
  const account = SOCIAL_tiktokAccount_();
  const delta = SOCIAL_tiktokDelta_(start, now);
  const interactions = delta ? SOCIAL_sum_([delta.likes,delta.comments,delta.shares]) : '';
  return {
    followers:account && SOCIAL_num_(account.follower_count)!=='' ? Number(account.follower_count) : '',
    posts:0,videos:SOCIAL_tiktokCount_(start,now),reach:'',impressions:'',
    views:delta ? delta.views : '',profileVisits:'',likes:delta ? delta.likes : '',comments:delta ? delta.comments : '',shares:delta ? delta.shares : '',
    interactions,
    er:(delta && delta.views>0 && interactions !== '') ? Number(interactions)/Number(delta.views) : '',
    linkClicks:'',messages:'',leads:'',source:'TikTok Display API snapshot deltas',
    status:delta ? (delta.full ? 'LIVE MTD' : 'PARTIAL MTD from '+Utilities.formatDate(delta.baselineAt,SOCIAL_CFG.tz,'dd/MM')) : 'Waiting for snapshot baseline'
  };
}

function SOCIAL_metaFollowers_(id) {
  if (typeof metaGet !== 'function') return '';
  const r = metaGet(String(id),{fields:'followers_count'});
  return SOCIAL_num_(r.followers_count);
}

function SOCIAL_fbDailySum_(metric,start,now) {
  if (typeof metaGet !== 'function') return '';
  try {
    const pageId = typeof FACEBOOK_PAGE_ID !== 'undefined' ? FACEBOOK_PAGE_ID : '112261600179406';
    const until = new Date(now); until.setDate(until.getDate()+1);
    const r = metaGet(pageId+'/insights',{metric,period:'day',since:SOCIAL_ymd_(start),until:SOCIAL_ymd_(until)});
    const item=(r.data||[]).find(x=>x.name===metric);
    if (!item || !item.values) return '';
    let sum=0,found=false;
    item.values.forEach(x=>{ if (SOCIAL_num_(x.value)!=='') {sum+=Number(x.value);found=true;} });
    return found ? sum : '';
  } catch(e) { console.log(`FB ${metric}: ${e.message}`); return ''; }
}

function SOCIAL_igMetric_(metric,start,now,allowSum) {
  if (typeof metaGet !== 'function') return '';
  const igId = typeof INSTAGRAM_ACCOUNT_ID !== 'undefined' ? INSTAGRAM_ACCOUNT_ID : '17841425470104627';
  const until = new Date(now); until.setDate(until.getDate()+1);
  const since=Math.floor(start.getTime()/1000), untilTs=Math.floor(until.getTime()/1000);
  try {
    const r=metaGet(igId+'/insights',{metric,period:'day',metric_type:'total_value',since,until:untilTs});
    const item=(r.data||[]).find(x=>x.name===metric);
    if (item && item.total_value && SOCIAL_num_(item.total_value.value)!=='') return Number(item.total_value.value);
  } catch(e) { console.log(`IG total ${metric}: ${e.message}`); }
  if (!allowSum) return '';
  try {
    const r=metaGet(igId+'/insights',{metric,period:'day',since,until:untilTs});
    const item=(r.data||[]).find(x=>x.name===metric);
    if (!item || !item.values) return '';
    let sum=0,found=false;
    item.values.forEach(x=>{ if (SOCIAL_num_(x.value)!=='') {sum+=Number(x.value);found=true;} });
    return found ? sum : '';
  } catch(e) { console.log(`IG ${metric}: ${e.message}`); return ''; }
}

function SOCIAL_metaCounts_(sheetName,start,now,mode) {
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const out={posts:0,videos:0};
  if (!sh || sh.getLastRow()<2) return out;
  sh.getDataRange().getValues().slice(1).forEach(r=>{
    const d=SOCIAL_date_(r[0]); if (!d || d<start || d>now) return;
    if (mode==='facebook') String(r[2]||'')==='Reel' ? out.videos++ : out.posts++;
    if (mode==='instagram') String(r[3]||'')==='REELS' ? out.videos++ : out.posts++;
  });
  return out;
}

function SOCIAL_youtubeCount_(monthKey) {
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.ytRaw);
  if (!sh || sh.getLastRow()<2) return 0;
  const ids={};
  sh.getDataRange().getValues().slice(1).forEach(r=>{
    if (String(r[0]||'')!==monthKey) return;
    const yes = r[5]===true || ['true','yes'].includes(String(r[5]||'').toLowerCase());
    if (yes && r[2]) ids[String(r[2])]=true;
  });
  return Object.keys(ids).length;
}

function SOCIAL_youtubeImpressions_(monthKey) {
  // Sum official monthly per-video Thumbnail Impressions from YouTube Raw column T.
  // Do not substitute Views if Reporting API data is unavailable.
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.ytRaw);
  if (!sh || sh.getLastRow()<2) return '';
  let sum=0,found=false;
  sh.getDataRange().getValues().slice(1).forEach(r=>{
    if (String(r[0]||'')===monthKey && SOCIAL_num_(r[19])!=='') {sum+=Number(r[19]);found=true;}
  });
  return found ? sum : '';
}

function SOCIAL_tiktokAccount_() {
  // Reuse the existing TikTok refresh flow before reading account stats.
  try {
    if (typeof TIKTOK_refreshAccessToken === 'function') {
      TIKTOK_refreshAccessToken();
    }
  } catch (e) {
    console.log('TikTok token refresh before account stats: ' + e.message);
  }

  const props=PropertiesService.getScriptProperties();
  let token=String(props.getProperty('TIKTOK_ACCESS_TOKEN')||'').trim();

  // Compatibility fallback in case an older project used a different key.
  if (!token) {
    const all=props.getProperties();
    Object.keys(all).some(k=>{
      if (/TIKTOK.*ACCESS.*TOKEN/i.test(k) || /ACCESS.*TOKEN.*TIKTOK/i.test(k)) {
        token=String(all[k]||'').trim();
        return !!token;
      }
      return false;
    });
  }

  if (!token) return null;
  const url='https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,follower_count,following_count,likes_count,video_count';
  const resp=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
  if (resp.getResponseCode()<200 || resp.getResponseCode()>=300) return null;
  const j=JSON.parse(resp.getContentText());
  return j && j.data ? j.data.user : null;
}

function SOCIAL_tiktokDelta_(start,now) {
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.ttRaw);
  if (!sh || sh.getLastRow()<2) return null;
  const snaps={};
  sh.getDataRange().getValues().slice(1).forEach(r=>{
    const at=SOCIAL_date_(r[0]); if (!at || at<start || at>now) return;
    const k=String(at.getTime()); if (!snaps[k]) snaps[k]={at,videos:{}};
    const id=String(r[1]||''); if (!id) return;
    snaps[k].videos[id]={views:Number(r[6]||0),likes:Number(r[7]||0),comments:Number(r[8]||0),shares:Number(r[9]||0)};
  });
  const list=Object.values(snaps).sort((a,b)=>a.at-b.at);
  if (list.length<2) return null;
  const a=list[0],b=list[list.length-1],ids={};
  Object.keys(a.videos).forEach(id=>ids[id]=true); Object.keys(b.videos).forEach(id=>ids[id]=true);
  const out={views:0,likes:0,comments:0,shares:0,baselineAt:a.at,full:(a.at-start)<=36*3600000};
  Object.keys(ids).forEach(id=>{
    const x=a.videos[id]||{views:0,likes:0,comments:0,shares:0};
    const y=b.videos[id]||x;
    ['views','likes','comments','shares'].forEach(k=>out[k]+=Math.max(0,Number(y[k]||0)-Number(x[k]||0)));
  });
  return out;
}

function SOCIAL_tiktokCount_(start,now) {
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_CFG.ttRaw);
  if (!sh || sh.getLastRow()<2) return 0;
  const data=sh.getDataRange().getValues().slice(1);
  let latest=0; data.forEach(r=>{const d=SOCIAL_date_(r[0]); if(d) latest=Math.max(latest,d.getTime());});
  const ids={};
  data.forEach(r=>{
    const at=SOCIAL_date_(r[0]); if(!at || Math.abs(at.getTime()-latest)>1500) return;
    const p=SOCIAL_date_(r[2]); if(p && p>=start && p<=now && r[1]) ids[String(r[1])]=true;
  });
  return Object.keys(ids).length;
}

function SOCIAL_safe_(label,fn){try{fn();console.log('✅ '+label);}catch(e){console.log('⚠️ '+label+': '+e.message);}}
function SOCIAL_safeReturn_(label,fn){try{const r=fn();console.log('✅ '+label);return r;}catch(e){console.log('⚠️ '+label+': '+e.message);return null;}}
function SOCIAL_monthKey_(d){return Utilities.formatDate(d,SOCIAL_CFG.tz,'yyyy-MM');}
function SOCIAL_ymd_(d){return Utilities.formatDate(d,SOCIAL_CFG.tz,'yyyy-MM-dd');}
function SOCIAL_monthLabel_(d){return ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()];}
function SOCIAL_num_(v){return v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):'';}
function SOCIAL_sum_(arr){let s=0,f=false;arr.forEach(v=>{const n=SOCIAL_num_(v);if(n!==''){s+=n;f=true;}});return f?s:'';}
function SOCIAL_date_(v){if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime()))return v;if(typeof v==='string'&&v.trim()){const m=v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);if(m)return new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));const d=new Date(v);if(!isNaN(d.getTime()))return d;}return null;}

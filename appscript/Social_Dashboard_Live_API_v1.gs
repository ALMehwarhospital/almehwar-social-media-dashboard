/**
 * ALMEHWAR — FULL SOCIAL DASHBOARD LIVE API V1
 * ------------------------------------------------------------
 * Private Google Sheet -> JSON API -> React Dashboard
 *
 * This supersedes the smaller Social_Decision_Live_API.gs.
 *
 * Reads:
 * - Monthly Overview
 * - Content Performance (historical Jun-Aug)
 * - Video Analysis (historical Jun-Aug)
 * - Facebook Raw (current month)
 * - Instagram Raw (current month)
 * - YouTube Raw (current month)
 * - TikTok Video Snapshots (current month)
 * - Creative Analysis
 * - Recommendations
 * - Action Plan
 *
 * GET is read-only. POST writes only to Recommendations / Action Plan.
 * Authentication will be added with the planned dashboard login system.
 * Deploy as a SEPARATE Apps Script Web App.
 */

const SOCIAL_DASH_API = {
  spreadsheetId: '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8',
  timezone: 'Africa/Cairo',
  cacheSeconds: 60,

  sheets: {
    overview: 'Monthly Overview',
    content: 'Content Performance',
    video: 'Video Analysis',
    facebook: 'Facebook Raw',
    instagram: 'Instagram Raw',
    youtube: 'YouTube Raw',
    tiktok: 'TikTok Video Snapshots',
    creative: 'Creative Analysis',
    recommendations: 'Recommendations',
    actionPlan: 'Action Plan',
    inboundCalls: 'Inbound Calls Raw'
  }
};

function SOCIAL_DASH_API_doGet_(e) {
  try {
    const params = (e && e.parameter) || {};
    const section = String(params.section || 'all').toLowerCase();
    const payload = SOCIAL_DASH_API_build_(section);

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        generatedAt: SOCIAL_DASH_API_nowIso_(),
        error: err && err.message ? err.message : String(err)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function SOCIAL_DASH_API_doPost_(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    const action = SOCIAL_DASH_API_s_(body.action);
    let result;
    if (action === 'verifyAccess') result = { verified: true };
    else if (action === 'createRecommendation') result = SOCIAL_DASH_API_createRecommendation_(body.payload || {});
    else if (action === 'updateRecommendation') result = SOCIAL_DASH_API_updateRecommendation_(body.payload || {});
    else if (action === 'createAction') result = SOCIAL_DASH_API_createAction_(body.payload || {});
    else throw new Error('Unsupported dashboard write action.');

    return SOCIAL_DASH_API_json_({
      success: true,
      generatedAt: SOCIAL_DASH_API_nowIso_(),
      result: result
    });
  } catch (err) {
    return SOCIAL_DASH_API_json_({
      success: false,
      generatedAt: SOCIAL_DASH_API_nowIso_(),
      error: err && err.message ? err.message : String(err)
    });
  }
}

function SOCIAL_DASH_API_createRecommendation_(input) {
  const required = ['month', 'title', 'observation', 'data', 'interpretation', 'recommendedAction', 'addedBy'];
  required.forEach(function(key) {
    if (!SOCIAL_DASH_API_s_(input[key])) throw new Error('Missing recommendation field: ' + key);
  });

  const month = SOCIAL_DASH_API_s_(input.month);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid recommendation month.');

  const platform = SOCIAL_DASH_API_s_(input.relatedPlatform) || 'Cross-platform';
  const allowedPlatforms = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Cross-platform'];
  if (allowedPlatforms.indexOf(platform) < 0) throw new Error('Invalid platform.');

  const priority = SOCIAL_DASH_API_s_(input.priority) || 'Medium';
  if (['High', 'Medium', 'Low'].indexOf(priority) < 0) throw new Error('Invalid priority.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(SOCIAL_DASH_API.spreadsheetId);
    SOCIAL_DASH_API_ensureDecisionSchema_(ss);
    const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.recommendations);
    const row = sh.getLastRow() + 1;
    SOCIAL_DASH_API_copyDecisionRowStyle_(sh, row, 16);
    const today = Utilities.formatDate(new Date(), SOCIAL_DASH_API.timezone, 'dd/MM/yyyy');
    sh.getRange(row, 1, 1, 16).setValues([[
      month,
      today,
      'Recommendation',
      platform,
      SOCIAL_DASH_API_s_(input.title),
      SOCIAL_DASH_API_s_(input.observation),
      SOCIAL_DASH_API_s_(input.data),
      SOCIAL_DASH_API_s_(input.interpretation),
      SOCIAL_DASH_API_s_(input.recommendedAction),
      '',
      'Draft',
      priority,
      'New',
      SOCIAL_DASH_API_s_(input.addedBy),
      today,
      SOCIAL_DASH_API_s_(input.hypothesis)
    ]]);
    SOCIAL_DASH_API_clearDecisionCache_();
    return { id: 'recommendation-row-' + row, row: row };
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_DASH_API_updateRecommendation_(input) {
  const row = SOCIAL_DASH_API_rowFromId_(input.id, 'recommendation-row-');
  const decision = SOCIAL_DASH_API_s_(input.decision);
  const allowed = ['Draft', 'Discussed', 'Approved', 'Rejected', 'Test First', 'Added to Action Plan'];
  if (allowed.indexOf(decision) < 0) throw new Error('Invalid recommendation decision.');

  const statusMap = {
    Draft: 'New',
    Discussed: 'Discussing',
    Approved: 'Approved',
    Rejected: 'Closed',
    'Test First': 'Testing',
    'Added to Action Plan': 'Converted'
  };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(SOCIAL_DASH_API.spreadsheetId);
    const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.recommendations);
    if (!sh || row > sh.getLastRow() || !SOCIAL_DASH_API_s_(sh.getRange(row, 1).getDisplayValue())) {
      throw new Error('Recommendation row was not found.');
    }
    const today = Utilities.formatDate(new Date(), SOCIAL_DASH_API.timezone, 'dd/MM/yyyy');
    sh.getRange(row, 10).setValue(SOCIAL_DASH_API_s_(input.teamComment));
    sh.getRange(row, 11).setValue(decision);
    sh.getRange(row, 13).setValue(statusMap[decision]);
    sh.getRange(row, 15).setValue(today);
    SOCIAL_DASH_API_clearDecisionCache_();
    return { id: input.id, decision: decision };
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_DASH_API_createAction_(input) {
  const recommendationRow = SOCIAL_DASH_API_rowFromId_(input.recommendationId, 'recommendation-row-');
  ['owner', 'expectedImpact', 'targetKpi'].forEach(function(key) {
    if (!SOCIAL_DASH_API_s_(input[key])) throw new Error('Missing action field: ' + key);
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(SOCIAL_DASH_API.spreadsheetId);
    SOCIAL_DASH_API_ensureDecisionSchema_(ss);
    const recommendations = ss.getSheetByName(SOCIAL_DASH_API.sheets.recommendations);
    if (!recommendations || recommendationRow > recommendations.getLastRow()) throw new Error('Recommendation row was not found.');
    const recommendation = recommendations.getRange(recommendationRow, 1, 1, 16).getDisplayValues()[0];
    if (SOCIAL_DASH_API_s_(recommendation[10]) !== 'Approved') {
      throw new Error('Only an approved recommendation can enter the Action Plan.');
    }

    const actions = ss.getSheetByName(SOCIAL_DASH_API.sheets.actionPlan);
    const row = actions.getLastRow() + 1;
    SOCIAL_DASH_API_copyDecisionRowStyle_(actions, row, 17);
    const today = Utilities.formatDate(new Date(), SOCIAL_DASH_API.timezone, 'dd/MM/yyyy');
    actions.getRange(row, 1, 1, 17).setValues([[
      recommendation[0],
      today,
      recommendation[4] || recommendation[5],
      recommendation[8],
      SOCIAL_DASH_API_s_(input.owner),
      recommendation[11] || 'Medium',
      SOCIAL_DASH_API_s_(input.expectedImpact),
      'Not Started',
      SOCIAL_DASH_API_s_(input.targetKpi),
      SOCIAL_DASH_API_s_(input.baseline),
      SOCIAL_DASH_API_s_(input.target),
      SOCIAL_DASH_API_s_(input.deadline),
      SOCIAL_DASH_API_s_(input.testPeriod),
      '',
      '',
      SOCIAL_DASH_API_s_(input.addedBy) || recommendation[13] || 'Marketing Team',
      today
    ]]);

    recommendations.getRange(recommendationRow, 11).setValue('Added to Action Plan');
    recommendations.getRange(recommendationRow, 13).setValue('Converted');
    recommendations.getRange(recommendationRow, 15).setValue(today);
    SOCIAL_DASH_API_clearDecisionCache_();
    return { id: 'action-row-' + row, row: row };
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_DASH_API_ensureDecisionSchema_(optionalSs) {
  const ss = optionalSs || SpreadsheetApp.openById(SOCIAL_DASH_API.spreadsheetId);
  const recommendations = ss.getSheetByName(SOCIAL_DASH_API.sheets.recommendations);
  const actions = ss.getSheetByName(SOCIAL_DASH_API.sheets.actionPlan);
  if (!recommendations || !actions) throw new Error('Recommendations or Action Plan sheet is missing.');

  if (recommendations.getMaxColumns() < 16) {
    recommendations.insertColumnsAfter(recommendations.getMaxColumns(), 16 - recommendations.getMaxColumns());
  }
  recommendations.getRange(1, 16).setValue('Working Hypothesis');
  recommendations.getRange(2, 11, Math.max(recommendations.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pending', 'Draft', 'Discussed', 'Approved', 'Rejected', 'Test First', 'Added to Action Plan'], true)
      .setAllowInvalid(false)
      .build()
  );
  recommendations.getRange(2, 13, Math.max(recommendations.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Open', 'New', 'Discussing', 'Approved', 'Testing', 'Closed', 'Converted'], true)
      .setAllowInvalid(false)
      .build()
  );
  recommendations.getRange(2, 14, Math.max(recommendations.getMaxRows() - 1, 1), 1).clearDataValidations();
  actions.getRange(2, 8, Math.max(actions.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Planned', 'Not Started', 'In Progress', 'Done', 'On Hold'], true)
      .setAllowInvalid(false)
      .build()
  );
  actions.getRange(2, 16, Math.max(actions.getMaxRows() - 1, 1), 1).clearDataValidations();
}

function SOCIAL_DASH_API_copyDecisionRowStyle_(sheet, row, columns) {
  if (row > 2) {
    sheet.getRange(row - 1, 1, 1, columns).copyTo(
      sheet.getRange(row, 1, 1, columns),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
    sheet.getRange(row - 1, 1, 1, columns).copyTo(
      sheet.getRange(row, 1, 1, columns),
      SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION,
      false
    );
  }
}

function SOCIAL_DASH_API_rowFromId_(id, prefix) {
  const value = SOCIAL_DASH_API_s_(id);
  if (value.indexOf(prefix) !== 0) throw new Error('Invalid row identifier.');
  const row = Number(value.slice(prefix.length));
  if (!Number.isInteger(row) || row < 2) throw new Error('Invalid row identifier.');
  return row;
}

function SOCIAL_DASH_API_clearDecisionCache_() {
  CacheService.getScriptCache().removeAll([
    'social-dashboard-live-v2-all',
    'social-dashboard-live-v2-recommendations',
    'social-dashboard-live-v2-insights',
    'social-dashboard-live-v2-actionPlan',
    'social-dashboard-live-v2-action-plan',
    'social-dashboard-live-v2-actionplan'
  ]);
}

function SOCIAL_DASH_API_json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function SOCIAL_DASH_API_build_(section) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'social-dashboard-live-v2-' + section;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.openById(SOCIAL_DASH_API.spreadsheetId);
  const currentMonth = Utilities.formatDate(new Date(), SOCIAL_DASH_API.timezone, 'yyyy-MM');

  const include = name =>
    section === 'all' ||
    section === name ||
    (name === 'actionPlan' && ['action-plan', 'actionplan'].indexOf(section) >= 0) ||
    (name === 'recommendations' && section === 'insights');

  const overviewRows = (include('overview') || include('content') || include('video'))
    ? SOCIAL_DASH_API_overview_(ss)
    : [];

  const historicalContent = include('content')
    ? SOCIAL_DASH_API_historicalContent_(ss)
    : [];

  const needsLiveContent = include('content') || include('video') || include('creative');
  const creativeRows = needsLiveContent || include('creative')
    ? SOCIAL_DASH_API_creativeSheet_(ss)
    : [];

  // Read Raw data for every month that is not yet materialized in Content
  // Performance. This is a rollover safety net: a closed month remains visible
  // even if the scheduled archive job is delayed or fails once.
  const historicalContentMonths = SOCIAL_DASH_API_monthSet_(historicalContent);
  const rawContentMonths = SOCIAL_DASH_API_sourceMonths_(overviewRows, currentMonth)
    .filter(function(month) { return month === currentMonth || !historicalContentMonths[month]; });
  const rawContent = needsLiveContent
    ? rawContentMonths.reduce(function(all, month) {
        return all.concat(SOCIAL_DASH_API_currentContent_(ss, month, creativeRows).map(function(item) {
          item.live = month === currentMonth;
          return item;
        }));
      }, [])
    : [];
  const allContent = historicalContent.concat(rawContent);
  const liveContent = allContent.filter(function(item) { return item.month === currentMonth; });

  const historicalVideo = include('video')
    ? SOCIAL_DASH_API_historicalVideo_(ss)
    : [];

  const historicalVideoMonths = SOCIAL_DASH_API_monthSet_(historicalVideo);
  const rawVideoContent = include('video')
    ? rawContent.filter(function(item) { return item.month === currentMonth || !historicalVideoMonths[item.month]; })
    : [];
  const rawVideo = include('video') ? SOCIAL_DASH_API_currentVideo_(rawVideoContent) : [];
  rawVideo.forEach(function(item) { item.live = item.month === currentMonth; });
  const allVideo = historicalVideo.concat(rawVideo);
  const liveVideo = allVideo.filter(function(item) { return item.month === currentMonth; });

  const baseCreative = include('creative') ? creativeRows : [];

  const creative = include('creative')
    ? SOCIAL_DASH_API_mergeCreativeWithLive_(baseCreative, liveContent)
    : [];

  const payload = {
    success: true,
    mode: 'LIVE',
    generatedAt: SOCIAL_DASH_API_nowIso_(),
    currentMonth: currentMonth,
    source: 'Private Google Sheet via read-only Apps Script Web API',
    counts: {
      overview: include('overview') ? overviewRows.length : 0,
      contentHistorical: allContent.filter(function(item) { return item.month < currentMonth; }).length,
      contentLive: liveContent.length,
      videoHistorical: allVideo.filter(function(item) { return item.month < currentMonth; }).length,
      videoLive: liveVideo.length,
      creative: creative.length,
      creativeReviewed: creative.filter(x => x.reviewStatus === 'Reviewed').length,
      creativePending: creative.filter(x => x.reviewStatus !== 'Reviewed').length,
      inboundCalls: include('inboundCalls') ? SOCIAL_DASH_API_inboundCalls_(ss).length : 0
    },
    data: {
      overview: include('overview') ? overviewRows : [],
      content: include('content') ? allContent : [],
      video: include('video') ? allVideo : [],
      creative: creative,
      recommendations: include('recommendations') ? SOCIAL_DASH_API_recommendations_(ss) : [],
      actionPlan: include('actionPlan') ? SOCIAL_DASH_API_actionPlan_(ss) : [],
      inboundCalls: include('inboundCalls') ? SOCIAL_DASH_API_inboundCalls_(ss) : []
    }
  };

  const json = JSON.stringify(payload);
  if (json.length < 95000) cache.put(cacheKey, json, SOCIAL_DASH_API.cacheSeconds);
  return payload;
}


// ============================================================
// OVERVIEW
// ============================================================

function SOCIAL_DASH_API_overview_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.overview);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];
  const currentMonth = Utilities.formatDate(new Date(), SOCIAL_DASH_API.timezone, 'yyyy-MM');

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!SOCIAL_DASH_API_s_(r[0]) || !SOCIAL_DASH_API_s_(r[1])) continue;

    const note = SOCIAL_DASH_API_s_(r[20]);
    const autoMonth = (note.match(/AUTO\|(\d{4}-\d{2})\|/) || [])[1];
    const month = autoMonth || SOCIAL_DASH_API_monthLabelToKey_(r[0]);
    const platform = SOCIAL_DASH_API_s_(r[1]);
    const trackedInteractions = SOCIAL_DASH_API_num_(r[24]);
    const legacyInteractions = SOCIAL_DASH_API_num_(r[14]);

    out.push({
      id: 'overview-row-' + (i + 1),
      month: month,
      monthLabel: SOCIAL_DASH_API_s_(r[0]),
      platform: platform,

      followersStart: SOCIAL_DASH_API_num_(r[2]),
      followersEnd: SOCIAL_DASH_API_num_(r[3]),
      newFollowers: SOCIAL_DASH_API_num_(r[4]),
      posts: SOCIAL_DASH_API_num_(r[5]),
      videos: SOCIAL_DASH_API_num_(r[6]),
      reach: SOCIAL_DASH_API_num_(r[7]),
      impressions: SOCIAL_DASH_API_num_(r[8]),
      views: SOCIAL_DASH_API_num_(r[9]),
      profileVisits: SOCIAL_DASH_API_num_(r[10]),
      likes: SOCIAL_DASH_API_num_(r[11]),
      comments: SOCIAL_DASH_API_num_(r[12]),
      shares: SOCIAL_DASH_API_num_(r[13]),
      // Facebook uses the explicit, consistently-defined API total
      // (Reactions + Comments + Shares). Historical MBS values remain in
      // column O for reference but are not mixed with this definition.
      interactions: platform === 'Facebook' && trackedInteractions !== null
        ? trackedInteractions
        : legacyInteractions,
      engagementRate: SOCIAL_DASH_API_pct_(r[15]),
      linkClicks: SOCIAL_DASH_API_num_(r[16]),
      profileLinkTaps: SOCIAL_DASH_API_num_(r[21]),
      uniqueMediaViewers28d: SOCIAL_DASH_API_num_(r[22]),
      contentUniqueViewers: SOCIAL_DASH_API_num_(r[23]),
      trackedInteractions: trackedInteractions,
      messages: SOCIAL_DASH_API_num_(r[17]),
      leads: SOCIAL_DASH_API_num_(r[18]),
      followerGrowth: SOCIAL_DASH_API_pct_(r[19]),

      note: note,
      live: month === currentMonth,
      status: month && month < currentMonth ? 'CLOSED MONTH' : SOCIAL_DASH_API_statusFromNote_(note)
    });
  }

  return out;
}


// ============================================================
// HISTORICAL CONTENT — Content Performance
// ============================================================

function SOCIAL_DASH_API_historicalContent_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.content);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!SOCIAL_DASH_API_s_(r[0]) || !SOCIAL_DASH_API_s_(r[1])) continue;

    out.push({
      id: 'content-sheet-row-' + (i + 1),
      source: 'Content Performance',
      live: false,
      date: SOCIAL_DASH_API_s_(r[0]),
      month: SOCIAL_DASH_API_monthFromDate_(r[0]),
      platform: SOCIAL_DASH_API_s_(r[1]),
      name: SOCIAL_DASH_API_s_(r[2]),
      pillar: SOCIAL_DASH_API_s_(r[3]) || 'Other',
      pillarSource: 'manual',
      format: SOCIAL_DASH_API_s_(r[4]) || 'Other',
      spendType: SOCIAL_DASH_API_s_(r[5]) || 'Total / Unsplit',

      reach: SOCIAL_DASH_API_num_(r[6]),
      views: SOCIAL_DASH_API_num_(r[7]),
      impressions: SOCIAL_DASH_API_num_(r[8]),
      interactions: SOCIAL_DASH_API_num_(r[9]),
      engagementDenominator: SOCIAL_DASH_API_s_(r[10]),
      engagementRate: SOCIAL_DASH_API_pct_(r[11]),
      profileVisits: SOCIAL_DASH_API_num_(r[12]),
      linkClicks: SOCIAL_DASH_API_num_(r[13]),
      followersGained: SOCIAL_DASH_API_num_(r[14]),
      shares: SOCIAL_DASH_API_num_(r[15]),
      saves: SOCIAL_DASH_API_num_(r[16]),
      leads: SOCIAL_DASH_API_num_(r[17]),
      messages: SOCIAL_DASH_API_num_(r[18]),
      valueRate: SOCIAL_DASH_API_pct_(r[19]),
      notes: SOCIAL_DASH_API_s_(r[20]),
      url: SOCIAL_DASH_API_urlFromText_(r[20])
    });
  }

  return out;
}


// ============================================================
// CURRENT-MONTH CONTENT — directly from platform raw data
// ============================================================

function SOCIAL_DASH_API_currentContent_(ss, monthKey, creativeRows) {
  const items = []
    .concat(SOCIAL_DASH_API_currentFacebook_(ss, monthKey))
    .concat(SOCIAL_DASH_API_currentInstagram_(ss, monthKey))
    .concat(SOCIAL_DASH_API_currentYouTube_(ss, monthKey))
    .concat(SOCIAL_DASH_API_currentTikTok_(ss, monthKey));

  return SOCIAL_DASH_API_applyPillars_(items, creativeRows || []);
}


// ============================================================
// INBOUND CALLS — DAILY ROWS FROM JUNE 2026 ONWARD
// ============================================================

function SOCIAL_DASH_API_inboundCalls_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.inboundCalls);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const headers = values[0].map(function(header) {
    return SOCIAL_DASH_API_headerKey_(header);
  });

  return values.slice(1).map(function(row, index) {
    const item = { id: 'inbound-call-row-' + (index + 2) };
    headers.forEach(function(key, column) {
      const value = row[column];
      if (key === 'date') {
        item[key] = value instanceof Date
          ? Utilities.formatDate(value, SOCIAL_DASH_API.timezone, 'yyyy-MM-dd')
          : SOCIAL_DASH_API_s_(value);
      } else if (key === 'periodMonth') {
        item[key] = SOCIAL_DASH_API_s_(value);
      } else {
        item[key] = SOCIAL_DASH_API_num_(value);
      }
    });
    return item;
  }).filter(function(item) {
    return item.periodMonth && item.date && item.inboundCalls !== null;
  });
}

function SOCIAL_DASH_API_headerKey_(header) {
  const exact = SOCIAL_DASH_API_s_(header).toLowerCase();
  if (exact === 'opd reservations') return 'opdReservations';
  const cleaned = SOCIAL_DASH_API_s_(header).replace(/[^a-zA-Z0-9]+(.)?/g, function(match, chr) {
    return chr ? chr.toUpperCase() : '';
  });
  return cleaned ? cleaned.charAt(0).toLowerCase() + cleaned.slice(1) : 'column';
}

function SOCIAL_DASH_API_monthSet_(items) {
  return (items || []).reduce(function(set, item) {
    const month = SOCIAL_DASH_API_s_(item && item.month);
    if (/^\d{4}-\d{2}$/.test(month)) set[month] = true;
    return set;
  }, {});
}

function SOCIAL_DASH_API_sourceMonths_(overviewRows, currentMonth) {
  const months = {};
  (overviewRows || []).forEach(function(row) {
    const month = SOCIAL_DASH_API_s_(row && row.month);
    if (/^\d{4}-\d{2}$/.test(month) && month <= currentMonth) months[month] = true;
  });
  months[currentMonth] = true;
  return Object.keys(months).sort();
}

function SOCIAL_DASH_API_applyPillars_(items, creativeRows) {
  const byContent = {};
  const byName = {};

  creativeRows.forEach(row => {
    const pillar = SOCIAL_DASH_API_s_(row.pillar);
    if (!pillar || pillar === 'Other') return;

    byContent[SOCIAL_DASH_API_creativeKey_(row.platform, row.url, row.name)] = pillar;
    byName[SOCIAL_DASH_API_nameKey_(row.platform, row.name)] = pillar;
  });

  return items.map(item => {
    const pillar =
      byContent[SOCIAL_DASH_API_creativeKey_(item.platform, item.url, item.name)] ||
      byName[SOCIAL_DASH_API_nameKey_(item.platform, item.name)] ||
      '';

    if (pillar) {
      item.pillar = pillar;
      item.pillarSource = 'Creative Analysis';
    }
    return item;
  });
}

function SOCIAL_DASH_API_currentFacebook_(ss, monthKey) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.facebook);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (SOCIAL_DASH_API_monthFromDate_(r[0]) !== monthKey) continue;

    const views = SOCIAL_DASH_API_num_(r[6]);
    const reach = SOCIAL_DASH_API_num_(r[7]);
    const interactions = SOCIAL_DASH_API_num_(r[11]);
    const shares = SOCIAL_DASH_API_num_(r[10]);

    out.push({
      id: 'live-facebook-' + SOCIAL_DASH_API_s_(r[1]),
      contentId: SOCIAL_DASH_API_s_(r[1]),
      source: 'Facebook Raw',
      live: true,
      date: SOCIAL_DASH_API_s_(r[0]),
      month: monthKey,
      platform: 'Facebook',
      name: SOCIAL_DASH_API_s_(r[3]) || SOCIAL_DASH_API_s_(r[4]) || 'Facebook content',
      pillar: 'Other',
      pillarSource: 'pending-classification',
      format: SOCIAL_DASH_API_fbFormat_(r[2]),
      spendType: 'Total / Unsplit',
      url: SOCIAL_DASH_API_s_(r[5]),

      reach: reach,
      views: views,
      impressions: null,
      interactions: interactions,
      engagementDenominator: 'Reach',
      engagementRate: reach && interactions !== null ? interactions / reach : null,
      profileVisits: null,
      linkClicks: SOCIAL_DASH_API_num_(r[12]),
      followersGained: null,
      shares: shares,
      saves: null,
      leads: null,
      messages: null,
      valueRate: null, // Facebook Saves unavailable; do not infer Value Rate.

      likes: SOCIAL_DASH_API_num_(r[8]),
      comments: SOCIAL_DASH_API_num_(r[9]),
      durationSeconds: SOCIAL_DASH_API_num_(r[13]),
      avgWatchTimeSeconds: SOCIAL_DASH_API_num_(r[14]),
      avgPercentWatched: SOCIAL_DASH_API_pct_(r[15]),
      completionRate: SOCIAL_DASH_API_pct_(r[19]),
      threeSecondViews: SOCIAL_DASH_API_num_(r[17]),
      retention3s: null, // r[17] is a count, not a retention rate.
      lastSynced: SOCIAL_DASH_API_s_(r[20])
    });
  }

  return out;
}

function SOCIAL_DASH_API_currentInstagram_(ss, monthKey) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.instagram);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (SOCIAL_DASH_API_monthFromDate_(r[0]) !== monthKey) continue;

    const reach = SOCIAL_DASH_API_num_(r[8]);
    const interactions = SOCIAL_DASH_API_num_(r[14]);
    const shares = SOCIAL_DASH_API_num_(r[11]);
    const saves = SOCIAL_DASH_API_num_(r[12]);

    out.push({
      id: 'live-instagram-' + SOCIAL_DASH_API_s_(r[1]),
      contentId: SOCIAL_DASH_API_s_(r[1]),
      source: 'Instagram Raw',
      live: true,
      date: SOCIAL_DASH_API_s_(r[0]),
      month: monthKey,
      platform: 'Instagram',
      name: SOCIAL_DASH_API_s_(r[4]) || SOCIAL_DASH_API_s_(r[5]) || 'Instagram content',
      pillar: 'Other',
      pillarSource: 'pending-classification',
      format: SOCIAL_DASH_API_igFormat_(r[2], r[3]),
      spendType: 'Total / Unsplit',
      url: SOCIAL_DASH_API_s_(r[6]),

      reach: reach,
      views: SOCIAL_DASH_API_num_(r[7]),
      impressions: null,
      interactions: interactions,
      engagementDenominator: 'Reach',
      engagementRate: reach && interactions !== null ? interactions / reach : null,
      profileVisits: null,
      linkClicks: null,
      followersGained: null,
      shares: shares,
      saves: saves,
      leads: null,
      messages: null,
      valueRate: reach && shares !== null && saves !== null
        ? (shares + saves) / reach
        : null,

      likes: SOCIAL_DASH_API_num_(r[9]),
      comments: SOCIAL_DASH_API_num_(r[10]),
      reposts: SOCIAL_DASH_API_num_(r[13]),
      durationSeconds: SOCIAL_DASH_API_num_(r[19]),
      avgWatchTimeSeconds: SOCIAL_DASH_API_num_(r[15]),
      avgPercentWatched: SOCIAL_DASH_API_pct_(r[20]),
      skipRate: SOCIAL_DASH_API_pct_(r[17]),
      retention3s: SOCIAL_DASH_API_pct_(r[18]),
      lastSynced: SOCIAL_DASH_API_s_(r[21])
    });
  }

  return out;
}

function SOCIAL_DASH_API_currentYouTube_(ss, monthKey) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.youtube);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];

    if (SOCIAL_DASH_API_s_(r[0]) !== monthKey) continue;
    if (!SOCIAL_DASH_API_truthy_(r[5])) continue;

    const impressions = SOCIAL_DASH_API_num_(r[19]);
    const interactions = SOCIAL_DASH_API_num_(r[13]);
    const shares = SOCIAL_DASH_API_num_(r[12]);

    out.push({
      id: 'live-youtube-' + SOCIAL_DASH_API_s_(r[2]),
      contentId: SOCIAL_DASH_API_s_(r[2]),
      source: 'YouTube Raw',
      live: true,
      date: SOCIAL_DASH_API_s_(r[1]),
      month: monthKey,
      platform: 'YouTube',
      name: SOCIAL_DASH_API_s_(r[3]) || 'YouTube video',
      pillar: 'Other',
      pillarSource: 'pending-classification',
      format: 'Long video',
      spendType: 'Total / Unsplit',
      url: SOCIAL_DASH_API_s_(r[18]),

      reach: null,
      views: SOCIAL_DASH_API_num_(r[6]),
      impressions: impressions,
      interactions: interactions,
      engagementDenominator: 'Impressions',
      engagementRate: impressions && interactions !== null ? interactions / impressions : null,
      profileVisits: null,
      linkClicks: null,
      followersGained: SOCIAL_DASH_API_num_(r[16]),
      shares: shares,
      saves: null,
      leads: null,
      messages: null,
      valueRate: null,

      likes: SOCIAL_DASH_API_num_(r[10]),
      comments: SOCIAL_DASH_API_num_(r[11]),
      durationSeconds: SOCIAL_DASH_API_num_(r[4]),
      avgWatchTimeSeconds: SOCIAL_DASH_API_num_(r[8]),
      avgPercentWatched: SOCIAL_DASH_API_pct_(r[9]),
      completionRate: SOCIAL_DASH_API_pct_(r[24]),
      retention25: SOCIAL_DASH_API_pct_(r[21]),
      retention50: SOCIAL_DASH_API_pct_(r[22]),
      retention75: SOCIAL_DASH_API_pct_(r[23]),
      lastSynced: SOCIAL_DASH_API_s_(r[17])
    });
  }

  return out;
}

function SOCIAL_DASH_API_currentTikTok_(ss, monthKey) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.tiktok);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();

  // The sheet contains repeated snapshots.
  // Keep the newest row per Video ID.
  const latest = {};
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    const id = SOCIAL_DASH_API_s_(r[1]);
    if (!id || SOCIAL_DASH_API_monthFromDate_(r[2]) !== monthKey) continue;

    const stamp = SOCIAL_DASH_API_s_(r[0]);
    if (!latest[id] || stamp > latest[id].stamp) {
      latest[id] = { stamp: stamp, row: r };
    }
  }

  return Object.keys(latest).map(id => {
    const r = latest[id].row;
    const views = SOCIAL_DASH_API_num_(r[6]);
    const likes = SOCIAL_DASH_API_num_(r[7]);
    const comments = SOCIAL_DASH_API_num_(r[8]);
    const shares = SOCIAL_DASH_API_num_(r[9]);
    const interactionParts = [likes, comments, shares].filter(x => x !== null);
    const interactions = interactionParts.length
      ? interactionParts.reduce((a, b) => a + b, 0)
      : null;

    return {
      id: 'live-tiktok-' + id,
      contentId: id,
      source: 'TikTok Video Snapshots',
      live: true,
      date: SOCIAL_DASH_API_s_(r[2]),
      month: monthKey,
      platform: 'TikTok',
      name: SOCIAL_DASH_API_s_(r[3]) || 'TikTok video',
      pillar: 'Other',
      pillarSource: 'pending-classification',
      format: 'Reel',
      spendType: 'Total / Unsplit',
      url: SOCIAL_DASH_API_s_(r[4]),

      reach: SOCIAL_DASH_API_num_(r[12]), // Business Reach when helper has enriched latest snapshot.
      views: views,
      impressions: null,
      interactions: interactions,
      engagementDenominator: 'Views',
      engagementRate: views && interactions !== null ? interactions / views : null,
      profileVisits: null,
      linkClicks: null,
      followersGained: null,
      shares: shares,
      saves: null,
      leads: null,
      messages: null,
      valueRate: null,

      likes: likes,
      comments: comments,
      durationSeconds: SOCIAL_DASH_API_num_(r[5]),
      avgWatchTimeSeconds: SOCIAL_DASH_API_num_(r[13]),
      completionRate: SOCIAL_DASH_API_pct_(r[14]),
      lastSynced: SOCIAL_DASH_API_s_(r[15]) || SOCIAL_DASH_API_s_(r[0])
    };
  });
}


// ============================================================
// HISTORICAL VIDEO — Video Analysis
// ============================================================

function SOCIAL_DASH_API_historicalVideo_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.video);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!SOCIAL_DASH_API_s_(r[0]) || !SOCIAL_DASH_API_s_(r[1])) continue;

    out.push({
      id: 'video-sheet-row-' + (i + 1),
      source: 'Video Analysis',
      live: false,
      date: SOCIAL_DASH_API_s_(r[0]),
      month: SOCIAL_DASH_API_monthFromDate_(r[0]),
      platform: SOCIAL_DASH_API_s_(r[1]),
      name: SOCIAL_DASH_API_s_(r[2]),
      pillar: SOCIAL_DASH_API_s_(r[3]) || 'Other',
      format: SOCIAL_DASH_API_s_(r[4]) || 'Reel',
      spendType: SOCIAL_DASH_API_s_(r[5]) || 'Total / Unsplit',
      durationSeconds: SOCIAL_DASH_API_num_(r[6]),
      views: SOCIAL_DASH_API_num_(r[7]),
      reach: SOCIAL_DASH_API_num_(r[8]),
      impressions: SOCIAL_DASH_API_num_(r[9]),
      interactions: SOCIAL_DASH_API_num_(r[10]),
      engagementDenominator: SOCIAL_DASH_API_s_(r[11]),
      engagementRate: SOCIAL_DASH_API_pct_(r[12]),
      avgWatchTimeSeconds: SOCIAL_DASH_API_num_(r[13]),
      avgPercentWatched: SOCIAL_DASH_API_pct_(r[14]),
      completionRate: SOCIAL_DASH_API_pct_(r[15]),
      retention3s: SOCIAL_DASH_API_pct_(r[16]),
      retention25: SOCIAL_DASH_API_pct_(r[17]),
      retention50: SOCIAL_DASH_API_pct_(r[18]),
      retention75: SOCIAL_DASH_API_pct_(r[19]),
      shares: SOCIAL_DASH_API_num_(r[20]),
      saves: SOCIAL_DASH_API_num_(r[21]),
      followersGained: SOCIAL_DASH_API_num_(r[22]),
      hookType: SOCIAL_DASH_API_s_(r[23]),
      hookScore: SOCIAL_DASH_API_num_(r[24]),
      scriptScore: SOCIAL_DASH_API_num_(r[25]),
      editingScore: SOCIAL_DASH_API_num_(r[26]),
      ctaScore: SOCIAL_DASH_API_num_(r[27]),
      overallScore: SOCIAL_DASH_API_num_(r[28]),
      diagnosis: SOCIAL_DASH_API_s_(r[29]),
      notes: SOCIAL_DASH_API_s_(r[30]),
      aiRecommendation: SOCIAL_DASH_API_s_(r[31])
    });
  }

  return out;
}


// ============================================================
// CURRENT VIDEO — derived from live current content
// ============================================================

function SOCIAL_DASH_API_currentVideo_(content) {
  return content
    .filter(x => ['Reel', 'Long video', 'Video'].indexOf(x.format) >= 0)
    .map(x => ({
      id: 'live-video-' + x.id,
      contentId: x.contentId,
      source: x.source,
      live: true,
      date: x.date,
      month: x.month,
      platform: x.platform,
      name: x.name,
      pillar: x.pillar,
      format: x.format,
      spendType: x.spendType,
      url: x.url,

      durationSeconds: x.durationSeconds == null ? null : x.durationSeconds,
      views: x.views == null ? null : x.views,
      reach: x.reach == null ? null : x.reach,
      impressions: x.impressions == null ? null : x.impressions,
      interactions: x.interactions == null ? null : x.interactions,
      engagementDenominator: x.engagementDenominator || null,
      engagementRate: x.engagementRate == null ? null : x.engagementRate,
      avgWatchTimeSeconds: x.avgWatchTimeSeconds == null ? null : x.avgWatchTimeSeconds,
      avgPercentWatched: x.avgPercentWatched == null ? null : x.avgPercentWatched,
      completionRate: x.completionRate == null ? null : x.completionRate,
      retention3s: x.retention3s == null ? null : x.retention3s,
      retention25: x.retention25 == null ? null : x.retention25,
      retention50: x.retention50 == null ? null : x.retention50,
      retention75: x.retention75 == null ? null : x.retention75,
      shares: x.shares == null ? null : x.shares,
      saves: x.saves == null ? null : x.saves,
      followersGained: x.followersGained == null ? null : x.followersGained,

      // These remain null until a real creative/video review exists.
      hookType: null,
      hookScore: null,
      scriptScore: null,
      editingScore: null,
      ctaScore: null,
      overallScore: null,
      diagnosis: null,
      notes: 'LIVE current-month metrics. Creative scores are not inferred from performance.',
      aiRecommendation: null,
      lastSynced: x.lastSynced || null
    }));
}


// ============================================================
// CREATIVE — all platforms, reviewed + pending
// ============================================================

function SOCIAL_DASH_API_creativeSheet_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.creative);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!SOCIAL_DASH_API_s_(r[1]) || !SOCIAL_DASH_API_s_(r[2])) continue;

    const reviewer = SOCIAL_DASH_API_s_(r[23]);
    const creativeScore = SOCIAL_DASH_API_num_(r[13]);
    const performanceScore = SOCIAL_DASH_API_num_(r[14]);

    out.push({
      id: 'creative-sheet-row-' + (i + 1),
      source: 'Creative Analysis',
      live: false,
      date: SOCIAL_DASH_API_s_(r[0]),
      month: SOCIAL_DASH_API_monthFromDate_(r[0]),
      platform: SOCIAL_DASH_API_s_(r[1]),
      name: SOCIAL_DASH_API_s_(r[2]),
      pillar: SOCIAL_DASH_API_s_(r[3]) || 'Other',
      format: SOCIAL_DASH_API_s_(r[4]) || 'Other',
      spendType: 'Total / Unsplit',
      url: SOCIAL_DASH_API_s_(r[5]),

      scores: {
        idea: SOCIAL_DASH_API_num_(r[6]),
        hook: SOCIAL_DASH_API_num_(r[7]),
        script: SOCIAL_DASH_API_num_(r[8]),
        design: SOCIAL_DASH_API_num_(r[9]),
        editing: SOCIAL_DASH_API_num_(r[10]),
        brandConsistency: SOCIAL_DASH_API_num_(r[11]),
        cta: SOCIAL_DASH_API_num_(r[12])
      },

      creativeScore: creativeScore,
      performanceScore: performanceScore,
      quadrant: SOCIAL_DASH_API_s_(r[15]) || null,
      observation: SOCIAL_DASH_API_s_(r[16]),
      evidence: SOCIAL_DASH_API_s_(r[17]),
      hypothesis: SOCIAL_DASH_API_s_(r[18]),
      mainStrength: SOCIAL_DASH_API_s_(r[19]),
      mainWeakness: SOCIAL_DASH_API_s_(r[20]),
      recommendedImprovement: SOCIAL_DASH_API_s_(r[21]),
      nextTest: SOCIAL_DASH_API_s_(r[22]),
      reviewer: reviewer,
      reviewDate: SOCIAL_DASH_API_s_(r[24]),
      reviewBasis: SOCIAL_DASH_API_s_(r[31]),
      reviewConfidence: SOCIAL_DASH_API_s_(r[32]),
      previewUrl: SOCIAL_DASH_API_s_(r[25]),
      previewSource: SOCIAL_DASH_API_s_(r[26]),
      previewStatus: SOCIAL_DASH_API_s_(r[27]),
      reviewMediaUrl: SOCIAL_DASH_API_s_(r[28]),
      reviewMediaType: SOCIAL_DASH_API_s_(r[29]),
      reviewMediaStatus: SOCIAL_DASH_API_s_(r[30]),

      reviewStatus: reviewer && creativeScore !== null ? 'Reviewed' : 'Pending'
    });
  }

  return out;
}

function SOCIAL_DASH_API_mergeCreativeWithLive_(creative, liveContent) {
  const out = creative.slice();
  const keys = {};

  creative.forEach(x => {
    const key = SOCIAL_DASH_API_creativeKey_(x.platform, x.url, x.name);
    keys[key] = true;
  });

  liveContent.forEach(x => {
    const key = SOCIAL_DASH_API_creativeKey_(x.platform, x.url, x.name);
    if (keys[key]) return;

    out.push({
      id: 'creative-' + x.id,
      source: x.source,
      live: true,
      date: x.date,
      month: x.month,
      platform: x.platform,
      name: x.name,
      pillar: x.pillar,
      format: x.format,
      spendType: x.spendType,
      url: x.url,

      scores: {
        idea: null,
        hook: null,
        script: null,
        design: null,
        editing: null,
        brandConsistency: null,
        cta: null
      },

      creativeScore: null,
      performanceScore: null,
      quadrant: null,
      observation: '',
      evidence: '',
      hypothesis: '',
      mainStrength: '',
      mainWeakness: '',
      recommendedImprovement: '',
      nextTest: '',
      reviewer: '',
      reviewDate: '',
      reviewBasis: '',
      reviewConfidence: '',
      previewUrl: '',
      previewSource: '',
      previewStatus: 'Pending preview',
      reviewMediaUrl: '',
      reviewMediaType: '',
      reviewMediaStatus: '',
      reviewStatus: 'Pending'
    });
  });

  return out;
}


// ============================================================
// RECOMMENDATIONS
// ============================================================

function SOCIAL_DASH_API_recommendations_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.recommendations);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!SOCIAL_DASH_API_s_(r[0])) continue;

    out.push({
      id: 'recommendation-row-' + (i + 1),
      month: SOCIAL_DASH_API_s_(r[0]),
      date: SOCIAL_DASH_API_s_(r[1]),
      type: SOCIAL_DASH_API_s_(r[2]),
      relatedPlatform: SOCIAL_DASH_API_s_(r[3]) || null,
      title: SOCIAL_DASH_API_s_(r[4]) || SOCIAL_DASH_API_s_(r[5]) || 'Recommendation',
      observation: SOCIAL_DASH_API_s_(r[5]),
      data: SOCIAL_DASH_API_s_(r[6]),
      interpretation: SOCIAL_DASH_API_s_(r[7]),
      recommendedAction: SOCIAL_DASH_API_s_(r[8]),
      teamComment: SOCIAL_DASH_API_s_(r[9]),
      decision: SOCIAL_DASH_API_s_(r[10]),
      priority: SOCIAL_DASH_API_s_(r[11]) || 'Medium',
      status: SOCIAL_DASH_API_s_(r[12]) || 'Open',
      addedBy: SOCIAL_DASH_API_s_(r[13]),
      lastUpdate: SOCIAL_DASH_API_s_(r[14]),
      hypothesis: SOCIAL_DASH_API_s_(r[15])
    });
  }

  return out;
}


// ============================================================
// ACTION PLAN
// ============================================================

function SOCIAL_DASH_API_actionPlan_(ss) {
  const sh = ss.getSheetByName(SOCIAL_DASH_API.sheets.actionPlan);
  if (!sh || sh.getLastRow() < 2) return [];

  const v = sh.getDataRange().getDisplayValues();
  const out = [];

  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!SOCIAL_DASH_API_s_(r[0])) continue;

    out.push({
      id: 'action-row-' + (i + 1),
      month: SOCIAL_DASH_API_s_(r[0]),
      date: SOCIAL_DASH_API_s_(r[1]),
      problem: SOCIAL_DASH_API_s_(r[2]),
      action: SOCIAL_DASH_API_s_(r[3]),
      owner: SOCIAL_DASH_API_s_(r[4]),
      priority: SOCIAL_DASH_API_s_(r[5]) || 'Medium',
      expectedImpact: SOCIAL_DASH_API_s_(r[6]),
      status: SOCIAL_DASH_API_s_(r[7]) || 'Planned',
      targetKpi: SOCIAL_DASH_API_s_(r[8]),
      baseline: SOCIAL_DASH_API_s_(r[9]),
      target: SOCIAL_DASH_API_s_(r[10]),
      deadline: SOCIAL_DASH_API_s_(r[11]),
      testPeriod: SOCIAL_DASH_API_s_(r[12]),
      result: SOCIAL_DASH_API_s_(r[13]),
      finalLearning: SOCIAL_DASH_API_s_(r[14]),
      addedBy: SOCIAL_DASH_API_s_(r[15]),
      lastUpdate: SOCIAL_DASH_API_s_(r[16])
    });
  }

  return out;
}



// ============================================================
// HELPERS
// ============================================================

function SOCIAL_DASH_API_s_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function SOCIAL_DASH_API_num_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;

  let normalized = String(v).trim();
  if (!normalized) return null;

  normalized = normalized
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

  normalized = normalized
    .replace(/[,\u066C\u00A0\u202F\s]/g, '')
    .replace(/\u066B/g, '.')
    .replace(/%/g, '')
    .trim();

  if (!normalized) return null;
  const n = Number(normalized);
  return isFinite(n) ? n : null;
}

function SOCIAL_DASH_API_pct_(v) {
  const n = SOCIAL_DASH_API_num_(v);
  if (n === null) return null;

  const raw = SOCIAL_DASH_API_s_(v);
  if (raw.indexOf('%') >= 0) return n / 100;

  return Math.abs(n) > 1 ? n / 100 : n;
}

function SOCIAL_DASH_API_truthy_(v) {
  return ['true', 'yes', '1'].indexOf(String(v || '').toLowerCase()) >= 0;
}

function SOCIAL_DASH_API_monthFromDate_(v) {
  const s = SOCIAL_DASH_API_s_(v);

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2);

  m = s.match(/^(\d{4})-(\d{2})-/);
  if (m) return m[1] + '-' + m[2];

  return '';
}

function SOCIAL_DASH_API_monthLabelToKey_(v) {
  const s = SOCIAL_DASH_API_s_(v).toLowerCase();
  const map = {
    june: '2026-06',
    july: '2026-07',
    august: '2026-08',
    september: '2026-09',
    october: '2026-10',
    november: '2026-11',
    december: '2026-12'
  };
  return map[s] || '';
}

function SOCIAL_DASH_API_statusFromNote_(note) {
  if (!note) return '';
  if (note.indexOf('API Pending') >= 0) return 'API Pending';
  if (note.indexOf('PARTIAL MTD') >= 0) return 'PARTIAL MTD';
  if (note.indexOf('LIVE MTD') >= 0) return 'LIVE MTD';
  return '';
}

function SOCIAL_DASH_API_urlFromText_(text) {
  const m = SOCIAL_DASH_API_s_(text).match(/https?:\/\/\S+/);
  return m ? m[0].replace(/[)\],;]+$/, '') : '';
}

function SOCIAL_DASH_API_fbFormat_(type) {
  const s = SOCIAL_DASH_API_s_(type).toLowerCase();
  if (s.indexOf('reel') >= 0) return 'Reel';
  if (s.indexOf('video') >= 0) return 'Video';
  if (s.indexOf('carousel') >= 0 || s.indexOf('album') >= 0) return 'Carousel';
  return 'Static post';
}

function SOCIAL_DASH_API_igFormat_(mediaType, productType) {
  const product = SOCIAL_DASH_API_s_(productType).toUpperCase();
  const media = SOCIAL_DASH_API_s_(mediaType).toUpperCase();

  if (product === 'REELS' || media === 'VIDEO') return 'Reel';
  if (media === 'CAROUSEL_ALBUM') return 'Carousel';
  return 'Static post';
}

function SOCIAL_DASH_API_creativeKey_(platform, url, name) {
  return [
    SOCIAL_DASH_API_s_(platform).toLowerCase(),
    SOCIAL_DASH_API_s_(url).toLowerCase() || SOCIAL_DASH_API_s_(name).toLowerCase()
  ].join('||');
}

function SOCIAL_DASH_API_nameKey_(platform, name) {
  return [
    SOCIAL_DASH_API_s_(platform).toLowerCase(),
    SOCIAL_DASH_API_s_(name).toLowerCase().replace(/\s+/g, ' ').trim()
  ].join('||');
}

function SOCIAL_DASH_API_nowIso_() {
  return Utilities.formatDate(
    new Date(),
    SOCIAL_DASH_API.timezone,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}


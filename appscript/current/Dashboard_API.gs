// ALMEHWAR HOSPITAL — DASHBOARD READ-ONLY API V2

const DASHBOARD_API_SHEETS = {
  website: 'Website Raw',
  traffic: 'Website Traffic Raw',
  sources: 'Website Sources Raw',
  pages: 'Website Pages Raw',
  conversions: 'Website Conversions Raw',
  searchOverview: 'Search Console Overview Raw',
  searchDetails: 'Search Console Raw'
};

function DASHBOARD_API_doGet_(e) {
  try {
    const requestedMonth = e && e.parameter
      ? String(e.parameter.month || '').trim()
      : '';

    const result = DASHBOARD_API_buildResponse_(requestedMonth);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: String(error.message || error),
        generatedAt: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function DASHBOARD_API_buildResponse_(requestedMonth) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timezone = ss.getSpreadsheetTimeZone();
  const now = new Date();
  const liveMonth = Utilities.formatDate(now, timezone, 'yyyy-MM');
  const currentMonth = /^\d{4}-\d{2}$/.test(String(requestedMonth || ''))
    ? String(requestedMonth)
    : liveMonth;

  const website = DASHBOARD_API_getMonthRows_(
    ss, DASHBOARD_API_SHEETS.website, currentMonth
  );
  const traffic = DASHBOARD_API_getMonthRows_(
    ss, DASHBOARD_API_SHEETS.traffic, currentMonth
  );
  const sources = DASHBOARD_API_getMonthRows_(
    ss, DASHBOARD_API_SHEETS.sources, currentMonth
  );
  const pages = DASHBOARD_API_getMonthRows_(
    ss, DASHBOARD_API_SHEETS.pages, currentMonth
  );
  const conversions = DASHBOARD_API_keepLatestRow_(
    DASHBOARD_API_getMonthRows_(
      ss, DASHBOARD_API_SHEETS.conversions, currentMonth
    )
  );
  const searchOverview = DASHBOARD_API_keepLatestRow_(
    DASHBOARD_API_getMonthRows_(
      ss, DASHBOARD_API_SHEETS.searchOverview, currentMonth
    )
  );
  const searchDetails = DASHBOARD_API_getMonthRows_(
    ss, DASHBOARD_API_SHEETS.searchDetails, currentMonth
  );

  const ga4LastSynced = DASHBOARD_API_findLatestSync_(
    [website, traffic, sources, pages, conversions], timezone
  );
  const searchConsoleLastSynced = DASHBOARD_API_findLatestSync_(
    [searchOverview, searchDetails], timezone
  );
  const lastSynced = DASHBOARD_API_findLatestSync_(
    [
      website, traffic, sources, pages, conversions,
      searchOverview, searchDetails
    ],
    timezone
  );

  return {
    success: true,
    mode: 'LIVE',
    periodMonth: currentMonth,
    generatedAt: Utilities.formatDate(
      now, timezone, "yyyy-MM-dd'T'HH:mm:ss"
    ),
    lastSynced: lastSynced,
    sync: {
      ga4: ga4LastSynced,
      searchConsole: searchConsoleLastSynced
    },
    data: {
      website: website,
      traffic: traffic,
      sources: sources,
      pages: pages,
      conversions: conversions,
      searchConsole: {
        overview: searchOverview,
        details: searchDetails
      }
    }
  };
}

function DASHBOARD_API_getMonthRows_(ss, sheetName, periodMonth) {
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) {
    return [];
  }

  const values = sheet
    .getRange(1, 1, lastRow, lastColumn)
    .getValues();

  const headers = values[0].map(function (header) {
    return String(header).trim();
  });

  const result = [];

  values.slice(1).forEach(function (row) {
    const rowMonth = DASHBOARD_API_normalizeMonth_(
      row[0],
      ss.getSpreadsheetTimeZone()
    );

    if (rowMonth !== periodMonth) {
      return;
    }

    const object = {};

    headers.forEach(function (header, index) {
      object[DASHBOARD_API_headerToKey_(header)] =
        DASHBOARD_API_cleanValue_(
          row[index],
          ss.getSpreadsheetTimeZone()
        );
    });

    result.push(object);
  });

  return result;
}

function DASHBOARD_API_normalizeMonth_(value, timezone) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, timezone, 'yyyy-MM');
  }

  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})/);

  if (match) {
    return match[1] + '-' + match[2];
  }

  return text;
}

function DASHBOARD_API_headerToKey_(header) {
  const cleaned = String(header || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)?/g, function (match, chr) {
      return chr ? chr.toUpperCase() : '';
    });

  if (!cleaned) {
    return 'column';
  }

  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function DASHBOARD_API_cleanValue_(value, timezone) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ss"
    );
  }

  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }

  if (value === null || typeof value === 'undefined') {
    return null;
  }

  return String(value);
}

function DASHBOARD_API_findLatestSync_(datasets, timezone) {
  let latest = null;

  datasets.forEach(function (dataset) {
    dataset.forEach(function (row) {
      const value = row.lastSynced;
      if (!value) return;

      const date = DASHBOARD_API_parseLocalDate_(value);
      if (!date) return;

      if (!latest || date > latest) {
        latest = date;
      }
    });
  });

  if (!latest) {
    return null;
  }

  return Utilities.formatDate(
    latest,
    timezone,
    "yyyy-MM-dd'T'HH:mm:ss"
  );
}

function DASHBOARD_API_parseLocalDate_(value) {
  if (value instanceof Date) {
    return value;
  }

  const text = String(value || '').trim();
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );

  if (!match) {
    const fallback = new Date(text);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

// نقطة الدخول الوحيدة للـWeb App
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  // The hourly dashboard read also verifies the owner's website refresh jobs.
  // Scheduling errors never block a report that is already available.
  if (!params.section && !params.code && !params.error) {
    try { MEHWAR_AUTO_scheduleWebsiteSync_(); }
    catch (error) { console.error('Website refresh scheduler: ' + String(error)); }
  }

  if (params.code || params.error) {
    return TIKTOK_doGet_(e);
  }

  // Meta Ads: تحقق من جلسة الدخول قبل قراءة التاب الخاص.
  if (String(params.section || '').toLowerCase() === 'metaads') {
    try {
      DASHBOARD_AUTH_require_(params.token);

      return ContentService
        .createTextOutput(
          JSON.stringify(MEHWAR_ADS_dashboardPayload_())
        )
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: error && error.message
            ? error.message
            : String(error)
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (params.section) {
    return SOCIAL_DASH_API_doGet_(e);
  }

  return DASHBOARD_API_doGet_(e);
}

function DASHBOARD_API_keepLatestRow_(rows) {
  if (!rows || rows.length <= 1) {
    return rows || [];
  }

  let latest = rows[0];
  let latestTime = Date.parse(latest.lastSynced || '') || 0;

  rows.slice(1).forEach(function (row) {
    const rowTime = Date.parse(row.lastSynced || '') || 0;

    if (rowTime >= latestTime) {
      latest = row;
      latestTime = rowTime;
    }
  });

  return [latest];
}

function doPost(e) {
  return SOCIAL_DASH_API_doPost_(e);
}

// قراءة بيانات الإعلانات المحسوبة من الشيت الخاص
function MEHWAR_ADS_dashboardPayload_() {
  const book = SpreadsheetApp.openById(
    '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8'
  );
  const sheet = book.getSheetByName('Meta Ads Reporting');

  if (!sheet) {
    throw new Error('Meta Ads Reporting sheet is missing.');
  }

  const last = sheet.getLastRow();
  const raw = last > 1
    ? sheet.getRange(2, 1, last - 1, 15).getValues()
    : [];
  const display = last > 1
    ? sheet.getRange(2, 1, last - 1, 15).getDisplayValues()
    : [];

  const numeric = function (value) {
    return value === '' || value === null
      ? null
      : Number(value);
  };

  const campaigns = raw.map(function (row, index) {
    const shown = display[index];
    if (!shown[3]) return null;

    return {
      month: shown[0],
      dateStart: shown[1],
      dateStop: shown[2],
      campaignId: shown[3],
      name: shown[4],
      objective: shown[5],
      spend: Number(row[6] || 0),
      impressions: Number(row[7] || 0),
      reach: Number(row[8] || 0),
      clicks: Number(row[9] || 0),
      linkClicks: Number(row[10] || 0),
      leads: numeric(row[11]),
      messagingConversations: numeric(row[12]),
      messagingFirstReplies: numeric(row[13]),
      syncedAt: shown[14]
    };
  }).filter(Boolean);

  return {
    success: true,
    source: 'Private Meta Ads Reporting tab',
    generatedAt: new Date().toISOString(),
    currency: MEHWAR_ADS_accountCurrency_(),
    campaigns: campaigns
  };
}

// تجيب عملة حساب الإعلانات من Meta من غير إظهار التوكن
function MEHWAR_ADS_accountCurrency_() {
  const cache = CacheService.getScriptCache();
  const stored = cache.get('mehwars-ads-currency');
  if (stored) return stored;

  const token = PropertiesService
    .getScriptProperties()
    .getProperty('META_ADS_USER_TOKEN');

  if (!token) return null;

  try {
    const response = UrlFetchApp.fetch(
      'https://graph.facebook.com/v26.0/' +
        'act_236301107947197?fields=currency',
      {
        headers: {
          Authorization: 'Bearer ' + token
        },
        muteHttpExceptions: true
      }
    );

    if (response.getResponseCode() !== 200) {
      return null;
    }

    const data = JSON.parse(response.getContentText());
    if (!/^[A-Z]{3}$/.test(String(data.currency || ''))) {
      return null;
    }

    cache.put('mehwars-ads-currency', data.currency, 21600);
    return data.currency;
  } catch (error) {
    return null;
  }
}
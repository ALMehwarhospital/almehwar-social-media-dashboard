/**
 * ALMEHWAR — CREATIVE PREVIEW SYNC
 * Add as a NEW Apps Script file in the same project.
 * Reuses existing Script Properties / API auth already configured.
 *
 * Output columns in "Creative Analysis":
 * Z  = Preview / Thumbnail URL
 * AA = Preview Source
 * AB = Preview Status
 */

const CREATIVE_PREVIEW_CFG = {
  creativeSheet: 'Creative Analysis',
  facebookRaw: 'Facebook Raw',
  instagramRaw: 'Instagram Raw',
  tiktokRaw: 'TikTok Video Snapshots',
  previewCol: 26, // Z
  sourceCol: 27,  // AA
  statusCol: 28,  // AB
  metaBatchSize: 45,
  tiktokBatchSize: 20,
  // Keep each run small enough for Apps Script / Meta rate limits.
  metaRefreshLimitPerRun: 45
};

function CREATIVE_SYNC_PREVIEWS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CREATIVE_PREVIEW_CFG.creativeSheet);
  if (!sh) throw new Error('Creative Analysis sheet not found.');

  CREATIVE_ensurePreviewColumns_(sh);
  CREATIVE_syncCurrentInventory_(ss, sh);

  // Column A is the reliable boundary for real content. Preview/status cells can
  // exist below the inventory and must never make blank rows look like content.
  const rowCount = CREATIVE_contentRowCount_(sh);
  if (rowCount < 1) {
    console.log('No Creative Analysis rows found.');
    return;
  }

  const data = sh.getRange(2, 1, rowCount, 28).getValues();

  const fbUrlToId = CREATIVE_buildRawUrlMap_(ss, CREATIVE_PREVIEW_CFG.facebookRaw, 2, 6);
  const igUrlToId = CREATIVE_buildRawUrlMap_(ss, CREATIVE_PREVIEW_CFG.instagramRaw, 2, 7);
  const ttUrlToId = CREATIVE_buildRawUrlMap_(ss, CREATIVE_PREVIEW_CFG.tiktokRaw, 2, 5);

  const fbIds = [];
  const igIds = [];
  const ttIds = [];

  let metaRefreshCount = 0;
  const currentMonth = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || 'Africa/Cairo', 'yyyy-MM');
  const ordered = data.slice().sort((a, b) => {
    const month = r => r[0] instanceof Date ? Utilities.formatDate(r[0], ss.getSpreadsheetTimeZone() || 'Africa/Cairo', 'yyyy-MM') : String(r[0] || '').slice(0, 7);
    return Number(month(b) === currentMonth) - Number(month(a) === currentMonth);
  });
  ordered.forEach(row => {
    const platform = String(row[1] || '').trim();
    const url = CREATIVE_normalizeUrl_(row[5]);
    const oldPreview = String(row[25] || '').trim();

    // Refresh current-month signed CDN URLs as well as missing previews.
    // Keep the per-run API limit and prioritize current-month content.
    const rowMonth = row[0] instanceof Date ? Utilities.formatDate(row[0], ss.getSpreadsheetTimeZone() || 'Africa/Cairo', 'yyyy-MM') : String(row[0] || '').slice(0, 7);
    const needsRefresh = !oldPreview || rowMonth === currentMonth;
    if (
      needsRefresh &&
      metaRefreshCount < CREATIVE_PREVIEW_CFG.metaRefreshLimitPerRun &&
      platform === 'Facebook' &&
      fbUrlToId[url]
    ) {
      fbIds.push(fbUrlToId[url]);
      metaRefreshCount++;
    }
    if (
      needsRefresh &&
      metaRefreshCount < CREATIVE_PREVIEW_CFG.metaRefreshLimitPerRun &&
      platform === 'Instagram' &&
      igUrlToId[url]
    ) {
      igIds.push(igUrlToId[url]);
      metaRefreshCount++;
    }
    // TikTok cover URLs expire, so real TikTok rows are refreshed every run.
    if (platform === 'TikTok' && ttUrlToId[url]) ttIds.push(ttUrlToId[url]);
  });

  const fbPreview = CREATIVE_metaFacebookPreviewBatch_(CREATIVE_unique_(fbIds));
  // Respect upstream request pacing between platform batches.
  if (fbIds.length && igIds.length) Utilities.sleep(2000);
  const igPreview = CREATIVE_metaInstagramPreviewBatch_(CREATIVE_unique_(igIds));
  const ttPreview = CREATIVE_tiktokPreviewBatch_(CREATIVE_unique_(ttIds));

  const output = [];
  const counts = {
    Facebook: 0,
    Instagram: 0,
    YouTube: 0,
    TikTok: 0,
    Missing: 0,
    Error: 0
  };

  data.forEach(row => {
    const platform = String(row[1] || '').trim();
    const originalUrl = String(row[5] || '').trim();
    const normalizedUrl = CREATIVE_normalizeUrl_(originalUrl);
    const oldPreview = String(row[25] || '').trim();
    const oldSource = String(row[26] || '').trim();

    let preview = '';
    let source = '';
    let status = '';

    try {
      if (platform === 'YouTube') {
        const videoId = CREATIVE_youtubeId_(originalUrl);
        if (videoId) {
          preview = 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
          source = 'YouTube static thumbnail';
          status = 'READY';
          counts.YouTube++;
        } else {
          status = 'NO VIDEO ID';
          counts.Missing++;
        }

      } else if (platform === 'Facebook') {
        const id = fbUrlToId[normalizedUrl];
        const result = id ? fbPreview[id] : null;
        if (result && result.url) {
          preview = result.url;
          source = result.source || 'Meta Graph API';
          status = 'READY';
          counts.Facebook++;
        } else if (oldPreview) {
          preview = oldPreview;
          source = oldSource || 'Existing preview URL';
          status = 'EXISTING URL — NOT REVALIDATED';
          counts.Facebook++;
        } else {
          preview = '';
          status = id ? ((result && result.error) ? 'ERROR: ' + result.error : 'NO PREVIEW') : 'NO RAW ID MATCH';
          if (status.indexOf('ERROR:') === 0) counts.Error++; else counts.Missing++;
        }

      } else if (platform === 'Instagram') {
        const id = igUrlToId[normalizedUrl];
        const result = id ? igPreview[id] : null;
        if (result && result.url) {
          preview = result.url;
          source = result.source || 'Instagram Graph API';
          status = 'READY';
          counts.Instagram++;
        } else if (oldPreview) {
          preview = oldPreview;
          source = oldSource || 'Existing preview URL';
          status = 'EXISTING URL — NOT REVALIDATED';
          counts.Instagram++;
        } else {
          preview = '';
          status = id ? ((result && result.error) ? 'ERROR: ' + result.error : 'NO PREVIEW') : 'NO RAW ID MATCH';
          if (status.indexOf('ERROR:') === 0) counts.Error++; else counts.Missing++;
        }

      } else if (platform === 'TikTok') {
        const id = ttUrlToId[normalizedUrl];
        const result = id ? ttPreview[id] : null;
        if (result && result.url) {
          preview = result.url;
          source = 'TikTok Display API cover_image_url';
          status = 'READY — TEMP URL (~6h TTL)';
          counts.TikTok++;
        } else {
          preview = oldPreview;
          status = id ? ((result && result.error) ? 'ERROR: ' + result.error : 'NO PREVIEW') : 'NO RAW ID MATCH';
          if (status.indexOf('ERROR:') === 0) counts.Error++; else counts.Missing++;
        }

      } else {
        preview = oldPreview;
        source = oldSource;
        status = platform ? 'UNSUPPORTED PLATFORM' : '';
        if (platform) counts.Missing++;
      }

    } catch (e) {
      preview = oldPreview;
      status = 'ERROR: ' + e.message;
      counts.Error++;
    }

    output.push([preview, source, status]);
  });

  sh.getRange(2, CREATIVE_PREVIEW_CFG.previewCol, output.length, 3).setValues(output);
  sh.getRange(1, CREATIVE_PREVIEW_CFG.previewCol, 1, 3).setValues([[
    'Preview / Thumbnail URL',
    'Preview Source',
    'Preview Status'
  ]]);

  sh.setColumnWidth(CREATIVE_PREVIEW_CFG.previewCol, 330);
  sh.setColumnWidth(CREATIVE_PREVIEW_CFG.sourceCol, 220);
  sh.setColumnWidth(CREATIVE_PREVIEW_CFG.statusCol, 210);
  sh.getRange(2, CREATIVE_PREVIEW_CFG.previewCol, output.length, 3)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // Remove stale preview cells below the real content boundary.
  const staleStartRow = rowCount + 2;
  if (staleStartRow <= sh.getMaxRows()) {
    sh.getRange(
      staleStartRow,
      CREATIVE_PREVIEW_CFG.previewCol,
      sh.getMaxRows() - staleStartRow + 1,
      3
    ).clearContent();
  }

  console.log('========================================');
  console.log('✅ CREATIVE PREVIEW SYNC COMPLETE');
  console.log('Facebook READY: ' + counts.Facebook);
  console.log('Instagram READY: ' + counts.Instagram);
  console.log('YouTube READY: ' + counts.YouTube);
  console.log('TikTok READY: ' + counts.TikTok);
  console.log('Missing / unmatched: ' + counts.Missing);
  console.log('Errors: ' + counts.Error);
  console.log('========================================');
}

/**
 * Keeps Creative Analysis complete by appending current-month content that is
 * already present in the four live raw sheets. Existing reviews and scores are
 * never changed.
 */
function CREATIVE_syncCurrentInventory_(ss, creativeSheet) {
  if (
    typeof SOCIAL_DASH_API_currentContent_ !== 'function' ||
    typeof SOCIAL_DASH_API_creativeSheet_ !== 'function'
  ) {
    console.log('Creative inventory sync skipped: Social Dashboard API helpers not found.');
    return 0;
  }

  const timezone =
    typeof SOCIAL_DASH_API !== 'undefined' && SOCIAL_DASH_API.timezone
      ? SOCIAL_DASH_API.timezone
      : 'Africa/Cairo';
  const monthKey = Utilities.formatDate(new Date(), timezone, 'yyyy-MM');
  const creativeRows = SOCIAL_DASH_API_creativeSheet_(ss);
  const liveRows = SOCIAL_DASH_API_currentContent_(ss, monthKey, creativeRows);
  const existing = {};

  creativeRows.forEach(item => {
    const url = CREATIVE_normalizeUrl_(item.url);
    const name = String(item.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
    existing[String(item.platform || '') + '||' + (url || name)] = true;
  });

  const appendRows = [];
  liveRows.forEach(item => {
    const url = CREATIVE_normalizeUrl_(item.url);
    const nameKey = String(item.name || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const key = String(item.platform || '') + '||' + (url || nameKey);
    if (existing[key]) return;

    appendRows.push([
      item.date || '',
      item.platform || '',
      item.name || '',
      item.pillar || 'Other',
      item.format || 'Other',
      item.url || ''
    ]);
    existing[key] = true;
  });

  if (appendRows.length) {
    const firstEmptyContentRow = CREATIVE_contentRowCount_(creativeSheet) + 2;
    creativeSheet
      .getRange(firstEmptyContentRow, 1, appendRows.length, 6)
      .setValues(appendRows);
  }

  console.log('Creative inventory rows added: ' + appendRows.length);
  return appendRows.length;
}

/** Returns the number of real content rows using column A only. */
function CREATIVE_contentRowCount_(sheet) {
  const maxRows = sheet.getMaxRows();
  if (maxRows < 2) return 0;

  const values = sheet.getRange(2, 1, maxRows - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '' && values[i][0] !== null) return i + 1;
  }
  return 0;
}

function CREATIVE_ensurePreviewColumns_(sh) {
  if (sh.getMaxColumns() < CREATIVE_PREVIEW_CFG.statusCol) {
    sh.insertColumnsAfter(
      sh.getMaxColumns(),
      CREATIVE_PREVIEW_CFG.statusCol - sh.getMaxColumns()
    );
  }

  sh.getRange(1, CREATIVE_PREVIEW_CFG.previewCol, 1, 3).setValues([[
    'Preview / Thumbnail URL',
    'Preview Source',
    'Preview Status'
  ]]);
}

function CREATIVE_buildRawUrlMap_(ss, sheetName, idCol, urlCol) {
  const sh = ss.getSheetByName(sheetName);
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;

  const values = sh.getDataRange().getValues().slice(1);

  values.forEach(row => {
    const id = String(row[idCol - 1] || '').trim();
    const url = CREATIVE_normalizeUrl_(row[urlCol - 1]);
    if (id && url) out[url] = id;
  });

  return out;
}

function CREATIVE_metaFacebookPreviewBatch_(ids) {
  const fields = 'full_picture,attachments{media,type,url,target,subattachments{media,type,url,target}}';
  const raw = CREATIVE_metaBatchGet_(ids, fields);
  const out = {};

  ids.forEach(id => {
    const item = raw[id] || {};
    if (item.error) {
      out[id] = { error: item.error };
      return;
    }

    let url = String(item.full_picture || '').trim();
    let source = url ? 'Meta Graph API — full_picture' : '';

    if (!url) {
      const attachments = item.attachments && item.attachments.data ? item.attachments.data : [];
      const a = attachments[0] || null;

      if (a && a.media && a.media.image && a.media.image.src) {
        url = String(a.media.image.src || '').trim();
        source = 'Meta Graph API — attachment media';
      }

      if (!url && a && a.subattachments && a.subattachments.data && a.subattachments.data.length) {
        const s = a.subattachments.data[0];
        if (s.media && s.media.image && s.media.image.src) {
          url = String(s.media.image.src || '').trim();
          source = 'Meta Graph API — subattachment media';
        }
      }
    }

    out[id] = { url: url, source: source };
  });

  return out;
}

function CREATIVE_metaInstagramPreviewBatch_(ids) {
  const fields = 'media_type,media_url,thumbnail_url,permalink,children{media_type,media_url,thumbnail_url}';
  const raw = CREATIVE_metaBatchGet_(ids, fields);
  const out = {};

  ids.forEach(id => {
    const item = raw[id] || {};
    if (item.error) {
      out[id] = { error: item.error };
      return;
    }

    let url = String(item.thumbnail_url || item.media_url || '').trim();
    let source = item.thumbnail_url
      ? 'Instagram Graph API — thumbnail_url'
      : (item.media_url ? 'Instagram Graph API — media_url' : '');

    if (!url && item.children && item.children.data && item.children.data.length) {
      const first = item.children.data[0] || {};
      url = String(first.thumbnail_url || first.media_url || '').trim();
      source = first.thumbnail_url
        ? 'Instagram Graph API — child thumbnail_url'
        : (first.media_url ? 'Instagram Graph API — child media_url' : '');
    }

    out[id] = { url: url, source: source };
  });

  return out;
}

function CREATIVE_metaBatchGet_(ids, fields) {
  const out = {};
  if (!ids.length) return out;

  const props = PropertiesService.getScriptProperties();
  const token = String(props.getProperty('META_PAGE_TOKEN') || '').trim();
  if (!token) {
    ids.forEach(id => out[id] = { error: 'META_PAGE_TOKEN missing' });
    return out;
  }

  const version = (typeof META_API_VERSION !== 'undefined' && META_API_VERSION)
    ? String(META_API_VERSION)
    : 'v26.0';

  for (let i = 0; i < ids.length; i += CREATIVE_PREVIEW_CFG.metaBatchSize) {
    const chunk = ids.slice(i, i + CREATIVE_PREVIEW_CFG.metaBatchSize);

    const batch = chunk.map(id => ({
      method: 'GET',
      relative_url: version + '/' + encodeURIComponent(String(id)) + '?fields=' + encodeURIComponent(fields)
    }));

    try {
      const response = UrlFetchApp.fetch(
        'https://graph.facebook.com/',
        {
          method: 'post',
          payload: {
            access_token: token,
            batch: JSON.stringify(batch)
          },
          muteHttpExceptions: true
        }
      );

      const code = response.getResponseCode();
      const text = response.getContentText();

      if (code < 200 || code >= 300) {
        chunk.forEach(id => out[id] = { error: 'Meta batch HTTP ' + code });
        continue;
      }

      const arr = JSON.parse(text);
      arr.forEach((entry, idx) => {
        const id = chunk[idx];
        if (!entry) {
          out[id] = { error: 'Empty batch response' };
          return;
        }

        let body = {};
        try {
          body = JSON.parse(entry.body || '{}');
        } catch (e) {
          out[id] = { error: 'Invalid Meta JSON' };
          return;
        }

        if (Number(entry.code) < 200 || Number(entry.code) >= 300 || body.error) {
          const msg = body && body.error && body.error.message
            ? body.error.message
            : ('Meta object HTTP ' + entry.code);
          out[id] = { error: msg };
          return;
        }

        out[id] = body;
      });

    } catch (e) {
      chunk.forEach(id => out[id] = { error: e.message });
    }
  }

  return out;
}

function CREATIVE_tiktokPreviewBatch_(ids) {
  const out = {};
  if (!ids.length) return out;

  try {
    if (typeof TIKTOK_refreshAccessToken === 'function') {
      TIKTOK_refreshAccessToken();
    }
  } catch (e) {
    console.log('TikTok refresh before preview sync: ' + e.message);
  }

  const props = PropertiesService.getScriptProperties();
  let token = String(props.getProperty('TIKTOK_ACCESS_TOKEN') || '').trim();

  if (!token) {
    const all = props.getProperties();
    Object.keys(all).some(k => {
      if (/TIKTOK.*ACCESS.*TOKEN/i.test(k) || /ACCESS.*TOKEN.*TIKTOK/i.test(k)) {
        token = String(all[k] || '').trim();
        return !!token;
      }
      return false;
    });
  }

  if (!token) {
    ids.forEach(id => out[id] = { error: 'TikTok access token missing' });
    return out;
  }

  for (let i = 0; i < ids.length; i += CREATIVE_PREVIEW_CFG.tiktokBatchSize) {
    const chunk = ids.slice(i, i + CREATIVE_PREVIEW_CFG.tiktokBatchSize);

    try {
      const url = 'https://open.tiktokapis.com/v2/video/query/?fields=id,cover_image_url,share_url,embed_link';
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        headers: {
          Authorization: 'Bearer ' + token
        },
        contentType: 'application/json',
        payload: JSON.stringify({
          filters: {
            video_ids: chunk
          }
        }),
        muteHttpExceptions: true
      });

      const code = response.getResponseCode();
      const text = response.getContentText();

      if (code < 200 || code >= 300) {
        chunk.forEach(id => out[id] = { error: 'TikTok HTTP ' + code });
        continue;
      }

      const json = JSON.parse(text);
      const err = json && json.error ? json.error : null;
      if (err && err.code && err.code !== 'ok') {
        chunk.forEach(id => out[id] = { error: err.message || err.code });
        continue;
      }

      const videos = json && json.data && json.data.videos ? json.data.videos : [];
      videos.forEach(v => {
        if (v && v.id) {
          out[String(v.id)] = {
            url: String(v.cover_image_url || '').trim(),
            embed: String(v.embed_link || '').trim()
          };
        }
      });

      chunk.forEach(id => {
        if (!out[id]) out[id] = { error: 'Video not returned by TikTok query' };
      });

    } catch (e) {
      chunk.forEach(id => out[id] = { error: e.message });
    }
  }

  return out;
}

function CREATIVE_youtubeId_(url) {
  const s = String(url || '').trim();
  let m = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  m = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];

  m = s.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function CREATIVE_normalizeUrl_(url) {
  let s = String(url || '').trim();
  if (!s) return '';

  s = s.split('#')[0];
  s = s.split('?')[0];
  s = s.replace(/\/+$/, '');
  return s.toLowerCase();
}

function CREATIVE_unique_(arr) {
  const seen = {};
  const out = [];

  arr.forEach(v => {
    const k = String(v || '').trim();
    if (!k || seen[k]) return;
    seen[k] = true;
    out.push(k);
  });

  return out;
}
/**
 * ALMEHWAR — CREATIVE VIDEO REVIEW SYNC
 * Purpose: fetch direct reviewable video URLs for Instagram Reels
 * and write them to Creative Analysis without touching existing scores/data.
 *
 * Requires existing project function: metaGet(path, params)
 * Uses existing tabs:
 * - Creative Analysis
 * - Instagram Raw
 */

function CREATIVE_SYNC_REVIEW_VIDEOS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const creative = ss.getSheetByName('Creative Analysis');
  const igRaw = ss.getSheetByName('Instagram Raw');

  if (!creative) throw new Error('Creative Analysis sheet not found.');
  if (!igRaw) throw new Error('Instagram Raw sheet not found.');
  if (typeof metaGet !== 'function') {
    throw new Error('metaGet() not found in this Apps Script project.');
  }

  CREATIVE_VIDEO_ensureColumns_(creative);

  const raw = igRaw.getDataRange().getValues();
  if (raw.length < 2) throw new Error('Instagram Raw has no data.');

  const rawHeaders = raw[0].map(String);
  const idxMediaId = rawHeaders.indexOf('Instagram Media ID');
  const idxMediaType = rawHeaders.indexOf('Media Type');
  const idxProductType = rawHeaders.indexOf('Product Type');
  const idxLink = rawHeaders.indexOf('Link');

  if ([idxMediaId, idxMediaType, idxProductType, idxLink].some(i => i < 0)) {
    throw new Error('Required Instagram Raw columns are missing.');
  }

  // Map permalink -> latest known Instagram media row.
  const byUrl = new Map();
  raw.slice(1).forEach(r => {
    const url = CREATIVE_VIDEO_normUrl_(r[idxLink]);
    const id = String(r[idxMediaId] || '').trim();
    if (!url || !id) return;
    byUrl.set(url, {
      id,
      mediaType: String(r[idxMediaType] || '').toUpperCase(),
      productType: String(r[idxProductType] || '').toUpperCase()
    });
  });

  // Column A is the content date and is the reliable boundary for real rows.
  // getLastRow() was inflated by old status values in AE on otherwise empty rows.
  const dateValues = creative.getRange(2, 1, creative.getMaxRows() - 1, 1).getValues();
  let contentRowCount = 0;
  for (let i = dateValues.length - 1; i >= 0; i--) {
    if (dateValues[i][0] !== '' && dateValues[i][0] !== null) {
      contentRowCount = i + 1;
      break;
    }
  }

  if (contentRowCount < 1) throw new Error('Creative Analysis has no content rows.');

  const data = creative.getRange(2, 1, contentRowCount, 31).getValues();
  // A Platform=B index1, Format=E index4, URL=F index5
  // AC=29th col -> zero-based 28 in full sheet; our range begins A so same.

  let ready = 0;
  let skipped = 0;
  let missing = 0;
  let errors = 0;

  const cache = new Map(); // mediaId -> API payload
  const output = [];

  data.forEach((r, i) => {
    const platform = String(r[1] || '').trim();
    const format = String(r[4] || '').trim().toLowerCase();
    const permalink = CREATIVE_VIDEO_normUrl_(r[5]);

    let videoUrl = '';
    let source = '';
    let status = '';

    if (platform !== 'Instagram' || !['reel', 'video'].includes(format)) {
      status = 'NOT NEEDED';
      skipped++;
      output.push([videoUrl, source, status]);
      return;
    }

    const meta = byUrl.get(permalink);
    if (!meta) {
      status = 'MISSING IG RAW MATCH';
      missing++;
      output.push([videoUrl, source, status]);
      return;
    }

    try {
      let item = cache.get(meta.id);
      if (!item) {
        item = metaGet(meta.id, {
          fields: 'id,media_type,media_product_type,media_url,thumbnail_url,permalink'
        });
        cache.set(meta.id, item);
        Utilities.sleep(40);
      }

      if (item && item.media_url) {
        videoUrl = String(item.media_url);
        source = 'Instagram Graph API — media_url';
        status = 'READY';
        ready++;
      } else {
        source = 'Instagram Graph API';
        status = 'NO VIDEO MEDIA URL';
        missing++;
      }
    } catch (e) {
      source = 'Instagram Graph API';
      status = 'ERROR: ' + String(e.message || e).slice(0, 180);
      errors++;
    }

    output.push([videoUrl, source, status]);
  });

  creative.getRange(2, 29, output.length, 3).setValues(output); // AC:AE

  // Remove stale review statuses below the real content boundary.
  const staleStartRow = contentRowCount + 2;
  if (staleStartRow <= creative.getMaxRows()) {
    creative
      .getRange(staleStartRow, 29, creative.getMaxRows() - staleStartRow + 1, 3)
      .clearContent();
  }
  creative.getRange(1, 29, 1, 3)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setWrap(true);

  SpreadsheetApp.flush();

  console.log('========================================');
  console.log('✅ CREATIVE VIDEO REVIEW SYNC COMPLETE');
  console.log('Instagram review videos READY: ' + ready);
  console.log('Not needed: ' + skipped);
  console.log('Missing / no media URL: ' + missing);
  console.log('Errors: ' + errors);
  console.log('========================================');
}

function CREATIVE_VIDEO_ensureColumns_(sheet) {
  const neededCols = 31; // AE
  const current = sheet.getMaxColumns();
  if (current < neededCols) {
    sheet.insertColumnsAfter(current, neededCols - current);
  }

  const headers = [
    'Review Video URL',
    'Review Video Source',
    'Review Video Status'
  ];

  sheet.getRange(1, 29, 1, 3).setValues([headers]); // AC:AE
}

function CREATIVE_VIDEO_normUrl_(value) {
  let s = String(value || '').trim();
  if (!s) return '';
  // Remove querystring/hash and normalize trailing slash.
  s = s.split('#')[0].split('?')[0];
  s = s.replace(/\/+$/, '');
  return s;
}


/** Refresh only current-month Instagram media via the project's existing authenticated GET helper. */
function CREATIVE_SYNC_CURRENT_REVIEW_MEDIA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Creative Analysis'), raw = ss.getSheetByName('Instagram Raw');
  if (typeof metaGet !== 'function') throw new Error('Existing Meta GET helper missing');
  if (sh.getMaxColumns() < 45) sh.insertColumnsAfter(sh.getMaxColumns(), 45-sh.getMaxColumns());
  sh.getRange(1,45).setValue('Media Gallery JSON');
  const month = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM');
  const map = {}; raw.getDataRange().getValues().slice(1).forEach(r=>map[CREATIVE_VIDEO_normUrl_(r[6])] = String(r[1]||''));
  const data = sh.getRange(2,1,CREATIVE_contentRowCount_(sh),45).getValues();
  let ready=0, errors=0;
  data.forEach((r,i)=>{
    const m = r[0] instanceof Date ? Utilities.formatDate(r[0], ss.getSpreadsheetTimeZone(), 'yyyy-MM') : String(r[0]||'').slice(0,7);
    if (m!==month || r[1]!=='Instagram') return;
    const id=map[CREATIVE_VIDEO_normUrl_(r[5])]; if(!id)return;
    try {
      const item=metaGet(id,{fields:'id,media_type,media_url,thumbnail_url,children{media_type,media_url,thumbnail_url}'});
      const assets=(item.children && item.children.data && item.children.data.length ? item.children.data : [item]).map(a=>({type:a.media_type==='VIDEO'?'video':'image',url:String(a.media_url||''),previewUrl:String(a.thumbnail_url||a.media_url||'')})).filter(a=>a.url);
      if(!assets.length)throw new Error('No media returned');
      const first=assets[0], preview=String(item.thumbnail_url || (item.media_type==='IMAGE' && item.media_url) || first.previewUrl);
      sh.getRange(i+2,26,1,3).setValues([[preview,'Instagram Graph API — current media','READY — REFRESHED']]);
      sh.getRange(i+2,29,1,3).setValues([[first.url,first.type,'READY — FULL MEDIA']]);
      sh.getRange(i+2,45).setValue(JSON.stringify(assets)); ready++;
    } catch(err) { sh.getRange(i+2,31).setValue('Media refresh unavailable'); errors++; }
    Utilities.sleep(1200);
  });
  console.log('Current-month full media: ready='+ready+', errors='+errors);
}

function CREATIVE_SYNC_FACEBOOK_REVIEW_MEDIA() {
 const ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Creative Analysis'),raw=ss.getSheetByName('Facebook Raw');
 const month=Utilities.formatDate(new Date(),ss.getSpreadsheetTimeZone(),'yyyy-MM'),by={};
 raw.getDataRange().getValues().slice(1).forEach(r=>by[CREATIVE_VIDEO_normUrl_(r[5])]=String(r[1]||''));
 const data=sh.getRange(2,1,CREATIVE_contentRowCount_(sh),45).getValues();let ready=0,errors=0;
 data.forEach((r,i)=>{
  const m=r[0] instanceof Date?Utilities.formatDate(r[0],ss.getSpreadsheetTimeZone(),'yyyy-MM'):String(r[0]||'').slice(0,7);
  if(m!==month || r[1]!=='Facebook')return;
  try {
   const id=by[CREATIVE_VIDEO_normUrl_(r[5])];if(!id)return;
   const item=metaGet(id,{fields:'id,full_picture,attachments{media,type,target,subattachments{media,type,target}}'}),assets=[];
   const attachments=item.attachments&&item.attachments.data||[];
   attachments.forEach(a=>{
    const sub=a.subattachments&&a.subattachments.data||[a];
    sub.forEach(s=>{
     const preview=s.media&&s.media.image&&s.media.image.src||item.full_picture||'';
     if(String(s.type||'').indexOf('video')>=0 && s.target && s.target.id) {
      Utilities.sleep(1200);
      const v=metaGet(s.target.id,{fields:'source,picture,length'});
      if(v.source)assets.push({type:'video',url:String(v.source),previewUrl:String(preview||v.picture||'')});
     } else if(preview)assets.push({type:'image',url:String(preview),previewUrl:String(preview)});
    });
   });
   if(!assets.length && item.full_picture && !/reel|video/i.test(String(r[4])))assets.push({type:'image',url:String(item.full_picture)});
   if(assets.length){sh.getRange(i+2,45).setValue(JSON.stringify(assets));sh.getRange(i+2,29,1,3).setValues([[assets[0].url,assets[0].type,'READY — FULL MEDIA']]);ready++;}
   else errors++;
  } catch(err){errors++;}
  Utilities.sleep(1200);
 });
 SpreadsheetApp.flush();console.log('Facebook current full media: ready='+ready+', unavailable='+errors);
}

function CREATIVE_EXPORT_CURRENT_REVIEW_CONTEXT() {
 const ss=SpreadsheetApp.getActiveSpreadsheet(),month=Utilities.formatDate(new Date(),ss.getSpreadsheetTimeZone(),'yyyy-MM');
 const reviews=SOCIAL_DASH_API_creativeSheet_(ss).filter(x=>x.month===month),posts=SOCIAL_DASH_API_currentContent_(ss,month,reviews),by={};
 posts.forEach(p=>by[p.platform+'|'+CREATIVE_VIDEO_normUrl_(p.url)]=p);
 const captions={};[['Facebook Raw',5,4],['Instagram Raw',6,5]].forEach(c=>{ss.getSheetByName(c[0]).getDataRange().getValues().slice(1).forEach(r=>captions[CREATIVE_VIDEO_normUrl_(r[c[1]])]=String(r[c[2]]||''));});
 const now=Utilities.formatDate(new Date(),ss.getSpreadsheetTimeZone(),"yyyy-MM-dd'T'HH:mm:ssXXX");
 const rows=reviews.map(r=>{
  const p=by[r.platform+'|'+CREATIVE_VIDEO_normUrl_(r.url)]||{};
  const item=Object.assign({},r,p,{id:r.id,scores:r.scores,creativeScore:r.creativeScore,reviewer:r.reviewer,reviewDate:r.reviewDate,reviewBasis:r.reviewBasis,previewUrl:r.previewUrl,reviewMediaUrl:r.reviewMediaUrl,caption:captions[CREATIVE_VIDEO_normUrl_(r.url)]||p.name||r.name,metricsCapturedAt:now});
  if(item.platform==='Facebook'&&item.source==='Facebook Raw'){item.reachMetric='uniqueViewers';item.uniqueViewers=item.reach;item.engagementDenominator='Unique viewers';}
  return [r.url,JSON.stringify(item),now];
 });
 const sh=ss.getSheetByName('Creative Review Context');sh.getRange(1,1,1,3).setValues([['Content URL','Marketing review context JSON','Captured at']]);
 if(rows.length)sh.getRange(2,1,rows.length,3).setValues(rows);SpreadsheetApp.flush();console.log('Public social-content review contexts exported: '+rows.length);
}

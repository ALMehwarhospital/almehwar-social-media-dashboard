/** Public competitor audience figures only. Historic/manual figures keep their own
 * verification date; failed API calls never stamp an old number as fresh. */
const COMPETITORS_CFG = {
  sheet: 'Competitor Metrics',
  spreadsheetId: '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8',
  attemptKey: 'COMPETITORS_LAST_ATTEMPT',
  statusKey: 'COMPETITORS_LAST_RESULT',
  intervalMs: 24 * 60 * 60 * 1000,
  instagram: {
    alameda: 'alamedahealthcare',
    'saudi-german': 'sgh.egypt',
    cleopatra: 'cleopatrahospitals',
    andalusia: 'andalusiaegypt',
    newgiza: 'newgizauniversityhospital'
  }
};

function COMPETITORS_API_doGet_() {
  try {
    COMPETITORS_AUTO_refresh_();
    const sheet = SpreadsheetApp.openById(COMPETITORS_CFG.spreadsheetId).getSheetByName(COMPETITORS_CFG.sheet);
    if (!sheet) throw new Error('Competitor Metrics sheet is missing');
    const rows = sheet.getDataRange().getDisplayValues().slice(1).filter(r => r[0] && r[1]).map(r => ({
      brandId: String(r[0]).trim(), platform: String(r[1]).trim(),
      audience: COMPETITORS_num_(r[2]), sourceUrl: String(r[3] || '').trim(),
      verifiedAt: String(r[4] || '').trim(), sourceType: String(r[5] || '').trim(),
      note: String(r[6] || '').trim()
    }));
    return ContentService.createTextOutput(JSON.stringify({
      success: true, generatedAt: new Date().toISOString(),
      rows: rows,
      sync: JSON.parse(PropertiesService.getScriptProperties().getProperty(COMPETITORS_CFG.statusKey) || 'null')
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: String(error.message || error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function COMPETITORS_num_(value) {
  const number = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(number) && number >= 0 && String(value).trim() !== '' ? number : null;
}

function COMPETITORS_AUTO_refresh_() {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  if (now - Number(props.getProperty(COMPETITORS_CFG.attemptKey) || 0) < COMPETITORS_CFG.intervalMs) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    if (Date.now() - Number(props.getProperty(COMPETITORS_CFG.attemptKey) || 0) < COMPETITORS_CFG.intervalMs) return;
    props.setProperty(COMPETITORS_CFG.attemptKey, String(now));
    const sheet = SpreadsheetApp.openById(COMPETITORS_CFG.spreadsheetId).getSheetByName(COMPETITORS_CFG.sheet);
    if (!sheet) throw new Error('Competitor Metrics sheet is missing');
    const data = sheet.getDataRange().getDisplayValues();
    const today = Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd');
    const result = { attemptedAt: new Date().toISOString(), updated: [], unavailable: [] };
    const set = (brandId, platform, audience, sourceType, note) => {
      const index = data.findIndex((r, i) => i > 0 && r[0] === brandId && r[1] === platform);
      if (index < 0) return;
      sheet.getRange(index + 1, 3).setValue(audience);
      sheet.getRange(index + 1, 5, 1, 3).setValues([[today, sourceType, note]]);
      result.updated.push(brandId + ' ' + platform);
    };

    const token = String(props.getProperty('META_PAGE_TOKEN') || '').trim();
    if (token) {
      try {
        const graph = String(props.getProperty('META_GRAPH_VERSION') || 'v26.0').trim();
        const root = 'https://graph.facebook.com/' + graph;
        const options = { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true };
        const me = COMPETITORS_GRAPH_get_(root + '/me?fields=instagram_business_account{id}', options);
        const ownIg = me.instagram_business_account && me.instagram_business_account.id;
        if (!ownIg) throw new Error('Connected Instagram Business account unavailable');
        Object.keys(COMPETITORS_CFG.instagram).forEach(brandId => {
          const username = COMPETITORS_CFG.instagram[brandId];
          try {
            const fields = 'business_discovery.username(' + username + '){username,followers_count}';
            const json = COMPETITORS_GRAPH_get_(root + '/' + ownIg + '?fields=' + encodeURIComponent(fields), options);
            const found = json.business_discovery;
            if (!found || String(found.username || '').toLowerCase() !== username.toLowerCase() || !Number.isFinite(Number(found.followers_count)))
              throw new Error('Profile or follower count unavailable');
            set(brandId, 'Instagram', Number(found.followers_count), 'Meta Business Discovery', 'Official public professional profile; auto checked daily');
          } catch (error) { result.unavailable.push(brandId + ' Instagram'); }
        });
      } catch (error) { result.unavailable.push('Instagram API'); }
    } else result.unavailable.push('Instagram API');

    try {
      const response = YouTube.Channels.list('snippet,statistics', { forHandle: '@cleopatrahospitalsgroup9146' });
      const channel = response && response.items && response.items[0];
      const count = channel && channel.statistics && Number(channel.statistics.subscriberCount);
      if (channel && /cleopatra/i.test(String(channel.snippet && channel.snippet.title)) && Number.isFinite(count))
        set('cleopatra', 'YouTube', count, 'YouTube public API', 'Public subscriber count is rounded by YouTube; auto checked daily');
      else result.unavailable.push('cleopatra YouTube');
    } catch (error) { result.unavailable.push('cleopatra YouTube'); }

    props.setProperty(COMPETITORS_CFG.statusKey, JSON.stringify(result));
  } finally { lock.releaseLock(); }
}

function COMPETITORS_GRAPH_get_(url, options) {
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) throw new Error('Meta profile lookup unavailable');
  return JSON.parse(response.getContentText());
}

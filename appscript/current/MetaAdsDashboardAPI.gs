function MEHWAR_ADS_dashboardPayload_() {
  const book = SpreadsheetApp.openById(
    '1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8'
  );
  const sheet = book.getSheetByName('Meta Ads Reporting');
  if (!sheet) throw new Error('Meta Ads Reporting sheet is missing.');

  const last = sheet.getLastRow();
  const raw = last > 1
    ? sheet.getRange(2, 1, last - 1, 15).getValues()
    : [];
  const display = last > 1
    ? sheet.getRange(2, 1, last - 1, 15).getDisplayValues()
    : [];

  const numeric = value =>
    value === '' || value === null ? null : Number(value);

  const campaigns = raw.map((row, index) => {
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
    campaigns
  };
}

function MEHWAR_ADS_accountCurrency_() {
  const cache = CacheService.getScriptCache();
  const stored = cache.get('mehwars-ads-currency');
  if (stored) return stored;

  const token = PropertiesService.getScriptProperties()
    .getProperty('META_ADS_USER_TOKEN');
  if (!token) return null;

  try {
    const response = UrlFetchApp.fetch(
      'https://graph.facebook.com/v26.0/act_236301107947197?fields=currency',
      {
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      }
    );
    if (response.getResponseCode() !== 200) return null;

    const data = JSON.parse(response.getContentText());
    if (!/^[A-Z]{3}$/.test(String(data.currency || ''))) return null;

    cache.put('mehwars-ads-currency', data.currency, 21600);
    return data.currency;
  } catch (error) {
    return null;
  }
}
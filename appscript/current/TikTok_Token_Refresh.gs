function TIKTOK_refreshAccessToken() {

  const props = PropertiesService.getScriptProperties();

  const existingToken =
    String(props.getProperty('TIKTOK_ACCESS_TOKEN') || '').trim();

  const existingExpiresAt =
    Number(props.getProperty('TIKTOK_ACCESS_TOKEN_EXPIRES_AT') || 0);

  const refreshBufferMs = 10 * 60 * 1000;

  if (
    existingToken &&
    Number.isFinite(existingExpiresAt) &&
    existingExpiresAt > Date.now() + refreshBufferMs
  ) {
    console.log('✅ TikTok Access Token is still valid.');
    return existingToken;
  }

  const clientKey =
    props.getProperty('TIKTOK_CLIENT_ID');

  const clientSecret =
    props.getProperty('TIKTOK_CLIENT_SECRET');

  const refreshToken =
    props.getProperty('TIKTOK_REFRESH_TOKEN');


  if (!clientKey) {
    throw new Error('TIKTOK_CLIENT_ID غير موجود.');
  }

  if (!clientSecret) {
    throw new Error('TIKTOK_CLIENT_SECRET غير موجود.');
  }

  if (!refreshToken) {
    throw new Error('TIKTOK_REFRESH_TOKEN غير موجود.');
  }


  const formBody = [
    'client_key=' + encodeURIComponent(clientKey),
    'client_secret=' + encodeURIComponent(clientSecret),
    'grant_type=' + encodeURIComponent('refresh_token'),
    'refresh_token=' + encodeURIComponent(refreshToken)
  ].join('&');


  const response = UrlFetchApp.fetch(
    'https://open.tiktokapis.com/v2/oauth/token/',
    {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: formBody,
      muteHttpExceptions: true
    }
  );


  const status = response.getResponseCode();
  const text = response.getContentText();

  console.log('HTTP STATUS: ' + status);


  let result;

  try {
    result = JSON.parse(text);
  } catch (_) {
    throw new Error(
      'رد غير صالح من TikTok. HTTP ' + status
    );
  }


  if (
    status < 200 ||
    status >= 300 ||
    !result.access_token
  ) {

    console.log(JSON.stringify(result, null, 2));

    throw new Error(
      'TikTok token refresh failed.'
    );
  }


  const now = Date.now();

  const save = {

    TIKTOK_ACCESS_TOKEN:
      result.access_token,

    // مهم جدًا: TikTok ممكن يرجع Refresh Token جديد
    TIKTOK_REFRESH_TOKEN:
      result.refresh_token || refreshToken,

    TIKTOK_OPEN_ID:
      result.open_id ||
      props.getProperty('TIKTOK_OPEN_ID') ||
      '',

    TIKTOK_SCOPE:
      result.scope ||
      props.getProperty('TIKTOK_SCOPE') ||
      '',

    TIKTOK_TOKEN_TYPE:
      result.token_type || 'Bearer'
  };


  if (result.expires_in) {

    save.TIKTOK_ACCESS_TOKEN_EXPIRES_AT =
      String(
        now +
        Number(result.expires_in) * 1000
      );
  }


  if (result.refresh_expires_in) {

    save.TIKTOK_REFRESH_TOKEN_EXPIRES_AT =
      String(
        now +
        Number(result.refresh_expires_in) * 1000
      );
  }


  props.setProperties(save, false);


  console.log('✅ TikTok Access Token refreshed successfully.');
  console.log(
    'Scopes: ' +
    (result.scope || 'not returned')
  );

  return save.TIKTOK_ACCESS_TOKEN;
}

/**
 * AlMehwar — TikTok OAuth v2 callback.
 * Routed through the project's single global doGet in Dashboard_API.gs.
 */

const TIKTOK_REDIRECT_URI =
  'https://script.google.com/macros/s/AKfycbzQrMdze9iVov_Ag6eaq7wHDkl6onrCGBvn1zQU9f-ixEovTM8g6Sr-70783toiZqBI/exec';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

function TIKTOK_doGet_(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};

    if (params.error) {
      return TIKTOK_OAUTH_text_(
        'TIKTOK OAUTH V7\n\n' +
        'TikTok Authorization Error\n\n' +
        'Error: ' + params.error + '\n' +
        'Description: ' + (params.error_description || 'No description')
      );
    }

    const authorizationCode = params.code;
    if (!authorizationCode) {
      return TIKTOK_OAUTH_text_(
        'TIKTOK OAUTH V7 ACTIVE\n\n' +
        'No authorization code received.\n\n' +
        'This is normal if you opened the /exec URL directly.\n\n' +
        'Received parameter names:\n' + Object.keys(params).join(', ')
      );
    }

    const props = PropertiesService.getScriptProperties();
    const clientKey = props.getProperty('TIKTOK_CLIENT_ID');
    const clientSecret = props.getProperty('TIKTOK_CLIENT_SECRET');
    if (!clientKey) throw new Error('TIKTOK_CLIENT_ID is missing from Script Properties.');
    if (!clientSecret) throw new Error('TIKTOK_CLIENT_SECRET is missing from Script Properties.');

    const formBody = [
      'client_key=' + encodeURIComponent(clientKey),
      'client_secret=' + encodeURIComponent(clientSecret),
      'code=' + encodeURIComponent(authorizationCode),
      'grant_type=' + encodeURIComponent('authorization_code'),
      'redirect_uri=' + encodeURIComponent(TIKTOK_REDIRECT_URI)
    ].join('&');
    const response = UrlFetchApp.fetch(TIKTOK_TOKEN_URL, {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: formBody,
      muteHttpExceptions: true
    });
    const httpStatus = response.getResponseCode();
    const responseText = response.getContentText();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('TikTok returned an invalid response. HTTP Status: ' + httpStatus);
    }

    if (httpStatus < 200 || httpStatus >= 300 || !result.access_token) {
      return TIKTOK_OAUTH_text_(
        'TIKTOK OAUTH V7\n\n' +
        'TikTok Token Error\n\n' +
        'HTTP Status: ' + httpStatus + '\n' +
        'Error: ' + (result.error || 'Unknown error') + '\n' +
        'Description: ' + (result.error_description || 'No error description returned.') + '\n' +
        'Log ID: ' + (result.log_id || 'N/A')
      );
    }

    const now = Date.now();
    const propertiesToSave = {
      TIKTOK_ACCESS_TOKEN: result.access_token,
      TIKTOK_REFRESH_TOKEN: result.refresh_token || '',
      TIKTOK_OPEN_ID: result.open_id || '',
      TIKTOK_SCOPE: result.scope || '',
      TIKTOK_TOKEN_TYPE: result.token_type || 'Bearer'
    };
    if (result.expires_in) {
      propertiesToSave.TIKTOK_ACCESS_TOKEN_EXPIRES_AT =
        String(now + Number(result.expires_in) * 1000);
    }
    if (result.refresh_expires_in) {
      propertiesToSave.TIKTOK_REFRESH_TOKEN_EXPIRES_AT =
        String(now + Number(result.refresh_expires_in) * 1000);
    }
    props.setProperties(propertiesToSave, false);

    return TIKTOK_OAUTH_text_(
      'TIKTOK OAUTH V7\n\n' +
      'TikTok Connected Successfully!\n\n' +
      'Access Token saved securely.\n' +
      'Refresh Token saved securely.\n' +
      'Open ID saved.\n' +
      'Authorized scopes saved.\n\n' +
      'You can close this page.'
    );
  } catch (error) {
    console.error('TikTok OAuth V7 Error: ' + error.message);
    return TIKTOK_OAUTH_text_(
      'TIKTOK OAUTH V7\n\nTikTok Connection Error\n\n' + error.message
    );
  }
}

function TIKTOK_OAUTH_text_(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

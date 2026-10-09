/**
 * ALMEHWAR DASHBOARD AUTH
 * Store these two values in Apps Script > Project Settings > Script Properties:
 *   DASHBOARD_AUTH_USERNAME
 *   DASHBOARD_AUTH_PASSWORD
 *
 * Never place the password in GitHub or a Google Sheet cell.
 */
const DASHBOARD_AUTH = {
  usernameProperty: 'DASHBOARD_AUTH_USERNAME',
  passwordProperty: 'DASHBOARD_AUTH_PASSWORD',
  secretProperty: 'DASHBOARD_AUTH_SECRET',
  sessionMs: 7 * 24 * 60 * 60 * 1000,
  maxFailures: 8,
  failureWindowSeconds: 600
};

function DASHBOARD_AUTH_login_(input) {
  const username = String((input && input.username) || '').trim();
  const password = String((input && input.password) || '');
  const props = PropertiesService.getScriptProperties();
  const expectedUsername = props.getProperty(DASHBOARD_AUTH.usernameProperty) || '';
  const expectedPassword = props.getProperty(DASHBOARD_AUTH.passwordProperty) || '';

  if (!expectedUsername || !expectedPassword) {
    throw new Error('Dashboard login is not configured in Script Properties.');
  }

  const cache = CacheService.getScriptCache();
  const failureKey = 'dashboard_auth_failures_' + DASHBOARD_AUTH_digest_(username.toLowerCase()).slice(0, 24);
  const failures = Number(cache.get(failureKey) || 0);
  if (failures >= DASHBOARD_AUTH.maxFailures) {
    throw new Error('Too many login attempts. Please wait 10 minutes and try again.');
  }

  const valid = DASHBOARD_AUTH_equal_(username, expectedUsername) && DASHBOARD_AUTH_equal_(password, expectedPassword);
  if (!valid) {
    cache.put(failureKey, String(failures + 1), DASHBOARD_AUTH.failureWindowSeconds);
    throw new Error('Incorrect username or password.');
  }
  cache.remove(failureKey);

  const expiresAt = Date.now() + DASHBOARD_AUTH.sessionMs;
  const payload = {
    username: expectedUsername,
    exp: expiresAt,
    nonce: Utilities.getUuid()
  };
  const encoded = DASHBOARD_AUTH_base64Url_(JSON.stringify(payload));
  const signature = DASHBOARD_AUTH_sign_(encoded);
  return {
    token: encoded + '.' + signature,
    username: expectedUsername,
    expiresAt: new Date(expiresAt).toISOString()
  };
}

function DASHBOARD_AUTH_verify_(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Dashboard session is missing or invalid.');
  const expected = DASHBOARD_AUTH_sign_(parts[0]);
  if (!DASHBOARD_AUTH_equal_(parts[1], expected)) throw new Error('Dashboard session is invalid.');

  let payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (err) {
    throw new Error('Dashboard session is invalid.');
  }
  if (!payload || !payload.username || !payload.exp || Number(payload.exp) <= Date.now()) {
    throw new Error('Dashboard session has expired.');
  }
  const configuredUser = PropertiesService.getScriptProperties().getProperty(DASHBOARD_AUTH.usernameProperty) || '';
  if (!DASHBOARD_AUTH_equal_(String(payload.username), configuredUser)) throw new Error('Dashboard session is invalid.');
  return payload;
}

function DASHBOARD_AUTH_require_(token) {
  return DASHBOARD_AUTH_verify_(token);
}

function DASHBOARD_AUTH_sign_(encodedPayload) {
  const secret = DASHBOARD_AUTH_secret_();
  const bytes = Utilities.computeHmacSha256Signature(encodedPayload, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function DASHBOARD_AUTH_secret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty(DASHBOARD_AUTH.secretProperty);
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(DASHBOARD_AUTH.secretProperty, secret);
  }
  return secret;
}

function DASHBOARD_AUTH_base64Url_(value) {
  return Utilities.base64EncodeWebSafe(value, Utilities.Charset.UTF_8).replace(/=+$/g, '');
}

function DASHBOARD_AUTH_digest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8)
    .map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); })
    .join('');
}

function DASHBOARD_AUTH_equal_(left, right) {
  left = String(left || '');
  right = String(right || '');
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (left.charCodeAt(i % Math.max(left.length, 1)) || 0) ^ (right.charCodeAt(i % Math.max(right.length, 1)) || 0);
  }
  return mismatch === 0;
}

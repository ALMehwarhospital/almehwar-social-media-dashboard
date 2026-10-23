import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const raw = process.env.CLASPRC_JSON || '';

function validCredentials(value) {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    // clasp v3 stores named profiles under tokens; older versions use token or root fields.
    const profiles = parsed.tokens && Object.values(parsed.tokens);
    const hasToken = (entry) => entry && typeof entry === 'object' &&
      (entry.refresh_token || entry.access_token);
    if (!((profiles && profiles.some(hasToken)) || hasToken(parsed.token) || hasToken(parsed))) return null;
    return parsed;
  } catch {
    return null;
  }
}

let credentials = validCredentials(raw.trim());

if (!credentials) {
  const start = raw.indexOf('{');
  if (start >= 0) {
    for (let end = raw.lastIndexOf('}'); end > start; end = raw.lastIndexOf('}', end - 1)) {
      credentials = validCredentials(raw.slice(start, end + 1));
      if (credentials) break;
    }
  }
}

if (!credentials) {
  for (const token of raw.match(/[A-Za-z0-9+/=]{100,}/g) || []) {
    for (let length = token.length - (token.length % 4); length >= 100; length -= 4) {
      credentials = validCredentials(Buffer.from(token.slice(0, length), 'base64').toString('utf8'));
      if (credentials) break;
    }
    if (credentials) break;
  }
}

if (!credentials) {
  throw new Error('The GitHub secret is not a complete clasp credential. Copy only the complete JSON file or its base64 output.');
}

const target = join(homedir(), '.clasprc.json');
writeFileSync(target, JSON.stringify(credentials), { mode: 0o600 });
console.log('Clasp credentials parsed and saved without printing their contents.');

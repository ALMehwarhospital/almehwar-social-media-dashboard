import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const creds = JSON.parse(readFileSync(join(homedir(), '.clasprc.json'), 'utf8')).tokens.default;
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token'
  })
});
if (!tokenResponse.ok) throw new Error('OAuth refresh HTTP ' + tokenResponse.status);
const { access_token } = await tokenResponse.json();
const scriptId = '1SH1BM2Em8orwJZ4cmkaDbChd8rN3kfiN75-hDdfvLvtSg6LihYgMi86G';
const targets = {
  social: 'AKfycbypAHZgLI5YhTnqkw2bviO4-DL446iOP2Sw1cmcLmf5eajComltTpZ4HHzRwIdHN5ef',
  website: 'AKfycbyWYEVWvc4pKdV-n5c3sOmz29Kt7Pbhyx1ct0mUmDY8u9jUO7N_IaBfYtVtYAWT7245'
};
for (const [label, deploymentId] of Object.entries(targets)) {
  const response = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/deployments/${deploymentId}`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const json = await response.json();
  if (!response.ok) {
    console.log(label, 'deployment API HTTP', response.status, json.error?.message || 'unknown error');
    continue;
  }
  const manifestResponse = await fetch(`https://script.googleapis.com/v1/projects/${scriptId}/content?versionNumber=${json.deploymentConfig?.versionNumber}`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const manifestData = await manifestResponse.json();
  const manifestFile = manifestData.files?.find(file => file.name === 'appsscript' && file.type === 'JSON');
  let webapp = null;
  try { webapp = JSON.parse(manifestFile?.source || '{}').webapp || null; } catch {}
  console.log(label, 'manifest HTTP', manifestResponse.status, 'webapp', webapp);
  console.log(label, {
    versionNumber: json.deploymentConfig?.versionNumber,
    updateTime: json.updateTime,
    webApps: json.entryPoints?.filter(entry => entry.entryPointType === 'WEB_APP')
      .map(entry => ({ access: entry.webApp?.access, executeAs: entry.webApp?.executeAs }))
  });
}

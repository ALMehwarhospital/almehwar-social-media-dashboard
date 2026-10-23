import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const creds = JSON.parse(readFileSync(join(homedir(), '.clasprc.json'), 'utf8')).tokens.default;
const refreshed = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
  body: new URLSearchParams({client_id:creds.client_id,client_secret:creds.client_secret,refresh_token:creds.refresh_token,grant_type:'refresh_token'})
});
if (!refreshed.ok) throw new Error('OAuth refresh failed: '+refreshed.status);
const {access_token}=await refreshed.json();
const url='https://sheets.googleapis.com/v4/spreadsheets/1WPgUx4VpHuvSSAk2RyCpEGLrm5laDtAV0ZQhtAoLWm8/values/%27Monthly%20Overview%27!A1:B2';
const result=await fetch(url,{headers:{Authorization:'Bearer '+access_token}});
const data=await result.json();
console.log('Private spreadsheet API HTTP',result.status,'rows',data.values?.length||0,'error',data.error?.status||'none');

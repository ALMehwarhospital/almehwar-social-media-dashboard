import { readFileSync } from 'node:fs';
const html=readFileSync('/tmp/body','utf8');
const text=html
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ')
  .replace(/&[^;]{1,12};/g,' ')
  .replace(/\s+/g,' ')
  .trim();
console.log('Readable Google response:',text.slice(0,800));

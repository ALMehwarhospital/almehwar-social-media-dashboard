const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const now = Date.parse('2026-10-11T17:30:00+03:00');
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }

function load(relative, globals = {}, cache = new Map()) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env.BASE_URL', '"/dashboard/"');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports, Date: TestDate, Intl, URL, AbortController, AbortSignal, DOMException,
    window: { setTimeout, clearTimeout }, ...globals,
    require: name => { assert(name.startsWith('.')); return load(path.relative(root, path.resolve(path.dirname(file), name + '.ts')), globals, cache); },
  }, { filename: file });
  return module.exports;
}

const quality = load('src/utils/websiteQuality.ts');
assert.equal(quality.websiteNumber(''), null);
assert.equal(quality.websiteNumber(null), null);
assert.equal(quality.websiteNumber('N/A'), null);
assert.equal(quality.websiteNumber('0'), 0);
assert.equal(quality.sumWebsiteValues([]), null);
assert.equal(quality.sumWebsiteValues([null, 0]), 0);
const payload = (sc, sync = '03/10/2026 06:28') => ({
  success: true, mode: 'LIVE', periodMonth: '2026-10', generatedAt: '2026-10-11T17:00:00+03:00', lastSynced: '11/10/2026 17:00',
  sync: { ga4: '11/10/2026 17:00', searchConsole: sync },
  data: { website: [{ sessions: 100 }], conversions: [], pages: [], traffic: [], sources: [], searchConsole: { overview: [sc], details: [] } },
});
const pending = payload({ clicks: 0, impressions: 0, ctr: 0, averagePosition: 0 });
assert.equal(quality.searchConsoleState(pending, now).clicks, null);
assert.equal(quality.searchConsoleState(pending, now).status, 'Sync overdue');
const reporting = quality.searchConsoleState(payload({ clicks: 0, impressions: 100, averagePosition: null }, '11/10/2026 17:00'), now);
assert.equal(reporting.ready, true); assert.equal(reporting.clicks, 0); assert.equal(reporting.ctr, 0); assert.equal(reporting.position, null);
const zero = quality.searchConsoleState(payload({ clicks: 0, impressions: 0, status: 'Verified' }), now);
assert.equal(zero.ready, true); assert.equal(zero.clicks, 0); assert.equal(zero.ctr, null); assert.equal(zero.position, null);
assert.equal(quality.searchConsoleState(payload({ clicks: 10, impressions: 100, status: 'Error' }), now).ready, false);
assert.equal(quality.sourceFreshness('03/10/2026 06:28', '2026-09', 48, now).stale, false);
assert.equal(quality.sourceFreshness(null, '2026-10', 48, now).stale, true);
const normalized = quality.normalizeWebsiteResponse({ periodMonth: '2026-10', data: { website: [{ periodMonth: '2026-09', sessions: 999 }, { sessions: '', pageViews: '0' }] } });
assert.equal(normalized.data.website.length, 1); assert.equal(normalized.data.website[0].sessions, null); assert.equal(normalized.data.website[0].pageViews, 0);
const grouped = quality.aggregateSearchRows([{ query: 'q', clicks: 0, impressions: 100, averagePosition: null }, { query: 'q', clicks: 2, impressions: 50, averagePosition: 4 }], row => row.query).get('q');
assert.equal(grouped.clicks, 2); assert.equal(grouped.position, 4);
assert.equal(quality.aggregateSearchRows([{ clicks: null, impressions: null }], () => 'q').get('q').clicks, null);

const response = data => ({ ok: true, status: 200, json: async () => data });
async function main() {
  let calls = 0;
  let api = load('src/data/websiteLive.ts', { fetch: async () => { calls++; return response(pending); } });
  const june = await api.fetchWebsiteLive('2026-06');
  assert.equal(june.data.website[0].sessions, 5405); assert.equal(june.data.searchConsole.overview[0].clicks, 3766); assert.equal(june.data.conversions[0].formSubmits, 8); assert.equal(calls, 0);
  let immediateSnapshot = null;
  const direct = await api.fetchWebsiteLive('2026-10', { onSnapshot: snapshot => { immediateSnapshot = snapshot; } });
  assert.equal(immediateSnapshot.deliverySource, 'snapshot');
  assert.equal(immediateSnapshot.sync.searchConsole, '03/10/2026 06:28');
  assert.equal(direct.deliverySource, 'api'); assert.equal(calls, 2);
  assert.equal(quality.searchConsoleState(direct, now).clicks, null);
  calls = 0;
  api = load('src/data/websiteLive.ts', { fetch: async url => { calls++; if (String(url).startsWith('https:')) throw new Error('source unavailable'); return response(pending); } });
  const fallback = await api.fetchWebsiteLive('2026-10');
  assert.equal(fallback.deliverySource, 'snapshot'); assert.equal(fallback.sync.searchConsole, '03/10/2026 06:28'); assert(fallback.deliveryNote); assert.equal(calls, 2);
  const fresh = payload({ clicks: 0, impressions: 100 }, '11/10/2026 17:00');
  calls = 0;
  api = load('src/data/websiteLive.ts', { fetch: async () => { calls++; return response(fresh); } });
  await Promise.all([api.fetchWebsiteLive('2026-10'), api.fetchWebsiteLive('2026-10')]); assert.equal(calls, 1);
  await api.fetchWebsiteLive('2026-10', { refresh: true }); assert.equal(calls, 3);
  const old = { ...fresh, periodMonth: '2026-09' };
  api = load('src/data/websiteLive.ts', { fetch: async url => { if (String(url).startsWith('https:')) throw new Error('source unavailable'); return response(old); } });
  await assert.rejects(() => api.fetchWebsiteLive(), /source unavailable/);
  let page = 0;
  const articles = load('src/data/articleLive.ts', {
    DOMParser: class { parseFromString(html) { return { body: { textContent: html } }; } },
    fetch: async () => { page++; return { ...response([{ id: page, title: { rendered: 'Article' }, excerpt: {} }]), headers: { get: () => '2' } }; },
  });
  assert.equal((await articles.fetchArticlesForMonth('2026-09')).length, 2); assert.equal(page, 2);
  assert.equal(articles.canonicalArticlePath('https://almehwarhospital.com/a%CC%81/?utm=test'), '/á');
  console.log('PASS: zero vs missing, Search Console readiness/freshness, historical parity, stale snapshot refresh/fallback, request deduplication and article pagination.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

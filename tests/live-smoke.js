'use strict';
// Real sunnah.com run through the same harness. Needs the key:
// SUNNAH_API_KEY="$(security find-generic-password -s nnjasec-sunnah.com-api -w)" \
//   docker compose run --rm -e SUNNAH_API_KEY test node tests/live-smoke.js
const { execFileSync } = require('child_process');
const { createHarness } = require('./harness');

const key = process.env.SUNNAH_API_KEY;
if (!key) {
  console.error('SUNNAH_API_KEY is not set');
  process.exit(1);
}

// Synchronous fetch for the synchronous UrlFetchApp stand-in. Headers go
// over stdin so the key never appears in a process argument list.
const CHILD = `
let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', async () => {
  const { url, headers } = JSON.parse(input);
  try {
    const res = await fetch(url, { headers });
    process.stdout.write(JSON.stringify({ status: res.status, body: await res.text() }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: 'network' }));
  }
});`;

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Stay under each API's limit (the add-on's own pacing runs on the fake clock here).
const SPACING_MS = { 'api.sunnah.com': 1100, 'tafsir.app': 1100, 'api.quran.com': 600 };
const lastRequest = {};
function paceHost(url) {
  const host = new URL(url).host;
  const gap = SPACING_MS[host];
  if (!gap) return;
  const wait = (lastRequest[host] || 0) + gap - Date.now();
  if (wait > 0) sleepSync(wait);
  lastRequest[host] = Date.now();
}

// Retries 429s (sunnah.com rate-limits bursts) so the smoke test checks
// correctness; the unit suite covers the add-on's own 429 handling.
function liveFetch(url, params) {
  const input = JSON.stringify({ url, headers: (params && params.headers) || {} });
  for (let attempt = 0; ; attempt++) {
    paceHost(url);
    const out = JSON.parse(execFileSync(process.execPath, ['-e', CHILD], { input, maxBuffer: 20 * 1024 * 1024 }).toString());
    if (out.error) throw new Error('network error');
    if (out.status === 429 && attempt < 4) { sleepSync(2000 * 2 ** attempt); continue; }
    return { getResponseCode: () => out.status, getContentText: () => out.body, getHeaders: () => ({}) };
  }
}

const MARKUP = /<\/?[a-z][^>]*>|&[a-z]+;|&#\d+;/i;
const h = createHarness({ scriptProperties: { SUNNAH_API_KEY: key }, source: 'sunnah', fetch: liveFetch });
const failures = [];

function check(label, fn) {
  try {
    const detail = fn();
    console.log('ok  ', label, detail || '');
  } catch (e) {
    failures.push(label);
    console.log('FAIL', label, '-', e.message);
  }
}

function lookup(collection, number) {
  return h.call('fetchHadith', collection, number);
}

const ENTRIES = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'mishkat', 'musnadahmad', 'adab',
  'shamail', 'riyadussalihin', 'bulugh', 'hisn', 'virtues', 'thulathiyyat', 'nawawi', 'qudsi', 'dehlawi'];

for (const collection of ENTRIES) {
  check(`${collection}:1`, () => {
    const r = lookup(collection, '1');
    if (!r.english) throw new Error('empty English');
    if (!r.arabic) throw new Error('empty Arabic');
    if (MARKUP.test(r.english + r.arabic + r.transliteration + r.note)) throw new Error('markup left in text');
    return `${r.collectionLabel} ${r.hadithNum} [${r.gradeGroup || 'no grade'}]`;
  });
}

check('bukhari:1 grade is sahih', () => { if (lookup('bukhari', '1').gradeGroup !== 'sahih') throw new Error('not sahih'); });
check('abudawud:1 Hasan Sahih groups as sahih', () => { if (lookup('abudawud', '1').gradeGroup !== 'sahih') throw new Error('not sahih'); });
check('muslim:8 resolves to 8a', () => { const r = lookup('muslim', '8'); if (r.hadithNum !== '8a' || r.resolvedFrom !== '8') throw new Error(r.hadithNum); });
check('muslim:8b exact', () => { if (lookup('muslim', '8b').hadithNum !== '8b') throw new Error('mismatch'); });
check('shamail:5 resolves to 5, 6', () => { if (lookup('shamail', '5').hadithNum !== '5, 6') throw new Error('mismatch'); });
check('Previous from muslim:9 is 8e', () => { if (h.call('fetchAdjacentHadith', 'muslim', '9', -1).hadithNum !== '8e') throw new Error('mismatch'); });
check('hisn:1 has transliteration and reference', () => { const r = lookup('hisn', '1'); if (!r.transliteration || !r.note) throw new Error('missing parts'); });
check('qudsi:1 links to qudsi40:1', () => { if (lookup('qudsi', '1').url !== 'https://sunnah.com/qudsi40:1') throw new Error('bad link'); });
check('fawaz:abudawud:1 uses fawazahmed0', () => { if (h.call('fetchHadith', 'abudawud', '1', 'fawazahmed0').source !== 'fawazahmed0') throw new Error('wrong source'); });
check('malik:1 routes to fawazahmed0', () => { if (lookup('malik', '1').source !== 'fawazahmed0') throw new Error('wrong source'); });

const TAFSIR_CASES = [
  ['2:255', ''], ['2:255', 'tabari'], ['2:255', 'ibn-kathir.en'], ['2:255', 'maarif'],
  ['2:255', 'quran.com:saadi'], ['2:255-257', 'tafsir.app:aysar-altafasir'],
];
for (const [ref, spec] of TAFSIR_CASES) {
  check(`tafsir ${spec || '(default)'} ${ref}`, () => {
    const r = h.call('fetchTafsir', ref, spec);
    if (!r.blocks.length || !r.blocks.every((b) => b.text.length > 0)) throw new Error('empty tafsir');
    if (r.blocks.some((b) => /<\/?[a-z][^>]*>/i.test(b.text))) throw new Error('markup left in text');
    return `${r.spec} (${r.blocks.length} block${r.blocks.length > 1 ? 's' : ''})`;
  });
}
check('tafsir 2:287 is rejected before any tafsir request', () => {
  const before = h.fetches.length;
  try { h.call('fetchTafsir', '2:287', 'saadi'); } catch (e) { /* expected */ }
  if (h.fetches.slice(before).some((f) => !f.url.startsWith('https://api.alquran.cloud/'))) throw new Error('a tafsir source was called');
});
// Same rule as tools/build-tafsir-map.js: a catalog ID is fine if ANY of these
// ayahs returns text, not just 2:255 (some works don't comment on 2:255).
const SAMPLE_AYAHS = require('../tools/tafsir-sample-ayahs');
check('every catalog ID returns text for at least one sample ayah', () => {
  const map = JSON.parse(JSON.stringify(h.ctx.TAFSIR_MAP));
  const empty = [];
  let count = 0;
  for (const [key, entry] of Object.entries(map)) {
    for (const [lang, ed] of Object.entries(entry.languages)) {
      for (const [source, id] of Object.entries(ed.sources)) {
        count++;
        const found = SAMPLE_AYAHS.some(([surah, ayah]) => h.ctx.tafsirFetchText_(source, id, surah, ayah));
        if (!found) empty.push(`${key}.${lang} ${source}:${id}`);
      }
    }
  }
  if (empty.length) throw new Error('no text: ' + empty.join(', ') + ' (rerun tools/build-tafsir-map.js)');
  return `${count} IDs`;
});

console.log(failures.length ? `\n${failures.length} failed` : '\nall passed');
process.exit(failures.length ? 1 : 0);

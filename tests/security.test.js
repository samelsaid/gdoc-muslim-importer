'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createHarness, makeResponse } = require('./harness');

const ROOT = path.join(__dirname, '..');
const SENTINEL = 'SENTINEL-KEY-7f3a9c';
const API = 'https://api.sunnah.com/v1/';
const SERVER_FILES = ['Code.gs', 'Text.gs', 'Http.gs', 'Sunnah.gs', 'Grades.gs', 'Tags.gs', 'Tafsir.gs']
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

const PUBLIC_FUNCTIONS = [
  'consumeAutoRun', 'fetchAdjacentHadith', 'fetchAyah', 'fetchAyahRange', 'fetchHadith', 'fetchHadithFromFawaz',
  // getFallbackCoverage: read-only SHARED_NUMBERING lookup for Settings' D5 pair-specific help line; touches no key.
  'fetchHadithFromHadithApi', 'fetchTafsir', 'getCollectionsForSource', 'getCursorIndex', 'getDefaultGradeColors', 'getFallbackCoverage',
  'getPrefs', 'getSurahAyahCount', 'getTafsirBooks', 'insertAyahAtCursor', 'insertAyahRangeAtCursor', 'insertHadithAtCursor', 'insertHadithBlock',
  'insertQuranBlock', 'insertTafsirAtCursor', 'isSunnahAvailable', 'listTags', 'onInstall', 'onOpen', 'replaceTag', 'resolveCollectionSlug',
  'savePrefs', 'scanFromMenu', 'showSidebar', 'testHadithApiKey', 'validateAyahRange', 'validateHadithInput', 'validateSurahAyah',
];

function publicFunctions() {
  const names = [];
  for (const file of SERVER_FILES) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const m of src.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)) if (!m[1].endsWith('_')) names.push(m[1]);
  }
  return names.sort();
}

test('public server functions match the reviewed list', () => {
  assert.deepEqual(publicFunctions(), PUBLIC_FUNCTIONS);
});

test('only getSunnahKey_ reads the key property', () => {
  for (const file of SERVER_FILES) {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const uses = src.split('\n').filter((l) => /SUNNAH_KEY_PROPERTY|getScriptProperties/.test(l) && !/^var SUNNAH_KEY_PROPERTY/.test(l));
    const allowed = file === 'Sunnah.gs' ? 1 : 0;
    assert.equal(uses.length, allowed, file + ': ' + uses.join(' | '));
  }
});

const SCENARIOS = {
  ok: null,
  status401: () => makeResponse(401, '{"message":"Unauthorized"}'),
  status403: () => makeResponse(403, '{"message":"Forbidden"}'),
  status404: () => makeResponse(404, '{"error":{"code":404}}'),
  status429: () => makeResponse(429, '{"message":"Too Many Requests"}'),
  status500: () => makeResponse(500, '{"message":"Internal"}'),
  malformed: () => makeResponse(200, '<html>' + SENTINEL),
  network: (url, params) => { throw new Error('DNS failure for ' + url + ' with ' + JSON.stringify(params)); },
};

for (const [name, handler] of Object.entries(SCENARIOS)) {
  test(`the key never leaves the server (${name})`, () => {
    const h = createHarness({
      scriptProperties: { SUNNAH_API_KEY: SENTINEL },
      source: 'sunnah',
      document: ['Intro', '/hadith bukhari:1'],
      cursorIndex: 0,
      fetch: handler ? (url, params) => (url.startsWith(API) ? handler(url, params) : null) : undefined,
    });
    const outputs = [];
    const run = (fn, ...args) => {
      try {
        outputs.push(JSON.stringify(h.ctx[fn](...args)));
      } catch (e) {
        outputs.push(String(e && e.message), JSON.stringify(e));
      }
    };
    run('isSunnahAvailable');
    run('getPrefs');
    run('savePrefs', { hadithSource: 'sunnah' });
    run('getCollectionsForSource', 'sunnah');
    run('getDefaultGradeColors');
    run('fetchHadith', 'bukhari', '1');
    run('fetchAdjacentHadith', 'bukhari', '1', 1);
    run('insertHadithAtCursor', 'bukhari', '1');
    run('listTags');
    run('replaceTag', '/hadith bukhari:1');
    const everything = outputs.join('\n') + '\n' + h.logs.join('\n') + '\n' + h.alerts.join('\n') + '\n' + h.doc.getBody().getText();
    assert.ok(!everything.includes(SENTINEL), 'sentinel leaked:\n' + everything.split('\n').filter((l) => l.includes(SENTINEL)).join('\n'));
    for (const f of h.fetches.filter((x) => x.url.startsWith(API))) {
      assert.ok(!f.url.includes(SENTINEL), 'key in URL');
      assert.equal(f.headers['X-API-Key'], SENTINEL);
    }
  });
}

test('injection-style input never reaches the network', () => {
  const inputs = [
    ['bukhari', '../x'], ['bukhari', '1?x=1'], ['bukhari', 'http://evil'], ['bukhari/../../x', '1'],
    ['bukhari', '١'], ['bukhari', '1\n2'], ['bukhari', '1/2'], ['bukhari', '%2e%2e'], ['__proto__', '1'], ['constructor', '1'],
  ];
  for (const [collection, number] of inputs) {
    const h = createHarness({ scriptProperties: { SUNNAH_API_KEY: SENTINEL }, source: 'sunnah' });
    assert.throws(() => h.ctx.fetchHadith(collection, number), undefined, `${collection}:${number}`);
    assert.throws(() => h.ctx.fetchAdjacentHadith(collection, number, 1), undefined, `${collection}:${number}`);
    assert.equal(h.fetches.length, 0, `${collection}:${number} reached the network`);
  }
  const h = createHarness({ scriptProperties: { SUNNAH_API_KEY: SENTINEL }, source: 'sunnah' });
  for (const source of ['evil', 'https://evil', '__proto__', 'constructor']) {
    assert.throws(() => h.ctx.fetchHadith('bukhari', '1', source), /Invalid hadith source/, source);
    assert.throws(() => h.ctx.insertHadithAtCursor('bukhari', '1', source), /Invalid hadith source/, source);
  }
  assert.equal(h.fetches.length, 0);
});

test('the manifest allows sunnah.com and nothing new besides it', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'appsscript.json'), 'utf8'));
  assert.deepEqual(manifest.urlFetchWhitelist, [
    'https://api.alquran.cloud/', 'https://cdn.jsdelivr.net/', 'https://hadithapi.com/', 'https://api.sunnah.com/',
    'https://tafsir.app/', 'https://api.quran.com/',
  ]);
  assert.deepEqual(manifest.oauthScopes, [
    'https://www.googleapis.com/auth/documents.currentonly',
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/script.container.ui',
  ]);
});

test('clasp pushes only the add-on files', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.claspignore'), 'utf8').trim().split('\n');
  assert.deepEqual(ignore, ['**/**', '!appsscript.json', '!Code.gs', '!Text.gs', '!Http.gs', '!Sunnah.gs', '!Grades.gs', '!Tags.gs', '!Tafsir.gs', '!Sidebar.html']);
});

test('tafsir input never reaches a tafsir source unless it is valid', () => {
  const cases = [
    ['2:999', 'saadi'], ['2:255/x', 'saadi'], ['2:255', 'tafsir.app:../x'], ['2:255', 'evil:saadi'],
    ['2:255', 'quran.com:1 OR 1'], ['2:255', 'spa5k:a/b'], ['2:255', 'saadi.xx'], ['٢:٢٥٥', 'saadi'],
  ];
  for (const [ref, spec] of cases) {
    const h = createHarness();
    assert.throws(() => h.ctx.fetchTafsir(ref, spec), undefined, `${ref} ${spec}`);
    assert.throws(() => h.ctx.insertTafsirAtCursor(ref, spec), undefined, `${ref} ${spec}`);
    assert.ok(h.fetches.every((f) => f.url === 'https://api.alquran.cloud/v1/surah'), `${ref} ${spec} reached a tafsir source`);
  }
});

test('tafsir URLs are built only from the catalog or validated IDs', () => {
  const h = createHarness();
  h.call('fetchTafsir', '2:255', 'saadi');
  h.call('fetchTafsir', '2:255', 'quran.com:saadi');
  h.call('fetchTafsir', '2:255', 'ibn-kathir.en');
  const tafsirUrls = h.fetches.map((f) => f.url).filter((u) => !u.startsWith('https://api.alquran.cloud/'));
  assert.deepEqual(tafsirUrls, [
    'https://tafsir.app/get.php?src=saadi&s=2&a=255',
    'https://api.quran.com/api/v4/tafsirs/91/by_ayah/2:255',
    'https://api.quran.com/api/v4/tafsirs/169/by_ayah/2:255',
  ]);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const APP = (id, s, a) => `https://tafsir.app/get.php?src=${id}&s=${s}&a=${a}`;
const QCOM = (id, s, a) => `https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`;
const withTafsir = (tafsir, extra = {}) => createHarness(Object.assign({
  userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah', tafsir: tafsir }) },
}, extra));
const qcomBody = (text) => JSON.stringify({ tafsir: { verses: { '2:256': { id: 1 } }, resource_id: 91, text: text } });

test('D2: tafsir settings default and repair', () => {
  assert.deepEqual(createHarness().call('getPrefs').tafsir,
    { source: 'tafsir.app', language: 'ar', book: 'saadi', charLimit: 0, link: false, fallback: 'quran.com', fallbackOn: true });
  // Old saved prefs from before D4 have no fallback/fallbackOn at all.
  const legacy = createHarness({ userProperties: { prefs: JSON.stringify({ tafsir: { source: 'quran.com', book: 'tabari' } }) } }).call('getPrefs').tafsir;
  assert.equal(legacy.fallback, 'tafsir.app');
  assert.equal(legacy.fallbackOn, true);
  // A saved fallback equal to source is repaired to the other source.
  const repaired = createHarness().call('savePrefs', { tafsir: { source: 'quran.com', fallback: 'quran.com' } }).tafsir;
  assert.equal(repaired.fallback, 'tafsir.app');
  // An explicit false is honored; anything else (including omitted) stays on.
  assert.equal(createHarness().call('savePrefs', { tafsir: { fallbackOn: false } }).tafsir.fallbackOn, false);
  assert.equal(createHarness().call('savePrefs', { tafsir: {} }).tafsir.fallbackOn, true);
});

test('D4: tafsir.app down serves saadi from quran.com, pinned and cached under it', () => {
  const h = withTafsir({}, { routes: { [APP('saadi', 2, 255)]: { status: 500, body: '{}' } } });
  const r = h.call('fetchTafsir', '2:255', 'saadi');
  assert.equal(r.source, 'quran.com');
  assert.equal(r.spec, 'quran.com:saadi.ar');
  assert.equal(r.fallbackFrom, 'tafsir.app');
  assert.equal(r.blocks[0].url, '', 'only tafsir.app pages are linked');
  assert.equal(r.cached, false);
  const quranComFetches = () => h.fetches.filter((f) => f.url.startsWith('https://api.quran.com/')).length;
  const qBefore = quranComFetches();
  const again = h.call('fetchTafsir', '2:255', 'saadi');
  // tafsir.app is still down and gets retried (it's never assumed to have
  // recovered), but the text itself is served from the quran.com cache key.
  assert.equal(quranComFetches(), qBefore, 'no new quran.com request on the repeat call');
  assert.ok(again.fallbackFrom === 'tafsir.app' && again.source === 'quran.com');
  assert.equal(again.cached, false, 'the routed source was fetched live again, even though it failed');
});

test('D4: tafsir.app returning no text for the whole range also falls back', () => {
  const h = withTafsir({}, { routes: {
    [APP('saadi', 2, 256)]: { status: 200, body: JSON.stringify({ ayah: '', data: '' }) },
    [QCOM('91', 2, 256)]: { status: 200, body: qcomBody('quran.com text for 2:256') },
  } });
  const r = h.call('fetchTafsir', '2:256', 'saadi');
  assert.equal(r.source, 'quran.com');
  assert.equal(r.fallbackFrom, 'tafsir.app');
  assert.equal(r.blocks[0].text, 'quran.com text for 2:256');
  // Unlike a hard failure, tafsir.app's empty-text answer is itself cached,
  // so a repeat call is served entirely from cache on both sides.
  assert.equal(h.call('fetchTafsir', '2:256', 'saadi').cached, true);
});

test('D4: a no-text error keeps no cite note, even after the fallback also fails', () => {
  const h = withTafsir({}, { routes: {
    [APP('saadi', 2, 256)]: { status: 200, body: JSON.stringify({ ayah: '', data: '' }) },
    [QCOM('91', 2, 256)]: { status: 500, body: '{}' },
  } });
  assert.throws(() => h.ctx.fetchTafsir('2:256', 'saadi'),
    /^Error: Tafsir al-Sa'di has no separate entry for 2:256; it may be covered with a nearby ayah\. The fallback \(quran\.com\) also failed: quran\.com is unavailable right now\.$/);
});

test('D4: toggle off keeps the routed source\'s error and never calls the fallback', () => {
  const h = withTafsir({ fallbackOn: false }, { routes: { [APP('saadi', 2, 255)]: { status: 500, body: '{}' } } });
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'saadi'),
    /^Error: tafsir\.app is unavailable right now\. The same work is on quran\.com: \/tafsir quran\.com:saadi\.ar 2:255\.$/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')));
});

test('D4: an explicit source prefix never falls back', () => {
  const h = withTafsir({}, { routes: { [APP('saadi', 2, 255)]: { status: 500, body: '{}' } } });
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'tafsir.app:saadi'), /tafsir\.app is unavailable right now/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')), 'the prefix is explicit, so no fallback runs');
});

test('D4: a raw source:id (no catalog key) never falls back', () => {
  const h = withTafsir({});
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'tafsir.app:unknown-raw-id'), /^Error: tafsir\.app is unavailable right now\.$/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')), 'a raw id has no catalog key, so it never falls back');
});

test('D4: a work the fallback source lacks in that language never falls back', () => {
  // jalalayn (Arabic) is only on tafsir.app (no quran.com entry at all).
  const h = withTafsir({}, { routes: { [APP('jalalayn', 2, 255)]: { status: 500, body: '{}' } } });
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'jalalayn'), /^Error: tafsir\.app is unavailable right now\.$/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')));
});

test('D4: the fallback also failing appends its own message, then the cite note', () => {
  const h = withTafsir({}, { routes: {
    [APP('saadi', 2, 255)]: { status: 500, body: '{}' },
    [QCOM('91', 2, 255)]: { status: 500, body: '{}' },
  } });
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'saadi'),
    /^Error: tafsir\.app is unavailable right now\. The fallback \(quran\.com\) also failed: quran\.com is unavailable right now\. The same work is on quran\.com: \/tafsir quran\.com:saadi\.ar 2:255\.$/);
});

test('D4: a fallback throttle propagates retryAfterMs like a routed throttle', () => {
  const h = withTafsir({}, { routes: {
    [APP('saadi', 2, 255)]: { status: 500, body: '{}' },
    [QCOM('91', 2, 255)]: { status: 429, body: '{}', headers: { 'Retry-After': '6' } },
  } });
  let caught = null;
  try { h.ctx.fetchTafsir('2:255', 'saadi'); } catch (e) { caught = e; }
  assert.equal(caught && caught.retryAfterMs, 6000);
});

test('D4: a routed throttle never triggers the fallback', () => {
  const h = withTafsir({}, { routes: { [APP('saadi', 2, 255)]: { status: 429, body: '{}', headers: { 'Retry-After': '5' } } } });
  let caught = null;
  try { h.ctx.fetchTafsir('2:255', 'saadi'); } catch (e) { caught = e; }
  assert.equal(caught && caught.retryAfterMs, 5000);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')));
});

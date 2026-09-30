'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, makeResponse } = require('./harness');

const plain = (x) => JSON.parse(JSON.stringify(x));
const withTafsir = (tafsir, extra = {}) => createHarness(Object.assign({
  userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah', tafsir }) },
}, extra));
const route = (h, spec) => {
  const r = plain(h.ctx.routeTafsir_(spec, h.ctx.getPrefs(), '2:255'));
  return [r.source, r.id, r.language];
};

test('tafsir settings default and validate', () => {
  assert.deepEqual(createHarness().call('getPrefs').tafsir,
    { source: 'tafsir.app', language: 'ar', book: 'saadi', charLimit: 0, link: false, fallback: 'quran.com', fallbackOn: true });
  const saved = createHarness().call('savePrefs', { hadithSource: 'sunnah', tafsir: { source: 'evil', language: 'xx', book: 'nope', charLimit: 150, link: 'true' } }).tafsir;
  assert.deepEqual(saved, { source: 'tafsir.app', language: 'ar', book: 'saadi', charLimit: 0, link: true, fallback: 'quran.com', fallbackOn: true });
  assert.equal(createHarness().call('savePrefs', { tafsir: { charLimit: '1500' } }).tafsir.charLimit, 1500);
});

test('ayah references are checked against the surah list before any tafsir request', () => {
  const h = createHarness();
  assert.deepEqual(plain(h.ctx.parseAyahRef_('2:255')), { surah: 2, start: 255, end: 255, surahName: 'Al-Baqara' });
  assert.deepEqual(plain(h.ctx.parseAyahRef_(' 2:255-257 ')), { surah: 2, start: 255, end: 257, surahName: 'Al-Baqara' });
  assert.throws(() => h.ctx.parseAyahRef_('2:287'), /Al-Baqara has 286 ayahs; 2:287 doesn't exist\./);
  assert.throws(() => h.ctx.parseAyahRef_('2:255-265'), /Tafsir ranges are limited to 10 ayahs\./);
  for (const bad of ['115:1', '0:1', '2:0', '2:257-255', '2:255/x', 'x', '']) {
    assert.throws(() => h.ctx.parseAyahRef_(bad), /Invalid ayah reference/, bad);
  }
  assert.ok(h.fetches.every((f) => f.url === 'https://api.alquran.cloud/v1/surah'));
  assert.equal(h.fetches.length, 1, 'the surah list is cached');
});

test('an unavailable surah list stops the lookup with a clear message', () => {
  const h = createHarness({ routes: { 'https://api.alquran.cloud/v1/surah': { status: 503, body: '{}' } } });
  assert.throws(() => h.ctx.parseAyahRef_('2:255'), /Surah information is unavailable right now/);
});

test('the tag picks book, language, and source; defaults settle collisions', () => {
  const h = createHarness();
  assert.deepEqual(route(h, ''), ['tafsir.app', 'saadi', 'ar']);
  assert.deepEqual(route(h, 'tabari'), ['tafsir.app', 'tabari', 'ar']);
  assert.deepEqual(route(h, 'ibn-kathir.en'), ['quran.com', '169', 'en']);   // the default source lacks English
  assert.deepEqual(route(h, 'maarif'), ['quran.com', '168', 'en']);          // only language
  assert.deepEqual(route(h, 'quran.com:saadi'), ['quran.com', '91', 'ar']);  // explicit source
  assert.deepEqual(route(h, 'tafsir.app:not-a-real-id'), ['tafsir.app', 'not-a-real-id', '']);
  assert.deepEqual(route(withTafsir({ source: 'quran.com' }), 'saadi'), ['quran.com', '91', 'ar']);
  assert.deepEqual(route(withTafsir({ language: 'en' }), 'ibn-kathir'), ['quran.com', '169', 'en']);
  assert.deepEqual(route(withTafsir({ language: 'en' }), 'tabari'), ['tafsir.app', 'tabari', 'ar']);
  assert.deepEqual(route(withTafsir({ book: 'tabari' }), ''), ['tafsir.app', 'tabari', 'ar']);
});

test('impossible tags are explained', () => {
  const h = createHarness();
  const r = (spec) => () => h.ctx.routeTafsir_(spec, h.ctx.getPrefs(), '2:255');
  assert.throws(r('nosuchbook'), /Unknown tafsir "nosuchbook"\. Use a name like saadi or tabari/);
  assert.throws(r('evil:saadi'), /Unknown tafsir "evil:saadi"/);
  assert.throws(r('saadi.ur'), /Tafsir al-Sa'di has no Urdu edition\. Available: Arabic, Russian\./);
  assert.throws(r('tazkirul'), /Tazkirul Quran has no Arabic edition\. Available: English, Urdu\. Add one to the name, like tazkirul\.en\./);
  assert.throws(r('tafsir.app:saadi.ru'), /Tafsir al-Sa'di \(Russian\) is not on tafsir\.app\. The same work is on quran\.com: \/tafsir quran\.com:saadi\.ru 2:255\./);
  assert.throws(r('spa5k:saadi'), /Unknown tafsir "spa5k:saadi"/);
  assert.throws(r('quran.com:abc'), /Unknown tafsir "abc"/);
});

test('the route reproduces itself as a spec', () => {
  const h = createHarness();
  const spec = (s) => h.ctx.tafsirSpecFor_(h.ctx.routeTafsir_(s, h.ctx.getPrefs(), '2:255'));
  assert.equal(spec(''), 'tafsir.app:saadi.ar');
  assert.equal(spec('tabari'), 'tafsir.app:tabari');
  assert.equal(spec('ibn-kathir.en'), 'quran.com:ibn-kathir.en');
  assert.equal(spec('tafsir.app:not-a-real-id'), 'tafsir.app:not-a-real-id');
});

test('getTafsirBooks lists languages, books, and editions for the sidebar', () => {
  const books = createHarness().call('getTafsirBooks');
  assert.ok(books.languages.some((l) => l.value === 'ar' && l.label === 'Arabic'));
  assert.ok(books.books.some((b) => b.value === 'saadi' && b.label === "Tafsir al-Sa'di"));
  assert.ok(books.editions.some((e) => e.value === 'saadi.ar' && e.label === "Tafsir al-Sa'di (Arabic)"));
  assert.ok(books.editions.some((e) => e.value === 'ibn-kathir.en' && e.label === 'Tafsir Ibn Kathir (English, abridged)'));
  assert.ok(books.editions.some((e) => e.value === 'tabari.ar' && e.label === 'Tafsir al-Tabari'));
});

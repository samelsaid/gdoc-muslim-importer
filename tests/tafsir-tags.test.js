'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const bodyText = (h) => h.doc.getBody().getText();
const APP = (id, s, a) => `https://tafsir.app/get.php?src=${id}&s=${s}&a=${a}`;
const QCOM = (id, s, a) => `https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`;

test('listTags finds tafsir tags in every form', () => {
  const h = createHarness({ document: [
    '/tafsir 2:255', 'see /tafsir saadi 2:255-257 here', '/tafsir quran.com:saadi 2:255', '/tafsir ibn-kathir.en 2:255', '/tafsir  Saadi 2:255-257',
  ] });
  assert.deepEqual(h.call('listTags'), [
    { tag: '/tafsir 2:255', kind: 'tafsir', count: 1 },
    { tag: '/tafsir saadi 2:255-257', kind: 'tafsir', count: 2 },
    { tag: '/tafsir quran.com:saadi 2:255', kind: 'tafsir', count: 1 },
    { tag: '/tafsir ibn-kathir.en 2:255', kind: 'tafsir', count: 1 },
  ]);
});

test('replaceTag inserts tafsir and paces only uncached lookups', () => {
  const h = createHarness({ document: ['/tafsir saadi 2:255', 'and /tafsir saadi 2:255'] });
  assert.deepEqual(h.call('replaceTag', '/tafsir saadi 2:255'), { status: 'replaced', replaced: 2, reason: '', retryAfterMs: 0, cached: false, fallback: false });
  assert.doesNotMatch(bodyText(h), /\/tafsir/);
  assert.match(bodyText(h), /📚 Tafsir al-Sa'di · Al-Baqara 2:255/);
  const again = createHarness({ document: ['/tafsir saadi 2:255'] });
  again.call('fetchTafsir', '2:255', 'saadi');
  assert.equal(again.call('replaceTag', '/tafsir saadi 2:255').cached, true);
});

test('replaceTag reports fallback: true when the fallback source served it (D4)', () => {
  const h = createHarness({ document: ['/tafsir saadi 2:255'], routes: { [APP('saadi', 2, 255)]: { status: 500, body: '{}' } } });
  assert.deepEqual(h.call('replaceTag', '/tafsir saadi 2:255'), { status: 'replaced', replaced: 1, reason: '', retryAfterMs: 0, cached: false, fallback: true });
  assert.match(bodyText(h), /📚 Tafsir al-Sa'di · Al-Baqara 2:255/);
});

test('a 429 throttles the tag instead of skipping it', () => {
  const h = createHarness({ document: ['/tafsir saadi 2:255'], routes: { [APP('saadi', 2, 255)]: { status: 429, body: '{}', headers: { 'Retry-After': '5' } } } });
  assert.deepEqual(h.call('replaceTag', '/tafsir saadi 2:255'), { status: 'throttled', replaced: 0, reason: '', retryAfterMs: 5000, cached: false, fallback: false });
});

test('a quran.com 429 throttles the tag too, using its Retry-After', () => {
  const h = createHarness({
    document: ['/tafsir quran.com:saadi 2:255'],
    routes: { [QCOM('91', 2, 255)]: { status: 429, body: '{}', headers: { 'retry-after': '7' } } },
  });
  assert.deepEqual(h.call('replaceTag', '/tafsir quran.com:saadi 2:255'), { status: 'throttled', replaced: 0, reason: '', retryAfterMs: 7000, cached: false, fallback: false });
});

test('a tafsir.app 429 without Retry-After throttles for the default 10 s', () => {
  const h = createHarness({ document: ['/tafsir saadi 2:255'], routes: { [APP('saadi', 2, 255)]: { status: 429, body: '{}' } } });
  assert.deepEqual(h.call('replaceTag', '/tafsir saadi 2:255'), { status: 'throttled', replaced: 0, reason: '', retryAfterMs: 10000, cached: false, fallback: false });
});

test('only the exact tag is replaced', () => {
  const h = createHarness({ document: ['/tafsir saadi 2:255-257', '/tafsir saadi 2:25', '/tafsir saadi 2:255'] });
  h.call('replaceTag', '/tafsir saadi 2:255');
  assert.match(bodyText(h), /\/tafsir saadi 2:255-257/);
  assert.match(bodyText(h), /\/tafsir saadi 2:25\n/);
  assert.doesNotMatch(bodyText(h), /\/tafsir saadi 2:255\n|\/tafsir saadi 2:255$/);
});

test('bad tafsir tags are skipped with the reason', () => {
  const h = createHarness({ document: ['/tafsir saadi 2:287', '/tafsir saadi 2:255-266', '/tafsir nosuchbook 2:255'] });
  assert.match(h.call('replaceTag', '/tafsir saadi 2:287').reason, /Al-Baqara has 286 ayahs/);
  assert.match(h.call('replaceTag', '/tafsir saadi 2:255-266').reason, /limited to 10 ayahs/);
  assert.match(h.call('replaceTag', '/tafsir nosuchbook 2:255').reason, /Unknown tafsir "nosuchbook"/);
  assert.equal(h.call('replaceTag', '/tafsir sa(adi 2:255').status, 'skipped');
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://tafsir.app/')));
});

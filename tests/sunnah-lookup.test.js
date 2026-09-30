'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const API = 'https://api.sunnah.com/v1';
const sunnah = (opts = {}) => createHarness(Object.assign({ source: 'sunnah' }, opts));

test('muslim:8 resolves to 8a and reports what was typed', () => {
  const h = sunnah();
  const r = h.call('fetchHadith', 'muslim', '8');
  assert.equal(r.hadithNum, '8a');
  assert.equal(r.resolvedFrom, '8');
  assert.equal(r.cached, false);
  assert.deepEqual(h.fetches.map((f) => f.url), [`${API}/collections/muslim/hadiths/8`, `${API}/collections/muslim/hadiths/8%20a`]);
});

test('a repeated lookup is served from the cache, including the 404 on the way', () => {
  const h = sunnah();
  h.call('fetchHadith', 'muslim', '8');
  const before = h.fetches.length;
  const again = h.call('fetchHadith', 'muslim', '8');
  assert.equal(again.hadithNum, '8a');
  assert.equal(again.cached, true);
  assert.equal(h.fetches.length, before);
});

test('shamail:6 resolves to the combined 5, 6', () => {
  const r = sunnah().call('fetchHadith', 'shamail', '6');
  assert.equal(r.hadithNum, '5, 6');
  assert.equal(r.resolvedFrom, '6');
});

test('an exact suffixed number is fetched directly', () => {
  const h = sunnah();
  assert.equal(h.call('fetchHadith', 'muslim', '8b').hadithNum, '8b');
  assert.equal(h.fetches.length, 1);
});

test('book-scoped entries load their book once', () => {
  const h = sunnah();
  const r = h.call('fetchHadith', 'qudsi', '5');
  assert.equal(r.collectionLabel, 'Forty Hadith Qudsi');
  assert.equal(r.refDetail, '');
  assert.equal(r.url, 'https://sunnah.com/qudsi40:5');
  assert.equal(h.call('fetchHadith', 'qudsi', '6').hadithNum, '6');
  assert.throws(() => h.ctx.fetchHadith('qudsi', '41'), /Not found: Forty Hadith Qudsi 41\./);
  assert.deepEqual(h.fetches.map((f) => f.url), [`${API}/collections/forty/books/2/hadiths?limit=50`]);
});

test('Musnad Ahmad misses mention partial coverage', () => {
  // 1000 resolves to the real combined entry "1000, 1001"; 1439 is past the collection's end.
  assert.equal(sunnah().call('fetchHadith', 'musnadahmad', '1000').hadithNum, '1000, 1001');
  assert.throws(() => sunnah().ctx.fetchHadith('musnadahmad', '1439'),
    /^Error: Not found: Musnad Ahmad 1439\. sunnah\.com has only part of Musnad Ahmad\.$/);
});

test('bad numbers fail before any request', () => {
  const h = sunnah();
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1/2'), /Invalid hadith number/);
  assert.throws(() => h.ctx.fetchHadithFromSunnah_('malik', '1'), /not available on sunnah\.com/);
  assert.equal(h.fetches.length, 0);
});

test('the 61st uncached lookup in a minute is throttled with retryAfterMs', () => {
  const h = sunnah();
  for (let i = 0; i < 60; i++) h.ctx.sunnahThrottle_();
  try {
    h.ctx.sunnahThrottle_();
    assert.fail('expected throttle');
  } catch (e) {
    assert.equal(e.message, 'Too many lookups. Wait a minute and try again.');
    assert.equal(e.retryAfterMs, 30000);
  }
  h.clock.now += 30000;
  h.ctx.sunnahThrottle_();
});

test('cached lookups do not count toward the throttle', () => {
  const h = sunnah();
  h.call('fetchHadith', 'bukhari', '1');
  const bucket = Math.floor(h.clock.now / 60000);
  h.userCache.put('sunnah:rl:' + bucket, '60');
  assert.equal(h.call('fetchHadith', 'bukhari', '1').hadithNum, '1');
  assert.throws(() => h.ctx.fetchHadith('bukhari', '2'), /Too many lookups/);
});

test('a hadith larger than the cache limit is returned but not cached', () => {
  const url = `${API}/collections/bukhari/hadiths/1`;
  const fixture = JSON.parse(createHarness().fixtures.responses[url].body);
  fixture.hadith.find((x) => x.lang === 'en').body = '<p>' + 'x'.repeat(40000) + '</p>';
  const h = sunnah({ routes: { [url]: { status: 200, body: JSON.stringify(fixture) } } });
  assert.equal(h.call('fetchHadith', 'bukhari', '1').english.length, 40000);
  assert.equal(h.scriptCache.get('sunnah:v1:bukhari:1'), null);
  h.call('fetchHadith', 'bukhari', '1');
  assert.equal(h.fetches.length, 2);
});

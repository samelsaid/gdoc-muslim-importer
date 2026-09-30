'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const API = 'https://api.sunnah.com/v1';
const plain = (x) => JSON.parse(JSON.stringify(x));
const raw = (h, url) => JSON.parse(h.fixtures.responses[url].body);

test('normalizeSunnahNumber_ accepts citation forms and rejects everything else', () => {
  const h = createHarness();
  const cases = { '1': '1', '08': '8', '8a': '8 a', '8 A': '8 a', ' 8 b ': '8 b', '5, 6': '5, 6', '5,6': '5, 6', '12 b, 13': '12 b, 13' };
  for (const [input, expected] of Object.entries(cases)) assert.equal(h.ctx.normalizeSunnahNumber_(input), expected, input);
  for (const bad of ['', '0', 'a', '../x', '1?x=1', '1/2', 'http://evil', '١', '1\n2', '%2e', '123456']) {
    assert.throws(() => h.ctx.normalizeSunnahNumber_(bad), /Invalid hadith number/, JSON.stringify(bad));
  }
});

test('display and parts helpers', () => {
  const h = createHarness();
  assert.equal(h.ctx.displaySunnahNumber_('8 a'), '8a');
  assert.equal(h.ctx.displaySunnahNumber_('5, 6'), '5, 6');
  assert.deepEqual(plain(h.ctx.sunnahNumberParts_('8 e')), { first: 8, last: 8, letter: 'e' });
  assert.deepEqual(plain(h.ctx.sunnahNumberParts_('5, 6')), { first: 5, last: 6, letter: '' });
  assert.deepEqual(plain(h.ctx.sunnahNumberParts_('12 b, 13')), { first: 12, last: 13, letter: '' });
});

test('htmlToText_ strips markup, joins wrapped lines, and decodes entities', () => {
  const h = createHarness();
  assert.equal(h.ctx.htmlToText_('<p>Narrated \n X:\n</p>\n<p>\n He said &quot;hi&quot; &amp; left &#8212; ok</p>'), 'Narrated X:\nHe said "hi" & left \u2014 ok');
  const bukhari = raw(h, `${API}/collections/bukhari/hadiths/1`);
  const en = bukhari.hadith.find((x) => x.lang === 'en');
  const text = h.ctx.htmlToText_(en.body);
  assert.match(text, /^Narrated [^\n]+:\n\S/, 'narrator line, then the text on its own line');
  assert.doesNotMatch(text, /<\/?[a-z][^>]*>|&[a-z#0-9]+;/i);
  for (const line of text.split('\n')) assert.equal(line, line.trim().replace(/ {2,}/g, ' '));
});

test('buildSunnahResult_ builds the Abu Dawud 1 result with grades and link', () => {
  const h = createHarness();
  const r = plain(h.ctx.buildSunnahResult_('abudawud', raw(h, `${API}/collections/abudawud/hadiths/1`)));
  assert.equal(r.collectionLabel, 'Sunan Abi Dawud');
  assert.equal(r.hadithNum, '1');
  assert.equal(r.refDetail, 'Book 1');
  assert.equal(r.status, 'Hasan Sahih (Al-Albani)');
  assert.deepEqual(r.grades, [{ grade: 'Hasan Sahih', gradedBy: 'Al-Albani' }]);
  assert.equal(r.url, 'https://sunnah.com/abudawud:1');
  assert.equal(r.source, 'sunnah');
  assert.match(r.english, /^Narrated [^\n]+:\n\S/);
  assert.match(r.arabic, /[\u0600-\u06FF]/);
});

// Expected values come from the captured response at run time, so no
// hadith text is committed to the repo.
test('buildSunnahResult_ splits Hisn al-Muslim into transliteration, translation, and reference', () => {
  const h = createHarness();
  const fixture = raw(h, `${API}/collections/hisn/hadiths/1`);
  const en = fixture.hadith.find((x) => x.lang === 'en');
  const body = en.body.replace(/\s+/g, ' ');
  const r = plain(h.ctx.buildSunnahResult_('hisn', fixture));
  const reference = r.note.replace(/^Reference: /, '');
  for (const part of [r.transliteration, r.english, reference]) {
    assert.ok(part.length > 0);
    assert.doesNotMatch(part, /[<>\n]/);
    assert.ok(body.includes(part), 'part comes from the response body: ' + part);
  }
  assert.match(r.note, /^Reference: \S/);
  assert.ok(body.indexOf(r.transliteration) < body.indexOf(r.english), 'transliteration span precedes translation');
  assert.ok(body.indexOf(r.english) < body.indexOf(reference), 'reference span comes last');
  assert.equal(r.refDetail, en.chapterTitle.trim());
  assert.equal(r.url, 'https://sunnah.com/hisn:1');
});

test('sunnah.com links follow the confirmed formats only', () => {
  const h = createHarness();
  assert.equal(h.ctx.sunnahUrl_('muslim', '8 a'), 'https://sunnah.com/muslim:8a');
  assert.equal(h.ctx.sunnahUrl_('shamail', '5, 6'), 'https://sunnah.com/shamail:5');
  assert.equal(h.ctx.sunnahUrl_('musnadahmad', '3'), 'https://sunnah.com/ahmad:3');
  assert.equal(h.ctx.sunnahUrl_('qudsi', '10'), 'https://sunnah.com/qudsi40:10');
  assert.equal(h.ctx.sunnahUrl_('dehlawi', '1'), 'https://sunnah.com/shahwaliullah40:1');
  // The five links the user confirmed 2026-09-29 (D8).
  assert.equal(h.ctx.sunnahUrl_('mishkat', '2'), 'https://sunnah.com/mishkat:2');
  assert.equal(h.ctx.sunnahUrl_('bulugh', '1'), 'https://sunnah.com/bulugh:1');
  assert.equal(h.ctx.sunnahUrl_('hisn', '1'), 'https://sunnah.com/hisn:1');
  assert.equal(h.ctx.sunnahUrl_('virtues', '1'), 'https://sunnah.com/virtues:1');
  assert.equal(h.ctx.sunnahUrl_('thulathiyyat', '1'), 'https://sunnah.com/thulathiyyat:1');
  assert.equal(h.ctx.sunnahUrl_('muslim', '12 b, 13'), '');
});

test('an unexpected hadithNumber format still builds a result without a link', () => {
  const h = createHarness();
  const base = raw(h, `${API}/collections/bukhari/hadiths/1`);
  const odd = Object.assign({}, base, { hadithNumber: '12 b, 13' });
  const r = plain(h.ctx.buildSunnahResult_('bukhari', odd));
  assert.equal(r.hadithNum, '12 b, 13');
  assert.equal(r.url, '');
  assert.equal(h.ctx.normalizeSunnahNumber_(r.hadithNum), '12 b, 13');
});

test('sunnahGet_ sends the key only in X-API-Key and maps status codes', () => {
  const url = `${API}/collections/bukhari/hadiths/1`;
  const ok = createHarness({ scriptProperties: { SUNNAH_API_KEY: 'k-123' } });
  assert.equal(ok.ctx.sunnahGet_('/collections/bukhari/hadiths/1').hadithNumber, '1');
  assert.equal(ok.fetches[0].url, url);
  assert.equal(ok.fetches[0].headers['X-API-Key'], 'k-123');
  assert.ok(!ok.fetches[0].url.includes('k-123'));

  const cases = [
    [404, '{"error":{"code":404}}', null],
    [401, '{}', /rejected the request/],
    [403, '{"message":"Forbidden"}', /rejected the request/],
    [429, '{}', /Too many lookups/],
    [500, '{}', /unavailable right now/],
    [200, '<html>', /unavailable right now/],
  ];
  for (const [status, body, expected] of cases) {
    const h = createHarness({ routes: { [url]: { status, body } } });
    if (expected === null) assert.equal(h.ctx.sunnahGet_('/collections/bukhari/hadiths/1'), null);
    else assert.throws(() => h.ctx.sunnahGet_('/collections/bukhari/hadiths/1'), expected, String(status));
  }
  const net = createHarness({ routes: { [url]: () => { throw new Error('DNS error'); } } });
  assert.throws(() => net.ctx.sunnahGet_('/collections/bukhari/hadiths/1'), /unavailable right now/);
  const none = createHarness({ scriptProperties: {} });
  assert.throws(() => none.ctx.sunnahGet_('/collections/bukhari/hadiths/1'), /isn't set up/);
  assert.equal(none.fetches.length, 0);
});

test("a sunnah.com 429 is a throttle that carries the server's Retry-After", () => {
  const url = `${API}/collections/bukhari/hadiths/1`;
  const withHeader = createHarness({ routes: { [url]: { status: 429, body: '{}', headers: { 'Retry-After': '7' } } } });
  let caught = null;
  try { withHeader.ctx.sunnahGet_('/collections/bukhari/hadiths/1'); } catch (e) { caught = e; }
  assert.equal(caught && caught.message, 'Too many lookups. Wait a minute and try again.');
  assert.equal(caught.retryAfterMs, 7000);
  const noHeader = createHarness({ routes: { [url]: { status: 429, body: '{}' } } });
  caught = null;
  try { noHeader.ctx.sunnahGet_('/collections/bukhari/hadiths/1'); } catch (e) { caught = e; }
  assert.equal(caught && caught.retryAfterMs, 10000);
});

test('validateHadithInput returns the normalized string for sunnah.com', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.deepEqual(plain(h.ctx.validateHadithInput('muslim', '8A')), { collection: 'muslim', hadithNum: '8 a' });
  assert.throws(() => h.ctx.validateHadithInput('malik', '1'), /not available on sunnah/);
  assert.throws(() => h.ctx.validateHadithInput('bukhari', '../1'), /Invalid hadith number/);
});

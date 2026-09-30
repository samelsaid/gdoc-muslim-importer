'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const bodyText = (h) => h.doc.getBody().getText();

test('listTags returns distinct tags in document order with counts', () => {
  const h = createHarness({ source: 'sunnah', document: [
    'a /hadith muslim:8a b', '/quran 1:1', 'c /hadith bukhari:1', '/hadith Muslim:8A again', '/hadith  bukhari:1',
  ] });
  assert.deepEqual(h.call('listTags'), [
    { tag: '/hadith muslim:8a', kind: 'hadith', count: 2 },
    { tag: '/quran 1:1', kind: 'quran', count: 1 },
    { tag: '/hadith bukhari:1', kind: 'hadith', count: 2 },
  ]);
});

test('the hadith tag grammar stops at the number', () => {
  const h = createHarness({ source: 'sunnah', document: ['/hadith muslim:9 a narration', '/hadith muslim:8ab', '/hadith muslim:8a-x'] });
  assert.deepEqual(h.call('listTags').map((t) => t.tag), ['/hadith muslim:9']);
});

test('replaceTag replaces every occurrence, including capitals and extra spaces', () => {
  const h = createHarness({ source: 'sunnah', document: ['one /hadith bukhari:1', 'two /hadith  bukhari:1'] });
  const r = h.call('replaceTag', '/hadith bukhari:1');
  assert.deepEqual(r, { status: 'replaced', replaced: 2, reason: '', retryAfterMs: 0, cached: false, fallback: false });
  assert.doesNotMatch(bodyText(h), /\/hadith/);
  assert.match(bodyText(h), /📖 Sahih al-Bukhari 1 · Book 1/);

  const upper = createHarness({ source: 'sunnah', document: ['x /hadith Muslim:8A'] });
  const tag = upper.call('listTags')[0].tag;
  assert.equal(upper.call('replaceTag', tag).replaced, 1);
});

test('a shorter tag does not replace the prefix of a longer one', () => {
  const h = createHarness({ source: 'sunnah', document: ['/hadith muslim:8a', '/hadith muslim:9'] });
  h.call('replaceTag', '/hadith muslim:9');
  assert.match(bodyText(h), /\/hadith muslim:8a/);
  const q = createHarness({ document: ['/quran 1:1-2', 'and /quran 1:1'] });
  q.call('replaceTag', '/quran 1:1');
  assert.match(bodyText(q), /\/quran 1:1-2/);
});

test('a not-found hadith is skipped with the lookup message and paced', () => {
  const h = createHarness({ source: 'sunnah', document: ['/hadith musnadahmad:1439'] });
  assert.deepEqual(h.call('replaceTag', '/hadith musnadahmad:1439'), {
    status: 'skipped', replaced: 0, reason: 'Not found: Musnad Ahmad 1439. sunnah.com has only part of Musnad Ahmad.', retryAfterMs: 0, cached: false, fallback: false,
  });
  assert.match(bodyText(h), /\/hadith musnadahmad:1439/);
});

test('a throttled lookup reports throttled and leaves the tag', () => {
  const h = createHarness({ source: 'sunnah', document: ['/hadith bukhari:2'] });
  h.userCache.put('sunnah:rl:' + Math.floor(h.clock.now / 60000), '60');
  assert.deepEqual(h.call('replaceTag', '/hadith bukhari:2'), { status: 'throttled', replaced: 0, reason: '', retryAfterMs: 30000, cached: false, fallback: false });
  assert.match(bodyText(h), /\/hadith bukhari:2/);
});

test('cached sunnah.com lookups and Quran tags need no pacing', () => {
  const h = createHarness({ source: 'sunnah', document: ['/hadith bukhari:1', '/quran 1:1'] });
  h.call('fetchHadith', 'bukhari', '1');
  assert.equal(h.call('replaceTag', '/hadith bukhari:1').cached, true);
  assert.equal(h.call('replaceTag', '/quran 1:1').cached, true);
  assert.doesNotMatch(bodyText(h), /\/quran 1:1/);
  assert.match(bodyText(h), /﴾ .+ 1:1/);
});

test('a lettered tag routes to sunnah.com even when the default is fawazahmed0', () => {
  const h = createHarness({ source: 'fawazahmed0', document: ['/hadith muslim:8a'] });
  assert.equal(h.call('replaceTag', '/hadith muslim:8a').status, 'replaced');
  assert.match(bodyText(h), /📖 Sahih Muslim 8a · Book 1/);
});

test('a source prefix picks that source and its numbering', () => {
  const h = createHarness({ source: 'sunnah', document: ['/hadith fawaz:abudawud:1', '/hadith abudawud:1'] });
  assert.deepEqual(h.call('listTags').map((t) => t.tag), ['/hadith fawaz:abudawud:1', '/hadith abudawud:1']);
  const r = h.call('replaceTag', '/hadith fawaz:abudawud:1');
  assert.equal(r.replaced, 1, 'the unprefixed tag is a different citation');
  assert.equal(r.cached, true, 'fawazahmed0 needs no pacing');
  assert.match(bodyText(h), /📖 Sunan Abi Dawud — Hadith 1 \(Book /);
  assert.match(bodyText(h), /\/hadith abudawud:1/);
  assert.ok(h.fetches.every((f) => f.url.startsWith('https://cdn.jsdelivr.net/')));
});

test('without the sunnah.com key, a Muslim tag is skipped with a note on other numberings', () => {
  const h = createHarness({ scriptProperties: {}, source: 'sunnah', document: ['/hadith muslim:100'] });
  const r = h.call('replaceTag', '/hadith muslim:100');
  assert.equal(r.status, 'skipped');
  assert.match(r.reason, /Other ways to cite Sahih Muslim: \/hadith fawaz:muslim:<number> \(fawazahmed0 numbering\)/);
  assert.equal(h.fetches.length, 0);
});

test('a tag inside a table is skipped with a reason and the run continues', () => {
  const h = createHarness({ source: 'sunnah', document: [{ table: '/hadith bukhari:1' }] });
  const r = h.call('replaceTag', '/hadith bukhari:1');
  assert.equal(r.status, 'skipped');
  assert.equal(r.reason, "Tags inside tables can't be replaced; move the tag out of the table.");
});

test('strings that are not tags are skipped without a request', () => {
  const h = createHarness({ source: 'sunnah', document: [] });
  for (const bad of ['', '/hadith bukhari:../1', 'http://evil', '/hadith bukhari:1; drop']) {
    assert.equal(h.call('replaceTag', bad).status, 'skipped');
  }
  assert.equal(h.fetches.length, 0);
});

test('the menu opens the sidebar and arms a one-time auto-run for this doc', () => {
  const h = createHarness();
  h.call('onOpen');
  assert.deepEqual(h.menuItems.find((m) => m[0] === 'Scan & Replace Tags'), ['Scan & Replace Tags', 'scanFromMenu']);
  h.call('scanFromMenu');
  assert.equal(h.sidebars.length, 1);
  assert.equal(h.call('consumeAutoRun'), true);
  assert.equal(h.call('consumeAutoRun'), false);
  assert.equal(typeof h.ctx.scanAndReplace, 'undefined');
});

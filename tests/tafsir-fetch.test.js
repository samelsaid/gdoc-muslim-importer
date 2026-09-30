'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const APP = (id, s, a) => `https://tafsir.app/get.php?src=${id}&s=${s}&a=${a}`;
const plain = (x) => JSON.parse(JSON.stringify(x));
const fixtureBody = (h, url) => h.fixtures.responses[url].body;

test('tafsirNotes_ turns [[notes]] into [notes] and records where they are', () => {
  const h = createHarness();
  assert.deepEqual(plain(h.ctx.tafsirNotes_('abc [[note one]] def [[ two ]]')), { text: 'abc [note one] def [two]', notes: [[4, 13], [19, 23]] });
  assert.deepEqual(plain(h.ctx.tafsirNotes_('plain')), { text: 'plain', notes: [] });
});

test('the character limit cuts at a paragraph break and drops a note it would split', () => {
  const h = createHarness();
  const parts = { text: 'first paragraph here\nsecond [note that is long] end', notes: [[28, 46]] };
  assert.deepEqual(plain(h.ctx.tafsirLimit_(parts, 0)), { text: parts.text, notes: parts.notes, truncated: false });
  const cut = plain(h.ctx.tafsirLimit_(parts, 35));
  assert.equal(cut.text, 'first paragraph here …');
  assert.deepEqual(cut.notes, []);
  assert.equal(cut.truncated, true);
  // No newline falls in the fallback half of the limit, so the cut lands mid-note (5–15 straddles cut=10):
  // the split-note loop must drop it, not just the notes-kept-before-cut filter.
  const split = plain(h.ctx.tafsirLimit_({ text: 'aaaa [note here] bbbb', notes: [[5, 15]] }, 10));
  assert.equal(split.text, 'aaaa …');
  assert.deepEqual(split.notes, []);
});

test('fetchTafsir returns Sa\'di from tafsir.app by default, from the real response', () => {
  const h = createHarness();
  const r = h.call('fetchTafsir', '2:255', '');
  const raw = JSON.parse(fixtureBody(h, APP('saadi', 2, 255))).data.replace(/\r\n?/g, '\n').trim();
  assert.equal(r.spec, 'tafsir.app:saadi.ar');
  assert.equal(r.source, 'tafsir.app');
  assert.equal(r.rtl, true);
  assert.equal(r.blocks.length, 1);
  assert.equal(r.blocks[0].header, "Tafsir al-Sa'di · Al-Baqara 2:255");
  assert.equal(r.blocks[0].text, h.ctx.tafsirNotes_(raw).text);
  assert.equal(r.blocks[0].url, 'https://tafsir.app/saadi/2/255');
  assert.equal(r.cached, false);
});

test('quran.com HTML becomes plain text; English reads left to right', () => {
  const h = createHarness();
  const q = h.call('fetchTafsir', '2:255', 'quran.com:saadi');
  assert.doesNotMatch(q.blocks[0].text, /<\/?[a-z][^>]*>/i);
  assert.equal(q.blocks[0].url, '');
  const s = h.call('fetchTafsir', '2:255', 'ibn-kathir.en');
  assert.equal(s.rtl, false);
  assert.equal(s.blocks[0].header, 'Tafsir Ibn Kathir (English, abridged) · Al-Baqara 2:255');
  assert.ok(s.blocks[0].text.length > 100);
});

test('the character limit setting applies to fetched text', () => {
  const h = createHarness({ userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah', tafsir: { charLimit: 500 } }) } });
  const r = h.call('fetchTafsir', '2:255', 'tabari');
  assert.ok(r.blocks[0].text.length <= 502, 'within the limit plus the ellipsis');
  assert.ok(r.blocks[0].text.endsWith(' …'));
  assert.equal(r.blocks[0].truncated, true);
});

test('a range merges identical neighbours and skips empty entries', () => {
  const base = createHarness();
  const same = fixtureBody(base, APP('saadi', 2, 255));
  const h = createHarness({ routes: {
    [APP('saadi', 2, 256)]: { status: 200, body: same },
    [APP('saadi', 2, 257)]: { status: 200, body: JSON.stringify({ ayah: '', data: '' }) },
  } });
  const r = h.call('fetchTafsir', '2:255-257', 'saadi');
  assert.equal(r.blocks.length, 1);
  assert.equal(r.blocks[0].ayahStart, 255);
  assert.equal(r.blocks[0].ayahEnd, 256);
  assert.equal(r.blocks[0].header, "Tafsir al-Sa'di · Al-Baqara 2:255–256");
  // D4: a per-ayah gap (257 here) is normal and never triggers the fallback,
  // even though tafsir.fallbackOn defaults to true.
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')), 'a partial gap never triggers the fallback');
});

// D4 fallback is exercised in tests/tafsir-fallback.test.js. These two keep
// the fallback toggled off, so they cover the same "no fallback" errors as
// before D4, unchanged: a no-text error (route ran, just no entry for this
// ayah/range) never gets a cite note, because other sources may have the
// exact same gap — that's still true whether or not a fallback was tried.
const offPrefs = (extra = {}) => Object.assign({
  userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah', tafsir: { fallbackOn: false } }) },
}, extra);

test('empty entries explain themselves (fallback off)', () => {
  const h = createHarness(offPrefs({ routes: { [APP('saadi', 2, 256)]: { status: 200, body: JSON.stringify({ ayah: '', data: '' }) } } }));
  assert.throws(() => h.ctx.fetchTafsir('2:256', 'saadi'), /^Error: Tafsir al-Sa'di has no separate entry for 2:256; it may be covered with a nearby ayah\.$/);
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'tafsir.app:nope'),
    /^Error: tafsir\.app returned no text for "nope" at 2:255\. Check the ID; the ayah may also be covered with a nearby ayah\.$/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')));
});

test('a failed source names the other sources, with no silent fallback (fallback off)', () => {
  const h = createHarness(offPrefs({ routes: { [APP('saadi', 2, 255)]: { status: 500, body: '{}' } } }));
  assert.throws(() => h.ctx.fetchTafsir('2:255', 'saadi'),
    /^Error: tafsir\.app is unavailable right now\. The same work is on quran\.com.*\/tafsir quran\.com:saadi\.ar 2:255/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://api.quran.com/')), 'no automatic fallback');
});

test('lookups are cached; oversized entries are not', () => {
  const h = createHarness();
  h.call('fetchTafsir', '2:255', 'saadi');
  const n = h.fetches.length;
  assert.equal(h.call('fetchTafsir', '2:255', 'saadi').cached, true);
  assert.equal(h.fetches.length, n);
  const big = JSON.parse(fixtureBody(h, APP('tabari', 2, 255))).data;
  assert.ok(big.length > 30000, 'fixture precondition: Tabari 2:255 is over the cache limit');
  h.call('fetchTafsir', '2:255', 'tabari');
  const m = h.fetches.length;
  h.call('fetchTafsir', '2:255', 'tabari');
  assert.equal(h.fetches.length, m + 1, 'oversized text is fetched again');
});

test('tafsir.app requests are paced; a long queue is a quiet throttle', () => {
  const h = createHarness();
  h.call('fetchTafsir', '2:255-257', 'saadi');
  assert.ok(h.scriptCache.get('pace:tafsir.app'), 'tafsir.app pacing recorded');
  const busy = createHarness();
  busy.scriptCache.put('pace:tafsir.app', String(busy.clock.now + 8000));
  let caught = null;
  try { busy.ctx.fetchTafsir('2:255', 'saadi'); } catch (e) { caught = e; }
  assert.equal(caught && caught.retryAfterMs, 8000, 'the throttle keeps retryAfterMs (not wrapped with a cite note)');
});

test('a 429 from tafsir.app throttles instead of failing outright', () => {
  const h = createHarness({ routes: { [APP('saadi', 2, 255)]: { status: 429, body: '{}', headers: { 'Retry-After': '5' } } } });
  let caught = null;
  try { h.ctx.fetchTafsir('2:255', 'saadi'); } catch (e) { caught = e; }
  assert.equal(caught && caught.retryAfterMs, 5000, 'the throttle carries retryAfterMs, not a generic unavailable error');
});

test('an out-of-range ayah never reaches a tafsir source', () => {
  const h = createHarness();
  assert.throws(() => h.ctx.fetchTafsir('2:999', 'saadi'), /Al-Baqara has 286 ayahs/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://tafsir.app/')));
});

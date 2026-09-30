'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const routeWith = (h) => (collection, number, requested) =>
  JSON.parse(JSON.stringify(h.ctx.routeHadith_(collection, number, requested || '', h.ctx.getPrefs())));

test('the citation picks the source; the default settles only collisions', () => {
  const route = routeWith(createHarness({ source: 'fawazahmed0' })); // key configured, default fawazahmed0
  assert.deepEqual(route('muslim', '8a'), { canonical: 'muslim', source: 'sunnah' });        // sunnah.com-only format
  assert.deepEqual(route('bukhari', '5, 6'), { canonical: 'bukhari', source: 'sunnah' });    // sunnah.com combined numbering
  assert.deepEqual(route('adab', '1'), { canonical: 'adab', source: 'sunnah' });             // only sunnah.com has it
  assert.deepEqual(route('malik', '1'), { canonical: 'malik', source: 'fawazahmed0' });      // only fawazahmed0 has it
  assert.deepEqual(route('bukhari', '1'), { canonical: 'bukhari', source: 'fawazahmed0' });  // collision: user default
  assert.deepEqual(route('abu-dawood', '1'), { canonical: 'abudawud', source: 'fawazahmed0' });
  assert.deepEqual(route('bukhari', '1', 'sunnah'), { canonical: 'bukhari', source: 'sunnah' }); // explicit
  assert.deepEqual(routeWith(createHarness({ source: 'sunnah' }))('bukhari', '1'), { canonical: 'bukhari', source: 'sunnah' });
});

test('explicit sources and impossible citations are explained', () => {
  const route = routeWith(createHarness({ source: 'sunnah' }));
  assert.throws(() => route('bukhari', '1', 'evil'), /Invalid hadith source: evil/);
  assert.throws(() => route('muslim', '8a', 'fawazahmed0'), /Letters like 8a are sunnah\.com numbering; fawazahmed0 numbers use digits only\./);
  assert.throws(() => route('bukhari', '5, 6', 'fawazahmed0'), /Numbers like 5, 6 are sunnah\.com numbering; fawazahmed0 numbers use digits only\./);
  assert.throws(() => route('adab', '1', 'fawazahmed0'),
    /Al-Adab Al-Mufrad is not on fawazahmed0\. Other ways to cite Al-Adab Al-Mufrad: \/hadith sunnah:adab:<number> \(sunnah\.com numbering\)\./);
  assert.throws(() => route('malik', '5a'), /Letters like 5a are sunnah\.com numbering, and sunnah\.com doesn't have Muwatta Malik\./);
  assert.throws(() => route('malik', '5, 6'), /Numbers like 5, 6 are sunnah\.com numbering, and sunnah\.com doesn't have Muwatta Malik\./);
});

test('routeHadith_ no longer auto-falls-back on a missing key (D3: the fetch path does, via the toggle)', () => {
  const route = routeWith(createHarness({ scriptProperties: {}, source: 'sunnah' })); // saved default sunnah.com, key gone
  assert.throws(() => route('bukhari', '1'),
    /^Error: sunnah\.com isn't available in this copy of the add-on\. Other ways to cite Sahih al-Bukhari: \/hadith fawaz:bukhari:<number> \(fawazahmed0 numbering\), \/hadith hadithapi:bukhari:<number> \(hadithapi\.com numbering\)\.$/);
  assert.throws(() => route('muslim', '100'),
    /^Error: sunnah\.com isn't available in this copy of the add-on\. Other ways to cite Sahih Muslim: \/hadith fawaz:muslim:<number> \(fawazahmed0 numbering\), \/hadith hadithapi:muslim:<number> \(hadithapi\.com numbering\)\.$/);
  assert.throws(() => route('muslim', '8a'), /sunnah\.com isn't available/);
  assert.throws(() => route('bukhari', '1', 'sunnah'), /sunnah\.com isn't available/); // explicit: no fallback
});

test('hadithapi.com needs the user key', () => {
  const route = routeWith(createHarness({ source: 'sunnah' }));
  assert.throws(() => route('silsilasahiha', '5'), /hadithapi\.com needs your API key in Settings\./);
});

test('fetchHadith follows the route and records the source', () => {
  const h = createHarness({ source: 'fawazahmed0' });
  assert.equal(h.call('fetchHadith', 'muslim', '8a').source, 'sunnah');
  assert.equal(h.call('fetchHadith', 'abudawud', '1').source, 'fawazahmed0');
  assert.equal(h.call('fetchHadith', 'abudawud', '1', 'sunnah').source, 'sunnah');
});

test('a manual copy without the key cites Bukhari through fawazahmed0', () => {
  const h = createHarness({ scriptProperties: {}, source: 'sunnah' });
  assert.equal(h.call('fetchHadith', 'bukhari', '1').source, 'fawazahmed0');
  assert.ok(h.fetches.every((f) => !f.url.startsWith('https://api.sunnah.com/')));
});

test("empty or negative hadith numbers get the number validator's message, not a misleading sunnah.com note", () => {
  const h = createHarness();
  for (const bad of ['', '-5']) {
    assert.throws(() => h.ctx.fetchHadith('malik', bad), (e) => {
      assert.equal(e.message, 'Invalid hadith number: must be a positive integer');
      assert.doesNotMatch(e.message, /sunnah\.com numbering/);
      return true;
    }, bad);
  }
});

test('combined and lettered sunnah.com numbers still route to sunnah.com', () => {
  const route = routeWith(createHarness({ source: 'fawazahmed0' }));
  assert.deepEqual(route('bukhari', '5, 6'), { canonical: 'bukhari', source: 'sunnah' });
  assert.deepEqual(route('muslim', '8a'), { canonical: 'muslim', source: 'sunnah' });
  assert.deepEqual(route('muslim', '12 b, 13'), { canonical: 'muslim', source: 'sunnah' });
});

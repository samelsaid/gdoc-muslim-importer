'use strict';
// D3: hadith fallback (defaults, toggle, SHARED_NUMBERING gate, error text,
// and the three fallback failure paths), plus BUG-005 (known-empty routing).
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const SUNNAH = 'https://api.sunnah.com/v1';
const FAWAZ = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
const bukhariSunnahUrl = `${SUNNAH}/collections/bukhari/hadiths/1`;
const muslimSunnahUrl = `${SUNNAH}/collections/muslim/hadiths/100`;
const bukhariFawazEngUrl = `${FAWAZ}/eng-bukhari/1.json`;

const prefsHarness = (prefs, extra) => createHarness(Object.assign(
  { userProperties: { prefs: JSON.stringify(prefs) } }, extra || {}
));

const sunnahMishkatBody = {
  collection: 'mishkat', bookNumber: '1', hadithNumber: '1',
  hadith: [
    { lang: 'en', chapterTitle: '', body: '<p>Narrated Someone:</p><p>text</p>', grades: [] },
    { lang: 'ar', chapterTitle: '', body: '<p>عربي</p>', grades: [] },
  ],
};

test('BUG-005: saved default hadithapi.com still routes mishkat:1 to sunnah.com (known-empty)', () => {
  const h = prefsHarness(
    { hadithSource: 'hadithapi', hadithApiKey: 'k' },
    { routes: { [`${SUNNAH}/collections/mishkat/hadiths/1`]: { status: 200, body: sunnahMishkatBody } } }
  );
  const r = h.call('fetchHadith', 'mishkat', '1');
  assert.equal(r.source, 'sunnah');
  assert.ok(h.fetches.some((f) => f.url === `${SUNNAH}/collections/mishkat/hadiths/1`));
  assert.ok(!h.fetches.some((f) => f.url.startsWith('https://hadithapi.com/')));
});

test('default sunnah.com, fallback fawazahmed0 on: sunnah.com down serves bukhari:1 from fawazahmed0', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true },
    { routes: { [bukhariSunnahUrl]: { status: 500, body: '{}' } } }
  );
  const r = h.call('fetchHadith', 'bukhari', '1');
  assert.equal(r.source, 'fawazahmed0');
  assert.equal(r.fallbackFrom, 'sunnah.com');
});

test('the same setup on muslim:100 (not SHARED_NUMBERING) skips with the "No fallback" note and cite note', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true },
    { routes: { [muslimSunnahUrl]: { status: 500, body: '{}' } } }
  );
  assert.throws(() => h.ctx.fetchHadith('muslim', '100'),
    /^Error: sunnah\.com is unavailable right now\. Try again shortly, or choose another source in Settings\. No fallback: fawazahmed0 isn't confirmed to number Sahih Muslim the same way\. Other ways to cite Sahih Muslim: \/hadith fawaz:muslim:<number> \(fawazahmed0 numbering\), \/hadith hadithapi:muslim:<number> \(hadithapi\.com numbering\)\.$/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith(FAWAZ)));
});

test('the fallback also fails: the sunnah.com message, then "The fallback (fawazahmed0) also failed: ..."', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true },
    {
      routes: {
        [bukhariSunnahUrl]: { status: 500, body: '{}' },
        [bukhariFawazEngUrl]: { status: 403, body: '{}' },
      },
    }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1'), (e) => {
    assert.equal(e.message,
      "sunnah.com is unavailable right now. Try again shortly, or choose another source in Settings. The fallback (fawazahmed0) also failed: Hadith not found: bukhari #1. Other ways to cite Sahih al-Bukhari: /hadith fawaz:bukhari:<number> (fawazahmed0 numbering), /hadith hadithapi:bukhari:<number> (hadithapi.com numbering).");
    return true;
  });
});

test('a fallback throttle (a real 429 with Retry-After) propagates retryAfterMs untouched', () => {
  // default fawazahmed0, fallback sunnah: fawazahmed0 fails, sunnah.com
  // (the fallback) 429s with a real Retry-After, through rateLimitedFromResponse_.
  const h = prefsHarness(
    { hadithSource: 'fawazahmed0', hadithFallback: 'sunnah', hadithFallbackOn: true },
    {
      routes: {
        [bukhariFawazEngUrl]: { status: 500, body: '{}' },
        [bukhariSunnahUrl]: { status: 429, body: '{}', headers: { 'Retry-After': '7' } },
      },
    }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1'), (e) => {
    assert.equal(e.retryAfterMs, 7000);
    return true;
  });
});

test('a fallback that is unavailable (missing key): "The fallback (...) isn\'t available: ..."', () => {
  // hadithapi is never in SHARED_NUMBERING, so the only reachable "fallback
  // unavailable" pair today is sunnah.com as the fallback, missing its key.
  const h = prefsHarness(
    { hadithSource: 'fawazahmed0', hadithFallback: 'sunnah', hadithFallbackOn: true },
    { scriptProperties: {}, routes: { [bukhariFawazEngUrl]: () => { throw new Error('DNS failure'); } } }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1'), (e) => {
    assert.match(e.message, /The fallback \(sunnah\.com\) isn't available: sunnah\.com isn't available in this copy of the add-on\./);
    return true;
  });
  assert.ok(!h.fetches.some((f) => f.url.startsWith(SUNNAH)));
});

test('toggle off: the routed source\'s own failure propagates, no fallback request', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: false },
    { routes: { [bukhariSunnahUrl]: { status: 500, body: '{}' } } }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1'), /sunnah\.com is unavailable right now/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith(FAWAZ)));
});

test('an explicit fawaz:bukhari:1 never falls back to sunnah.com', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true },
    { routes: { [bukhariFawazEngUrl]: { status: 500, body: '{}' } } }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1', 'fawazahmed0'), /Hadith not found: bukhari #1/);
  assert.ok(!h.fetches.some((f) => f.url.startsWith(SUNNAH)));
});

test('a throttle on the routed source propagates and makes no fallback request', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true },
    { routes: { [bukhariSunnahUrl]: { status: 429, body: '{}' } } }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '1'), (e) => {
    assert.ok(e.retryAfterMs > 0);
    return true;
  });
  assert.ok(!h.fetches.some((f) => f.url.startsWith(FAWAZ)));
});

test('a missing sunnah.com key: fallback on serves fawazahmed0; fallback off reports unavailable', () => {
  const on = createHarness({ scriptProperties: {}, source: 'sunnah' }); // defaults: hadithFallback fawazahmed0, on
  const r = on.call('fetchHadith', 'bukhari', '1');
  assert.equal(r.source, 'fawazahmed0');
  assert.equal(r.fallbackFrom, 'sunnah.com');

  const off = prefsHarness({ hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: false }, { scriptProperties: {} });
  assert.throws(() => off.ctx.fetchHadith('bukhari', '1'), /^Error: sunnah\.com isn't available in this copy of the add-on\./);
});

test('hadithapi:mishkat:1 not found: the cite note names sunnah.com and no known-empty source', () => {
  const url = 'https://hadithapi.com/api/hadiths/?apiKey=k&book=mishkat&hadithNumber=1';
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithApiKey: 'k' },
    { routes: { [url]: { status: 200, body: JSON.stringify({ hadiths: { data: [] } }) } } }
  );
  assert.throws(() => h.ctx.fetchHadith('mishkat', '1', 'hadithapi'), (e) => {
    assert.equal(e.message,
      "Hadith not found: mishkat #1 on hadithapi.com. Other ways to cite Mishkat al-Masabih: /hadith sunnah:mishkat:<number> (sunnah.com numbering).");
    return true;
  });
});

test('prefs: old saved prefs get hadithFallback/hadithFallbackOn defaults; a fallback equal to the default is repaired', () => {
  const old = createHarness({ userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah' }) } }).call('getPrefs');
  assert.equal(old.hadithFallback, 'fawazahmed0');
  assert.equal(old.hadithFallbackOn, true);

  const repaired = createHarness({
    userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah', hadithFallback: 'sunnah', hadithFallbackOn: true }) },
  }).call('getPrefs');
  assert.notEqual(repaired.hadithFallback, 'sunnah');

  const fawazDefaultNoKey = createHarness({ scriptProperties: {} }).call('getPrefs');
  assert.equal(fawazDefaultNoKey.hadithSource, 'fawazahmed0');
  assert.equal(fawazDefaultNoKey.hadithFallback, 'hadithapi');

  const fawazDefaultWithKey = createHarness({ userProperties: { prefs: JSON.stringify({ hadithSource: 'fawazahmed0' }) } }).call('getPrefs');
  assert.equal(fawazDefaultWithKey.hadithFallback, 'sunnah');
});

test('savePrefs validates hadithFallback and hadithFallbackOn, and repairs an equal pair', () => {
  const h = createHarness();
  const saved = h.call('savePrefs', { hadithSource: 'sunnah', hadithFallback: 'sunnah', hadithFallbackOn: true });
  assert.notEqual(saved.hadithFallback, 'sunnah');
  assert.equal(saved.hadithFallbackOn, true);

  // D2's default is true, so an omitted field (the current Sidebar.html
  // never sends it) must not silently turn the fallback off.
  const omitted = h.call('savePrefs', { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0' });
  assert.equal(omitted.hadithFallbackOn, true);

  const explicitOff = h.call('savePrefs', { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: false });
  assert.equal(explicitOff.hadithFallbackOn, false);
});

test('replaceTag returns fallback: true for a fallback-served hadith', () => {
  const h = prefsHarness(
    { hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true },
    { document: ['/hadith bukhari:1'], routes: { [bukhariSunnahUrl]: { status: 500, body: '{}' } } }
  );
  const r = h.call('replaceTag', '/hadith bukhari:1');
  assert.equal(r.status, 'replaced');
  assert.equal(r.fallback, true);
});

test('replaceTag pacing follows the serving source, even in reverse (default fawazahmed0 down, fallback sunnah.com)', () => {
  const h = prefsHarness(
    { hadithSource: 'fawazahmed0', hadithFallback: 'sunnah', hadithFallbackOn: true },
    { document: ['/hadith bukhari:1'], routes: { [bukhariFawazEngUrl]: { status: 500, body: '{}' } } }
  );
  const r = h.call('replaceTag', '/hadith bukhari:1');
  assert.deepEqual(r, { status: 'replaced', replaced: 1, reason: '', retryAfterMs: 0, cached: false, fallback: true });
});

test('getFallbackCoverage reports the shared collections for a pair, in D5\'s order, or none', () => {
  const h = createHarness();
  // D5's exact order: Bukhari, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah.
  assert.deepEqual(h.call('getFallbackCoverage', 'sunnah', 'fawazahmed0').shared, [
    'Sahih al-Bukhari', 'Sunan Abi Dawud', "Jami' at-Tirmidhi", "Sunan an-Nasa'i", 'Sunan Ibn Majah',
  ]);
  assert.deepEqual(h.call('getFallbackCoverage', 'fawazahmed0', 'sunnah').shared, [
    'Sahih al-Bukhari', 'Sunan Abi Dawud', "Jami' at-Tirmidhi", "Sunan an-Nasa'i", 'Sunan Ibn Majah',
  ]);
  assert.deepEqual(h.call('getFallbackCoverage', 'sunnah', 'hadithapi').shared, []);
});

test('fetchAdjacentHadith falls back too: a missing key sends abudawud Next to fawazahmed0', () => {
  const h = createHarness({ scriptProperties: {}, source: 'sunnah' }); // defaults: hadithFallback fawazahmed0, on
  const r = h.call('fetchAdjacentHadith', 'abudawud', '1', 1);
  assert.equal(r.hadithNum, 2);
  assert.equal(r.source, 'fawazahmed0');
  assert.equal(r.fallbackFrom, 'sunnah.com');
});

test('a normal sunnah.com Next carries fallbackFrom: \'\'', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.equal(h.call('fetchAdjacentHadith', 'bukhari', '1', 1).fallbackFrom, '');
});

test('D3 strict fallback: sunnah.com as the fallback must match the plain number exactly (lettered form doesn\'t count)', () => {
  const bukhariSunnah8Url = `${SUNNAH}/collections/bukhari/hadiths/8`;
  const bukhariSunnah8aUrl = `${SUNNAH}/collections/bukhari/hadiths/8%20a`;
  const bukhari8aBody = {
    collection: 'bukhari', bookNumber: '1', hadithNumber: '8 a',
    hadith: [
      { lang: 'en', chapterTitle: '', body: '<p>Narrated Someone:</p><p>text</p>', grades: [] },
      { lang: 'ar', chapterTitle: '', body: '<p>عربي</p>', grades: [] },
    ],
  };
  const h = prefsHarness(
    { hadithSource: 'fawazahmed0', hadithFallback: 'sunnah', hadithFallbackOn: true },
    {
      routes: {
        [`${FAWAZ}/eng-bukhari/8.json`]: { status: 500, body: '{}' },
        [bukhariSunnah8Url]: { status: 404, body: '{}' },
        [bukhariSunnah8aUrl]: { status: 200, body: bukhari8aBody },
      },
    }
  );
  assert.throws(() => h.ctx.fetchHadith('bukhari', '8'), (e) => {
    assert.match(e.message, /The fallback \(sunnah\.com\) also failed: Not found: Sahih al-Bukhari 8\. sunnah\.com lists it as 8a\./);
    return true;
  });
  // sunnah.com's lettered form was probed only to explain the miss (this
  // test just confirms the request happened), never served as the answer.
  assert.ok(h.fetches.some((f) => f.url === bukhariSunnah8aUrl));
});

test('D3 strict fallback: sunnah.com as the fallback serves a plain number it actually has, with fallbackFrom fawazahmed0', () => {
  const bukhariSunnah8Url = `${SUNNAH}/collections/bukhari/hadiths/8`;
  const bukhari8Body = {
    collection: 'bukhari', bookNumber: '1', hadithNumber: '8',
    hadith: [
      { lang: 'en', chapterTitle: '', body: '<p>Narrated Someone:</p><p>text</p>', grades: [] },
      { lang: 'ar', chapterTitle: '', body: '<p>عربي</p>', grades: [] },
    ],
  };
  const h = prefsHarness(
    { hadithSource: 'fawazahmed0', hadithFallback: 'sunnah', hadithFallbackOn: true },
    {
      routes: {
        [`${FAWAZ}/eng-bukhari/8.json`]: { status: 500, body: '{}' },
        [bukhariSunnah8Url]: { status: 200, body: bukhari8Body },
      },
    }
  );
  const r = h.ctx.fetchHadith('bukhari', '8');
  assert.equal(r.source, 'sunnah');
  assert.equal(r.hadithNum, '8');
  assert.equal(r.fallbackFrom, 'fawazahmed0');
});

test('D3 strict fallback does not affect a routed (non-fallback) sunnah.com lookup: lettered/combined resolution still applies', () => {
  const bukhariSunnah8Url = `${SUNNAH}/collections/bukhari/hadiths/8`;
  const bukhariSunnah8aUrl = `${SUNNAH}/collections/bukhari/hadiths/8%20a`;
  const bukhari8aBody = {
    collection: 'bukhari', bookNumber: '1', hadithNumber: '8 a',
    hadith: [
      { lang: 'en', chapterTitle: '', body: '<p>Narrated Someone:</p><p>text</p>', grades: [] },
      { lang: 'ar', chapterTitle: '', body: '<p>عربي</p>', grades: [] },
    ],
  };
  const h = prefsHarness(
    { hadithSource: 'sunnah' },
    { routes: { [bukhariSunnah8Url]: { status: 404, body: '{}' }, [bukhariSunnah8aUrl]: { status: 200, body: bukhari8aBody } } }
  );
  const r = h.ctx.fetchHadith('bukhari', '8');
  assert.equal(r.source, 'sunnah');
  assert.equal(r.hadithNum, '8a');
});

test('D3 strict fallback also applies to fetchAdjacentHadith: sunnah.com as the fallback Next must land on N+1 exactly', () => {
  const bukhariSunnah8Url = `${SUNNAH}/collections/bukhari/hadiths/8`;
  const bukhariSunnah8aUrl = `${SUNNAH}/collections/bukhari/hadiths/8%20a`;
  const bukhari8aBody = {
    collection: 'bukhari', bookNumber: '1', hadithNumber: '8 a',
    hadith: [
      { lang: 'en', chapterTitle: '', body: '<p>Narrated Someone:</p><p>text</p>', grades: [] },
      { lang: 'ar', chapterTitle: '', body: '<p>عربي</p>', grades: [] },
    ],
  };
  const h = prefsHarness(
    { hadithSource: 'fawazahmed0', hadithFallback: 'sunnah', hadithFallbackOn: true },
    {
      routes: {
        [`${FAWAZ}/eng-bukhari/8.json`]: { status: 500, body: '{}' },
        [bukhariSunnah8Url]: { status: 404, body: '{}' },
        [bukhariSunnah8aUrl]: { status: 200, body: bukhari8aBody },
      },
    }
  );
  // No explicit source: fetchAdjacentHadith('bukhari', '7', 1) is a plain,
  // fallback-eligible Next from 7, landing on 8.
  assert.throws(() => h.ctx.fetchAdjacentHadith('bukhari', '7', 1), (e) => {
    assert.match(e.message, /The fallback \(sunnah\.com\) also failed: Not found: Sahih al-Bukhari 8\. sunnah\.com lists it as 8a\./);
    return true;
  });
  assert.ok(h.fetches.some((f) => f.url === bukhariSunnah8aUrl));
});

test('a collection-boundary "no more hadith" never falls back, on sunnah.com or its fallback', () => {
  const h = createHarness({ source: 'sunnah' }); // bukhari: default sunnah, fallback fawazahmed0, on
  assert.throws(() => h.ctx.fetchAdjacentHadith('bukhari', '1', -1), (e) => {
    assert.equal(e.message, 'No more hadith found before Sahih al-Bukhari 1.');
    return true;
  });
  const fawaz = createHarness({ source: 'fawazahmed0' }); // abudawud: default fawazahmed0, fallback sunnah, on
  assert.throws(() => fawaz.ctx.fetchAdjacentHadith('abudawud', '1', -1), (e) => {
    assert.equal(e.message, 'This is the first hadith in the collection.');
    return true;
  });
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createSidebarHarness, deferredReply } = require('./sidebar-harness');
const { createHarness } = require('./harness');

const sunnahHadith = (over) => Object.assign({
  source: 'sunnah', collection: 'abudawud', collectionLabel: 'Sunan Abi Dawud', hadithNum: '1', refDetail: 'Book 1',
  status: 'Hasan Sahih (Al-Albani)', gradeGroup: 'sahih', gradeColor: '#2e7d32', gradeTextColor: '#ffffff',
  arabic: 'عربي', english: 'Narrated…', transliteration: '', note: '', resolvedFrom: '', sourceLabel: 'sunnah.com',
}, over || {});

test('the sunnah.com option is removed when the key is not configured, including from the fallback dropdown', () => {
  const s = createSidebarHarness({ responses: { isSunnahAvailable: () => false, getPrefs: () => ({ hadithSource: 'fawazahmed0', hadithFallback: 'hadithapi', hadithFallbackOn: true, showTranslation: true, quranTranslation: 'en.sahih', hadithApiKey: '', hadithTranslation: 'english', gradeColors: { badge: true, docText: false, groups: { sahih: { color: '#2e7d32', keywords: [] }, hasan: { color: '#e65100', keywords: [] }, daif: { color: '#c62828', keywords: [] }, other: { color: '#757575' } } } }) } });
  assert.deepEqual(s.el.hadithSource.options.map((o) => o.value), ['fawazahmed0', 'hadithapi']);
  assert.deepEqual(s.el.hadithLookupSource.options.map((o) => o.value), ['auto', 'fawazahmed0', 'hadithapi']);
  assert.deepEqual(s.el.hadithFallback.options.map((o) => o.value), ['hadithapi']);
});

test('load fills settings from the server, including grade colors', () => {
  const s = createSidebarHarness();
  assert.equal(s.el.hadithSource.value, 'sunnah');
  assert.equal(s.el.gradeBadge.checked, true);
  assert.equal(s.el.gradeDocText.checked, false);
  assert.equal(s.el.gradeColorSahih.value, '#2e7d32');
  assert.equal(s.el.gradeKeywordsSahih.value, 'sahih, hasan sahih');
  assert.equal(s.el.hadithNumHelp.textContent, 'Examples: 1, 8a');
  assert.equal(s.el.hadithLookupSource.value, 'auto');
  assert.deepEqual(s.calls.find((c) => c.name === 'getCollectionsForSource').args, ['auto']);
  assert.deepEqual(s.el.hadithCollection.options.map((o) => o.value), ['bukhari', 'muslim']);
  assert.deepEqual(s.el.hadithTranslation.options.map((o) => o.value), ['english', 'urdu']);
});

test('saveSettings sends grade colors with keyword arrays', () => {
  const s = createSidebarHarness({ responses: { savePrefs: (p) => p } });
  s.el.gradeKeywordsHasan.value = ' hasan , hasan li ghairihi ,';
  s.el.gradeDocText.checked = true;
  s.ctx.saveSettings();
  const sent = s.calls.find((c) => c.name === 'savePrefs').args[0];
  assert.deepEqual(sent.gradeColors.groups.hasan.keywords, ['hasan', 'hasan li ghairihi']);
  assert.equal(sent.gradeColors.docText, true);
  assert.equal(sent.gradeColors.groups.other.color, '#757575');
});

test('renderHadith shows the label, the colored badge, and Previous disabled at 1', () => {
  const s = createSidebarHarness();
  s.ctx.renderHadith(sunnahHadith());
  assert.equal(s.el.hadithRef.textContent, 'Sunan Abi Dawud 1 · Book 1 · sunnah.com');
  const badge = s.el.hadithRef.children[0];
  assert.equal(badge.className, 'status-badge');
  assert.equal(badge.style.backgroundColor, '#2e7d32');
  assert.equal(badge.style.color, '#ffffff');
  assert.equal(badge.textContent, 'Hasan Sahih (Al-Albani)');
  assert.equal(s.el.btnPrevHadith.disabled, true);
});

test('with coloring off the badge is neutral', () => {
  const s = createSidebarHarness();
  s.ctx.renderHadith(sunnahHadith({ gradeColor: '', gradeTextColor: '' }));
  assert.equal(s.el.hadithRef.children[0].className, 'status-badge neutral');
});

test('a fallback-served hadith names the routed source in the ref line', () => {
  const s = createSidebarHarness();
  s.ctx.renderHadith(sunnahHadith({
    source: 'fawazahmed0', sourceLabel: 'fawazahmed0', collection: 'bukhari', collectionLabel: 'Sahih al-Bukhari',
    hadithNum: '1', refDetail: '', fallbackFrom: 'sunnah.com',
  }));
  assert.equal(s.el.hadithRef.textContent, 'Hadith Sahih al-Bukhari #1 · fawazahmed0 (fallback from sunnah.com)');
});

test('a resolved number explains itself', () => {
  const s = createSidebarHarness();
  s.ctx.renderHadith(sunnahHadith({ collection: 'muslim', collectionLabel: 'Sahih Muslim', hadithNum: '8a', resolvedFrom: '8' }));
  assert.equal(s.el.hadithStatus.textContent, 'Found Sahih Muslim 8a (sunnah.com splits 8 into lettered parts)');
  assert.equal(s.el.hadithNum.value, '8a');
  s.ctx.renderHadith(sunnahHadith({ collection: 'shamail', collectionLabel: "Ash-Shama'il Al-Muhammadiyah", hadithNum: '5, 6', resolvedFrom: '6' }));
  assert.equal(s.el.hadithStatus.textContent, "Found Ash-Shama'il Al-Muhammadiyah 5, 6 (sunnah.com combines these numbers)");
});

test('Next, Previous, and Insert use the source the preview came from', () => {
  const s = createSidebarHarness({ responses: {
    fetchAdjacentHadith: () => sunnahHadith({ collection: 'muslim', hadithNum: '8b' }),
    insertHadithAtCursor: () => sunnahHadith({ collection: 'muslim', hadithNum: '8b' }),
  } });
  s.ctx.renderHadith(sunnahHadith({ collection: 'muslim', hadithNum: '8a' }));
  s.ctx.nextHadith();
  s.ctx.prevHadith();
  s.ctx.insertHadith();
  assert.deepEqual(s.calls.filter((c) => c.name === 'fetchAdjacentHadith').map((c) => c.args),
    [['muslim', '8a', 1, 'sunnah'], ['muslim', '8b', -1, 'sunnah']]);
  assert.deepEqual(s.calls.find((c) => c.name === 'insertHadithAtCursor').args, ['muslim', '8b', 'sunnah']);
});

test('Insert always sends the previewed hadith, even after the Source picker rebuilds the collection list', () => {
  const s = createSidebarHarness({ responses: {
    getCollectionsForSource: (source) => (source === 'sunnah'
      ? [{ value: 'adab', label: 'Al-Adab Al-Mufrad' }, { value: 'bukhari', label: 'Sahih al-Bukhari' }]
      : [{ value: 'bukhari', label: 'Sahih al-Bukhari' }, { value: 'muslim', label: 'Sahih Muslim' }]),
    insertHadithAtCursor: () => sunnahHadith({ collection: 'adab', hadithNum: '7' }),
  } });
  s.ctx.renderHadith(sunnahHadith({ source: 'sunnah', collection: 'adab', hadithNum: '7' }));
  s.el.hadithLookupSource.value = 'fawazahmed0';
  s.ctx.onLookupSourceChange();
  s.ctx.insertHadith();
  assert.deepEqual(s.calls.find((c) => c.name === 'insertHadithAtCursor').args, ['adab', '7', 'sunnah']);
});

test('Look Up sends the lookup source; Auto sends an empty source', () => {
  const s = createSidebarHarness({ responses: { fetchHadith: () => sunnahHadith() } });
  s.el.hadithCollection.value = 'bukhari';
  s.el.hadithNum.value = '1';
  s.ctx.lookupHadith();
  s.el.hadithLookupSource.value = 'fawazahmed0';
  s.ctx.onLookupSourceChange();
  s.el.hadithNum.value = '1';
  s.ctx.lookupHadith();
  assert.deepEqual(s.calls.filter((c) => c.name === 'fetchHadith').map((c) => c.args), [['bukhari', '1', ''], ['bukhari', '1', 'fawazahmed0']]);
  assert.deepEqual(s.calls.filter((c) => c.name === 'getCollectionsForSource').map((c) => c.args[0]), ['auto', 'fawazahmed0']);
});

test('hadith number validation: letters for Auto and sunnah.com, digits for the others', () => {
  const s = createSidebarHarness();
  s.el.hadithNum.value = '8a';
  assert.equal(s.ctx.validateHadithInputs(), true);
  s.el.hadithNum.value = '1/2';
  assert.equal(s.ctx.validateHadithInputs(), false);
  s.el.hadithLookupSource.value = 'fawazahmed0';
  s.el.hadithNum.value = '8a';
  assert.equal(s.ctx.validateHadithInputs(), false);
  s.el.hadithNum.value = '100';
  assert.equal(s.ctx.validateHadithInputs(), true);
});

test('nextDelayMs paces uncached lookups 1100 ms apart', () => {
  const s = createSidebarHarness();
  assert.equal(s.ctx.nextDelayMs(1000, 1300, false), 800);
  assert.equal(s.ctx.nextDelayMs(1000, 2500, false), 0);
  assert.equal(s.ctx.nextDelayMs(1000, 1300, true), 0);
});

test('Replace All Tags paces, retries a throttled tag quietly, and reports skips', () => {
  let s;
  const times = [];
  const results = {
    '/hadith bukhari:1': [{ status: 'replaced', replaced: 2, reason: '', retryAfterMs: 0, cached: false }],
    '/hadith muslim:8a': [
      { status: 'throttled', replaced: 0, reason: '', retryAfterMs: 5000, cached: false },
      { status: 'replaced', replaced: 1, reason: '', retryAfterMs: 0, cached: true },
    ],
    '/hadith musnadahmad:1000': [{ status: 'skipped', replaced: 0, reason: 'Not found: Musnad Ahmad 1000.', retryAfterMs: 0, cached: false }],
  };
  s = createSidebarHarness({ responses: {
    listTags: () => Object.keys(results).map((tag) => ({ tag, kind: 'hadith', count: 1 })),
    replaceTag: (tag) => { times.push([tag, s.clock.now]); s.clock.now += 300; return results[tag].shift(); },
  } });
  s.ctx.startTagRun();
  assert.match(s.el.tagProgressText.textContent, /^Processing 1 \/ 3$/);
  s.clock.advance(60000);
  assert.deepEqual(times.map((t) => t[0]), ['/hadith bukhari:1', '/hadith muslim:8a', '/hadith muslim:8a', '/hadith musnadahmad:1000']);
  assert.ok(times[1][1] - times[0][1] >= 1100, 'uncached lookups are spaced');
  assert.ok(times[2][1] - times[1][1] >= 5000, 'throttled tag waits retryAfterMs');
  assert.equal(times[3][1], times[2][1] + 300, 'a cached result goes straight on');
  assert.equal(s.el.tagSummary.textContent, 'Done: 3 replaced, 1 skipped\n/hadith musnadahmad:1000 — Not found: Musnad Ahmad 1000.');
  assert.doesNotMatch(s.el.tagProgressText.textContent + s.el.tagSummary.textContent, /rate limit|throttl/i);
  assert.equal(s.el.btnScanReplace.disabled, false);
});

test('Cancel stops after the current tag', () => {
  let s;
  s = createSidebarHarness({ responses: {
    listTags: () => [{ tag: '/hadith bukhari:1' }, { tag: '/hadith bukhari:2' }].map((t) => Object.assign(t, { kind: 'hadith', count: 1 })),
    replaceTag: () => { s.ctx.cancelTagRun(); return { status: 'replaced', replaced: 1, reason: '', retryAfterMs: 0, cached: false }; },
  } });
  s.ctx.startTagRun();
  s.clock.advance(10000);
  assert.equal(s.calls.filter((c) => c.name === 'replaceTag').length, 1);
  assert.equal(s.el.tagSummary.textContent, 'Cancelled: 1 replaced, 0 skipped');
});

test('an armed menu run starts on load', () => {
  const s = createSidebarHarness({ responses: { consumeAutoRun: () => true, listTags: () => [] } });
  assert.ok(s.calls.some((c) => c.name === 'listTags'));
  assert.equal(s.el.tagSummary.textContent, 'No tags found.');
});

test('the sidebar has no server templating', () => {
  assert.ok(!fs.readFileSync(path.join(__dirname, '..', 'Sidebar.html'), 'utf8').includes('<?'));
});

const tafsirResult = (over) => Object.assign({
  ref: '2:255', spec: 'tafsir.app:saadi.ar', label: "Tafsir al-Sa'di (Arabic)", source: 'tafsir.app', rtl: true, cached: false,
  blocks: [{ ayahStart: 255, ayahEnd: 255, header: "Tafsir al-Sa'di · Al-Baqara 2:255", text: 'نص', notes: [], truncated: false, url: '' }],
}, over || {});

test('tafsir settings load with their defaults', () => {
  const s = createSidebarHarness();
  assert.equal(s.el.tafsirSource.value, 'tafsir.app');
  assert.equal(s.el.tafsirLanguage.value, 'ar');
  assert.equal(s.el.tafsirDefaultBook.value, 'saadi');
  assert.equal(s.el.tafsirLimitOn.checked, false);
  assert.equal(s.el.tafsirCharLimit.disabled, true);
  assert.equal(s.el.tafsirLink.checked, false);
  assert.equal(s.el.tafsirBook.value, 'saadi.ar');
  assert.ok(s.el.tafsirBook.options.some((o) => o.value === 'ibn-kathir.en'));
});

test('saveSettings sends tafsir settings; the limit is 0 when off', () => {
  const s = createSidebarHarness({ responses: { savePrefs: (p) => p } });
  s.ctx.saveSettings();
  assert.deepEqual(s.calls.find((c) => c.name === 'savePrefs').args[0].tafsir,
    { source: 'tafsir.app', fallback: 'quran.com', fallbackOn: true, language: 'ar', book: 'saadi', charLimit: 0, link: false });
  s.el.tafsirLimitOn.checked = true;
  s.el.tafsirCharLimit.value = '1500';
  s.el.tafsirLink.checked = true;
  s.ctx.saveSettings();
  const second = s.calls.filter((c) => c.name === 'savePrefs')[1].args[0].tafsir;
  assert.equal(second.charLimit, 1500);
  assert.equal(second.link, true);
});

test('Show sends the current ayah and edition; Insert sends the exact spec shown', () => {
  const s = createSidebarHarness({ responses: {
    fetchTafsir: () => tafsirResult(),
    insertTafsirAtCursor: () => tafsirResult(),
  } });
  s.ctx.currentAyahData = { surahNum: 2, ayahNum: 255, _rangeData: null };
  s.el.tafsirBook.value = 'saadi.ar';
  s.ctx.showTafsir();
  assert.deepEqual(s.calls.find((c) => c.name === 'fetchTafsir').args, ['2:255', 'saadi.ar']);
  assert.equal(s.el.tafsirHeader.textContent, "Tafsir al-Sa'di · Al-Baqara 2:255");
  assert.equal(s.el.tafsirText.textContent, 'نص');
  assert.equal(s.el.tafsirText.style.direction, 'rtl');
  assert.equal(s.el.tafsirBox.style.display, 'block');
  s.ctx.insertTafsir();
  assert.deepEqual(s.calls.find((c) => c.name === 'insertTafsirAtCursor').args, ['2:255', 'tafsir.app:saadi.ar']);
});

test('a fallback-served tafsir names the serving source; Insert uses the served spec, but a later Show still asks for the user\'s own pick', () => {
  const fallbackResult = tafsirResult({
    source: 'quran.com', spec: 'quran.com:saadi.ar', fallbackFrom: 'tafsir.app',
    blocks: [{ ayahStart: 255, ayahEnd: 255, header: "Tafsir al-Sa'di · Al-Baqara 2:255", text: 'نص quran.com', notes: [], truncated: false, url: '' }],
  });
  const s = createSidebarHarness({ responses: {
    fetchTafsir: () => fallbackResult,
    insertTafsirAtCursor: () => fallbackResult,
  } });
  s.ctx.currentAyahData = { surahNum: 2, ayahNum: 255, _rangeData: null };
  s.el.tafsirBook.value = 'saadi.ar';
  s.ctx.showTafsir();
  assert.equal(s.el.tafsirHeader.textContent, "Tafsir al-Sa'di · Al-Baqara 2:255 · quran.com (fallback from tafsir.app)");
  s.ctx.insertTafsir();
  assert.deepEqual(s.calls.find((c) => c.name === 'insertTafsirAtCursor').args, ['2:255', 'quran.com:saadi.ar']);
  // A later Show (e.g. from Previous/Next re-rendering the tafsir row) must
  // keep asking for the user's own book/language pick, not the spec the
  // fallback served — otherwise one fallback would pin every later ayah to it.
  s.ctx.showTafsir();
  const fetchCalls = s.calls.filter((c) => c.name === 'fetchTafsir');
  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[1].args[1], 'saadi.ar');
});

test('a Quran range asks for the range', () => {
  const s = createSidebarHarness({ responses: { fetchTafsir: () => tafsirResult() } });
  s.ctx.currentAyahData = { surahNum: 2, ayahNum: 255, _rangeData: [{ surahNum: 2, ayahNum: 255 }, { surahNum: 2, ayahNum: 256 }, { surahNum: 2, ayahNum: 257 }] };
  s.ctx.showTafsir();
  assert.equal(s.calls.find((c) => c.name === 'fetchTafsir').args[0], '2:255-257');
});

test('a tafsir error hides the box and shows the message', () => {
  const s = createSidebarHarness({ responses: { fetchTafsir: () => { throw new Error('tafsir.app is unavailable right now.'); } } });
  s.ctx.currentAyahData = { surahNum: 2, ayahNum: 255, _rangeData: null };
  s.ctx.showTafsir();
  assert.equal(s.el.tafsirBox.style.display, 'none');
  assert.equal(s.el.tafsirStatus.textContent, 'tafsir.app is unavailable right now.');
});

// ── D5: fallback dropdowns, toggles, pair-specific help ──

test('the hadith fallback dropdown excludes the default and updates when the default changes', () => {
  const s = createSidebarHarness();
  assert.deepEqual(s.el.hadithFallback.options.map((o) => o.value), ['fawazahmed0', 'hadithapi']);
  s.el.hadithSource.value = 'hadithapi';
  s.ctx.onHadithSourceChange();
  assert.deepEqual(s.el.hadithFallback.options.map((o) => o.value), ['sunnah', 'fawazahmed0']);
});

test('the hadith fallback toggle disables its dropdown', () => {
  const s = createSidebarHarness();
  assert.equal(s.el.hadithFallback.disabled, false);
  s.el.hadithFallbackOn.checked = false;
  s.ctx.onHadithFallbackToggle();
  assert.equal(s.el.hadithFallback.disabled, true);
});

test('the tafsir fallback dropdown excludes the default and updates when the default changes', () => {
  const s = createSidebarHarness();
  assert.deepEqual(s.el.tafsirFallback.options.map((o) => o.value), ['quran.com']);
  s.el.tafsirSource.value = 'quran.com';
  s.ctx.onTafsirSourceChange();
  assert.deepEqual(s.el.tafsirFallback.options.map((o) => o.value), ['tafsir.app']);
});

test('the tafsir fallback toggle disables its dropdown', () => {
  const s = createSidebarHarness();
  assert.equal(s.el.tafsirFallback.disabled, false);
  s.el.tafsirFallbackOn.checked = false;
  s.ctx.onTafsirFallbackToggle();
  assert.equal(s.el.tafsirFallback.disabled, true);
});

test('saveSettings sends the new hadith fallback prefs; load applies them', () => {
  const s = createSidebarHarness({ responses: { savePrefs: (p) => p } });
  // fawazahmed0 is already the default fallback, so setting it back would
  // prove nothing; pick the other still-offered option instead.
  s.el.hadithFallback.value = 'hadithapi';
  s.el.hadithFallbackOn.checked = false;
  s.ctx.saveSettings();
  const sent = s.calls.find((c) => c.name === 'savePrefs').args[0];
  assert.equal(sent.hadithFallback, 'hadithapi');
  assert.equal(sent.hadithFallbackOn, false);
});

test('a stale saved fallback that is no longer offered falls back to the rebuilt dropdown\'s own first option', () => {
  const s = createSidebarHarness({ responses: {
    isSunnahAvailable: () => false,
    getPrefs: () => ({
      showTranslation: true, quranTranslation: 'en.sahih', hadithSource: 'fawazahmed0',
      // Saved while sunnah.com was configured; the key has since been removed,
      // so 'sunnah' is no longer one of hadithFallback's rebuilt options.
      hadithFallback: 'sunnah', hadithFallbackOn: true, hadithApiKey: '', hadithTranslation: 'english',
      gradeColors: { badge: true, docText: false, groups: { sahih: { color: '#2e7d32', keywords: [] }, hasan: { color: '#e65100', keywords: [] }, daif: { color: '#c62828', keywords: [] }, other: { color: '#757575' } } },
      tafsir: { source: 'tafsir.app', fallback: 'quran.com', fallbackOn: true, language: 'ar', book: 'saadi', charLimit: 0, link: false },
    }),
  } });
  assert.deepEqual(s.el.hadithFallback.options.map((o) => o.value), ['hadithapi']);
  assert.equal(s.el.hadithFallback.value, 'hadithapi');
  assert.equal(s.el.hadithFallbackCoverage.textContent,
    "No books fall back with this pair: hadithapi.com's numbering hasn't been checked against fawazahmed0.");
});

test('saveSettings sends an explicit tafsir.fallbackOn: false, not an omitted field', () => {
  const s = createSidebarHarness({ responses: { savePrefs: (p) => p } });
  s.el.tafsirFallbackOn.checked = false;
  s.ctx.saveSettings();
  const sentTafsir = s.calls.find((c) => c.name === 'savePrefs').args[0].tafsir;
  assert.equal(sentTafsir.fallbackOn, false);
  assert.ok(Object.prototype.hasOwnProperty.call(sentTafsir, 'fallbackOn'));
});

test('a prefs load applies the saved fallback source and toggle', () => {
  const s = createSidebarHarness({ responses: {
    getPrefs: () => ({
      showTranslation: true, quranTranslation: 'en.sahih', hadithSource: 'sunnah',
      hadithFallback: 'hadithapi', hadithFallbackOn: false, hadithApiKey: '', hadithTranslation: 'english',
      gradeColors: { badge: true, docText: false, groups: { sahih: { color: '#2e7d32', keywords: [] }, hasan: { color: '#e65100', keywords: [] }, daif: { color: '#c62828', keywords: [] }, other: { color: '#757575' } } },
      tafsir: { source: 'tafsir.app', fallback: 'quran.com', fallbackOn: false, language: 'ar', book: 'saadi', charLimit: 0, link: false },
    }),
  } });
  assert.equal(s.el.hadithFallback.value, 'hadithapi');
  assert.equal(s.el.hadithFallbackOn.checked, false);
  assert.equal(s.el.hadithFallback.disabled, true);
  assert.equal(s.el.tafsirFallback.value, 'quran.com');
  assert.equal(s.el.tafsirFallbackOn.checked, false);
  assert.equal(s.el.tafsirFallback.disabled, true);
});

test('the pair-specific help line names the shared books, or says there are none', () => {
  const s = createSidebarHarness();
  assert.equal(s.el.hadithFallbackCoverage.textContent,
    "Falls back only for books both number the same way: Sahih al-Bukhari, Sunan Abi Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah.");
  s.el.hadithSource.value = 'hadithapi';
  s.ctx.onHadithSourceChange();
  assert.equal(s.el.hadithFallback.value, 'fawazahmed0');
  assert.equal(s.el.hadithFallbackCoverage.textContent,
    "No books fall back with this pair: fawazahmed0's numbering hasn't been checked against hadithapi.com.");
});

test('the client HADITH_SOURCE_LABELS copy does not drift from the server one', () => {
  const s = createSidebarHarness();
  const server = createHarness({});
  // Plain objects from different vm contexts have different Object
  // prototypes, so assert/strict's deepEqual (reference-checks the
  // prototype) reports a false mismatch here even on identical own
  // properties; compare the JSON shape instead.
  assert.equal(JSON.stringify(s.ctx.HADITH_SOURCE_LABELS), JSON.stringify(server.ctx.HADITH_SOURCE_LABELS));
});

test('the Auto lookup option reads "uses your Settings"', () => {
  const s = createSidebarHarness();
  assert.equal(s.el.hadithLookupSource.options.find((o) => o.value === 'auto').textContent, 'Auto (uses your Settings)');
});

test('every Settings control is wired, via its own onchange/oninput attribute, to the unsaved-changes message', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'Sidebar.html'), 'utf8');
  const bodyMatch = /<div class="settings-body" id="settingsBody">([\s\S]*?)\n\s*<button class="btn-primary" id="btnSaveSettings"/.exec(html);
  assert.ok(bodyMatch, 'could not find the settingsBody markup');
  const body = bodyMatch[1];
  const controlPattern = /<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g;
  const ids = [];
  let m;
  while ((m = controlPattern.exec(body)) !== null) ids.push(m[1]);
  assert.ok(ids.length >= 15, 'expected the full set of Settings controls, found ' + ids.length);

  const s = createSidebarHarness();
  for (const id of ids) {
    const tag = new RegExp('<(?:input|select)\\b[^>]*\\bid="' + id + '"[^>]*>').exec(body)[0];
    const handler = /\son(?:change|input)="([^"]+)"/.exec(tag);
    assert.ok(handler, '#' + id + ' has no onchange/oninput attribute');
    s.ctx.setSettingsStatus('settingsStatus', '', '');
    vm.runInContext(handler[1], s.ctx);
    assert.equal(s.el.settingsStatus.textContent, 'Unsaved changes. Click Save Settings to apply them.',
      '#' + id + '\'s handler (' + handler[1] + ') did not mark Settings unsaved');
  }
});

test('a save clears the unsaved-changes message', () => {
  const s = createSidebarHarness({ responses: { savePrefs: (p) => p } });
  s.ctx.markSettingsUnsaved();
  assert.equal(s.el.settingsStatus.textContent, 'Unsaved changes. Click Save Settings to apply them.');
  s.ctx.saveSettings();
  assert.equal(s.el.settingsStatus.textContent, 'Settings saved!');
});

test('a prefs load clears the unsaved-changes message', () => {
  const s = createSidebarHarness();
  s.ctx.markSettingsUnsaved();
  assert.equal(s.el.settingsStatus.textContent, 'Unsaved changes. Click Save Settings to apply them.');
  s.ctx.loadPrefs();
  assert.equal(s.el.settingsStatus.textContent, '');
});

// ── D6: Replace All Tags summary counts fallbacks ──

test('the tag summary reports how many tags used the fallback source', () => {
  const s = createSidebarHarness({ responses: {
    listTags: () => [{ tag: '/hadith bukhari:1', kind: 'hadith', count: 1 }, { tag: '/hadith abudawud:1', kind: 'hadith', count: 1 }],
    replaceTag: (tag) => (tag === '/hadith bukhari:1'
      ? { status: 'replaced', replaced: 1, reason: '', retryAfterMs: 0, cached: false, fallback: true }
      : { status: 'replaced', replaced: 1, reason: '', retryAfterMs: 0, cached: false, fallback: false }),
  } });
  s.ctx.startTagRun();
  s.clock.advance(10000);
  assert.equal(s.el.tagSummary.textContent, 'Done: 2 replaced, 0 skipped\n1 used the fallback source.');
});

// ── BUG-006: a failed prefs load keeps #hadithSource in sync ──

test('BUG-006: after a failed getPrefs, #hadithSource shows fawazahmed0, matching currentPrefs', () => {
  const s = createSidebarHarness({ responses: { getPrefs: () => { throw new Error('boom'); } } });
  assert.equal(s.el.hadithSource.value, 'fawazahmed0');
  assert.deepEqual(s.el.hadithFallback.options.map((o) => o.value), ['sunnah', 'hadithapi']);
});

// ── getFallbackCoverage replies can arrive out of order ──

test('updateHadithFallbackCoverage ignores a stale reply that arrives after the selects changed', () => {
  const deferredByPair = {};
  let armed = false;
  const s = createSidebarHarness({ responses: {
    getFallbackCoverage: (defaultSource, fallbackSource) => {
      if (!armed) return { shared: [] }; // the harness's own initial load
      const d = deferredReply();
      deferredByPair[defaultSource + '>' + fallbackSource] = d;
      return d;
    },
  } });
  armed = true;

  s.el.hadithSource.value = 'sunnah';
  s.el.hadithFallback.value = 'fawazahmed0';
  s.ctx.updateHadithFallbackCoverage(); // request A, deferred

  s.el.hadithSource.value = 'fawazahmed0';
  s.el.hadithFallback.value = 'hadithapi';
  s.ctx.updateHadithFallbackCoverage(); // request B, deferred; selects now hold B

  // B's reply arrives first...
  deferredByPair['fawazahmed0>hadithapi'].resolve({ shared: [] });
  assert.equal(s.el.hadithFallbackCoverage.textContent,
    "No books fall back with this pair: hadithapi.com's numbering hasn't been checked against fawazahmed0.");

  // ...then A's stale reply arrives late. The selects no longer hold pair A,
  // so it must not overwrite B's freshly-written help line.
  deferredByPair['sunnah>fawazahmed0'].resolve({ shared: ['Sahih al-Bukhari'] });
  assert.equal(s.el.hadithFallbackCoverage.textContent,
    "No books fall back with this pair: hadithapi.com's numbering hasn't been checked against fawazahmed0.");
});

// ── D7: tag cheat sheet toggle styled like the Settings toggle ──

test('the cheat sheet toggle sits inside a .settings-panel, like the Settings toggle, so it shares its h3 styling', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'Sidebar.html'), 'utf8');
  assert.match(html, /<div class="settings-panel">\s*<div class="settings-toggle" onclick="toggleSettings\(\)">/,
    'Settings toggle should be wrapped in .settings-panel');
  assert.match(html, /<div class="settings-panel">\s*<div class="settings-toggle" onclick="toggleCheatSheet\(\)">/,
    'Tag cheat sheet toggle should share the same .settings-panel wrapper as Settings');
});

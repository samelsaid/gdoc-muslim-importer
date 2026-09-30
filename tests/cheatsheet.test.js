'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./harness');

const HTML_PATH = path.join(__dirname, '..', 'Sidebar.html');

// Extracts every <code class="cheat-example" [data-expect-source="..."]>tag</code>
// from Sidebar.html, in document order.
function extractExamples(html) {
  const re = /<code class="cheat-example"(?:\s+data-expect-source="([^"]*)")?\s*>([^<]+)<\/code>/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ expectSource: m[1] || '', tag: m[2].trim() });
  }
  return out;
}

test('the cheat sheet has the D7 examples, each parseable', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const examples = extractExamples(html);
  assert.equal(examples.length, 11, 'expected 2 Quran + 5 hadith + 4 tafsir examples');
  const h = createHarness({});
  for (const ex of examples) {
    const parsed = h.call('parseTag_', ex.tag);
    assert.ok(parsed, 'the cheat sheet documents a tag that does not parse: ' + ex.tag);
  }
});

test('every hadith and tafsir example routes to the source it claims, with default prefs', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const examples = extractExamples(html).filter((ex) => ex.expectSource);
  assert.ok(examples.length >= 9, 'expected at least the 5 hadith + 4 tafsir examples to carry data-expect-source');
  const h = createHarness({});
  const prefs = h.call('getPrefs');
  assert.equal(prefs.hadithSource, 'sunnah');
  assert.equal(prefs.tafsir.source, 'tafsir.app');
  for (const ex of examples) {
    const parsed = h.call('parseTag_', ex.tag);
    assert.ok(parsed, 'failed to parse: ' + ex.tag);
    if (parsed.kind === 'hadith') {
      // routeHadithCompute_, not routeHadith_: a cite-note example like
      // hadithapi:muslim:100 must route to hadithapi.com even when this
      // harness's default prefs carry no hadithapi.com key of their own
      // (routeHadith_ would throw "needs your API key" first).
      const route = h.call('routeHadithCompute_', parsed.collection, parsed.number, parsed.source, prefs);
      assert.equal(route.source, ex.expectSource, ex.tag);
    } else if (parsed.kind === 'tafsir') {
      const route = h.call('routeTafsir_', parsed.spec, prefs, parsed.ref);
      assert.equal(route.source, ex.expectSource, ex.tag);
    } else {
      assert.fail('a data-expect-source example must be a /hadith or /tafsir tag: ' + ex.tag);
    }
  }
});

test('the Quran examples parse as /quran tags with no source to route', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const examples = extractExamples(html).filter((ex) => !ex.expectSource);
  assert.equal(examples.length, 2);
  const h = createHarness({});
  for (const ex of examples) {
    const parsed = h.call('parseTag_', ex.tag);
    assert.equal(parsed.kind, 'quran', ex.tag);
  }
});

test('the "up to N ayahs" wording in the cheat sheet matches TAFSIR_MAX_RANGE', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const h = createHarness({});
  const maxRange = h.ctx.TAFSIR_MAX_RANGE;
  const m = /up to (\d+) ayahs/.exec(html);
  assert.ok(m, 'no "up to N ayahs" text found in the cheat sheet');
  assert.equal(Number(m[1]), maxRange);
});

test('the cheat sheet panel is collapsible and collapsed by default', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /id="cheatSheetBody"/);
  assert.match(html, /onclick="toggleCheatSheet\(\)"/);
  const bodyMatch = /<div class="settings-body" id="cheatSheetBody">/.exec(html);
  assert.ok(bodyMatch, 'cheat sheet body should start collapsed (no "open" class)');
});

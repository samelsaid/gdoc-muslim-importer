'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

test('loads Code.gs and returns default prefs', () => {
  const h = createHarness({ scriptProperties: {} });
  const prefs = h.call('getPrefs');
  assert.equal(prefs.hadithSource, 'fawazahmed0');
  assert.equal(prefs.quranTranslation, 'en.sahih');
});

test('fetchHadithFromFawaz parses the captured Abu Dawud 1 response', () => {
  const h = createHarness({ scriptProperties: {}, source: 'fawazahmed0' });
  const data = h.call('fetchHadithFromFawaz', 'abudawud', 1);
  assert.equal(data.collection, 'abudawud');
  assert.equal(data.hadithNum, 1);
  assert.match(data.english, /\S/);
  assert.match(data.arabic, /[؀-ۿ]/);
});

test('a fetch outside urlFetchWhitelist fails', () => {
  const h = createHarness();
  assert.throws(() => h.ctx.UrlFetchApp.fetch('https://example.com/'), /urlFetchWhitelist/);
});

test('a fetch with no fixture fails loudly', () => {
  const h = createHarness();
  assert.throws(
    () => h.ctx.UrlFetchApp.fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/999999.json'),
    /No fixture/
  );
});

test('onOpen builds the menu through createAddonMenu, not createMenu (BUG-003)', () => {
  const h = createHarness();
  h.call('onOpen');
  assert.equal(h.menuCalls.createAddonMenu, 1);
  assert.equal(h.menuCalls.createMenu, 0);
  assert.deepEqual(h.menuItems.map((m) => m[0]), ['Open Sidebar', 'Scan & Replace Tags']);
});

test('the fake document supports findText, deleteText, and insertParagraph', () => {
  const h = createHarness({ document: ['Intro', 'see /hadith bukhari:1 here'] });
  const body = h.doc.getBody();
  const found = body.findText('/hadith\\s+bukhari:1');
  assert.equal(found.getStartOffset(), 4);
  found.getElement().asText().deleteText(found.getStartOffset(), found.getEndOffsetInclusive());
  body.insertParagraph(2, 'inserted');
  assert.equal(body.getText(), 'Intro\nsee  here\ninserted');
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const texts = (h) => h.doc.getBody().children.map((p) => p.text);

// Expected hadith text comes from the (cached) lookup, so no hadith text is committed.
test('sunnah.com block: linked reference line, Arabic, translation, separator', () => {
  const h = createHarness({ source: 'sunnah', document: ['Intro'], cursorIndex: 0 });
  h.call('insertHadithAtCursor', 'abudawud', '1');
  const r = h.call('fetchHadith', 'abudawud', '1');
  const paras = h.doc.getBody().children;
  assert.equal(paras[1].text, '📖 Sunan Abi Dawud 1 · Book 1 · Hasan Sahih (Al-Albani)');
  assert.deepEqual(paras[1].ops.find((o) => o[0] === 'link'), ['link', 'https://sunnah.com/abudawud:1']);
  assert.ok(paras[1].ops.some((o) => o[0] === 'underline' && o[1] === true));
  assert.ok(paras[1].ops.some((o) => o[0] === 'color' && o[1] === '#7d6608'));
  assert.equal(paras[2].text, r.arabic);
  assert.equal(paras[2].alignment, 'RIGHT');
  assert.equal(paras[3].text, r.english);
  assert.equal(paras[4].text, '─────────────────────────────');
  assert.equal(paras.length, 5);
});

test('doc-text grade color applies only to the grade at the end of the line', () => {
  const h = createHarness({ source: 'sunnah', document: ['Intro'], cursorIndex: 0 });
  const colors = h.call('getDefaultGradeColors');
  colors.docText = true;
  h.call('savePrefs', { hadithSource: 'sunnah', gradeColors: colors });
  h.call('insertHadithAtCursor', 'abudawud', '1');
  const ref = h.doc.getBody().children[1];
  const status = 'Hasan Sahih (Al-Albani)';
  assert.deepEqual(ref.ops.find((o) => o[0] === 'color' && o.length === 4),
    ['color', ref.text.length - status.length, ref.text.length - 1, '#2e7d32']);
});

test('Hisn al-Muslim adds chapter title, transliteration, and reference, and links (D8)', () => {
  const h = createHarness({ source: 'sunnah', document: ['Intro'], cursorIndex: 0 });
  h.call('insertHadithAtCursor', 'hisn', '1');
  const r = h.call('fetchHadith', 'hisn', '1');
  const t = texts(h);
  assert.equal(t[1], '📖 Hisn al-Muslim 1 · ' + r.refDetail);
  assert.deepEqual(t.slice(2, 6), [r.arabic, r.transliteration, r.english, r.note]);
  assert.deepEqual(h.doc.getBody().children[1].ops.find((o) => o[0] === 'link'), ['link', 'https://sunnah.com/hisn:1']);
});

test('translation off keeps transliteration and reference', () => {
  const h = createHarness({ source: 'sunnah', document: ['Intro'], cursorIndex: 0 });
  h.call('savePrefs', { hadithSource: 'sunnah', showTranslation: false });
  h.call('insertHadithAtCursor', 'hisn', '1');
  const r = h.call('fetchHadith', 'hisn', '1');
  const t = texts(h);
  assert.ok(t.includes(r.transliteration));
  assert.ok(!t.includes(r.english));
  assert.ok(t.includes(r.note));
});

test('Insert uses the source the preview came from, not the saved default', () => {
  const h = createHarness({ source: 'fawazahmed0', document: ['Intro'], cursorIndex: 0 });
  const r = h.call('insertHadithAtCursor', 'abudawud', '1', 'sunnah');
  assert.equal(r.source, 'sunnah');
  assert.deepEqual(h.doc.getBody().children[1].ops.find((o) => o[0] === 'link'), ['link', 'https://sunnah.com/abudawud:1']);
});

test('fawazahmed0 blocks keep the old format with the new label', () => {
  const h = createHarness({ source: 'fawazahmed0', document: ['Intro'], cursorIndex: 0 });
  h.call('insertHadithAtCursor', 'abudawud', '1');
  assert.match(texts(h)[1], /^📖 Sunan Abi Dawud — Hadith 1 \(Book /);
  assert.ok(!h.doc.getBody().children[1].ops.some((o) => o[0] === 'link'));
});

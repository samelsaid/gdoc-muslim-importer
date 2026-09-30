'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const APP = (id, s, a) => `https://tafsir.app/get.php?src=${id}&s=${s}&a=${a}`;
const withPrefs = (tafsir, extra = {}) => createHarness(Object.assign({
  document: ['Intro'], cursorIndex: 0,
  userProperties: { prefs: JSON.stringify({ hadithSource: 'sunnah', tafsir }) },
}, extra));

test('a tafsir block: header, one paragraph per line, separator', () => {
  const h = withPrefs({});
  const r = h.call('insertTafsirAtCursor', '2:255', 'saadi');
  const paras = h.doc.getBody().children;
  const lines = r.blocks[0].text.split('\n').filter((l) => l.trim());
  assert.equal(paras[1].text, "📚 Tafsir al-Sa'di · Al-Baqara 2:255");
  assert.ok(!paras[1].ops.some((o) => o[0] === 'link'), 'link is off by default');
  assert.deepEqual(paras.slice(2, 2 + lines.length).map((p) => p.text), lines);
  assert.ok(paras.slice(2, 2 + lines.length).every((p) => p.alignment === 'RIGHT'));
  assert.equal(paras[2 + lines.length].text, '─────────────────────────────');
  assert.equal(paras.length, 3 + lines.length);
});

test('the link setting links tafsir.app headers only', () => {
  const h = withPrefs({ link: true });
  h.call('insertTafsirAtCursor', '2:255', 'saadi');
  assert.deepEqual(h.doc.getBody().children[1].ops.find((o) => o[0] === 'link'), ['link', 'https://tafsir.app/saadi/2/255']);
  const q = withPrefs({ link: true });
  q.call('insertTafsirAtCursor', '2:255', 'quran.com:saadi');
  assert.ok(!q.doc.getBody().children[1].ops.some((o) => o[0] === 'link'));
});

test('editor notes are styled smaller and gray on their own line', () => {
  // Synthetic text: exercises note offsets across a line break.
  const body = JSON.stringify({ ayah: '', data: 'first line\nsecond [[a note]] end' });
  const h = withPrefs({}, { routes: { [APP('saadi', 2, 255)]: { status: 200, body } } });
  h.call('insertTafsirAtCursor', '2:255', 'saadi');
  const second = h.doc.getBody().children[3];
  assert.equal(second.text, 'second [a note] end');
  assert.deepEqual(second.ops.filter((o) => o.length === 4), [['fontSize', 7, 14, 9], ['color', 7, 14, '#888888']]);
});

test('a range inserts its blocks in order', () => {
  const base = createHarness();
  const other = base.fixtures.responses[APP('saadi', 2, 257)].body;
  const h = withPrefs({}, { routes: { [APP('saadi', 2, 256)]: { status: 200, body: other } } });
  h.call('insertTafsirAtCursor', '2:255-257', 'saadi');
  const headers = h.doc.getBody().children.map((p) => p.text).filter((t) => t.startsWith('📚'));
  assert.deepEqual(headers, [
    "📚 Tafsir al-Sa'di · Al-Baqara 2:255",
    "📚 Tafsir al-Sa'di · Al-Baqara 2:256–257",
  ]);
});

test('no cursor, no insert', () => {
  const h = createHarness({ document: ['Intro'] });
  assert.equal(h.call('insertTafsirAtCursor', '2:255', 'saadi'), undefined);
  assert.deepEqual(h.alerts, ['Place your cursor in the document first.']);
});

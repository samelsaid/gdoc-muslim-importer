'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { hasAnyText } = require('../tools/tafsir-sampling');
const SAMPLE_AYAHS = require('../tools/tafsir-sample-ayahs');

const isNonEmpty = (t) => !!t;

// The old rule checked only 2:255 (SAMPLE_AYAHS[0]). These cases pin the
// list order the "first sample with text" behavior depends on.
assert.deepEqual(SAMPLE_AYAHS[0], [2, 255]);
assert.deepEqual(SAMPLE_AYAHS[1], [1, 1]);

function fakeFetchText(textFor) {
  const calls = [];
  const fetchText = async (source, id, surah, ayah) => {
    calls.push([source, id, surah, ayah]);
    return textFor(surah, ayah);
  };
  return { fetchText, calls };
}

test('empty at 2:255 but text at 1:1 is kept, fetching only the first two samples', async () => {
  const { fetchText, calls } = fakeFetchText((surah, ayah) => (surah === 1 && ayah === 1 ? 'some text' : ''));
  const kept = await hasAnyText(fetchText, 'tafsir.app', 'example', SAMPLE_AYAHS, isNonEmpty);
  assert.equal(kept, true);
  assert.equal(calls.length, 2);
  // Under the old 2:255-only rule this case would have been dropped: the
  // rule checked only SAMPLE_AYAHS[0] and never looked at 1:1's text.
});

test('empty at every sample is dropped, fetching all of them', async () => {
  const { fetchText, calls } = fakeFetchText(() => '');
  const kept = await hasAnyText(fetchText, 'tafsir.app', 'example', SAMPLE_AYAHS, isNonEmpty);
  assert.equal(kept, false);
  assert.equal(calls.length, SAMPLE_AYAHS.length);
});

test('text at the first sample is kept after exactly one fetch', async () => {
  const { fetchText, calls } = fakeFetchText(() => 'some text');
  const kept = await hasAnyText(fetchText, 'tafsir.app', 'example', SAMPLE_AYAHS, isNonEmpty);
  assert.equal(kept, true);
  assert.equal(calls.length, 1);
});

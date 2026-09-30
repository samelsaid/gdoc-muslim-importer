'use strict';
// Shared keep/drop rule for a tafsir catalog entry: kept if ANY of
// sampleAyahs returns non-empty text, checked in order and stopping at the
// first hit, so most entries cost a single request. Used by
// tools/build-tafsir-map.js and covered offline by
// tests/tafsir-sampling.test.js (the live smoke test exercises the rule
// itself through tests/live-smoke.js, without importing this module).
async function hasAnyText(fetchText, source, id, sampleAyahs, isNonEmpty) {
  for (const [surah, ayah] of sampleAyahs) {
    if (isNonEmpty(await fetchText(source, id, surah, ayah))) return true;
  }
  return false;
}

module.exports = { hasAnyText };

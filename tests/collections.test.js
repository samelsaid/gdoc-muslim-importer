'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const plain = (x) => JSON.parse(JSON.stringify(x));

test('existing canonical keys and API slugs are unchanged', () => {
  const map = plain(createHarness().ctx.COLLECTION_MAP);
  const pinned = {
    bukhari: ['bukhari', 'sahih-bukhari'], muslim: ['muslim', 'sahih-muslim'],
    abudawud: ['abudawud', 'abu-dawood'], tirmidhi: ['tirmidhi', 'al-tirmidhi'],
    nasai: ['nasai', 'sunan-nasai'], ibnmajah: ['ibnmajah', 'ibn-e-majah'], malik: ['malik', null],
    mishkat: [null, 'mishkat'], musnadahmad: [null, 'musnad-ahmad'], silsilasahiha: [null, 'al-silsila-sahiha'],
  };
  for (const [key, [fawaz, hadithapi]] of Object.entries(pinned)) {
    assert.equal(map[key].fawaz, fawaz, key);
    assert.equal(map[key].hadithapi, hadithapi, key);
  }
});

test('old and sunnah.com slugs resolve to canonical keys', () => {
  const h = createHarness();
  assert.equal(h.call('resolveCollectionSlug', 'abu-dawood'), 'abudawud');
  assert.equal(h.call('resolveCollectionSlug', 'abudawud'), 'abudawud');
  assert.equal(h.call('resolveCollectionSlug', 'Sahih-Bukhari'), 'bukhari');
  assert.equal(h.call('resolveCollectionSlug', 'ahmad'), 'musnadahmad');
  assert.equal(h.call('resolveCollectionSlug', 'forty'), null);
});

test('labels use the full titles', () => {
  const map = plain(createHarness().ctx.COLLECTION_MAP);
  assert.equal(map.abudawud.label, 'Sunan Abi Dawud');
  assert.equal(map.tirmidhi.label, "Jami' at-Tirmidhi");
  assert.equal(map.nasai.label, "Sunan an-Nasa'i");
  assert.equal(map.ibnmajah.label, 'Sunan Ibn Majah');
});

test('sunnah.com offers 18 entries in order', () => {
  const values = createHarness().call('getCollectionsForSource', 'sunnah').map((c) => c.value);
  assert.deepEqual(values, [
    'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'mishkat', 'musnadahmad',
    'adab', 'shamail', 'riyadussalihin', 'bulugh', 'hisn', 'virtues', 'thulathiyyat', 'nawawi', 'qudsi', 'dehlawi',
  ]);
});

test('fawazahmed0 and hadithapi.com lists are unchanged', () => {
  const h = createHarness();
  assert.deepEqual(h.call('getCollectionsForSource', 'fawazahmed0').map((c) => c.value),
    ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik']);
  assert.deepEqual(h.call('getCollectionsForSource', 'hadithapi').map((c) => c.value),
    ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'mishkat', 'musnadahmad', 'silsilasahiha']);
  assert.deepEqual(h.call('getCollectionsForSource', 'nope'), []);
});

test('new users default to sunnah.com when the key is configured', () => {
  assert.equal(createHarness({ scriptProperties: { SUNNAH_API_KEY: 'k' } }).call('getPrefs').hadithSource, 'sunnah');
});

test('new users default to fawazahmed0 without the key', () => {
  assert.equal(createHarness({ scriptProperties: {} }).call('getPrefs').hadithSource, 'fawazahmed0');
});

test('v1.0.0 saved prefs keep their source and translation', () => {
  const saved = { showTranslation: true, quranTranslation: 'en.sahih', hadithSource: 'hadithapi', hadithApiKey: 'user-key', hadithTranslation: 'urdu' };
  const prefs = createHarness({ userProperties: { prefs: JSON.stringify(saved) } }).call('getPrefs');
  assert.equal(prefs.hadithSource, 'hadithapi');
  assert.equal(prefs.hadithTranslation, 'urdu');
  assert.equal(prefs.hadithApiKey, 'user-key');
});

test('a saved sunnah.com default survives a missing key; saving it without the key is refused', () => {
  const h = createHarness({ scriptProperties: {}, source: 'sunnah' });
  assert.equal(h.call('getPrefs').hadithSource, 'sunnah');
  assert.equal(h.call('savePrefs', { hadithSource: 'sunnah' }).hadithSource, 'fawazahmed0');
});

test("the 'auto' collection list is every collection", () => {
  assert.equal(createHarness().call('getCollectionsForSource', 'auto').length, 20);
});

test('Urdu stays a preference whatever the default source (any citation may route to hadithapi.com)', () => {
  const saved = createHarness().call('savePrefs', { hadithSource: 'sunnah', hadithTranslation: 'urdu' });
  assert.equal(saved.hadithSource, 'sunnah');
  assert.equal(saved.hadithTranslation, 'urdu');
});

test('isSunnahAvailable returns only a boolean', () => {
  assert.equal(createHarness({ scriptProperties: { SUNNAH_API_KEY: 'k' } }).call('isSunnahAvailable'), true);
  assert.equal(createHarness({ scriptProperties: {} }).call('isSunnahAvailable'), false);
  assert.equal(createHarness({ scriptProperties: { SUNNAH_API_KEY: '   ' } }).call('isSunnahAvailable'), false);
});

test('validateHadithInput rejects collections the source lacks', () => {
  const h = createHarness({ source: 'fawazahmed0' });
  assert.throws(() => h.ctx.validateHadithInput('qudsi', '1'), /not available on fawazahmed0/);
  assert.deepEqual(plain(h.ctx.validateHadithInput('abu-dawood', '12')), { collection: 'abudawud', hadithNum: 12 });
});

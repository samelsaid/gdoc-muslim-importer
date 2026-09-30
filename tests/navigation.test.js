'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const step = (h, collection, num, dir) => h.call('fetchAdjacentHadith', collection, num, dir).hadithNum;

test('Muslim: Next walks the lettered parts, then the next number', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.equal(step(h, 'muslim', '8a', 1), '8b');
  assert.equal(step(h, 'muslim', '8e', 1), '9');
  assert.equal(step(h, 'muslim', '9', 1), '10');
  assert.equal(step(h, 'muslim', '10', 1), '11a');
});

test('Muslim: Previous from 9 lands on 8e, and from 8a on 7', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.equal(step(h, 'muslim', '9', -1), '8e');
  assert.equal(step(h, 'muslim', '8c', -1), '8b');
  assert.equal(step(h, 'muslim', '8a', -1), '7');
});

test("Shama'il: combined numbers in both directions", () => {
  const h = createHarness({ source: 'sunnah' });
  assert.equal(step(h, 'shamail', '4', 1), '5, 6');
  assert.equal(step(h, 'shamail', '5, 6', 1), '7');
  assert.equal(step(h, 'shamail', '7', -1), '5, 6');
});

test('Bukhari: plain integers and the start of the collection', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.equal(step(h, 'bukhari', '1', 1), '2');
  assert.equal(step(h, 'bukhari', '2', -1), '1');
  assert.throws(() => h.ctx.fetchAdjacentHadith('bukhari', '1', -1), /No more hadith found before Sahih al-Bukhari 1\./);
});

test('Musnad Ahmad: Next skips up to 3 missing numbers, then stops', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.throws(() => h.ctx.fetchAdjacentHadith('musnadahmad', '1438', 1), /No more hadith found after Musnad Ahmad 1438\./);
});

test('book-scoped entries step within the loaded book', () => {
  const h = createHarness({ source: 'sunnah' });
  assert.equal(step(h, 'qudsi', '5', 1), '6');
  assert.equal(step(h, 'qudsi', '5', -1), '4');
  assert.throws(() => h.ctx.fetchAdjacentHadith('qudsi', '40', 1), /No more hadith found after Forty Hadith Qudsi 40\./);
  assert.equal(h.fetches.length, 1);
});

test('results are decorated and never marked resolved', () => {
  const r = createHarness({ source: 'sunnah' }).call('fetchAdjacentHadith', 'muslim', '9', -1);
  assert.equal(r.collectionLabel, 'Sahih Muslim');
  assert.equal(r.resolvedFrom, '');
  assert.ok('gradeGroup' in r);
});

test('fawazahmed0 steps by integer on the server', () => {
  const h = createHarness({ source: 'fawazahmed0' });
  assert.equal(h.call('fetchAdjacentHadith', 'abudawud', '1', 1).hadithNum, 2);
  assert.throws(() => h.ctx.fetchAdjacentHadith('abudawud', '1', -1), /first hadith/);
});

test('Next stays in the numbering of the source the preview came from', () => {
  const h = createHarness({ source: 'fawazahmed0' }); // default for collisions: fawazahmed0
  assert.equal(h.call('fetchAdjacentHadith', 'muslim', '9', 1, 'sunnah').hadithNum, '10');
  assert.equal(h.call('fetchAdjacentHadith', 'muslim', '8a', 1).hadithNum, '8b'); // lettered routes to sunnah.com anyway
});

test('direction must be 1 or -1', () => {
  const h = createHarness({ source: 'sunnah' });
  for (const bad of [0, 2, 'up', null]) assert.throws(() => h.ctx.fetchAdjacentHadith('bukhari', '1', bad), /Invalid direction/);
  assert.equal(h.fetches.length, 0);
});

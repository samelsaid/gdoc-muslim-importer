'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./harness');

const plain = (x) => JSON.parse(JSON.stringify(x));

test('grades normalize case, diacritics, and apostrophe variants', () => {
  const h = createHarness();
  assert.equal(h.ctx.normalizeGradeText_('Ṣaḥīḥ'), 'sahih');
  assert.equal(h.ctx.normalizeGradeText_("Da'if  Jiddan"), 'daif jiddan');
  assert.equal(h.ctx.normalizeGradeText_('Da`eef'), 'daeef');
  assert.equal(h.ctx.normalizeGradeText_('ḍaʿīf'), 'daif');
});

test('the longest matching keyword picks the group', () => {
  const h = createHarness();
  const colors = h.ctx.validateGradeColors_(null);
  const cases = {
    'Sahih': 'sahih', 'Hasan Sahih': 'sahih', 'Ṣaḥīḥ': 'sahih', 'Hasan': 'hasan', 'Hasan li ghairihi': 'hasan',
    "Da'if Jiddan": 'daif', 'Da`eef': 'daif', 'Munkar': 'daif', 'Mawdu': 'daif', 'Shadh': 'other', '': '',
  };
  for (const [grade, group] of Object.entries(cases)) assert.equal(h.ctx.gradeGroupFor_(grade, colors), group, grade);
});

test('user keywords move a grade between groups', () => {
  const h = createHarness();
  const colors = h.ctx.validateGradeColors_({ groups: { hasan: { color: '#e65100', keywords: ['hasan', 'hasan sahih'] }, sahih: { color: '#2e7d32', keywords: ['sahih'] } } });
  assert.equal(h.ctx.gradeGroupFor_('Hasan Sahih', colors), 'hasan');
});

test('validateGradeColors_ rejects bad input and caps keywords', () => {
  const h = createHarness();
  const v = plain(h.ctx.validateGradeColors_({
    badge: 'yes', docText: true,
    groups: {
      sahih: { color: 'red', keywords: ['  SAHIH ', '', 'x'.repeat(31), 'a\u0000b'] },
      hasan: { color: '#ABCDEF', keywords: 'hasan' },
      daif: { color: '#123456', keywords: Array.from({ length: 30 }, (_, i) => 'k' + i) },
    },
  }));
  assert.equal(v.badge, false);
  assert.equal(v.docText, true);
  assert.equal(v.groups.sahih.color, '#2e7d32');
  assert.deepEqual(v.groups.sahih.keywords, ['sahih', 'ab']);
  assert.equal(v.groups.hasan.color, '#abcdef');
  assert.deepEqual(v.groups.hasan.keywords, ['hasan']);
  assert.equal(v.groups.daif.keywords.length, 20);
  assert.equal(v.groups.other.color, '#757575');
});

test('contrast text color flips on light backgrounds', () => {
  const h = createHarness();
  assert.equal(h.ctx.contrastTextColor_('#2e7d32'), '#ffffff');
  assert.equal(h.ctx.contrastTextColor_('#ffeb3b'), '#000000');
});

test('v1.0.0 prefs without gradeColors load the defaults', () => {
  const saved = { showTranslation: true, quranTranslation: 'en.sahih', hadithSource: 'fawazahmed0', hadithApiKey: '', hadithTranslation: 'english' };
  const prefs = createHarness({ userProperties: { prefs: JSON.stringify(saved) } }).call('getPrefs');
  assert.deepEqual(prefs.gradeColors, createHarness().call('getDefaultGradeColors'));
  assert.equal(prefs.gradeColors.badge, true);
  assert.equal(prefs.gradeColors.docText, false);
});

test('savePrefs stores validated grade colors', () => {
  const h = createHarness();
  const colors = h.call('getDefaultGradeColors');
  colors.groups.sahih.color = '#00ff00';
  colors.docText = true;
  h.call('savePrefs', { hadithSource: 'sunnah', gradeColors: colors });
  const prefs = h.call('getPrefs');
  assert.equal(prefs.gradeColors.groups.sahih.color, '#00ff00');
  assert.equal(prefs.gradeColors.docText, true);
});

test('fetchHadith decorates sunnah.com results with the badge color', () => {
  const r = createHarness({ source: 'sunnah' }).call('fetchHadith', 'abudawud', '1');
  assert.equal(r.gradeGroup, 'sahih');
  assert.equal(r.gradeColor, '#2e7d32');
  assert.equal(r.gradeTextColor, '#ffffff');
  assert.equal(r.collectionLabel, 'Sunan Abi Dawud');
  assert.equal(r.sourceLabel, 'sunnah.com');
});

test('badge coloring off leaves the group but no color', () => {
  const h = createHarness({ source: 'sunnah' });
  const colors = h.call('getDefaultGradeColors');
  colors.badge = false;
  h.call('savePrefs', { hadithSource: 'sunnah', gradeColors: colors });
  const r = h.call('fetchHadith', 'abudawud', '1');
  assert.equal(r.gradeGroup, 'sahih');
  assert.equal(r.gradeColor, '');
});

test('hadithapi.com grades use the same groups', () => {
  // Synthetic response shaped like fetchHadithFromHadithApi's parser expects;
  // no hadithapi.com key is available to capture a real one.
  const url = 'https://hadithapi.com/api/hadiths/?apiKey=user-key&book=abu-dawood&hadithNumber=1';
  const body = { status: 200, hadiths: { data: [{ hadithNumber: '1', hadithArabic: 'عربي', hadithEnglish: 'Text', hadithUrdu: '', bookSlug: 'abu-dawood', status: 'Da`eef' }] } };
  const saved = { hadithSource: 'hadithapi', hadithApiKey: 'user-key' };
  const h = createHarness({ userProperties: { prefs: JSON.stringify(saved) }, routes: { [url]: { status: 200, body } } });
  const r = h.call('fetchHadith', 'abu-dawood', '1');
  assert.equal(r.gradeGroup, 'daif');
  assert.equal(r.gradeColor, '#c62828');
});

test('fawazahmed0 results have no grade', () => {
  const r = createHarness({ source: 'fawazahmed0' }).call('fetchHadith', 'abudawud', '1');
  assert.equal(r.gradeGroup, '');
  assert.equal(r.gradeColor, '');
  assert.equal(r.collectionLabel, 'Sunan Abi Dawud');
});

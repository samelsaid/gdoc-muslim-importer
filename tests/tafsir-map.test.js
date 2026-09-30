'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./harness');

const plain = (x) => JSON.parse(JSON.stringify(x));

test('the curated works keep their checked IDs', () => {
  const map = plain(createHarness().ctx.TAFSIR_MAP);
  assert.equal(map.saadi.languages.ar.sources['tafsir.app'], 'saadi');
  assert.equal(map.saadi.languages.ar.sources['quran.com'], '91');
  assert.equal(map['ibn-kathir'].languages.ar.sources['tafsir.app'], 'ibn-katheer');
  assert.equal(map['ibn-kathir'].languages.en.sources['quran.com'], '169');
  assert.equal(map.tabari.languages.ar.sources['tafsir.app'], 'tabari');
  assert.deepEqual(Object.keys(map.maarif.languages), ['en']);
  assert.deepEqual(Object.keys(map.tazkirul.languages).sort(), ['en', 'ur']);
});

test('every catalog entry is well-formed', () => {
  const h = createHarness();
  const map = plain(h.ctx.TAFSIR_MAP);
  const languages = plain(h.ctx.TAFSIR_LANGUAGES);
  assert.ok(Object.keys(map).length > 40);
  for (const [key, entry] of Object.entries(map)) {
    assert.match(key, /^[a-z0-9][a-z0-9-]{0,59}$/, key);
    assert.ok(entry.label && entry.label.length < 120, key);
    for (const [lang, edition] of Object.entries(entry.languages)) {
      assert.ok(languages[lang], key + ' ' + lang);
      assert.ok(Object.keys(edition.sources).length > 0, key + ' ' + lang);
      for (const [source, id] of Object.entries(edition.sources)) {
        assert.ok(h.ctx.TAFSIR_SOURCES.includes(source), key + ' ' + source);
        assert.equal(typeof id, 'string');
        assert.ok(h.ctx.TAFSIR_SOURCE_ID_PATTERNS[source].test(id), key + ' ' + source + ' ' + id);
      }
    }
  }
});

test('the generated block holds names and IDs only', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'Tafsir.gs'), 'utf8');
  const block = /BEGIN GENERATED TAFSIR CATALOG[\s\S]*?END GENERATED TAFSIR CATALOG/.exec(src)[0];
  assert.ok(block.length < 80000, 'catalog block is suspiciously large');
  for (const line of block.split('\n')) assert.ok(line.length < 200, 'long line: ' + line.slice(0, 60));
});

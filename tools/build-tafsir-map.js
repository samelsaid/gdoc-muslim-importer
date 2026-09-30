'use strict';
// Regenerates the TAFSIR_LANGUAGES / TAFSIR_MAP block in Tafsir.gs from the
// tafsir.app and quran.com live catalogs, keeping only IDs that return text
// for at least one ayah in SAMPLE_AYAHS (some works don't comment on 2:255).
// Writes IDs and names only, never tafsir text.
// Run: docker compose run --rm test node tools/build-tafsir-map.js
const fs = require('fs');
const path = require('path');

const TAFSIR_GS = path.join(__dirname, '..', 'Tafsir.gs');
const HEADERS = { 'User-Agent': 'gdoc-muslim-importer catalog build' };
const SOURCES = ['tafsir.app', 'quran.com'];
const LANGUAGE_NAMES = {
  ar: 'Arabic', en: 'English', ur: 'Urdu', bn: 'Bengali', ru: 'Russian', ku: 'Kurdish', id: 'Indonesian',
  tr: 'Turkish', fr: 'French', es: 'Spanish', de: 'German', ms: 'Malay', fa: 'Persian', zh: 'Chinese',
  ja: 'Japanese', it: 'Italian', pt: 'Portuguese', ta: 'Tamil', hi: 'Hindi', ko: 'Korean', bs: 'Bosnian',
  sq: 'Albanian', sw: 'Swahili', uz: 'Uzbek', tg: 'Tajik', nl: 'Dutch', sv: 'Swedish', th: 'Thai',
  vi: 'Vietnamese', am: 'Amharic', ha: 'Hausa', so: 'Somali', yo: 'Yoruba',
};
const CODE_FOR_NAME = Object.fromEntries(Object.entries(LANGUAGE_NAMES).map(([c, n]) => [n.toLowerCase(), c]));

// The same work across sources. Checked by hand against the catalogs on 2026-09-29.
const WORKS = [
  { key: 'ibn-kathir', label: 'Tafsir Ibn Kathir', languages: {
    ar: { 'tafsir.app': 'ibn-katheer', 'quran.com': '14' },
    en: { label: 'Tafsir Ibn Kathir (English, abridged)', 'quran.com': '169' },
    ur: { 'quran.com': '160' }, bn: { 'quran.com': '164' } } },
  { key: 'tabari', label: 'Tafsir al-Tabari', languages: { ar: { 'tafsir.app': 'tabari', 'quran.com': '15' } } },
  { key: 'qurtubi', label: 'Tafsir al-Qurtubi', languages: { ar: { 'tafsir.app': 'qurtubi', 'quran.com': '90' } } },
  { key: 'saadi', label: "Tafsir al-Sa'di", languages: {
    ar: { 'tafsir.app': 'saadi', 'quran.com': '91' }, ru: { 'quran.com': '170' } } },
  { key: 'muyassar', label: 'Tafsir al-Muyassar', languages: { ar: { 'tafsir.app': 'muyassar', 'quran.com': '16' } } },
  { key: 'baghawi', label: 'Tafsir al-Baghawi', languages: { ar: { 'tafsir.app': 'baghawi', 'quran.com': '94' } } },
  { key: 'jalalayn', label: 'Tafsir al-Jalalayn', languages: { ar: { 'tafsir.app': 'jalalayn' } } },
  { key: 'mukhtasar', label: 'Al-Mukhtasar fi al-Tafsir', languages: { ar: { 'tafsir.app': 'mukhtasar' } } },
  { key: 'wasit', label: 'Al-Tafsir al-Wasit (Tantawi)', languages: { ar: { 'quran.com': '93' } } },
  { key: 'maarif', label: "Ma'arif al-Qur'an", languages: { en: { 'quran.com': '168' } } },
  { key: 'tazkirul', label: 'Tazkirul Quran', languages: { en: { 'quran.com': '817' }, ur: { 'quran.com': '818' } } },
  { key: 'asbab-wahidi', label: 'Asbab al-Nuzul (al-Wahidi)', languages: { ar: { 'tafsir.app': 'wahidi-asbab' } } },
];

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const norm = (t) => String(t || '').replace(/<[^>]+>|\[\[[\s\S]*?\]\]/g, '').replace(/[ً-ْـ\s\p{P}]/gu, '');

// A failed request must never look like "no text": that would silently drop a
// real work from the catalog. Retry, then abort without rewriting Tafsir.gs.
// Be polite: one request per second to tafsir.app, 600 ms to quran.com.
const SPACING_MS = { 'tafsir.app': 1100, 'api.quran.com': 600 };
const lastRequest = {};
async function paceHost(url) {
  const host = new URL(url).host;
  const wait = (lastRequest[host] || 0) + (SPACING_MS[host] || 300) - Date.now();
  if (wait > 0) await pause(wait);
  lastRequest[host] = Date.now();
}

async function get(url, attempt = 0) {
  await paceHost(url);
  let res;
  try {
    res = await fetch(url, { headers: HEADERS });
  } catch (e) {
    if (attempt < 3) { await pause(2000 * 2 ** attempt); return get(url, attempt + 1); }
    throw new Error(`Network error for ${url}; Tafsir.gs not rewritten`);
  }
  if ((res.status === 403 || res.status === 429 || res.status >= 500) && attempt < 3) {
    await pause(2000 * 2 ** attempt);
    return get(url, attempt + 1);
  }
  return { status: res.status, text: await res.text() };
}
// null only for a real 404; any other failure aborts the run.
async function getJson(url) {
  const r = await get(url);
  if (r.status === 404) return null;
  if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}; Tafsir.gs not rewritten`);
  try { return JSON.parse(r.text); } catch { throw new Error(`Malformed JSON from ${url}; Tafsir.gs not rewritten`); }
}
// A spread of ayahs: a work is kept if ANY of these return text (the spec's
// rule is "returns per-ayah text", not "has text at 2:255"). Sampling stops
// at the first non-empty ayah, so most IDs cost one request.
const SAMPLE_AYAHS = require('./tafsir-sample-ayahs');
const { hasAnyText } = require('./tafsir-sampling');

// Each (source, id, ayah) is sampled once, even though the join and the final check both need it.
const samples = new Map();
async function sampleText(source, id, surah, ayah) {
  const key = source + '|' + id + '|' + surah + ':' + ayah;
  if (!samples.has(key)) samples.set(key, await fetchSample(source, id, surah, ayah));
  return samples.get(key);
}
async function fetchSample(source, id, surah, ayah) {
  if (source === 'tafsir.app') {
    const j = await getJson(`https://tafsir.app/get.php?src=${encodeURIComponent(id)}&s=${surah}&a=${ayah}`);
    return j ? String(j.data || '') : '';
  }
  if (source === 'quran.com') {
    const j = await getJson(`https://api.quran.com/api/v4/tafsirs/${encodeURIComponent(id)}/by_ayah/${surah}:${ayah}`);
    return j && j.tafsir ? String(j.tafsir.text || '') : '';
  }
  throw new Error('Unknown source ' + source);
}

(async () => {
  const home = await get('https://tafsir.app/');
  if (home.status !== 200) throw new Error(`HTTP ${home.status} for https://tafsir.app/; Tafsir.gs not rewritten`);
  const html = home.text;
  const tafsirApp = [...html.matchAll(/<a class=\w* data-src=([\w-]+) href=#>([\s\S]*?)<\/a>/g)].map((m) => {
    const title = /class=short-title>(.*?)</.exec(m[2]) || /class=src-title>(.*?)</.exec(m[2]);
    return { id: m[1], label: decode(title ? title[1] : m[1]) };
  });
  const quranCom = ((await getJson('https://api.quran.com/api/v4/resources/tafsirs')) || {}).tafsirs || [];
  if (!tafsirApp.length || !quranCom.length) throw new Error('A catalog came back empty; Tafsir.gs not rewritten');

  const map = {};
  const used = { 'tafsir.app': new Set(), 'quran.com': new Set() };
  const add = (key, label, lang, source, id, editionLabel) => {
    const entry = map[key] || (map[key] = { label, languages: {} });
    const edition = entry.languages[lang] || (entry.languages[lang] = { sources: {} });
    if (editionLabel) edition.label = editionLabel;
    if (!edition.sources[source]) edition.sources[source] = String(id);
    used[source].add(String(id));
  };

  for (const work of WORKS) {
    for (const [lang, ed] of Object.entries(work.languages)) {
      for (const source of SOURCES) if (ed[source]) add(work.key, work.label, lang, source, ed[source], ed.label);
    }
  }
  for (const e of tafsirApp) if (!used['tafsir.app'].has(e.id)) add(e.id, e.label, 'ar', 'tafsir.app', e.id);

  for (const t of quranCom) {
    const lang = CODE_FOR_NAME[String(t.language_name).toLowerCase()];
    if (!lang || used['quran.com'].has(String(t.id))) continue;
    add(t.slug, t.translated_name && t.translated_name.name ? t.translated_name.name : t.name, lang, 'quran.com', t.id);
  }

  const dropped = { 'tafsir.app': 0, 'quran.com': 0 };
  for (const [key, entry] of Object.entries(map)) {
    for (const [lang, ed] of Object.entries(entry.languages)) {
      for (const [source, id] of Object.entries(ed.sources)) {
        if (!(await hasAnyText(sampleText, source, id, SAMPLE_AYAHS, norm))) {
          console.log('dropped (no text in any sample ayah):', key, lang, source, id);
          dropped[source]++;
          delete ed.sources[source];
        }
      }
      if (!Object.keys(ed.sources).length) delete entry.languages[lang];
    }
    if (!Object.keys(entry.languages).length) delete map[key];
  }
  if (!map.saadi || !map.saadi.languages.ar) throw new Error('Default book saadi missing; Tafsir.gs not rewritten');

  const languages = {};
  for (const entry of Object.values(map)) for (const code of Object.keys(entry.languages)) languages[code] = LANGUAGE_NAMES[code];
  const sorted = Object.fromEntries(Object.keys(languages).sort().map((c) => [c, languages[c]]));
  const block = '// BEGIN GENERATED TAFSIR CATALOG (tools/build-tafsir-map.js, ' + new Date().toISOString().slice(0, 10) + ') - do not edit by hand\n' +
    'var TAFSIR_LANGUAGES = ' + JSON.stringify(sorted, null, 2) + ';\n' +
    'var TAFSIR_MAP = ' + JSON.stringify(map, null, 2) + ';\n' +
    '// END GENERATED TAFSIR CATALOG';
  const src = fs.readFileSync(TAFSIR_GS, 'utf8');
  if (!/\/\/ BEGIN GENERATED TAFSIR CATALOG[\s\S]*?\/\/ END GENERATED TAFSIR CATALOG/.test(src)) throw new Error('Catalog markers missing in Tafsir.gs');
  fs.writeFileSync(TAFSIR_GS, src.replace(/\/\/ BEGIN GENERATED TAFSIR CATALOG[\s\S]*?\/\/ END GENERATED TAFSIR CATALOG/, block));
  console.log('dropped per source (200 with empty text, or 404):', JSON.stringify(dropped));
  console.log('wrote', Object.keys(map).length, 'works in', Object.keys(sorted).length, 'languages');
})().catch((e) => { console.error(e.message); process.exit(1); });

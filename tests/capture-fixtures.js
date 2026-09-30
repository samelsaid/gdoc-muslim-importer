'use strict';
// Captures real API responses for the offline suite. Needs the sunnah.com key:
// SUNNAH_API_KEY="$(security find-generic-password -s nnjasec-sunnah.com-api -w)" \
//   docker compose run --rm -e SUNNAH_API_KEY test node tests/capture-fixtures.js
const fs = require('fs');
const path = require('path');

const key = process.env.SUNNAH_API_KEY;
if (!key) {
  console.error('SUNNAH_API_KEY is not set');
  process.exit(1);
}

const SUNNAH = 'https://api.sunnah.com/v1';
const hadith = (slug, number) => `${SUNNAH}/collections/${slug}/hadiths/${encodeURIComponent(number)}`;
const chain = (slug, n) => [String(n), `${n} a`, `${n}, ${n + 1}`, `${n - 1}, ${n}`].map((x) => hadith(slug, x));

const SUNNAH_URLS = [
  hadith('bukhari', '1'), hadith('bukhari', '2'), hadith('abudawud', '1'),
  ...['7', '8', '8 a', '8 b', '8 c', '8 d', '8 e', '8 f', '9', '10', '11', '11 a'].map((n) => hadith('muslim', n)),
  ...['4', '5', '5 a', '5, 6', '6', '6 a', '6, 7', '7'].map((n) => hadith('shamail', n)),
  hadith('ahmad', '1'), hadith('ahmad', '1438'),
  ...chain('ahmad', 1000), ...chain('ahmad', 1439), ...chain('ahmad', 1440), ...chain('ahmad', 1441),
  hadith('hisn', '1'),
  `${SUNNAH}/collections/forty/books/1/hadiths?limit=50`,
  `${SUNNAH}/collections/forty/books/2/hadiths?limit=50`,
  `${SUNNAH}/collections/forty/books/3/hadiths?limit=50`,
];
const OTHER_URLS = [
  'https://api.alquran.cloud/v1/ayah/1:1/editions/quran-uthmani,en.sahih',
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-abudawud/1.json',
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/1.json',
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-abudawud/2.json',
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/2.json',
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/1.json',
  'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1.json',
];
const TAFSIR_APP = (id, s, a) => `https://tafsir.app/get.php?src=${id}&s=${s}&a=${a}`;
const QURAN_COM = (id, s, a) => `https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`;
const TAFSIR_URLS = [
  'https://api.alquran.cloud/v1/surah',
  TAFSIR_APP('saadi', 2, 255), TAFSIR_APP('saadi', 2, 256), TAFSIR_APP('saadi', 2, 257),
  TAFSIR_APP('tabari', 2, 255), TAFSIR_APP('muyassar', 2, 255), TAFSIR_APP('ibn-katheer', 2, 255),
  TAFSIR_APP('aysar-altafasir', 2, 255), TAFSIR_APP('nope', 2, 255),
  QURAN_COM(91, 2, 255), QURAN_COM(169, 2, 255), QURAN_COM(168, 2, 255),
];

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const SPACING_MS = { 'api.sunnah.com': 1100, 'tafsir.app': 1100, 'api.quran.com': 600 };
const lastRequest = {};
async function paceHost(url) {
  const host = new URL(url).host;
  const wait = (lastRequest[host] || 0) + (SPACING_MS[host] || 300) - Date.now();
  if (wait > 0) await pause(wait);
  lastRequest[host] = Date.now();
}

// sunnah.com rate-limits bursts (429 after about 15 requests at 4/s, observed
// 2026-09-29). Retry with backoff so a throttle is never stored as fixture data.
async function get(url, headers) {
  for (let attempt = 0; ; attempt++) {
    await paceHost(url);
    const res = await fetch(url, { headers });
    if (res.status === 429 && attempt < 4) {
      await pause((parseInt(res.headers.get('retry-after'), 10) || 2 * 2 ** attempt) * 1000);
      continue;
    }
    return { status: res.status, body: await res.text() };
  }
}

(async () => {
  const responses = {};
  for (const url of [...new Set(SUNNAH_URLS)]) {
    responses[url] = await get(url, { 'X-API-Key': key });
    console.log(responses[url].status, url);
  }
  for (const url of [...OTHER_URLS, ...TAFSIR_URLS]) {
    responses[url] = await get(url, {});
    console.log(responses[url].status, url);
  }
  const forbidden = await get(hadith('bukhari', '1'), { 'X-API-Key': 'invalid-key-for-fixture' });
  const out = { capturedAt: new Date().toISOString(), responses, forbidden };
  const text = JSON.stringify(out, null, 1);
  if (text.includes(key)) throw new Error('Refusing to write fixtures: the key appears in a response');
  fs.mkdirSync(path.join(__dirname, 'fixtures'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'fixtures', 'responses.json'), text + '\n');
  console.log('wrote', Object.keys(responses).length, 'responses');
})();

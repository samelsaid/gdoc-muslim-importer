// ============================================================
// sunnah.com source
// ============================================================
// Functions that read the key or call sunnah.com end in "_" so the
// sidebar can't call them through google.script.run.

var SUNNAH_KEY_PROPERTY = 'SUNNAH_API_KEY';

function getSunnahKey_() {
  var key = PropertiesService.getScriptProperties().getProperty(SUNNAH_KEY_PROPERTY);
  return key ? String(key).trim() : '';
}

function isSunnahConfigured_() {
  return getSunnahKey_() !== '';
}

function isSunnahAvailable() {
  return isSunnahConfigured_();
}

// ── Requests ────────────────────────────────────────────────

var SUNNAH_API_BASE = 'https://api.sunnah.com/v1';

var SUNNAH_ERRORS = {
  notConfigured: "sunnah.com isn't set up for this copy of the add-on. Choose another hadith source in Settings.",
  rejected: 'sunnah.com rejected the request. Try again later, or choose another source in Settings.',
  unavailable: 'sunnah.com is unavailable right now. Try again shortly, or choose another source in Settings.',
  badNumber: 'Invalid hadith number: use a number like 1 or 8a.'
};

function sunnahGet_(path) {
  var key = getSunnahKey_();
  if (!key) throw new Error(SUNNAH_ERRORS.notConfigured);
  paceRequest_('sunnah.com');
  var response;
  try {
    response = UrlFetchApp.fetch(SUNNAH_API_BASE + path, {
      method: 'get',
      headers: { 'X-API-Key': key },
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('sunnah.com request failed: network error');
    throw new Error(SUNNAH_ERRORS.unavailable);
  }
  var code = response.getResponseCode();
  if (code === 404) return null;
  if (code === 401 || code === 403) {
    Logger.log('sunnah.com request rejected: HTTP ' + code);
    throw new Error(SUNNAH_ERRORS.rejected);
  }
  if (code === 429) {
    // sunnah.com rate-limits bursts; report a throttle so the tag queue waits and retries.
    Logger.log('sunnah.com rate-limited the request: HTTP 429');
    throw rateLimitedFromResponse_(response);
  }
  if (code !== 200) {
    Logger.log('sunnah.com request failed: HTTP ' + code);
    throw new Error(SUNNAH_ERRORS.unavailable);
  }
  try {
    return JSON.parse(response.getContentText());
  } catch (e) {
    Logger.log('sunnah.com returned malformed JSON');
    throw new Error(SUNNAH_ERRORS.unavailable);
  }
}

function sunnahHadithPath_(slug, apiNumber) {
  return '/collections/' + slug + '/hadiths/' + encodeURIComponent(apiNumber);
}

function sunnahBookPath_(slug, book) {
  return '/collections/' + slug + '/books/' + encodeURIComponent(book) + '/hadiths?limit=50';
}

function sunnahIsBookScoped_(canonical) {
  var target = COLLECTION_MAP[canonical].sunnah;
  return target !== null && typeof target === 'object';
}

// ── Hadith numbers ──────────────────────────────────────────
// API form: '1', '8 a', '5, 6'. Display form: '1', '8a', '5, 6'.
// Other API formats pass through if they use only digits, letters,
// spaces, and commas, so every number sunnah.com returns round-trips.

var SUNNAH_NUMBER_PATTERN = /^(\d{1,5})(?: ?([a-z])|, ?(\d{1,5}))?$/;
var SUNNAH_NUMBER_PASSTHROUGH = /^\d{1,5}[ ,a-z][0-9a-z ,]{0,14}$/;

function normalizeSunnahNumber_(input) {
  var text = String(input).trim().toLowerCase();
  var match = SUNNAH_NUMBER_PATTERN.exec(text);
  if (match) {
    var first = parseInt(match[1], 10);
    if (first < 1) throw new Error(SUNNAH_ERRORS.badNumber);
    if (match[2]) return first + ' ' + match[2];
    if (match[3]) return first + ', ' + parseInt(match[3], 10);
    return String(first);
  }
  if (SUNNAH_NUMBER_PASSTHROUGH.test(text) && parseInt(text, 10) >= 1) return text;
  throw new Error(SUNNAH_ERRORS.badNumber);
}

function displaySunnahNumber_(apiNumber) {
  return String(apiNumber).replace(/^(\d+) ([a-z])$/, '$1$2');
}

function sunnahNumberParts_(apiNumber) {
  var text = String(apiNumber);
  var numbers = text.match(/\d+/g);
  if (!numbers) return null;
  var letter = /^\d+ ([a-z])$/.exec(text);
  return {
    first: parseInt(numbers[0], 10),
    last: parseInt(numbers[numbers.length - 1], 10),
    letter: letter ? letter[1] : ''
  };
}

// ── Hisn al-Muslim text ─────────────────────────────────────

function sunnahHisnParts_(html) {
  var parts = { transliteration: '', translation: '', reference: '' };
  var pattern = /<span class="(transliteration|translation|hisn_english_reference)">([\s\S]*?)<\/span>/g;
  var match;
  while ((match = pattern.exec(String(html))) !== null) {
    var key = match[1] === 'hisn_english_reference' ? 'reference' : match[1];
    parts[key] = htmlToText_(match[2]);
  }
  return parts;
}

// ── Links ───────────────────────────────────────────────────
// Only formats confirmed on sunnah.com. Confirmed 2026-09-28 from search-engine
// indexes of sunnah.com pages. Combined numbers ("5, 6") link to the first
// number (confirmed: shamail:5). Add a slug here only after opening
// https://sunnah.com/<slug>:1 in a browser.

var SUNNAH_WEB_SLUGS = {
  bukhari: 'bukhari', muslim: 'muslim', abudawud: 'abudawud', tirmidhi: 'tirmidhi',
  nasai: 'nasai', ibnmajah: 'ibnmajah', mishkat: 'mishkat', musnadahmad: 'ahmad', adab: 'adab',
  shamail: 'shamail', riyadussalihin: 'riyadussalihin', bulugh: 'bulugh', hisn: 'hisn',
  virtues: 'virtues', thulathiyyat: 'thulathiyyat',
  nawawi: 'nawawi40', qudsi: 'qudsi40', dehlawi: 'shahwaliullah40'
};

function sunnahUrl_(canonical, apiNumber) {
  var slug = SUNNAH_WEB_SLUGS[canonical];
  var match = /^(\d+)(?: ([a-z])|, \d+)?$/.exec(String(apiNumber));
  if (!slug || !match) return '';
  return 'https://sunnah.com/' + slug + ':' + match[1] + (match[2] || '');
}

// ── Result ──────────────────────────────────────────────────

function sunnahLang_(raw, lang) {
  var list = raw && raw.hadith ? raw.hadith : [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].lang === lang) return list[i];
  }
  return null;
}

function buildSunnahResult_(canonical, raw) {
  var en = sunnahLang_(raw, 'en');
  var ar = sunnahLang_(raw, 'ar');
  var enBody = en ? String(en.body || '') : '';
  var parts = /class="translation"/.test(enBody) ? sunnahHisnParts_(enBody) : null;

  var grades = [];
  var rawGrades = (en && en.grades) ? en.grades : [];
  for (var i = 0; i < rawGrades.length; i++) {
    if (rawGrades[i] && rawGrades[i].grade) {
      grades.push({
        grade: htmlToText_(rawGrades[i].grade),
        gradedBy: rawGrades[i].graded_by ? htmlToText_(rawGrades[i].graded_by) : ''
      });
    }
  }
  var statusParts = [];
  for (var j = 0; j < grades.length; j++) {
    statusParts.push(grades[j].gradedBy ? grades[j].grade + ' (' + grades[j].gradedBy + ')' : grades[j].grade);
  }

  var apiNumber = String(raw.hadithNumber);
  var chapterTitle = en ? htmlToText_(en.chapterTitle) : '';
  var refDetail = '';
  if (canonical === 'hisn') {
    refDetail = chapterTitle;
  } else if (!sunnahIsBookScoped_(canonical)) {
    refDetail = 'Book ' + raw.bookNumber;
  }

  return {
    arabic: ar ? htmlToText_(ar.body) : '',
    english: parts ? parts.translation : htmlToText_(enBody),
    urdu: '',
    transliteration: parts ? parts.transliteration : '',
    note: (parts && parts.reference) ? 'Reference: ' + parts.reference : '',
    collection: canonical,
    collectionLabel: COLLECTION_MAP[canonical].label,
    hadithNum: displaySunnahNumber_(apiNumber),
    apiNumber: apiNumber,
    reference: { book: String(raw.bookNumber) },
    chapterTitle: chapterTitle,
    refDetail: refDetail,
    grades: grades,
    status: statusParts.join('; '),
    url: sunnahUrl_(canonical, apiNumber),
    resolvedFrom: '',
    cached: false,
    source: 'sunnah'
  };
}

// ── Cache and throttle ──────────────────────────────────────

var SUNNAH_CACHE_PREFIX = 'sunnah:v1:';
var SUNNAH_CACHE_TTL_SECONDS = 21600;
var SUNNAH_CACHE_MAX_CHARS = 30000; // CacheService values max 100 KB; Arabic is 2-3 bytes per char
var SUNNAH_NOT_FOUND_MARKER = '404';
var SUNNAH_THROTTLE_PER_MINUTE = 60;
var SUNNAH_THROTTLE_PREFIX = 'sunnah:rl:';

function sunnahThrottle_() {
  var now = nowMs_();
  var bucket = Math.floor(now / 60000);
  var cacheKey = SUNNAH_THROTTLE_PREFIX + bucket;
  var lock = LockService.getUserLock();
  lock.waitLock(5000);
  try {
    var cache = CacheService.getUserCache();
    var count = parseInt(cache.get(cacheKey) || '0', 10);
    if (count >= SUNNAH_THROTTLE_PER_MINUTE) {
      throw rateLimitedError_((bucket + 1) * 60000 - now);
    }
    cache.put(cacheKey, String(count + 1), 120);
  } finally {
    lock.releaseLock();
  }
}

// A lookup counts once toward the throttle, however many requests it makes.
function sunnahCount_(op) {
  if (!op.counted) {
    sunnahThrottle_();
    op.counted = true;
  }
}

function sunnahCacheKey_(canonical, apiNumber) {
  return SUNNAH_CACHE_PREFIX + canonical + ':' + encodeURIComponent(apiNumber);
}

// Returns undefined on a miss, null for a cached 404.
function sunnahCacheGet_(key) {
  var value = CacheService.getScriptCache().get(key);
  if (value === null) return undefined;
  if (value === SUNNAH_NOT_FOUND_MARKER) return null;
  return JSON.parse(value);
}

function sunnahCachePut_(key, result) {
  var value = result === null ? SUNNAH_NOT_FOUND_MARKER : JSON.stringify(result);
  if (value.length > SUNNAH_CACHE_MAX_CHARS) return;
  CacheService.getScriptCache().put(key, value, SUNNAH_CACHE_TTL_SECONDS);
}

// ── Lookups ─────────────────────────────────────────────────

function sunnahLookup_(canonical, apiNumber, op) {
  var key = sunnahCacheKey_(canonical, apiNumber);
  var cached = sunnahCacheGet_(key);
  if (cached !== undefined) return cached;
  var result;
  if (sunnahIsBookScoped_(canonical)) {
    result = sunnahLookupInBook_(canonical, apiNumber, op);
  } else {
    sunnahCount_(op);
    var raw = sunnahGet_(sunnahHadithPath_(COLLECTION_MAP[canonical].sunnah, apiNumber));
    result = raw ? buildSunnahResult_(canonical, raw) : null;
  }
  sunnahCachePut_(key, result);
  return result;
}

function sunnahLookupInBook_(canonical, apiNumber, op) {
  var target = COLLECTION_MAP[canonical].sunnah;
  var loadedKey = SUNNAH_CACHE_PREFIX + canonical + ':book-loaded';
  if (CacheService.getScriptCache().get(loadedKey) !== null) return null;
  sunnahCount_(op);
  var page = sunnahGet_(sunnahBookPath_(target.collection, target.book));
  var list = (page && page.data) ? page.data : [];
  var found = null;
  for (var i = 0; i < list.length; i++) {
    var result = buildSunnahResult_(canonical, list[i]);
    sunnahCachePut_(sunnahCacheKey_(canonical, result.apiNumber), result);
    if (result.apiNumber === apiNumber) found = result;
  }
  CacheService.getScriptCache().put(loadedKey, '1', SUNNAH_CACHE_TTL_SECONDS);
  return found;
}

// Plain integers try N, "N a", "N, N+1", then "N-1, N". strict (D3, sunnah.com
// as the fallback): a plain number must match N exactly — never silently
// serve a lettered or combined form the routed source didn't promise.
function sunnahResolve_(canonical, apiNumber, op, strict) {
  if (!/^\d+$/.test(apiNumber) || sunnahIsBookScoped_(canonical)) {
    return sunnahLookup_(canonical, apiNumber, op);
  }
  var n = parseInt(apiNumber, 10);
  if (strict) return sunnahLookup_(canonical, String(n), op);
  var candidates = [String(n), n + ' a', n + ', ' + (n + 1)];
  if (n > 1) candidates.push((n - 1) + ', ' + n);
  for (var i = 0; i < candidates.length; i++) {
    var result = sunnahLookup_(canonical, candidates[i], op);
    if (result) return result;
  }
  return null;
}

// Only used to explain a strict-mode miss: which lettered or combined form
// sunnah.com actually lists the plain number as, so the D3 "fallback also
// failed" message has a clear reason instead of a bare "not found".
function sunnahStrictMismatchReason_(canonical, apiNumber, op) {
  var n = parseInt(apiNumber, 10);
  if (sunnahLookup_(canonical, n + ' a', op)) {
    return 'sunnah.com lists it as ' + displaySunnahNumber_(n + ' a') + '.';
  }
  if (n > 1 && sunnahLookup_(canonical, (n - 1) + ', ' + n, op)) {
    return 'sunnah.com lists it as ' + (n - 1) + ', ' + n + '.';
  }
  if (sunnahLookup_(canonical, n + ', ' + (n + 1), op)) {
    return 'sunnah.com lists it as ' + n + ', ' + (n + 1) + '.';
  }
  return '';
}

function sunnahCanonical_(collection) {
  var canonical = resolveCollectionSlug(String(collection));
  if (!canonical || COLLECTION_MAP[canonical].sunnah === null) {
    throw new Error('Collection "' + collection + '" is not available on sunnah.com. Switch hadith source in Settings or use a different collection.');
  }
  return canonical;
}

function sunnahNotFoundMessage_(canonical, displayNumber) {
  var message = 'Not found: ' + COLLECTION_MAP[canonical].label + ' ' + displayNumber + '.';
  if (canonical === 'musnadahmad') {
    message = message + ' sunnah.com has only part of Musnad Ahmad.';
  }
  return message;
}

function sunnahCopy_(result) {
  return JSON.parse(JSON.stringify(result));
}

// strict (D3): sunnah.com serving as the fallback must match the plain
// number exactly, never a lettered or combined form. Routed (non-fallback)
// lookups keep today's resolution.
function fetchHadithFromSunnah_(collection, hadithNum, strict) {
  var canonical = sunnahCanonical_(collection);
  var apiNumber = normalizeSunnahNumber_(hadithNum);
  var typed = displaySunnahNumber_(apiNumber);
  var op = { counted: false };
  var result = sunnahResolve_(canonical, apiNumber, op, strict);
  if (!result) {
    var message = sunnahNotFoundMessage_(canonical, typed);
    if (strict) {
      var reason = sunnahStrictMismatchReason_(canonical, apiNumber, op);
      if (reason) message = message + ' ' + reason;
    }
    throw new Error(message);
  }
  var copy = sunnahCopy_(result);
  copy.resolvedFrom = typed !== copy.hadithNum ? typed : '';
  copy.cached = !op.counted;
  return copy;
}

// ── Navigation ──────────────────────────────────────────────

var SUNNAH_MAX_SKIPPED_NUMBERS = 3;

// The last entry numbered n: "n", the last letter of "n a".."n z", or a combined number.
function sunnahResolveLast_(canonical, n, op) {
  var plainResult = sunnahLookup_(canonical, String(n), op);
  if (plainResult || sunnahIsBookScoped_(canonical)) return plainResult;
  var last = sunnahLookup_(canonical, n + ' a', op);
  if (last) {
    for (var code = 98; code <= 122; code++) {
      var next = sunnahLookup_(canonical, n + ' ' + String.fromCharCode(code), op);
      if (!next) break;
      last = next;
    }
    return last;
  }
  if (n > 1) {
    var before = sunnahLookup_(canonical, (n - 1) + ', ' + n, op);
    if (before) return before;
  }
  return sunnahLookup_(canonical, n + ', ' + (n + 1), op);
}

function sunnahAdjacent_(canonical, apiNumber, step, op) {
  var parts = sunnahNumberParts_(apiNumber);
  if (!parts) return null;
  if (step > 0) {
    if (parts.letter) {
      var sibling = sunnahLookup_(canonical, parts.first + ' ' + String.fromCharCode(parts.letter.charCodeAt(0) + 1), op);
      if (sibling) return sibling;
    }
    for (var ahead = 1; ahead <= SUNNAH_MAX_SKIPPED_NUMBERS; ahead++) {
      var found = sunnahResolve_(canonical, String(parts.last + ahead), op);
      if (found) return found;
    }
    return null;
  }
  if (parts.letter && parts.letter !== 'a') {
    return sunnahLookup_(canonical, parts.first + ' ' + String.fromCharCode(parts.letter.charCodeAt(0) - 1), op);
  }
  for (var back = 1; back <= SUNNAH_MAX_SKIPPED_NUMBERS; back++) {
    var k = parts.first - back;
    if (k < 1) return null;
    var previous = sunnahResolveLast_(canonical, k, op);
    if (previous) return previous;
  }
  return null;
}

function fetchAdjacentFromSunnah_(collection, hadithNum, step) {
  var canonical = sunnahCanonical_(collection);
  var apiNumber = normalizeSunnahNumber_(hadithNum);
  var op = { counted: false };
  var result = sunnahAdjacent_(canonical, apiNumber, step, op);
  if (!result) {
    // .boundary: a collection edge, not a source failure (Code.gs, D3 fallback).
    throw hadithBoundaryError_('No more hadith found ' + (step > 0 ? 'after ' : 'before ') +
      COLLECTION_MAP[canonical].label + ' ' + displaySunnahNumber_(apiNumber) + '.');
  }
  var copy = sunnahCopy_(result);
  copy.resolvedFrom = '';
  copy.cached = !op.counted;
  return copy;
}

// ============================================================
// Quran & Hadith Importer -- Google Docs Add-on
// ============================================================
// APIs used:
//   Quran:  https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/editions/quran-uthmani,{translation}
//   Hadith: https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{lang}-{collection}/{hadithNum}.json
//   Hadith: https://hadithapi.com/api/hadiths/?apiKey={key}&book={slug}&hadithNumber={num}
//
// Install: Extensions > Apps Script > paste Code.gs + Sidebar.html
// ============================================================

// ── Preferences ─────────────────────────────────────────────

var DEFAULT_PREFS = {
  showTranslation: true,
  quranTranslation: 'en.sahih',
  hadithSource: 'fawazahmed0',
  hadithApiKey: '',
  hadithTranslation: 'english',
  hadithFallback: 'hadithapi',
  hadithFallbackOn: true
};

var VALID_QURAN_TRANSLATIONS = [
  'en.sahih', 'en.pickthall', 'en.yusufali', 'en.hilali', 'en.itani',
  'fr.hamidullah', 'es.cortes', 'tr.diyanet',
  'ur.jalandhry', 'ur.maududi',
  'id.indonesian', 'ru.kuliev', 'de.bubenheim', 'ms.basmeih', 'bn.bengali'
];

var VALID_HADITH_SOURCES = ['sunnah', 'fawazahmed0', 'hadithapi'];
var SOURCE_FIELD = { sunnah: 'sunnah', fawazahmed0: 'fawaz', hadithapi: 'hadithapi' };

// ── Hadith source routing ───────────────────────────────────
// The citation picks the source. The saved hadithSource only settles
// citations that fit more than one source.

var HADITH_SOURCE_LABELS = { sunnah: 'sunnah.com', fawazahmed0: 'fawazahmed0', hadithapi: 'hadithapi.com' };
var HADITH_TAG_PREFIXES = { sunnah: 'sunnah', fawazahmed0: 'fawaz', hadithapi: 'hadithapi' };
// Identical numbering, verified 2026-09-28: same text at hadith 1, 500, and 3000.
var SHARED_NUMBERING = {
  bukhari: ['sunnah', 'fawazahmed0'],
  abudawud: ['sunnah', 'fawazahmed0'],
  tirmidhi: ['sunnah', 'fawazahmed0'],
  nasai: ['sunnah', 'fawazahmed0'],
  ibnmajah: ['sunnah', 'fawazahmed0']
};

// hadithapi.com returns 404 for all of these (CLAUDE.md Known issues). Plain
// routing skips them, and cite notes never suggest them, even though the
// COLLECTION_MAP entry is non-null (kept for future availability).
var KNOWN_EMPTY_HADITH = { hadithapi: ['mishkat', 'musnadahmad', 'silsilasahiha'] };

function hadithSourcesFor_(canonical) {
  var sources = [];
  for (var i = 0; i < VALID_HADITH_SOURCES.length; i++) {
    if (COLLECTION_MAP[canonical][SOURCE_FIELD[VALID_HADITH_SOURCES[i]]] !== null) {
      sources.push(VALID_HADITH_SOURCES[i]);
    }
  }
  return sources;
}

// Drops sources KNOWN_EMPTY_HADITH lists for this collection, unless that
// would leave nothing to route to.
function hadithSourcesExcludingKnownEmpty_(canonical, sources) {
  var filtered = [];
  for (var i = 0; i < sources.length; i++) {
    var emptyList = KNOWN_EMPTY_HADITH[sources[i]];
    if (emptyList && emptyList.indexOf(canonical) !== -1) continue;
    filtered.push(sources[i]);
  }
  return filtered.length ? filtered : sources;
}

function isHadithSourceAvailable_(source, prefs) {
  if (source === 'sunnah') return isSunnahConfigured_();
  if (source === 'hadithapi') return String(prefs.hadithApiKey || '').trim() !== '';
  return true;
}

function hadithCiteNote_(canonical, exclude) {
  var sources = hadithSourcesFor_(canonical);
  var ways = [];
  for (var i = 0; i < sources.length; i++) {
    if (sources[i] === exclude) continue;
    var emptyList = KNOWN_EMPTY_HADITH[sources[i]];
    if (emptyList && emptyList.indexOf(canonical) !== -1) continue;
    ways.push('/hadith ' + HADITH_TAG_PREFIXES[sources[i]] + ':' + canonical + ':<number> (' + HADITH_SOURCE_LABELS[sources[i]] + ' numbering)');
  }
  return ways.length ? ' Other ways to cite ' + COLLECTION_MAP[canonical].label + ': ' + ways.join(', ') + '.' : '';
}

function hadithUnavailableMessage_(source) {
  if (source === 'sunnah') return "sunnah.com isn't available in this copy of the add-on.";
  if (source === 'hadithapi') return 'hadithapi.com needs your API key in Settings.';
  return HADITH_SOURCE_LABELS[source] + ' is unavailable.';
}

// Public: read-only lookup of SHARED_NUMBERING, for the sidebar's D5
// pair-specific Settings help line. Touches no key and no network.
// D5's pair-specific line lists collections in SHARED_NUMBERING's own
// declaration order (Bukhari, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah);
// Object.keys preserves that for these plain string keys.
function getFallbackCoverage(defaultSource, fallbackSource) {
  var labels = [];
  var canonicals = Object.keys(SHARED_NUMBERING);
  for (var i = 0; i < canonicals.length; i++) {
    if (hadithFallbackPairShared_(canonicals[i], defaultSource, fallbackSource)) {
      labels.push(COLLECTION_MAP[canonicals[i]].label);
    }
  }
  return { shared: labels };
}

// Picks canonical + source without checking availability, so a caller that
// wants D3 fallback (see fetchHadithWithFallback_) can see what was routed
// even when it's unavailable. routeHadith_ below adds the availability check
// back for callers that just want the old throw-on-unavailable behavior.
function routeHadithCompute_(collection, hadithNum, requested, prefs) {
  var canonical = resolveCollectionSlug(String(collection));
  if (!canonical) {
    throw new Error('Invalid collection: ' + collection + '. Must be one of: ' + Object.keys(COLLECTION_MAP).join(', '));
  }
  var sources = hadithSourcesFor_(canonical);
  var label = COLLECTION_MAP[canonical].label;
  // sunnah.com numbering isn't just letters (8a): it also combines numbers (5, 6).
  // Only a string that actually matches one of those forms (and isn't plain
  // digits) is sunnah.com-only; anything else (including '', '-5', '1.5')
  // keeps today's plain-digit routing so the number validators explain it.
  var trimmedNum = String(hadithNum).trim().toLowerCase();
  var plainDigits = /^\d+$/.test(trimmedNum);
  var sunnahFormat = !plainDigits && (SUNNAH_NUMBER_PATTERN.test(trimmedNum) || SUNNAH_NUMBER_PASSTHROUGH.test(trimmedNum));
  var formatWord = /[a-z]/i.test(String(hadithNum)) ? 'Letters' : 'Numbers';
  var explicit = !!requested && requested !== 'auto';
  var source;

  if (explicit) {
    if (VALID_HADITH_SOURCES.indexOf(requested) === -1) throw new Error('Invalid hadith source: ' + requested);
    if (sources.indexOf(requested) === -1) {
      throw new Error(label + ' is not on ' + HADITH_SOURCE_LABELS[requested] + '.' + hadithCiteNote_(canonical, requested));
    }
    if (sunnahFormat && requested !== 'sunnah') {
      throw new Error(formatWord + ' like ' + hadithNum + ' are sunnah.com numbering; ' + HADITH_SOURCE_LABELS[requested] + ' numbers use digits only.');
    }
    source = requested;
  } else if (sunnahFormat) {
    if (sources.indexOf('sunnah') === -1) {
      throw new Error(formatWord + ' like ' + hadithNum + " are sunnah.com numbering, and sunnah.com doesn't have " + label + '.');
    }
    source = 'sunnah';
  } else {
    var eligible = hadithSourcesExcludingKnownEmpty_(canonical, sources);
    source = eligible.length === 1 ? eligible[0]
      : (eligible.indexOf(prefs.hadithSource) !== -1 ? prefs.hadithSource : eligible[0]);
  }
  return { canonical: canonical, source: source, explicit: explicit, sunnahFormat: sunnahFormat };
}

// Citation-only routing, unavailable sources included: no fallback. The fetch
// path (fetchHadithWithFallback_) is the only place D3 fallback happens.
function routeHadith_(collection, hadithNum, requested, prefs) {
  var route = routeHadithCompute_(collection, hadithNum, requested, prefs);
  if (!isHadithSourceAvailable_(route.source, prefs)) {
    throw new Error(hadithUnavailableMessage_(route.source) + hadithCiteNote_(route.canonical, route.source));
  }
  return { canonical: route.canonical, source: route.source };
}

function isHadithValidationError_(e) {
  return /^Invalid hadith number/.test(e.message);
}

// strict: passed through to sunnah.com only, and only true when this source
// is serving as the D3 fallback (see fetchHadithWithFallback_).
function fetchHadithBySource_(canonical, hadithNum, source, prefs, strict) {
  if (source === 'sunnah') return fetchHadithFromSunnah_(canonical, hadithNum, strict);
  if (source === 'hadithapi') return fetchHadithFromHadithApi(canonical, hadithNum, prefs.hadithApiKey);
  return fetchHadithFromFawaz(canonical, hadithNum);
}

function hadithFallbackPairShared_(canonical, source, fallback) {
  var shared = SHARED_NUMBERING[canonical] || [];
  return shared.indexOf(source) !== -1 && shared.indexOf(fallback) !== -1;
}

// Appends a clause to a message, adding '.' first when the message doesn't
// already end in punctuation. Some thrown messages (e.g. "Hadith not found:
// X #N") have no trailing period, unlike the sunnah.com ones.
function hadithJoin_(message, addition) {
  if (!addition) return message;
  var trimmed = String(addition).replace(/^\s+/, '');
  if (!trimmed) return message;
  return message + (/[.!?]$/.test(message) ? ' ' : '. ') + trimmed;
}

// D3: implemented once here, for every non-explicit hadith fetch — fetchHadith,
// and so insertHadithAtCursor, replaceTag, and (via a per-source fetcher)
// fetchAdjacentHadith. route comes from routeHadithCompute_; fetchBySource(src,
// isFallback) does the actual fetch/navigation for one source and throws on
// failure; isFallback is true only for the fallback call, so a fetcher that
// cares (fetchHadithBySource_, for sunnah.com's strict D3 numbering) can act
// on it. A thrown error with .boundary (a collection edge, not a source
// failure — see fetchAdjacentHadith) is never fallback-eligible, like a
// validation error.
function fetchHadithWithFallback_(canonical, hadithNum, route, prefs, fetchBySource) {
  var source = route.source;
  var primaryError;
  if (isHadithSourceAvailable_(source, prefs)) {
    try {
      var data = fetchBySource(source, false);
      data.fallbackFrom = '';
      return data;
    } catch (e) {
      if (e.retryAfterMs || e.boundary || isHadithValidationError_(e)) throw e;
      primaryError = e;
    }
  } else {
    primaryError = new Error(hadithUnavailableMessage_(source));
  }

  var fallback = prefs.hadithFallback;
  var wouldFallback = !route.explicit && !route.sunnahFormat && prefs.hadithFallbackOn && fallback && fallback !== source;
  var pairShared = wouldFallback && hadithFallbackPairShared_(canonical, source, fallback);

  if (!pairShared) {
    var fallbackHasCollection = wouldFallback && hadithSourcesExcludingKnownEmpty_(canonical, hadithSourcesFor_(canonical)).indexOf(fallback) !== -1;
    var note = (wouldFallback && fallbackHasCollection)
      ? 'No fallback: ' + HADITH_SOURCE_LABELS[fallback] + " isn't confirmed to number " + COLLECTION_MAP[canonical].label + ' the same way.'
      : '';
    throw new Error(hadithJoin_(hadithJoin_(primaryError.message, note), hadithCiteNote_(canonical, source)));
  }

  if (!isHadithSourceAvailable_(fallback, prefs)) {
    var unavailableNote = 'The fallback (' + HADITH_SOURCE_LABELS[fallback] + ") isn't available: " + hadithUnavailableMessage_(fallback);
    throw new Error(hadithJoin_(hadithJoin_(primaryError.message, unavailableNote), hadithCiteNote_(canonical, source)));
  }

  try {
    var fbData = fetchBySource(fallback, true);
    fbData.fallbackFrom = HADITH_SOURCE_LABELS[source];
    return fbData;
  } catch (e2) {
    if (e2.retryAfterMs || e2.boundary) throw e2;
    var failedNote = 'The fallback (' + HADITH_SOURCE_LABELS[fallback] + ') also failed: ' + e2.message;
    throw new Error(hadithJoin_(hadithJoin_(primaryError.message, failedNote), hadithCiteNote_(canonical, source)));
  }
}
var VALID_HADITH_TRANSLATIONS = ['english', 'urdu'];

function getPrefs() {
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty('prefs');
  var saved = {};
  if (raw) {
    try {
      saved = JSON.parse(raw);
    } catch (e) {
      Logger.log('Failed to parse prefs: ' + e.message);
    }
  }
  var merged = {};
  for (var key in DEFAULT_PREFS) {
    if (DEFAULT_PREFS.hasOwnProperty(key)) {
      merged[key] = saved.hasOwnProperty(key) ? saved[key] : DEFAULT_PREFS[key];
    }
  }
  // hadithSource is the default for citations that fit more than one source.
  // A saved 'sunnah' is kept even if the key goes missing: the fetch path
  // (fetchHadithWithFallback_, D3) then falls back only where the toggle is
  // on and numbering matches, instead of silently switching Sahih Muslim to
  // another numbering.
  if (!saved.hasOwnProperty('hadithSource') && isSunnahConfigured_()) {
    merged.hadithSource = 'sunnah';
  }
  // hadithFallback: fill it in for prefs saved before it existed, and repair
  // it if it now equals hadithSource (D2 — the two must never match).
  if (!saved.hasOwnProperty('hadithFallback') || merged.hadithFallback === merged.hadithSource) {
    merged.hadithFallback = defaultHadithFallback_(merged.hadithSource);
  }
  merged.gradeColors = validateGradeColors_(saved.gradeColors);
  merged.tafsir = validateTafsirPrefs_(saved.tafsir);
  return merged;
}

// D2 default: fawazahmed0's own default depends on what's actually
// configured, so it can't be a fixed DEFAULT_PREFS value.
function defaultHadithFallback_(hadithSource) {
  if (hadithSource === 'fawazahmed0') return isSunnahConfigured_() ? 'sunnah' : 'hadithapi';
  return 'fawazahmed0';
}

function savePrefs(prefs) {
  var validated = {};
  validated.showTranslation = prefs.showTranslation === true || prefs.showTranslation === 'true';

  // Validate quranTranslation
  var qtFound = false;
  for (var i = 0; i < VALID_QURAN_TRANSLATIONS.length; i++) {
    if (VALID_QURAN_TRANSLATIONS[i] === prefs.quranTranslation) {
      qtFound = true;
      break;
    }
  }
  validated.quranTranslation = qtFound ? prefs.quranTranslation : DEFAULT_PREFS.quranTranslation;

  // Validate hadithSource
  var hsFound = false;
  for (var j = 0; j < VALID_HADITH_SOURCES.length; j++) {
    if (VALID_HADITH_SOURCES[j] === prefs.hadithSource) {
      hsFound = true;
      break;
    }
  }
  validated.hadithSource = hsFound ? prefs.hadithSource : DEFAULT_PREFS.hadithSource;
  if (validated.hadithSource === 'sunnah' && !isSunnahConfigured_()) {
    validated.hadithSource = 'fawazahmed0';
  }

  // Validate hadithFallback (D2: never equal to hadithSource; sunnah needs the key)
  var hfFound = false;
  for (var f = 0; f < VALID_HADITH_SOURCES.length; f++) {
    if (VALID_HADITH_SOURCES[f] === prefs.hadithFallback) {
      hfFound = true;
      break;
    }
  }
  validated.hadithFallback = hfFound ? prefs.hadithFallback : defaultHadithFallback_(validated.hadithSource);
  if (validated.hadithFallback === 'sunnah' && !isSunnahConfigured_()) {
    validated.hadithFallback = defaultHadithFallback_(validated.hadithSource);
  }
  if (validated.hadithFallback === validated.hadithSource) {
    validated.hadithFallback = defaultHadithFallback_(validated.hadithSource);
  }

  // D2 default is true, so anything but an explicit false keeps it on
  // (unlike showTranslation, missing here must not silently disable the toggle).
  validated.hadithFallbackOn = !(prefs.hadithFallbackOn === false || prefs.hadithFallbackOn === 'false');

  // Validate hadithTranslation
  var htFound = false;
  for (var k = 0; k < VALID_HADITH_TRANSLATIONS.length; k++) {
    if (VALID_HADITH_TRANSLATIONS[k] === prefs.hadithTranslation) {
      htFound = true;
      break;
    }
  }
  validated.hadithTranslation = htFound ? prefs.hadithTranslation : DEFAULT_PREFS.hadithTranslation;
  // Urdu comes only from hadithapi.com, but the citation picks the source,
  // so keep the preference; results without Urdu show English.

  validated.hadithApiKey = (prefs.hadithApiKey != null) ? String(prefs.hadithApiKey) : '';

  validated.gradeColors = validateGradeColors_(prefs.gradeColors);
  validated.tafsir = validateTafsirPrefs_(prefs.tafsir);

  PropertiesService.getUserProperties().setProperty('prefs', JSON.stringify(validated));
  return validated;
}

function testHadithApiKey(apiKey) {
  if (!apiKey || String(apiKey).trim() === '') {
    throw new Error('API key cannot be empty');
  }
  var key = String(apiKey).trim();
  var url = 'https://hadithapi.com/api/hadiths/?apiKey=' + encodeURIComponent(key) + '&book=sahih-bukhari&hadithNumber=1';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = response.getResponseCode();

  if (code === 401 || code === 403) {
    throw new Error('Invalid API key. Please check your hadithapi.com key and try again.');
  }
  if (code !== 200) {
    throw new Error('hadithapi.com returned HTTP ' + code + '. Please try again later.');
  }

  var json = JSON.parse(response.getContentText());
  if (!json.hadiths || !json.hadiths.data || json.hadiths.data.length === 0) {
    throw new Error('Unexpected response from hadithapi.com. The API key may be invalid.');
  }

  return true;
}

// ── Collection Map ──────────────────────────────────────────
// sunnah: a sunnah.com slug, { collection, book } for entries served from one
// book of a multi-book collection, or null when sunnah.com lacks it.

var COLLECTION_MAP = {
  bukhari:        { fawaz: 'bukhari',  hadithapi: 'sahih-bukhari',     sunnah: 'bukhari',        label: 'Sahih al-Bukhari' },
  muslim:         { fawaz: 'muslim',   hadithapi: 'sahih-muslim',      sunnah: 'muslim',         label: 'Sahih Muslim' },
  abudawud:       { fawaz: 'abudawud', hadithapi: 'abu-dawood',        sunnah: 'abudawud',       label: 'Sunan Abi Dawud' },
  tirmidhi:       { fawaz: 'tirmidhi', hadithapi: 'al-tirmidhi',       sunnah: 'tirmidhi',       label: "Jami' at-Tirmidhi" },
  nasai:          { fawaz: 'nasai',    hadithapi: 'sunan-nasai',       sunnah: 'nasai',          label: "Sunan an-Nasa'i" },
  ibnmajah:       { fawaz: 'ibnmajah', hadithapi: 'ibn-e-majah',       sunnah: 'ibnmajah',       label: 'Sunan Ibn Majah' },
  malik:          { fawaz: 'malik',    hadithapi: null,                sunnah: null,             label: 'Muwatta Malik' },
  mishkat:        { fawaz: null,       hadithapi: 'mishkat',           sunnah: 'mishkat',        label: 'Mishkat al-Masabih' },
  musnadahmad:    { fawaz: null,       hadithapi: 'musnad-ahmad',      sunnah: 'ahmad',          label: 'Musnad Ahmad' },
  silsilasahiha:  { fawaz: null,       hadithapi: 'al-silsila-sahiha', sunnah: null,             label: 'Al-Silsila al-Sahiha' },
  adab:           { fawaz: null,       hadithapi: null,                sunnah: 'adab',           label: 'Al-Adab Al-Mufrad' },
  shamail:        { fawaz: null,       hadithapi: null,                sunnah: 'shamail',        label: "Ash-Shama'il Al-Muhammadiyah" },
  riyadussalihin: { fawaz: null,       hadithapi: null,                sunnah: 'riyadussalihin', label: 'Riyad as-Salihin' },
  bulugh:         { fawaz: null,       hadithapi: null,                sunnah: 'bulugh',         label: 'Bulugh al-Maram' },
  hisn:           { fawaz: null,       hadithapi: null,                sunnah: 'hisn',           label: 'Hisn al-Muslim' },
  virtues:        { fawaz: null,       hadithapi: null,                sunnah: 'virtues',        label: "Virtues of the Qur'an" },
  thulathiyyat:   { fawaz: null,       hadithapi: null,                sunnah: 'thulathiyyat',   label: 'Three-Narrator Ahadith' },
  nawawi:         { fawaz: null,       hadithapi: null,                sunnah: { collection: 'forty', book: '1' }, label: 'Forty Hadith of an-Nawawi' },
  qudsi:          { fawaz: null,       hadithapi: null,                sunnah: { collection: 'forty', book: '2' }, label: 'Forty Hadith Qudsi' },
  dehlawi:        { fawaz: null,       hadithapi: null,                sunnah: { collection: 'forty', book: '3' }, label: 'Forty Hadith of Shah Waliullah Dehlawi' }
};

function getCollectionsForSource(source) {
  var field = SOURCE_FIELD[source];
  var result = [];
  if (!field && source !== 'auto') return result;
  for (var key in COLLECTION_MAP) {
    if (COLLECTION_MAP.hasOwnProperty(key) && (source === 'auto' || COLLECTION_MAP[key][field] !== null)) {
      result.push({ value: key, label: COLLECTION_MAP[key].label });
    }
  }
  return result;
}

function resolveCollectionSlug(input) {
  var slug = String(input).toLowerCase();
  if (COLLECTION_MAP.hasOwnProperty(slug)) {
    return slug;
  }
  for (var key in COLLECTION_MAP) {
    if (COLLECTION_MAP.hasOwnProperty(key)) {
      var entry = COLLECTION_MAP[key];
      if (entry.fawaz === slug || entry.hadithapi === slug || entry.sunnah === slug) {
        return key;
      }
    }
  }
  return null;
}

// ── Input Validation ──────────────────────────────────────

function validateSurahAyah(surah, ayah) {
  var s = parseInt(surah, 10);
  var a = parseInt(ayah, 10);
  if (isNaN(s) || s < 1 || s > 114) {
    throw new Error('Invalid surah number: must be 1-114');
  }
  if (isNaN(a) || a < 1) {
    throw new Error('Invalid ayah number: must be a positive integer');
  }
  return { surah: s, ayah: a };
}

function validateHadithInput(collection, hadithNum, sourceOverride) {
  var source = sourceOverride || getPrefs().hadithSource;
  var field = SOURCE_FIELD[source];

  var canonical = resolveCollectionSlug(String(collection));
  if (!canonical) {
    var available = getCollectionsForSource(source);
    var names = [];
    for (var i = 0; i < available.length; i++) {
      names.push(available[i].value);
    }
    throw new Error('Invalid collection: ' + collection + '. Must be one of: ' + names.join(', '));
  }

  if (COLLECTION_MAP[canonical][field] === null) {
    throw new Error('Collection "' + collection + '" is not available on ' + source + '. Switch hadith source in Settings or use a different collection.');
  }

  if (source === 'sunnah') {
    return { collection: canonical, hadithNum: normalizeSunnahNumber_(hadithNum) };
  }

  var h = parseInt(hadithNum, 10);
  if (isNaN(h) || h < 1) {
    throw new Error('Invalid hadith number: must be a positive integer');
  }
  return { collection: canonical, hadithNum: h };
}

function onOpen(e) {
  // createAddonMenu (not createMenu): Google moves a custom top-level menu
  // under Extensions once the add-on is published (BUG-003).
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Open Sidebar', 'showSidebar')
    .addItem('Scan & Replace Tags', 'scanFromMenu')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Quran & Hadith Importer')
    .setWidth(360);
  DocumentApp.getUi().showSidebar(html);
}

// ── Quran API ──────────────────────────────────────────────

function fetchAyah(surah, ayah) {
  var valid = validateSurahAyah(surah, ayah);
  var prefs = getPrefs();
  var showTranslation = prefs.showTranslation;
  var translationEdition = prefs.quranTranslation;

  var editions = 'quran-uthmani';
  if (showTranslation) {
    editions = editions + ',' + translationEdition;
  }

  var url = 'https://api.alquran.cloud/v1/ayah/' + valid.surah + ':' + valid.ayah + '/editions/' + editions;
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());

  if (json.code !== 200 || !json.data) {
    throw new Error('Ayah not found: ' + valid.surah + ':' + valid.ayah);
  }

  // When showTranslation is off, data is an array with 1 element; when on, 2 elements
  var arabicData;
  var translationText = '';
  var editionUsed = '';

  if (showTranslation) {
    if (!json.data.length || json.data.length < 2) {
      throw new Error('Ayah not found: ' + valid.surah + ':' + valid.ayah);
    }
    arabicData = json.data[0];
    translationText = json.data[1].text;
    editionUsed = translationEdition;
  } else {
    if (!json.data.length || json.data.length < 1) {
      throw new Error('Ayah not found: ' + valid.surah + ':' + valid.ayah);
    }
    arabicData = json.data[0];
  }

  return {
    arabic: arabicData.text,
    translation: translationText,
    translationEdition: editionUsed,
    english: translationText || '',
    surahName: arabicData.surah.name,
    surahEnglish: arabicData.surah.englishName,
    surahNum: arabicData.surah.number,
    ayahNum: arabicData.numberInSurah,
    totalAyahs: arabicData.surah.numberOfAyahs
  };
}

function validateAyahRange(surah, startAyah, endAyah) {
  var s = parseInt(surah, 10);
  var start = parseInt(startAyah, 10);
  var end = parseInt(endAyah, 10);
  if (isNaN(s) || s < 1 || s > 114) {
    throw new Error('Invalid surah number: must be 1-114');
  }
  if (isNaN(start) || start < 1) {
    throw new Error('Invalid start ayah: must be a positive integer');
  }
  if (isNaN(end) || end < start) {
    throw new Error('Invalid end ayah: must be >= start ayah');
  }
  if (end - start + 1 > 25) {
    throw new Error('Range too large: maximum 25 ayahs at a time');
  }
  return { surah: s, startAyah: start, endAyah: end };
}

function fetchAyahRange(surah, startAyah, endAyah) {
  var valid = validateAyahRange(surah, startAyah, endAyah);
  var prefs = getPrefs();
  var showTranslation = prefs.showTranslation;
  var translationEdition = prefs.quranTranslation;
  var count = valid.endAyah - valid.startAyah + 1;
  var offset = valid.startAyah - 1;

  var editions = 'quran-uthmani';
  if (showTranslation) {
    editions = editions + ',' + translationEdition;
  }

  var url = 'https://api.alquran.cloud/v1/surah/' + valid.surah + '/editions/' + editions + '?offset=' + offset + '&limit=' + count;
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());

  if (json.code !== 200 || !json.data) {
    throw new Error('Ayah range not found: ' + valid.surah + ':' + valid.startAyah + '-' + valid.endAyah);
  }

  var arabicEdition = json.data[0] || json.data;
  var translationEditionData = showTranslation ? json.data[1] : null;

  if (!arabicEdition.ayahs || arabicEdition.ayahs.length === 0) {
    throw new Error('No ayahs found in range ' + valid.surah + ':' + valid.startAyah + '-' + valid.endAyah);
  }

  var results = [];
  for (var i = 0; i < arabicEdition.ayahs.length; i++) {
    var translationText = '';
    if (showTranslation && translationEditionData && translationEditionData.ayahs && translationEditionData.ayahs[i]) {
      translationText = translationEditionData.ayahs[i].text;
    }
    results.push({
      arabic: arabicEdition.ayahs[i].text,
      translation: translationText,
      translationEdition: showTranslation ? translationEdition : '',
      english: translationText || '',
      surahName: arabicEdition.name,
      surahEnglish: arabicEdition.englishName,
      surahNum: arabicEdition.number,
      ayahNum: arabicEdition.ayahs[i].numberInSurah,
      totalAyahs: arabicEdition.numberOfAyahs
    });
  }
  return results;
}

function insertAyahRangeAtCursor(surah, startAyah, endAyah) {
  var ayahs = fetchAyahRange(surah, startAyah, endAyah);
  var pos = getCursorIndex();
  if (!pos) return;

  var index = pos.index;
  for (var i = 0; i < ayahs.length; i++) {
    var inserted = insertQuranBlock(pos.body, index, ayahs[i]);
    index = index + inserted;
  }
  return ayahs[0];
}

function getSurahAyahCount(surah) {
  var valid = validateSurahAyah(surah, 1);
  var url = 'https://api.alquran.cloud/v1/ayah/' + valid.surah + ':1/editions/quran-uthmani';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());
  if (json.code !== 200 || !json.data || !json.data.length) {
    throw new Error('Could not fetch surah metadata for surah ' + valid.surah);
  }
  return json.data[0].surah.numberOfAyahs;
}

// ── Hadith API ─────────────────────────────────────────────

function fetchHadithFromFawaz(collection, hadithNum) {
  var valid = validateHadithInput(collection, hadithNum, 'fawazahmed0');
  var baseUrl = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';

  var engUrl = baseUrl + 'eng-' + valid.collection + '/' + valid.hadithNum + '.json';
  var engResponse = UrlFetchApp.fetch(engUrl, { muteHttpExceptions: true });

  if (engResponse.getResponseCode() !== 200) {
    throw new Error('Hadith not found: ' + valid.collection + ' #' + valid.hadithNum);
  }

  var engJson = JSON.parse(engResponse.getContentText());

  if (!engJson.hadiths || !engJson.hadiths.length) {
    throw new Error('No hadith data returned for: ' + valid.collection + ' #' + valid.hadithNum);
  }

  var englishText = engJson.hadiths[0].text;
  var reference = engJson.hadiths[0].reference;

  var arabicText = '';
  try {
    var araUrl = baseUrl + 'ara-' + valid.collection + '/' + valid.hadithNum + '.json';
    var araResponse = UrlFetchApp.fetch(araUrl, { muteHttpExceptions: true });
    if (araResponse.getResponseCode() === 200) {
      var araJson = JSON.parse(araResponse.getContentText());
      if (araJson.hadiths && araJson.hadiths.length) {
        arabicText = araJson.hadiths[0].text;
      }
    }
  } catch (e) {
    Logger.log('Arabic hadith not available: ' + e.message);
  }

  return {
    arabic: arabicText,
    english: englishText || '(No English translation available)',
    urdu: '',
    collection: valid.collection,
    hadithNum: valid.hadithNum,
    reference: reference,
    status: '',
    source: 'fawazahmed0'
  };
}

function fetchHadithFromHadithApi(collection, hadithNum, apiKey) {
  if (!apiKey || String(apiKey).trim() === '') {
    throw new Error('hadithapi.com requires an API key. Set one in Settings.');
  }

  var canonical = resolveCollectionSlug(collection);
  if (!canonical || !COLLECTION_MAP[canonical]) {
    throw new Error('Unknown collection: ' + collection);
  }

  var entry = COLLECTION_MAP[canonical];
  if (entry.hadithapi === null) {
    throw new Error('Collection "' + canonical + '" is not available on hadithapi.com.');
  }

  var h = parseInt(hadithNum, 10);
  if (isNaN(h) || h < 1) {
    throw new Error('Invalid hadith number: must be a positive integer');
  }

  var url = 'https://hadithapi.com/api/hadiths/?apiKey=' + encodeURIComponent(String(apiKey).trim()) +
    '&book=' + encodeURIComponent(entry.hadithapi) +
    '&hadithNumber=' + h;

  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = response.getResponseCode();

  if (code === 401 || code === 403) {
    throw new Error('Invalid API key. Check your hadithapi.com key in Settings.');
  }
  if (code !== 200) {
    throw new Error('hadithapi.com returned HTTP ' + code);
  }

  var json = JSON.parse(response.getContentText());

  if (!json.hadiths || !json.hadiths.data || json.hadiths.data.length === 0) {
    throw new Error('Hadith not found: ' + canonical + ' #' + h + ' on hadithapi.com');
  }

  var hadith = json.hadiths.data[0];

  return {
    arabic: hadith.hadithArabic || '',
    english: hadith.hadithEnglish || '(No English translation available)',
    urdu: hadith.hadithUrdu || '',
    collection: canonical,
    hadithNum: hadith.hadithNumber || h,
    reference: {
      book: hadith.bookSlug || entry.hadithapi,
      hadith: hadith.hadithNumber || h
    },
    status: hadith.status || '',
    source: 'hadithapi'
  };
}

function fetchHadith(collection, hadithNum, source) {
  var prefs = getPrefs();
  var route = routeHadithCompute_(collection, hadithNum, source, prefs);
  var data;
  if (route.explicit) {
    if (!isHadithSourceAvailable_(route.source, prefs)) {
      throw new Error(hadithUnavailableMessage_(route.source) + hadithCiteNote_(route.canonical, route.source));
    }
    try {
      data = fetchHadithBySource_(route.canonical, hadithNum, route.source, prefs);
    } catch (e) {
      if (e.retryAfterMs || isHadithValidationError_(e)) throw e;
      throw new Error(hadithJoin_(e.message, hadithCiteNote_(route.canonical, route.source)));
    }
    data.fallbackFrom = '';
  } else {
    data = fetchHadithWithFallback_(route.canonical, hadithNum, route, prefs, function (src, isFallback) {
      return fetchHadithBySource_(route.canonical, hadithNum, src, prefs, isFallback);
    });
  }
  return decorateHadith_(data, prefs);
}

function decorateHadith_(data, prefs) {
  var entry = COLLECTION_MAP[data.collection];
  data.collectionLabel = entry ? entry.label : String(data.collection);
  var firstGrade = (data.grades && data.grades.length) ? data.grades[0].grade : data.status;
  data.gradeGroup = gradeGroupFor_(firstGrade, prefs.gradeColors);
  data.gradeColor = gradeColorFor_(data.gradeGroup, prefs.gradeColors, 'badge');
  data.gradeTextColor = data.gradeColor ? contrastTextColor_(data.gradeColor) : '';
  data.sourceLabel = HADITH_SOURCE_LABELS[data.source] || String(data.source);
  if (!data.fallbackFrom) data.fallbackFrom = '';
  return data;
}

// A boundary marker ("no more hadith in this direction") is a collection
// edge, not a source failure, so fetchHadithWithFallback_ never falls back
// on it (see its .boundary check).
function hadithBoundaryError_(message) {
  var e = new Error(message);
  e.boundary = true;
  return e;
}

// source: the source the current preview came from, so Next and Previous
// stay in that source's numbering. '' or 'auto' routes by the citation.
function fetchAdjacentHadith(collection, hadithNum, direction, source) {
  var step = 0;
  if (direction === 1 || direction === '1') step = 1;
  if (direction === -1 || direction === '-1') step = -1;
  if (!step) throw new Error('Invalid direction');

  var prefs = getPrefs();
  var route = routeHadithCompute_(collection, hadithNum, source, prefs);

  // strict (D3): sunnah.com serving as the fallback must land on N ± step
  // exactly, like the non-sunnah branch below, never sunnahAdjacent_'s
  // lettered/combined/skip-ahead search (that's routed-only navigation).
  function fetchAdjacentBySource(src, isFallback) {
    if (src === 'sunnah' && !isFallback) return fetchAdjacentFromSunnah_(route.canonical, hadithNum, step);
    if (src === 'sunnah') {
      var n = parseInt(hadithNum, 10);
      var strictTarget = n + step;
      if (isNaN(n) || strictTarget < 1) throw hadithBoundaryError_('This is the first hadith in the collection.');
      return fetchHadithBySource_(route.canonical, strictTarget, 'sunnah', prefs, true);
    }
    var valid = validateHadithInput(route.canonical, hadithNum, src);
    var target = valid.hadithNum + step;
    if (target < 1) throw hadithBoundaryError_('This is the first hadith in the collection.');
    return fetchHadithBySource_(route.canonical, target, src, prefs);
  }

  var data;
  if (route.explicit) {
    if (!isHadithSourceAvailable_(route.source, prefs)) {
      throw new Error(hadithUnavailableMessage_(route.source) + hadithCiteNote_(route.canonical, route.source));
    }
    try {
      data = fetchAdjacentBySource(route.source);
    } catch (e) {
      if (e.retryAfterMs || e.boundary || isHadithValidationError_(e)) throw e;
      throw new Error(hadithJoin_(e.message, hadithCiteNote_(route.canonical, route.source)));
    }
    data.fallbackFrom = '';
  } else {
    data = fetchHadithWithFallback_(route.canonical, hadithNum, route, prefs, fetchAdjacentBySource);
  }
  return decorateHadith_(data, prefs);
}

// ── Shared Formatting Helpers ─────────────────────────────

function insertQuranBlock(body, index, data) {
  var prefs = getPrefs();
  var showTranslation = prefs.showTranslation;

  var refLabel = data.surahEnglish + ' ' + data.surahNum + ':' + data.ayahNum;
  if (showTranslation && data.translationEdition) {
    refLabel = refLabel + ' — ' + data.translationEdition;
  }
  var refPara = body.insertParagraph(index + 1, '﴾ ' + refLabel + ' ﴿');
  refPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  refPara.editAsText().setFontSize(10).setForegroundColor('#666666').setBold(true);

  var arabicPara = body.insertParagraph(index + 2, data.arabic);
  arabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  arabicPara.editAsText().setFontSize(16).setForegroundColor('#1a5276');

  var offset = 3;

  if (showTranslation && data.translation) {
    var transPara = body.insertParagraph(index + offset, data.translation);
    transPara.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    transPara.editAsText().setFontSize(11).setForegroundColor('#333333').setItalic(true);
    offset++;
  }

  body.insertParagraph(index + offset, '─────────────────────────────').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  return offset;
}

function insertHadithBlock(body, index, data) {
  if (data.source === 'sunnah') return insertSunnahHadithBlock_(body, index, data);
  var prefs = getPrefs();
  var showTranslation = prefs.showTranslation;
  var hadithTranslation = prefs.hadithTranslation;

  var collectionLabel = COLLECTION_MAP[data.collection] ? COLLECTION_MAP[data.collection].label : data.collection;
  var refText = '📖 ' + collectionLabel + ' — Hadith ' + data.hadithNum;
  if (data.reference) {
    refText = refText + ' (Book ' + data.reference.book + ', #' + data.reference.hadith + ')';
  }
  if (data.status) {
    refText = refText + ' [' + data.status + ']';
  }

  var refPara = body.insertParagraph(index + 1, refText);
  refPara.editAsText().setFontSize(10).setForegroundColor('#7d6608').setBold(true);

  var offset = 2;
  if (data.arabic) {
    var arabicPara = body.insertParagraph(index + offset, data.arabic);
    arabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    arabicPara.editAsText().setFontSize(14).setForegroundColor('#1a5276');
    offset++;
  }

  if (showTranslation) {
    var translationText = '';
    if (hadithTranslation === 'urdu' && data.urdu) {
      translationText = data.urdu;
    } else {
      translationText = data.english;
    }
    if (translationText) {
      var transPara = body.insertParagraph(index + offset, translationText);
      transPara.editAsText().setFontSize(11).setForegroundColor('#333333').setItalic(true);
      offset++;
    }
  }

  body.insertParagraph(index + offset, '─────────────────────────────').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  return offset;
}

function insertSunnahHadithBlock_(body, index, data) {
  var prefs = getPrefs();
  var refText = '📖 ' + data.collectionLabel + ' ' + data.hadithNum;
  if (data.refDetail) refText = refText + ' · ' + data.refDetail;
  if (data.status) refText = refText + ' · ' + data.status;

  var ref = body.insertParagraph(index + 1, refText).editAsText();
  if (data.url) {
    ref.setLinkUrl(data.url).setUnderline(true);
  }
  ref.setFontSize(10).setForegroundColor('#7d6608').setBold(true);
  var docColor = gradeColorFor_(data.gradeGroup, prefs.gradeColors, 'docText');
  if (docColor && data.status) {
    ref.setForegroundColor(refText.length - data.status.length, refText.length - 1, docColor);
  }

  var offset = 2;
  if (data.arabic) {
    var arabicPara = body.insertParagraph(index + offset, data.arabic);
    arabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    arabicPara.editAsText().setFontSize(14).setForegroundColor('#1a5276');
    offset++;
  }
  if (data.transliteration) {
    body.insertParagraph(index + offset, data.transliteration).editAsText()
      .setFontSize(11).setForegroundColor('#666666').setItalic(true);
    offset++;
  }
  if (prefs.showTranslation && data.english) {
    body.insertParagraph(index + offset, data.english).editAsText()
      .setFontSize(11).setForegroundColor('#333333').setItalic(true);
    offset++;
  }
  if (data.note) {
    body.insertParagraph(index + offset, data.note).editAsText()
      .setFontSize(9).setForegroundColor('#888888');
    offset++;
  }
  body.insertParagraph(index + offset, '─────────────────────────────').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  return offset;
}

// ── Insert into Document ───────────────────────────────────

function getCursorIndex() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  if (!cursor) {
    DocumentApp.getUi().alert('Place your cursor in the document first.');
    return null;
  }
  var element = cursor.getElement();
  var body = doc.getBody();
  return {
    body: body,
    index: body.getChildIndex(element.getType() === DocumentApp.ElementType.PARAGRAPH ? element : element.getParent())
  };
}

function insertAyahAtCursor(surah, ayah) {
  validateSurahAyah(surah, ayah);
  var data = fetchAyah(surah, ayah);
  var pos = getCursorIndex();
  if (!pos) return;
  insertQuranBlock(pos.body, pos.index, data);
  return data;
}

function insertHadithAtCursor(collection, hadithNum, source) {
  var data = fetchHadith(collection, hadithNum, source);
  var pos = getCursorIndex();
  if (!pos) return;
  insertHadithBlock(pos.body, pos.index, data);
  return data;
}


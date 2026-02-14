// ============================================================
// Quran & Hadith Google Docs Add-on
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
  hadithTranslation: 'english'
};

var VALID_QURAN_TRANSLATIONS = [
  'en.sahih', 'en.pickthall', 'en.yusufali', 'en.hilali', 'en.itani',
  'fr.hamidullah', 'es.cortes', 'tr.diyanet',
  'ur.jalandhry', 'ur.maududi',
  'id.indonesian', 'ru.kuliev', 'de.bubenheim', 'ms.basmeih', 'bn.bengali'
];

var VALID_HADITH_SOURCES = ['fawazahmed0', 'hadithapi'];
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
  return merged;
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

  // Validate hadithTranslation
  var htFound = false;
  for (var k = 0; k < VALID_HADITH_TRANSLATIONS.length; k++) {
    if (VALID_HADITH_TRANSLATIONS[k] === prefs.hadithTranslation) {
      htFound = true;
      break;
    }
  }
  validated.hadithTranslation = htFound ? prefs.hadithTranslation : DEFAULT_PREFS.hadithTranslation;

  // If fawazahmed0, force hadithTranslation to english (no urdu support)
  if (validated.hadithSource === 'fawazahmed0' && validated.hadithTranslation === 'urdu') {
    validated.hadithTranslation = 'english';
  }

  validated.hadithApiKey = (prefs.hadithApiKey != null) ? String(prefs.hadithApiKey) : '';

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

var COLLECTION_MAP = {
  bukhari:       { fawaz: 'bukhari',   hadithapi: 'sahih-bukhari',      label: 'Sahih al-Bukhari' },
  muslim:        { fawaz: 'muslim',    hadithapi: 'sahih-muslim',       label: 'Sahih Muslim' },
  abudawud:      { fawaz: 'abudawud',  hadithapi: 'abu-dawood',         label: 'Abu Dawud' },
  tirmidhi:      { fawaz: 'tirmidhi',  hadithapi: 'al-tirmidhi',        label: 'Tirmidhi' },
  nasai:         { fawaz: 'nasai',     hadithapi: 'sunan-nasai',        label: "Nasa'i" },
  ibnmajah:      { fawaz: 'ibnmajah',  hadithapi: 'ibn-e-majah',       label: 'Ibn Majah' },
  malik:         { fawaz: 'malik',     hadithapi: null,                  label: 'Muwatta Malik' },
  mishkat:       { fawaz: null,         hadithapi: 'mishkat',            label: 'Mishkat al-Masabih' },
  musnadahmad:   { fawaz: null,         hadithapi: 'musnad-ahmad',       label: 'Musnad Ahmad' },
  silsilasahiha: { fawaz: null,         hadithapi: 'al-silsila-sahiha',  label: 'Al-Silsila al-Sahiha' }
};

function getCollectionsForSource(source) {
  var result = [];
  for (var key in COLLECTION_MAP) {
    if (COLLECTION_MAP.hasOwnProperty(key)) {
      var entry = COLLECTION_MAP[key];
      if (source === 'hadithapi' && entry.hadithapi !== null) {
        result.push({ value: key, label: entry.label });
      } else if (source === 'fawazahmed0' && entry.fawaz !== null) {
        result.push({ value: key, label: entry.label });
      }
    }
  }
  return result;
}

function resolveCollectionSlug(input) {
  var slug = String(input).toLowerCase();
  // Direct canonical match
  if (COLLECTION_MAP.hasOwnProperty(slug)) {
    return slug;
  }
  // Reverse lookup by fawaz or hadithapi slug
  for (var key in COLLECTION_MAP) {
    if (COLLECTION_MAP.hasOwnProperty(key)) {
      var entry = COLLECTION_MAP[key];
      if (entry.fawaz === slug || entry.hadithapi === slug) {
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

function validateHadithInput(collection, hadithNum) {
  var col = String(collection).toLowerCase();
  var prefs = getPrefs();
  var source = prefs.hadithSource;

  // Resolve slug first (handles canonical, fawaz, or hadithapi slugs)
  var canonical = resolveCollectionSlug(col);
  if (!canonical) {
    var available = getCollectionsForSource(source);
    var names = [];
    for (var i = 0; i < available.length; i++) {
      names.push(available[i].value);
    }
    throw new Error('Invalid collection: ' + collection + '. Must be one of: ' + names.join(', '));
  }

  // Check collection is available on the current source
  var entry = COLLECTION_MAP[canonical];
  var slugField = (source === 'hadithapi') ? 'hadithapi' : 'fawaz';
  if (entry[slugField] === null) {
    throw new Error('Collection "' + collection + '" is not available on ' + source + '. Switch hadith source in Settings or use a different collection.');
  }

  var h = parseInt(hadithNum, 10);
  if (isNaN(h) || h < 1) {
    throw new Error('Invalid hadith number: must be a positive integer');
  }
  return { collection: canonical, hadithNum: h };
}

function onOpen(e) {
  DocumentApp.getUi()
    .createMenu('Quran & Hadith')
    .addItem('Open Sidebar', 'showSidebar')
    .addItem('Scan & Replace Tags', 'scanAndReplace')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Quran & Hadith')
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
  var valid = validateHadithInput(collection, hadithNum);
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

function fetchHadith(collection, hadithNum) {
  var prefs = getPrefs();

  if (prefs.hadithSource === 'hadithapi') {
    return fetchHadithFromHadithApi(collection, hadithNum, prefs.hadithApiKey);
  }
  return fetchHadithFromFawaz(collection, hadithNum);
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

function insertHadithAtCursor(collection, hadithNum) {
  validateHadithInput(collection, hadithNum);
  var data = fetchHadith(collection, hadithNum);
  var pos = getCursorIndex();
  if (!pos) return;
  insertHadithBlock(pos.body, pos.index, data);
  return data;
}

// ── Scan & Replace ─────────────────────────────────────────

function scanAndReplace() {
  var body = DocumentApp.getActiveDocument().getBody();
  var text = body.getText();
  var count = 0;

  // Quran pattern: /quran surah:ayah or /quran surah:start-end
  var quranRegex = /\/quran\s+(\d+):(\d+)(?:-(\d+))?/g;
  var match;

  while ((match = quranRegex.exec(text)) !== null) {
    var searchPattern = '/quran\\s+' + match[1] + ':' + match[2];
    if (match[3]) {
      searchPattern = searchPattern + '-' + match[3];
    }
    var searchResult = body.findText(searchPattern);
    if (searchResult) {
      try {
        var elem = searchResult.getElement();
        var para = elem.getParent();
        var paraIndex = body.getChildIndex(para);
        para.editAsText().deleteText(searchResult.getStartOffset(), searchResult.getEndOffsetInclusive());

        if (match[3]) {
          var ayahs = fetchAyahRange(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10));
          for (var r = 0; r < ayahs.length; r++) {
            var inserted = insertQuranBlock(body, paraIndex, ayahs[r]);
            paraIndex = paraIndex + inserted;
          }
        } else {
          validateSurahAyah(match[1], match[2]);
          var data = fetchAyah(parseInt(match[1], 10), parseInt(match[2], 10));
          insertQuranBlock(body, paraIndex, data);
        }
        count++;
      } catch (e) {
        Logger.log('Error processing ' + match[0] + ': ' + e.message);
      }
    }
  }

  // Hadith pattern: /hadith collection:number (supports hyphenated slugs)
  text = body.getText();
  var hadithRegex = /\/hadith\s+([a-z-]+):(\d+)/gi;
  var hMatch;

  while ((hMatch = hadithRegex.exec(text)) !== null) {
    var hSearchResult = body.findText('/hadith\\s+' + hMatch[1] + ':' + hMatch[2]);
    if (hSearchResult) {
      try {
        var rawSlug = hMatch[1];
        var canonical = resolveCollectionSlug(rawSlug);
        if (!canonical) {
          Logger.log('Unknown collection slug in tag: ' + rawSlug);
          continue;
        }
        validateHadithInput(canonical, hMatch[2]);
        var hData = fetchHadith(canonical, parseInt(hMatch[2], 10));
        var hElem = hSearchResult.getElement();
        var hPara = hElem.getParent();
        var hParaIndex = body.getChildIndex(hPara);
        hPara.editAsText().deleteText(hSearchResult.getStartOffset(), hSearchResult.getEndOffsetInclusive());
        insertHadithBlock(body, hParaIndex, hData);
        count++;
      } catch (e) {
        Logger.log('Error processing ' + hMatch[0] + ': ' + e.message);
      }
    }
  }

  DocumentApp.getUi().alert('Replaced ' + count + ' tag(s) (Quran + Hadith).');
}

// ============================================================
// Quran & Hadith Google Docs Add-on
// ============================================================
// APIs used:
//   Quran:  https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/editions/quran-uthmani,en.sahih
//   Hadith: https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{lang}-{collection}/{hadithNum}.json
//
// Install: Extensions > Apps Script > paste Code.gs + Sidebar.html
// ============================================================

// ── Input Validation ──────────────────────────────────────

var VALID_COLLECTIONS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik'];

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
  var found = false;
  for (var i = 0; i < VALID_COLLECTIONS.length; i++) {
    if (VALID_COLLECTIONS[i] === col) {
      found = true;
      break;
    }
  }
  if (!found) {
    throw new Error('Invalid collection: ' + collection + '. Must be one of: ' + VALID_COLLECTIONS.join(', '));
  }
  var h = parseInt(hadithNum, 10);
  if (isNaN(h) || h < 1) {
    throw new Error('Invalid hadith number: must be a positive integer');
  }
  return { collection: col, hadithNum: h };
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

/**
 * Fetch ayah with Arabic + English translation
 * @param {number} surah
 * @param {number} ayah
 * @returns {Object} { arabic, english, surahName, surahEnglish, ayahNum, surahNum, totalAyahs }
 */
function fetchAyah(surah, ayah) {
  var valid = validateSurahAyah(surah, ayah);
  var url = 'https://api.alquran.cloud/v1/ayah/' + valid.surah + ':' + valid.ayah + '/editions/quran-uthmani,en.sahih';
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(response.getContentText());

  if (json.code !== 200 || !json.data || json.data.length < 2) {
    throw new Error('Ayah not found: ' + valid.surah + ':' + valid.ayah);
  }

  var arabicData = json.data[0];
  var englishData = json.data[1];

  return {
    arabic: arabicData.text,
    english: englishData.text,
    surahName: arabicData.surah.name,
    surahEnglish: arabicData.surah.englishName,
    surahNum: arabicData.surah.number,
    ayahNum: arabicData.numberInSurah,
    totalAyahs: arabicData.surah.numberOfAyahs
  };
}

// ── Hadith API ─────────────────────────────────────────────

/**
 * Fetch hadith from fawazahmed0 API (separate English + Arabic endpoints)
 * @param {string} collection - e.g. "bukhari", "muslim", "abudawud"
 * @param {number} hadithNum - absolute hadith number
 * @returns {Object} { arabic, english, collection, hadithNum, reference }
 */
function fetchHadith(collection, hadithNum) {
  var valid = validateHadithInput(collection, hadithNum);
  var baseUrl = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/';

  // Fetch English
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

  // Fetch Arabic (optional — don't throw if unavailable)
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
    collection: valid.collection,
    hadithNum: valid.hadithNum,
    reference: reference
  };
}

// ── Insert into Document ───────────────────────────────────

/**
 * Insert ayah at cursor as a formatted block
 */
function insertAyahAtCursor(surah, ayah) {
  validateSurahAyah(surah, ayah);
  var data = fetchAyah(surah, ayah);
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();

  if (!cursor) {
    DocumentApp.getUi().alert('Place your cursor in the document first.');
    return;
  }

  var element = cursor.getElement();
  var body = doc.getBody();
  var index = body.getChildIndex(element.getType() === DocumentApp.ElementType.PARAGRAPH
    ? element : element.getParent());

  // Reference line
  var refPara = body.insertParagraph(index + 1, '﴾ ' + data.surahEnglish + ' ' + data.surahNum + ':' + data.ayahNum + ' ﴿');
  refPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  refPara.editAsText().setFontSize(10).setForegroundColor('#666666').setBold(true);

  // Arabic text (right-to-left)
  var arabicPara = body.insertParagraph(index + 2, data.arabic);
  arabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  arabicPara.editAsText().setFontSize(16).setForegroundColor('#1a5276');

  // English translation
  var engPara = body.insertParagraph(index + 3, data.english);
  engPara.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  engPara.editAsText().setFontSize(11).setForegroundColor('#333333').setItalic(true);

  // Separator
  body.insertParagraph(index + 4, '─────────────────────────────').setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  return data;
}

/**
 * Insert hadith at cursor
 */
function insertHadithAtCursor(collection, hadithNum) {
  validateHadithInput(collection, hadithNum);
  var data = fetchHadith(collection, hadithNum);
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();

  if (!cursor) {
    DocumentApp.getUi().alert('Place your cursor in the document first.');
    return;
  }

  var element = cursor.getElement();
  var body = doc.getBody();
  var index = body.getChildIndex(element.getType() === DocumentApp.ElementType.PARAGRAPH
    ? element : element.getParent());

  // Reference
  var refPara = body.insertParagraph(index + 1,
    '📖 ' + data.collection.charAt(0).toUpperCase() + data.collection.slice(1) + ' — Hadith ' + data.hadithNum + ' (Book ' + data.reference.book + ', #' + data.reference.hadith + ')');
  refPara.editAsText().setFontSize(10).setForegroundColor('#7d6608').setBold(true);

  // Arabic
  if (data.arabic) {
    var arabicPara = body.insertParagraph(index + 2, data.arabic);
    arabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    arabicPara.editAsText().setFontSize(14).setForegroundColor('#1a5276');
  }

  // English
  var engPara = body.insertParagraph(index + (data.arabic ? 3 : 2), data.english);
  engPara.editAsText().setFontSize(11).setForegroundColor('#333333').setItalic(true);

  // Separator
  body.insertParagraph(index + (data.arabic ? 4 : 3), '─────────────────────────────')
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  return data;
}

// ── Scan & Replace ─────────────────────────────────────────

/**
 * Find all /quran surah:ayah patterns in doc and replace with formatted text
 * Pattern: /quran 2:255 or /hadith bukhari:1
 */
function scanAndReplace() {
  var body = DocumentApp.getActiveDocument().getBody();
  var text = body.getText();
  var count = 0;

  // Quran pattern: /quran surah:ayah
  var quranRegex = /\/quran\s+(\d+):(\d+)/g;
  var match;

  while ((match = quranRegex.exec(text)) !== null) {
    var searchResult = body.findText('/quran\\s+' + match[1] + ':' + match[2]);
    if (searchResult) {
      try {
        validateSurahAyah(match[1], match[2]);
        var data = fetchAyah(parseInt(match[1], 10), parseInt(match[2], 10));
        var elem = searchResult.getElement();
        var para = elem.getParent();
        var paraIndex = body.getChildIndex(para);

        // Replace the tag text
        para.editAsText().deleteText(searchResult.getStartOffset(), searchResult.getEndOffsetInclusive());

        // Insert formatted content after
        var refPara = body.insertParagraph(paraIndex + 1,
          '﴾ ' + data.surahEnglish + ' ' + data.surahNum + ':' + data.ayahNum + ' ﴿');
        refPara.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        refPara.editAsText().setFontSize(10).setForegroundColor('#666666').setBold(true);

        var arabicPara = body.insertParagraph(paraIndex + 2, data.arabic);
        arabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
        arabicPara.editAsText().setFontSize(16).setForegroundColor('#1a5276');

        var engPara = body.insertParagraph(paraIndex + 3, data.english);
        engPara.editAsText().setFontSize(11).setForegroundColor('#333333').setItalic(true);

        body.insertParagraph(paraIndex + 4, '─────────────────────────────')
          .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

        count++;
      } catch (e) {
        Logger.log('Error processing ' + match[0] + ': ' + e.message);
      }
    }
  }

  // Hadith pattern: /hadith collection:number
  text = body.getText();
  var hadithRegex = /\/hadith\s+([a-z]+):(\d+)/gi;
  var hMatch;

  while ((hMatch = hadithRegex.exec(text)) !== null) {
    var hSearchResult = body.findText('/hadith\\s+' + hMatch[1] + ':' + hMatch[2]);
    if (hSearchResult) {
      try {
        validateHadithInput(hMatch[1], hMatch[2]);
        var hData = fetchHadith(hMatch[1], parseInt(hMatch[2], 10));
        var hElem = hSearchResult.getElement();
        var hPara = hElem.getParent();
        var hParaIndex = body.getChildIndex(hPara);

        // Remove the tag text
        hPara.editAsText().deleteText(hSearchResult.getStartOffset(), hSearchResult.getEndOffsetInclusive());

        // Reference line
        var hRefPara = body.insertParagraph(hParaIndex + 1,
          '📖 ' + hData.collection.charAt(0).toUpperCase() + hData.collection.slice(1) + ' — Hadith ' + hData.hadithNum + ' (Book ' + hData.reference.book + ', #' + hData.reference.hadith + ')');
        hRefPara.editAsText().setFontSize(10).setForegroundColor('#7d6608').setBold(true);

        var hOffset = 2;

        // Arabic (if present)
        if (hData.arabic) {
          var hArabicPara = body.insertParagraph(hParaIndex + hOffset, hData.arabic);
          hArabicPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
          hArabicPara.editAsText().setFontSize(14).setForegroundColor('#1a5276');
          hOffset++;
        }

        // English
        var hEngPara = body.insertParagraph(hParaIndex + hOffset, hData.english);
        hEngPara.editAsText().setFontSize(11).setForegroundColor('#333333').setItalic(true);
        hOffset++;

        // Separator
        body.insertParagraph(hParaIndex + hOffset, '─────────────────────────────')
          .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

        count++;
      } catch (e) {
        Logger.log('Error processing ' + hMatch[0] + ': ' + e.message);
      }
    }
  }

  DocumentApp.getUi().alert('Replaced ' + count + ' tag(s) (Quran + Hadith).');
}

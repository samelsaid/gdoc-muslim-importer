// ============================================================
// Inline tags
// ============================================================
// The sidebar calls listTags() once, then replaceTag() per tag, pacing
// uncached sunnah.com lookups to stay under the per-user throttle.

var QURAN_TAG_PATTERN = /\/quran[ \t ]+(\d+):(\d+)(?:-(\d+))?/g;
// Optional source prefix (sunnah:, fawaz:, hadithapi:), then collection:number.
var HADITH_TAG_PATTERN = /\/hadith[ \t ]+(?:(sunnah|fawaz|hadithapi):)?([a-z-]+):(\d+[a-z]?)\b/gi;
// /tafsir [source:]book[.lang] surah:ayah[-end], or /tafsir surah:ayah[-end]
var TAFSIR_TAG_PATTERN = /\/tafsir[ \t\u00a0]+(?:(?:(?:tafsir\.app|quran\.com):)?[a-z0-9][a-z0-9-]*(?:\.[a-z]{2})?[ \t\u00a0]+)?\d{1,3}:\d{1,3}(?:-\d{1,3})?/gi;
var TAFSIR_TAG_SPEC = /^\/tafsir (?:((?:(?:tafsir\.app|quran\.com):)?[a-z0-9][a-z0-9-]*(?:\.[a-z]{2})?) )?(\d{1,3}:\d{1,3}(?:-\d{1,3})?)$/i;
var TAG_BOUNDARY_PATTERN = /[a-z0-9-]/i;
var TAG_AUTORUN_PREFIX = 'tags:autorun:';
var TAG_TABLE_REASON = "Tags inside tables can't be replaced; move the tag out of the table.";

function listTags() {
  var text = DocumentApp.getActiveDocument().getBody().getText();
  var seen = {};
  var found = [];
  collectTags_(text, QURAN_TAG_PATTERN, 'quran', seen, found);
  collectTags_(text, HADITH_TAG_PATTERN, 'hadith', seen, found);
  collectTags_(text, TAFSIR_TAG_PATTERN, 'tafsir', seen, found);
  found.sort(function (a, b) { return a.index - b.index; });
  var tags = [];
  for (var i = 0; i < found.length; i++) {
    tags.push({ tag: found[i].tag, kind: found[i].kind, count: found[i].count });
  }
  return tags;
}

function collectTags_(text, pattern, kind, seen, found) {
  pattern.lastIndex = 0;
  var match;
  while ((match = pattern.exec(text)) !== null) {
    if (TAG_BOUNDARY_PATTERN.test(text.charAt(match.index + match[0].length))) continue;
    var tag = match[0].replace(/[ \t ]+/g, ' ');
    var key = tag.toLowerCase();
    if (seen.hasOwnProperty(key)) {
      seen[key].count++;
    } else {
      seen[key] = { tag: tag, kind: kind, count: 1, index: match.index };
      found.push(seen[key]);
    }
  }
}

function parseTag_(tag) {
  var text = String(tag);
  var quran = /^\/quran (\d+):(\d+)(?:-(\d+))?$/.exec(text);
  if (quran) {
    return {
      kind: 'quran',
      surah: parseInt(quran[1], 10),
      start: parseInt(quran[2], 10),
      end: quran[3] ? parseInt(quran[3], 10) : 0,
      pattern: '/quran\\s+' + quran[1] + ':' + quran[2] + (quran[3] ? '-' + quran[3] : '')
    };
  }
  var hadith = /^\/hadith (?:(sunnah|fawaz|hadithapi):)?([a-zA-Z-]+):(\d+[a-zA-Z]?)$/i.exec(text);
  if (hadith) {
    return {
      kind: 'hadith',
      source: hadith[1] ? hadithSourceForPrefix_(hadith[1].toLowerCase()) : '',
      collection: hadith[2].toLowerCase(),
      number: hadith[3].toLowerCase(),
      pattern: '/hadith\\s+' + (hadith[1] ? hadith[1] + ':' : '') + hadith[2] + ':' + hadith[3]
    };
  }
  var tafsir = TAFSIR_TAG_SPEC.exec(text);
  if (tafsir) {
    var spec = tafsir[1] || '';
    return {
      kind: 'tafsir',
      spec: spec.toLowerCase(),
      ref: tafsir[2],
      pattern: '/tafsir\\s+' + (spec ? spec.replace(/\./g, '\\.') + '\\s+' : '') + tafsir[2]
    };
  }
  return null;
}

// HADITH_TAG_PREFIXES (Code.gs) is the single source of the prefix names.
function hadithSourceForPrefix_(prefix) {
  for (var source in HADITH_TAG_PREFIXES) {
    if (HADITH_TAG_PREFIXES.hasOwnProperty(source) && HADITH_TAG_PREFIXES[source] === prefix) return source;
  }
  return '';
}

function tagResult_(status, replaced, reason, retryAfterMs, cached, fallback) {
  return { status: status, replaced: replaced, reason: reason, retryAfterMs: retryAfterMs, cached: cached, fallback: fallback === true };
}

function replaceTag(tag) {
  var parsed = parseTag_(tag);
  if (!parsed) return tagResult_('skipped', 0, 'Not a /quran, /hadith, or /tafsir tag.', 0, true);
  var paced = false;
  var content;
  try {
    if (parsed.kind === 'quran') {
      content = fetchQuranForTag_(parsed);
    } else if (parsed.kind === 'tafsir') {
      paced = true;
      content = fetchTafsir(parsed.ref, parsed.spec);
    } else {
      // A route guess for pacing, ahead of the real (fallback-aware) fetch:
      // routeHadith_ would throw on an unavailable source even when
      // fetchHadith could still serve it through the fallback. Gated on the
      // key too: a missing key never reaches sunnah.com, so it's never paced.
      paced = isSunnahConfigured_() &&
        routeHadithCompute_(parsed.collection, parsed.number, parsed.source, getPrefs()).source === 'sunnah';
      content = fetchHadith(parsed.collection, parsed.number, parsed.source);
      // The fallback may have served from sunnah.com even when the routed
      // (failed) source wasn't sunnah.com: pacing follows who actually served it.
      if (content.source === 'sunnah') paced = true;
    }
  } catch (e) {
    if (e.retryAfterMs) return tagResult_('throttled', 0, '', e.retryAfterMs, false);
    return tagResult_('skipped', 0, e.message, 0, !paced);
  }
  var outcome = replaceTagOccurrences_(parsed, content);
  var cached = !paced || content.cached === true;
  var fallback = !Array.isArray(content) && !!(content && content.fallbackFrom);
  if (outcome.replaced === 0) {
    return tagResult_('skipped', 0, outcome.inTable ? TAG_TABLE_REASON : 'Tag not found in the document.', 0, cached, fallback);
  }
  return tagResult_('replaced', outcome.replaced, '', 0, cached, fallback);
}

function fetchQuranForTag_(parsed) {
  if (parsed.end) return fetchAyahRange(parsed.surah, parsed.start, parsed.end);
  return [fetchAyah(parsed.surah, parsed.start)];
}

function replaceTagOccurrences_(parsed, content) {
  var body = DocumentApp.getActiveDocument().getBody();
  var outcome = { replaced: 0, inTable: false };
  var found = body.findText(parsed.pattern);
  while (found) {
    var element = found.getElement();
    var text = element.asText();
    var end = found.getEndOffsetInclusive();
    var paraIndex = -1;
    if (!TAG_BOUNDARY_PATTERN.test(text.getText().charAt(end + 1))) {
      try {
        paraIndex = body.getChildIndex(element.getParent());
      } catch (e) {
        outcome.inTable = true;
      }
    }
    if (paraIndex === -1) {
      found = body.findText(parsed.pattern, found);
      continue;
    }
    text.deleteText(found.getStartOffset(), end);
    insertTagContent_(body, paraIndex, parsed, content);
    outcome.replaced++;
    found = body.findText(parsed.pattern);
  }
  return outcome;
}

function insertTagContent_(body, paraIndex, parsed, content) {
  if (parsed.kind === 'tafsir') {
    insertTafsirBlocks_(body, paraIndex, content);
    return;
  }
  if (parsed.kind === 'hadith') {
    insertHadithBlock(body, paraIndex, content);
    return;
  }
  var index = paraIndex;
  for (var i = 0; i < content.length; i++) {
    index = index + insertQuranBlock(body, index, content[i]);
  }
}

function scanFromMenu() {
  var key = TAG_AUTORUN_PREFIX + DocumentApp.getActiveDocument().getId();
  CacheService.getUserCache().put(key, '1', 60);
  showSidebar();
}

function consumeAutoRun() {
  var key = TAG_AUTORUN_PREFIX + DocumentApp.getActiveDocument().getId();
  var cache = CacheService.getUserCache();
  if (cache.get(key) !== '1') return false;
  cache.remove(key);
  return true;
}

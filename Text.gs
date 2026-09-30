// ============================================================
// Shared text helpers (sunnah.com and quran.com return HTML)
// ============================================================

var HTML_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…'
};

function htmlToText_(html) {
  var text = String(html || '')
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, function (m, entity) {
      if (entity.charAt(0) === '#') {
        var code = entity.charAt(1).toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return (code > 0 && code <= 0x10FFFF) ? String.fromCodePoint(code) : '';
      }
      return HTML_ENTITIES.hasOwnProperty(entity) ? HTML_ENTITIES[entity] : '';
    });
  return text
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

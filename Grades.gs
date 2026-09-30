// ============================================================
// Grade colors
// ============================================================

var GRADE_GROUP_ORDER = ['sahih', 'hasan', 'daif'];
var GRADE_KEYWORD_LIMIT = 20;
var GRADE_KEYWORD_MAX_LENGTH = 30;
var HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

var DEFAULT_GRADE_COLORS = {
  badge: true,
  docText: false,
  groups: {
    sahih: { color: '#2e7d32', keywords: ['sahih', 'hasan sahih'] },
    hasan: { color: '#e65100', keywords: ['hasan'] },
    daif: { color: '#c62828', keywords: ["da'if", 'daif', "da'eef", 'weak', 'munkar', 'mawdu', 'maudu'] },
    other: { color: '#757575' }
  }
};

function normalizeGradeText_(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['`ʾʿ‘’]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Longest matching keyword wins; ties go to the group listed first.
function gradeGroupFor_(gradeText, gradeColors) {
  var text = normalizeGradeText_(gradeText);
  if (!text) return '';
  var best = 'other';
  var bestLength = 0;
  for (var i = 0; i < GRADE_GROUP_ORDER.length; i++) {
    var group = GRADE_GROUP_ORDER[i];
    var keywords = gradeColors.groups[group].keywords;
    for (var j = 0; j < keywords.length; j++) {
      var keyword = normalizeGradeText_(keywords[j]);
      if (keyword && keyword.length > bestLength && text.indexOf(keyword) !== -1) {
        best = group;
        bestLength = keyword.length;
      }
    }
  }
  return best;
}

function gradeColorFor_(group, gradeColors, target) {
  if (!group || !gradeColors[target]) return '';
  return gradeColors.groups[group].color;
}

function contrastTextColor_(hex) {
  var r = parseInt(hex.substr(1, 2), 16);
  var g = parseInt(hex.substr(3, 2), 16);
  var b = parseInt(hex.substr(5, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000000' : '#ffffff';
}

function cleanGradeKeywords_(list) {
  var out = [];
  for (var i = 0; i < list.length && out.length < GRADE_KEYWORD_LIMIT; i++) {
    var keyword = String(list[i]).replace(/[\u0000-\u001f\u007f]/g, '').trim().toLowerCase();
    if (keyword && keyword.length <= GRADE_KEYWORD_MAX_LENGTH) out.push(keyword);
  }
  return out;
}

function validateGradeColors_(input) {
  var src = (input && typeof input === 'object') ? input : {};
  var srcGroups = (src.groups && typeof src.groups === 'object') ? src.groups : {};
  var result = {
    badge: src.hasOwnProperty('badge') ? (src.badge === true || src.badge === 'true') : DEFAULT_GRADE_COLORS.badge,
    docText: src.hasOwnProperty('docText') ? (src.docText === true || src.docText === 'true') : DEFAULT_GRADE_COLORS.docText,
    groups: {}
  };
  var names = GRADE_GROUP_ORDER.concat(['other']);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var defaults = DEFAULT_GRADE_COLORS.groups[name];
    var given = (srcGroups[name] && typeof srcGroups[name] === 'object') ? srcGroups[name] : {};
    var color = HEX_COLOR_PATTERN.test(String(given.color)) ? String(given.color).toLowerCase() : defaults.color;
    result.groups[name] = { color: color };
    if (name !== 'other') {
      var keywords = given.keywords;
      if (typeof keywords === 'string') keywords = keywords.split(',');
      result.groups[name].keywords = Array.isArray(keywords) ? cleanGradeKeywords_(keywords) : defaults.keywords.slice();
    }
  }
  return result;
}

function getDefaultGradeColors() {
  return validateGradeColors_(null);
}

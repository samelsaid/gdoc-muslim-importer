// ============================================================
// Tafsir
// ============================================================
// The tag picks the source, work, and language; Settings defaults settle
// collisions (docs/specs/2026-09-28-tafsir-design.md). No keys involved.

var TAFSIR_SOURCES = ['tafsir.app', 'quran.com'];
var TAFSIR_SOURCE_ID_PATTERNS = {
  'tafsir.app': /^[a-z][a-z-]{0,39}$/,
  'quran.com': /^\d{1,5}$/
};

// BEGIN GENERATED TAFSIR CATALOG (tools/build-tafsir-map.js, 2026-09-29) - do not edit by hand
var TAFSIR_LANGUAGES = {
  "ar": "Arabic",
  "bn": "Bengali",
  "en": "English",
  "ku": "Kurdish",
  "ru": "Russian",
  "ur": "Urdu"
};
var TAFSIR_MAP = {
  "ibn-kathir": {
    "label": "Tafsir Ibn Kathir",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ibn-katheer",
          "quran.com": "14"
        }
      },
      "en": {
        "sources": {
          "quran.com": "169"
        },
        "label": "Tafsir Ibn Kathir (English, abridged)"
      },
      "ur": {
        "sources": {
          "quran.com": "160"
        }
      },
      "bn": {
        "sources": {
          "quran.com": "164"
        }
      }
    }
  },
  "tabari": {
    "label": "Tafsir al-Tabari",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "tabari",
          "quran.com": "15"
        }
      }
    }
  },
  "qurtubi": {
    "label": "Tafsir al-Qurtubi",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "qurtubi",
          "quran.com": "90"
        }
      }
    }
  },
  "saadi": {
    "label": "Tafsir al-Sa'di",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "saadi",
          "quran.com": "91"
        }
      },
      "ru": {
        "sources": {
          "quran.com": "170"
        }
      }
    }
  },
  "muyassar": {
    "label": "Tafsir al-Muyassar",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "muyassar",
          "quran.com": "16"
        }
      }
    }
  },
  "baghawi": {
    "label": "Tafsir al-Baghawi",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "baghawi",
          "quran.com": "94"
        }
      }
    }
  },
  "jalalayn": {
    "label": "Tafsir al-Jalalayn",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "jalalayn"
        }
      }
    }
  },
  "mukhtasar": {
    "label": "Al-Mukhtasar fi al-Tafsir",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "mukhtasar"
        }
      }
    }
  },
  "wasit": {
    "label": "Al-Tafsir al-Wasit (Tantawi)",
    "languages": {
      "ar": {
        "sources": {
          "quran.com": "93"
        }
      }
    }
  },
  "maarif": {
    "label": "Ma'arif al-Qur'an",
    "languages": {
      "en": {
        "sources": {
          "quran.com": "168"
        }
      }
    }
  },
  "tazkirul": {
    "label": "Tazkirul Quran",
    "languages": {
      "en": {
        "sources": {
          "quran.com": "817"
        }
      },
      "ur": {
        "sources": {
          "quran.com": "818"
        }
      }
    }
  },
  "asbab-wahidi": {
    "label": "Asbab al-Nuzul (al-Wahidi)",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "wahidi-asbab"
        }
      }
    }
  },
  "zad-almaseer": {
    "label": "تفسير ابن الجوزي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "zad-almaseer"
        }
      }
    }
  },
  "almawirdee": {
    "label": "تفسير الماوردي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "almawirdee"
        }
      }
    }
  },
  "ibn-alqayyim": {
    "label": "تفسير ابن القيم",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ibn-alqayyim"
        }
      }
    }
  },
  "samaani": {
    "label": "تفسير السمعاني",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "samaani"
        }
      }
    }
  },
  "makki": {
    "label": "تفسير مكّي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "makki"
        }
      }
    }
  },
  "mahasin-altaweel": {
    "label": "محاسن التأويل للقاسمي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "mahasin-altaweel"
        }
      }
    }
  },
  "althaalabi": {
    "label": "تفسير الثعالبي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "althaalabi"
        }
      }
    }
  },
  "samarqandi": {
    "label": "تفسير السمرقندي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "samarqandi"
        }
      }
    }
  },
  "althalabi": {
    "label": "تفسير الثعلبي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "althalabi"
        }
      }
    }
  },
  "fath-albayan": {
    "label": "فتح البيان للقنوجي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "fath-albayan"
        }
      }
    }
  },
  "fath-alqadeer": {
    "label": "فتح القدير للشوكاني",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "fath-alqadeer"
        }
      }
    }
  },
  "altasheel": {
    "label": "تفسير ابن جزي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "altasheel"
        }
      }
    }
  },
  "alaloosi": {
    "label": "تفسير الآلوسي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "alaloosi"
        }
      }
    }
  },
  "alrazi": {
    "label": "تفسير الرازي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "alrazi"
        }
      }
    }
  },
  "adwaa-albayan": {
    "label": "أضواء البيان",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "adwaa-albayan"
        }
      }
    }
  },
  "nathm-aldurar": {
    "label": "نظم الدرر للبقاعي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "nathm-aldurar"
        }
      }
    }
  },
  "ibn-aashoor": {
    "label": "التحرير والتنوير",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ibn-aashoor"
        }
      }
    }
  },
  "ibn-atiyah": {
    "label": "المحرر الوجيز لابن عطية",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ibn-atiyah"
        }
      }
    }
  },
  "albahr-almuheet": {
    "label": "البحر المحيط لأبي حيان",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "albahr-almuheet"
        }
      }
    }
  },
  "albaseet": {
    "label": "البسيط للواحدي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "albaseet"
        }
      }
    }
  },
  "abu-alsuod": {
    "label": "تفسير أبي السعود",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "abu-alsuod"
        }
      }
    }
  },
  "kashaf": {
    "label": "الكشاف للزمخشري",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "kashaf"
        }
      }
    }
  },
  "aysar-altafasir": {
    "label": "أيسر التفاسير",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "aysar-altafasir"
        }
      }
    }
  },
  "tadabbur-wa-amal": {
    "label": "القرآن – تدبر وعمل",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "tadabbur-wa-amal"
        }
      }
    }
  },
  "ibn-uthaymeen": {
    "label": "تفسير ابن عثيمين",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ibn-uthaymeen"
        }
      }
    }
  },
  "iejee": {
    "label": "جامع البيان للإيجي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "iejee"
        }
      }
    }
  },
  "albaydawee": {
    "label": "تفسير البيضاوي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "albaydawee"
        }
      }
    }
  },
  "alnasafi": {
    "label": "تفسير النسفي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "alnasafi"
        }
      }
    }
  },
  "alwajeez": {
    "label": "الوجيز للواحدي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "alwajeez"
        }
      }
    }
  },
  "zimneen": {
    "label": "تفسير ابن أبي زمنين",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "zimneen"
        }
      }
    }
  },
  "mathoor": {
    "label": "موسوعة التفسير المأثور",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "mathoor"
        }
      }
    }
  },
  "aldur-almanthoor": {
    "label": "الدر المنثور",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "aldur-almanthoor"
        }
      }
    }
  },
  "ibn-abi-hatim": {
    "label": "تفسير ابن أبي حاتم",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ibn-abi-hatim"
        }
      }
    }
  },
  "muqatil": {
    "label": "تفسير مقاتل",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "muqatil"
        }
      }
    }
  },
  "qatada": {
    "label": "تفسير قتادة",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "qatada"
        }
      }
    }
  },
  "siraaj-ghareeb": {
    "label": "غريب القرآن للخضيري",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "siraaj-ghareeb"
        }
      }
    }
  },
  "almuyassar-ghareeb": {
    "label": "الميسر في الغريب",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "almuyassar-ghareeb"
        }
      }
    }
  },
  "ghareeb-ibn-qutaybah": {
    "label": "غريب القرآن لابن قتيبة",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ghareeb-ibn-qutaybah"
        }
      }
    }
  },
  "altibyan-ghreeb": {
    "label": "غريب القرآن لابن الهائم",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "altibyan-ghreeb"
        }
      }
    }
  },
  "zajjaj": {
    "label": "معاني الزجاج",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "zajjaj"
        }
      }
    }
  },
  "nahaas-meanings": {
    "label": "معاني القرآن للنحاس",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "nahaas-meanings"
        }
      }
    }
  },
  "farraa": {
    "label": "معاني القرآن للفراء",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "farraa"
        }
      }
    }
  },
  "majaz-alquran": {
    "label": "مجاز القرآن لمعمر بن المثنى",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "majaz-alquran"
        }
      }
    }
  },
  "akhfash": {
    "label": "معاني القرآن للأخفش",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "akhfash"
        }
      }
    }
  },
  "aliraab-almuyassar": {
    "label": "الإعراب الميسر",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "aliraab-almuyassar"
        }
      }
    }
  },
  "iraab-daas": {
    "label": "إعراب القرآن للدعاس",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "iraab-daas"
        }
      }
    }
  },
  "aljadwal": {
    "label": "الجدول في إعراب القرآن",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "aljadwal"
        }
      }
    }
  },
  "aldur-almasoon": {
    "label": "الدر المصون للسمين الحلبي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "aldur-almasoon"
        }
      }
    }
  },
  "lubab": {
    "label": "اللباب في علوم الكتاب",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "lubab"
        }
      }
    }
  },
  "iraab-aldarweesh": {
    "label": "إعراب القرآن للدرويش",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "iraab-aldarweesh"
        }
      }
    }
  },
  "mujtaba-mushkil-iraab": {
    "label": "مجتبى مشكل إعراب القرآن",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "mujtaba-mushkil-iraab"
        }
      }
    }
  },
  "iraab-alnahas": {
    "label": "إعراب القرآن للنحاس",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "iraab-alnahas"
        }
      }
    }
  },
  "ayah-morph": {
    "label": "تحليل كلمات القرآن",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ayah-morph"
        }
      }
    }
  },
  "iraab-graphs": {
    "label": "الإعراب المرسوم",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "iraab-graphs"
        }
      }
    }
  },
  "qiraat-almawsoah": {
    "label": "القراءات — الموسوعة القرآنية",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "qiraat-almawsoah"
        }
      }
    }
  },
  "tahbeer-altayseer": {
    "label": "تحبير التيسير لابن الجزري",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "tahbeer-altayseer"
        }
      }
    }
  },
  "alnashir": {
    "label": "النشر لابن الجزري",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "alnashir"
        }
      }
    }
  },
  "mafateeh-alaghanee": {
    "label": "مفاتيح الأغاني في القراءات",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "mafateeh-alaghanee"
        }
      }
    }
  },
  "ahkam-ibn-alarabee": {
    "label": "أحكام القرآن لابن العربي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ahkam-ibn-alarabee"
        }
      }
    }
  },
  "aljasas": {
    "label": "أحكام القرآن للجصاص",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "aljasas"
        }
      }
    }
  },
  "ilkia-alharrasee": {
    "label": "أحكام القرآن لإلكيا الهراسي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ilkia-alharrasee"
        }
      }
    }
  },
  "ahkam-altarayfi": {
    "label": "أحكام القرآن للطريفي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "ahkam-altarayfi"
        }
      }
    }
  },
  "alikleel": {
    "label": "الإكليل للسيوطي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "alikleel"
        }
      }
    }
  },
  "eedah-naskh-mansukh": {
    "label": "ناسخ القرآن ومنسوخه لمكي",
    "languages": {
      "ar": {
        "sources": {
          "tafsir.app": "eedah-naskh-mansukh"
        }
      }
    }
  },
  "tafisr-fathul-majid-bn": {
    "label": "Tafsir Fathul Majid",
    "languages": {
      "bn": {
        "sources": {
          "quran.com": "381"
        }
      }
    }
  },
  "bn-tafsir-ahsanul-bayaan": {
    "label": "Tafsir Ahsanul Bayaan",
    "languages": {
      "bn": {
        "sources": {
          "quran.com": "165"
        }
      }
    }
  },
  "bn-tafsir-abu-bakr-zakaria": {
    "label": "Tafsir Abu Bakr Zakaria",
    "languages": {
      "bn": {
        "sources": {
          "quran.com": "166"
        }
      }
    }
  },
  "tafsir-fe-zalul-quran-syed-qatab": {
    "label": "Fi Zilal al-Quran",
    "languages": {
      "ur": {
        "sources": {
          "quran.com": "157"
        }
      }
    }
  },
  "kurd-tafsir-rebar": {
    "label": "Rebar Kurdish Tafsir",
    "languages": {
      "ku": {
        "sources": {
          "quran.com": "804"
        }
      }
    }
  },
  "tafsir-bayan-ul-quran": {
    "label": "Bayan ul Quran",
    "languages": {
      "ur": {
        "sources": {
          "quran.com": "159"
        }
      }
    }
  }
};
// END GENERATED TAFSIR CATALOG

// ── Settings ────────────────────────────────────────────────

var DEFAULT_TAFSIR_PREFS = { source: 'tafsir.app', language: 'ar', book: 'saadi', charLimit: 0, link: false, fallback: 'quran.com', fallbackOn: true };
var TAFSIR_MAX_RANGE = 10;
var TAFSIR_NAME_HINT = 'Use a name like saadi or tabari, or name a source: /tafsir tafsir.app:<id> 2:255.';
var TAFSIR_REF_ERROR = 'Invalid ayah reference: use surah:ayah, like 2:255.';

// The other of the two tafsir sources (TAFSIR_SOURCES has exactly two).
function tafsirOtherSource_(source) {
  for (var i = 0; i < TAFSIR_SOURCES.length; i++) {
    if (TAFSIR_SOURCES[i] !== source) return TAFSIR_SOURCES[i];
  }
  return source;
}

function validateTafsirPrefs_(input) {
  var src = (input && typeof input === 'object') ? input : {};
  var limit = parseInt(src.charLimit, 10);
  var source = TAFSIR_SOURCES.indexOf(src.source) !== -1 ? src.source : DEFAULT_TAFSIR_PREFS.source;
  // D2: fallback defaults to (and is repaired to) the source that isn't
  // `source`, so the pair is never equal.
  var fallback = TAFSIR_SOURCES.indexOf(src.fallback) !== -1 ? src.fallback : tafsirOtherSource_(source);
  if (fallback === source) fallback = tafsirOtherSource_(source);
  return {
    source: source,
    language: TAFSIR_LANGUAGES.hasOwnProperty(src.language) ? src.language : DEFAULT_TAFSIR_PREFS.language,
    book: TAFSIR_MAP.hasOwnProperty(src.book) ? src.book : DEFAULT_TAFSIR_PREFS.book,
    charLimit: (!isNaN(limit) && limit >= 200 && limit <= 100000) ? limit : 0,
    link: src.link === true || src.link === 'true',
    fallback: fallback,
    // D2 default is true: an omitted or non-boolean value must not silently
    // disable the toggle, only an explicit false does (matches hadithFallbackOn).
    fallbackOn: !(src.fallbackOn === false || src.fallbackOn === 'false')
  };
}

// ── Surah list (ayah counts guard every tafsir request) ─────

var SURAH_LIST_URL = 'https://api.alquran.cloud/v1/surah';
var SURAH_LIST_CACHE_KEY = 'quran:surahs:v1';

function surahList_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(SURAH_LIST_CACHE_KEY);
  if (cached) return JSON.parse(cached);
  var unavailable = 'Surah information is unavailable right now. Try again shortly.';
  var response;
  try {
    response = UrlFetchApp.fetch(SURAH_LIST_URL, { muteHttpExceptions: true });
  } catch (e) {
    throw new Error(unavailable);
  }
  var json = null;
  try {
    json = JSON.parse(response.getContentText());
  } catch (e) {
    json = null;
  }
  if (response.getResponseCode() !== 200 || !json || !json.data || json.data.length !== 114) {
    throw new Error(unavailable);
  }
  var list = [];
  for (var i = 0; i < json.data.length; i++) {
    list.push({ name: String(json.data[i].englishName), ayahs: parseInt(json.data[i].numberOfAyahs, 10) });
  }
  cache.put(SURAH_LIST_CACHE_KEY, JSON.stringify(list), 21600);
  return list;
}

function parseAyahRef_(ref) {
  var match = /^(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/.exec(String(ref).trim());
  if (!match) throw new Error(TAFSIR_REF_ERROR);
  var surah = parseInt(match[1], 10);
  var start = parseInt(match[2], 10);
  var end = match[3] ? parseInt(match[3], 10) : start;
  if (surah < 1 || surah > 114 || start < 1 || end < start) throw new Error(TAFSIR_REF_ERROR);
  var info = surahList_()[surah - 1];
  if (end > info.ayahs) {
    throw new Error(info.name + ' has ' + info.ayahs + ' ayahs; ' + surah + ':' + end + " doesn't exist.");
  }
  if (end - start + 1 > TAFSIR_MAX_RANGE) throw new Error('Tafsir ranges are limited to ' + TAFSIR_MAX_RANGE + ' ayahs.');
  return { surah: surah, start: start, end: end, surahName: info.name };
}

// ── Parsing and routing ─────────────────────────────────────

var TAFSIR_SPEC_PATTERN = /^(?:(tafsir\.app|quran\.com):)?([a-z0-9][a-z0-9-]{0,59})(?:\.([a-z]{2}))?$/;

function parseTafsirSpec_(spec) {
  var text = String(spec || '').trim().toLowerCase();
  if (!text) return { source: '', book: '', lang: '' };
  var match = TAFSIR_SPEC_PATTERN.exec(text);
  if (!match) throw new Error('Unknown tafsir "' + spec + '". ' + TAFSIR_NAME_HINT);
  return { source: match[1] || '', book: match[2], lang: match[3] || '' };
}

function tafsirLanguageNames_(codes) {
  var names = [];
  for (var i = 0; i < codes.length; i++) names.push(TAFSIR_LANGUAGES[codes[i]] || codes[i]);
  return names.join(', ');
}

function tafsirLanguageFor_(key, requested, defaultLanguage) {
  var entry = TAFSIR_MAP[key];
  var codes = Object.keys(entry.languages);
  if (requested) {
    if (entry.languages[requested]) return requested;
    throw new Error(entry.label + ' has no ' + (TAFSIR_LANGUAGES[requested] || requested) + ' edition. Available: ' + tafsirLanguageNames_(codes) + '.');
  }
  if (entry.languages[defaultLanguage]) return defaultLanguage;
  if (codes.length === 1) return codes[0];
  throw new Error(entry.label + ' has no ' + (TAFSIR_LANGUAGES[defaultLanguage] || defaultLanguage) + ' edition. Available: ' +
    tafsirLanguageNames_(codes) + '. Add one to the name, like ' + key + '.' + codes[0] + '.');
}

// Dropdown label: names the language whenever a work has several.
function tafsirEditionLabel_(key, language) {
  var entry = TAFSIR_MAP[key];
  var edition = entry.languages[language];
  if (edition.label) return edition.label;
  return Object.keys(entry.languages).length > 1 ? entry.label + ' (' + TAFSIR_LANGUAGES[language] + ')' : entry.label;
}

// Block header: names the language only when it isn't Arabic.
function tafsirHeaderLabel_(key, language) {
  var entry = TAFSIR_MAP[key];
  var edition = entry.languages[language];
  if (edition.label) return edition.label;
  if (language === 'ar' || Object.keys(entry.languages).length === 1) return entry.label;
  return entry.label + ' (' + TAFSIR_LANGUAGES[language] + ')';
}

function tafsirNameWithLanguage_(key, language) {
  return Object.keys(TAFSIR_MAP[key].languages).length > 1 ? key + '.' + language : key;
}

function tafsirCiteNote_(key, language, sources, exclude, refText) {
  var names = [];
  var ways = [];
  for (var i = 0; i < sources.length; i++) {
    if (sources[i] === exclude) continue;
    names.push(sources[i]);
    ways.push('/tafsir ' + sources[i] + ':' + tafsirNameWithLanguage_(key, language) + ' ' + refText);
  }
  return ways.length ? ' The same work is on ' + names.join(' and ') + ': ' + ways.join(', ') + '.' : '';
}

function routeTafsir_(spec, prefs, refText) {
  var defaults = prefs.tafsir;
  var parsed = parseTafsirSpec_(spec);
  var bookName = parsed.book || defaults.book;
  if (!TAFSIR_MAP.hasOwnProperty(bookName)) {
    if (parsed.source && TAFSIR_SOURCE_ID_PATTERNS[parsed.source].test(bookName)) {
      var rawLabel = parsed.source + ':' + bookName;
      return { key: '', id: bookName, source: parsed.source, language: parsed.lang, label: rawLabel, header: rawLabel, others: [], explicit: true };
    }
    throw new Error('Unknown tafsir "' + bookName + '". ' + TAFSIR_NAME_HINT);
  }
  var language = tafsirLanguageFor_(bookName, parsed.lang, defaults.language);
  var edition = TAFSIR_MAP[bookName].languages[language];
  var available = [];
  for (var i = 0; i < TAFSIR_SOURCES.length; i++) {
    if (edition.sources[TAFSIR_SOURCES[i]]) available.push(TAFSIR_SOURCES[i]);
  }
  var source;
  if (parsed.source) {
    if (available.indexOf(parsed.source) === -1) {
      throw new Error(tafsirEditionLabel_(bookName, language) + ' is not on ' + parsed.source + '.' +
        tafsirCiteNote_(bookName, language, available, '', refText));
    }
    source = parsed.source;
  } else if (available.indexOf(defaults.source) !== -1) {
    source = defaults.source;
  } else {
    source = available[0];
  }
  var others = [];
  for (var j = 0; j < available.length; j++) {
    if (available[j] !== source) others.push(available[j]);
  }
  return {
    key: bookName, id: String(edition.sources[source]), source: source, language: language,
    label: tafsirEditionLabel_(bookName, language), header: tafsirHeaderLabel_(bookName, language), others: others,
    explicit: !!parsed.source
  };
}

// A route for the same catalog work on a different source (D4 fallback).
// Never used for a raw source:id route, since those never have a key.
function tafsirRouteForSource_(key, language, source) {
  var edition = TAFSIR_MAP[key].languages[language];
  var others = [];
  for (var i = 0; i < TAFSIR_SOURCES.length; i++) {
    if (TAFSIR_SOURCES[i] !== source && edition.sources[TAFSIR_SOURCES[i]]) others.push(TAFSIR_SOURCES[i]);
  }
  return {
    key: key, id: String(edition.sources[source]), source: source, language: language,
    label: tafsirEditionLabel_(key, language), header: tafsirHeaderLabel_(key, language), others: others,
    explicit: false
  };
}

// A spec string that reproduces exactly this route (source included), so
// Insert matches the preview.
function tafsirSpecFor_(route) {
  if (!route.key) return route.source + ':' + route.id;
  return route.source + ':' + tafsirNameWithLanguage_(route.key, route.language);
}

function getTafsirBooks() {
  var languages = [];
  for (var code in TAFSIR_LANGUAGES) {
    if (TAFSIR_LANGUAGES.hasOwnProperty(code)) languages.push({ value: code, label: TAFSIR_LANGUAGES[code] });
  }
  var books = [];
  var editions = [];
  for (var key in TAFSIR_MAP) {
    if (!TAFSIR_MAP.hasOwnProperty(key)) continue;
    books.push({ value: key, label: TAFSIR_MAP[key].label });
    for (var lang in TAFSIR_MAP[key].languages) {
      if (TAFSIR_MAP[key].languages.hasOwnProperty(lang)) {
        editions.push({ value: key + '.' + lang, label: tafsirEditionLabel_(key, lang) });
      }
    }
  }
  return { languages: languages, books: books, editions: editions };
}

// ── Fetching and caching ────────────────────────────────────

var TAFSIR_CACHE_PREFIX = 'tafsir:v1:';
var TAFSIR_CACHE_TTL_SECONDS = 21600;
var TAFSIR_CACHE_MAX_CHARS = 30000;
var TAFSIR_EMPTY_MARKER = '__empty__';

function tafsirRequestUrl_(source, id, surah, ayah) {
  if (source === 'tafsir.app') return 'https://tafsir.app/get.php?src=' + encodeURIComponent(id) + '&s=' + surah + '&a=' + ayah;
  return 'https://api.quran.com/api/v4/tafsirs/' + encodeURIComponent(id) + '/by_ayah/' + surah + ':' + ayah;
}

// Only tafsir.app's page format is confirmed; other sources get no link.
function tafsirPageUrl_(source, id, surah, ayah) {
  return source === 'tafsir.app' ? 'https://tafsir.app/' + encodeURIComponent(id) + '/' + surah + '/' + ayah : '';
}

function tafsirFetchText_(source, id, surah, ayah) {
  var unavailable = source + ' is unavailable right now.';
  paceRequest_(source);
  var response;
  try {
    response = UrlFetchApp.fetch(tafsirRequestUrl_(source, id, surah, ayah), { muteHttpExceptions: true });
  } catch (e) {
    Logger.log('tafsir request failed: network error (' + source + ')');
    throw new Error(unavailable);
  }
  var code = response.getResponseCode();
  if (code === 404) return '';
  if (code === 429) {
    Logger.log('tafsir request rate-limited: HTTP 429 (' + source + ')');
    throw rateLimitedFromResponse_(response);
  }
  if (code !== 200) {
    Logger.log('tafsir request failed: HTTP ' + code + ' (' + source + ')');
    throw new Error(unavailable);
  }
  var json;
  try {
    json = JSON.parse(response.getContentText());
  } catch (e) {
    throw new Error(unavailable);
  }
  var raw = source === 'tafsir.app' ? json.data : (json.tafsir && json.tafsir.text);
  raw = String(raw || '');
  return /<\/?[a-z][^>]*>/i.test(raw) ? htmlToText_(raw) : raw.replace(/\r\n?/g, '\n').trim();
}

function tafsirText_(route, surah, ayah, op) {
  var key = TAFSIR_CACHE_PREFIX + route.source + ':' + encodeURIComponent(route.id) + ':' + surah + ':' + ayah;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(key);
  if (cached !== null) return cached === TAFSIR_EMPTY_MARKER ? '' : cached;
  op.fetched = true;
  var text = tafsirFetchText_(route.source, route.id, surah, ayah);
  if (text.length <= TAFSIR_CACHE_MAX_CHARS) {
    cache.put(key, text === '' ? TAFSIR_EMPTY_MARKER : text, TAFSIR_CACHE_TTL_SECONDS);
  }
  return text;
}

// ── Text shaping ────────────────────────────────────────────

function tafsirNotes_(raw) {
  var pattern = /\[\[([\s\S]*?)\]\]/g;
  var text = '';
  var notes = [];
  var last = 0;
  var match;
  while ((match = pattern.exec(raw)) !== null) {
    text = text + raw.slice(last, match.index);
    var start = text.length;
    text = text + '[' + match[1].trim() + ']';
    notes.push([start, text.length - 1]);
    last = match.index + match[0].length;
  }
  return { text: text + raw.slice(last), notes: notes };
}

function tafsirLimit_(parts, limit) {
  if (!limit || parts.text.length <= limit) return { text: parts.text, notes: parts.notes, truncated: false };
  var cut = parts.text.lastIndexOf('\n', limit);
  if (cut < limit / 2) cut = limit;
  var kept = [];
  for (var i = 0; i < parts.notes.length; i++) {
    if (parts.notes[i][1] < cut) kept.push(parts.notes[i]);
  }
  var body = parts.text.slice(0, cut).replace(/\s+$/, '');
  // A note the cut splits is dropped whole, so no half-note is styled.
  for (var j = 0; j < parts.notes.length; j++) {
    if (parts.notes[j][0] < cut && parts.notes[j][1] >= cut) body = body.slice(0, parts.notes[j][0]).replace(/\s+$/, '');
  }
  return { text: body + ' …', notes: kept, truncated: true };
}

function isArabicScript_(text) {
  var sample = String(text).slice(0, 300);
  var arabic = (sample.match(/[؀-ۿ]/g) || []).length;
  var letters = (sample.match(/[A-Za-z؀-ۿ]/g) || []).length;
  return letters > 0 && arabic / letters > 0.5;
}

// ── Blocks ──────────────────────────────────────────────────

function tafsirBlocks_(route, range, settings, op, refText) {
  var groups = [];
  for (var ayah = range.start; ayah <= range.end; ayah++) {
    // Errors (including a pacing/HTTP throttle, which keeps retryAfterMs)
    // propagate as-is: fetchTafsir decides whether to add a cite note or
    // try the fallback source (D4), so this stays a raw per-source failure.
    var text = tafsirText_(route, range.surah, ayah, op);
    if (!text) continue;
    var last = groups[groups.length - 1];
    if (last && last.raw === text && last.ayahEnd === ayah - 1) {
      last.ayahEnd = ayah;
      continue;
    }
    groups.push({ raw: text, ayahStart: ayah, ayahEnd: ayah });
  }
  if (!groups.length) {
    // Marked .noText so fetchTafsir can tell this apart from a per-source
    // failure: it's still a D4 fallback trigger (no text for the whole
    // range), but unlike a failure it never gets a cite note (today or with
    // a fallback also failing) — other sources may have the same gap.
    var noTextErr;
    if (!route.key) {
      noTextErr = new Error(route.source + ' returned no text for "' + route.id + '" at ' + refText + '. Check the ID; the ayah may also be covered with a nearby ayah.');
    } else {
      noTextErr = new Error(route.header + ' has no separate entry for ' + refText + '; it may be covered with a nearby ayah.');
    }
    noTextErr.noText = true;
    throw noTextErr;
  }
  var blocks = [];
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var shaped = tafsirLimit_(tafsirNotes_(g.raw), settings.charLimit);
    var ayahs = g.ayahStart === g.ayahEnd ? String(g.ayahStart) : g.ayahStart + '–' + g.ayahEnd;
    blocks.push({
      ayahStart: g.ayahStart,
      ayahEnd: g.ayahEnd,
      header: route.header + ' · ' + range.surahName + ' ' + range.surah + ':' + ayahs,
      text: shaped.text,
      notes: shaped.notes,
      truncated: shaped.truncated,
      url: tafsirPageUrl_(route.source, route.id, range.surah, g.ayahStart)
    });
  }
  return blocks;
}

function tafsirResult_(route, refText, blocks, cached, fallbackFrom) {
  return {
    ref: refText,
    spec: tafsirSpecFor_(route),
    label: route.label,
    source: route.source,
    rtl: isArabicScript_(blocks[0].text),
    cached: cached,
    blocks: blocks,
    fallbackFrom: fallbackFrom
  };
}

// D4: tafsir fallback. Runs once, after the routed source fails for the
// whole request — tafsirBlocks_ throws either for a hard per-source error
// or when no ayah in the range has text; a per-ayah gap is not a failure
// (tafsirBlocks_ just returns fewer blocks), so it never triggers this.
// The fallback is fetched as a full route for the fallback source, so its
// text caches, links, and header all follow the serving source.
function fetchTafsir(ref, spec) {
  var prefs = getPrefs();
  var range = parseAyahRef_(ref);
  var refText = range.surah + ':' + range.start + (range.end !== range.start ? '-' + range.end : '');
  var route = routeTafsir_(spec, prefs, refText);
  var settings = prefs.tafsir;
  var op = { fetched: false };
  var primaryError;
  try {
    var blocks = tafsirBlocks_(route, range, settings, op, refText);
    return tafsirResult_(route, refText, blocks, !op.fetched, '');
  } catch (e) {
    if (e.retryAfterMs) throw e;
    primaryError = e;
  }

  var fallbackSource = settings.fallback;
  var eligible = !route.explicit && route.key && settings.fallbackOn && fallbackSource && fallbackSource !== route.source &&
    !!(TAFSIR_MAP[route.key].languages[route.language].sources[fallbackSource]);
  // A no-text error (route ran fine, just no entry for this ayah/range) never
  // gets a cite note: other sources may have the very same gap, unlike a
  // hard per-source failure where naming the alternative is useful.
  var citeNote = (route.key && !primaryError.noText) ? tafsirCiteNote_(route.key, route.language, route.others, '', refText) : '';

  if (!eligible) throw new Error(hadithJoin_(primaryError.message, citeNote));

  var fbRoute = tafsirRouteForSource_(route.key, route.language, fallbackSource);
  var fbOp = { fetched: false };
  try {
    var fbBlocks = tafsirBlocks_(fbRoute, range, settings, fbOp, refText);
    return tafsirResult_(fbRoute, refText, fbBlocks, !op.fetched && !fbOp.fetched, route.source);
  } catch (e2) {
    if (e2.retryAfterMs) throw e2;
    var failedNote = 'The fallback (' + fbRoute.source + ') also failed: ' + e2.message;
    throw new Error(hadithJoin_(hadithJoin_(primaryError.message, failedNote), citeNote));
  }
}

// ── Insert ──────────────────────────────────────────────────

function insertTafsirAtCursor(ref, spec) {
  var result = fetchTafsir(ref, spec);
  var pos = getCursorIndex();
  if (!pos) return;
  insertTafsirBlocks_(pos.body, pos.index, result);
  return result;
}

function insertTafsirBlocks_(body, index, result) {
  var settings = getPrefs().tafsir;
  var align = result.rtl ? DocumentApp.HorizontalAlignment.RIGHT : DocumentApp.HorizontalAlignment.LEFT;
  var at = index;
  for (var b = 0; b < result.blocks.length; b++) {
    var block = result.blocks[b];
    var header = body.insertParagraph(at + 1, '📚 ' + block.header).editAsText();
    if (settings.link && block.url) header.setLinkUrl(block.url).setUnderline(true);
    header.setFontSize(10).setForegroundColor('#7d6608').setBold(true);

    var offset = 2;
    var lines = block.text.split('\n');
    var lineStart = 0;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        var para = body.insertParagraph(at + offset, lines[i]);
        para.setAlignment(align);
        var text = para.editAsText();
        text.setFontSize(12).setForegroundColor('#333333');
        styleTafsirNotes_(text, block.notes, lineStart, lines[i].length);
        offset++;
      }
      lineStart = lineStart + lines[i].length + 1;
    }
    body.insertParagraph(at + offset, '─────────────────────────────').setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    at = at + offset;
  }
  return at - index;
}

function styleTafsirNotes_(text, notes, lineStart, lineLength) {
  for (var n = 0; n < notes.length; n++) {
    var start = Math.max(notes[n][0], lineStart) - lineStart;
    var end = Math.min(notes[n][1], lineStart + lineLength - 1) - lineStart;
    if (start <= end) {
      text.setFontSize(start, end, 9);
      text.setForegroundColor(start, end, '#888888');
    }
  }
}

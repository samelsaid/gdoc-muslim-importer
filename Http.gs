// ============================================================
// Polite HTTP
// ============================================================
// Space requests to rate-limited APIs. The spacing lives in the script
// cache under a script lock, so it's shared by every user of the add-on:
// sunnah.com's limit applies to the add-on's single key. 1 request per
// second was measured safe for sunnah.com on 2026-09-29.

var API_SPACING_MS = { 'sunnah.com': 1000, 'tafsir.app': 1000, 'quran.com': 500 };
var API_MAX_WAIT_MS = 3000;
var API_PACE_PREFIX = 'pace:';

function nowMs_() {
  return new Date().getTime();
}

function rateLimitedError_(retryAfterMs) {
  var error = new Error('Too many lookups. Wait a minute and try again.');
  error.retryAfterMs = retryAfterMs;
  return error;
}

var API_DEFAULT_RETRY_AFTER_MS = 10000;

function rateLimitedFromResponse_(response) {
  var headers = response.getHeaders() || {};
  var retryAfter = parseInt(headers['Retry-After'] || headers['retry-after'], 10);
  var ms = retryAfter > 0 ? retryAfter * 1000 : API_DEFAULT_RETRY_AFTER_MS;
  return rateLimitedError_(ms);
}

function paceRequest_(api) {
  var spacing = API_SPACING_MS[api];
  if (!spacing) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  var wait = 0;
  try {
    var cache = CacheService.getScriptCache();
    var now = nowMs_();
    var next = parseInt(cache.get(API_PACE_PREFIX + api) || '0', 10);
    var slot = Math.max(now, next);
    wait = slot - now;
    if (wait > API_MAX_WAIT_MS) throw rateLimitedError_(wait);
    cache.put(API_PACE_PREFIX + api, String(slot + spacing), 60);
  } finally {
    lock.releaseLock();
  }
  if (wait > 0) Utilities.sleep(wait);
}

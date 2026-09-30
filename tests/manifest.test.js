'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'appsscript.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

test('manifest has no Workspace add-on addOns section (BUG-004)', () => {
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'addOns'), false);
});

test('manifest runs on the V8 runtime', () => {
  assert.equal(manifest.runtimeVersion, 'V8');
});

test('manifest declares exactly the three required oauth scopes', () => {
  assert.deepEqual(manifest.oauthScopes, [
    'https://www.googleapis.com/auth/documents.currentonly',
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/script.container.ui',
  ]);
});

test('manifest whitelists exactly the six current URLs', () => {
  assert.deepEqual(manifest.urlFetchWhitelist, [
    'https://api.alquran.cloud/',
    'https://cdn.jsdelivr.net/',
    'https://hadithapi.com/',
    'https://api.sunnah.com/',
    'https://tafsir.app/',
    'https://api.quran.com/',
  ]);
});

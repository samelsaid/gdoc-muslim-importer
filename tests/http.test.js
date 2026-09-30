'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness, makeResponse } = require('./harness');

test('requests to one API are spaced a second apart; other APIs are independent', () => {
  const h = createHarness();
  const t0 = h.clock.now;
  h.ctx.paceRequest_('sunnah.com');
  assert.equal(h.clock.now, t0, 'the first request goes immediately');
  h.ctx.paceRequest_('sunnah.com');
  assert.equal(h.clock.now - t0, 1000, 'the second waits one second');
  h.ctx.paceRequest_('quran.com');
  assert.equal(h.clock.now - t0, 1000, 'another API has its own spacing');
  h.ctx.paceRequest_('spa5k');
  h.ctx.paceRequest_('cdn');
  assert.equal(h.clock.now - t0, 1000, 'unlisted APIs are not paced');
});

test('a queue longer than 3 s becomes a throttle instead of a long sleep', () => {
  const h = createHarness();
  h.scriptCache.put('pace:sunnah.com', String(h.clock.now + 5000));
  let caught = null;
  try { h.ctx.paceRequest_('sunnah.com'); } catch (e) { caught = e; }
  assert.equal(caught && caught.message, 'Too many lookups. Wait a minute and try again.');
  assert.equal(caught.retryAfterMs, 5000);
});

test('the spacing is shared by every user (script cache, not user cache)', () => {
  const h = createHarness();
  h.ctx.paceRequest_('sunnah.com');
  assert.ok(h.scriptCache.get('pace:sunnah.com'));
  assert.equal(h.userCache.get('pace:sunnah.com'), null);
});

test('sunnah.com lookups are paced request by request', () => {
  const h = createHarness({ source: 'sunnah' });
  const t0 = h.clock.now;
  h.call('fetchHadith', 'muslim', '8'); // "8" (404), then "8 a"
  assert.equal(h.fetches.length, 2);
  assert.equal(h.clock.now - t0, 1000);
});

test('rateLimitedFromResponse_ reads Retry-After in either header case, or falls back to the default', () => {
  const h = createHarness();
  const withUpper = makeResponse(429, '{}', { 'Retry-After': '7' });
  assert.equal(h.ctx.rateLimitedFromResponse_(withUpper).retryAfterMs, 7000);
  const withLower = makeResponse(429, '{}', { 'retry-after': '3' });
  assert.equal(h.ctx.rateLimitedFromResponse_(withLower).retryAfterMs, 3000);
  const withoutHeader = makeResponse(429, '{}', {});
  assert.equal(h.ctx.rateLimitedFromResponse_(withoutHeader).retryAfterMs, 10000);
  const withHttpDate = makeResponse(429, '{}', { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' });
  assert.equal(h.ctx.rateLimitedFromResponse_(withHttpDate).retryAfterMs, 10000);
});

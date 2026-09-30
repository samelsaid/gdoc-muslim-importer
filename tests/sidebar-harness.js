'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createHarness } = require('./harness');

const HTML_PATH = path.join(__dirname, '..', 'Sidebar.html');

function createElement(tag, id) {
  const el = {
    tagName: String(tag).toUpperCase(), id: id || '', value: '', checked: false, disabled: false,
    className: '', style: {}, children: [], _text: '',
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); this.children = []; if (this.tagName === 'SELECT') this.value = ''; },
    get innerHTML() { return this._text; },
    set innerHTML(v) { this._text = String(v); this.children = []; if (this.tagName === 'SELECT') this.value = ''; },
    get options() { return this.children; },
    appendChild(child) {
      this.children.push(child);
      if (this.tagName === 'SELECT' && !this.value) this.value = child.value;
      return child;
    },
    remove(index) { this.children.splice(index, 1); },
  };
  return el;
}

function buildDom(html) {
  const elements = {};
  const tagPattern = /<(\w+)([^>]*\sid="([^"]+)"[^>]*)>/g;
  let m;
  while ((m = tagPattern.exec(html)) !== null) {
    const el = createElement(m[1], m[3]);
    const value = /\svalue="([^"]*)"/.exec(m[2]);
    if (value) el.value = value[1];
    if (/\schecked(\s|\/|$)/.test(m[2])) el.checked = true;
    elements[m[3]] = el;
  }
  const selectPattern = /<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
  while ((m = selectPattern.exec(html)) !== null) {
    const optPattern = /<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g;
    let o;
    while ((o = optPattern.exec(m[2])) !== null) {
      const opt = createElement('option');
      opt.value = o[1];
      opt.textContent = o[2];
      elements[m[1]].appendChild(opt);
    }
  }
  return {
    elements,
    document: {
      getElementById: (id) => {
        if (!elements[id]) throw new Error('No element #' + id);
        return elements[id];
      },
      createElement: (tag) => createElement(tag),
    },
  };
}

function createClock(start) {
  const clock = { now: start, timers: [], nextId: 1 };
  clock.setTimeout = (fn, ms) => {
    const id = clock.nextId++;
    clock.timers.push({ id, due: clock.now + (ms || 0), fn });
    return id;
  };
  clock.clearTimeout = (id) => { clock.timers = clock.timers.filter((t) => t.id !== id); };
  clock.advance = (ms) => {
    const end = clock.now + ms;
    for (;;) {
      clock.timers.sort((a, b) => a.due - b.due || a.id - b.id);
      const next = clock.timers[0];
      if (!next || next.due > end) break;
      clock.timers.shift();
      clock.now = Math.max(clock.now, next.due);
      next.fn();
    }
    clock.now = Math.max(clock.now, end);
  };
  return clock;
}

// A response handler normally returns a plain value, resolved synchronously.
// To test out-of-order server replies (see deferredReply below), a handler
// can instead return a Deferred: the call registers its success/failure
// pair on it and waits for the test to resolve/reject it explicitly,
// in whatever order the test chooses.
function deferredReply() {
  let pending = null;
  return {
    __deferred: true,
    register(success, failure) { pending = { success, failure }; },
    resolve(value) { if (pending && pending.success) pending.success(JSON.parse(JSON.stringify(value === undefined ? null : value))); },
    reject(e) { if (pending && pending.failure) pending.failure({ message: e.message }); },
  };
}

function makeRun(responses, calls) {
  const serialize = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  function runner(success, failure) {
    return new Proxy({}, {
      get(_, name) {
        if (name === 'withSuccessHandler') return (fn) => runner(fn, failure);
        if (name === 'withFailureHandler') return (fn) => runner(success, fn);
        return (...args) => {
          const sent = serialize(args);
          calls.push({ name, args: sent });
          const handler = responses[name];
          if (!handler) throw new Error('No sidebar response for ' + String(name));
          let result;
          try {
            result = handler(...sent);
          } catch (e) {
            if (failure) failure({ message: e.message });
            return;
          }
          if (result && result.__deferred) {
            result.register(success, failure);
            return;
          }
          if (success) success(serialize(result));
        };
      },
    });
  }
  return runner(null, null);
}

function createSidebarHarness(options = {}) {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const { elements, document } = buildDom(html);
  const clock = createClock(1000000);
  const calls = [];
  const server = createHarness({ scriptProperties: {} });
  const gradeColors = server.call('getDefaultGradeColors');
  const tafsirPrefs = server.call('getPrefs').tafsir;
  const tafsirBooks = server.call('getTafsirBooks');
  const responses = Object.assign({
    isSunnahAvailable: () => true,
    getPrefs: () => ({ showTranslation: true, quranTranslation: 'en.sahih', hadithSource: 'sunnah', hadithFallback: 'fawazahmed0', hadithFallbackOn: true, hadithApiKey: '', hadithTranslation: 'english', gradeColors, tafsir: tafsirPrefs }),
    getCollectionsForSource: () => [{ value: 'bukhari', label: 'Sahih al-Bukhari' }, { value: 'muslim', label: 'Sahih Muslim' }],
    getDefaultGradeColors: () => gradeColors,
    getTafsirBooks: () => tafsirBooks,
    getFallbackCoverage: (defaultSource, fallbackSource) => server.call('getFallbackCoverage', defaultSource, fallbackSource),
    consumeAutoRun: () => false,
  }, options.responses || {});
  const context = {
    document,
    google: { script: { run: makeRun(responses, calls) } },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    Date: { now: () => clock.now },
    console,
    alert: (m) => { throw new Error('alert() called: ' + m); },
  };
  vm.createContext(context);
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  vm.runInContext(script, context, { filename: 'Sidebar.html' });
  return { ctx: context, el: elements, calls, clock, responses };
}

module.exports = { createSidebarHarness, deferredReply };

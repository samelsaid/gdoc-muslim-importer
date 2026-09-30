'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const GS_FILES = ['Code.gs', 'Text.gs', 'Http.gs', 'Sunnah.gs', 'Grades.gs', 'Tags.gs', 'Tafsir.gs'];
const FIXTURES_PATH = path.join(__dirname, 'fixtures', 'responses.json');

// Fixtures are local only (gitignored): hadith text is never committed.
function loadFixtures() {
  if (!fs.existsSync(FIXTURES_PATH)) {
    throw new Error('Missing tests/fixtures/responses.json (local only, gitignored). Capture it first:\n' +
      '  SUNNAH_API_KEY="$(security find-generic-password -s nnjasec-sunnah.com-api -w)" ' +
      'docker compose run --rm -e SUNNAH_API_KEY test node tests/capture-fixtures.js');
  }
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf8'));
}

function makeResponse(status, body, headers) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { getResponseCode: () => status, getContentText: () => text, getHeaders: () => headers || {} };
}

function createStore(initial) {
  const data = Object.assign({}, initial || {});
  const store = {
    data,
    getProperty: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setProperty: (k, v) => { data[k] = String(v); return store; },
    deleteProperty: (k) => { delete data[k]; return store; },
  };
  return store;
}

function createCache() {
  const data = new Map();
  return {
    data,
    get: (k) => (data.has(k) ? data.get(k) : null),
    put: (k, v) => { data.set(k, String(v)); },
    remove: (k) => { data.delete(k); },
  };
}

function createDocument(items, cursorIndex) {
  const children = [];

  function makeParagraph(text, parent) {
    const para = { type: 'PARAGRAPH', text: String(text), parent, ops: [], alignment: null };
    const proxy = {
      getText: () => para.text,
      deleteText: (start, end) => { para.text = para.text.slice(0, start) + para.text.slice(end + 1); return proxy; },
      setFontSize: (...a) => { para.ops.push(['fontSize', ...a]); return proxy; },
      setForegroundColor: (...a) => { para.ops.push(['color', ...a]); return proxy; },
      setBold: (...a) => { para.ops.push(['bold', ...a]); return proxy; },
      setItalic: (...a) => { para.ops.push(['italic', ...a]); return proxy; },
      setUnderline: (...a) => { para.ops.push(['underline', ...a]); return proxy; },
      setLinkUrl: (...a) => { para.ops.push(['link', ...a]); return proxy; },
    };
    para.editAsText = () => proxy;
    para.asText = () => proxy;
    para.getText = () => para.text;
    para.getParent = () => para.parent;
    para.getType = () => para.type;
    para.setAlignment = (a) => { para.alignment = a; return para; };
    return para;
  }

  const body = {
    children,
    getText: () => allParagraphs().map((p) => p.text).join('\n'),
    getChildIndex: (el) => {
      const i = children.indexOf(el);
      if (i === -1) throw new Error('Element does not contain the specified child element');
      return i;
    },
    insertParagraph: (index, text) => {
      const p = makeParagraph(text, body);
      children.splice(index, 0, p);
      return p;
    },
    findText: (pattern, from) => {
      const paras = allParagraphs();
      let pi = from ? Math.max(0, paras.indexOf(from._para)) : 0;
      let offset = from ? from._end + 1 : 0;
      for (; pi < paras.length; pi++, offset = 0) {
        const re = new RegExp(pattern, 'g');
        re.lastIndex = offset;
        const m = re.exec(paras[pi].text);
        if (m) {
          const para = paras[pi];
          const start = m.index;
          const end = m.index + m[0].length - 1;
          return {
            _para: para,
            _end: end,
            getElement: () => ({ asText: () => para.editAsText(), getParent: () => para, getType: () => 'TEXT' }),
            getStartOffset: () => start,
            getEndOffsetInclusive: () => end,
          };
        }
      }
      return null;
    },
  };

  function allParagraphs() {
    const out = [];
    for (const child of children) {
      if (child.type === 'TABLE') out.push(...child.paragraphs);
      else out.push(child);
    }
    return out;
  }

  for (const item of items || []) {
    if (item && typeof item === 'object' && 'table' in item) {
      const table = { type: 'TABLE', paragraphs: [] };
      table.paragraphs.push(makeParagraph(item.table, { type: 'TABLE_CELL' }));
      children.push(table);
    } else {
      children.push(makeParagraph(item, body));
    }
  }

  const doc = {
    cursorIndex: cursorIndex === undefined ? null : cursorIndex,
    getBody: () => body,
    getId: () => 'doc-1',
    getCursor: () => {
      if (doc.cursorIndex === null) return null;
      const p = children[doc.cursorIndex];
      return { getElement: () => p };
    },
  };
  return doc;
}

function createHarness(options = {}) {
  let fixtures = null;
  const getFixtures = () => fixtures || (fixtures = loadFixtures());
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'appsscript.json'), 'utf8'));
  const allowed = manifest.urlFetchWhitelist || [];
  const fetches = [];
  const logs = [];
  const alerts = [];
  const sidebars = [];
  const menuItems = [];
  const menuCalls = { createMenu: 0, createAddonMenu: 0 };
  const scriptProps = createStore(options.scriptProperties || { SUNNAH_API_KEY: 'test-key' });
  const userInitial = Object.assign({}, options.userProperties || {});
  if (options.source) userInitial.prefs = JSON.stringify({ hadithSource: options.source });
  const userProps = createStore(userInitial);
  const scriptCache = createCache();
  const userCache = createCache();
  const doc = createDocument(options.document, options.cursorIndex);
  const routes = options.routes || {};
  const clock = { now: options.now || Date.UTC(2026, 8, 28, 12, 0, 30) };

  function fetch(url, params) {
    const headers = (params && params.headers) || {};
    fetches.push({ url, headers: Object.assign({}, headers) });
    if (!allowed.some((prefix) => url.startsWith(prefix))) {
      throw new Error('URL not in urlFetchWhitelist: ' + url);
    }
    if (Object.prototype.hasOwnProperty.call(routes, url)) {
      const route = routes[url];
      if (typeof route === 'function') return route(url, params);
      return makeResponse(route.status, route.body, route.headers);
    }
    if (options.fetch) return options.fetch(url, params);
    const fixture = getFixtures().responses[url];
    if (!fixture) throw new Error('No fixture for ' + url);
    return makeResponse(fixture.status, fixture.body);
  }

  const ui = {
    alert: (m) => { alerts.push(String(m)); },
    showSidebar: (h) => { sidebars.push(h); },
    createMenu: () => {
      menuCalls.createMenu++;
      const menu = {
        addItem: (label, fn) => { menuItems.push([label, fn]); return menu; },
        addToUi: () => menu,
      };
      return menu;
    },
    createAddonMenu: () => {
      menuCalls.createAddonMenu++;
      const menu = {
        addItem: (label, fn) => { menuItems.push([label, fn]); return menu; },
        addToUi: () => menu,
      };
      return menu;
    },
  };

  const context = {
    UrlFetchApp: { fetch },
    PropertiesService: { getScriptProperties: () => scriptProps, getUserProperties: () => userProps },
    CacheService: { getScriptCache: () => scriptCache, getUserCache: () => userCache },
    LockService: { getUserLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }), getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    Logger: { log: (m) => { logs.push(String(m)); } },
    Utilities: { sleep: (ms) => { clock.now += ms; } },
    HtmlService: {
      createHtmlOutputFromFile: (name) => {
        const out = { name, setTitle: () => out, setWidth: () => out };
        return out;
      },
    },
    DocumentApp: {
      getActiveDocument: () => doc,
      getUi: () => ui,
      ElementType: { PARAGRAPH: 'PARAGRAPH', TEXT: 'TEXT' },
      HorizontalAlignment: { LEFT: 'LEFT', CENTER: 'CENTER', RIGHT: 'RIGHT' },
    },
    console,
  };
  vm.createContext(context);
  for (const file of GS_FILES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, 'utf8'), context, { filename: file });
  }
  context.nowMs_ = () => clock.now;

  function call(name, ...args) {
    if (typeof context[name] !== 'function') throw new Error('No server function ' + name);
    const result = context[name](...args);
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  }

  return {
    ctx: context, call, fetches, logs, alerts, sidebars, menuItems, menuCalls, scriptProps, userProps, scriptCache, userCache, doc, clock,
    get fixtures() { return getFixtures(); },
  };
}

module.exports = { createHarness, makeResponse };

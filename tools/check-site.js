#!/usr/bin/env node
// Asserts the built _site directory is a valid deploy for
// Quran & Hadith Importer's GitHub Pages site. Node 22, no dependencies.
// Usage: node tools/check-site.js <path-to-_site>

const fs = require("node:fs");
const path = require("node:path");

const siteDir = process.argv[2];
if (!siteDir) {
  console.error("check-site.js: usage: node tools/check-site.js <_site dir>");
  process.exit(1);
}

const errors = [];

function unescapeHtmlEntities(html) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#x26;/gi, "&");
}

function readPage(relPath) {
  const full = path.join(siteDir, relPath);
  if (!fs.existsSync(full)) {
    errors.push(`missing required page: ${relPath}`);
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

const requiredPages = [
  "index.html",
  "privacy/index.html",
  "terms/index.html",
  "support/index.html",
];

const expectedH1 = {
  "privacy/index.html": "Privacy policy",
  "terms/index.html": "Terms of service",
  "support/index.html": "Support",
};

const appName = "Quran & Hadith Importer";

for (const rel of requiredPages) {
  const raw = readPage(rel);
  if (raw === null) continue;

  const html = unescapeHtmlEntities(raw);

  if (!html.includes(appName)) {
    errors.push(`${rel}: missing app name "${appName}"`);
  }
  if (!/href="[^"]*\/privacy\/[^"]*"/.test(html)) {
    errors.push(`${rel}: missing a link to /privacy/`);
  }
  if (!/href="[^"]*\/terms\/[^"]*"/.test(html)) {
    errors.push(`${rel}: missing a link to /terms/`);
  }
  if (raw.includes("{{") || raw.includes("{%")) {
    errors.push(`${rel}: contains unrendered Liquid ("{{" or "{%")`);
  }
  if (/href="[^"]*\.md(#[^"]*)?"/.test(raw)) {
    errors.push(`${rel}: contains a link ending in ".md"`);
  }
  if (expectedH1[rel]) {
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
    if (!h1Match || h1Match[1].trim() !== expectedH1[rel]) {
      errors.push(`${rel}: missing or wrong <h1> (expected "${expectedH1[rel]}")`);
    }
  }
}

const privacyRaw = fs.existsSync(path.join(siteDir, "privacy/index.html"))
  ? fs.readFileSync(path.join(siteDir, "privacy/index.html"), "utf8")
  : "";
if (privacyRaw && !privacyRaw.includes("<table")) {
  errors.push("privacy/index.html: expected a rendered <table> (GFM table check)");
}

if (errors.length > 0) {
  console.error("check-site.js: FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`check-site.js: OK (${requiredPages.length} pages checked)`);

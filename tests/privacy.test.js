'use strict';
// The planner handles patient information, so nothing may leave the device.
// These checks read the shipped files; they cannot prove a negative, but they
// catch the usual ways data leaks: network calls, outside resources, forms,
// and storing more than the practice settings.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');
const read = (f) => fs.readFileSync(path.join(SITE, f), 'utf8');
const files = (dir, ext) => fs.readdirSync(path.join(SITE, dir)).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
const html = read('index.html');
const js = files('js', '.js').map((f) => [f, read(f)]);
const css = files('css', '.css').map((f) => [f, read(f)]);

test('no script can talk to a server', () => {
  const banned = /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|serviceWorker|RTCPeerConnection|indexedDB|document\.cookie|window\.open)\b/;
  for (const [f, src] of js) assert.doesNotMatch(src, banned, f);
});

test('the page sets a Content-Security-Policy that blocks connections, forms and outside resources', () => {
  const m = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, 'CSP meta tag');
  const csp = m[1];
  for (const d of ["default-src 'none'", "script-src 'self'", "style-src 'self'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'"]) {
    assert.ok(csp.includes(d), d);
  }
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https?:|\*/);
  // the CSP must come before anything it governs
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<link'), 'CSP before the first link');
});

test('the page loads nothing from elsewhere, and has no inline scripts, handlers or forms that submit', () => {
  for (const m of html.matchAll(/\b(src|href)="([^"]+)"/g)) {
    const url = m[2];
    const external = /^(https?:)?\/\//.test(url);
    if (external) {
      // only plain links that open in a new tab are allowed (license, source code)
      assert.strictEqual(m[1], 'href', url);
      const tag = html.slice(html.lastIndexOf('<', m.index), html.indexOf('>', m.index));
      assert.match(tag, /^<a /, url);
      assert.match(tag, /rel="noopener noreferrer"/, url);
    }
  }
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'inline script');
  assert.doesNotMatch(html, /\son[a-z]+="/, 'inline event handler');
  assert.doesNotMatch(html, /<iframe|<object|<embed/);
  for (const m of html.matchAll(/<form[^>]*>/g)) assert.match(m[0], /method="dialog"/, 'only dialog forms');
  for (const [f, src] of css) {
    assert.doesNotMatch(src, /@import|url\(\s*['"]?(https?:)?\/\//, f);
  }
});

test('only the practice settings are stored, under one key, through one function', () => {
  const app = read('js/app.js');
  const sets = [...app.matchAll(/localStorage\.setItem\(([^)]*\))\)?/g)];
  assert.strictEqual(sets.length, 1, 'one place writes to localStorage');
  assert.match(sets[0][0], /localStorage\.setItem\(SETTINGS_KEY, JSON\.stringify\(cleanSettings\(settings\)\)/);
  assert.doesNotMatch(app, /sessionStorage/);
  // cleanSettings builds its result from the four settings fields only
  const body = app.slice(app.indexOf('function cleanSettings'), app.indexOf('var settings = cleanSettings()'));
  const keys = [...body.matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]);
  assert.deepStrictEqual(keys, ['doctor', 'lenses', 'laser', 'idle']);
  assert.doesNotMatch(body, /patient|state\.|overrides/);
  for (const [f, src] of js) if (f !== path.join('js', 'app.js')) assert.doesNotMatch(src, /localStorage/, f);
});

test('patient fields are not remembered by the browser', () => {
  for (const id of ['pt-name', 'pt-dob']) {
    const tag = html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>'));
    assert.ok(tag, id);
    assert.match(tag[0], /autocomplete="off"/, id);
  }
});

test('the patient, and the surgeon\'s changes for them, never go into the address bar or the page title', () => {
  const app = read('js/app.js');
  assert.doesNotMatch(app, /document\.title\s*=/);
  // setupLink() builds the only URL, from settings alone
  const body = app.slice(app.indexOf('function setupLink'), app.indexOf('function applySetupLink'));
  assert.doesNotMatch(body, /patient|state\.|overrides/);
  for (const m of app.matchAll(/(pushState|replaceState)\(([^)]*)\)/g)) assert.doesNotMatch(m[2], /patient|state|overrides/);
});

test('the surgeon\'s changes are cleared by Start over, like the answers', () => {
  const app = read('js/app.js');
  const body = app.slice(app.indexOf('function startOver'), app.indexOf('/* ---------- idle'));
  assert.match(body, /overrides = \{\}/);
  assert.match(body, /review = false/);
  const dirty = app.slice(app.indexOf('function dirty'), app.indexOf('function answers'));
  assert.match(dirty, /overrides/, 'the idle timer clears a patient with changes');
});

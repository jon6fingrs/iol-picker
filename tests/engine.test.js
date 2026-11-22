'use strict';
// What the page (site/js/app.js) relies on from the rules engine
// (site/js/rules.js): its exports, the fields it draws, and that every answer
// gives every lens a verdict. The clinical rules are in rules.test.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const T = require('../site/js/rules.js');

const ids = (r) => r.lenses.map((l) => l.id);
const allIds = T.LENSES.map((l) => l.id);
const base = () => ({ ...T.DEFAULTS, conditions: {} });

test('the engine has everything the page uses', () => {
  for (const f of ['pick', 'options', 'conditionsFor', 'questionApplies']) assert.strictEqual(typeof T[f], 'function', f);
  for (const a of ['LENSES', 'CONDITIONS', 'QUESTIONS']) assert.ok(Array.isArray(T[a]) && T[a].length, a);
  assert.strictEqual(typeof T.DEFAULTS, 'object');
  const src = fs.readFileSync(path.join(__dirname, '..', 'site', 'js', 'rules.js'), 'utf8');
  assert.match(src, /root\.IolRules = factory\(\)/, 'browser global the page reads');
});

test('lenses, conditions and questions have the fields the page draws', () => {
  for (const l of T.LENSES) {
    assert.ok(typeof l.id === 'string' && l.name && l.what, l.id);
    assert.strictEqual(typeof l.extra, 'boolean', l.id);
  }
  assert.ok(allIds.includes('distance'), 'the always-offered lens');
  for (const g of T.CONDITIONS) {
    assert.ok(g.group && g.items.length, g.group);
    for (const it of g.items) assert.ok(typeof it[0] === 'string' && typeof it[1] === 'string', it[0]);
  }
  assert.deepStrictEqual(T.QUESTIONS.map((q) => q.key).sort(), Object.keys(T.DEFAULTS).sort());
  for (const q of T.QUESTIONS) {
    assert.ok(q.short && q.label && q.values.length >= 2, q.key);
    assert.ok(q.values.some((v) => v[0] === T.DEFAULTS[q.key]), q.key + ' default is a choice');
  }
});

test('every answer gives every lens one verdict, in one group, with the flags the page shows', () => {
  for (const q of T.QUESTIONS) for (const [v] of q.values) {
    const r = T.pick({ ...base(), [q.key]: v });
    assert.deepStrictEqual(ids(r), allIds, q.key + '=' + v);
    assert.deepStrictEqual(r.groups.map((g) => g.verdict), ['good', 'possible', 'avoid']);
    assert.strictEqual(r.groups.reduce((n, g) => n + g.lenses.length, 0), allIds.length);
    for (const l of r.lenses) {
      assert.ok(['good', 'possible', 'avoid'].includes(l.verdict), l.id);
      assert.ok(Array.isArray(l.why), l.id);
      for (const f of ['toric', 'laser', 'laserAstig', 'tryFirst']) assert.strictEqual(typeof l[f], 'boolean', l.id + '.' + f);
    }
    assert.ok(r.notes.length && r.notes.every((n) => typeof n === 'string'));
  }
});

test('practice options: lenses not offered are dropped, the distance monofocal stays', () => {
  assert.deepStrictEqual(T.options({ lenses: [] }).lenses, ['distance']);
  const r = T.pick(base(), { lenses: ['distance', 'edof'] });
  assert.deepStrictEqual(ids(r), ['distance', 'edof']);
});

test('practice options: without the laser nothing is laser-assisted and the notes leave it out', () => {
  for (const astig of ['little', 'more', 'unknown', 'no']) {
    const r = T.pick({ ...base(), glasses: 'none', astig }, { laser: false });
    assert.ok(r.lenses.every((l) => !l.laser && !l.laserAstig), astig);
    assert.doesNotMatch(r.notes.join(' '), /laser/i, astig);
  }
});

test('practice options: questions and conditions that matter only to what is not offered are left out', () => {
  assert.strictEqual(T.questionApplies('adjust', { lenses: ['distance'] }), false);
  assert.strictEqual(T.questionApplies('glasses', { lenses: ['distance'] }), true);
  const all = T.conditionsFor().flatMap((g) => g.items.map((i) => i[0]));
  const bare = T.conditionsFor({ lenses: ['distance'], laser: false }).flatMap((g) => g.items.map((i) => i[0]));
  assert.ok(bare.length < all.length);
  assert.ok(bare.every((c) => all.includes(c)));
});

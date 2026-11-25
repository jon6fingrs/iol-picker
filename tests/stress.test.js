'use strict';
// Stress test of the rules (site/js/rules.js): rules that must hold for every
// patient, checked over every combination of answers and over random patients
// with random eye conditions and practice settings. The random cases use a
// fixed seed, so a failure always reproduces. Each failure message names the
// rule and gives one example.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../site/js/rules.js');

const RANK = { good: 0, possible: 1, avoid: 2 };
const Q = R.QUESTIONS.map((q) => [q.key, q.values.map((v) => v[0])]);
const CONDS = R.CONDITIONS.flatMap((g) => g.items.map((i) => i[0]));
const LENS_IDS = R.LENSES.map((l) => l.id);
const LASER_RULEOUT = ['pupil', 'scar', 'bleb', 'flat'];
const OPTIONAL = LENS_IDS.filter((id) => id !== 'distance');
const SETUPS = [];
for (let m = 0; m < 1 << OPTIONAL.length; m++) {
  for (const laser of [true, false]) SETUPS.push({ lenses: ['distance'].concat(OPTIONAL.filter((_, i) => m & (1 << i))), laser });
}

let seed = 20261122;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
function randomPatient() {
  const a = { conditions: {} };
  Q.forEach(([k, vals]) => { a[k] = vals[Math.floor(rnd() * vals.length)]; });
  const p = rnd() * 0.35;
  CONDS.forEach((c) => { if (rnd() < p) a.conditions[c] = true; });
  return a;
}
function* everyAnswer() {
  const idx = Q.map(() => 0);
  for (;;) {
    const a = { conditions: {} };
    Q.forEach(([k, vals], i) => { a[k] = vals[idx[i]]; });
    yield a;
    let i = 0;
    while (i < Q.length && ++idx[i] === Q[i][1].length) { idx[i] = 0; i++; }
    if (i === Q.length) return;
  }
}

// Every rule that must hold for one patient; returns the names of those broken.
function broken(a, o) {
  const res = R.pick(a, o);
  const opts = R.options(o);
  const has = (k) => !!a.conditions[k];
  const offers = (id) => opts.lenses.includes(id);
  const v = (id) => (res.lenses.find((l) => l.id === id) || {}).verdict;
  const laserOK = opts.laser && !LASER_RULEOUT.some(has);
  const out = [];
  const rule = (ok, name) => { if (!ok) out.push(name); };

  const split = a.astig === 'little' || a.astig === 'more';
  const listed = LENS_IDS.filter(offers).flatMap((id) => (id === 'distance' && split ? [id, 'corrected'] : [id]));
  rule(JSON.stringify(res.lenses.map((l) => l.id)) === JSON.stringify(listed), 'the result lists exactly the lenses offered, with the corrected monofocal only with astigmatism');
  // the monofocals left as standard lenses, astigmatism to glasses
  const plain = (id) => id === 'distance' || ((a.glasses === 'all' || a.cost === 'no') && (id === 'near' || id === 'monovision'));
  rule(res.groups.reduce((n, g) => n + g.lenses.filter((l) => l.verdict === g.verdict).length, 0) === res.lenses.length, 'each lens is in exactly its own group');
  rule(!/undefined|null|NaN|\[object/.test(JSON.stringify(res)), 'no undefined, null or NaN in the output');
  rule(new Set(res.notes).size === res.notes.length, 'no note repeats');
  rule(/out-of-pocket/.test(res.notes.join(' ')), 'the cost note is always there');
  for (const l of res.lenses) {
    rule(new Set(l.why).size === l.why.length, 'no reason repeats on a lens');
    rule(l.verdict === 'good' || l.why.length > 0, 'a lens that is not a good fit says why');
    rule(!(l.verdict === 'avoid' && (l.toric || l.laser || l.laserAstig || l.tryFirst)), 'a ruled-out lens carries no tags');
    rule(!(l.toric && l.laserAstig), 'never both a toric lens and laser cuts');
    rule(opts.laser || (!l.laser && !l.laserAstig), 'no laser when the practice has none');
    rule(laserOK || (!l.laser && !l.laserAstig), 'no laser when the eye rules it out');
    if (a.astig === 'no' || a.astig === 'unknown') rule(!l.toric && !l.laserAstig, 'no astigmatism treatment without known astigmatism');
    if (plain(l.id)) rule(!l.toric && !l.laserAstig && !l.laser, 'a standard monofocal leaves astigmatism to glasses, without the laser');
    else if (l.verdict !== 'avoid' && l.id !== 'lal' && a.astig === 'more') rule(l.toric, 'more astigmatism: every other viable lens is toric');
    else if (l.verdict !== 'avoid' && l.id !== 'lal' && a.astig === 'little') rule(laserOK ? l.laserAstig : l.toric, 'a little astigmatism: laser cuts if possible, otherwise toric');
    if (a.cost === 'no' && (l.extra || l.toric || l.laser)) rule(l.verdict !== 'good', 'preferring what insurance covers: nothing that costs extra is a good fit');
  }

  rule(v('distance') !== 'avoid', 'a monofocal for distance is never ruled out');
  if (split) rule(v('corrected') !== 'avoid', 'the corrected monofocal for distance is never ruled out');
  const macula = has('amd') || has('diabetic') || has('erm');
  if (macula || has('glaucoma-adv') || has('fuchs') || has('keratoconus') || has('scar')) {
    if (offers('multifocal')) rule(v('multifocal') === 'avoid', 'an eye short of contrast rules out a multifocal');
    if (offers('edof')) rule(v('edof') === 'avoid', 'an eye short of contrast rules out extended depth');
  }
  if (offers('multifocal') && (has('glaucoma-mild') || has('dryeye') || has('amblyopia') || has('uveitis') || a.refractive === 'rk' || a.refractive === 'hyperopic' || a.night === 'yes')) {
    rule(v('multifocal') === 'avoid', 'a multifocal is ruled out by glaucoma, dry eye, amblyopia, uveitis, RK, hyperopic LASIK or night driving');
  }
  if (offers('lal')) {
    const lalNeeded = ['myopic', 'hyperopic', 'lasik', 'rk'].includes(a.refractive) || has('keratoconus') ||
      (a.eyes === 'second' && a.fellow === 'lal') || ((a.glasses === 'none' || a.glasses === 'computer') && a.monovision === 'never');
    if (macula || has('amblyopia') || has('diabetes') || has('rdrisk') || has('pupil') || has('herpes') || has('nystagmus') || has('photo') || a.adjust === 'no') {
      rule(v('lal') === 'avoid', 'the light adjustable lens: labeling, silicone, visual potential and refusal respected');
    }
    if (v('lal') === 'good') rule(lalNeeded, 'the light adjustable lens is a good fit only where it is needed');
  }
  if (offers('monovision')) {
    if (a.monovision === 'disliked' || a.eyes === 'only') rule(v('monovision') === 'avoid', 'monovision is ruled out if disliked or for an only eye');
    if (a.monovision === 'never') rule(v('monovision') !== 'good', 'monovision never tried is never a good fit');
  }
  if (a.eyes === 'second' && ['distance', 'near', 'unknown'].includes(a.fellow)) {
    if (offers('multifocal')) rule(v('multifocal') !== 'good', 'a monofocal in the first eye: a multifocal is not a good fit');
    if (offers('edof')) rule(v('edof') !== 'good', 'a monofocal in the first eye: extended depth is not a good fit');
  }
  if (a.glasses === 'readers' && a.cost !== 'no' && !(a.eyes === 'second' && a.fellow === 'multifocal')) rule(v(split ? 'corrected' : 'distance') === 'good', 'wanting distance with readers: the distance monofocal, corrected for any astigmatism, is a good fit');
  if (a.glasses === 'readers' && split) rule(v('distance') === 'possible', 'wanting distance with readers and astigmatism: the standard monofocal is possible');
  if (a.glasses === 'all' && !(a.eyes === 'second' && a.fellow === 'multifocal')) rule(v('distance') === 'good', 'glasses for everything are fine: the standard monofocal is a good fit');
  if (a.glasses === 'all' && split) rule(v('corrected') === 'possible', 'glasses for everything are fine: correcting astigmatism is possible, more than needed');
  if (a.glasses === 'near' && offers('near') && !(a.eyes === 'second' && a.fellow === 'multifocal')) rule(v('near') === 'good', 'wanting to read without glasses: the near monofocal is a good fit');

  const notes = res.notes.join(' ');
  rule(offers('lal') || !/light adjustable/i.test(notes), 'the notes leave out the light adjustable lens when it is not offered');
  rule(opts.laser || !/laser/i.test(notes), 'the notes leave out the laser when it is not offered');
  rule(!/would not be used/.test(notes) || (opts.laser && LASER_RULEOUT.some(has)), 'the laser is said to be ruled out only when it is offered and ruled out');
  return out;
}

// Adding a condition never makes a lens look better, except that an
// irregular cornea makes the light adjustable lens more useful.
function brokenMonotone(a, o) {
  const out = [];
  const base = R.pick(a, o);
  for (const k of CONDS) {
    if (a.conditions[k]) continue;
    const more = R.pick({ ...a, conditions: { ...a.conditions, [k]: true } }, o);
    base.lenses.forEach((l, i) => {
      if (k === 'keratoconus' && l.id === 'lal') return;
      if (RANK[more.lenses[i].verdict] < RANK[l.verdict]) out.push('adding "' + k + '" improves ' + l.id);
    });
  }
  return out;
}

function run(cases, check) {
  const fails = {};
  let n = 0;
  for (const [a, o] of cases) {
    n++;
    for (const name of check(a, o)) if (!fails[name]) fails[name] = JSON.stringify({ answers: a, options: o || 'everything offered' });
  }
  const names = Object.keys(fails);
  assert.ok(n > 0);
  assert.deepStrictEqual(names.map((k) => k + '\n    e.g. ' + fails[k]), [], names.length + ' rule(s) broken');
  return n;
}

// a few practice setups that cover the cases that change the wording: all
// lenses, the bare minimum, no laser, no light adjustable lens, no lenses that
// split or stretch focus (every setup is still reached by the random test)
const KEY_SETUPS = [undefined, { lenses: ['distance'], laser: false }, { laser: false },
  { lenses: ['distance', 'near', 'monovision', 'edof', 'multifocal'] }, { lenses: ['distance', 'near', 'monovision', 'lal'], laser: true }];

test('every combination of answers, with no eye conditions, under key practice setups', () => {
  const cases = [];
  for (const a of everyAnswer()) for (const o of KEY_SETUPS) cases.push([a, o]);
  run(cases, broken);
});

test('each eye condition on its own, with 1,000 random sets of answers each', () => {
  const cases = [];
  for (const c of CONDS) for (let i = 0; i < 1000; i++) {
    const a = randomPatient();
    cases.push([{ ...a, conditions: { [c]: true } }, undefined]);
  }
  run(cases, broken);
});

test('30,000 random patients with random eye conditions and practice setups', () => {
  const cases = [];
  for (let i = 0; i < 30000; i++) cases.push([randomPatient(), rnd() < 0.5 ? undefined : SETUPS[Math.floor(rnd() * SETUPS.length)]]);
  run(cases, broken);
});

test('adding an eye condition never makes a lens look better (2,000 random patients)', () => {
  const cases = [];
  for (let i = 0; i < 2000; i++) cases.push([randomPatient(), rnd() < 0.5 ? undefined : SETUPS[Math.floor(rnd() * SETUPS.length)]]);
  run(cases, brokenMonotone);
});

/* Lens Implant Planner: the page. The rules, including the questions, are in
 * rules.js, which is tested.
 *
 * Privacy: this file never sends anything anywhere (the page's
 * Content-Security-Policy blocks it too). The only thing it stores is the
 * practice settings (surgeon name, lenses offered, laser, idle time), under
 * one localStorage key, built by cleanSettings() from those fields alone.
 * Patient details and answers live only in memory: "Start over", reloading
 * the page, or the idle timer erases them.
 *
 * The questions are rebuilt only when the settings change; otherwise just the
 * results and the print sheet are redrawn, so focus and the open checklist
 * stay put. The one-page sheet is kept up to date with every change, and
 * print styles show only it, so printing from the browser's own menu gives
 * the same page as the Print button.
 */
(function () {
  'use strict';
  var R = window.IolRules;
  var app = document.getElementById('app');
  if (!R || !app) return;

  var QUESTIONS = R.QUESTIONS;
  var HEADS = {
    good: ['Good fits', 'Match what you want, with nothing in your answers against them.'],
    possible: ['Possible, with trade-offs', 'Could work; the reasons say what to weigh.'],
    avoid: ['Usually not advised', 'Something in your answers argues against these.']
  };
  var DEFAULTS = R.DEFAULTS;
  // The fuller explanation of each lens for "About the lens options". The
  // rules carry only a one-line summary; a lens added there without an entry
  // here shows that summary instead.
  var ABOUT = {
    distance: [
      'A monofocal lens focuses at one distance. It is the standard lens, the one most people receive, and it is usually covered by insurance. Vision at its set distance is very sharp and high in contrast, and it gives the fewest problems with glare at night.',
      'Set for distance, the most common choice, driving, television and faces across a room are clear without glasses. Reading glasses are needed for near, and arm’s length (a computer or the car dashboard) is usable but softer.'],
    near: [
      'The same standard lens, set so that reading is clear without glasses, with glasses worn for distance and driving. Some people who have been nearsighted all their lives, and are used to reading without glasses, prefer this.'],
    monovision: [
      'Monovision uses monofocal lenses with one eye set for distance and the other for near or arm’s length. The brain learns to use whichever eye is clear for the task. Done well, it gives a good range from distance to near without the halos or loss of contrast of a multifocal lens.',
      'The trade-offs are slightly less depth perception and a little less sharpness with both eyes together; glasses may still help for night driving or long reading. Not everyone adapts. It suits people who have used monovision with contact lenses and liked it. Because the result is permanent, try it with contact lenses first: surgery should not be the first time.'],
    lal: [
      'A monofocal lens whose power can be changed after surgery. Once the eye has healed, usually two to three weeks later, you try out the vision. Then, over a few short visits, a measured pattern of ultraviolet light is shone on the lens through a dilated pupil to fine-tune its power, correcting leftover nearsightedness, farsightedness or astigmatism. A final treatment locks the power in.',
      'It is the surest way to land the target, and you can try the result, including monovision, before it is final. It suits eyes whose power is hard to predict, such as after LASIK, PRK or RK or with an irregular cornea, and people who want to try monovision without committing; where a standard lens already gives what you want, it adds visits and cost for little gain. UV-protective glasses must be worn during all waking hours, indoors and out, until the power is locked in, usually some weeks.',
      'It is not used with macular disease, with medicines that make the eyes sensitive to light, after a herpes infection of the eye, with eyes that shake (nystagmus), when the pupil does not dilate well, or in an eye that has always seen less (amblyopia). The lens is made of silicone, so it is also avoided with diabetes or when retina surgery with silicone oil may be needed, since the oil clings to silicone.'],
    edof: [
      'An extended depth of focus (EDOF) lens stretches the range of clear vision from distance to arm’s length. Most people can drive, use a computer and see a dashboard without glasses, and use light reading glasses for small print.',
      'Some notice mild halos or glare around lights at night, far less than with a multifocal lens. Designs differ: some use fine rings and give more near vision with more halos; others have no rings and give fewer halos with a little less near vision.'],
    multifocal: [
      'A multifocal lens (bifocal or trifocal) splits light between distances using fine rings on its surface, so far, arm’s length and near can all be usable without glasses. It gives the most freedom from glasses.',
      'The trade-offs: halos or rings around lights at night (most people adapt over months, but some remain bothered), and slightly less contrast, which matters in dim light and more so when the eye has another condition. It works best when the cornea, macula and optic nerve are healthy.']
  };
  var EYES = { right: 'Right', left: 'Left', both: 'Both' };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- settings: the only thing ever stored ---------- */
  var SETTINGS_KEY = 'iolp-settings';
  var IDLE_CHOICES = [0, 5, 10, 20, 60];
  var ALL_LENSES = R.LENSES.map(function (l) { return l.id; });

  // Only these four fields, cleaned up, are ever written to storage.
  function cleanSettings(s) {
    s = s || {};
    var idle = parseInt(s.idle, 10);
    return {
      doctor: String(s.doctor == null ? '' : s.doctor).replace(/\s+/g, ' ').trim().slice(0, 120),
      lenses: R.options({ lenses: Array.isArray(s.lenses) ? s.lenses : ALL_LENSES }).lenses,
      laser: s.laser !== false,
      idle: IDLE_CHOICES.indexOf(idle) >= 0 ? idle : 20
    };
  }
  var settings = cleanSettings();
  function loadSettings() {
    try { var raw = localStorage.getItem(SETTINGS_KEY); if (raw) settings = cleanSettings(JSON.parse(raw)); } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings(settings))); } catch (e) {}
  }
  function forgetSettings() {
    try { localStorage.removeItem(SETTINGS_KEY); } catch (e) {}
    settings = cleanSettings();
  }
  function opts() { return { lenses: settings.lenses, laser: settings.laser }; }

  // A setup link (#doctor=&lenses=&laser=&idle=) applies and saves settings,
  // then is removed from the address bar. It carries no patient information,
  // and the part after # is never sent to the web server.
  function setupLink() {
    var p = new URLSearchParams();
    if (settings.doctor) p.set('doctor', settings.doctor);
    p.set('lenses', settings.lenses.join(','));
    p.set('laser', settings.laser ? '1' : '0');
    p.set('idle', String(settings.idle));
    return location.origin + location.pathname + '#' + p.toString();
  }
  function applySetupLink() {
    var p;
    try { p = new URLSearchParams(location.hash.slice(1)); } catch (e) { return false; }
    if (!['doctor', 'lenses', 'laser', 'idle'].some(function (k) { return p.has(k); })) return false;
    settings = cleanSettings({
      doctor: p.has('doctor') ? p.get('doctor') : settings.doctor,
      lenses: p.has('lenses') ? p.get('lenses').split(',') : settings.lenses,
      laser: p.has('laser') ? p.get('laser') !== '0' : settings.laser,
      idle: p.has('idle') ? p.get('idle') : settings.idle
    });
    saveSettings();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    return true;
  }

  /* ---------- patient state: memory only ---------- */
  var state = {};
  var patient = { name: '', dob: '', eye: '' };
  function resetState() {
    Object.keys(DEFAULTS).forEach(function (k) { state[k] = DEFAULTS[k]; });
    state.conditions = {};
    patient.name = ''; patient.dob = ''; patient.eye = '';
  }
  function dirty() {
    return !!(patient.name || patient.dob || patient.eye || Object.keys(state.conditions).length || Object.keys(overrides).length ||
      Object.keys(DEFAULTS).some(function (k) { return state[k] !== DEFAULTS[k]; }));
  }
  function answers() {
    var a = { conditions: state.conditions };
    Object.keys(DEFAULTS).forEach(function (k) { a[k] = state[k]; });
    return a;
  }

  /* ---------- the questions ---------- */
  var qBox = $('questions');
  function buildQuestions() {
    var o = opts(), h = '<h2 class="panel__h">What you want afterward</h2>';
    var wasOpen = qBox.querySelector('.conds') && qBox.querySelector('.conds').open;
    QUESTIONS.forEach(function (q) {
      if (!R.questionApplies(q.key, o)) { state[q.key] = DEFAULTS[q.key]; return; }
      if (q.key === 'eyes') h += '<h2 class="panel__h panel__h--sub">Your eyes</h2>';
      h += '<div class="q" data-qkey="' + q.key + '"' + (q.when ? ' hidden' : '') + '><span class="q__label" id="q-' + q.key + '">' + esc(q.label) + '</span><div class="chips" role="group" aria-labelledby="q-' + q.key + '">';
      q.values.forEach(function (v) { h += '<button type="button" class="chip" data-q="' + q.key + '" data-v="' + esc(v[0]) + '" aria-pressed="false">' + esc(v[1]) + '</button>'; });
      h += '</div></div>';
    });
    var groups = R.conditionsFor(o), shown = {};
    h += '<details class="conds"' + (wasOpen ? ' open' : '') + '><summary>Eye conditions <span class="conds__count" id="cond-count"></span></summary><p class="hint">Check any that apply to the eye having surgery.</p>';
    groups.forEach(function (g) {
      h += '<fieldset class="conds__group"><legend>' + esc(g.group) + '</legend>';
      g.items.forEach(function (it) {
        shown[it[0]] = true;
        h += '<label class="check"><input type="checkbox" value="' + esc(it[0]) + '"' + (state.conditions[it[0]] ? ' checked' : '') + '> <span>' + esc(it[1]) + '</span></label>';
      });
      h += '</fieldset>';
    });
    h += '</details>';
    // conditions no longer on the list no longer count
    Object.keys(state.conditions).forEach(function (k) { if (!shown[k]) delete state.conditions[k]; });
    qBox.innerHTML = h;
  }

  /* ---------- surgeon review: moving lenses between groups ----------
     For this patient only, in memory like the answers: { lensId: { verdict,
     note } }. The engine's verdict is kept as l.from on a moved lens, so the
     page and the printout can say where it came from. Start over clears it. */
  var GROUPS = ['good', 'possible', 'avoid'];
  var SURGEON_TAG = 'surgeon\u2019s choice';
  var review = false, overrides = {};
  function results() {
    var res = R.pick(answers(), opts());
    var lenses = res.lenses.map(function (l) {
      var ov = overrides[l.id];
      if (!ov || ov.verdict === l.verdict) return l;
      var m = {};
      Object.keys(l).forEach(function (k) { m[k] = l[k]; });
      m.from = l.verdict; m.verdict = ov.verdict; m.note = ov.note || '';
      return m;
    });
    return { lenses: lenses, notes: res.notes, groups: GROUPS.map(function (v) {
      return { verdict: v, lenses: lenses.filter(function (l) { return l.verdict === v; }) };
    }) };
  }
  // the one line shown for a lens in the not-advised list and on the printout
  function reason(l) {
    if (l.from) return l.note || 'Moved from \u201c' + HEADS[l.from][0] + '\u201d by the surgeon.';
    return l.why[0] || l.what;
  }
  function movedHtml(l) {
    if (!l.from) return '';
    return '<p class="moved">Moved from <b>' + esc(HEADS[l.from][0]) + '</b> by the surgeon.' +
      (l.note && !review ? ' ' + esc(l.note) : '') + '</p>';
  }
  function reviewHtml(l) {
    if (!review) return '';
    var h = '<div class="ov"><div class="chips chips--sm" role="group" aria-label="Group for ' + esc(l.name) + '">';
    GROUPS.forEach(function (v) {
      var on = l.verdict === v;
      h += '<button type="button" class="chip chip--sm' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" data-ov="' + l.id + '" data-ov-v="' + v + '">' + { good: 'Good fit', possible: 'Possible', avoid: 'Not advised' }[v] + '</button>';
    });
    h += '</div>';
    if (l.from) h += '<div class="ov__row"><input type="text" class="ov__note" data-ov-note="' + l.id + '" value="' + esc(l.note) + '" maxlength="120" autocomplete="off" placeholder="Reason (optional, printed)" aria-label="Reason for moving ' + esc(l.name) + '">' +
      '<button type="button" class="btn btn--quiet btn--sm" data-ov-undo="' + l.id + '">Undo</button></div>';
    return h + '</div>';
  }

  /* ---------- results ---------- */
  var out = $('results'), sum = $('summary');
  function tagsFor(l) {
    var tags = [];
    if (l.from) tags.push(SURGEON_TAG);
    if (l.tryFirst) tags.push('try with contacts first');
    if (l.toric) tags.push('toric version');
    if (l.laserAstig) tags.push('laser treats astigmatism');
    else if (l.laser) tags.push('laser-assisted');
    if (l.extra || l.toric || l.laser) tags.push('often extra cost');
    return tags;
  }
  // tags that every recommended lens (good or possible) carries, shown once
  function sharedTags(res) {
    var ls = res.groups[0].lenses.concat(res.groups[1].lenses);
    if (ls.length < 2) return [];
    return tagsFor(ls[0]).filter(function (t) { return t !== SURGEON_TAG && ls.every(function (l) { return tagsFor(l).indexOf(t) >= 0; }); });
  }
  function names(ls) { return ls.map(function (l) { return l.name; }).join(', '); }
  function tagHtml(ts) { return ts.map(function (t) { return '<span class="tag' + (t === SURGEON_TAG ? ' tag--surgeon' : '') + '">' + esc(t) + '</span>'; }).join(''); }

  function render() {
    // follow-up questions show only after the answer they follow; hidden, they
    // go back to their default so they cannot count
    QUESTIONS.forEach(function (q) {
      if (!q.when) return;
      var el = qBox.querySelector('[data-qkey="' + q.key + '"]');
      var show = R.questionApplies(q.key, opts(), state);
      if (!show) state[q.key] = DEFAULTS[q.key];
      if (el) el.hidden = !show;
    });
    qBox.querySelectorAll('[data-q]').forEach(function (b) {
      var on = state[b.getAttribute('data-q')] === b.getAttribute('data-v');
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
    });
    $('pt-eye').querySelectorAll('[data-eye]').forEach(function (b) {
      var on = patient.eye === b.getAttribute('data-eye');
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
    });
    var n = Object.keys(state.conditions).length, cc = $('cond-count');
    if (cc) cc.textContent = n ? '(' + n + ' checked)' : '(none checked)';

    var rb = $('btn-review');
    rb.classList.toggle('is-on', review); rb.setAttribute('aria-pressed', String(review));
    var res = results();
    var good = res.groups[0].lenses, maybe = res.groups[1].lenses, avoid = res.groups[2].lenses;
    sum.innerHTML = (good.length ? '<b>Good fits:</b> ' + esc(names(good)) : '<b>No lens fits everything you want.</b>') +
      ' <span class="summary__n">· Possible: ' + maybe.length + ' · Not advised: ' + avoid.length + '</span> <a href="#results" data-jump>See details</a> <a href="#" data-print>Print</a>';

    var shared = sharedTags(res), o = '';
    var moved = res.lenses.filter(function (l) { return l.from; }).length;
    if (review) o += '<div class="reviewbar"><p><b>Surgeon review.</b> Move any lens to another group for this patient, with a reason if you like. Changes are marked on the printout and cleared by Start over.</p>' +
      (moved ? '<button type="button" class="btn btn--quiet btn--sm" data-ov-clear>Undo all changes</button>' : '') + '</div>';
    if (!good.length) o += '<p class="none">No lens fits everything you want. The trade-offs below are the ones to weigh together.</p>';
    if (shared.length) o += '<p class="shared"><span>All recommended lenses:</span> ' + tagHtml(shared) + '</p>';
    res.groups.forEach(function (g) {
      if (!g.lenses.length) return;
      if (g.verdict === 'avoid') {
        o += '<div class="grp grp--avoid"><h3 class="grp__h">' + HEADS.avoid[0] + '</h3><ul class="avoid">';
        g.lenses.forEach(function (l) {
          o += '<li><a href="#lens-' + l.id + '">' + esc(l.name) + '</a>' + (l.from ? ' ' + tagHtml([SURGEON_TAG]) : '') + ': ' + esc(reason(l)) + reviewHtml(l) + '</li>';
        });
        o += '</ul></div>';
        return;
      }
      o += '<div class="grp grp--' + g.verdict + '"><h3 class="grp__h">' + HEADS[g.verdict][0] + '</h3><p class="grp__hint">' + HEADS[g.verdict][1] + '</p><div class="cards">';
      g.lenses.forEach(function (l) {
        var tags = tagsFor(l).filter(function (t) { return shared.indexOf(t) < 0; });
        o += '<div class="card"><div class="card__top"><a class="card__name" href="#lens-' + l.id + '">' + esc(l.name) + '</a>' +
          (tags.length ? '<span class="tags">' + tagHtml(tags) + '</span>' : '') + '</div>';
        o += movedHtml(l);
        o += '<p class="card__what">' + esc(l.what) + '</p>';
        if (l.why.length) o += '<ul class="why">' + l.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
        o += reviewHtml(l) + '</div>';
      });
      o += '</div></div>';
    });
    o += '<h3 class="grp__h grp__h--notes">Notes</h3><ul class="notes">' + res.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    o += '<p class="actions"><button type="button" class="btn btn--primary" data-print>Print one-page summary</button> <button type="button" class="btn btn--quiet" data-reset>Start over</button></p>';
    out.innerHTML = o;
    buildSheet(res);
  }

  /* ---------- about the lenses (only what the practice offers) ---------- */
  function buildAbout() {
    var o = opts(), h = '';
    R.LENSES.forEach(function (l) {
      if (o.lenses.indexOf(l.id) < 0) return;
      h += '<article class="lens" id="lens-' + l.id + '"><h3>' + esc(l.name) + (l.extra ? ' <span class="tag">often extra cost</span>' : '') + '</h3>' +
        (ABOUT[l.id] || [l.what]).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</article>';
    });
    h += '<article class="lens" id="lens-toric"><h3>Toric versions, for astigmatism</h3>' +
      '<p>Astigmatism means the front of the eye is curved more like a football than a basketball, which smears vision in one direction. A toric lens has astigmatism correction built in, and is turned during surgery to line up with it. Without it, an eye with significant astigmatism would need glasses for clear distance vision even after surgery.</p>' +
      '<p>Toric versions exist of most kinds of lens, and are used whenever one of those is chosen for an eye with significant astigmatism.' +
      (o.laser ? ' Small amounts, up to about 1 diopter, are often corrected instead with curved laser cuts in the cornea during laser-assisted surgery.' : '') +
      ' A toric lens can occasionally rotate in the first weeks and need a small procedure to turn it back.</p></article>';
    if (o.laser) {
      h += '<article class="lens" id="lens-laser"><h3>Laser-assisted surgery</h3>' +
        '<p>In laser-assisted cataract surgery, a femtosecond laser does some of the first steps: the round opening in the front of the lens capsule, the small incisions, and cuts that soften the cataract so less ultrasound is needed. It can also make small curved cuts in the cornea that correct a little astigmatism. The rest of the operation is the same.</p>' +
        '<p>With a toric, extended depth, multifocal or light adjustable lens, the laser is usually part of the surgery, because a precisely sized and centered opening helps these lenses sit where they should. It is not used when the pupil does not dilate well, with some corneal scars, after a trabeculectomy or tube shunt, or when lying flat and still for a few minutes is difficult; the lens is then placed with standard surgery, which works well.</p></article>';
    }
    h += '<article class="lens"><h3>Glasses afterward</h3><p>Even with the best result, most people use glasses for something: reading glasses with a monofocal lens, or glasses for fine print, night driving or long computer work with the others. The final prescription is usually checked about a month after surgery, once the eye has settled.</p></article>';
    $('about-body').innerHTML = h;
  }

  /* ---------- the one-page sheet ---------- */
  var sheetEl = $('sheet');
  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  }
  function fmtDob(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? m[2] + '/' + m[3] + '/' + m[1] : '';
  }
  function fill(label, value, cls) {
    return '<span class="' + (cls || '') + '">' + label + ' ' + (value ? '<u>' + esc(value) + '</u>' : '<i></i>') + '</span>';
  }
  function buildSheet(res) {
    res = res || results();
    var o = opts();
    var date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var box = function (on) { return '<span class="sheet__box' + (on ? ' is-on' : '') + '"></span>'; };
    var s = '';
    if (settings.doctor) s += '<div class="sheet__head">' + esc(settings.doctor) + '</div>';
    s += '<h1>Lens implant options for cataract surgery</h1>';
    s += '<p class="sheet__fill">' + fill('Name', patient.name, 'sheet__name') + fill('Date of birth', fmtDob(patient.dob)) +
      '<span>Eye ' + box(patient.eye === 'right') + ' Right ' + box(patient.eye === 'left') + ' Left ' + box(patient.eye === 'both') + ' Both</span></p>';
    s += '<h2>Answers</h2><dl class="sheet__ans">';
    QUESTIONS.forEach(function (q) {
      if (!R.questionApplies(q.key, o, state)) return;
      var v = q.values.filter(function (x) { return x[0] === state[q.key]; })[0];
      s += '<div><dt>' + esc(q.short) + '</dt><dd>' + esc(v ? v[1] : '') + '</dd></div>';
    });
    var conds = [];
    R.CONDITIONS.forEach(function (g) { g.items.forEach(function (it) { if (state.conditions[it[0]]) conds.push(it[1]); }); });
    s += '<div class="sheet__wide"><dt>Eye conditions</dt><dd>' + esc(conds.length ? conds.join('; ') : 'None checked') + '</dd></div></dl>';
    var shared = sharedTags(res);
    if (shared.length) s += '<p class="sheet__shared"><b>All recommended lenses:</b> ' + esc(shared.join(' · ')) + '</p>';
    s += '<div class="sheet__cols">';
    res.groups.forEach(function (g) {
      s += '<div><h2>' + HEADS[g.verdict][0] + '</h2>';
      if (!g.lenses.length) s += '<p class="sheet__none">None</p>';
      g.lenses.forEach(function (l) {
        var tags = g.verdict === 'avoid' ? [] : tagsFor(l).filter(function (t) { return shared.indexOf(t) < 0; });
        s += '<div class="sheet__lens"><b>' + box(false) + ' ' + esc(l.name) + '</b>' +
          (tags.length ? '<span class="sheet__tags">' + esc(tags.join(' · ')) + '</span>' : '') +
          '<p>' + esc(reason(l)) + '</p></div>';
      });
      s += '</div>';
    });
    s += '</div><h2>Notes</h2><ul class="sheet__notes">' + res.notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    s += '<div class="sheet__plan"><h2>Plan</h2>' +
      '<p>' + fill('Lens') + fill('Target') + '</p>' +
      '<p><span>Astigmatism ' + box() + ' Toric ' + (o.laser ? box() + ' Laser ' : '') + box() + ' Other ' + box() + ' None</span>' +
      (o.laser ? '<span>Laser-assisted ' + box() + ' Yes ' + box() + ' No</span>' : '') + '</p>' +
      '<p>' + fill('Surgeon', settings.doctor) + fill('Date') + '</p></div>';
    var where = /^https?:$/.test(location.protocol) ? ' (' + location.host + location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + ')' : '';
    s += '<p class="sheet__foot">Printed ' + esc(date) + ' from Lens Implant Planner' + esc(where) + ', rules of ' + esc(fmtDate(R.RULES_DATE)) + '. A starting point for a talk with the surgeon, not a decision; it cannot know the eye’s measurements.</p>';
    sheetEl.innerHTML = s;
    fitSheet();
  }
  // Fit one Letter page: measure at the printed width (7.3in) and step the
  // type down, then, if even the smallest type is too long, scale the whole
  // sheet. The limit leaves room for browsers that use their own page
  // margins and fonts (Safari on iPhone and iPad ignores @page margins and
  // its system font runs wider), so it is well under the 9.8in that Letter
  // with .6in margins would allow. Runs with every change, so the sheet is
  // ready however printing is started.
  var LIMIT = 9 * 96;
  function fitSheet() {
    sheetEl.classList.remove('is-long', 'is-tight');
    sheetEl.style.zoom = '';
    sheetEl.classList.add('is-measuring');
    if (sheetEl.offsetHeight > LIMIT) sheetEl.classList.add('is-long');
    if (sheetEl.offsetHeight > LIMIT) { sheetEl.classList.remove('is-long'); sheetEl.classList.add('is-tight'); }
    var h = sheetEl.offsetHeight;
    if (h > LIMIT) sheetEl.style.zoom = String(Math.floor(LIMIT / h * 1000) / 1000);
    sheetEl.classList.remove('is-measuring');
  }
  window.addEventListener('beforeprint', function () { buildSheet(); });
  function printSheet() { buildSheet(); window.print(); }

  /* ---------- header, toast ---------- */
  function showDoctor() {
    var d = $('doc-line');
    d.textContent = settings.doctor;
    d.hidden = !settings.doctor;
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }

  /* ---------- start over ---------- */
  function startOver(quiet) {
    resetState();
    overrides = {}; review = false;
    $('pt-name').value = '';
    $('pt-dob').value = '';
    qBox.querySelectorAll('.check input').forEach(function (c) { c.checked = false; });
    var d = qBox.querySelector('.conds'); if (d) d.open = false;
    render();
    hideIdle();
    window.scrollTo(0, 0);
    if (!quiet) toast('Cleared. Ready for the next patient.');
  }

  /* ---------- idle: clear a forgotten patient ---------- */
  var lastUse = Date.now(), idleShown = false;
  function used() { lastUse = Date.now(); if (idleShown) hideIdle(); }
  function hideIdle() { idleShown = false; $('idle').hidden = true; }
  ['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, used, { passive: true, capture: true });
  });
  setInterval(function () {
    if (!settings.idle || !dirty()) { if (idleShown) hideIdle(); return; }
    var left = settings.idle * 60000 - (Date.now() - lastUse);
    if (left <= 0) { startOver(true); toast('Cleared after a period of no use.'); return; }
    if (left <= 60000) {
      $('idle-s').textContent = String(Math.ceil(left / 1000));
      if (!idleShown) { idleShown = true; $('idle').hidden = false; }
    }
  }, 1000);
  $('idle-keep').addEventListener('click', used);

  /* ---------- settings dialog ---------- */
  var dlg = $('settings');
  function fillSettingsForm() {
    $('set-doctor').value = settings.doctor;
    $('set-laser').checked = settings.laser;
    $('set-idle').value = String(settings.idle);
    var h = '';
    R.LENSES.forEach(function (l) {
      var on = settings.lenses.indexOf(l.id) >= 0, fixed = l.id === 'distance';
      h += '<label class="check"><input type="checkbox" value="' + l.id + '"' + (on ? ' checked' : '') + (fixed ? ' disabled' : '') + '> <span>' + esc(l.name) + (fixed ? ' <small>(always offered)</small>' : '') + '</span></label>';
    });
    $('set-lenses').innerHTML = h;
    $('set-link').value = setupLink();
  }
  function readSettingsForm() {
    var lenses = [];
    $('set-lenses').querySelectorAll('input').forEach(function (c) { if (c.checked) lenses.push(c.value); });
    settings = cleanSettings({ doctor: $('set-doctor').value, lenses: lenses, laser: $('set-laser').checked, idle: $('set-idle').value });
    saveSettings();
    $('set-link').value = setupLink();
    applySettings();
  }
  function applySettings() {
    showDoctor();
    buildQuestions();
    buildAbout();
    render();
  }
  $('btn-settings').addEventListener('click', function () {
    fillSettingsForm();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  $('settings-form').addEventListener('input', readSettingsForm);
  $('settings-form').addEventListener('change', readSettingsForm);
  $('set-copy').addEventListener('click', function () {
    var inp = $('set-link');
    function done() { toast('Setup link copied.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); });
    else { inp.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
  });
  $('set-forget').addEventListener('click', function () {
    forgetSettings();
    fillSettingsForm();
    applySettings();
    toast('Settings on this device were reset.');
  });

  /* ---------- events ---------- */
  $('btn-reset').addEventListener('click', function () { startOver(false); });
  $('pt-name').addEventListener('input', function (e) { patient.name = e.target.value; buildSheet(); });
  $('pt-dob').addEventListener('input', function (e) { patient.dob = e.target.value; buildSheet(); });
  $('pt-dob').addEventListener('change', function (e) { patient.dob = e.target.value; buildSheet(); });
  $('pt-eye').addEventListener('click', function (e) {
    var b = e.target.closest('[data-eye]');
    if (!b) return;
    var v = b.getAttribute('data-eye');
    patient.eye = patient.eye === v ? '' : v;
    render();
  });
  app.addEventListener('click', function (e) {
    if (e.target.closest('[data-print]')) { e.preventDefault(); printSheet(); return; }
    if (e.target.closest('[data-reset]')) { startOver(false); return; }
    if (e.target.closest('#btn-review')) { review = !review; render(); return; }
    if (e.target.closest('[data-ov-clear]')) { overrides = {}; render(); return; }
    var un = e.target.closest('[data-ov-undo]');
    if (un) { delete overrides[un.getAttribute('data-ov-undo')]; render(); return; }
    var ov = e.target.closest('[data-ov]');
    if (ov) {
      var id = ov.getAttribute('data-ov'), v = ov.getAttribute('data-ov-v');
      var engine = R.pick(answers(), opts()).lenses.filter(function (l) { return l.id === id; })[0];
      if (engine && engine.verdict === v) delete overrides[id];
      else overrides[id] = { verdict: v, note: overrides[id] ? overrides[id].note : '' };
      render();
      // keep the focus on the button pressed, now in its new group
      var again = out.querySelector('[data-ov="' + id + '"][data-ov-v="' + v + '"]');
      if (again) again.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-jump]')) {
      e.preventDefault();
      out.scrollIntoView({ block: 'start', behavior: 'smooth' });
      out.focus({ preventScroll: true });
      return;
    }
    var b = e.target.closest('[data-q]');
    if (!b) return;
    state[b.getAttribute('data-q')] = b.getAttribute('data-v');
    render();
  });
  // typing a reason only redraws the printout, so the field keeps its focus
  out.addEventListener('input', function (e) {
    var id = e.target.getAttribute && e.target.getAttribute('data-ov-note');
    if (!id || !overrides[id]) return;
    overrides[id].note = e.target.value.replace(/\s+/g, ' ').slice(0, 120);
    buildSheet();
  });
  qBox.addEventListener('change', function (e) {
    var c = e.target;
    if (c.type !== 'checkbox') return;
    if (c.checked) state.conditions[c.value] = true; else delete state.conditions[c.value];
    render();
  });
  // a page restored from the back/forward cache starts clean
  window.addEventListener('pageshow', function (e) { if (e.persisted) startOver(true); });

  /* ---------- start ---------- */
  loadSettings();
  var fromLink = applySetupLink();
  resetState();
  // browsers may restore typed values on reload; start empty
  $('pt-name').value = ''; $('pt-dob').value = '';
  applySettings();
  document.documentElement.classList.add('is-ready');
  if (fromLink) toast('Settings applied from the setup link.');
})();

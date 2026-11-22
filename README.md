# Lens Implant Planner

An office tool for choosing a lens implant for cataract surgery, meant to be
completed with a professional: the surgeon, a technician or a surgical
coordinator goes through it with the patient, or the patient starts it on an
iPad while waiting and the team reviews it with them. It sorts every
kind of lens into **good fits**, **possible with trade-offs** and **usually
not advised**, with the reasons, and prints a **one-page summary** for the
chart, with the patient's name, the answers, the results, notes and a plan
box for the surgeon.

It is a plain static web page (HTML, CSS and JavaScript, no build step) and
runs entirely in the browser. It is live at
**[lensimplantplanner.com](https://lensimplantplanner.com)**.

Created by Jonathan Katz, MD ([jonathankatzmd.com](https://jonathankatzmd.com)),
where it began as a picker on the lens implant article.

## Privacy

The planner is used with patient information, so **nothing entered leaves
the device**:

- No server code, analytics, cookies, outside fonts or scripts, and no forms
  that submit anywhere.
- A Content-Security-Policy in `site/index.html` makes the browser block any
  network connection, outside resource or form submission from the page,
  even if someone later adds code that tries.
- Patient details (name, date of birth, eye) and answers live only in the
  page's memory. They are never written to storage, put in the address bar or
  used in the page title (which becomes the file name of a saved PDF). They
  are erased by **Start over**, by reloading the page, or by the idle timer.
- The only thing saved is the practice settings, in the browser's
  `localStorage` on that device: surgeon name, lenses offered, laser-assisted
  surgery, and the idle time.
- `tests/privacy.test.js` checks these rules on every change.

Printing is done by the browser. If someone chooses "Save as PDF" instead of
a printer, that file is saved wherever they put it, as with any document.

## Using it

- **Settings** (top right): the surgeon's name for the printout, which lenses
  the practice offers (a monofocal lens set for distance is always included),
  whether it offers laser-assisted (femtosecond) surgery, and how long the
  page may sit unused before a patient's answers are cleared (default 20
  minutes; a warning shows for the last minute).
  - Lenses that are not offered disappear from the results and the page, and
    questions and conditions that only matter to them are not asked.
  - Without laser-assisted surgery, a little astigmatism is handled with a
    toric lens, and the notes and printout do not mention the laser.
  - **Setup link**: the settings as a link, to open on each clinic iPad or
    computer so they all match. The settings sit after the `#`, which the
    browser never sends to the web server.
- **Surgeon review** (next to Print, above the results) shows controls on
  every lens to move it to Good fit, Possible or Not advised for this
  patient, with an optional reason. Moved lenses are tagged "surgeon's
  choice" and say where they came from, on screen and on the printout (the
  reason, if given, is the line printed under the lens). The controls are
  hidden until the switch is turned on, so a patient filling in the iPad does
  not see them. Turning the switch off removes every change, putting the
  planner's own results back. The changes are patient information like the
  answers: kept only in memory, and also cleared by Start over or the idle
  timer. The rules' verdicts are not changed. A lens moved out of "Usually
  not advised" does not gain the toric or laser tags the engine gives only
  to lenses it recommends.
- **Print one-page summary** (or the browser's own Print) prints only the
  summary sheet, sized to fit one Letter page. Patient fields left blank print
  as lines to fill in by hand.
- **Start over** clears everything about the patient.
- On an iPad, Share → **Add to Home Screen** opens it full screen like an app.

## Files

| Path | What it is |
| --- | --- |
| `site/index.html` | the page, with its Content-Security-Policy |
| `site/js/rules.js` | the rules engine: which lens fits which answers, the questions, the lenses and the conditions checklist. No DOM, so Node tests it |
| `site/js/app.js` | the page: questions, results, the about section (the fuller lens explanations live here), settings, idle timer and the print sheet |
| `site/css/style.css` | styles, including the print sheet (light and dark) |
| `site/icon.svg`, `site/apple-touch-icon.png`, `site/manifest.webmanifest` | icons and home-screen app settings |
| `tests/rules.test.js` | the clinical rules |
| `tests/options.test.js` | practice options (lenses offered, laser) |
| `tests/engine.test.js` | what the page relies on from the engine |
| `tests/stress.test.js` | rules that must hold for every patient, over every combination of answers and tens of thousands of random patients (fixed seed, about 8 seconds) |
| `tests/privacy.test.js` | no network, no outside resources, only settings stored |
| `.github/workflows/ci.yml` | runs the tests; on `main`, publishes `site/` to GitHub Pages |

Run the tests with `node --test 'tests/*.test.js'` (Node 18 or later). To try
the page locally, serve the `site` folder, for example
`python3 -m http.server -d site 8000`, and open http://localhost:8000.

## Hosting

The site is published by GitHub Pages at
**https://lensimplantplanner.com** (Settings → Pages → Custom domain, with
"Enforce HTTPS" on). The old address, `https://jon6fingrs.github.io/iol-picker/`,
and `www.lensimplantplanner.com` both redirect there.

- Settings → Pages → Build and deployment → Source is **GitHub Actions**:
  merging to `main` runs the tests, and the "Deploy to GitHub Pages" job
  publishes `site/` only if they pass.
- The repository is public (free GitHub Pages needs that unless the account
  has a paid plan).
- All links in the site are relative, so it works at any address. Settings
  are saved per address, so a device that used the old github.io address
  needs the surgeon name entered again (or a new setup link) at the new one.
- If the domain is ever dropped, remove it under Settings → Pages; the site
  goes back to the github.io address with no code change.

## Clinical content

The rules live in `site/js/rules.js` and follow the reasoning written out at
its top. In short:

- Monofocal lenses suit every eye. Extended depth and multifocal lenses need
  a healthy cornea, macula and optic nerve, and bring halos; mild, stable
  glaucoma still allows an extended depth lens (usually a design without
  rings).
- Monovision should be tried with contact lenses first.
- The light adjustable lens is a good fit where the result is hard to plan
  (past LASIK, PRK or RK, an irregular cornea), to match one already in the
  other eye, or for someone who wants to be free of glasses and has not
  tried monovision. Where a standard lens already gives what the patient
  wants, it is possible but more than is needed. It is silicone, so it is
  not advised with diabetes or a likely need for silicone oil, nor for an
  eye that cannot gain from fine-tuning (amblyopia, macular disease), and it
  follows its FDA labeling.
- For a second eye, the lens already in the first eye steers the choice:
  matching it is favored, and a lens that splits or stretches focus is only
  possible next to a monofocal.

Change a rule and its tests together (`tests/rules.test.js`, and the
must-hold rules in `tests/stress.test.js`), and set `RULES_DATE` in
`rules.js` to that day: the printout's footer shows it, so a chart copy says
which rules produced it. Prices are not shown; lenses that usually cost extra
are tagged. The tool is meant to be completed with a professional, as a
starting point for a conversation, not a decision, and the page and printout
say so.

## License

[Creative Commons Attribution-NonCommercial-ShareAlike 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
(CC BY-NC-SA 4.0), in `LICENSE`. In short, you may use, copy and change it if
you:

- **give credit** (keep the credit in the page footer and this README),
- **do not use it commercially** (for example, selling it or building it into
  a paid product), and
- **share your changed version under the same license**.

Practices are welcome to use it with their patients. For commercial use, ask
the author.

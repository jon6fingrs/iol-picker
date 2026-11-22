# Lens Implant Planner

A guide to choosing a lens implant for cataract surgery, for use in the
office: a technician or surgical coordinator goes through it with the
patient, or the patient fills it in on an iPad while waiting. It sorts every
kind of lens into **good fits**, **possible with trade-offs** and **usually
not advised**, with the reasons, and prints a **one-page summary** for the
chart, with the patient's name, the answers, the results, notes and a plan
box for the surgeon.

It is a plain static web page (HTML, CSS and JavaScript, no build step) and
runs entirely in the browser.

Based on the lens picker on [jonathankatzmd.com](https://jonathankatzmd.com),
by Jonathan Katz, MD.

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
  not see them; the changes stay marked when it is turned off. They are
  patient information like the answers: kept only in memory, and cleared by
  Start over or the idle timer. The engine's verdicts are not changed, so
  the shared rules stay the same on both sites. A lens moved out of "Usually
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
| `site/js/iolpicker-rules.js` | the rules engine: which lens fits which answers, the questions, lenses and conditions checklist. **Copied from jonathankatzmd.com; do not edit here** (see "Shared engine") |
| `site/js/app.js` | the page: questions, results, the about section (the fuller lens explanations live here), settings, idle timer and the print sheet |
| `site/css/style.css` | styles, including the print sheet (light and dark) |
| `site/icon.svg`, `site/apple-touch-icon.png`, `site/manifest.webmanifest` | icons and home-screen app settings |
| `tests/engine.test.js` | what this page needs from the engine (its clinical rules are tested on the website) |
| `tests/privacy.test.js` | no network, no outside resources, only settings stored |
| `.github/workflows/ci.yml` | runs the tests; on `main`, publishes `site/` to GitHub Pages |
| `.github/workflows/sync-engine.yml` | copies the engine from the website daily and republishes when the tests pass |

Run the tests with `node --test 'tests/*.test.js'` (Node 18 or later). To try
the page locally, serve the `site` folder, for example
`python3 -m http.server -d site 8000`, and open http://localhost:8000.

## Hosting on GitHub Pages

1. Make the repository public (free GitHub Pages needs a public repository
   unless the account has a paid plan).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Push or merge to `main`. When the tests pass, the "Deploy to GitHub Pages"
   job publishes the site at `https://jon6fingrs.github.io/iol-picker/`.

For a custom domain later: Settings → Pages → Custom domain, add the DNS
records GitHub shows, and tick "Enforce HTTPS". All links in the site are
relative, so it works at either address.

## Shared engine

The rules engine is maintained on jonathankatzmd.com
([jonathankatzmd-zola](https://github.com/jon6fingrs/jonathankatzmd-zola),
`static/js/iolpicker-rules.js`), which is the one source of truth. This site
uses an exact copy at `site/js/iolpicker-rules.js`:

- **To change a rule, question or lens, edit it on the website** and merge
  it there, with that repo's tests. Never edit the copy here: the next sync
  overwrites it.
- **Sync engine** (`.github/workflows/sync-engine.yml`) runs every day, or
  right away from the Actions tab → Sync engine → Run workflow. It fetches
  the file from the website's `master`. If it changed, it runs this site's
  tests on it; if they pass, it commits the copy to `main` (the commit names
  the website commit it came from) and republishes the site. If they fail,
  nothing changes, the run shows as failed, and GitHub emails you.
- The tests here check only what this page relies on (`tests/engine.test.js`)
  plus the privacy rules (`tests/privacy.test.js`, which also scans the
  engine for network calls). The clinical rules are tested on the website,
  along with the practice options this site uses
  (`tests/iolpicker-options.test.js` there).
- Differences between the two sites live in their front ends, not the
  engine. The website links each lens to its article; this site shows the
  fuller explanations in `site/js/app.js` (`ABOUT`), and a lens added on the
  website without an entry there shows its one-line summary until one is
  written.
- GitHub pauses scheduled workflows in a repository with no activity for 60
  days. If the website's rules have not changed for that long, the daily
  sync may stop; the Actions tab shows a button to turn it back on, and
  running it by hand always works.

## Clinical content

The rules follow the reasoning written out at the top of
`site/js/iolpicker-rules.js`. In short: monofocal lenses suit every eye;
extended depth and multifocal lenses need a healthy cornea, macula and optic
nerve, and bring halos; monovision should be tried with contact lenses
first; the light adjustable lens follows its FDA labeling. The tool is a
starting point for a conversation, not a decision, and the page and printout
say so. Prices are not shown; lenses that usually cost extra are tagged.

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

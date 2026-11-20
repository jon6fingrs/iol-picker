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
- **Print one-page summary** (or the browser's own Print) prints only the
  summary sheet, sized to fit one Letter page. Patient fields left blank print
  as lines to fill in by hand.
- **Start over** clears everything about the patient.
- On an iPad, Share → **Add to Home Screen** opens it full screen like an app.

## Files

| Path | What it is |
| --- | --- |
| `site/index.html` | the page, with its Content-Security-Policy |
| `site/js/rules.js` | the rules: which lens fits which answers. No DOM, so Node tests it. Lenses, their descriptions and the conditions checklist are here too |
| `site/js/app.js` | the page: questions, results, the about section, settings, idle timer and the print sheet |
| `site/css/style.css` | styles, including the print sheet (light and dark) |
| `site/icon.svg`, `site/apple-touch-icon.png`, `site/manifest.webmanifest` | icons and home-screen app settings |
| `tests/rules.test.js` | the clinical rules |
| `tests/options.test.js` | practice options (lenses offered, laser) |
| `tests/privacy.test.js` | no network, no outside resources, only settings stored |
| `.github/workflows/ci.yml` | runs the tests; on `main`, publishes `site/` to GitHub Pages |

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

## Clinical content

The rules follow the reasoning written out at the top of `site/js/rules.js`.
In short: monofocal lenses suit every eye; extended depth and multifocal
lenses need a healthy cornea, macula and optic nerve, and bring halos;
monovision should be tried with contact lenses first; the light adjustable
lens follows its FDA labeling. The tool is a starting point for a
conversation, not a decision, and the page and printout say so. Prices are
not shown; lenses that usually cost extra are tagged.

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

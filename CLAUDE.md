# Instructions for Claude Code

README.md maps the repo. Read it before changing anything.

- Plain static site in `site/`: no build step, no frameworks, no outside
  resources (the CSP in `site/index.html` blocks them anyway). All links
  relative, so it works under `/iol-picker/` and on a custom domain.
- **Patient information must never leave the device or be stored.** No
  network calls, no storage of patient fields, nothing about the patient in
  the URL or `document.title`. Only `cleanSettings()` output is saved.
  `tests/privacy.test.js` enforces this; extend it rather than loosen it.
- **Never edit `site/js/iolpicker-rules.js`.** It is a copy of the engine
  on jonathankatzmd.com (jon6fingrs/jonathankatzmd-zola,
  `static/js/iolpicker-rules.js`), kept in step by
  `.github/workflows/sync-engine.yml`. Change rules, questions or lenses
  there, with that repo's tests, then run the sync. What this page needs
  from the engine is pinned by `tests/engine.test.js`; site-specific text
  (the lens explanations) lives in `site/js/app.js`.
- Run `node --test 'tests/*.test.js'` before pushing. For UI changes, check
  390px and desktop widths (no horizontal scroll) and print a PDF of the
  summary to confirm it still fits one Letter page.
- Work on a branch and open a PR; CI runs the tests. Merging to `main`
  deploys to GitHub Pages only if the tests pass.
- Never commit secrets or patient data, including in test fixtures or
  screenshots.

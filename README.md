# Sam's Training Week

A weekly training routine you can actually use mid-set: one page, no
accounts, no network needed once installed.

**Live app:** https://otto-40.github.io/Fitness/

## Using it

Three tabs:

- **This Week** — the routine. Tap an exercise to log a set; tap its weight
  chip to record what you lifted, set by set. Days collapse once complete.
  Rest days complete themselves when their date arrives.
- **Progress** — body weight and body fat, plus a chart per lift. The
  measure toggle switches between estimated 1RM (moves with load *or* reps),
  top set, and volume.
- **History** — a calendar of training days and a week-by-week log. Tap a
  past day to correct it; tap a week to see what you lifted.

The week's ticks reset every Monday. Weights, reps, notes and history never
reset.

**Edit program** in the footer changes exercises, sets and rep targets.
Exercise IDs are permanent, so renaming a lift keeps its history.

## Backing up

Everything is stored in this browser on this device — there is no server and
no sync. **Backup** in the footer offers two ways out: **Save file** writes a
dated `.json` to Files/Downloads, and **Copy** gives you the same thing as
text for notes or email. To recover, or to move to a new phone, **Load file**
(or paste the text) and tap **Restore** twice. The app nags if the last
backup is over a month old.

If a write to this device ever fails, the app says so in red under the
footer rather than pretending the set was logged — back up before closing it.

## Installing on a phone

Open the live app in Safari (iOS) or Chrome (Android) → Share → *Add to Home
Screen*. It installs as **Longevity**, runs full-screen and works offline.

iOS captures the icon and name when you install, so after either changes you
need to delete the tile and add it again. Logged data is unaffected — it
belongs to the site, not the tile.

## Development

Plain HTML, CSS and JavaScript in a single `index.html` — no build step and
no runtime dependencies. Fonts are embedded as data URIs so the page renders
identically offline.

```bash
npm install     # playwright-core, for the tests only
npm test        # drives the real page in Chromium
```

`npm test` runs two suites:

- `tests/logic.test.js` — the pure date and metric helpers on their own
  (ISO week 53, year boundaries, Epley, gridline steps), through the
  `window.__logic` hook at the bottom of the script.
- `tests/app.test.js` — the app end to end: logging, weights, per-set entry,
  the history calendar, backup and restore, the program editor.

CI runs both on **every push and every pull request**, and deploys only from
`claude/workout-routine-ui-gmzbvt`, only if they pass
(`.github/workflows/pages.yml`).

Other files: `sw.js` (offline cache — bump `CACHE` when assets change),
`manifest.webmanifest` and `icons/` (home-screen install), and
`scripts/make-maskable-icon.js`, a one-off that regenerates
`icons/icon-maskable-512.png` (the padded icon Android crops to a circle)
when the source badge changes.

The theme is an explicit `data-theme` attribute stamped by a small script in
`<head>` before first paint, so the stylesheet carries exactly one palette
per theme instead of a media query plus overrides that drift apart.

### Data model

Two `localStorage` keys:

- `sams-training-week` — the current week only: which sets are ticked. Wiped
  every Monday.
- `sams-training-weights` — everything durable: per-set weights and reps by
  exercise and week, body-weight log, day-level training history, game
  effort ratings, notes, rest lengths, preferences and any program edits.

History is kept for five years a lift (260 weeks) and ~5 years of daily
weigh-ins; past that the oldest entry drops off.

A week counts as complete when every day the program puts exercises on has
been logged — Sunday stays a bonus. Empty a day in the editor and it stops
being required, so the streak follows the program you're actually running.

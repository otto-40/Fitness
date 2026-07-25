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
no sync. **Backup** in the footer produces a block of text: keep a copy
somewhere safe. Pasting it back under **Restore** rebuilds everything, which
is also how you move to a new phone. The app nags if the last backup is over
a month old.

## Installing on a phone

Open the live app in Safari (iOS) or Chrome (Android) → Share → *Add to Home
Screen*. It then runs full-screen and works offline.

## Development

Plain HTML, CSS and JavaScript in a single `index.html` — no build step and
no runtime dependencies. Fonts are embedded as data URIs so the page renders
identically offline.

```bash
npm install     # playwright-core, for the tests only
npm test        # drives the real page in Chromium
```

`npm test` runs the suite in `tests/app.test.js`, which exercises the app
end to end — logging, weights, per-set entry, the history calendar, backup
and restore, the program editor. CI runs it on every push and **only deploys
if it passes** (`.github/workflows/pages.yml`).

Other files: `sw.js` (offline cache — bump `CACHE` when assets change),
`manifest.webmanifest` and `icons/` (home-screen install).

### Data model

Two `localStorage` keys:

- `sams-training-week` — the current week only: which sets are ticked. Wiped
  every Monday.
- `sams-training-weights` — everything durable: per-set weights and reps by
  exercise and week, body-weight log, day-level training history, game
  effort ratings, notes, rest lengths, preferences and any program edits.

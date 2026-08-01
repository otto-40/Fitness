# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

A single-page, offline-first PWA holding one person's weekly training routine:
tick sets as you do them, log the load and reps for each set, and see week-on-week
progress. Installed on a phone it is branded **Longevity**; the page itself is
titled *Sam's Training Week*.

Live at https://otto-40.github.io/Fitness/ (GitHub Pages).

Read `README.md` first — it is the user-facing explanation of every feature and
is kept accurate. This file covers the parts a contributor needs that the README
does not.

## Hard constraints

These are not preferences; breaking any of them breaks the app.

- **No build step, no bundler, no framework, no runtime dependencies.** The
  deployed site is the repo, served as static files. `playwright-core` is a
  devDependency used only by the tests.
- **The whole app is `index.html`** — markup, CSS and JavaScript in one file
  (~3000 lines). Do not split it into modules or extract assets.
- **No external network references at runtime.** Fonts (Oswald 600, IBM Plex
  Mono 500) are embedded as base64 `data:` URIs inside `<style>` precisely so
  the page renders identically offline and under a strict CSP. Never replace
  them with a CDN or `<link>` to Google Fonts.
- **No server, no accounts, no sync.** All state is `localStorage` on one
  device. Backup/restore is a copy-pasteable JSON blob and is the only way data
  moves between devices.
- **Exercise ids are permanent.** Weight history is keyed off them. Never reuse,
  renumber, or rewrite an id — renaming a lift must keep its history.

## Layout

```
index.html              the entire app
sw.js                   service worker (offline cache) — bump CACHE on asset change
manifest.webmanifest    install identity: name/short_name "Longevity"
icons/                  icon-180 (iOS apple-touch), icon-192, icon-512
tests/app.test.js       the whole end-to-end suite (~175 checks)
tests/browser.js        resolves a Chromium binary for the run
.github/workflows/pages.yml  test → deploy to Pages
```

### Inside `index.html`

Section banner comments are the navigation aid; grep for them rather than
scrolling. CSS uses `/* ---------- name ---------- */`, JS uses `/* ---- name ---- */`.

| Lines (approx) | Contents |
| --- | --- |
| 1–13 | `<head>`: meta, theme-color per scheme, manifest, apple meta |
| 14–996 | `<style>`: embedded fonts, theme tokens, then one banner per UI area |
| 998–1215 | markup: masthead, tabs + day nav, seven static `.day` sections, modals (program editor, rest bar, backup, celebration) |
| 1216–3014 | `<script>`: one IIFE, no globals |

The seven `.day` sections are static markup. Exercise rows inside them are
rendered from data by `renderProgram()` into each day's `.rows` container.
`d-tue` and `d-fri` are rest days with no rows — hence `DAY_IDS` lists only the
five days that can carry exercises.

Script sections, in file order: stores and migrations → week/day arithmetic →
entry helpers → metrics → the program data → row rendering → weight chips and
the per-set entry panel → Progress tab charts → History tab calendar → week
celebration → row tap handling → rest timer → preferences → program editor →
game effort → arm-then-confirm helper → backup/restore → day check-off → tabs →
service-worker registration.

## Data model

Two `localStorage` keys. Everything durable lives in the second one; the first
is wiped every Monday.

### `sams-training-week` — the live week only

```js
{ week: "2026-W31",           // ISO week id from weekId(); a mismatch triggers the reset
  sets: { "mon-1": 2, ... },  // exercise id -> sets ticked this week
  celebrated: false }         // week-complete card already shown
```

### `sams-training-weights` — everything durable

```js
{
  wt: { "mon-1": [ { ew, w, s: [ {w, r}, ... ] } ] },  // per exercise, ≤30 entries, one per week
  variants: { "mon-1": 0|1 },     // which side of an "A or B" row is active
  bw:       [ { dn, w, bf } ],    // body weight / body fat log
  daysDone: { "20657": 1|2 },     // dn -> 1 logged, 2 assumed by backfill
  weeksDone:[ ew ],               // legacy; only ever read by the one-time backfill
  game:     [ { ew, e: 0|1|2 } ], // game-night effort, one per week
  prSeen:   { "mon-1:2957": 1 },  // PR confetti fired once; pruned after ~8 weeks
  rest:     { "mon-1": 180 },     // per-exercise rest override, seconds
  notes:    { "mon-1": "seat 4" },
  prefs:    { rest, restSecs, wake, metric },  // metric: 'e1rm' | 'top' | 'vol'
  program:  { ... },              // present only once the user edits the program
  lastBackup: dn, unit: 'kg',
  perSet: 1, backfilled: 1        // migration flags
}
```

Key facts:

- **`dn`** is days since the Unix epoch at UTC midnight (`todayDn()`).
  **`ew`** is a Monday-based week number, `Math.floor((dn + 3) / 7)`, so "weeks
  ago" is plain subtraction. `weekId()` is a separate ISO-week *string* used
  only to detect the Monday reset.
- **Variant keys**: a row with two variants stores under `id` and `id~1`
  (`keyFor(row)`), so each variant keeps its own history.
- **An entry is defined by its loads.** `writeSets()` drops the entry entirely
  when no set has a weight — reps arrive pre-filled and must not keep an empty
  session alive.
- **Migrations live in `migrateW()`**, which runs on load and again after a
  restore. Any new field must get a default there; one-time data rewrites are
  guarded by a flag (`perSet`, `backfilled`) and never re-run.
- Every `localStorage` read and write is wrapped in `try/catch` — Safari private
  mode throws.

### Week completion

`REQ = [0, 2, 3, 5]` — day offsets from Monday for the four sessions a week is
judged on (Mon lift, Wed game, Thu lift, Sat lift). Sunday is optional and is a
bonus, never a gate. `daysDone` is the single source of truth for completion and
streaks, so retroactive calendar edits and the live week feed the same reads.

## Conventions

- **JavaScript in `index.html` is ES5 by hand**: `var`, `function` declarations,
  `Array.prototype.slice.call(...)` over spread, string concatenation over
  template literals, no arrow functions, no `class`. Match it. (Files under
  `tests/` are Node and use modern syntax freely.)
- **HTML is built by string concatenation**, always through `esc()` for any
  user-supplied text (exercise names, notes). Never interpolate raw.
- **No `confirm()` / `alert()`.** Destructive actions use the two-tap
  arm-then-confirm pattern (`armButton()`, `armDayCheck()`) — modal dialogs can
  be silently suppressed in installed PWAs. Tests assert the armed label text.
- **Theming is three-way** and every token must be set in all three places:
  the `:root` light defaults, `@media (prefers-color-scheme: dark)`, and the
  `:root[data-theme="dark"|"light"]` overrides that must beat the media query.
  Colour semantics as of the latest commits: green = completed, muted brick red
  = caution/confirm, blue = charts and game night. Orange was removed
  deliberately — do not reintroduce it.
- **Chart colours are contrast-validated per surface** (`#2F6DB5` on white,
  `#4E93D9` on the dark panel). Re-check contrast if you change them.
- **Comments explain why, not what.** The existing ones carry real reasoning
  (iOS constraints, tendon pacing, why a deadline beats a tick counter). Keep
  that register; don't add narration.
- **Commit messages**: a short imperative subject, then wrapped prose paragraphs
  explaining the reasoning and the trade-offs. No Conventional Commits prefixes.

## Development workflow

```bash
npm install   # playwright-core only
npm test      # drives the real page in headless Chromium
```

`npm test` runs `tests/app.test.js` directly with Node — there is no test
framework. It opens `file://…/index.html` in Chromium, one fresh context per
case (own clock, own `localStorage`), and asserts with a hand-rolled `check()`.
It also fails on any console error or page error, so a thrown exception anywhere
fails the run.

Notes when touching tests:

- **The app is date-sensitive** (today's card, rest days completing by date, the
  Monday reset), so cases pin the clock with `page.clock.install`. Pick a date
  deliberately; `2026-07-23` (a Thursday) is the usual one.
- `seedHelpers` recomputes `dn`/`ew`/`monday` inside the page the same way the
  app does, so seeded fixtures line up with the pinned clock.
- `checkInstallIdentity()` reads files off disk rather than the page: manifest
  `name`/`short_name`, the `apple-mobile-web-app-title` meta and the icon files
  must agree, since a mismatch is invisible from the running page.
- Under `file://` no service worker registers, which is intentional — `sw.js` is
  effectively untested and must stay simple.
- Chromium resolution order is `CHROME_PATH`, then `PLAYWRIGHT_BROWSERS_PATH`
  (defaults to `/opt/pw-browsers`), then whatever playwright-core finds. In this
  environment the pre-installed browser is picked up automatically — do not run
  `playwright install`.

Add a test for any behaviour change. The suite is the only safety net; there is
no type checker, linter, or formatter in this repo.

### Deploying

`.github/workflows/pages.yml` runs the suite on every push to
`claude/workout-routine-ui-gmzbvt` (the repo's live branch) and **deploys to
Pages only if it passes**. Feature work happens on its own branch and is pushed
there; nothing else deploys.

### After changing assets

Bump `CACHE` in `sw.js` (currently `training-week-v4`) whenever `index.html`,
the manifest or the icons change, or installed devices keep serving the old
cached copy. The page itself is fetched network-first, so it self-heals; static
assets are cache-first and do not.

Changing the install name or icon also requires the user to delete and re-add
the home-screen tile on iOS, which captures both at install time. Logged data
survives — it belongs to the origin, not the tile.

## Gotchas

- `exName()` strips the coaching line and any note out of `.ex` before reading
  the exercise name. Anything else you render inside `.ex` will leak into the
  rest bar and chart titles.
- The rest timer counts down from a wall-clock deadline, not a tick counter, so
  backgrounding the app and returning shows the true remaining time. Keep that
  shape. It is visual-only on purpose: iOS gives a backgrounded web page no
  reliable way to sound or vibrate.
- Exercise rows are `div[role=button]`, so Enter/Space are wired by hand.
- The program editor mutates a deep-copied `draft` and commits on Save, then
  calls `location.reload()` so every listener rebinds against the new rows.
- Restoring a backup calls `migrateW()` and then `syncToday()`, which applies
  the Monday reset if the backup came from an older week.
- Day chips scroll via JS; a real `#anchor` navigation would reload the page in
  a standalone PWA and lose the tab state.

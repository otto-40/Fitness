# Sam's Training Week

A weekly training routine you can actually use mid-set: one page, no
accounts, no network needed once installed.

**Live app:** https://otto-40.github.io/Fitness/

## Using it

Three tabs:

- **This Week** — the routine. Tap an exercise to log a set; tap its weight
  chip to record what you lifted, set by set. Days collapse once complete.
  Rest days complete themselves when their date arrives. The band at the top
  says which week the cards below belong to.
- **Progress** — body weight and body fat, plus a chart per lift. The
  measure toggle switches between estimated 1RM (moves with load *or* reps),
  top set, and volume. Each point is coloured by how that week's sets felt,
  so a flat line whose dots are turning green is a plateau you can push out
  of, and one that stays red is one to back off from.
- **History** — a calendar of training days and a week-by-week log. Tap a
  past day to correct it; tap a week to see what you lifted.

## Effort

Every set takes an **E / M / H** rating — easy, moderate, hard — beside its
weight and reps. It is optional, and one tap; tapping the lit letter takes it
back. Load and reps say what you did, effort says what it cost, and the two
together are what tell a week you should add weight apart from a week you
should hold it.

Once a session is rated the app says so in one line under the sets: every set
easy is 2.5 kg you are leaving behind, every set a grind is a week to repeat,
and the same load three sessions running is a plateau named out loud with a
way out of it. Last week's rating rides on the weight chip as a coloured dot,
so you can see what you are walking into before you open anything.

Rate every loaded set of a session or the advice stays quiet — a half-rated
session says nothing rather than something misleading. Sets logged before
this existed simply have no rating, and nothing about them changes.

## How weeks flow

There is nothing to reset. A week runs until every required session is
ticked off; finish the last one, take the celebration, and the app hands you
a clean set of cards there and then — the next week starts that day. A week
nobody finishes gives way on its own seven days after it started.

Each session is logged against the day you actually did it, not the day the
card is named after: catch Monday's lift up on Wednesday and Wednesday is
what the calendar shows. Weights, reps, notes and history are never cleared.

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

`npm test` runs the suite in `tests/app.test.js`, which exercises the app
end to end — logging, weights, per-set entry, the history calendar, backup
and restore, the program editor. CI runs it on every push and **only deploys
if it passes** (`.github/workflows/pages.yml`).

Other files: `sw.js` (offline cache — bump `CACHE` when assets change),
`manifest.webmanifest` and `icons/` (home-screen install).

### Data model

Two `localStorage` keys:

- `sams-training-week` — the week in progress only: which sets are ticked.
  Replaced when the week rolls over.
- `sams-training-weights` — everything durable: per-set weights, reps and
  effort by exercise and week, body-weight log, day-level training history,
  game effort ratings, notes, rest lengths, preferences and any program
  edits.

Weeks are numbered rather than pinned to the calendar. `weeks` maps a week
number to the date it started and the date each session in it was finished;
`weekNo` is the one running now. The numbering carries on from the Monday-
based week count the app used before, so older weights and ratings still
sort and subtract the way they did.

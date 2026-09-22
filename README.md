# Sam's Training Week

A weekly training routine you can actually use mid-set: one page, no
accounts, no network needed once installed.

**Live app:** https://otto-40.github.io/Fitness/

> **IronLog**, a separate full strength-training tracker (React + TypeScript + Vite),
> lives in [`ironlog/`](ironlog/README.md). Run it with `cd ironlog && npm install && npm run dev`.

## Using it

Three tabs:

- **This Week** — the routine. Each line is one lift: its name, then what it
  asks for, how much of it you have done, and the weight to beat. Tap an
  exercise to open it. Everything for that lift is inside, starting with why
  it is in the program: a row per set with a **done** button, and next to it
  the weight, reps and effort for that set. Tick a set as you finish it, or
  rate how it felt and it ticks itself. Nothing else logs a set, so none can
  be started or scrapped by a stray tap, and sets can be ticked in any order
  or taken back by tapping the tick again. Lifts that carry no weight get the
  same ticks without the load fields. Days collapse once complete, and rest
  days complete themselves when their date arrives. The band at the top says
  which week the cards below belong to.
- **Progress** — opens with **what to work on next**: the lifts that need a
  decision this week, each with the one instruction for it — stalled, hold,
  add load, rate it, or cold. Tap a line to drop to that lift's chart, which
  is the evidence for it. A verdict that covers three or more lifts collapses
  to a single line naming them, so a week where everything was a grind reads
  as one sentence rather than six copies of it. Every line comes from
  sessions already logged; nothing is predicted, and a lift with nothing to
  say is left out. Below it: body weight and body fat, plus a chart per lift.
  The measure toggle switches between estimated 1RM (moves with load *or*
  reps), top set, and volume. Each point is coloured by how that week's sets
  felt, so a flat line whose dots are turning green is a plateau you can push
  out of, and one that stays red is one to back off from.
- **History** — a calendar of training days and a week-by-week log. Tap a
  past day to correct it; tap a week to see what you lifted.

## Effort

Every set takes an **Easy / Moderate / Hard** rating below its
weight and reps. It is optional, and one tap; tapping the selected rating takes it
back. Load and reps say what you did, effort says what it cost, and the two
together are what tell a week you should add weight apart from a week you
should hold it.

Rating a set is the last thing you do to it, so the rating completes it:
one tap logs the set and starts the rest timer, exactly as ticking it does.
Clearing a rating clears only the rating — the set stays logged, and the
done button is still the way to take one back.

Once a session is rated the app says so in one line under the sets: every set
easy is 2.5 kg you are leaving behind, every set a grind is a week to repeat,
and the same load three sessions running is a plateau named out loud with a
way out of it — backing off about a tenth of the load, rounded to that
exercise's own step, rather than a flat amount that would be a trim on a trap
bar and a quarter of an overhead press. Last week's rating rides on the weight chip as a coloured dot,
so you can see what you are walking into before you open anything.

Rate every loaded set of a session or the advice stays quiet — a half-rated
session says nothing rather than something misleading. Sets logged before
this existed simply have no rating, and nothing about them changes.

## Aerobic minutes

Walks and game night log how long they took rather than what they carried.
Open one and the minutes field is already filled with the prescribed
duration, so the normal case is still one tap; change it with **−5 / +5** or
by typing when the session ran long or short. The tick is what logs it —
editing the field on its own records nothing, and taking the tick back
removes those minutes from the week again.

The week band under the tabs carries the running total beside the session
count (`95/150 min`), and **Progress** has an *Aerobic* card with the week
against the target and a chart of completed weeks. 150 min/week of
moderate-intensity activity is the WHO and AHA adult guideline. Vigorous
work such as game night counts double toward that guideline; this total does
not do that for you, so a week built mostly of basketball is worth more than
the number suggests.

Which exercises count, and their prescribed minutes, are set per exercise
under **Edit program** — the *aerobic* checkbox and the *Minutes* box. The
walks and game night start switched on; a program edited before this existed
has the defaults carried onto whichever of those exercises it still holds.

## How weeks flow

Weights and reps save as you edit. **Done editing** closes the panel; it does
not complete the sets.

Weight and reps both open on what you lifted last time, and only fall back to
the prescription when there is no last time — so ticking a session off without
editing records what you actually did, not the target you were chasing. The
target stays on the card as the prescription.

The **− / +** buttons and the weight field above the sets plan the sets you
have not done yet: they level or shift those, and leave a set you have already
ticked alone. A logged set is corrected in its own field, or by un-ticking it.
Once every set is logged they have nothing left to plan and switch off. Sets
ticked off from the day circle carry no load yet, so those they can still fill
in. Tick the numbered done button or choose an effort to
complete each set. Progress charts, lift history and personal records use
completed sets only; suggestions for next time wait until the exercise is
complete. The next unfinished set is highlighted with larger controls.

**− set** removes the last row for this session, with **Undo removal** keeping
its weight, reps, effort and completion flag. Undo survives closing the panel
or reloading during that training week, and preserves edits to other rows.
Added or removed sets update the session's progress count without changing
the program. Active rest timers also survive reloads, including their set
context; skipping a timer keeps it dismissed.

Lift, body and basketball records are retained without the old 30/400/60-entry
limits. Lift charts display the latest 52 entries. Existing historical records
remain available; on upgrade, the current week's existing ticks determine
which sets were completed. Records already removed by older versions cannot
be recovered without an older backup.

There is nothing to reset. A week runs until every required session is
ticked off; finish the last one, take the celebration, and the app hands you
a clean set of cards there and then — the next week starts that day. A week
nobody finishes gives way on its own seven days after it started.

The required sessions are Monday, Wednesday, Thursday and Saturday. Sunday's
walk is a bonus card, drawn with a dashed edge: it counts when you do it, but
it never holds a week open.

Each session is logged against the day you actually did it, not the day the
card is named after: catch Monday's lift up on Wednesday and Wednesday is
what the calendar shows. Weights, reps, notes and history are never cleared.

**Edit program** in the footer changes exercises, sets and rep targets.
Exercise IDs are permanent, so renaming a lift keeps its history.
**Step (kg)** sets each exercise’s weight-button and progression increment;
existing exercises default to 2.5 kg. Hard sessions recommend holding the
load, including when you open the lift the following week.

## Backing up

Everything is stored in this browser on this device — there is no server and
no sync. **Backup** offers **Download backup** and **Copy text**. Keep the file
or copied text somewhere safe outside this device. After downloading, check
the file is saved and tap **I’ve saved my backup**. A successful copy updates
the reminder; a failed copy leaves the backup date unchanged. The app reminds
you when the last backup is over a month old.

To recover or move phones, choose **Import file** or paste saved text, then
tap **Restore** twice. Importing only stages the file; it never replaces your
records until you confirm Restore. Backup, program editing and celebration
dialogs keep keyboard focus inside and return it when closed.

Restore checks and migrates a pasted backup in memory before saving it.
If a write fails, the dialog stays open and the previous data is restored.
If storage also prevents recovery, the dialog says so and directs you to
back up the original data still open in the app before reloading. If a save ever fails — a full device, private
browsing — the footer says so instead of letting a logged set look safe. And
if the stored data is ever unreadable, the app starts empty rather than
refusing to start, keeping the exact unreadable copy aside so a backup can be pasted
back in. If that recovery copy cannot be saved, the original history stays
untouched on disk.

## Installing on a phone

Open the live app in Safari (iOS) or Chrome (Android) → Share → *Add to Home
Screen*. It installs as **Longevity**, runs full-screen and works offline.

iOS captures the icon and name when you install, so after either changes you
need to delete the tile and add it again. Logged data is unaffected — it
belongs to the site, not the tile.

## Look and feel

One palette, two themes, declared as custom properties at the top of the
stylesheet. Nothing below that block picks a colour of its own.

The neutrals are true greys, so indigo is the only hue on screen that is not
reporting a state. Each token says what it is *for*, so no colour carries two
meanings:

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--accent` | `#4338CA` | `#9A94FF` | the one thing you can act on — the next set, a logged weight, the lit tab |
| `--ok` | `#137537` | `#43BF78` | logged, complete, cleared to add load |
| `--attn` | `#A34A06` | `#F0A64A` | hold, back off, a week that needs a decision |
| `--danger` | `#B91C1C` | `#F4817B` | destructive, and only destructive — an armed tick, nothing else |
| `--text` / `--text-muted` | `#18181B` / `#52525B` | `#F4F4F5` / `#A6A6B0` | body and secondary text |
| `--edge` | `#85858F` | `#6E6E7A` | the border of anything you type into |
| `--bg` / `--surface` / `--surface-sunk` | `#F4F4F5` / `#FFFFFF` / `#F0F0F3` | `#0E0E11` / `#18181C` / `#131316` | page, cards, a panel inside a card |

Every pairing clears WCAG AA: text at 4.5:1 or better on every surface it
sits on, and input edges and chart marks at 3:1 or better, in both themes.
Game nights on the calendar are ink rather than accent, because accent means
"tap this".

Colour never carries a meaning on its own. Effort is a shape as well as a
hue — circle easy, diamond moderate, triangle hard — on the chart, in the
legend, on the weight chip and on the chosen rating button. On the chip the
shape sits in a round corner badge, so a "hard" triangle can't be mistaken
for a trend arrow. The weight chip's three states differ by border as well
as colour: logged (accent, heavy), last week's target (neutral, solid),
nothing yet (dashed "+"). A finished lift is struck through, a complete week
carries a tick, a game night carries a corner notch, and the warning banners
carry an icon and a rule.

Type is two faces: Oswald for headings and day names, and the system face
for everything else. Tabular figures are on for the whole page, so weights,
reps and the rest timer never shift width as they change.

Sizes come from the same block: `--t-*` for type, `--s1`–`--s7` for a 4px
spacing scale, `--r-*` for radii, and `--tap: 44px` as the floor for
anything you tap. `--motion` and `--motion-fast` are set to `0s` under
`prefers-reduced-motion`, which switches off every transition at once.

Dark is declared once and applied both to `prefers-color-scheme: dark` and
to an explicit `data-theme="dark"`; the media query steps aside for
`data-theme="light"`, so there is no third copy to drift out of step.

## Development

Plain HTML, CSS and JavaScript in a single `index.html` — no build step and
no runtime dependencies. The heading font is embedded as a data URI so the
page renders identically offline.

```bash
npm install     # playwright-core, for the tests only
npm test        # drives the real page in Chromium
```

`npm test` first checks HTTP and cache failures in `tests/sw.test.js`, then
runs the suite in `tests/app.test.js`, which exercises the app
end to end — logging, weights, per-set entry, the history calendar, backup
and restore, the program editor. CI runs it on pull requests and pushes to the app branch. It **only deploys
that branch if tests pass** (`.github/workflows/pages.yml`); pull requests
never deploy.

Other files: `sw.js` (offline cache — bump `CACHE` when assets change),
`manifest.webmanifest` and `icons/` (home-screen install).

### Data model

Two `localStorage` keys:

- `sams-training-week` — the week in progress only: which sets are ticked,
  one flag per set. Replaced when the week rolls over. (Weeks written before
  sets were tracked individually hold a plain count; that still reads back.)
- `sams-training-weights` — everything durable: per-set weights, reps and
  effort by exercise and week, body-weight log, day-level training history,
  game effort ratings, logged aerobic minutes (`cardio`, one record per
  exercise per week), notes, rest lengths, preferences and any program
  edits.

Weeks are numbered rather than pinned to the calendar. `weeks` maps a week
number to the date it started and the date each session in it was finished;
`weekNo` is the one running now. The numbering carries on from the Monday-
based week count the app used before, so older weights and ratings still
sort and subtract the way they did.

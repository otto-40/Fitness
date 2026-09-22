# Improvements log

One small, verified improvement per maintenance run. Newest entry last.

## 2026-09-22 — clearing a week's finishing day on the calendar now uncounts it

- **Branch:** `claude/fitness-app-maintenance-a0hhwi` (the session's designated
  push branch; developed locally as `improve/calendar-boundary-day-clear`)
- **Health check before the change:** `npm test` passed 588/588. The project has
  no lint or build step (a single static `index.html`).
- **What changed and why:** a finished week hands its last day to the next week
  as that week's start, so the date belongs to two week records. `editSession`
  looked the date up with `weekOfDn`, which returns the *later* week. Clearing
  that day on the History calendar removed the square but left the session
  stamped in the week that was really finished on it. That week kept reading
  4/4 and the streak did not drop. The roll-ups and the square disagreed, and
  the calendar correction silently did nothing. Clearing a day now removes its
  stamp from every week record that holds it. Adding a day is unchanged.
- **Verification:** new test *clearing the day a week was finished on uncounts
  that session* failed on the old code (still 4/4, streak 2 wk, stamp still
  stored) and passes with the fix. Full suite: 594/594.
- **Left unfinished:** adding a day on a boundary date still credits the later
  week (see Backlog).

## 2026-09-22 — saving the program editor no longer switches off aerobic tracking

- **Branch:** `claude/app-assessment-improvements-qve499`
- **Health check before the change:** `npm test` passed 594/594.
- **What changed and why:**
  - *Editor Save stripped the aerobic flag and minutes.* Save rebuilt each
    exercise from an allow-list that left out `cardio` and `mins`. So one
    save, even with nothing changed, left every walk and game night
    non-aerobic. The band's `min` total disappeared, the Progress *Aerobic*
    card went, and minutes already logged stopped counting. The one-time seed
    had already run, so nothing brought them back. Save now keeps both fields,
    and writes `cardio: false` when the box is unticked. The seed runs once
    more (`cardioSeeded: 2`) to repair programs already stripped. A walk that
    was deliberately unticked before this fix is switched back on; before the
    fix that choice was lost on every save anyway.
  - *The day circle logged no minutes.* Completing a walk or game day with
    its circle ticked the session but left the aerobic total at 0. Undoing it
    left any minutes in place. The circle now logs and clears the minutes the
    way the panel's Done button does: the minutes already logged, otherwise
    the prescribed ones.
- **Verification:** three new tests fail on the old code and pass with the
  fix: editor save keeps the flags and minutes, a stripped program is
  repaired, and the circle logs and clears minutes. Full suite: 604/604.

## Backlog

- **Boundary-day add goes to the later week.** Marking a past boundary date as
  trained on the calendar credits the week that *started* that day, never the
  one that ended on it. It should probably credit whichever of the two is
  missing a session. This is a product decision, so confirm it before changing.
- **Body-weight log accepts implausible values.** *Log today* stores any
  positive weight and any positive body fat, including over 100 %. One typo
  then skews the chart and trend until it is found. Needs sensible bounds and
  a visible rejection.
- **Zero reps count as a logged set.** A set ticked with reps `0` is stored as
  `r: 0`. It then counts toward volume and completion like a real set. Decide
  whether 0 should mean "no reps entered".
- **No lint/syntax check in CI.** Only the browser suite guards `index.html`. A
  cheap `node --check` on the extracted script would fail fast on a syntax slip.
- **Rest timer is matched to its exercise by display name.** Changing the rest
  length retimes a running countdown only when `restName === exName(row)`.
  Two exercises with the same name, such as the incline walks, can therefore
  retime each other's timer. Matching on exercise id would be exact.
- **Rest and variants can't be edited in the program editor.** Rest can only
  be set per session in the panel. An exercise added in the editor has no
  prescribed rest, so it gets the generic 2:30.

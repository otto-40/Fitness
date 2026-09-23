# IronLog

A local-first strength training tracker built with React, TypeScript, Vite and Tailwind CSS.
It needs no accounts, no API keys, no environment variables and no network connection.
Everything, including a workout you are halfway through, is saved in your browser's `localStorage`.

**Live app:** https://otto-40.github.io/Fitness/ironlog/. The repo's Pages workflow builds `ironlog/` and publishes the output there on every deploy.
Data is stored per browser, so the live site and `localhost` keep separate logs.

[`audit-report.md`](audit-report.md) records the final audit: what was tested, what was fixed and the known limitations.

## Design

The interface uses **Forge**, a design system built for IronLog from a study of real fitness products on Mobbin.
[`design-research.md`](design-research.md) lists the products and flows examined, the patterns adopted and rejected, the full token set (colour, type, spacing, radii, shadows, motion, charts, forms, accessibility) and the page-by-page redesign plan.
In short:

- Dark "Forge" and light "Chalk" themes with a single ember accent. Green only marks completed sets, and amber only marks warm-ups.
- Condensed "stamped" numerals (Barlow Condensed) for the numbers you care about. Inter for everything else.
- A plate-ring, segment-bar and sparkline vocabulary instead of stock photos or body maps.
- Large tap targets (52px set cells, 56px primary buttons), a floating tab bar with a mini-player for the running workout, and subtle motion that respects reduced-motion settings.

## Setup

Requires Node.js 20 or newer.

```bash
cd ironlog
npm ci             # or npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command           | What it does                                                  |
| ----------------- | ------------------------------------------------------------- |
| `npm run check`   | Everything CI should run: type-check, lint, unit tests, build |
| `npm run build`   | Type-checks, then builds a static bundle into `dist/`         |
| `npm run preview` | Serves the production build at http://localhost:4173          |
| `npm test`        | Runs the unit tests (Vitest)                                  |
| `npm run lint`    | Lints with oxlint                                             |

On first launch you get onboarding. Finish it to get a generated plan, or skip it to explore the demo:
about ten weeks of seeded push/pull/legs history plus body measurements.
Sample records carry a `demo-` id prefix, so **Settings → Remove sample data** deletes them without touching anything you logged yourself.

## Deployment

IronLog is a static web app. `npm run build` writes everything to `dist/`: an `index.html`, hashed JS and CSS in `dist/assets/`, the icon and a web app manifest.
Upload the contents of `dist/` to any static host or web server. No server-side code, environment variables, database or build-time configuration is needed.

- **Any path works.** Asset URLs are relative (`base: './'` in `vite.config.ts`), so the app runs from a domain root or a subfolder such as `/apps/ironlog/` without changes.
- **No rewrite rules.** Routing uses URL hashes (`#/history`), so the server only ever serves `index.html` and the files in `assets/`. Deep links and refreshes work on any host.
- **Caching.** Files in `assets/` have content hashes in their names and can be cached for a long time. Serve `index.html` with a short cache, or none, so users pick up new releases.
- **HTTPS.** Browsers only allow "Add to Home Screen" installs, and some storage guarantees, over HTTPS. Most static hosts provide it by default.
- **Check before publishing.** Run `npm run check`, then `npm run preview` to click through the production build locally.
- **Data stays with the browser.** Moving the app to a new domain starts with an empty log, because `localStorage` is per site. Use **Settings → Export JSON** on the old address and **Import JSON** on the new one.

Example with a plain file server:

```bash
npm ci && npm run build
npx serve dist          # or: python3 -m http.server --directory dist 8080
```

This repository publishes to GitHub Pages through `.github/workflows/pages.yml`. That workflow builds `ironlog/` and swaps the source folder for `dist/` in the uploaded site. It is one example of deploying the build; nothing in the app depends on GitHub Pages.

## Architecture

```
src/
  types.ts              Domain model: Exercise, Routine, Workout, WorkoutSet, Measurement, Profile, Settings
  data/
    exercises.ts        98 built-in exercises (muscles, equipment, form cue)
    seed.ts             Starter routines + deterministic demo history, unit snapping for demo loads
  store/
    useStore.ts         Single Zustand store with the persist middleware (key "ironlog-v1").
                        Holds all data and every action, including the live session
    useToast.ts         Toast queue (not persisted)
    useUi.ts            Transient UI flags (focus mode hides the tab bar in editors)
  lib/
    calc.ts             Volume, Epley e1RM, per-exercise history, PR detection, records
    stats.ts            Weekly buckets, week streaks, muscle split, next-workout rotation, duration estimates
    programGen.ts       Onboarding answers → personalised routines (split, sets, reps, rest, equipment-aware picks)
    supersets.ts        Link/unlink helpers that keep superset groups contiguous
    backup.ts           JSON export, plus a validating/sanitising importer
    units.ts, dates.ts  Formatting and conversion helpers
  components/
    ui/                 Button, Modal/ConfirmDialog (bottom sheet on phones), form controls (Segmented, DropdownChip,
                        Stepper), cards, list groups, Monogram tiles, toasts
    ui/Viz.tsx          Ring, SegmentBar, Sparkline, MiniBars: small SVG/CSS visuals shared across screens
    charts/Charts.tsx   Recharts wrappers (line/area, columns, labelled rank bars)
    workout/            ExerciseCard (set table), Keypad (weight/reps number pad), NumberField, SetTypeBadge,
                        RestDock (rest timer dock + full-screen view), setTypes.ts (set-type labels)
    AppShell.tsx        Sidebar on desktop, floating tab bar + "More" sheet on mobile, workout mini-player
    ExercisePicker.tsx, ExerciseForm.tsx, StartWorkout.tsx
  index.css             Design tokens (light + dark), stamp/eyebrow/hit utilities, motion keyframes
  pages/                One file per screen (Home, Onboarding, Library, ExerciseDetail, Routines, RoutineEditor,
                        LiveWorkout, WorkoutSummary, History, WorkoutDetail, Progress, Body, Settings)
```

Key decisions:

- **Weights are always stored in kilograms** and lengths in centimetres. Conversion happens only at the display and input edges, so switching units is instant and lossless.
- **The live session is ordinary persisted state** (`active`). The rest timer stores an absolute `endsAt` timestamp rather than a countdown, so a refresh or a locked phone never loses time.
- **Every statistic is derived** from the workout log on render (memoised). There are no cached aggregates to drift out of sync after you edit or delete a past workout.
- **Warm-up sets** count as completed sets but are excluded from volume and records. Failure and drop sets count as working sets.
- **Personal records** are computed by walking history chronologically. The first session of an exercise sets a baseline and is not itself a record.
- **Routing** uses `HashRouter`, so the built `dist/` folder works from any static host or subfolder without server rewrites.
- Pages are lazy-loaded, and the charting library only loads with the pages that use it.

## Feature checklist

**Onboarding**
- [x] Name, units, experience, training days per week (and which days), goal, equipment
- [x] Generates a personalised plan (full-body / upper-lower / PPL, depending on days) using only available equipment
- [x] Progress bar and step count, large option tiles, a tappable review summary that jumps back to any step
- [x] Skippable at every step; repeatable from Settings (replaces the previous generated plan, keeps history)

**Home dashboard**
- [x] Greeting and date, next scheduled workout with one-tap start (or resume if one is running)
- [x] Week streak, sessions this week vs target, this week's volume vs last week
- [x] Recent personal records, weekly calendar strip (trained / planned / today), recent workouts, bodyweight trend

**Exercise library**
- [x] 98 real exercises with primary/secondary muscles, equipment and a form cue
- [x] Search, filter by muscle and equipment, favourites and custom-only filters, A–Z or most-used sort, letter sections
- [x] Create, edit and delete custom exercises. A deleted exercise that appears in history is archived, so past workouts still name it
- [x] Detail view: best set, estimated 1RM, best volume, session count, progress chart (e1RM / top set / volume), full history

**Routines**
- [x] Create, edit, duplicate, reorder, delete (with undo)
- [x] Target sets, rep range, rest time per exercise; link neighbours into supersets
- [x] Estimated duration and muscles covered; "in plan" rotation drives the next workout
- [x] Starter routines: Push / Pull / Legs and Full Body Beginner A / B

**Live workout**
- [x] Running timer, live volume and completed-set count
- [x] Big-button number pad for weight and reps with plate-step ± buttons, "Reps →" and "Log set" in one flow; the next set to do is highlighted
- [x] Each set has weight, reps, a completed checkbox and last time's numbers for that same set (tap to copy). Ticking an empty set uses last time's numbers
- [x] Warm-up, failure and drop sets; add or remove sets; add, remove or reorder exercises mid-workout
- [x] Automatic rest timer with the routine's rest pre-filled, −15 / +15 / skip, a ring countdown, a full-screen timer view, and a beep plus vibration at zero. Supersets rest after the last exercise of a round
- [x] Finish (unticked sets are dropped after confirmation) or discard; summary screen with volume, duration, sets and records broken
- [x] Survives refreshes, including the rest timer. Keeps the screen awake where supported. Controls sit at the bottom for one-handed use, and a mini-player keeps the workout and rest timer one tap away from any page

**History**
- [x] Month-grouped list (older months load on demand) and calendar view with a day summary, monthly totals chart, current and longest streak
- [x] Set-by-set breakdown with e1RM; edit (name, time, duration, notes, sets, exercises) or delete with undo

**Progress**
- [x] Volume per week, workouts per week, muscle-group split (sets or volume)
- [x] Per-exercise strength progression (e1RM and top set weight) with a sparkline picker for your most-trained lifts
- [x] Personal records table: best weight, best e1RM, best session volume per exercise
- [x] 4-week / 12-week / 6-month / all-time ranges, all computed from logged workouts

**Body**
- [x] Log bodyweight, body fat, waist, chest, arms, thighs and hips by date (edit, delete; logging a date that already has an entry updates it)
- [x] Bodyweight chart plus 30- and 90-day change; a chart for every measurement with start / current / change and 30D–All ranges

**Settings**
- [x] Light / dark / system theme; kg or lb everywhere; default rest; timer sound
- [x] Profile (name, experience, goal, training days, equipment)
- [x] Export JSON; import JSON with validation, a preview of what will be replaced, and invalid entries skipped
- [x] Remove sample data, reset demo data, erase all data, restart onboarding

**Quality**
- [x] Responsive: phone tab bar, tablet, and a desktop sidebar layout
- [x] Keyboard-accessible dialogs (focus trap, Escape to close, focus returned to the trigger), labelled controls, visible focus, main text colours checked against WCAG AA (4.5:1), reduced-motion support
- [x] Touch targets of at least 44px on phones, checked on every screen at 360px, with no horizontal overflow from 360px up
- [x] Unsaved-change prompts in the routine and past-workout editors
- [x] Installable web app manifest; static build that runs from any path
- [x] Unit tests for the calculation, superset, program-generation, units, import and regression cases

## Limitations

- Data lives in one browser on one device. Clearing site data deletes it, so use **Export JSON** as a backup. Import replaces data; it doesn't merge.
- No offline mode: the app needs a connection to load, and there is no service worker.
- `localStorage` allows about 5 MB per site. By estimate, that is roughly 800 workouts at the demo's density.
- On desktop, the sidebar links don't show the unsaved-changes prompt in editors. Cancel, the back link and closing the tab do.
- The rest-timer beep and vibration depend on browser support. iOS Safari does not vibrate.
- The audit ran in Chromium only. See [`audit-report.md`](audit-report.md) for what was and wasn't tested.

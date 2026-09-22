# IronLog

A local-first strength training tracker built with React, TypeScript, Vite and Tailwind CSS.
It needs no accounts, no API keys, no environment variables and no network connection.
Everything, including a workout you are halfway through, is saved in your browser's `localStorage`.

**Live app:** https://otto-40.github.io/Fitness/ironlog/. The repo's Pages workflow builds `ironlog/` and publishes the output there on every deploy.
Data is stored per browser, so the live site and `localhost` keep separate logs.

## Setup

Requires Node.js 20 or newer.

```bash
cd ironlog
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run build`   | Type-checks, then builds a static bundle into `dist/` |
| `npm run preview` | Serves the production build locally             |
| `npm test`        | Runs the unit tests (Vitest)                    |
| `npm run lint`    | Lints with oxlint                               |

On first launch you get onboarding. Finish it to get a generated plan, or skip it to explore the demo:
about ten weeks of seeded push/pull/legs history plus body measurements.
Sample records carry a `demo-` id prefix, so **Settings → Remove sample data** deletes them without touching anything you logged yourself.

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
    ui/                 Button, Modal/ConfirmDialog (bottom sheet on phones), form controls, cards, toasts
    charts/Charts.tsx   Recharts wrappers (line/area, columns, labelled rank bars)
    workout/            ExerciseCard (set table), NumberField, SetTypeBadge, RestDock (rest timer)
    AppShell.tsx        Sidebar on desktop, tab bar + "More" sheet on mobile, resume-workout pill
    ExercisePicker.tsx, ExerciseForm.tsx, StartWorkout.tsx
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
- [x] Skippable at every step; repeatable from Settings (replaces the previous generated plan, keeps history)

**Home dashboard**
- [x] Greeting and date, next scheduled workout with one-tap start (or resume if one is running)
- [x] Week streak, sessions this week vs target, this week's volume vs last week
- [x] Recent personal records, weekly calendar strip (trained / planned / today), recent workouts, bodyweight trend

**Exercise library**
- [x] 98 real exercises with primary/secondary muscles, equipment and a form cue
- [x] Search, filter by muscle and equipment, favourites and custom-only filters
- [x] Create, edit and delete custom exercises. A deleted exercise that appears in history is archived, so past workouts still name it
- [x] Detail view: best set, estimated 1RM, best volume, session count, progress chart (e1RM / top set / volume), full history

**Routines**
- [x] Create, edit, duplicate, reorder, delete (with undo)
- [x] Target sets, rep range, rest time per exercise; link neighbours into supersets
- [x] Estimated duration and muscles covered; "in plan" rotation drives the next workout
- [x] Starter routines: Push / Pull / Legs and Full Body Beginner A / B

**Live workout**
- [x] Running timer, live volume and completed-set count
- [x] Each set has weight, reps, a completed checkbox and last time's numbers for that same set (tap to copy). Ticking an empty set uses last time's numbers
- [x] Warm-up, failure and drop sets; add or remove sets; add, remove or reorder exercises mid-workout
- [x] Automatic rest timer with the routine's rest pre-filled, −15 / +15 / skip, a ring countdown, and a beep plus vibration at zero. Supersets rest after the last exercise of a round
- [x] Finish (unticked sets are dropped after confirmation) or discard; summary screen with volume, duration, sets and records broken
- [x] Survives refreshes, including the rest timer. Keeps the screen awake where supported. Controls sit at the bottom for one-handed use

**History**
- [x] Month-grouped list and calendar view, monthly totals chart, current and longest streak
- [x] Set-by-set breakdown with e1RM; edit (name, time, duration, notes, sets, exercises) or delete with undo

**Progress**
- [x] Volume per week, workouts per week, muscle-group split (sets or volume)
- [x] Per-exercise strength progression (e1RM and top set weight)
- [x] Personal records table: best weight, best e1RM, best session volume per exercise
- [x] 4-week / 12-week / 6-month / all-time ranges, all computed from logged workouts

**Body**
- [x] Log bodyweight, body fat, waist, chest, arms, thighs and hips by date (edit, delete; logging a date that already has an entry updates it)
- [x] Bodyweight chart plus 30- and 90-day change

**Settings**
- [x] Light / dark / system theme; kg or lb everywhere; default rest; timer sound
- [x] Profile (name, experience, goal, training days, equipment)
- [x] Export JSON; import JSON with validation, a preview of what will be replaced, and invalid entries skipped
- [x] Remove sample data, reset demo data, erase all data, restart onboarding

**Quality**
- [x] Responsive: phone tab bar, tablet, and a desktop sidebar layout
- [x] Keyboard-accessible dialogs (focus trap, Escape to close), labelled controls, visible focus, main text colours checked against WCAG AA (4.5:1), reduced-motion support
- [x] Unit tests for the calculation, superset, program-generation, units and import logic

## Limitations

- Data lives in one browser on one device. Clearing site data deletes it, so use **Export JSON** as a backup.
- The rest-timer beep and vibration depend on browser support. iOS Safari does not vibrate.

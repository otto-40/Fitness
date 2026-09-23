# IronLog final audit

This audit covers product, functionality, responsiveness and code quality. The sources of truth were:
- the original build brief: onboarding, home, a library of 80+ exercises, routines, live workout, history, progress, body, settings, local-only data and the demo seed
- [`design-research.md`](design-research.md): the Forge design system, including 44px minimum touch targets, a visible focus ring, and a keypad that accepts physical keys

Every issue found was fixed. No feature was removed, and no interaction was replaced with a placeholder.

## How it was tested

| Suite | What it does | Result |
| --- | --- | --- |
| Unit tests (`npm test`, Vitest) | Calculations (volume, Epley e1RM, PR detection, records), units, supersets, program generation, backup parsing. Also new regression tests for the bugs below. | **17/17 pass** |
| Functional audit (Playwright, 12 sections) | Drives the real UI in a fresh browser profile per section and checks results against the stored data, not only against what is on screen. | **138/138 pass** on the dev server. On the production build, the 10 sections that don't need dev-server source imports pass **116/116** from a nested subfolder. |
| Layout and accessibility audit (Playwright) | Checks every route and major state at 360, 768 and 1280 px for horizontal overflow, touch targets under 44px, exactly one `h1`, visible keyboard focus, the dialog focus trap, focus returning after close, and physical-key entry on the keypad. | **No overflow, no undersized targets, one `h1` per screen, focus trap and key entry pass** |
| Original walkthroughs (`e2e`, `e2e2`) | The earlier end-to-end flows, including 24 assertions in `e2e2`. | **Pass, no console errors** |
| Static checks | `tsc -b`, `oxlint`, `vite build` | **0 type errors, 0 lint warnings (previously 4), build succeeds** |

Environment:
- Chromium through Playwright, with touch emulation on phone widths.
- Light, dark and system themes, including a live OS theme change.
- The dev server, and the production build served by a plain static file server (`python3 -m http.server`) from the site root and from `/some/sub/ironlog/`.
- Every run recorded browser console errors and warnings: there were **none**.

## What was tested

| Area | Checks |
| --- | --- |
| Onboarding | The name step is optional. The review screen reflects every answer, and tapping a review row jumps back to that step. Choosing 3 days gives a 3-routine plan. "Home dumbbells" gives a plan that uses only dumbbell, band and bodyweight exercises (checked against the exercise catalogue). Units, name, experience and goal are saved. Turning off sample history starts with empty history. Skip works both mid-flow and from the welcome screen. Restarting onboarding keeps history. Cancelling a repeat onboarding returns to the app. |
| Exercise library | Search. Muscle filter (matches primary and secondary muscles). Equipment filter, combined with the muscle filter. Filters are kept in the URL and survive a refresh. Clear. The favourites filter matches stored favourites. Favourite toggle. A–Z and "Most used" sort. Custom exercises: create, validation, duplicate-name rejection, the custom-only filter and editing. Deleting a custom exercise removes it from the library while past workouts still show its name. An unknown exercise id shows a not-found state. |
| Routines | Create. Reorder exercises. Link a superset. Sets stepper. Save, then edit: unlink and remove an exercise. Cancel asks before discarding unsaved edits, and leaves straight away when there are none. Duplicate. Move up. Delete, then undo. An unknown routine id shows a not-found state. |
| Live workout | Tapping "last time" copies the values. Completing a set starts the rest timer with the routine's rest time. +15 / −15 adjust the timer by exactly 15 s, and Skip ends it. Live volume equals the sum of weight × reps for completed working sets. A warm-up is inserted first and excluded from volume, and a drop set is added last. Changing a set's type to failure. Add and remove sets. Add, move, and remove an exercise with undo. The session, its ticks and the rest timer (same `endsAt`) all survive a page refresh. The mini-player appears on other pages and resumes the workout. Finishing with unticked sets asks first, then keeps only completed sets. The summary shows the correct volume and survives a refresh. An unknown summary id shows a not-found state. Discard saves nothing. |
| Supersets | No rest between exercises inside a round, and rest after the last one. Links stay consistent after moving an exercise into a superset, back out again, or removing half of the pair. |
| Records and e1RM | The best e1RM matches an independent Epley calculation over the raw data. A set that beats both the weight and e1RM records shows both on the summary, with the correct e1RM value, and appears on exercise detail, Progress and the Home recent records. A lighter session shows no records. |
| History | The count matches stored data. Selecting a calendar day shows its workout. Month paging. Editing a past workout (removing a set) is saved. Delete returns to History. An unknown workout id shows a not-found state. "Show older workouts" works. |
| Body | A minus sign cannot be typed. An implausible weight (5 kg) is rejected with a message. Body fat and circumferences can be logged. Charts for other metrics. Logging a second entry on the same date updates the first rather than duplicating it. Edit, delete, and switching range. |
| Units | Switching to lb converts historical sets exactly (90 lb shown for 40.82 kg). No "kg" text remains on Home, History, Progress, Exercise detail, Body or Routines. Keypad entry in lb (225, then +5) is stored as exactly 230 × 0.45359237 kg and displays back as 230 lb. The body form asks for lb and inches. Switching back never rewrites measurements. |
| Themes | System follows the OS (light and dark), forced Light and Dark override it, the choice survives a refresh, and System reacts to a live OS change. A script in `index.html` applies the theme before first paint, so there is no light flash. |
| Backup | The export filename and contents are complete. The import preview shows counts and how many entries will be skipped. Cancelling an import changes nothing. HTML inside imported names is shown as text, not executed. Non-JSON files are rejected with a message. Choosing the same file twice still triggers. Importing during an active workout warns first. |
| Empty states | After "Erase all data": Home, History, Progress, Body, Routines, the favourites filter and exercise detail all show clean empty states, with no NaN, undefined or null. |
| Layout | Checked at 360, 768 and 1280 px across every page plus onboarding steps, the calendar, workout detail and edit, the live workout, the full-screen rest timer, the keypad and the mini-player. Dark and light screenshots were reviewed by eye. |
| Keyboard | Tab through Home, Library, Settings and Body. Visible focus on every control; for dropdown chips it is drawn on the pill behind the select. The keypad dialog traps focus in both directions. Focus returns to the set cell after Escape. Typing "102.5", Tab, "6", Enter on a physical keyboard logs 102.5 × 6. |

## What was broken, and what was fixed

| # | Issue | Fix |
| --- | --- | --- |
| 1 | **Supersets went inconsistent mid-workout.** Removing one exercise of a pair left a lone superset link, and moving an exercise through a superset split the group. The same happened in the history editor, and when deleting a custom exercise used in a routine. | Every remove and move runs `normalizeSupersets`, as the routine editor already did. Covered by new unit tests. |
| 2 | **Keypad lost keystrokes when typing fast on a physical keyboard.** "102.5" was stored as "5". I introduced this in the previous PR's lint clean-up: key handling read state that hadn't re-rendered yet. | Key handling reads and writes a ref that updates synchronously, and state is used only for display. Verified with burst typing. |
| 3 | **Keys typed straight after opening a dialog were lost.** Focus moved into the dialog one frame late. | The Modal focuses its target synchronously when it opens. The trap also pulls focus back in if it ever ends up outside. |
| 4 | **The keypad captured Tab** even when a key button had focus, so keyboard users couldn't tab to Done or the ± buttons. | Tab switches field only while the pad itself has focus. Otherwise it moves focus normally, still trapped inside the dialog. |
| 5 | **Cancelling the routine editor silently threw away edits.** | Cancel and the back link ask "Discard changes?" when there are unsaved edits. Closing the tab triggers the browser's leave-page prompt. |
| 6 | **Same problem in the past-workout editor.** | Same confirmation for Cancel and the back link. |
| 7 | The past-workout editor added warm-ups at the end, unlike the live workout. | Warm-ups are inserted before the first working set. |
| 8 | **Importing a backup silently discarded a workout in progress.** | The import preview now says "The workout in progress will be discarded." |
| 9 | Unpluralised counts in 12 places: "1 sets", "1 exercises", "1 sessions", "1 workouts", "1 favourites", plus the import preview. | New `plural()` helper, used everywhere. |
| 10 | Workouts under a minute showed "0 min". | They now show "<1 min". |
| 11 | The onboarding review listed training days Sunday-first ("Sun, Mon, Wed") while every picker is Monday-first. | Days are sorted Monday-first. |
| 12 | Two warm-ups, or two drop or failure sets, had identical screen-reader labels. | Labels are unique: "Warm-up 2", "Set 4 · Drop set". |
| 13 | **Many touch targets were under 44px on phones.** Examples: filter and metric chips, dropdown chips, segmented controls, switches (36 px); calendar days and month arrows (39–40 px); weekday toggles in Settings and onboarding (37 px wide); the logo; the "All records", "See all" and "Full exercise history" links; back links; routine title links (33 px); workout-detail exercise links (20 px); the Progress select and filter input; the dialog Close button; set-type badges (40 px); and the "last time" copy button inside supersets (26 px wide). | A `.hit` utility adds an invisible 44px touch area, so compact chips keep their look. Dropdown chips use a 44px select with the pill drawn behind it. Horizontal chip rows got vertical padding so the touch area isn't clipped. Calendar days are full-cell 44px buttons with the circle drawn inside. Weekday toggles use a 4 + 3 grid on phones. The rest got a real 44px size. |
| 14 | At 360 px the live workout's "last time" values were truncated to "142.5 × …", and the column header wrapped. | Weight and reps wrap onto two lines when needed, and the header reads "Last" on phones. |
| 15 | At 360 px the rest-dock countdown overlapped the −15 button. | Below 380 px the ±15 buttons are fixed 48px squares and Skip shows only its icon. Its accessible label is still "Skip rest". |
| 16 | Superset groups narrowed the set grid on phones. | On phones the group frame extends into the page gutter, so rows are the same width as elsewhere. |
| 17 | The live workout was the only screen without an `h1`. | The workout name is now the `h1`. |
| 18 | The browser theme colour used stale pre-redesign colours and didn't match light mode on first load. | It uses the current background tokens and is set before first paint. |
| 19 | Four lint warnings: two forms reset state in an effect, and two component files also exported constants. | The forms mount only while open and initialise from props. Set-type metadata moved to `setTypes.ts`, and `buttonClass` is private. |
| 20 | Native dropdown options could inherit an inverted chip's text colour. | Options always use ink on surface. |

These looked like failures during the audit but are correct behaviour. They are listed so they aren't "fixed" later:
- The muscle filter includes exercises that use the muscle as a secondary, so Bench Dip appears under Chest.
- A custom exercise can't reuse a built-in name, such as "Landmine Press".
- 85 kg × 5 after an 80 kg × 8 best is a weight record but not an e1RM record, because 99.2 kg is less than 101.3 kg.

## Deployment preparation

- The build is fully static and works from any path, with no server configuration:
  - `base: './'` makes every asset URL relative.
  - `HashRouter` means deep links never reach the server.
  - This was verified by serving `dist/` with a plain static server at `/` and at `/some/sub/ironlog/`.
- A web app manifest (`manifest.webmanifest`) was added, so phones can add IronLog to the home screen as a standalone app.
- An `engines` field requires Node 20 or newer.
- A new `npm run check` runs type-check, lint, unit tests and build in one step.
- The README has provider-neutral deployment instructions.

## Remaining limitations

- **Tested in Chromium only**, with emulated touch. Safari (iOS and macOS) and Firefox were not tested in this environment, and neither were physical phones. The code avoids browser-specific APIs apart from optional vibration and audio.
- **No manual screen-reader pass.** Labels, roles, focus order and live regions were checked automatically. VoiceOver and TalkBack were not run.
- **The desktop sidebar can still leave an editor without the discard prompt.** Cancel, the back link and closing the tab all prompt. Sidebar links don't, because `HashRouter` has no navigation blocker. Moving to a data router would fix this. The mobile tab bar is hidden in editors, so this only affects desktop.
- **No offline mode.** The app needs a connection to load; there is no service worker. Data itself never leaves the device.
- **Storage.** Browsers give each site about 5 MB of `localStorage`. The demo's 37 workouts (732 sets) export to about 225 KB. On that basis the limit holds roughly 800 workouts (an estimate, not a measurement). Export is the backup path.
- **Import replaces everything**; it doesn't merge. The preview says so and shows counts before anything changes.
- **e1RM limits.** The Epley estimate caps reps at 20. For bodyweight exercises logged with added load, it is based on the added load only.
- Vibration at the end of rest depends on browser support: iOS Safari doesn't vibrate.

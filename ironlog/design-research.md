# IronLog design research and redesign plan

Research was done on Mobbin (iOS) across eight areas. The goal was not to clone any product. It was to find the patterns that keep recurring in the strongest fitness products, decide which ones fit a private, offline strength log, and build IronLog's own identity on top of them.

---

## 1. Products and flows examined

| Area | Products and screens studied |
| --- | --- |
| Workout and strength logging | [Hevy active workout](https://mobbin.com/screens/b7c6155c-8453-4230-9c28-a12218a415d8), [Bevel strength session](https://mobbin.com/screens/104617a3-8dd2-4cd9-ba85-7189c3a0e5c8), [Ladder set logging](https://mobbin.com/screens/74b46d4c-53f3-4386-b0f7-a83f24056f95), [WHOOP strength log](https://mobbin.com/screens/5ed82947-4ee7-4151-bafe-c036f82b979a), [Runna superset session](https://mobbin.com/screens/cecabd48-5a09-4dad-a62c-4bc00abf4a80), [Peloton Strength+ rep keypad](https://mobbin.com/screens/61ab24f0-ff1a-49e1-a08d-7ec5bb1af3b3), [Tonal set detail](https://mobbin.com/screens/65d7538d-e628-4c08-9cff-c99245270609), [Centr logbook](https://mobbin.com/screens/0240c94c-83ac-48b4-b25d-7dafd7377a39) |
| Live activity and timers | [Hevy rest clock](https://mobbin.com/screens/2ae07c12-4429-41ff-9444-103806f75005), [Tonal rest screen](https://mobbin.com/screens/50541d0f-6dd5-4652-946c-0d3b655e616f), [Ladder arc timer](https://mobbin.com/screens/308ace07-5344-44ea-9f4a-edff86cbfe93), [Crouton floating timer](https://mobbin.com/screens/d4f7df3b-0b48-4401-b10a-81fa1514dcff), [timespent focus timer](https://mobbin.com/screens/a4c1b624-9203-4f16-b746-51cba76ff2e8) |
| Onboarding | [Tonal fitness profile flow](https://mobbin.com/flows/9f597ed6-aea4-4ec7-b573-48ea7484b164), [Equinox+ profile setup](https://mobbin.com/flows/7ab69f0d-ea82-4ac1-bb08-1421102e7a4e), [Equinox+ program personalisation](https://mobbin.com/flows/754cee5d-c1f4-44a7-9ae9-5e09474db3a3), [pliability tailoring flow](https://mobbin.com/flows/ba530414-fbc6-4e1f-a353-bbed6c52305a) |
| Exercise libraries | [Hevy add exercise with filters](https://mobbin.com/screens/c1522754-cbe8-4738-81fe-0c8292fa5364), [Bevel library dropdown filters](https://mobbin.com/screens/a2370c2a-85dd-4931-acdd-17010a84a01a), [Gymshark A–Z / body part tabs](https://mobbin.com/screens/2355a92d-b28c-4983-98a9-6c8c13c8cd15), [Equinox+ movement library](https://mobbin.com/screens/6212b5c1-62d3-4404-84a1-0d6cce54e2a3), [Tonal movements](https://mobbin.com/screens/232141a3-3ec8-43e8-b8ff-03ba2385616a), [Peloton add exercises](https://mobbin.com/screens/412ef003-70ad-43b5-b0fe-e882018a0082) |
| Exercise detail and analytics | [Tonal 1-rep max](https://mobbin.com/screens/49b9079a-87e6-434d-802e-25a9a9858077), [Hevy exercise summary and records](https://mobbin.com/screens/f4d385ab-7958-4494-89d6-f7c681437d71), [Bevel strength progression sparklines](https://mobbin.com/screens/2bb47d83-d7d3-4ccb-9852-afbdee9dc32e), [Gymshark PB charts](https://mobbin.com/screens/9e5ab8b6-48c8-4025-b2f0-4d251f925256), [Tonal total volume](https://mobbin.com/screens/7b996db9-f556-4656-aea3-ac8e76be62aa), [Gentler Streak activity summary](https://mobbin.com/screens/81ddb60b-a773-448c-b64a-92cef5221268), [Strava progress](https://mobbin.com/screens/8750eb55-deb4-4533-8b91-0a85affae067) |
| Streaks and habits | [Strava weekly streak widget](https://mobbin.com/screens/1c996718-ab94-4247-85b3-80885bab44c9), [Yazio streak milestones](https://mobbin.com/screens/84b1eadf-f94e-43a7-84e6-838d039aeaa1), [Duolingo streak calendar](https://mobbin.com/screens/739be3b0-b1a3-4d8b-a2aa-e387c07be210), [adidas Running weekly streak](https://mobbin.com/screens/9d27ac65-a9fa-4bad-98e6-3b48462e1337), [Numo](https://mobbin.com/screens/a3ac24c6-bba2-4c93-ac2e-86c4f6462ec3), [Alta](https://mobbin.com/screens/85635c51-5d04-45a1-9034-4b590953fb70) |
| Calendar and history | [Ladder workout activity calendar](https://mobbin.com/screens/5fcc9cc5-9eb9-422b-a184-9ad79babe523), [pliability completed sessions](https://mobbin.com/screens/71a51c06-3b92-44ca-906a-b6645b9f1002), [Tempo week highlight](https://mobbin.com/screens/345f6663-ce9b-438c-81be-710cec6c77cb), [Equinox+ day agenda](https://mobbin.com/screens/5a119924-6016-470e-9bc7-b9f09be567f4), [Hevy workouts widget](https://mobbin.com/screens/79a622bd-392f-4ab4-9eb7-18e3a85fcc5c) |
| Body measurements | [Hevy measurements with metric chips](https://mobbin.com/screens/3af37b11-e24c-4b43-8179-d1967bd318e2), [MyFitnessPal start/current/change](https://mobbin.com/screens/4ac4353e-42fe-41b5-ad0c-092ca0aa93d0), [MacroFactor scale weight](https://mobbin.com/screens/3670bd7d-82d1-4015-940a-8cf38d5d90a0), [Alma weight entries](https://mobbin.com/screens/d5d1920d-5970-4437-92d8-e9097400bac1), [Withings trend](https://mobbin.com/screens/9ab952f7-dccf-44e9-ad50-fd83667ae174) |
| Routines and home | [Hevy routines tab](https://mobbin.com/screens/9b47d4d4-5284-4849-a244-fb797cf63e87), [Runna session with superset links](https://mobbin.com/screens/1073d491-0836-4d4a-b2bb-0080d069989a), [Gymshark superset rail](https://mobbin.com/screens/a823deea-d804-48d1-be8f-3a1ab00e1058), [Runna today view](https://mobbin.com/screens/eb878d51-4650-4252-80a8-62e0b2465ec1), [Tonal weekly target ring](https://mobbin.com/screens/5e9461c9-d902-4e37-ad82-906753bc7583), [Garmin coach plan week](https://mobbin.com/screens/7bfd20ab-2add-4401-96bc-e002c0fb0ff8) |
| Summaries | [Bevel session summary tiles](https://mobbin.com/screens/5f7837bf-96da-4c5d-a614-655893f9cbf3), [Peloton workout summary](https://mobbin.com/screens/43de8eec-8c62-4729-b740-a8d76296edd3), [Gymshark workout table](https://mobbin.com/screens/e6aed8cf-92c8-43c9-aef2-128aa6c598ea), [Ladder completion](https://mobbin.com/screens/71401625-f188-4059-9d11-3b2e3f032e29) |
| Settings and theme | [Air NZ inline appearance segments](https://mobbin.com/screens/1c9097cb-3667-485c-845e-d0d1897fef9c), [DailyArt units/theme segments](https://mobbin.com/screens/2ff45f47-5a5e-4606-8878-791251a976ab), [Ultrahuman unit preferences](https://mobbin.com/screens/df9dd7cd-60d2-4a81-a02d-9305af96ee0f), [Box Box Club grouped settings](https://mobbin.com/screens/0f012bf8-67ac-47b3-8d70-2cb7a08ee929), [Base display settings](https://mobbin.com/screens/3f573b95-4bbb-4978-957e-56178543e8e7) |

---

## 2. Useful patterns identified

**Live workout**
- A set table with the columns *set, previous, load, reps, done* shows up in every serious logger (Hevy, Bevel, Tonal). Lifters already know it, so keep it.
- The last-time numbers sit in the row, and tapping them copies the values.
- Completed rows turn green with a solid check (Bevel, Hevy). Green is used for nothing else.
- The next set to do is visually marked. Bevel shows a play affordance on the next row. IronLog uses an ember outline and an "up next" state.
- Peloton edits numbers in a **full-width keypad bottom sheet**. One thumb can reach every key, and the phone keyboard never covers the set you are editing. IronLog adopts this, adds plate-step ± buttons, and adds a "Log set" key that finishes the set in the same sheet.
- A persistent **mini player** (Bevel) shows the current exercise and rest countdown while the user browses elsewhere.
- Supersets are grouped with a connector and a label (Runna's link node, Gymshark's side rail).
- Rest is a **ring countdown** with −15/+15 (Hevy, Ladder). Quick-add chips work well (Crouton). The timer reads from across the room when expanded (Tonal).
- Primary actions sit at the bottom in the thumb zone (Runna: Pause / Next exercise).

**Onboarding**
- A thin progress bar, a "Step 2 of 7" counter and Skip in the top corner (Tonal, Equinox+, pliability).
- One large question per screen with a short line of help underneath.
- Full-width option rows with a leading icon and a trailing radio (Tonal), and 2-column tiles for multi-select (Equinox+ goals).
- The primary CTA is pinned to the bottom.
- A "time needed" reassurance on the welcome screen ("less than 1 minute", Equinox+).
- A confirmation summary that restates each choice with a check before committing (Tonal "Your Training Goals are set").

**Library**
- A search field pinned above filter chips (Hevy, Bevel).
- Filters shown as **dropdown chips** ("All muscles ▾", "All equipment ▾", Bevel). Active filters become removable chips (Hevy).
- A result count ("1173 Movements", Equinox+).
- Alphabetical section headers (Gymshark, Tonal).
- Rows show the name, then *muscle · equipment* in a muted second line.

**Exercise detail and analytics**
- The key stat in large type in the top-right of the section, with the label in small caps (Tonal "59 lbs STRENGTH PR").
- Metric chips switch what the chart shows (Hevy: Heaviest weight / One rep max / Best set).
- A personal records list (Hevy).
- A per-exercise **sparkline progression list** (Bevel) scans much faster than a dropdown.
- Big headline totals with a "vs last period" delta (Tonal, Gentler Streak).
- Stat tiles in a 2×2 grid with delta arrows (Gentler Streak).
- Week / Month / Year range tabs (Tonal, Gentler Streak).

**Streaks**
- A big number plus a unit ("3 week streak") next to a flame mark.
- A row of weekday circles, checked when trained (Strava, Numo, Alta).
- Milestone segments toward the next target (Yazio 3/7/14).
- A weekly target shown as a ring or as segments (Strava, Tonal, Garmin).

**Calendar and history**
- A month grid where trained days are filled circles (Ladder, Duolingo, Noom). Picking a day lists that day's sessions underneath with totals (pliability: "Day selected · Total time").
- A week-row highlight (Tempo).
- Agenda rows with a coloured left rail (Equinox+, Runna).

**Body**
- A START / CURRENT / CHANGE triplet above the chart (MyFitnessPal).
- Range pills directly under the chart (MacroFactor, Alma).
- **Metric chips** that switch the chart between bodyweight, body fat and each tape measurement (Hevy).
- Entries grouped by month with an edit affordance per row (MacroFactor).
- One prominent "Add entry" button.

**Settings**
- Grouped inset lists with section headers (Box Box Club, Base).
- **Inline segmented controls** for theme and units, so there is no sub-page (Air NZ, DailyArt, Ultrahuman).
- Destructive actions separated at the bottom.

**Summary**
- A celebratory header, then a 2×2 stat tile grid with icons (Bevel).
- A completion bar (Peloton).
- An exercise table (Gymshark).
- Done as the primary action, with a secondary "view / update template" (Bevel).

---

## 3. Patterns intentionally rejected

| Pattern | Seen in | Why it is rejected |
| --- | --- | --- |
| Exercise photos, video thumbnails and full-bleed hero photography | Gymshark, Equinox+, Centr, pliability | IronLog is offline and asset-free, and stock athlete photos would make it generic. A typographic identity is used instead: monogram tiles and big condensed numerals. |
| Anatomical body-map diagrams | Peloton summary | Needs licensed artwork and is hard to make accessible. Muscle chips with set counts carry the same information. |
| Streak freezes, share cards, mascots, confetti | Duolingo, Numo, Any Distance, Ladder | Gamified pressure does not fit a serious training log, and there is no social layer. IronLog keeps an honest weekly streak and a quiet milestone bar. |
| Ruler and scroll-wheel pickers | Tonal height/weight | Fiddly with a mouse, poor for screen readers, and slow for exact loads. Replaced by a keypad with plate-step buttons. |
| Floating "Filter" pill at the bottom of the library | Tonal, Equinox+ | Collides with the floating tab bar on the web. Filters live in a sticky chip row instead. |
| Alphabet scrubber | Gymshark | Unreliable on web and touch-sensitive. Section headers plus search cover the need. |
| Strength level versus population, leaderboards | Hevy, Ladder | No population data exists, and IronLog is private by design. |
| Heart rate, calories, strain | Bevel, WHOOP | The brief rules out wearables. Showing empty metrics would be dishonest. |
| Glassmorphism panels and saturated gradient backgrounds | The Outsiders, GO Club | Explicitly out of scope, and they hurt legibility in a bright gym. |
| Pause button on the workout clock | Bevel, Peloton | Strength sessions are timed wall-clock from start to finish. Duration stays editable afterwards in History. |

---

## 4. IronLog design system: "Forge"

### Visual direction
IronLog should feel like **cast iron and chalk**: dark, dense and quiet, with one hot accent that means *do this now*. It has three signatures:
1. **Stamped numerals.** Loads, reps, timers and totals are set in a condensed display face, like the numbers stamped on plates.
2. **The plate ring.** Circular progress (the weekly target and the rest timer) reads like a plate seen end-on.
3. **Segment bars.** Weekly sessions and streak milestones are drawn as discrete segments, like plates loaded on a bar.

Everything else stays calm: neutral surfaces, hairline borders, no gradients.

### Colour tokens
Colours are semantic tokens. Dark is the flagship theme ("Forge") and light is "Chalk".

| Token | Chalk (light) | Forge (dark) | Use |
| --- | --- | --- | --- |
| `bg` | `#F3F2EE` | `#0B0C0E` | App background |
| `surface` | `#FFFFFF` | `#141619` | Cards, sheets |
| `surface-2` | `#EEEDE8` | `#1B1E22` | Inputs, set cells, secondary buttons |
| `surface-3` | `#E4E2DC` | `#24282D` | Pressed/hover, tracks |
| `line` | `#E1DFD8` | `#24272C` | Hairline borders |
| `ink` | `#15161A` | `#F4F3EF` | Primary text |
| `ink-2` | `#4D4E55` | `#B6B8BE` | Secondary text |
| `muted` | `#636469` | `#8B8E95` | Captions, labels (≥4.5:1 on bg) |
| `accent` (ember) | `#FF6B2C` | `#FF6B2C` | Primary action, current item, progress |
| `accent-ink` | `#B3410F` | `#FF8B59` | Accent used as text |
| `accent-soft` | `#FFE6DA` | `#35190C` | Accent tints |
| `on-accent` | `#15161A` | `#15161A` | Text on ember (6.3:1) |
| `good` | `#157A3C` | `#35C46B` | Completed sets **only** |
| `warn` | `#A84D08` | `#F5B454` | Warm-up sets |
| `danger` | `#C2261C` | `#F06A5F` | Destructive, failure sets |
| `series-1` / `series-2` | `#EB6834` / `#2A78D6` | `#D95926` / `#3987E5` | Chart series (validated orange/blue pair) |

A dark `hero` surface (`#15161A`, the same in both themes) is used for the one card on each page that must dominate, such as today's workout or the rest timer.

### Typography
- **Display:** Barlow Condensed 600/700, tabular numerals. Used for numbers, page titles and hero names. Page titles are uppercase with wide tracking at 32–40px. Numerals are sized by role:
  - hero: 56px
  - stat: 32px
  - inline: 20–24px
- **UI:** Inter Variable, 400/500/600. Body is 15px, secondary 13px, dense table 14px.
- **Eyebrow:** Inter 600, 11px, uppercase, `letter-spacing: .12em`, `muted`. Used for section labels and stat labels (the Tonal/Equinox+ small-caps label pattern).
- Units always sit beside a number at about 45% of its size, in `muted` ("102.5 kg").

### Spacing scale
The scale uses a 4pt base: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`.
- Card padding is 16 on mobile and 20–24 on desktop.
- The gap between cards is 12 on mobile and 16 on desktop.
- The page gutter is 16 / 24 / 40.

### Corner radii
| Radius | Use |
| --- | --- |
| 8 | Badges, set chips |
| 12 | Buttons, inputs, list rows |
| 16 | Cards |
| 24 | Hero cards, bottom sheets, floating tab bar |
| Pill | Chips, segmented controls, mini player |

### Elevation
Surfaces are separated by borders and tone, not shadow. There are two shadow levels:
- `shadow-float` is for the floating tab bar, mini player and toasts.
- `shadow-sheet` is for dialogs and bottom sheets.

No coloured glows, except a soft ember halo on the active rest ring.

### Icons
lucide icons in outline style at a 2px stroke. Sizes are 20px inline, 22px in navigation and 16px in chips. The active nav icon is ember and slightly bolder (2.4 stroke). Icons never carry meaning alone; they always sit next to a text label or have an `aria-label`.

### Motion principles
- **Purposeful and short.**
  - Presses scale to 0.97 over 120ms.
  - Sheets rise over 240ms with `cubic-bezier(.2,.7,.2,1)`.
  - Pages fade and rise 6px.
- **Feedback on commitment.** Completing a set pops the check (250ms), briefly flashes the row, and starts the rest ring animating.
- **Timers animate continuously** (a 200ms tick), and numbers never jump layout because they use tabular numerals.
- **`prefers-reduced-motion`** drops all transforms and animations to near-instant.

### Charts
These follow the dataviz method:
- A single series uses ember with a 10–18% area wash. Two series use the validated orange/blue pair and always get a legend.
- Lines are 2px. Bars are at most 24px wide with a 4px rounded top and a square base. The current period is full strength and past periods are at 55% opacity.
- Gridlines are hairlines in `grid`, with no axis lines, 12px `muted` ticks, and k-abbreviated ticks.
- Every chart has a hover/tap tooltip, an `aria-label` summary, and a numeric equivalent nearby (tiles or table).
- Sparklines are 2px ember with an end dot and no axes; they are used only in lists.

### Forms
- Labels sit above fields in 13px `ink-2`. Hints and errors sit below, with errors in `danger` and `role="alert"`.
- Inputs are 44px tall with a filled `surface-2` background and 12px radius. Focus shows an ember border plus a 3px ember ring at 25%.
- Choice uses segmented controls (2–4 options), chips (multi-select) or option cards (onboarding).
- Numbers in the workout use the IronLog **keypad sheet**. Elsewhere they use numeric inputs, with ± steppers for small integers such as set counts.
- Validation runs on submit, then updates live once a field has an error.

### Empty states
An icon tile (48px, `accent-soft` / `accent-ink`), a one-line title, one sentence that explains the value, and **one** primary action (plus an optional secondary). Copy talks about what will appear, never "No data".

### Mobile behaviour
- **Floating tab bar:** a pill with 24px radius, 12px from the bottom plus the safe area. It holds Home, Routines, History, Progress and More.
- When a workout is running, the **mini player** docks above the tab bar. Tapping it resumes the workout.
- Editors and the live workout enter **focus mode**: the tab bar hides and a sticky bottom action bar takes its place.
- Every primary action on a phone screen is in the bottom 40% of the screen.
- Touch targets:
  - 44px minimum everywhere
  - 52px for set cells in the live workout
  - 56px for keypad keys and primary workout actions
- Dialogs become bottom sheets under 640px and centred modals above.
- No horizontal page scrolling at 360px. Wide tables become card lists on mobile.

### Accessibility rules
- Text contrast is at least 4.5:1, and large numerals and UI boundaries are at least 3:1. Both themes are checked.
- Colour is never the only signal. Completed rows also get a check icon, warm-up and failure sets get letters (W, F, D), and chart series get legends.
- Every control is reachable by keyboard with a visible 2px ember focus ring. Dialogs trap focus and close on Escape. The keypad accepts physical keys (digits, `.`, Backspace, Enter, Tab).
- Custom controls use ARIA roles:
  - `role="radiogroup"` for segmented controls
  - `role="switch"` for toggles
  - `role="checkbox"` for set completion
  - `role="timer"` for rest
- Live regions announce set counts and toasts.
- `prefers-reduced-motion` and `prefers-color-scheme` are honoured.

---

## 5. Page-by-page redesign plan

| Page | Redesign |
| --- | --- |
| **App shell** | A floating pill tab bar on mobile, and a refined sidebar on desktop with a "Start workout" button. The active workout pill becomes a **mini player** showing the workout name and a live clock or rest ring. Focus mode applies in the live workout and in editors. |
| **Onboarding** | The welcome screen shows a stamped headline and "takes about a minute". Each step has a counter, a thin bar and Skip, with the CTA pinned to the bottom. Option cards have icons, days per week uses large numeric tiles, and equipment uses a 2-column tile grid with presets. The final **"Your plan is set"** summary lists each answer with a check and previews the generated routines before you commit. |
| **Home** | The week strip moves to the top. The **Today hero** (a dark card) shows the next routine, its muscles, its duration and a big Start button. A **weekly target ring** with segment bars sits beside the streak card (flame, week count, milestone segments). The volume tile has a 7-day mini bar chart and a delta. Recent records and recent workouts follow, then a bodyweight tile. |
| **Exercise library** | A sticky search bar with **dropdown chips** for muscle and equipment, plus Favourites and Custom chips. The result count sits beside an A–Z / Most used sort segment. Results are an alphabetical sectioned list with monogram tiles and a favourite star. |
| **Exercise detail** | A header with a monogram tile and muscle chips, then a hero stat row (Est. 1RM stamped large, best set, sessions). **Metric chips** switch the chart. A **Personal records** list follows, then a session history with stamped set chips. |
| **Routines** | A **Quick start** row (Empty workout, New routine). The **plan rotation** strip shows numbered routines and which is up next. Routine cards preview their exercises and have a full-width **Start** button, with a menu for other actions. |
| **Routine editor** | A sticky summary bar (duration, sets, muscles). Exercise cards have **± steppers** for sets and inline rep range and rest fields. A **link node** between cards toggles a superset, and linked cards get an ember rail. Save / Save & start stay in the bottom bar. |
| **Live workout** | A big stamped clock in the header plus Finish, then a progress bar across all sets. Set rows have 52px targets. The **up-next** row gets an ember outline. Tapping load or reps opens the **keypad sheet** (plate-step ±, next field, **Log set**). The previous-set chip copies on tap. Supersets are bracketed with a link node. The **rest dock** has a big ring, −15/+15/Skip, and can expand to a full-screen timer. Exercise and Finish stay in the thumb zone. |
| **Workout summary** | A stamp-style check, "Workout #N", and a **2×2 stat tile grid**. A completion bar, a records list, and muscles worked as chips with set counts. An exercise table gives the best set per exercise. Done is the primary action. |
| **History** | A header segment for List / Calendar and a **month stat row** (workouts, volume, streak). The calendar fills trained days with ember circles and **summarises the selected day**. The list is grouped by month into agenda cards with a left rail, and PR workouts are badged. |
| **Workout detail** | A hero stat row, a stamped set table per exercise, and edit mode using the same keypad-based cards. |
| **Progress** | A **headline total** with a delta versus the previous period, a range segment, and stat tiles with delta arrows. Charts follow as before. A **Strength list with sparklines** lets you pick an exercise for the big chart. Records are cards on mobile and a table on desktop. |
| **Body** | A **metric chip row** (Bodyweight, Body fat, Waist, Chest, Arms, Thighs, Hips) drives the chart and a **START / CURRENT / CHANGE** row, with 30D/90D/1Y/All pills under the chart. Summary tiles show 30- and 90-day change. Entries are grouped by month with edit/delete. There is a big **Log entry** button. |
| **Settings** | A profile header card. Grouped inset sections (Appearance, Units, Workout, Profile, Data) with **inline segmented controls**. The danger zone is separated at the bottom. |
| **Empty states** | Unified component across Home, History, Progress, Body, Library, Routines and the live workout. |

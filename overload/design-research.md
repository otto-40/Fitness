# Overload design research and redesign plan

This is the second design pass on Overload. The first pass ("Forge", PR #23) gave the app a typographic identity: stamped numerals, the plate ring and segment bars. It was then renamed Overload and moved to the indigo Longevity palette.

This pass started with a screenshot audit of every screen as it stood, then a new round of Mobbin research aimed at what the audit found. The goal is still not to clone any product. It is to take the patterns that recur in the strongest consumer fitness products and build Overload's own version of them.

**Kept on purpose:** the name, the app icon, the indigo palette (chosen by the owner, from Sam's Training Week), the effort shapes and every feature.

---

## 0. What the audit of the current app found

Every screen was captured at 390 × 844 in both themes, and at desktop width.

1. **It reads as a dashboard, not a product.**
   - Every block is a bordered white box of the same weight. Home stacks 9 of them.
   - The week strip, weekly target, streak and aerobic minutes are four separate cards, though they answer one question: "how is my week going?"
2. **Too much chrome before the content.**
   - Every mobile page repeats the logo bar, then a 40 px uppercase title, then an action button.
   - On Exercises, the first exercise starts 880 px down a 1688 px screen.
3. **Words and numbers compete.**
   - Uppercase condensed type is used for titles, routine names, month headers and numbers alike, so nothing stands out.
   - The condensed face is at its best on numbers.
4. **The live workout needs two hands.**
   - Logging a set means reaching the right-hand checkbox in the middle of the screen, or opening a keypad sheet.
   - The bottom of the screen, where the thumb rests, holds only "+ Exercise" and "Finish". Both are rare actions, and Finish is dangerous to hit by accident.
5. **Progress is one 10,000 px scroll.** Charts, strength curves and a 30-row records table sit on one page with no way to jump between them.
6. **Empty and secondary states are plain.** They are a dashed box and a sentence. The theme setting is a text segment with no preview.

---

## 1. Products and flows examined

### Round 2 (this pass)

| Area | Products and screens studied |
| --- | --- |
| Live logging, one set at a time | [Hevy set logging](https://mobbin.com/screens/fa1b4fe1-5d63-4e97-ac9a-ccdf41b86d7c), [Ladder log sheet](https://mobbin.com/screens/3daed3ec-2832-48af-9f73-0aab0d428f51), [Bevel active set and floating now-bar](https://mobbin.com/screens/e94afd68-a93b-473f-992b-c3467789a29c), [Centr current set card with transport controls](https://mobbin.com/screens/b3493afa-6b17-410b-9e2e-31227ad67d3c), [Ladder bottom exercise panel](https://mobbin.com/screens/d1169c75-4219-4bf1-aa2c-f5eb8fc0187a), [Future control sheet](https://mobbin.com/screens/726b0126-ef7b-417d-9e31-451344db66a1), [pushr giant counter](https://mobbin.com/screens/108d4e4a-ab57-4331-82b7-339104d500a6), [Tonal set detail](https://mobbin.com/screens/65d7538d-e628-4c08-9cff-c99245270609), [Runna Pause / Next pinned bottom](https://mobbin.com/screens/5f5c55bd-9cb8-4916-9e86-2953b6c6ca18), [Peloton block progress](https://mobbin.com/screens/8a9854d1-c1f9-4629-b637-e3f99ee99078) |
| Rest and timers | [Hevy live activity "Next: set 2 of 3 (110 kg × 5–6)"](https://mobbin.com/screens/6f5fad08-23a6-4698-9868-2289969a1d5e), [Gymshark rest sheet](https://mobbin.com/screens/f4cdbd47-9666-4c67-ae63-c75f2094254d), [Tonal rest](https://mobbin.com/screens/50541d0f-6dd5-4652-946c-0d3b655e616f), [Centr get-ready with up next](https://mobbin.com/screens/37aba777-a6f4-4428-904c-ca962cc72167), [timespent break timer](https://mobbin.com/screens/a4c1b624-9203-4f16-b746-51cba76ff2e8) |
| Onboarding | [Tonal fitness profile](https://mobbin.com/flows/9f597ed6-aea4-4ec7-b573-48ea7484b164), [Equinox+ program personalisation](https://mobbin.com/flows/754cee5d-c1f4-44a7-9ae9-5e09474db3a3), [pliability tailoring](https://mobbin.com/flows/ba530414-fbc6-4e1f-a353-bbed6c52305a), [Gentler Streak onboarding](https://mobbin.com/flows/8d4fa57c-1176-4557-8d5c-4d241bfdf9d4) |
| Libraries | [Bevel library with filter chips and custom row](https://mobbin.com/screens/94988760-0ae2-467d-bf83-0a0cb5f164aa), [Equinox+ movement count](https://mobbin.com/screens/6212b5c1-62d3-4404-84a1-0d6cce54e2a3), [Tonal movements](https://mobbin.com/screens/232141a3-3ec8-43e8-b8ff-03ba2385616a), [Gymshark exercises](https://mobbin.com/screens/999c620e-6d97-4d7c-a193-3fd19fc02e0d), [Hevy active filter chips](https://mobbin.com/screens/c1522754-cbe8-4738-81fe-0c8292fa5364), [Apple Fitness+ category](https://mobbin.com/screens/111d4496-bdc8-4abb-ad5d-6d6527e4d38f) |
| Progress and analytics | [Gymshark Dashboard / Challenges tabs](https://mobbin.com/screens/fc1a8eac-366c-4b9a-97be-25d9e7fe69ed), [Gentler Streak week vs last week](https://mobbin.com/screens/81ddb60b-a773-448c-b64a-92cef5221268), [Strava sentence headlines](https://mobbin.com/screens/8d71697d-b15c-4ebe-8f31-cc348fd9f115), [Bevel strength progression](https://mobbin.com/screens/2bb47d83-d7d3-4ccb-9852-afbdee9dc32e), [Noom trends](https://mobbin.com/screens/bc828129-6dd9-43ee-8ed6-5105f6193034), [Hevy exercise metric chips](https://mobbin.com/screens/80f164aa-c011-4469-ba7a-158116427cab), [Future metrics with Today / This week / Last week footer](https://mobbin.com/screens/91b89ddc-9fad-4d26-8219-3260c3d1d3b3), [Cal AI streak and goal](https://mobbin.com/screens/1c2836f3-bfa9-4d62-bb0b-1ff046f42dd7) |
| Streaks and habits | [Strava streak widgets](https://mobbin.com/screens/1c996718-ab94-4247-85b3-80885bab44c9), [Hevy widgets](https://mobbin.com/screens/2e109a73-9c45-4f56-94fb-062038f53a6e), [pushr this-week capsules](https://mobbin.com/screens/b06889cf-967c-4a69-b741-4f084b98fe82), [pliability weekly progress](https://mobbin.com/screens/eaebf242-70e3-4b84-a353-bada351e8ace), [Withings trends](https://mobbin.com/screens/4f910ac9-dadf-443e-a79c-9bfc293ee5af), [Tonal week streak](https://mobbin.com/screens/4e2df17b-d095-46a1-8c41-c9394ab83f24) |
| Calendar and history | [Ladder activity calendar](https://mobbin.com/screens/77f6e5fc-a338-46af-9061-595d124fa24f), [Hevy calendar widget](https://mobbin.com/screens/cccc44e1-40c4-4699-9e6a-542a4212b7e7), [pliability day selected](https://mobbin.com/screens/71a51c06-3b92-44ca-906a-b6645b9f1002), [Centr calendar with type glyphs](https://mobbin.com/screens/12af1edf-23b6-4421-971f-642aa09da194), [Tempo week highlight](https://mobbin.com/screens/345f6663-ce9b-438c-81be-710cec6c77cb), [Life Reset repeat session](https://mobbin.com/screens/cc1ebc0e-9721-4069-9616-dea50259b787) |
| Home | [Peloton streak sentence and period stats](https://mobbin.com/screens/0cd621cb-59a9-46b3-ad46-86d7a5886474), [Tonal today hero with date strip](https://mobbin.com/screens/9e3ecc20-23ec-4ee6-bcbf-1cbe5c71d50b), [Runna today with pinned Record](https://mobbin.com/screens/57dd0758-c29a-49cc-9ec1-cab66ee22485), [Future today card](https://mobbin.com/screens/7381582a-b1e7-4598-a33c-d167466de0c2), [Tempo weekly target](https://mobbin.com/screens/3442b6f8-27ba-4057-96dd-d5c69079ac4b), [pliability week](https://mobbin.com/screens/b62047d8-6316-4f44-937f-1bd8ebb470a9) |
| Body | [Alma plain-language change](https://mobbin.com/screens/f28eba19-4f70-46e3-aa06-78501c448430), [MacroFactor average and difference](https://mobbin.com/screens/c2f3e235-31c3-42fe-8039-a11673634cff), [Withings trend label](https://mobbin.com/screens/b0d85258-5c8a-44f9-9934-de2b087086a0), [MyFitnessPal start / current / change](https://mobbin.com/screens/3415f72a-4f7c-4011-8984-62dd27a54826), [Noom start / current / change](https://mobbin.com/screens/dcd65d53-0134-419d-8a5a-3aa41ad45dfa) |
| Settings and theme | [DailyArt inline segments](https://mobbin.com/screens/2ff45f47-5a5e-4606-8878-791251a976ab), [Box Box Club grouped settings](https://mobbin.com/screens/0f012bf8-67ac-47b3-8d70-2cb7a08ee929), [Weather Channel option cards](https://mobbin.com/screens/5d319665-18a7-4507-afbb-0a038895e391), [Waymo theme list](https://mobbin.com/screens/5271e88c-9fc1-4e54-8f7b-f93d01caaa5f), [Tide Guide grouped units](https://mobbin.com/screens/1f9658c8-e60a-48dd-80b3-91e4cf469fb6) |

### Round 1 (Forge, still in force)
Round 1 covered Hevy, Bevel, WHOOP, Runna, Peloton, Tonal, Centr, Ladder, Crouton, Equinox+, pliability, Gymshark, Gentler Streak, Strava, Yazio, Duolingo, adidas Running, MyFitnessPal, MacroFactor, Alma, Withings, Garmin, Air NZ, DailyArt, Ultrahuman, Box Box Club and Base. It studied:
- set tables
- keypad sheets
- rest rings
- superset rails
- onboarding flows
- libraries
- exercise analytics
- streak calendars
- body metric chips
- summaries
- settings

Its findings are folded into the patterns below.

---

## 2. Useful patterns identified

**Live workout (the biggest change)**
- **A "now" panel in the thumb zone.**
  - Centr, Ladder, Future and Bevel all put the current thing at the bottom: exercise name, "set 2 of 4", the numbers and one large action.
  - Runna pins Pause / Next to the bottom edge, and pushr gives the one number that matters the whole screen.
  - The shared idea: the list is for overview, and the bottom panel is for doing.
- **Rest tells you what's next.** Hevy's live activity reads "Next: set 2 of 3 (110 kg × 5–6 reps)" beside −15 / +15 / Skip. Centr shows "Up next" under the timer. Resting is when you prepare the next set.
- **Steppers beside the value.** Ladder and Future put ± next to the number, because mid-set you nudge a value far more often than you type one.
- **Block progress.** Peloton's "0/7 blocks" bar is split per block. A segment per exercise shows where you are in the session, not just a percentage.
- **Kept from round 1:** the set table (set, previous, load, reps, done), tap-to-copy last time, the green completed row and the keypad sheet with plate steps.

**Home and streaks**
- **One "this week" card.**
  - pushr, pliability and Strava put weekday capsules, the weekly target and the streak count in one card.
  - Peloton writes the streak as a sentence ("You have a 1 week streak going").
  - Future and Withings add a footer of small period stats.
- **One hero for today** (Tonal, Future, Runna): the planned session, what's in it, and a single start button. Everything else on Home is smaller than it.
- Recent achievements as a compact horizontal row (Apple Fitness+ awards, the Hevy widgets) instead of a long list.

**Progress and analytics**
- **Tabs split a long analytics page**: Gymshark Dashboard / Challenges, Strava Progress / Activities, Future Goals / Metrics, Noom Trends / Insights.
- **Sentence headlines.** Strava writes "You've done 3 activities so far this month, up from 0". Noom writes "1396 average daily calories", and Gymshark "13 Workouts". The chart's title *is* the takeaway.
- **This period vs last period** (Gentler Streak), with a delta chip.
- **Kept from round 1:** the per-exercise sparkline list (Bevel), metric chips that switch the chart (Hevy), and records as cards on mobile.

**Library**
- The title acts as the nav bar, with search pinned directly under it and filter chips under that (Bevel, Hevy). Content starts in the first third of the screen.
- "Add custom exercise" is a row in the list or an icon in the header, not a big button (Bevel, Gymshark "+").
- A result count ("1173 Movements", Equinox+) and alphabetical sections (Tonal, Gymshark).

**Calendar and history**
- A month grid where trained days are filled (Ladder, Hevy), and a selected day gives a summary strip (pliability "Day selected · Total time").
- **Type glyphs on calendar days** (Centr: triangle, square, circle per activity type). Here that means strength days versus aerobic-only days.
- "Repeat this session" from a past day (Life Reset). Overload gains a **Repeat workout** action on workout detail. It starts a new session with the same exercises, set types, rest and supersets, and loads come from last time.

**Body**
- **A plain-language change line**: Alma's "You're 2 kg down this week", Withings' "Losing weight ↘". The number is not left for the user to interpret.
- A START / CURRENT / CHANGE triplet (MyFitnessPal, Noom) and range pills under the chart (MacroFactor, Alma).

**Onboarding**
- One question per screen, a step counter and a thin bar, Skip top right, the CTA pinned (Tonal, Equinox+, pliability).
- A confirmation summary before committing (Tonal "Your Training Goals are set").
- A welcome screen that *shows* the product (Gentler Streak's activity path, Tempo's coaching preview) instead of listing features.

**Settings**
- Grouped inset lists with inline segmented controls (DailyArt, Tide Guide).
- **Choices shown as option cards with a preview or description** (Weather Channel units, Waymo theme). The theme choice becomes three small previews of the app.

---

## 3. Patterns intentionally rejected

| Pattern | Seen in | Why it is rejected |
| --- | --- | --- |
| Video or photo-led workout player | Centr, Future, Tempo, Ladder | Overload is offline and asset-free. The now panel keeps the *structure* (current set, big action at the bottom) with stamped numerals instead of video. |
| Full-screen one-set-at-a-time player that replaces the list | pushr, Tonal | Lifters check earlier sets and jump between superset exercises. Overload keeps the table for overview and adds the now panel, so neither is lost. |
| Swipe-to-complete | Peloton | Hard with chalky or sweaty hands, invisible to screen readers, and slower than a tap. The now panel uses a 60 px button instead. |
| Centre "+" tab-bar button | Bevel, Cal AI, Future | It would push a destination out of the tab bar. Starting a workout already has the Home hero, the routine cards and the mini player. |
| Collapsing finished exercises | Some loggers | It hides rows you still edit (a typo in set 2), and it changes the page height under your thumb mid-session. |
| Gamified streak mascots, confetti, coins, "I'm procrastinating" buttons | Gentler Streak, Noom, Life Reset, Duolingo | Pressure mechanics do not fit a private training log. The streak stays honest: weeks trained, best ever, next milestone. |
| Saturated full-bleed gradient pages | GO Club, Life Reset | They hurt legibility in a bright gym. The brand gradient is used only on the one hero surface per screen, where it matches the app icon. |
| Floating "Filter" pill over the list | Tonal, Equinox+ | It collides with the floating tab bar. Filters stay as a chip row under the search field. |
| Alphabet scrubber | Gymshark | Unreliable on the web and fiddly to hit. Search and section headers cover it. |
| Leaderboards, "strength level vs others", social feeds | Hevy, Ladder, Tonal | No population data, and the app is private by design. |
| Calories, heart rate, strain | Bevel, WHOOP, Gentler Streak | Wearables are out of scope. Showing empty metrics would be dishonest. |
| Ruler, scroll-wheel and dial pickers | Tonal | Slow for exact loads and poor for screen readers. The keypad and steppers are used instead. |

---

## 4. Design system: Forge 2

### Visual direction
Overload should feel like **a quiet, premium training companion**: calm surfaces, big honest numbers and one deep indigo accent that means *this is what to do now*. Forge 1 was built from borders. Forge 2 uses **elevation, space and type**:

1. **Words in Inter, numbers stamped.**
   - Titles, names and labels move to sentence-case Inter.
   - The condensed Barlow face is kept for numerals (loads, reps, timers, totals) and the wordmark, so numbers become the hero of every screen.
2. **One indigo hero per screen.**
   - The surface that matters most (today's session, the rest timer, the progress headline, current bodyweight) sits on a deep indigo gradient.
   - It matches the app icon, carries a white primary button, and there is never more than one per screen.
3. **Borderless cards.**
   - In light mode, white cards float on a cool grey canvas with a soft two-layer shadow.
   - In dark mode, tonal steps plus a 1 px inner highlight separate surfaces.
   - Hairlines are used only *inside* cards, to split rows.
4. **The plate ring, the segment bar and effort shapes** stay the signature graphics.

### Colour tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#F2F2F6` | `#0B0B0F` | Canvas |
| `surface` | `#FFFFFF` | `#17171C` | Cards, sheets |
| `surface-2` | `#F1F1F5` | `#212128` | Inputs, set cells, secondary buttons |
| `surface-3` | `#E6E6EC` | `#2B2B33` | Pressed, tracks |
| `line` | `#E7E7ED` | `#26262E` | Hairlines inside cards |
| `line-strong` | `#CFCFD8` | `#3D3D47` | Input outlines, dashed empty states |
| `ink` | `#18181B` | `#F4F4F5` | Primary text |
| `ink-2` | `#3F3F46` | `#CACAD1` | Secondary text |
| `muted` | `#52525B` | `#A6A6B0` | Labels, captions (6.9:1 on canvas, 7.4:1 on a dark card) |
| `accent` | `#4338CA` | `#9A94FF` | Primary action, progress, the next set |
| `accent-soft` | `#ECEBFC` | `#25234A` | Tints, selected rows |
| `good` | `#137537` | `#43BF78` | Logged, complete, easy effort, aerobic minutes |
| `warn` | `#A34A06` | `#F0A64A` | Hold, hard effort, warm-ups |
| `danger` | `#B91C1C` | `#F4817B` | Destructive only |
| `hero` | gradient `#2E2A7A → #1B1846` | same | The one hero surface per screen |
| `on-hero` / `on-hero-muted` | `#FFFFFF` / `#C9C6F2` | same | Text on hero (12.2:1 / 7.4:1 at the lightest point) |

Inside the hero, tokens are re-scoped:
- **Accent becomes white.** Primary buttons and rings are white, and text on them is `#2B2780` (12.3:1).
- **Accent text becomes lavender** `#C7C3FF` (7.3:1).
- **Good becomes** `#6EE7A0` (7.9:1).

Each colour keeps one meaning, and effort remains shape plus colour: a green circle for easy, an indigo diamond for moderate and an amber triangle for hard.

### Typography

| Role | Face | Size / weight | Notes |
| --- | --- | --- | --- |
| Large title | Inter | 30 px / 700, 34 px on desktop, −0.022em | Sentence case. One per page. |
| Section title | Inter | 17 px / 650 | Sentence case, with an optional muted count |
| Card title / names | Inter | 16–20 px / 600 | Routine and exercise names |
| Body | Inter | 15 px / 400 | Secondary text is 13 px |
| Eyebrow | Inter | 11 px / 600, +0.12em, uppercase | Stat labels only |
| Numerals | Barlow Condensed | Hero 56–72, stat 30–34, inline 20–24 / 600 | Tabular. Units sit beside at ~45% size in `muted`. |
| Wordmark | Barlow Condensed | 22 px / 700, +0.08em, uppercase | Logo only |

### Spacing scale
The scale is on a 4 pt base: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`.
- **Cards:** padding is 16 on mobile and 20–24 on desktop. The gap between cards is 12 on mobile and 16 on desktop.
- **Sections:** 28 on mobile and 40 on desktop.
- **Page gutter:** 16 / 24 / 40.

### Corner radii

| Radius | Use |
| --- | --- |
| 8 | Badges, set-type chips |
| 12 | Inputs, set cells, list-row highlights |
| 14 | Buttons |
| 20 | Cards |
| 28 | Hero cards, bottom sheets, the now panel, the tab bar |
| Pill | Chips, segmented controls, the mini player, weekday capsules |

### Shadows

| Token | Light | Dark |
| --- | --- | --- |
| `shadow-card` | `0 1px 2px rgb(16 16 40/.04), 0 8px 24px -12px rgb(16 16 40/.12)` | none, plus a 1 px inner ring `white/5%` |
| `shadow-float` | tab bar, mini player, toasts | deeper black shadow |
| `shadow-sheet` | dialogs, sheets | deeper black shadow |
| `shadow-hero` | `0 12px 32px -12px rgb(46 42 122/.55)`, an indigo glow under the hero | reduced |

### Icons
- **Set:** lucide, outline, 2 px stroke.
- **Sizes:** 20 inline, 22 in navigation, 16 in chips.
- **Active navigation:** the icon turns indigo and its stroke goes to 2.4.
- **Icon tiles:** 40 px, 12 radius, `surface-2`, or `accent-soft` when they carry meaning.
- **Labels:** an icon never stands alone. It always has visible text or an `aria-label`.

### Motion principles
- **Short and physical.**
  - Presses scale to 0.97 over 120 ms.
  - Sheets and the now panel rise over 240 ms with `cubic-bezier(.2,.7,.2,1)`.
  - Pages fade and rise 6 px.
- **Feedback on commitment.**
  - Logging a set pops the check (250 ms), flashes the row green and triggers a short vibration where supported.
  - The now panel slides its content to the next set.
- **State changes cross-fade.** The now panel swaps between *log*, *rest* and *done*, and number steppers tick without layout shift because they use tabular numerals.
- **Continuous timers.** The rest ring drains smoothly with a 200 ms tick.
- **Reduced motion.** `prefers-reduced-motion` reduces every animation to an instant change.

### Charts
- **Headline first.** Every chart card opens with a sentence or big number that states the takeaway ("12,882 kg this week, 72% below last week"). The chart is the evidence.
- **Colour:**
  - A single series is indigo with a 18%→0 area wash, and the current period is at full strength while past periods are at 55%.
  - Aerobic uses `good` green, so its meaning holds across Home, Progress and the summary.
  - A second series uses the teal `series-2`, always with a legend.
- **Marks:**
  - Lines are 2 px.
  - Bars are at most 24 px wide, with a 4 px rounded top and a square base.
  - Effort dots use the effort shapes.
- **Axes and grid:** hairline gridlines, no axis lines, 12 px muted ticks, k-abbreviated values.
- **Accessibility:** a tooltip on hover or tap, an `aria-label` summary on the figure, and the numbers restated nearby in tiles or a table.
- **Sparklines:** 2 px indigo with an end dot and no axes, used only in lists.

### Forms
- **Labels:** 13 px `ink-2`, above the field. Hints sit below in muted text, and errors sit below in `danger` with `role="alert"`.
- **Inputs:** 48 px tall, filled `surface-2`, 12 radius. Focus shows an indigo border plus a 3 px ring at 25%.
- **Choices:**
  - segmented control for 2–4 options
  - chips for multi-select
  - option cards (icon, title, description, radio) for onboarding and settings
  - A selected *choice* (a day, a rest time, a theme) fills indigo. An active *filter* chip inverts to ink. The two never share a look.
- **Placeholders:**
  - Ghost values such as last time's load in an empty set cell use `muted` at full strength (at least 4.5:1).
  - They are distinguished from entered values by weight of colour (`muted` vs `ink`), never by fading them below contrast.
- **Numbers:**
  - The live workout uses the keypad sheet (plate steps ± and Log set) and the now panel's ± steppers.
  - Elsewhere, numeric inputs, with ± steppers for small integers.
- **Validation** runs on submit, then updates live on the field in error.

### Empty states
Every empty state has the same shape:
1. A 56 px icon tile on `accent-soft`, with a small plate-ring motif behind it.
2. A one-line title that talks about what *will* appear.
3. One sentence on why it's worth it.
4. **One** primary action, plus an optional quiet secondary.

The container is a soft card, not a dashed box. Wording never says "No data".

### Mobile behaviour
- **Top of page:** only Home shows the logo bar. Every other page starts with its large title and puts page actions (an icon button or a small button) on the title row.
- **Tab bar:** a floating pill (28 radius, blurred surface, 12 px above the safe area) with Home, Routines, History, Progress and More.
- **Mini player:** docks above the tab bar while a workout runs.
- **Live workout and editors enter focus mode:**
  - The tab bar hides.
  - The live workout gets the **now panel**, a bottom sheet-like card that holds everything needed mid-set.
  - Editors get a sticky save bar.
- **Thumb zone:** every frequent action on a phone sits in the bottom 40% of the screen. Finish and discard sit at the top, deliberately harder to hit.
- **Touch targets:**
  - 44 px minimum everywhere
  - 52 px for set cells
  - 56–64 px for the now panel's steppers, keypad keys and the Log set button
- **Sheets and layout:**
  - Dialogs become bottom sheets under 640 px.
  - Nothing scrolls horizontally except deliberate carousels (records, metric chips), which snap and show a partial next item.
  - The layout holds at 360 px.

### Accessibility rules
- **Contrast:** text at least 4.5:1, large numerals and UI boundaries at least 3:1, checked in both themes and on the hero gradient.
- **Colour is never the only signal:**
  - Logged sets also get a check.
  - Set types get letters (W, D, F).
  - Effort gets a shape.
  - Calendar day types get a glyph as well as colour.
  - Charts get legends.
- **Keyboard:**
  - Every control is reachable, with a 2 px indigo focus ring.
  - Sheets trap focus and close on Escape.
  - The keypad takes physical keys.
- **Roles:**
  - `radiogroup` / `radio` for segmented controls and option cards
  - `switch` for toggles
  - `checkbox` for set completion
  - `timer` for rest
  - `tablist` / `tab` for the Progress tabs
  - `region` with a label for the now panel
- **Live regions:**
  - The set count and toasts are announced.
  - The now panel announces the next set when it changes.
- **Preferences:** `prefers-reduced-motion` and `prefers-color-scheme` are honoured.
- **Text size:** text scales with the browser, and no layout depends on fixed text heights.

---

## 5. Page-by-page redesign plan

| Page | Redesign |
| --- | --- |
| **App shell** | The mobile logo bar appears only on Home, and other pages open on their large title. The tab bar and mini player take Forge 2 styling (blurred surface, indigo mini player). The desktop sidebar is quieter: it has no borders, the active item gets a soft tint, and "Start workout" sits at the top. |
| **Onboarding** | Sentence-case questions. The welcome screen **shows the product**: a live-looking stack made from the real components (a logged set row, the rest ring, a streak capsule row), with "takes about a minute". Option cards get the Forge 2 radio style. The review screen restates every answer on one grouped card, then previews the generated plan as numbered routine cards. The CTA stays pinned. |
| **Home** | Hierarchy in three levels. (1) The greeting and the **Today hero** (indigo gradient, routine, muscles, time, white Start button, Preview). (2) One **This week card**: weekday capsules with checks, "2 of 4 sessions" with a segment bar, then a footer of three period stats (streak, aerobic minutes against the target in green, volume with a delta chip). (3) **Recent records** as a snap carousel, recent workouts, bodyweight, and "start an empty workout" as a quiet row. The four separate cards are gone. |
| **Exercise library** | A compact large title with the count, and a "+" icon button (New exercise). Search is sticky with the filter chips directly under it, so the first exercise appears in the top third. The result count and A–Z / Most used segment sit on one line. Flat alphabetical sections, with monogram tiles and a star. |
| **Exercise detail** | A header card with the monogram, muscles and equipment. A **hero stat** (est. 1RM or best reps) with best set and sessions beside it. Metric chips drive the chart, followed by personal records and session history as stamped set chips. |
| **Routines** | Large title with a "+" New routine action. A **Quick start** row (empty workout). The program is grouped with the plan strip showing which day is up next. Each routine card has its name, day badge, exercise preview, time and muscle chips, with a full-width Start button and a ⋯ menu. |
| **Routine editor** | A sticky summary (time, sets, muscles). Exercise cards have steppers for sets and inline rep range and rest fields. The superset link node sits between cards, and linked cards get an indigo rail. There is a sticky Save / Save & start bar. |
| **Live workout** | A sticky compact header (minimise, name and clock, ⋯, **Finish** always at the top) with a **segmented progress bar, one segment per exercise**, and live volume, sets and aerobic minutes. The set table is kept (52 px cells, tap-to-copy, up-next ring, effort badges, superset rails). The new **now panel** is fixed in the thumb zone and has three states: <br>• **Log:** exercise name, "Set 2 of 4", last time, then two big steppers (−/+ load and −/+ reps, 64 px, tap the number for the keypad) and a 60 px **Log set** button. Aerobic work shows −/+ 5 min and **Log minutes**. <br>• **Rest:** the indigo hero with the ring, a big countdown, **"Next: Leg Press · set 3 of 4 · 180 × 11"**, −15 / +15 / Skip, and the effort rating for the set just done. It can still expand to full screen. <br>• **Done:** "All sets logged", then Add exercise and Finish workout. <br>Add exercise also stays at the end of the list. |
| **Workout summary** | An indigo hero with a stamped check, "Workout #N", the name and the date. A 2×2 stat grid, a completion bar, records, how it felt, muscles worked, then an exercise table. Done is the primary action. |
| **History** | Large title with a List / Calendar segment. A **month summary** strip (workouts, volume, streak) plus the per-month chart. The calendar marks days with a **filled indigo circle for strength and a green ring for aerobic-only days**, and a selected-day summary strip lists that day's sessions. The list is grouped by month into cards with a date tile, name, stats line, exercise preview and a PR badge. |
| **Workout detail** | Hero stats (duration, volume, sets, records) and a set table per exercise with an effort column. Edit mode reuses the live cards and the keypad. Repeat workout is a primary action. |
| **Progress** | Large title with the range segment. **Tabs: Overview · Strength · Records.** <br>• **Overview:** the indigo headline hero (total volume with a delta), stat tiles, then chart cards whose titles are the takeaway (volume per week, workouts per week, aerobic minutes with the guideline, muscle split). <br>• **Strength:** the sparkline list and the big chart with effort dots. <br>• **Records:** a searchable record list, as cards on mobile and a table on desktop. <br>`#records` and `#aerobic` deep links open the right tab. |
| **Body** | An indigo hero with the current bodyweight and a **plain-language change line** ("Down 0.6 kg in the last 30 days"), plus 30- and 90-day tiles. Metric chips drive START / CURRENT / CHANGE and the chart, with range pills below it. Entries are grouped by month, with edit and delete per row. "Log entry" sits on the title row. |
| **Settings** | A profile header card. **Appearance uses three preview cards** (Light, Dark, System, each a miniature of the app). Units use two option cards. Workout defaults, the aerobic target and data tools stay in grouped inset lists. The danger zone is separated at the bottom. |
| **Empty states** | The unified component (icon tile with ring motif, title, one sentence, one action) on Home, History, Progress, Body, Library, Routines, Exercise detail and the live workout. |

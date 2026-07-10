# CLAUDE.md — Workout Tracker

## What this is
Personal workout tracker web app. One user (Jon), used on an iPhone browser mid-workout at the gym. Phone-first UI: big touch targets, readable at arm's length, works one-handed with sweaty thumbs.

## Tech stack
- React (Vite) 
- localStorage is the source of truth (offline-first). Optional **Supabase** cloud sync (username + password auth — username maps to a synthetic `@workoutbuddy.app` email; "Confirm email" must stay OFF in Supabase) backs it up so iOS's ~7-day eviction can't lose history — off until credentials are set in `src/supabaseConfig.js`. "Use offline" on the login screen skips sync entirely.
- Data: exercises hardcoded in `src/data/exercises.json`; workout history in localStorage, synced to Supabase when configured
- Hosting: GitHub Pages
- Target device: iPhone 17 Pro Max, Safari, added to home screen

## Core screens
1. **Home** — 4 day mega-buttons (Mon–Push / Wed–Pull / Fri–Legs / Cardio) with per-day photo backgrounds. Tap → Day screen.
2. **Day** (middle) — whole-workout tracker (Start/Finish → live elapsed from a stored startedAt timestamp, "N of M done" derived from today's logged sets, Restart) + that day's exercise list (done ones get a ✓). Pencil beside the title toggles edit mode: tap exercises to disable/re-enable them for the day (disabled ones are hidden outside edit mode; counts use enabled only; History keeps their sessions). Lifting days also get a collapsible **Cardio finisher** card (the Cardio day's enabled exercises, tappable to log, ✓ when done today, not counted in "N of M"). Tap an exercise → Exercise. Back → Home.
3. **Exercise** — YouTube embed (iframe), written form cues below it, then live session zone: weight input, large rep counter buttons, "Finish set" button that logs the set and auto-starts the rest timer. Back → Day.
4. **History** — a "Workouts" feed (newest-first, capped at 8 + "Show all", each expandable to the exercises done that day, two-tap deletable), then per-exercise collapsible accordions (PR summary on the closed row; sessions with two-tap delete inside). Export JSON + sign-out/log-in live at the bottom, de-emphasized.

## Data shapes
```json
// exercises.json entry
{
  "id": "goblet-squat",
  "name": "Goblet Squat",
  "day": "Fri — Legs",
  "target": { "sets": "4", "reps": "10–15" },
  "tracking": "weighted | reps-only | time | cardio (optional, default weighted)",
  "videoUrl": "https://www.youtube.com/embed/VIDEO_ID (optional — omit to hide the video frame)",
  "instructions": ["Cue 1", "Cue 2"],
  "restSeconds": 90
}

// localStorage store (key: "workout-tracker:v1")
{
  "schemaVersion": 1,
  "sessions": [
    {
      "exerciseId": "goblet-squat",
      "date": "2026-07-06",
      "unit": "lbs",
      "sets": [{ "reps": 8, "weight": 50, "failure": true }]
    }
  ],
  "workouts": [
    { "date": "2026-07-06", "day": "Fri — Legs", "startedAt": 1783466550465, "endedAt": 1783470000000 }
  ],
  "disabled": {
    "preacher-curl": { "off": true, "at": 1783680117103 }
  }
}
```
`workouts` is one record per calendar date (whole-day timer). `endedAt` null = in progress. Backfilled to `[]` in loadStore for old stores. "Exercises done" is derived from `sessions`, not stored here. `failure` on a set is optional (present only when true); time-mode exercises store seconds in `reps`, non-weighted modes store `weight: 0`; **cardio** mode stores minutes in `reps` and miles in `weight` (0 = distance unrecorded) — no schema change. Cardio exercises use `target: { goal: "20–40 min" }` (rendered as a "Goal:" line) and `restSeconds: 0` = no auto rest timer after logging. `disabled` maps exerciseId → `{ off, at }` (Day-screen edit mode); entries keep their timestamp so sync merges toggles last-write-wins — backfilled to `{}` for old stores.

## Conventions
- Weight unit: lbs for now (gym plates); revisit if it bugs me
- Timer must keep running / recover sanely if the phone locks or Safari backgrounds the tab — test this specifically, it's the most likely real-world failure
- Written instructions must be useful WITHOUT the video loading (bad gym reception)
- Keep dependencies minimal; no UI framework unless there's a concrete reason

## Out of scope for v1 (do not build unless asked)
Charts/graphs, in-app exercise editing, PWA service-worker/offline-launch (the app still needs network to *load* — sync makes data durable, not the shell offline). (Cloud sync + accounts were added for the RC — see changelog.)

## Build order / status
- [x] 1. Repo scaffold + this file + exercises.json + Home list rendering
- [x] 2. Exercise screen (embed, cues, weight input, rep/set counter)
- [x] 3. Rest timer (auto-start on finish set, vibrate/sound at zero)
- [x] 4. History to localStorage + "last time" display
- [x] 5. History screen + JSON export
- [x] Ship to GitHub Pages (pipeline live as of step 1 — https://psybuster05.github.io/workout-buddy/ — every push to main deploys)

## Decision log
- 2026-07-06 — Project scoped in Chat. Pivoted from idle-miner idea to workout tracker for smaller, finishable scope. Repo is canonical source of truth; Chat project is design-only; no Cowork for this project.

## Changelog

### 2026-07-06 — Init decisions
- Vanilla JS, no build step. Single index.html, screens toggled via JS. No router.
- Exercise data lives in data/exercises.js as a JS const (not fetched JSON) so file:// local testing works.
- Data schema: days array (ordering) + exercises object keyed by id. Fields: name, videoUrl (embed format), instructions (array of cues), restSeconds.
- localStorage: single key "workout-tracker:v1", { schemaVersion, sessions[] }. Sessions are flat entries: exerciseId, ISO date, unit, sets[{reps, weight}].
- Weights logged in lbs; unit stored per session anyway.
- Known risk: iOS may evict localStorage after 7 days of no visits. Mitigation is the JSON export button (build order step 5), not cloud sync.
- Phone-first meta tags (viewport, apple-mobile-web-app-capable, apple-touch-icon) in the shell from commit one.

### 2026-07-06 — Stack revision: React
- React via Vite (user decision: workplace uses React, this project doubles as learning it). Supersedes the vanilla JS decision from earlier today.
- No React Router — three screens switched with useState in App.jsx.
- Exercises back to src/data/exercises.json, imported via bundler (file:// concern moot now that npm run dev exists).
- vite.config.js MUST set base: '/workout-tracker/' (matching repo name) or GitHub Pages serves a blank page.
- Deploy via GitHub Actions workflow (actions/deploy-pages), Pages source set to "GitHub Actions". Deploying = git push, no manual build ritual.
- storage.js stays a plain JS module (not a hook/component) — localStorage read/write + JSON export.
- All prior schema decisions (exercise data shape, localStorage "workout-tracker:v1" key, sessions format) unchanged.

### 2026-07-06 — Step 1 built (scaffold + Home)
- Local folder (and therefore repo) is named **workout-buddy**, so vite base is `'/workout-buddy/'` — supersedes the `'/workout-tracker/'` note above. Rule stands: base must match repo name.
- exercises.json shape: `{ days: [...], exercises: [...] }` — days array for display ordering, exercises as an array of entries per the Data shapes section (reconciles the "object keyed by id" note above; array + `.find()` won out for simplicity).
- Screens switched via useState in App.jsx as planned; Home in src/screens/, Exercise screen is a stub until step 2.
- Starter exercise list is a 3-day Push/Pull/Legs guess with best-effort YouTube IDs — Jon should swap in his real program and preferred videos.
- Deploy: .github/workflows/deploy.yml (npm ci + build + actions/deploy-pages on push to main).
- Shipped 2026-07-06: repo psybuster05/workout-buddy, live at https://psybuster05.github.io/workout-buddy/. Pages source had to be set to "GitHub Actions" manually — configure-pages `enablement: true` fails because GITHUB_TOKEN can't create the Pages site (needs repo admin); tried and reverted.

### 2026-07-06 — Step 2 built (Exercise screen)
- src/screens/Exercise.jsx: 16:9 YouTube iframe (loading=lazy), cues list, session zone (weight number input, −/rep count/+ buttons, Finish set).
- Set state is in-memory only for now: sets[] lives in the Exercise component and resets on leaving the screen. localStorage persistence is step 4; the `// step 3: auto-start rest timer here` comment in finishSet marks the timer hook-in point.
- Rep counter uses functional setState updaters — plain `setReps(reps + 1)` dropped updates under rapid same-task clicks (stale closure).
- Finish set is disabled at 0 reps; reps reset to 0 after each set, weight persists between sets.

### 2026-07-06 — Step 3 built (rest timer)
- src/components/RestTimer.jsx, auto-started by finishSet with the exercise's restSeconds; finishing another set restarts it (keyed on endsAt), Skip / tap-when-done dismisses.
- Lock-survival design: countdown derives from an endsAt wall-clock timestamp every 250ms tick (+ immediate tick on visibilitychange/pageshow) — never a decrementing counter, so iOS suspending JS can't drift it. Verified logically; still needs the real-phone lock test.
- End-of-rest alert: navigator.vibrate (guarded — iOS Safari doesn't support it, Android does) + 3 rising WebAudio beeps. AudioContext is created/resumed on the Finish-set tap (iOS requires a user gesture to unlock audio).
- Late-return rule: alert only fires if rest ended <3s ago — coming back to the tab minutes later shows the "Rest over — go!" state without a pointless beep.
- Known iOS limits, accepted: no sound while phone is locked/Safari suspended (timer state is still correct on return), and the ringer/silent switch mutes WebAudio.

### 2026-07-06 — Step 4 built (localStorage history + last time)
- src/storage.js per plan: plain module, key "workout-tracker:v1", { schemaVersion: 1, sessions[] }, sessions { exerciseId, date, unit, sets[] }. Data shapes section above updated to match (it still showed the old "history"-key sketch).
- Every Finish set writes through to localStorage immediately (one session per exercise per day, sets appended) — Safari killing the tab mid-workout loses nothing. Reopening the exercise screen the same day reloads today's sets.
- Dates are LOCAL YYYY-MM-DD, not toISOString() — a 9pm workout must not land on tomorrow's UTC date.
- "Last time" = most recent session from a previous day (today's sets are not "last time"). Uniform sessions format as "3×8 @ 45 lbs", mixed as "10×30, 8×35 lbs".
- Weight input prefills with the last session's final set weight (small UX add beyond spec).
- Resilience tested: corrupt store JSON → empty store, app runs, next set rewrites it; saveStore catches quota/private-mode throws so logging never crashes mid-workout.

### 2026-07-06 — Step 5 built (History screen + export) — v1 COMPLETE
- src/screens/History.jsx, reached via a History button in the Home header. Grouped per exercise (exercises.json order), sessions newest-first, empty exercises omitted.
- Session formatter shared with the Exercise screen's "last time" line via src/format.js.
- Export JSON: blob download named workout-history-YYYY-MM-DD.json (pretty-printed full store). On iPhone Safari it lands in Files via the download sheet.
- All 5 build-order steps done. Remaining known gaps, all deliberate: real-phone test of timer lock recovery + beep audibility; starter exercises/videos are placeholder-ish until Jon swaps his real program in.

### 2026-07-06 — Real program loaded (WFH MWF, normal version)
- exercises.json replaced with Jon's actual program from WFH_Workout_Normal_Version.pdf: Mon — Push (4), Wed — Pull (5), Fri — Legs (4). Days renamed to "Mon — Push" etc.
- New schema field: `target` (free string, e.g. "3–4 × 8–12", "3–4 sets", "2–3 × 8–10 / leg"), shown as a "Target:" line above "Last time" in the session zone.
- restSeconds: 90 for ALL exercises (user decision: rest timer is 1:30 across the board).
- Every videoUrl verified real via YouTube oEmbed; new-exercise videos found via YouTube search (e.g. at-home preacher curl variant, since WFH = no preacher bench).
- ids kept stable for carried-over movements (flat-dumbbell-press = the bench press, dumbbell-row, calf-raise, overhead-press, goblet-squat, romanian-deadlift) so existing localStorage history stays attached. Old-program-only ids (lat-pulldown, seated-cable-row, bicep-curl, incline-dumbbell-press, tricep-pushdown, leg-press) are orphaned in storage but still present in exports.
- Non-weight/bodyweight entries (hangs, scap pull-ups): weight input can stay 0; hangs log seconds as reps per the cue.

### 2026-07-06 — Weight entry: stepper buttons
- Weight input now has −/＋ buttons stepping ±2.5 lbs (user has adjustable dumbbells with 2.5 lb plates). Keyboard typing mid-workout was annoying; since weight prefills from last session, the common case is one tap.
- Slider rejected (imprecise under sweaty thumbs at ~1 lb/px) and select dropdown rejected (iOS picker-wheel scroll every set).
- The number input stays between the buttons as a keyboard fallback (type=number, spinners hidden); stepper clamps at 0, − disabled at 0, values rounded to one decimal to avoid float artifacts.
- Same functional-updater pattern as the rep counter (rapid taps must not drop).

### 2026-07-06 — Set-for-set prefill + password gate
- Reps now prefill from "last time" too, set-for-set: today's set N starts at last session's set N reps (clamped to its final set when today runs longer). Weight prefills the same way on open but is never auto-changed between sets — mid-session stepper adjustments must not be fought.
- Finish set with an untouched prefill deliberately logs the prefilled reps ("do it again" is the common case).
- Password gate (src/auth.js + src/screens/Lock.jsx): SHA-256 of the password is a constant in the bundle; matching hash stored in localStorage key "workout-tracker:unlock" unlocks the device permanently. Asks once per device/browser. This is a courtesy lock on a public static site, NOT security (client-side, brute-forceable) — acceptable because all data is device-local anyway. Changing the password constant re-locks all devices.
- Confirmed for the record: deploys/builds can never wipe workout history — localStorage lives in the visitor's browser per-origin; only iOS's ~7-day eviction can, which Export JSON mitigates.

### 2026-07-06 — Exercise screen reordered
- Session zone (target/last time/weight/reps/finish/log) moved above the video + cues: the whole tracker fits above the fold, no scrolling past the video every set. Video/cues are reference material — below.

### 2026-07-06 — Per-day accents + unified counters
- src/theme.js: dayAccent(day) — Mon — Push #ee7a52 (coral), Wed — Pull #58a6ff (blue), Fri — Legs #4cc38a (green, the old base accent, still the :root fallback for lock/history-button/export).
- Implementation: `--accent` is overridden inline (style prop) on Home day-groups, the Exercise screen root, and History per-exercise sections — every accent-consuming rule (day headings, list borders, last-time, timer fill, finish button, active states, back button) follows automatically. New days added to exercises.json without a theme.js entry fall back to green.
- Weight and rep steppers unified into shared .counter-* styles: label above ("Weight (lbs)" / "Reps"), identical flex:1 72px buttons, identical 110px centered value. Weight value is still an input (keyboard fallback) styled to be indistinguishable from the rep value; "reps" sublabel under the count removed. Rep − now disabled at 0 like the weight −.

### 2026-07-06 — Sports-app redesign (red/black/white)
- Palette: bg #0a0a0c near-black, brand red #ff3b3b (:root --accent fallback), white text. Day accents retuned: Mon — Push #ff3b3b red, Wed — Pull #f5f5f7 white, Fri — Legs #93a5b8 steel.
- Typography: headings/CTAs are 800-900 weight italic uppercase (system font — no webfont, gym reception rule).
- Backdrop: src/assets/gym-bg.svg — hand-built pre-blurred SVG gym scene (red glows + barbell/dumbbell silhouettes), fixed body::before layer under a readability gradient. Bundled locally on purpose: a hotlinked photo would vanish on bad gym reception. Referenced from CSS via relative url() so Vite rebases it under the /workout-buddy/ base.
- Cards are frosted: rgba surface + backdrop-filter blur (with -webkit- prefix for iOS).
- Page transitions: document.startViewTransition(() => flushSync(update)) in App.jsx's withTransition helper wrapping all screen changes (View Transitions API, iOS 18+; plain switch as fallback). CSS: ::view-transition-old/new fade+slide, wrapped in prefers-reduced-motion: no-preference.
- theme-color and favicon updated to match (#0a0a0c / red).

### 2026-07-06 — Backdrop scrapped; History button, borders, deletable records
- gym-bg.svg backdrop removed (user verdict: not really visible — solid near-black instead). backdrop-filter frosting removed with it (nothing left to blur); surfaces keep their translucent rgba.
- --border lightened 0.08 → 0.16 alpha; History button now accent-red CTA style matching Finish/Export.
- History entries deletable (accidental logs): ✕ on each session row → first tap arms it ("Delete?" in red), second tap deletes; auto-disarms after 3s. Two-tap instead of confirm() — no browser chrome, no accidental single-tap deletes. storage.js deleteSession(exerciseId, date); a session is unique per exercise+date.

### 2026-07-06 — Target copy restructured
- `target` schema changed from free string ("3–4 × 8–12") to `{ sets, reps }` object, rendered as a centered bold two-line block ("Sets: 3–4" / "Reps: 8–12"). Reps key optional — assisted hangs are time-based and show sets only; reverse lunges keep "8–10 / leg" in reps. Data shapes section updated.

### 2026-07-06 — Tracking modes (weighted / reps-only / time)
- New optional exercises.json field `tracking`: weighted (default), reps-only (scap-pull-ups), time (assisted-hangs). Non-weighted modes hide the weight row entirely; time mode turns the counter into seconds (sublabel "sec"; ±1s steps — was ±5s, user preferred 1s).
- Storage unchanged — no migration: seconds live in the reps field (was already the hang convention), weight stays 0 as schema filler for non-weighted sets (never shown, never asked for).
- formatSession(session, mode): weighted "3×8 @ 45 lbs"; reps-only "3×8" / "8, 6, 5 reps"; time "3×30s" / "30s, 25s, 20s". Set log lines mode-aware too.
- NOT in scope (user decision): recording the user's body weight anywhere — possible future feature.

### 2026-07-07 — Day mega-buttons + Day screen with workout tracking
- Home is now 3 `.day-button`s (min-height 132px): the day photo under an accent-tinted `linear-gradient` scrim (`color-mix` of `--accent`), with app-rendered title (`.day-button-title`) + exercise-count subtitle (`.day-button-sub`) bottom-left. New middle **Day** screen (src/screens/Day.jsx): workout timer + the day's exercise list.
- (Superseded the brief "banners baked-in, shown as-is" experiment — Jon swapped to plain action photos and wanted the app-drawn title/color-overlay back.)
- Nav is now Home → Day → Exercise. App tracks `selectedDay`; header back is contextual (`goBack`: exercise→day, else→home). Exercise/Day/History no longer take an `onBack` — the app-header owns it.
- Whole-day workout tracking in storage.js: `workouts[]` (one per date, `{ date, day, startedAt, endedAt }`), `startWorkout`/`finishWorkout`/`todayWorkout`. Elapsed derives from the `startedAt` timestamp (survives reload/close, verified 00:51 across a reload). "N of M done" derived from `todaySession` per day-exercise; done exercises get `.is-done` (dim + ✓) in the day list.
- Day-button photos: **public/days/{push,pull,leg}.jpg** (note `leg`, singular; runtime URL via `import.meta.env.BASE_URL`). Current set = plain action photos (chest press / dumbbell row / barbell squat) Jon dropped in as `push2.jpg`/`pull2.webp`/`leg2.jpg` at mixed sizes+formats. Normalized with **sharp**: `resize(1024×400, fit:cover, position:sharp.strategy.attention)` (subject-aware crop keeps the lifter in frame) → mozjpeg q82 → ~35–48 KB each. theme.js `dayImage(day)` maps day→file; swap the files to restyle, no code change.
- (Earlier the source banners had a checkerboard *baked into pixels* — AI faux-transparency, not alpha; that set was masked out with sharp, but has since been replaced by the plain photos above.)
- **sharp** now a devDependency — image tooling (resize/compress/convert/flatten/crop/mask) available for future asset jobs; run one-off scripts from the project root so `node_modules` resolves. Not imported at build time (Vite doesn't touch it).
- Calories deferred (needs body weight + MET; body-weight tracking still out of scope). `workouts` record can gain a `calories` field later.

### 2026-07-10 — Cardio: 4th day + finisher card on lifting days
- New **"Cardio" day** (amber `#ffb02e`) with 4 `tracking: "cardio"` exercises: incline-walk, run, jump-rope, cardio-machine. Cardio logs **minutes (reps field) + optional miles (weight field)** — zero storage/sync changes, same trick as time mode. Minutes render as a typeable input (not 32 taps); distance steps ±0.1 mi; failure toggle hidden.
- Data-driven behaviors: `target.goal` → "Goal:" line; `videoUrl` optional (walk/run/machine have none — Exercise hides the frame; jump-rope keeps an oEmbed-verified Jump Rope Dudes video); `restSeconds: 0` = no auto rest timer after logging (jump-rope keeps 60s round rest).
- **Cardio finisher** card on lifting days (Day.jsx, stretch-card shell, amber accent): enabled cardio exercises as tappable rows → same Exercise logging screen, ✓ when logged today, NOT counted in "N of M done". Managed (enable/disable) from the Cardio day's edit mode, which works there like any day.
- format.js: cardio formatSession ("32 min · 2.1 mi", multi "32 + 18 min · 3.4 mi") + personalRecord ("longest 45 min · best 2.1 mi"); first **format.test.js** (6 cases, 12 total).
- `public/days/cardio.jpg` is a **sharp-generated amber placeholder** (gradient + jump-rope arc, 6.6 KB) — swap in a real photo any time, no code change. Cardio cool-down stretches added.
- Known caveat (accepted): `workouts` is one record per date, so starting a Cardio "workout" on a date you already lifted restarts that date's timer. Real usage (finisher on lift days, standalone cardio on other dates) doesn't hit it.

### 2026-07-10 — Weekday dropped from day labels
- Display labels are now just the workout name — Home mega-buttons / Day h1 / History workout rows say "Push" / "Pull" / "Legs". theme.js `dayLabel` derives it (everything after the "—"), replacing the spelled-out DAY_LABELS map; data strings stay "Mon — Push" so History, theme keys, and exercises.json don't ripple. New days need no label entry.

### 2026-07-10 — Three new exercises + Day-screen edit mode (enable/disable)
- exercises.json additions: **Incline Dumbbell Press** (Push, 3 × 8–12 — reuses the old `incline-dumbbell-press` id on purpose, so the orphaned old-program history reattaches), **Dumbbell Pullover** (Pull, 3 × 10–15, Jon's spec), **Bulgarian Split Squat** (Legs, 2–3 × 8–12/leg, per-leg logging like reverse lunges). All videos oEmbed-verified (ScottHermanFitness / Buff Dudes ×2); ATHLEAN-X's split-squat video rejected for profanity in the title (it shows on the iframe).
- **Edit mode** (Day screen): pencil icon (`PencilIcon` in icons.jsx) beside the day title toggles it; a hint line appears ("Tap an exercise to remove it from this day…"); tapping an exercise toggles instead of navigating. Disabled exercises show dimmed/dashed/struck (`.is-off`) in edit mode and are hidden outside it; Home's count and the Day "N of M done" use enabled only; History still shows their sessions (history is history).
- **Storage**: `store.disabled` = `{ [exerciseId]: { off, at } }`, backfilled to `{}` in loadStore. `getDisabledIds()` / `toggleExercise(id)` in storage.js. Entries are LWW tombstones — `mergeStores` keeps the newer `at` per id (6th unit test), so a stale cloud copy can't resurrect a re-enabled exercise. Deliberately in the synced store (not a separate key) so toggles survive eviction/restore.
- CSS: `.day-title-row`, `.edit-day-button` (44px touch target, accent when active), `.edit-hint`, `.exercise-button.is-off`.

### 2026-07-10 — Refactor: App.jsx decomposed (no behavior change)
- Post-RC structure pass. App.jsx (248→125 lines) was doing five jobs; extracted: **src/hooks/useCloudSync.js** (session tracking, sync-status sub, userId-keyed sync wiring, offline/sign-out), **src/hooks/useRestTimer.js** (rest state + audioCtxRef + start/extend/dismiss — startRest stays synchronous so the iOS audio-unlock keeps its user-gesture context), **src/components/AppHeader.jsx** + **src/icons.jsx** (SyncIcon/StopwatchIcon; all CSS classes unchanged).
- storage.js: `mutate(fn)` helper collapses the load→modify→save pattern in the six mutators. History.jsx: the two two-tap delete handlers share one `armOrCommit(key, commit)` helper. index.css: dropped a duplicate `min-height: 100dvh` line.
- Review verdict on the rest: no dead CSS, no schema drift — sync.js/format.js/RestTimer/Day/Exercise left alone on purpose.
- Verified: build + 5/5 vitest + lint + preview smoke test (nav, finish-set→rest timer, +15s/Skip, header timer, two-tap deletes). Real-phone beep check after deploy is the remaining ask.

### 2026-07-09 — RC feedback batch: stretches, PRs, failure flag, checkpoint sync, login redesign
- **Stretches** (src/data/stretches.js): per-day cool-down list (`stretchesByDay`), 4 each with cues. Day.jsx shows a collapsible `.stretch-card` below the exercise list, accent-bar cues like the Form card.
- **Personal Records** (format.js `personalRecord(sessions, mode)`): weighted → est. 1RM (Epley `w·(1+reps/30)`) + heaviest weight; reps-only → most reps; time → longest hold. Shown as a red `.pr-line` under each exercise heading in History.
- **Failure flag**: `.failure-toggle` ("Taken to failure") in the This-Set card; sets `failure:true` on the logged set, resets on Finish set. `setLine`/`formatSession` append `· F`. Storage/merge unchanged (extra bool field).
- **Sync = checkpoints, not per-rep** (sync.js rework): `onStoreChange` now only `markDirty()`; actual push (`flush()`) fires on workout finish, `visibilitychange`→hidden, `pagehide`, and a 2-min interval. Manual **sync button** in the header (`.sync-button`, next to the timer) → `syncNow()` (full pull-merge-push); status drives its color/spin (idle/pending/syncing/offline/error) + the footer text. `pushLocal` removed.
- **Login redesign**: sleeker `.login-screen` — big wordmark + "TRAIN. TRACK. REPEAT." tagline + frosted `.login-card` over the gym backdrop; offline is a subtle underline link. Old `.lock-screen`/`.lock-form`/`.offline-button` CSS retired.
- **Bottom fade**: `body::after` fixed gradient (transparent→`--bg`, 60px) mirroring the header's top fade.

### 2026-07-08 — Day recolor + sticky-bottom footer + full day names
- Day accents retuned (white/steel were "meh"): Wed — Pull `#3b9dff` (azure), Fri — Legs `#2ee66e` (green); Mon — Push stays `#ff3b3b`. All driven by `--accent` so one theme.js edit propagates everywhere. Black text on both stays legible (Finish button etc.).
- Footer no longer floats mid-page on short screens: `.app` is now a `min-height:100dvh` flex column and `.app-footer` uses `margin-top:auto` (+ `padding-top:44px` to keep the gap on tall pages). Pins to viewport bottom on Home; flows below content on History. Rest-bar clearance (`#root:has(.rest-timer) .app` padding-bottom) and the sticky header both still work.
- Home mega-button titles spell the day out via `dayLabel(day)` in theme.js (`Mon — Push → Monday — Push`); the Day screen h1 uses it too. Data string stays "Mon — Push" so History / theme keys / exercises.json don't ripple. Longest "WEDNESDAY — PULL" fits one line (1.5rem on Home, 30px h1 on Day — exactly to the edge).
- Home day-buttons and the Day screen are vertically centered: their `.screen` gets `flex:1; justify-content:center` (works because `.app` is the min-height:100dvh flex column). Content taller than the viewport still top-aligns + scrolls (flex item min-height:auto = content), so nothing clips; footer stays pinned bottom.
- Day screen spacing: `.day-screen` is a flex column with `gap:14px` (h1 padding-bottom zeroed) so the title → Workout card → exercise list share one rhythm; the card→list gap (14px) now reads consistently with the 10px between exercise buttons instead of touching.

### 2026-07-08 — RC: Supabase cloud sync + whole-workout history
- **Why:** localStorage-only history dies to iOS's ~7-day eviction. Cloud sync makes it durable + recoverable on any device. Deliberately crosses the old "no backend/cloud" line.
- **Auth:** username + password (src/screens/Login.jsx). Pivoted from email OTP because Supabase's default email won't send `{{ .Token }}` without custom SMTP, and magic links break in a standalone home-screen PWA. Username maps to a **synthetic internal email** `${username}@workoutbuddy.app` (never sent to); works only with **"Confirm email" OFF** in Supabase (otherwise signUp returns no session → `email_not_confirmed`). Login tries `signInWithPassword`, falls back to `signUp` for first-time. Must use email-type identity (not anon/device-id) — an anon id lives in the same localStorage iOS wipes, so it'd orphan the cloud row. Replaced the courtesy password gate (auth.js + Lock.jsx **deleted**).
- **Offline escape hatch:** Login has a "Use offline (no sync)" button → sets `workout-tracker:offline` flag → app runs local-only (no login, no sync), persisted. History then shows "Log in to back up" (clears the flag → Login); offline-logged data union-merges up on eventual login. Sign-out clears the flag too.
- **Model:** one JSONB row per user in a Supabase `stores` table, RLS-locked to `auth.uid()`. localStorage stays source of truth (offline-first); every local write → debounced push (via new `storage.onStoreChange` + `replaceStore`). On login/reconnect: `pullMergePush` does a **union merge** (`mergeStores` in src/sync.js, unit-tested in sync.test.js): sessions keyed exercise+date (more sets wins), workouts keyed date (finished/newer wins). Empty-local ∪ remote = full restore. Caveat: cross-device deletes can be resurrected (no tombstones — noted).
- **Config:** `src/supabaseConfig.js` holds URL + anon key (public-safe under RLS). `isSupabaseConfigured()` gates everything — **with placeholders, sync/auth are OFF and the app runs exactly as before (local-only)**. Jon must: create a Supabase project, enable Email OTP, set Site URL, run the `stores` table + RLS SQL (in the plan file), paste URL+anon key. Then it's live.
- Bundle grew ~65→120 KB gz (supabase-js). Added vitest (`npm test`).
- **Whole-workout history:** History screen gets a "Workouts" section (newest-first) — date, `dayLabel(day)`, duration (`endedAt−startedAt` or "in progress"), and count of exercises done that date. `formatDuration` moved to format.js (shared with Day.jsx). Subtle sign-out + a footer sync-status line ("Synced to cloud" / "Offline — will sync") appear only when Supabase is configured.

### 2026-07-08 — Burger menu → Home History button + header timer icon
- **Burger menu killed** (overkill for 2 items). History is now a `.home-history` outline button below the day buttons (Home only — it's occasional); the Rest Timer is a `.timer-button` stopwatch-SVG icon in the sticky header, present on every screen, taps to `startRest(90)`. Removed all `.menu*` markup/CSS + `menuOpen` state. (Considered a bottom tab bar — rejected: one main flow + 2 utilities, and it'd fight the floating rest bar.)

### 2026-07-07 — Gym backdrop + bulleted card labels
- Background: user-provided gym photo (workoutbuddybg) as a fixed `body::before` layer, `cover`, blurred 3px + dark gradient overlay for readability. Frosted cards over it (`.zone-card` translucent fill + backdrop-blur) + `.exercise-button`/list translucent so the scene shows through.
- **Stacking gotcha fixed**: `body` had an opaque `background`, so the `z-index:-1` pseudo painted *below* body's own fill (invisible). Moved the page background to `html` only; body stays transparent so the backdrop shows. (If a future full-page ::before backdrop goes black, this is why.)
- **Image optimized 90×**: the supplied PNG was 1024×1536 / 2 MB. No image tooling on the machine (no sharp/imagemagick), so downscaled it to 512×768 JPEG q0.7 (~23 KB) via a canvas in the preview browser (`toDataURL`), wrote the base64 to disk with node. Since the backdrop is blurred, quality is identical. Referenced from CSS via relative `url('./assets/…jpg')` so Vite hashes + rebases it.
- Card labels: initially tried replacing the notch with a diamond-bulleted header, but Jon meant the form cues — reverted labels to the notched style and moved the accent diamond (7px square rotated 45°) to the form cues: `.cues li` is now `display:flex` with a `::before` diamond aligned to the first line, replacing the old `border-left` accent bar.
- Background blur reduced 3px → 2px so the gym scene reads a bit more.

### 2026-07-07 — Global chrome: sticky header, global burger + footer
- Burger menu and footer moved from Home up to App, wrapping every screen (`.app` centered column holds sticky header + screenEl + footer + rest bar). Home lost its own header/h1/menu/footer; its useState went too.
- New global sticky `.app-header`: "Workout Buddy." wordmark (accent dot, tap → home) on the left, burger on the right. Gradient background (var(--bg) → transparent, top to bottom) so content scrolls under and fades; `pointer-events: none` on the header with `auto` on brand/menu so the fade zone doesn't eat taps. Brand kept small (1.125rem) so it reads as chrome, not competing with screen h1s.
- Safe-area top inset moved off body onto the header's padding-top (`calc(14px + env(safe-area-inset-top))`) so the sticky bar owns the notch area. Body keeps R/B/L insets.
- header + footer given `view-transition-name` (app-header / app-footer) so they stay put while only the screen content cross-fades on navigation. `#root:has(.rest-timer)` padding moved from `.screen` to `.app`.

### 2026-07-07 — History shows latest-regardless-of-date; border-labeled cards
- Exercise History section now shows today's sets if any, else falls back to the most recent prior session (`historySets = sets.length ? sets : last.sets`), with a "Last done {date}" caption and no delete button when it's historical (deleting past records stays on the History screen). Deleting today's last set drops back to the historical view.
- Session zone broken out of the one big `.session-zone` surface card into separate outlined `.zone-card`s, each with its label notched onto the top border (`.zone-card-label` absolute, `background: var(--bg)` masks the border segment). Three cards in the session zone: Target, "This Set" (`.log-card` wraps the weight/reps counters + Finish set, slightly larger gap/top-padding), History — a Target→This Set→History (goal→now→past) narrative. `.session-zone` is now just a flex column. The form cues below the video are also a `.zone-card` (`.cues-card`, label "Form"); cue `<li>`s force `color: var(--text)` to stay readable over the card's dim default. (User flagged the card treatment as try-and-maybe-revert.)

### 2026-07-07 — Session zone: labeled Target/History sections, one-line title
- Target and set-log History are now consistent labeled sub-sections (`.zone-section` + accent `.zone-label`), replacing the old centered two-line `.target-block` and the `.set-log`/`.set-log-label`. Target values sit on one line (`.target-line` flex row: "Sets: 3–4   Reps: 8–12"), no line break.
- "Last time" line removed from the Exercise screen (the set-for-set weight/reps prefill it fed still works — only the text display is gone; `formatSession` import dropped from Exercise).
- Exercise title scoped to `.exercise-title` at 1.25rem so even the longest name ("Assisted Hangs / Progression") stays on one line; History screen h1 keeps the 1.875rem size.
- Footer: emoji removed (pun kept — "all gains reserved"), color darkened to #5b5b63 for a subtler look.

### 2026-07-07 — Back button in the sticky header; footer rule removed
- Sub-pages (Exercise, History) now show a "‹ Back" button in the sticky header's left slot instead of the "Workout Buddy." wordmark; Home still shows the wordmark. App decides via `screen === 'home'`. Both screens' back goes to Home, so the header button just calls goHome — the `onBack` prop was dropped from Exercise and History.
- In-screen `.back-button` removed from both screens (it used to scroll away under the sticky header — the whole point). `.app-header .back-button` needs `pointer-events: auto` since the header itself is pointer-events:none.
- Footer's `border-top` (horizontal rule) + its padding-top removed; spacing now from margin alone.

### 2026-07-07 — Burger menu, footer, set-log "History" label
- Home header's History button replaced by a ☰ burger menu (Home.jsx local menuOpen state + click-outside backdrop). Menu items: History (→ history screen) and Rest Timer (→ App's startRest(90); the timer is app-level so it can be launched standalone). Old .history-button CSS removed.
- Footer on Home: "© 2026 Workout Buddy — all gains reserved 💪" + "Last updated {date}". Date is `__BUILD_DATE__`, injected via vite.config define (`new Date().toISOString().slice(0,10)`) so it auto-stamps each deploy; added to eslint globals.
- Exercise set-log drawer now has a small "History" section label above it.

### 2026-07-07 — Persistent rest timer + +15s + set-log drawer
- Rest timer state (endsAt/total/id) and the AudioContext ref moved from Exercise up to App; the timer renders as a fixed floating bar OUTSIDE the swapped screens, so it keeps running while navigating exercise→home→exercise mid-rest. App passes `onStartRest(seconds)` to Exercise (does the iOS audio unlock, still inside the Finish-set tap gesture).
- RestTimer keyed on rest.id (set once per rest, not on extend) → fresh rest remounts, +15 doesn't flicker. `+15s` button bumps both endsAt and total (bar stays proportional, guarded with Math.min(100,…)).
- Floating bar: position:fixed bottom, view-transition-name: rest-bar so it stays put during page transitions instead of sliding with the root; `#root:has(.rest-timer) .screen` gets bottom padding so it never hides content.
- Set log is now a drawer: shows the latest set only, with a native `<details>` "All N ▾" toggle revealing all sets newest-first (original Set numbers preserved). Single-set case shows just the line, no drawer. setLine() helper shared, mode-aware. Delete-last button stays below.

### 2026-07-07 — Delete-last-set + auto-dismiss rest timer
- Exercise screen: "Delete last set" button under the set log (single tap, subtle bordered style — a low-stakes in-workout undo, deliberately not the two-tap confirm History uses). storage.deleteLastSet(exerciseId) pops today's last set and drops the session if that empties it (no zero-set sessions left behind); reps counter re-prefills for the reopened set position, weight left as-is.
- RestTimer: the "Rest over — go!" tap-to-dismiss button is gone. When rest hits 0:00 the timer auto-clears itself (onDismiss called from the alert effect); the beep + vibrate remain the signal. Beep is scheduled on the parent-owned AudioContext so it still plays after unmount. Skip still works mid-rest. Dead .rest-timer-done CSS + keyframes removed.

### 2026-07-06 — Counter labels moved under values
- "Weight (lbs)" / "Reps" headers above the counter rows removed; small dim unit labels ("lbs" / "reps") sit under the values instead — the old step-2 rep-counter style, now on both rows. .counter-value-wrap column keeps the 110px value slot; buttons unchanged at 72px, rows still pixel-identical.
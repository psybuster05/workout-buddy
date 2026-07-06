# CLAUDE.md — Workout Tracker

## What this is
Personal workout tracker web app. One user (Jon), used on an iPhone browser mid-workout at the gym. Phone-first UI: big touch targets, readable at arm's length, works one-handed with sweaty thumbs.

## Tech stack
- React (Vite) 
- No backend. No accounts. No cloud.
- Data: exercises hardcoded in `src/data/exercises.json`; workout history in localStorage
- Hosting: GitHub Pages
- Target device: iPhone 17 Pro Max, Safari, added to home screen

## Core screens
1. **Home** — exercise list grouped by workout day. Tap to open an exercise.
2. **Exercise** — YouTube embed (iframe), written form cues below it, then live session zone: weight input, large rep counter buttons, "Finish set" button that logs the set and auto-starts the rest timer. Show "Last time: {sets}×{reps} @ {weight}" from history next to inputs.
3. **History** — chronological list per exercise: date, sets × reps × weight. Plus a "Export JSON" button that dumps all localStorage history.

## Data shapes
```json
// exercises.json entry
{
  "id": "goblet-squat",
  "name": "Goblet Squat",
  "day": "Fri — Legs",
  "target": "4 × 10–15",
  "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
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
      "sets": [{ "reps": 8, "weight": 50 }]
    }
  ]
}
```

## Conventions
- Weight unit: lbs for now (gym plates); revisit if it bugs me
- Timer must keep running / recover sanely if the phone locks or Safari backgrounds the tab — test this specifically, it's the most likely real-world failure
- Written instructions must be useful WITHOUT the video loading (bad gym reception)
- Keep dependencies minimal; no UI framework unless there's a concrete reason

## Out of scope for v1 (do not build unless asked)
Cloud sync, accounts, charts/graphs, in-app exercise editing, PWA service-worker complexity beyond add-to-home-screen basics.

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
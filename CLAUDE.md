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
  "day": "Legs",
  "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "instructions": ["Cue 1", "Cue 2"],
  "restSeconds": 120
}

// localStorage history entry (key: "history")
{
  "exerciseId": "goblet-squat",
  "date": "2026-07-06",
  "sets": [{ "reps": 8, "weight": 50 }]
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
- [ ] 3. Rest timer (auto-start on finish set, vibrate/sound at zero)
- [ ] 4. History to localStorage + "last time" display
- [ ] 5. History screen + JSON export
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
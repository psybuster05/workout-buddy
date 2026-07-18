# CLAUDE.md — Workout Tracker

## What this is
Personal workout tracker web app. Built by/for Jon, used on an iPhone browser mid-workout at the gym. Real accounts are live and friends/family are expected to try it, so don't assume a lone user when weighing tradeoffs (the exercise *program* is still Jon's, though — see Out of scope). Phone-first UI: big touch targets, readable at arm's length, works one-handed with sweaty thumbs.

Known multi-user caveat: Supabase's built-in email sender is rate-limited (~2–4/hour), so a burst of signups/password-resets can queue. Fine so far; custom SMTP is the fix if it bites.

## Tech stack
- React (Vite) 
- localStorage is the source of truth (offline-first). Optional **Supabase** cloud sync (real email/password auth with "Confirm email" ON + Google OAuth; forgot-password reset flow; requires Site URL + redirect URLs configured in Supabase, Google provider keys, and "Secure email change" OFF) backs it up so iOS's ~7-day eviction can't lose history — off until credentials are set in `src/supabaseConfig.js`. "Use offline" on the login screen skips sync entirely.
- Data: exercises hardcoded in `src/data/exercises.json`; workout history in localStorage, synced to Supabase when configured
- Hosting: GitHub Pages — https://psybuster05.github.io/workout-buddy/ — deploys via GitHub Actions (`.github/workflows/deploy.yml`) on push to main. `vite.config.js` base **must** be `'/workout-buddy/'` (match repo name) or Pages serves a blank page.
- Target device: iPhone 17 Pro Max, Safari, added to home screen. Responsive as of 2026-07-10: single centered column everywhere; ≥700px widens the column (`--col` 480→600) and adds hover states for pointer devices; the top/bottom fades span the full viewport at any width

## Core screens
1. **Home** — 4 day mega-buttons (Mon–Push / Wed–Pull / Fri–Legs / **Custom**) with per-day photo backgrounds. Tap → Day screen. (Custom's exercise count = its `custom`-map members, not an `e.day` filter.)
2. **Day** (middle) — whole-workout tracker (Start/Finish → live elapsed from a stored startedAt timestamp; Pause/Resume; **Resume after Finish** un-finishes today's workout by banking the gap as a paused span; Restart zeroes it; "N of M done" derived from today's logged sets) + the day's exercise list (done ones get a ✓). Pencil beside the title toggles edit mode (the button becomes a ✓ while editing): tap exercises to add/remove them for the day (removed ones are hidden outside edit mode; counts use enabled only; History keeps their sessions). Two day types:
   - **Lifting days** (Push/Pull/Legs): the list is that day's exercises (`e.day === day`); edit mode toggles the global `disabled` map. Below the list, collapsible **finisher** cards (shared `<FinisherCard>`) — **Cardio finisher** + **Core finisher** — tappable to log, ✓ when done today, **not counted in "N of M"** (never in the day's `universe`), and toggled only via this edit mode (the sole way to change Cardio/Core membership). Cardio and Core are **pseudo-days**: their exercises carry `day: "Cardio"`/`"Core"` but those strings are **not** in `days[]`, so they get no Home button and surface only as finishers here (or as rows on the Custom day).
   - **Custom day**: user-built. `universe` is *every* exercise in the app; edit mode shows all of them — lifting exercises **and** all cardio/core finishers — as one flat list with **no finisher sections**. Membership lives in the separate synced **`custom`** map, independent of home-day `disabled` (a Custom toggle never affects a lifting day). Default is one exercise per lifting day. Each row's numeral/chevron is coloured by the exercise's **home day** (`dayAccent(e.day)`), not one flat accent, so a mixed list stays legible.
3. **Exercise** — "This Set" card (weight/reps via a scrollable **number ribbon**, see below, "Finish set" → logs + auto-starts the rest timer), Notes card (see below), History card (every logged set today carries its own **✕**, two-tap like History's row deletes — not just the most recent one), then YouTube embed (iframe) + written form cues. Back → Day.
   - **Ribbon** (`src/components/Ribbon.jsx`) — the only numeric input control in the app, used for weight (weighted mode), reps/seconds (weighted, reps-only, time), and cardio's minutes/miles. A horizontal scroll-snap tape marked in `step` increments, every tick labelled, a fixed center caret over the selected one — there's no separate readout; the centered tick label itself grows/bolds into the value via a squared-falloff `--emph` (0..1 by distance from center), unit sits below the tape. Flanking chevrons nudge one step; tap the tape (not a flick) to type an exact value. Mouse gets first-class support (click-drag the tape, wheel scrolls it) alongside touch/trackpad.
   - **Notes** — a sticky per-exercise note, **read-only until you tap the pencil** (which becomes a ✓ while editing); an ✕ beside it clears (two-tap, armed → "Clear?", like History's deletes) and only shows when there's a note. The **PR line lives inside this card** ("PR · est. 1RM …", or a dimmed "PR · None yet"). The note's **placeholder is the programmed target** ("Sets: 3–4 · Reps: 8–12" / "Goal: 20–40 min"), which is the only remaining consumer of `target` in exercises.json.
4. **History** — a "Workouts" feed (newest-first, capped at 8 + "Show all", each expandable to the exercises done that day, two-tap deletable), then per-exercise collapsible accordions (PR summary on the closed row; sessions with two-tap delete inside). Export JSON at the bottom, de-emphasized.
5. **Account** — person icon in the header (button order: rest → sync → account; account shows whenever Supabase is configured). Signed in: "Signed in as" email card, change account email, sign out. Offline mode: explains device-only storage + "Log in to back up". The footer (© + build date) renders on History and Account only; the sync-status line renders at the bottom of **every** screen when logged in (one `.app-bottom` wrapper owns the sticky-bottom margin).

## Data shapes
```json
// exercises.json entry
{
  "id": "goblet-squat",
  "name": "Goblet Squat",
  "day": "Fri — Legs",
  "target": { "sets": "4", "reps": "10–15" },
  "tracking": "weighted | reps-only | time | cardio (optional, default weighted)",
  "defaultOff": "true (optional — starts disabled until enabled in Day-screen edit mode)",
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
  },
  "notes": {
    "goblet-squat": { "text": "Pin 4. Elbows tucked.", "at": 1784182344653 }
  },
  "custom": {
    "flat-dumbbell-press": { "on": true, "at": 0 }
  }
}
```
**`workouts`** — one record per calendar date.
- `endedAt` null = in progress. Also carries `pausedMs`/`pausedAt` (pause model) and `updatedAt` (stamped by every workout mutator; sync merge prefers the higher `updatedAt`, falls through to `endedAt` when both are absent). Old records without `updatedAt` read as 0. Backfilled to `[]` for old stores.
- "Exercises done" is derived from `sessions`, not stored in workouts.

**`sessions`** field notes:
- `failure` is optional (present only when true).
- Time-mode exercises store seconds in `reps`; non-weighted modes store `weight: 0`.
- **Cardio** stores minutes in `reps` and miles in `weight` (0 = distance unrecorded). Cardio exercises use `target: { goal: "20–40 min" }` and `restSeconds: 0` (no auto rest timer).

**`disabled`** — maps exerciseId → `{ off, at }` (Day-screen edit mode). Timestamps enable LWW sync merge. Backfilled to `{}` for old stores.

**`notes`** — maps exerciseId → `{ text, at }` (one sticky note per exercise). Merges LWW via the shared `lww()` helper in sync.js. Clearing stores `{ text: '' }` as a **tombstone** so a stale cloud copy can't resurrect a deleted note. Backfilled to `{}`.

**`custom`** — the Custom day's membership: maps exerciseId → `{ on, at }`, **independent of `disabled`** (a Custom-day toggle never touches an exercise's home-day state). Members = ids with `on: true`. Merges LWW via `lww()`. `seedCustom` seeds one exercise per lifting day at `at: 0` (loses every LWW comparison, so a real toggle wins) — the same pattern as `seedDefaultOff`. Backfilled to `{}`.

> ⚠️ **Adding a top-level store field?** `mergeStores` (sync.js) returns a **hand-built object literal** — a field missing from it is silently dropped on every sync *and* written back over localStorage by `pullMergePush`'s `replaceStore`. Four places, all mandatory: `loadStore`'s backfill, `loadStore`'s empty-store literal, a merge rule, and **the return literal**. The `toEqual` fixtures in sync.test.js are the tripwire that catches you forgetting.

## Conventions
- Weight unit: **storage is canonical lbs, always** (sessions keep `unit: "lbs"`; sync merges and history never mix units). The Account screen has an Imperial/Metric toggle (device-local key `workout-tracker:unit`, NOT synced) that converts at the display/input boundary only — kg shown to 0.1, stepper ±1.25 kg vs ±2.5 lbs, entered kg stored back as lbs (2 decimals). Cardio's weight field is miles and never converts.
- Dates are **local YYYY-MM-DD** (`new Date().toLocaleDateString`), never `toISOString()` — a 9 PM workout must not land on tomorrow's UTC date.
- Timer must keep running / recover sanely if the phone locks or Safari backgrounds the tab — test this specifically, it's the most likely real-world failure.
- `startRest` must stay **fully synchronous** — iOS requires the WebAudio context unlock inside the original user-gesture call stack. All async work lives in the fire path, not the start path. The context sets `navigator.audioSession.type = 'playback'` so the end-of-rest beep plays through the iOS silent switch (confirmed on-device). `?debug=1` shortens the header stopwatch to a 10s rest and shows an audio-state readout — the only way to diagnose a missed beep on a real phone.
- Written instructions must be useful WITHOUT the video loading (bad gym reception)
- Keep dependencies minimal; no UI framework unless there's a concrete reason
- **Commit messages**: use conventional-commit style — `feat:`, `fix:`, `refactor:`, `style:`, `chore:`. One concise line; body only if the "why" isn't obvious. Git history is the changelog; do not maintain a separate changelog file.

## Out of scope (do not build unless asked)
Charts/graphs, in-app exercise editing, PWA service-worker/offline-launch (the app still needs network to *load* — sync makes data durable, not the shell offline).
# CLAUDE.md — Workout Tracker

## What this is
Personal workout tracker web app. Built by/for Jon, used on an iPhone browser mid-workout at the gym; **as of 2026-07-12 it's no longer single-user** — real accounts are live and friends/family are expected to try it, so don't assume a lone user when weighing tradeoffs (the exercise *program* is still Jon's, though — see Out of scope). Phone-first UI: big touch targets, readable at arm's length, works one-handed with sweaty thumbs.

Known multi-user caveat: Supabase's built-in email sender is rate-limited (~2–4/hour), so a burst of signups/password-resets can queue. Fine so far; custom SMTP is the fix if it bites.

## Tech stack
- React (Vite) 
- localStorage is the source of truth (offline-first). Optional **Supabase** cloud sync (real email/password auth with "Confirm email" ON + Google OAuth; forgot-password reset flow; requires Site URL + redirect URLs configured in Supabase, Google provider keys, and "Secure email change" OFF) backs it up so iOS's ~7-day eviction can't lose history — off until credentials are set in `src/supabaseConfig.js`. "Use offline" on the login screen skips sync entirely.
- Data: exercises hardcoded in `src/data/exercises.json`; workout history in localStorage, synced to Supabase when configured
- Hosting: GitHub Pages
- Target device: iPhone 17 Pro Max, Safari, added to home screen. Responsive as of 2026-07-10: single centered column everywhere; ≥700px widens the column (`--col` 480→600) and adds hover states for pointer devices; the top/bottom fades span the full viewport at any width

## Core screens
1. **Home** — 4 day mega-buttons (Mon–Push / Wed–Pull / Fri–Legs / Cardio) with per-day photo backgrounds. Tap → Day screen.
2. **Day** (middle) — whole-workout tracker (Start/Finish → live elapsed from a stored startedAt timestamp, "N of M done" derived from today's logged sets, Restart) + that day's exercise list (done ones get a ✓). Pencil beside the title toggles edit mode (the button becomes a ✓ while editing): tap exercises to disable/re-enable them for the day (disabled ones are hidden outside edit mode; counts use enabled only; History keeps their sessions). Below the list, collapsible **finisher** cards (shared `<FinisherCard>`): **Cardio finisher** on lifting days only, **Core finisher** on every day. Both are tappable to log, ✓ when done today, **not counted in "N of M"** (structurally — they're never in `dayExercises`), and both respect edit mode, which is the only way to toggle Core.
3. **Exercise** — Notes card (see below), "This Set" card (weight input, large rep counter buttons, "Finish set" → logs + auto-starts the rest timer), History card, then YouTube embed (iframe) + written form cues. Back → Day.
   - **Notes** replaced the old Target card: a sticky per-exercise note, **read-only until you tap the pencil** (which becomes a ✓ while editing); an ✕ beside it clears (two-tap, armed → "Clear?", like History's deletes) and only shows when there's a note. The **PR line lives inside this card** ("PR · est. 1RM …", or a dimmed "PR · None yet"). The note's **placeholder is the programmed target** ("Sets: 3–4 · Reps: 8–12" / "Goal: 20–40 min"), which is the only remaining consumer of `target` in exercises.json.
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
  }
}
```
`workouts` is one record per calendar date (whole-day timer). `endedAt` null = in progress; records also carry `pausedMs`/`pausedAt` (pause model) and **`updatedAt`** (stamped by every workout mutator — the sync merge prefers the higher `updatedAt` so a resumed workout beats a stale finished cloud copy; records without it read as 0 and fall through to the old endedAt rule). Backfilled to `[]` in loadStore for old stores. "Exercises done" is derived from `sessions`, not stored here. `failure` on a set is optional (present only when true); time-mode exercises store seconds in `reps`, non-weighted modes store `weight: 0`; **cardio** mode stores minutes in `reps` and miles in `weight` (0 = distance unrecorded) — no schema change. Cardio exercises use `target: { goal: "20–40 min" }` (rendered as a "Goal:" line) and `restSeconds: 0` = no auto rest timer after logging. `disabled` maps exerciseId → `{ off, at }` (Day-screen edit mode); entries keep their timestamp so sync merges toggles last-write-wins — backfilled to `{}` for old stores. `notes` maps exerciseId → `{ text, at }` (one sticky note per exercise) and merges the same LWW way via the shared `lww()` helper in sync.js; clearing stores `{ text: '' }` as a **tombstone** rather than dropping the key, so a stale cloud copy can't resurrect a note you deleted. Also backfilled to `{}`.

> ⚠️ **Adding a top-level store field?** `mergeStores` (sync.js) returns a **hand-built object literal** — a field missing from it is silently dropped on every sync *and* written back over localStorage by `pullMergePush`'s `replaceStore`. Four places, all mandatory: `loadStore`'s backfill, `loadStore`'s empty-store literal, a merge rule, and **the return literal**. The `toEqual` fixtures in sync.test.js are the tripwire that catches you forgetting.

## Conventions
- Weight unit: **storage is canonical lbs, always** (sessions keep `unit: "lbs"`; sync merges and history never mix units). The Account screen has an Imperial/Metric toggle (device-local key `workout-tracker:unit`, NOT synced) that converts at the display/input boundary only — kg shown to 0.1, stepper ±1.25 kg vs ±2.5 lbs, entered kg stored back as lbs (2 decimals). Cardio's weight field is miles and never converts.
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

### 2026-07-16 — One more exercise per lifting day
Item 5 (last) of the feedback batch. exercises.json only, no code.

- **Push** → **Dumbbell Chest Fly** (`dumbbell-fly`), after Incline Press — the only horizontal-adduction/stretch movement on an all-pressing day. **Pull** → **Bent-Over Rear Delt Fly** (`rear-delt-fly`), after Pullover — the canonical gap on a dumbbell pull day and the best pick for a desk-bound lifter (his rows all pull to the hip). **Legs** → **Dumbbell Hip Thrust** (`hip-thrust`), after RDL — the missing glute-dominant hinge; Legs already had two single-leg movements. All weighted, `restSeconds: 90`, 4 written cues, inserted after the movement each complements (array order drives the Day list + Home count).
- **No orphan-id reuse.** The only unused old ids left are `seated-cable-row` and `bicep-curl`; reusing an id for a *different* movement would fuse the old sets into the new exercise's PR/est-1RM, so both stay orphaned. New unique ids.
- Videos oEmbed-verified (Lean Physique Lab ×2, FITASTIC ×1), titles profanity-checked. **Verified in preview:** Home counts 5→6 on each lifting day (Cardio still 5); each opens weighted with the right target placeholder + a rendering embed; Chest Fly finish-set logged and auto-started the 90s rest. 31 exercises total.
- Cardio deliberately got nothing — it's a modality list (walk/run/rope/bike/stairs), already complete; the only gap is a HIIT protocol, which would just be Run with different cues splitting minutes across two ids.

### 2026-07-16 — Resume after Finish Workout
Item 4 of the feedback batch. After Finish, the Day screen showed only Restart (which zeroes the clock) — no way to undo a mis-tap or grab one more set.

- **`resumeFinishedWorkout()`** (storage.js): un-finishes today's workout by banking the finish→resume gap as a paused span (`pausedMs += Date.now() - endedAt; endedAt = null`), so `workoutElapsed` needs zero changes — the clock picks up exactly where it froze. **Verified in preview:** finish at 00:54 → Resume → clock continues past 00:54 (not reset), the ~46s finish→resume gap banked into `pausedMs`, Pause/Finish return; Restart still zeroes.
- **The sync hazard this fixes.** `mergeStores` picked the workout with the higher `endedAt`, so a resumed record (`endedAt: null` → 0) would **lose to the stale cloud copy that still had endedAt set** — and `pullMergePush` runs on every app launch, so a Finish→Resume→reopen would silently re-finish it *and* drop the banked pause. Fix: **`updatedAt`** stamped on every workout mutator (`startWorkout`/`pauseWorkout`/`resumeWorkout`/`finishWorkout`/`resumeFinishedWorkout`); the workouts merge prefers the higher `updatedAt`, falling through to the **original** endedAt rule when both are absent (0). So old records and the existing "finished beats unfinished" test are untouched — +2 tests (resumed-beats-stale both directions, and the back-compat fall-through). 19 tests.
- **Layout** (Day.jsx): the finished branch is now a `.workout-actions` column — **Resume** as the filled `.finish-button` (primary: mis-tap / one-more-set is the common case), **Restart** as the outline below (destructive). Mirrors the active state's outline-Pause-above-filled-Finish, inverted. `flush()` fires right after Resume so the cloud learns `endedAt: null` immediately (defense in depth; `updatedAt` is the actual fix). No new CSS.

### 2026-07-16 — Rest alarm: silent-switch fix, late-rule widened, `?debug=1` readout
Item 3 of the feedback batch. Jon: the alarm fails **both** on silent **and** with the ringer ON.

- **✅ Confirmed fixed on-device (2026-07-16, iPhone 17 Pro Max).** All three phone tests came back green: beeps with the ringer on, beeps with the silent switch **on** (so `audioSession = 'playback'` was the fix for the silent case), and — the tradeoff we were worried about — **it did NOT duck or stop music** from another app. So `'playback'` ships as-is; no Account toggle needed. The `?debug=1` readout is what made this diagnosable.
- **(a) `navigator.audioSession.type = 'playback'`** (useRestTimer, set lazily on first `startRest`, feature-detected) — iOS 16.4+; makes WebAudio ignore the ringer/silent switch, which otherwise mutes the beep. **The best candidate**, and untestable off-Safari (Chrome has no `navigator.audioSession`; the guard skips it cleanly). Supersedes the "silent switch mutes WebAudio, accepted" note in the 2026-07-06 step-3 entry. **Tradeoff to confirm by ear:** `playback` declares the page a media player and may duck/stop music from another app. If it does: revert, or gate behind an Account toggle. `'ambient'` mixes politely but stays muted = no fix.
- **(c) late-return rule 3s → 10s** (`LATE_LIMIT_MS` in RestTimer). In the foreground the 250ms tick makes the alarm ~0.25s late, so the threshold only ever governed suspended JS — and a dimmed screen woken a few seconds after 0:00 is exactly when you still want the beep. **Demonstrated:** Δ5.2s now fires (old rule swallowed it), Δ20s still correctly suppressed.
- **(b) `fire()` awaits `resume()` before `beep()` — hardening, NOT the fix.** This was asserted as the root cause and then **disproved**: measured on Chrome, `resume()` *continues* the clock rather than jumping it (~8ms), so scheduling off the stale `currentTime` still lands in the future and plays. Kept only because it's free and iOS's WebKit-only `interrupted` state isn't Chrome's `suspended` code path. **Do not re-derive the "schedules into the past" story as fact.** Also added a `+0.02` lead-in in `beep()`.
- **(e) keepalive**: an inaudible oscillator (gain 0.0001) runs for the rest's duration so Safari can't reap an idle context; stopped on dismiss / new rest. **(d)** `webkitAudioContext` fallback added for old devices — never was the bug.
- **`?debug=1`** (`DEBUG_AUDIO`, exported from useRestTimer): header stopwatch starts a **10s** rest instead of 90s, and the rest bar holds open at 0:00 showing `state-before→after · session=… · Δ<late>ms`. **This is the real deliverable** — all three failure modes look identical ("no beep") on a phone, so there's no diagnosing it without a readout. Inert without the param.
- `startRest` stays **fully synchronous** (the iOS gesture invariant); all async work lives in RestTimer's fire path, which runs post-unlock. `fire` closes over `ctx` only, so the auto-dismiss unmount can't cut the beep off.

### 2026-07-16 — Core finishers + Notes card replaces Target
Post-leg-day feedback batch from Jon + a friend (items 1–2 of 5).

- **Core finisher on every day.** **Core is a pseudo-day**: 4 entries with `day: "Core"` that is deliberately **NOT in `days[]`** — so Home shows no Core button and Cardio stays the only added main day. Nothing else needed changing: Home iterates `days`, Day filters `e.day === day` (so "N of M done" excludes Core *structurally*), `dayLabel('Core')` has no em-dash so it returns "Core", `dayImage` is Home-only. Only theme.js needed an entry: **`Core: '#a97bff'`** (violet).
  - Exercises, one per core function and a deliberate spread of tracking modes: **Plank** (`time`, 60s rest), **Hanging Leg Raise** (`reps-only`, 90s), **Russian Twist** (`weighted`, 60s), **Dead Bug** (`reps-only`, 60s). Videos oEmbed-verified (NASM ×2, Runna ×2).
  - **`<FinisherCard>`** extracted in Day.jsx — the Cardio and Core cards are the same component now (adding edit mode would have meant maintaining ~35 identical lines twice). Cardio still self-suppresses on the Cardio day; Core shows everywhere.
  - **Edit mode now reaches the finishers** (`editing ? all : enabled`, same as the main list) — this is the *only* way to toggle Core, and it fixes an old gap where a Cardio finisher row couldn't be toggled from a lifting day at all. Needed `.cardio-row.is-off` in CSS: `.is-off` was scoped to `.exercise-button`. Dropped the inert `.cardio-card` class (never had a rule).
  - Known + accepted (both pre-existing): `disabled` is global, so toggling a finisher off on Push toggles it on Pull too; and History's workout row counts finisher sessions while Day's "N of M" doesn't.
- **Notes card replaces Target** (Exercise screen). Sticky **per-exercise** note (standing reference, not a per-session journal), **read-only until the pencil is tapped** — a live textarea meant a stray thumb rewrote it mid-set. Pencil→**✓** while editing (same swap added to the Day screen's edit button; its hint copy now says "checkmark"). **✕ clears, two-tap armed → "Clear?"**, 3s auto-disarm, and only rendered when a note exists. The **PR line moved inside** the card; with no PR it renders a dimmed **"PR · None yet"** so the head row isn't just a button floating against empty space.
  - `target` **stays in exercises.json** but is now consumed only by `targetPlaceholder()` → the note's placeholder ("Sets: 3–4 · Reps: 8–12" / "Goal: 20–40 min" / "Sets: 3–4"). `.target-line` CSS deleted.
  - **Storage:** new top-level `notes` map (see Data shapes) + `getNote`/`saveNote`. `mergeStores` grew a shared **`lww(a, b)`** helper now used by both `disabled` and `notes`. Adding the field broke 2 `toEqual` fixtures in sync.test.js — *by design*, that's the tripwire; +2 new tests (notes LWW, cleared-note tombstone). 17 tests total.
  - **Save strategy:** local state drives the textarea; writes batch on **debounce 800ms · blur · unmount (the Back tap) · visibilitychange→hidden**. Measured: 32 chars typed = **1** store write. Per-keystroke would be 32 writes → 32 `markDirty` → 32 whole-app re-renders. `noteRef` is synced in an effect, not assigned during render (lint catches the latter — it breaks concurrent rendering).
  - `.note-input` is `font: inherit` (17px): **under 16px and iOS zooms the page on focus**. It has a filled background + accent focus ring — on an empty note the ✓ was otherwise the only thing distinguishing edit mode from read mode.
- **Supabase needs nothing.** `pushStore` upserts the whole store into a single JSONB `data` column, so `notes` rides along with no migration/SQL/dashboard change. The cloud round-trip is still **unverified end-to-end** (needs a logged-in device); the merge is unit-tested both directions.

### 2026-07-14 — Pause/Resume on the workout timer
- Active workouts now have **Pause / Resume** beside Finish Workout (`.workout-actions` row). Paused state dims + pulses the clock and swaps the "N of M done" line for "Paused".
- Data model (no migration): workout records gain `pausedMs` (total paused) + `pausedAt` (open-pause stamp, null while running); `startedAt`/`endedAt` stay true wall-clock stamps. Elapsed = `endedAt ?? pausedAt ?? now) − startedAt − pausedMs` via new **`workoutElapsed(w, now)`** in format.js (shared by Day + anywhere duration is shown). Old records lacking the fields compute exactly as before.
- storage.js: `pauseWorkout` (sets `pausedAt`), `resumeWorkout` (banks the span into `pausedMs`, clears `pausedAt`), and `finishWorkout` now closes an open pause first so paused time is never counted. `startWorkout`/Restart reset both fields.
- Day.jsx ticks only while *running* (frozen while paused). Sync unaffected (extra fields ride along in the per-date workout record).

### 2026-07-12 — Imperial/Metric toggle + sporty button redesign
- **Weight unit toggle** (Account screen, segmented switch): new **src/units.js** — `getWeightUnit`/`setWeightUnit` (device-local key `workout-tracker:unit`, deliberately NOT synced), `lbsToDisplay`/`displayToLbs`/`weightStep`. **Storage stays canonical lbs** (see Conventions); conversion happens only at the display/input boundary, so history and the sync merge can never mix units. `formatSession`/`personalRecord` take an optional display `unit` arg; Exercise converts prefill + stepper (±1.25 kg vs ±2.5 lbs) and converts back on log. Cardio's weight field is **miles** and never converts. format.test.js grew kg cases (15 tests total).
- **Day buttons redesigned**: sharp rectangles (no radius), accent-tinted hairline + 5px accent left edge, photo under an accent scrim, skewed title slab, frosted `.day-button-sub` count chip, and top-right speed stripes — all leaning the same **14°** so the geometry reads as one system.
- **Shape experiments tried and rejected** (don't re-propose without asking): per-day corner treatments (triangle / square / 45° notch), a skewed **parallelogram** Cardio button ("not 2004 anymore"), and a **sliced corner + accent blade** — the slice was cut even after matching all angles to 14°. Verdict: plain sharp rectangle with the left accent edge. Exercise buttons also lost their accent blade.
- **Exercise buttons**: uppercase italic names via new **src/components/FitText.jsx** — measures `scrollWidth > clientWidth` and steps the font down (18px → 11px floor) so every name stays on **one line**, re-fitting on resize. Anatomy is now outlined index numeral · name · accent chevron (✓ when done).
- **New day photos** (supersedes the 2026-07-07 photo note): real gym action shots — push = DB shoulder press, pull = bent-over row, legs = trap-bar deadlift, cardio = treadmill sprint. Normalized from source PNGs with the sharp recipe (1024×400 attention crop → mozjpeg q82, 31–50 KB); heavy source PNGs deleted from the repo.
- **Scap Pull-Ups** joined the `defaultOff` set (Pull now shows 5 by default).
- Account screen: `.account-screen` flex column w/ 16px gap (child margins zeroed so the gap is the single spacing source); unit toggle is one connected segmented control.

### 2026-07-11 — Account screen + header person button
- New **Account screen** (src/screens/Account.jsx), reached via a **person icon** in the header (order: rest → sync → account; PersonIcon added to icons.jsx). Sign out, change-account-email, and "Log in to back up" moved there from History (History now ends at Export JSON).
- Account shows a "Signed in as {email}" zone-card when authed; an "Offline mode" explainer card otherwise. The header account button shows whenever Supabase is configured (even logged out/offline — it's the path back to Login); sync button still needs a session.
- **Bottom block restructured**: `.app-bottom` wrapper (App.jsx) owns the sticky-bottom margin + view-transition-name; inside it, the **sync-status line now renders on every screen when logged in** (was footer/History-only) and the © footer renders on History + Account only.
- Verified offline-mode states in preview (header ordering, Account cards, History stripped, footer placement); signed-in layout is the same JSX with `showSync`/session booleans flipped — Jon eyeballs it on the phone after deploy.

### 2026-07-11 — Auth overhaul: real email/password + Google OAuth
- **Why:** the username scheme silently created a NEW account on a typo ("jno" ≠ "jon") because sign-in fell back to signUp; and with "Confirm email" now ON in Supabase, synthetic `@workoutbuddy.app` addresses can't receive the link, so new signups were broken anyway.
- **Login.jsx rewritten**: explicit sign-in / create-account / reset-password modes (no auto-signup fallback — wrong creds say "Wrong email or password."). Google OAuth button (`signInWithOAuth`, redirects via `SITE_URL`). Confirm-email handling: signup → "Check your email" state; unconfirmed sign-in → resend-confirmation button; existing-email signup detected via Supabase's empty-`identities` anti-enumeration response.
- **Forgot password**: `resetPasswordForEmail` → email link → `PASSWORD_RECOVERY` event (tracked in useCloudSync) → new ResetPassword.jsx screen (`updateUser({ password })`) gated in App before everything else.
- **`SITE_URL`** (supabase.js) = `origin + BASE_URL`, window-guarded for vitest; all auth emails and OAuth redirect there.
- **Change account email** (History, under sign-out): `updateUser({ email })` + confirmation link — this is the migration path for the old `jon@workoutbuddy.app` account to a real inbox (same user id, same cloud data; password reset works afterward). Once the account email matches his Google email, Google sign-in auto-links to the same account (Supabase links verified matching emails).
- **Jon's Supabase dashboard checklist (feature is inert until done):** ① Auth → URL Configuration: Site URL `https://psybuster05.github.io/workout-buddy/`, add redirect `http://localhost:5173/workout-buddy/`. ② Providers → Google: create OAuth client in Google Cloud Console (Web app, authorized redirect URI `https://idogwtyvlxmlmsgrysyx.supabase.co/auth/v1/callback`), paste client id + secret, enable. ③ Auth → Email: keep "Confirm email" ON, turn "Secure email change" OFF (old synthetic address has no inbox). Built-in email sender is rate-limited (~2-4/hour) — fine for one user; custom SMTP if it ever matters.
- Apple (needs $99/yr dev account) and Facebook/X (dev-portal + review hoops) deliberately deferred.
- Not testable by Claude end-to-end (needs a real inbox + Google keys): confirmation click, reset click, Google round-trip. Verified: wrong-creds honesty, all mode UIs, build/tests/lint.
- **2026-07-11 live outcome:** Google sign-in confirmed working end-to-end on Jon's account. The blocker was an invalid Google client secret in Supabase (surfaced by the auth-callback error display added that day; re-pasting a fresh `GOCSPX-` secret fixed it). Jon deleted all old accounts first, so the app now runs on a single Google-linked account (psybuster05@gmail.com) — the synthetic-email era is fully retired. Note: Google Cloud Console shows client secrets only once, at creation; use "Add secret" to mint a new one if unsaved.

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
- Day-button photos: **public/days/{push,pull,leg,cardio}.jpg** (note `leg`, singular; runtime URL via `import.meta.env.BASE_URL`). theme.js `dayImage(day)` maps day→file; **swap the file to restyle, no code change**. Always normalize a new photo with **sharp**: `resize(1024×400, fit:cover, position:sharp.strategy.attention)` (subject-aware crop keeps the lifter in frame) → mozjpeg q82 → ~30–50 KB. *(The photos themselves were replaced 2026-07-12 — see that entry.)*
- (Earlier the source banners had a checkerboard *baked into pixels* — AI faux-transparency, not alpha; that set was masked out with sharp, but has since been replaced by the plain photos above.)
- **sharp** now a devDependency — image tooling (resize/compress/convert/flatten/crop/mask) available for future asset jobs; run one-off scripts from the project root so `node_modules` resolves. Not imported at build time (Vite doesn't touch it).
- Calories deferred (needs body weight + MET; body-weight tracking still out of scope). `workouts` record can gain a `calories` field later.

### 2026-07-10 — Confetti, Workout Tracker label, History-only footer, machine exercises
- **Confetti** (src/confetti.js, dependency-free): Finish Workout fires a two-popper canvas burst in the day's accent + brand colors; canvas self-removes when the last particle falls; skipped under prefers-reduced-motion. *(Removed 2026-07-14 — it was invisible on iOS with Reduce Motion on, and Jon opted to drop the feature rather than override the accessibility setting. src/confetti.js deleted.)*
- Day screen's "Workout" card label → **"Workout Tracker"**.
- **Footer only on History** now (App.jsx conditional) — `.screen` bottom padding bumped to 48px so scrolling pages clear the fixed bottom fade without it.
- **3 machine exercises, disabled by default** (`defaultOff: true` in exercises.json): Tricep Pushdown (Push), Lat Pulldown (Pull), Leg Press (Legs) — all reuse orphaned old-program ids so pre-WFH history reattaches, and all videos oEmbed-verified. Seeding: loadStore backfills missing `disabled` entries for defaultOff ids in-memory as `{ off: true, at: 0 }` — `at: 0` loses to any real toggle in the LWW sync merge, so enabling on one device sticks everywhere; nothing is written until the next mutation.
- **Full-bleed header fade fix**: the top gradient moved off `.app-header` (column-width) onto an absolutely-positioned 100vw `::before`, so it spans the viewport on wide screens like the bottom fade; `html { overflow-x: clip }` guards the scrollbar overhang.

### 2026-07-10 — Responsive pass + real cardio banner
- Real cardio photo: Jon's cardio.webp normalized with the sharp recipe (1024×400 attention crop → mozjpeg q82, 41 KB) → public/days/cardio.jpg, replacing the generated placeholder. Source .webp deleted after conversion.
- **Responsive**: layout stays one centered column on every device (phone-first). `--col` var (480px) drives both `.app` max-width and the fixed `.rest-timer` max-width (`--col` − 24) so they can't drift apart; `@media (min-width: 700px)` (iPad mini portrait and up) widens to 600px + day buttons to 160px. Small phones already safe — counter buttons are flex:1, only the 110px value is fixed.
- **Hover states** under `@media (hover: hover) and (pointer: fine)` (laptop/desktop only; touch keeps :active): surface buttons → `--surface-pressed`, counter steppers → accent border, CTAs → brightness bump, day buttons → brightness, text buttons → opacity. Plus `cursor: pointer` on buttons/summaries.
- Preview-pane note: emulated viewports wider than the pane letterbox the screenshot (page scaled into the top-left corner) — measure with getBoundingClientRect, don't trust the shot.

### 2026-07-10 — Cardio: 4th day + finisher card on lifting days
- New **"Cardio" day** (amber `#ffb02e`) with 4 `tracking: "cardio"` exercises: incline-walk, run, jump-rope, cardio-machine. Cardio logs **minutes (reps field) + optional miles (weight field)** — zero storage/sync changes, same trick as time mode. Minutes render as a typeable input (not 32 taps); distance steps ±0.1 mi; failure toggle hidden.
- Data-driven behaviors: `target.goal` → "Goal:" line; `videoUrl` optional (walk/run/machine have none — Exercise hides the frame; jump-rope keeps an oEmbed-verified Jump Rope Dudes video); `restSeconds: 0` = no auto rest timer after logging (jump-rope keeps 60s round rest).
- **Cardio finisher** card on lifting days (Day.jsx, stretch-card shell, amber accent): enabled cardio exercises as tappable rows → same Exercise logging screen, ✓ when logged today, NOT counted in "N of M done". Managed (enable/disable) from the Cardio day's edit mode, which works there like any day.
- format.js: cardio formatSession ("32 min · 2.1 mi", multi "32 + 18 min · 3.4 mi") + personalRecord ("longest 45 min · best 2.1 mi"); first **format.test.js** (6 cases; 15 tests total today after the kg cases).
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
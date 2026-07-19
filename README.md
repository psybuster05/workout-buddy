# Workout Buddy

A phone-first workout tracker — big touch targets, readable at arm's length, built to use one-handed at the gym. Offline-first: workout history lives in the browser's localStorage and works with no connection, with optional Supabase cloud sync so a device losing its local storage can't lose your history.

Live: https://psybuster05.github.io/workout-buddy/

## Features

- **Push / Pull / Legs + a build-your-own Custom day** — each lifting day has its own photo and accent color; Cardio and Core are collapsible finishers below the day's lifts.
- **Whole-workout tracking** — start/finish with a live timer (pause/resume); the first logged set starts the clock automatically, and you can see how many of the day's exercises you've done.
- **Per-exercise logging** — a scroll-snap number ribbon for weight + reps (minutes + distance for cardio, seconds for timed holds); a live "beat last time" overload cue; per-set failure / warm-up flags; a per-exercise rest timer; a form video with written cues that work without it loading; and a sticky per-exercise note.
- **History & personal records** — a workouts feed plus per-exercise history with your best working set and top weight.
- **Bodyweight tracking** — quick weigh-ins on the Account screen (the ribbon prefills to your last entry) with a fold-up history that shows each change.
- **Customize your days** — enable or disable exercises per day in edit mode, and toggle the cardio and core finishers.
- **Imperial or metric** — a lbs/kg toggle that converts on display only (weights are always stored in lbs).
- **Accounts** — sign in with email/password or Google to back up and sync across devices, or use it fully offline with no account.

See [CLAUDE.md](CLAUDE.md) for the full spec, data shapes, conventions, and decision log.

## Tech

React (Vite), no router — screens are switched in `App.jsx`. localStorage is the source of truth; [Supabase](https://supabase.com) provides auth (email/password + Google OAuth) and a one-row-per-user cloud backup behind row-level security. Hosted on GitHub Pages. No UI framework; styling is hand-written CSS.

## Develop

```sh
npm install
npm run dev
npm test       # vitest — sync merge + formatting logic
npm run lint
```

Cloud sync and auth stay off until real Supabase credentials are set in `src/supabaseConfig.js` (the committed anon key is public-safe under row-level security). With placeholders, the app runs entirely local-only.

## Deploy

Push to `main`. GitHub Actions builds and deploys to GitHub Pages (repo Settings → Pages → Source must be set to "GitHub Actions").

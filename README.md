# Workout Buddy

A phone-first workout tracker — big touch targets, readable at arm's length, built to use one-handed at the gym. Offline-first: workout history lives in the browser's localStorage and works with no connection, with optional Supabase cloud sync so a device losing its local storage can't lose your history.

Live: https://psybuster05.github.io/workout-buddy/

## Features

- **Four training days** — Push, Pull, Legs, and Cardio, each with its own photo, accent color, and exercise list.
- **Whole-workout tracking** — start/finish a session with a live timer; see how many of the day's exercises you've done.
- **Per-exercise logging** — weight + reps counters (or minutes + distance for cardio, seconds for timed holds), a form video, written cues that work without the video loading, and an auto-starting rest timer.
- **History & personal records** — a workouts feed plus per-exercise history with estimated 1RM / best marks.
- **Customize your days** — enable or disable exercises per day in edit mode; lifting days include an optional cardio finisher.
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

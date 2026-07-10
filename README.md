# Workout Buddy

Personal workout tracker. One user, used on an iPhone browser mid-workout at the gym. Offline-first: exercise data is hardcoded, workout history lives in localStorage, with optional Supabase cloud sync (username + password) so iOS storage eviction can't lose history. A "Use offline" escape hatch skips sync entirely.

See [CLAUDE.md](CLAUDE.md) for the full spec, conventions, and decision log.

## Develop

```sh
npm install
npm run dev
npm test       # vitest (sync merge logic)
npm run lint
```

Cloud sync is off until real credentials are set in `src/supabaseConfig.js`; with placeholders the app runs local-only.

## Deploy

Push to `main`. GitHub Actions builds and deploys to GitHub Pages (repo Settings → Pages → Source must be set to "GitHub Actions").

# Workout Buddy

Personal workout tracker. One user, used on an iPhone browser mid-workout at the gym. No backend, no accounts — exercise data is hardcoded, workout history lives in localStorage.

See [CLAUDE.md](CLAUDE.md) for the full spec, conventions, and decision log.

## Develop

```sh
npm install
npm run dev
```

## Deploy

Push to `main`. GitHub Actions builds and deploys to GitHub Pages (repo Settings → Pages → Source must be set to "GitHub Actions").

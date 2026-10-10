# Lift

A personal workout and macro tracker, built as an installable web app (PWA) for iPhone.
All data stays on your phone — there is no server or account.

## Features (Phase 1)

- **Workout logging** — exercises, weight (kg), reps, RIR and set type (warm-up / working / drop / failure) for every set
- **"Previous" values** — last session's numbers next to each set; tap to copy. Routine workouts pre-fill last session's weights
- **Rest timer** — starts when you tick a set, per-exercise duration, ±15s, chime when done
- **Volume** — total kg lifted per session and per week (warm-ups excluded)
- **Muscle tracking** — muscles hit per session; weekly hard sets per muscle against a 10–20 target
  (primary muscle = 1 set, secondary = ½ set)
- **Planning** — routines (sets, rep range, target RIR, rest) and a Monday–Sunday schedule
- **Macros** — daily targets, what's left today, quick-add presets for meals you eat often
- **Excel backup** — export everything to one `.xlsx`, and restore from it

## Features (Phase 2)

- **Progression suggestions** — double progression with an RIR target: hit the top of the rep range on
  every set at target RIR → add the weight step (pre-filled when you start the routine); otherwise add reps;
  three sessions without progress → drop ~10%
- **Personal records** — best estimated 1RM, heaviest set and best set volume per exercise, listed on Home
- **Exercise history** — per-exercise charts (est. 1RM, top set, volume) and every past session
- **Muscle heatmap** — front/back body map coloured by this week's sets vs target
- **Calendar & streak** — month view of trained and planned days; weeks in a row hitting your session target
- **Bodyweight log** — daily weigh-ins, 7-day average trend line and kg/week rate

## Install on iPhone

1. Open the site in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch Lift from the home screen icon. It works offline.

Back up regularly from **Settings (⚙️) → Export to Excel** and save the file to Files / iCloud Drive.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build at http://localhost:4173/lift/
```

### Tech stack

React + TypeScript + Vite · Tailwind CSS · Dexie (IndexedDB) · React Router (hash routing) ·
vite-plugin-pwa · ExcelJS · Zod · date-fns · Vitest. Charts and the body map are hand-written SVG
(no chart library) to keep the app small.

### Project layout

```
src/
  app/        routes and the tab-bar shell
  db/         Dexie schema, seed exercise library, data operations
  domain/     pure calculations (volume, muscle sets, macros, weeks, records,
              progression, bodyweight trend, streaks) — unit-tested
  features/   screens: home, train, workout, history, progress, plan, nutrition, settings
  components/ shared UI
  lib/        Excel backup, rest timer, iOS share/download, formatting
```

### Deploying

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to `main`.
One-time setup: **repo Settings → Pages → Source: GitHub Actions**.
The site is served at `https://<user>.github.io/<repo>/`.

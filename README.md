# HTC 2026 Race Tracker

A Progressive Web App for managing the Hood to Coast relay race. Built for a 12-person team running 36 legs over 199 miles from Timberline Lodge to Seaside, Oregon.

## What It Does

- **Live race dashboard** — current runner, handoff logging, ETA projections
- **Driver view** — next exchange address with one-tap Google Maps navigation
- **Runner profiles** — each runner sees their 3 legs with distance, elevation, gear requirements, pace editing
- **Full race timeline** — all 36 legs with projected/actual times and ahead/behind deltas
- **Offline-first** — works with zero cell signal (critical for legs 19-32 which have no coverage)
- **PWA installable** — add to home screen on any phone, runs like a native app

## Architecture

```
index.html    — App shell (HTML + CSS)
app.js        — UI rendering and interactions
engine.js     — Race calculation engine (time projections, state management, localStorage)
data.js       — Race config: 36 legs, 12 runners, GPS coordinates, exchange info
manifest.json — PWA manifest for home screen install
sw.js         — Service worker for offline caching + background updates
```

## Key Design Decisions

- **All time math in epoch milliseconds** — no AM/PM, no timezone bugs, no midnight rollover issues
- **Per-leg pacing** — each runner sets pace for each of their 3 legs independently (vs. one blanket pace)
- **Cascading projections** — when an actual handoff time is logged, all downstream projections recalculate
- **No server required** — pure client-side, localStorage for state persistence
- **No build tools** — vanilla HTML/JS/CSS, any AI or developer can pick it up immediately

## How to Run Locally

```bash
cd "HTC Tracker"
python3 -m http.server 8847
# Open http://localhost:8847
```

## How to Deploy (GitHub Pages)

1. Create a GitHub repo (e.g., `htc-tracker`)
2. Push all files to `main` branch
3. Settings → Pages → Source: Deploy from branch → `main` / `/ (root)`
4. Share URL: `https://yourusername.github.io/htc-tracker/`
5. Teammates open URL → "Add to Home Screen" → done

## How to Update (After Deploy)

1. Edit files locally
2. `git push` to main
3. GitHub Pages rebuilds automatically
4. Next time a user opens the app with signal, the service worker fetches fresh files
5. Bump `CACHE_VERSION` in `sw.js` to force update

## State & Storage

- All race state stored in `localStorage` under key `htc_race_state`
- Runner selection stored under `htc_my_runner`
- State includes: per-leg paces, actual handoff timestamps, current leg pointer
- Reset available in Settings view

## Integration Points (for Meshtastic/radio sync)

The engine exposes clean methods for external data injection:

```javascript
// Log a handoff from radio data
engine.logHandoff(legNumber, epochTimestamp);

// Log a race start
engine.logStart(1, epochTimestamp);

// Get current state for broadcasting
engine.state.actuals  // all logged timestamps
engine.getCurrentLeg()
```

A future `radio.js` module can:
1. Generate short broadcast payloads: `L20:0106` (Leg 20 done at 1:06 AM)
2. Parse incoming payloads and call `engine.logHandoff()`
3. Bridge to Meshtastic via Web Bluetooth or serial

## Race Data

- **Start**: Fri Aug 28, 2026 at 5:35 AM
- **AFT**: 29:46:10
- **Course**: 199.07 miles, 36 legs
- **Team**: 12 runners, 2 vans
- **Major Van Exchanges**: Legs 6, 12, 18, 24, 30
- **No Cell Coverage**: Legs 19-32
- **Course Closes**: Saturday 9:00 PM

## Gear Auto-Detection

The app automatically flags gear requirements based on projected run time:
- 🦺 Reflective vest: required 6:00 PM – 9:00 AM
- 🔦 LED flashers + headlamp: required 6:00 PM – 7:00 AM
- 😷 Bandana: flagged for gravel legs (dust)
- 💧 Pack water: flagged for Springwater Trail legs (no van access)
- ☀️ No shade: flagged for exposed highway legs

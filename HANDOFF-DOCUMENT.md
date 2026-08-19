# HTC 2026 Race Tracker — Full Context Handoff Document

**Author:** bthite (team captain, 13 years running Hood to Coast)
**Built with:** Kiro (AI IDE) at work, August 2026
**Purpose:** Transfer full project context to a second agent (home machine) for continued development, GitHub deployment, and Meshtastic radio integration.

---

## 1. PROJECT OVERVIEW

### What Is This?
A **Progressive Web App (PWA)** that replaces our team's fragile Google Sheets timing system for the Hood to Coast relay race. It's a mobile-first, offline-capable race operations hub used by all 12 runners + drivers during the 36-hour race from Mt. Hood to Seaside, Oregon.

### Why It Exists
For 13 years we've used a Google Sheet for pacing/timing. The problems:
- **AM/PM and midnight rollover bugs** — the sheet can't handle day transitions (times go negative at row 20)
- **Fat-thumb fragility** — one wrong cell edit corrupts everything downstream
- **No cell reception** — Legs 19-32 have zero signal, making a cloud sheet useless
- **Blanket pacing** — old sheet forced one pace per runner for all 3 legs (a runner's pace at 6,000ft elevation descent is not the same as flat farmland)
- **Not designed for runners** — the sheet was a captain's tool, not a team tool

### What It Replaces
- The Google Sheet timing system
- Frantic texting of handoff times
- Flipping through the 80-page printed handbook for leg info
- Guessing when the other van needs to be at the major exchange

---

## 2. THE RACE (Hood to Coast 2026)

### Race Facts
- **44th Annual Hood to Coast Relay**
- **Date:** Friday August 28, 2026 (start) → Saturday August 29, 2026 (finish)
- **Start:** Timberline Lodge, Mt. Hood, OR
- **Finish:** Seaside Beach (Broadway turnaround), OR
- **Distance:** ~199 miles
- **Legs:** 36
- **Team size:** 12 runners (standard)
- **Vans:** 2 (Van 1 = runners 1-6, Van 2 = runners 7-12)

### Our Team Start
- **Start Time:** Friday 08/28 at 5:35 AM
- **Anticipated Finish Time (AFT):** 29:46:10 (hours:min:sec from start)
- **Projected Finish:** Saturday ~11:21 AM

### Team Rotation (Standard 12-Person)
Each runner runs 3 legs (their number, +12, +24):

**Van 1 (Legs 1-6, 13-18, 25-30)**
| # | Runner | Legs |
|---|--------|------|
| 1 | Sarah Perrenoud-Hall | 1, 13, 25 |
| 2 | Blaize Hite | 2, 14, 26 |
| 3 | Kadeem Wilson | 3, 15, 27 |
| 4 | Hashim Hall | 4, 16, 28 |
| 5 | Lucas Diaz | 5, 17, 29 |
| 6 | Betsy Brooks | 6, 18, 30 |

**Van 2 (Legs 7-12, 19-24, 31-36)**
| # | Runner | Legs |
|---|--------|------|
| 7 | Blair Hite | 7, 19, 31 |
| 8 | Kyle Watkins | 8, 20, 32 |
| 9 | Katja Gluhr | 9, 21, 33 |
| 10 | Colleen Constant | 10, 22, 34 |
| 11 | Devin Kelly | 11, 23, 35 |
| 12 | Kimberly Watkins | 12, 24, 36 |

### Important Race Mechanics
- **Major Van Exchanges** (where Van 1 and Van 2 meet): Exchanges 6, 12, 18, 24, 30
- **Vans alternate** — when Van 1 is running (legs 1-6), Van 2 is resting/driving to Exchange 12. They don't run simultaneously.
- **One van only sections:** Legs 19-23 (only Van 2 on course), Legs 32-36 (only Van 2 on course)
- **No cell coverage:** Legs 19-32 (this is the critical offline requirement)
- **Course closes:** Saturday 9:00 PM
- **Safety gear required 6PM-9AM:** reflective vest, LED flashers front+back, headlamp
- **Gravel sections:** Legs 20, 21, 35, 36 (runners should bring bandana for dust)
- **No van access legs:** 9, 10, 11 (Springwater Trail — runners must carry water)

### Default Paces (from 2025 sheet averages)
| Runner | Default Pace | Notes |
|--------|-------------|-------|
| Sarah Perrenoud-Hall | 11:30/mi | Returning runner |
| Blaize Hite | 7:14/mi | Fastest on team |
| Kadeem Wilson | 10:03/mi | Returning runner |
| Hashim Hall | 11:40/mi | Returning runner |
| Lucas Diaz | 9:50/mi | Returning runner |
| Betsy Brooks | 10:30/mi | NEW - placeholder pace |
| Blair Hite | 10:10/mi | Returning runner |
| Kyle Watkins | 9:39/mi | Returning runner |
| Katja Gluhr | 8:05/mi | Returning runner |
| Colleen Constant | 10:30/mi | NEW - placeholder pace |
| Devin Kelly | 9:28/mi | Returning runner |
| Kimberly Watkins | 10:50/mi | Returning runner |

---

## 3. APP ARCHITECTURE

### File Structure
```
HTC Tracker/
├── index.html              ← App shell: HTML structure + all CSS inline
├── app.js                  ← UI rendering, view switching, user interactions
├── engine.js               ← RaceEngine class: calculations, state, localStorage
├── data.js                 ← RACE_CONFIG object: all 36 legs, 12 runners, GPS, notes
├── sw.js                   ← Service worker: offline caching, background updates
├── manifest.json           ← PWA manifest: installable to home screen
├── generate-icons.html     ← Utility: open in browser to generate PNG icons
├── README.md               ← Technical documentation
├── HANDOFF-DOCUMENT.md     ← This file
└── HTC26 Handbook Condensed.pdf  ← Source handbook from race organizers
```

### Technology Stack
- **Pure vanilla HTML/CSS/JS** — no frameworks, no build tools, no dependencies
- **localStorage** for state persistence
- **Service Worker** for offline support
- **PWA manifest** for home screen installation
- **Google Fonts (Inter)** for typography (loaded via CDN, fallback to system fonts offline)

### Why No Framework?
- Zero build step = any AI can read and edit immediately
- No node_modules, no package.json, no npm
- Runs from a static file server (GitHub Pages, python http.server, anything)
- Maximally portable — works in any browser, any device
- The Meshtastic integration is easier without framework abstraction layers

---

## 4. THE ENGINE (engine.js)

### RaceEngine Class

The brain of the app. Handles all time calculations and state management.

**Core principle:** All time stored as **epoch milliseconds** (Unix timestamps). No string formatting until display. This eliminates every AM/PM bug, midnight rollover issue, and timezone problem.

### State Shape
```javascript
state = {
  version: 1,
  raceStarted: false,           // has the race begun?
  currentLeg: 1,                // which leg is active
  paces: {                      // per-leg pace (NOT per-runner blanket)
    "leg_1": { min: 11, sec: 30 },
    "leg_2": { min: 7, sec: 14 },
    // ... all 36 legs
  },
  actuals: {                    // logged timestamps (epoch ms)
    "leg_1_start": 1724826900000,
    "leg_1_end": 1724830844000,
    "leg_2_start": 1724830844000,
    // ... filled in as race progresses
  },
  lastUpdated: 1724826900000
}
```

### Calculation Flow
1. **Estimated time** = pace (ms/mile) × leg distance (miles)
2. **Projected start** = if previous leg has actual end → use that; else cascade (prev projected start + prev estimated time)
3. **Projected end** = projected start + estimated time (or actual start + estimated time if start is logged)
4. **Delta** = actual end - projected end (negative = ahead, positive = behind)
5. **Cascading:** logging one actual time ripples forward and recalculates all downstream projections

### Key Methods
```javascript
engine.logStart(legNum, timestamp?)       // Start the race or a specific leg
engine.logHandoff(legNum, timestamp?)     // End current leg, start next
engine.setPace(legNum, min, sec)          // Set per-leg pace
engine.getProjectedStartMs(legNum)        // Get projected start time
engine.getProjectedEndMs(legNum)          // Get projected end time
engine.getLegSummary(legNum)              // Full summary object for a leg
engine.getAllLegSummaries()               // Array of all 36 summaries
engine.getCumulativeDelta()               // Total ahead/behind across all completed legs
engine.getProjectedFinishMs()             // Projected finish timestamp
```

### Static Helpers
```javascript
RaceEngine.formatTime(ms)          // → "5:35 AM"
RaceEngine.formatTimeWithDay(ms)   // → "Fri 5:35 AM"
RaceEngine.formatDuration(ms)      // → "1:05:44" or "45:23"
RaceEngine.formatDelta(ms)         // → "+4:23" or "-2:10"
RaceEngine.formatPace(min, sec)    // → "10:30/mi"
```

---

## 5. THE DATA (data.js)

### RACE_CONFIG Object

Contains all static race data. This never changes during the race (state changes live in localStorage).

**Each leg includes:**
- `leg` — number 1-36
- `van` — 1 or 2
- `runnerId` — which runner (1-12)
- `distance` — miles (from official handbook)
- `difficulty` — "E", "M", "H", "VH"
- `elevGain` / `elevLoss` / `netElev` — feet
- `description` — one-line terrain summary
- `exchangeAddress` — full address of next exchange
- `gps` — { lat, lng } coordinates
- `notes` — important warnings (van restrictions, safety, parking)
- `noShade` — boolean
- `gravel` — boolean
- `quietZone` — boolean
- `noCellCoverage` — boolean
- `majorExchange` — boolean (only legs 6, 12, 18, 24, 30)

**Data sources:**
- Distances, addresses, GPS, difficulty ratings: HTC26 Official Handbook
- Elevation data: HTC26 Handbook elevation profiles
- Notes and warnings: HTC26 Handbook exchange pages
- Default paces: 2025 team timing sheet (actual averages from last year's race)

---

## 6. THE UI (app.js + index.html)

### Five Views

| View | Tab | Purpose |
|------|-----|---------|
| Race | 🕐 Race | Live dashboard: current runner, handoff button, upcoming legs, major exchange ETA |
| Driver | 🗺 Driver | Next exchange address + "Open in Maps" button, parking notes, warnings |
| My Legs | 👤 My Legs | Personal runner view: your 3 legs, pace editor, gear requirements, full details |
| Full Race | 📋 Full Race | All 36 legs timeline, filterable by van, shows deltas and projections |
| Settings | ⚙ Settings | Runner selection, race info, data reset |

### User Perspectives Served

1. **The Driver** — Driver view gives them the exchange address and a giant Maps button. No confusion about where to go.
2. **The Next Runner** — My Legs view shows distance, elevation, difficulty, gear needs, projected start time.
3. **Other Van Riders** — My Legs view for mental prep (checking their upcoming legs), Full Race for overall picture.
4. **The Captain** — Race view for handoff logging, Full Race for monitoring overall progress.

### Gear Auto-Detection Logic
The app automatically flags safety gear based on projected run time:
- If projected start OR end falls between 6PM-9AM → flag reflective vest
- If projected start OR end falls between 6PM-7AM → flag LED flashers + headlamp
- If leg.gravel === true → flag bandana for dust
- If leg notes mention "Water NOT provided" → flag "pack water"
- If leg.noShade === true → flag "no shade" warning
- If leg.noCellCoverage === true → flag "no cell" warning

### Handoff Logging
Two options in the Race view:
1. **"Log Handoff" button** — stamps `Date.now()` as the handoff time
2. **Manual time input** — `<input type="time">` for entering a time after the fact

The manual time input handles midnight rollover: if the entered time is earlier than race start, it assumes the next calendar day.

---

## 7. PWA / DEPLOYMENT

### Offline Strategy
- Service worker caches all files on first load
- Subsequent visits served from cache (instant load, works without signal)
- When signal is available, SW fetches fresh files in background and updates cache
- Bump `CACHE_VERSION` in sw.js to force all users to update

### Deployment Steps
1. Create GitHub repo (e.g., `htc-tracker`)
2. Push all files from the zip to `main` branch
3. GitHub Settings → Pages → Source: `main` / `/ (root)` → Save
4. Wait ~60 seconds, URL goes live at `https://username.github.io/htc-tracker/`
5. Share URL with team
6. Each person opens it → browser prompts "Add to Home Screen"

### Icon Generation
Open `generate-icons.html` in a browser. It renders two canvas elements (192px and 512px). Right-click each → "Save image as" → save as `icon-192.png` and `icon-512.png` in the project root.

---

## 8. FUTURE DEVELOPMENT: MESHTASTIC INTEGRATION

### The Problem It Solves
Legs 19-32 have zero cell coverage. The two vans can't communicate or sync handoff times during this stretch. The T-Echo LoRa radios (running Meshtastic) provide off-grid mesh communication between the vans.

### Hardware
- 2× LilyGo T-Echo units with built-in GPS and LoRa radio
- Running Meshtastic firmware
- Range: 1-5+ miles line-of-sight (excellent in the open terrain of legs 19-32)

### Integration Phases

**Phase 1 — Manual relay (current, no code needed)**
- T-Echo used as a text walkie-talkie
- Van 1 texts Van 2: "L18 done 1:06AM"
- Van 2 manually enters the time in the app

**Phase 2 — Structured shortcodes (small UI addition)**
- App generates a compact code when handoff logged: `L20:0106` (Leg 20, 01:06 AM)
- Receiver has a "Radio Sync" input field in the app
- Paste/type the code → app parses it → auto-logs the handoff
- Implementation: add a `radio.js` module with `parseRadioMessage()` and `generateRadioMessage()` functions

**Phase 3 — Bluetooth bridge (advanced)**
- Meshtastic already exposes Bluetooth LE to phones
- Web Bluetooth API could connect the HTC app directly to the T-Echo
- Auto-broadcast handoff times over LoRa when logged
- Auto-receive and inject data from the other van's broadcasts
- This is the holy grail but requires deeper Meshtastic protocol work

### Engine API for Integration
```javascript
// Generate broadcast payload
const current = engine.getCurrentLeg();
const actualEnd = engine.getActualEndMs(current);
const payload = `L${current}:${formatForRadio(actualEnd)}`;
// → "L20:0106"

// Receive and inject
function handleRadioMessage(msg) {
  const match = msg.match(/^L(\d+):(\d{2})(\d{2})$/);
  if (match) {
    const leg = parseInt(match[1]);
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);
    // Construct epoch timestamp from hours:minutes + race date logic
    const timestamp = buildTimestamp(hours, minutes);
    engine.logHandoff(leg, timestamp);
  }
}
```

---

## 9. KNOWN ISSUES / TODO

### Needs Fixing
- [ ] Remove "Other Van" panel from Race dashboard — vans don't run simultaneously (Van 1 runs legs 1-6 while Van 2 is off, then they swap). The Full Race view already shows both vans' status for anyone who wants the big picture. The dashboard should only show the currently active van's info.
- [ ] Generate actual PNG icons (currently just the utility HTML exists)

### Enhancement Ideas (Discussed but Not Built)

#### 🐍 RACE SNAKE (Priority — Visual Centerpiece)
An SVG course visualization at the top of the Race dashboard. Uses the 36 GPS exchange coordinates already in `data.js` to draw a smooth path representing the full 199-mile course.

**Implementation approach:**
1. Normalize the 36 GPS lat/lng points into an SVG viewBox (project to simple x/y)
2. Draw a smooth path (cubic bezier or catmull-rom spline through all points)
3. Divide the path into 36 segments (one per leg)
4. Color completed segments (green), active segment (blue pulsing), upcoming (dim gray)
5. Place small circle nodes at each exchange point
6. Major exchanges (6, 12, 18, 24, 30) get larger/highlighted nodes
7. The current position pulses/glows on the active segment
8. Show a progress percentage label

**GPS data already available in data.js:**
```javascript
RACE_CONFIG.legs[0].gps = { lat: 45.304771, lng: -121.759188 } // Exch 1
RACE_CONFIG.legs[1].gps = { lat: 45.307884, lng: -121.854509 } // Exch 2
// ... through leg 36
```

**Projection math (lat/lng → SVG x/y):**
```javascript
// Simple Mercator-ish projection for this regional scale
const lats = legs.map(l => l.gps.lat);
const lngs = legs.map(l => l.gps.lng);
const minLat = Math.min(...lats), maxLat = Math.max(...lats);
const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

function project(lat, lng, width, height) {
  const x = ((lng - minLng) / (maxLng - minLng)) * width;
  const y = height - ((lat - minLat) / (maxLat - minLat)) * height; // flip Y
  return { x, y };
}
```

**Rendering:** Pure SVG element in the DOM, no canvas needed. ~150 lines of code. Fits in ~100-120px height. Tap a node to see leg summary.

**Offline:** Fully offline — it's just math and SVG, no external assets.

**Future enhancement:** Import the GPX polyline from Strava for a higher-fidelity route shape between exchanges (actual road curves instead of straight lines between points). Not needed for V1.

---

#### Other Enhancements
- [ ] Phase 2 radio sync input field (Meshtastic shortcode receiver)
- [ ] "Handoff Incoming" countdown/alert (15-min warning with vibration)
- [ ] Pace Intelligence — auto-adjust projections based on actual performance
- [ ] Van ETA Lock — show other van "BE THERE BY" time for major exchanges
- [ ] Post-race analytics view (performance vs. projected, per-runner arcs)
- [ ] Year-over-year comparison (ghost overlay from previous years' data)
- [ ] "Rally Cry" captain broadcast feature (banner message to all phones)
- [ ] Runner walk-up / hype screen
- [ ] Elapsed timer on dashboard showing how long current runner has been out
- [ ] Notification/vibration when approaching projected handoff time
- [ ] Dark/light mode toggle (currently dark only)
- [ ] Runner avatars or photos

### Data Updates Needed Before Race
- [ ] Betsy Brooks: get actual pace data (currently placeholder 10:30)
- [ ] Colleen Constant: get actual pace data (currently placeholder 10:30)
- [ ] All runners: update per-leg paces based on 2026 training (runners do this themselves in-app)
- [ ] Verify GPS coordinates against 2026 handbook (using 2026 data, should be current)
- [ ] Confirm start time hasn't changed (currently set to 5:35 AM Fri Aug 28)

---

## 10. HOW TO CONTINUE DEVELOPMENT

### For the Home Agent (Gemini or other)

1. Unzip `htc-tracker.zip`
2. All source is plain text files — no compilation or setup needed
3. Run with `python3 -m http.server 8080` (or any static server)
4. Edit any file, refresh browser to see changes
5. The README.md has quick technical reference
6. This document has full context

### Key Modification Points
- **Add a new view:** Add nav button in index.html, add render function in app.js, add case in `renderView()` switch
- **Change race data:** Edit data.js (legs array, runners array)
- **Change calculation logic:** Edit engine.js (RaceEngine class)
- **Add Meshtastic bridge:** Create radio.js, import in index.html, hook into engine.logHandoff()
- **Update styling:** All CSS is inline in index.html `<style>` block
- **Force cache update:** Bump `CACHE_VERSION` string in sw.js

### Testing
- Open in mobile device emulator (Chrome DevTools → responsive mode)
- Test offline: DevTools → Application → Service Workers → "Offline" checkbox
- Test state: DevTools → Application → Local Storage → see `htc_race_state`
- Reset: Settings view → "Reset All Race Data" button (or clear localStorage manually)

---

*Last updated: August 18, 2026*
*Next session: Deploy to GitHub Pages, generate icons, begin Meshtastic Phase 2 integration*

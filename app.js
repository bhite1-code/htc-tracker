// HTC 2026 Race Tracker - App UI
const engine = new RaceEngine(RACE_CONFIG);

// --- SPRITE ANIMATOR ENGINE ---
const SPRITE_CONFIG = { idle: 2, run: 8, sit: 1 };

class SpriteAnimator {
  constructor() {
    this.sprites = [];
    this.vanSprite = null;
    this.vanFrame = 0;
    this.sitTimer = 0;
    this.isSitting = false;
    this.interval = null;

    // Reset sit timer on user interaction
    ['touchstart', 'click', 'scroll'].forEach(evt => 
      window.addEventListener(evt, () => this.resetSitTimer(), { passive: true })
    );

    this.start();
  }

  resetSitTimer() {
    this.sitTimer = 0;
    if (this.isSitting) {
      this.isSitting = false;
      this.tick(); // Instantly stand up
    }
  }

  start() {
    // Run at 5 FPS for that authentic retro feel
    this.interval = setInterval(() => {
      this.sitTimer += 0.2; // 200ms per tick
      if (this.sitTimer > 10) this.isSitting = true; // Sit after 10 seconds of no tapping
      this.tick();
    }, 200);
  }

  mount() {
    // Find all runner sprite containers dynamically injected into the views
    this.sprites = Array.from(document.querySelectorAll('.runner-sprite-el')).map(el => {
      const runnerName = el.dataset.runner.split(' ')[0].toLowerCase();
      return {
        el: el,
        runner: runnerName,
        baseState: el.dataset.state || 'idle',
        frame: 0
      };
    });

    // Find the Van sprite container (if on the Driver View)
    this.vanSprite = document.getElementById('driver-van-sprite');

    this.tick();
  }

  tick() {
    // 1. Animate Runners
    this.sprites.forEach(s => {
      let action = s.baseState;
      if (action !== 'run') {
        action = this.isSitting ? 'sit' : 'idle';
      }
      
      const maxFrames = SPRITE_CONFIG[action] || 2;
      s.frame = (s.frame % maxFrames) + 1;
      
      const imgPath = `assets/${s.runner}/${action}/down/${s.frame}.png`;
      
      if (!s.el.src.endsWith(imgPath)) {
        s.el.src = imgPath;
      }
      
      s.el.onerror = () => {
        if (action === 'sit') {
            s.el.src = `assets/${s.runner}/idle/down/1.png`; 
        } else if (s.frame > 1) {
            s.frame = 1; 
            s.el.src = `assets/${s.runner}/${action}/down/1.png`;
        }
      };
    });

    // 2. Animate the 3x3 Van Sheet
    if (this.vanSprite) {
      this.vanFrame = (this.vanFrame + 1) % 9;
      const col = this.vanFrame % 3;
      const row = Math.floor(this.vanFrame / 3);
      
      // CSS background-position scales cleanly with 0%, 50%, and 100% for a 3x3 grid!
      this.vanSprite.style.backgroundPosition = `${col * 50}% ${row * 50}%`;
    }
  }
}

// Initialize global sprite engine
window.spriteAnimator = new SpriteAnimator();


// --- Persisted runner selection ---
function getMyRunnerId() {
  return parseInt(localStorage.getItem('htc_my_runner') || '1');
}
function setMyRunnerId(id) {
  localStorage.setItem('htc_my_runner', id.toString());
}

// --- View Switching ---
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
  renderView(viewId);
}

function renderView(viewId) {
  switch(viewId) {
    case 'viewRace': renderRaceView(); break;
    case 'viewDriver': renderDriverView(); break;
    case 'viewMyLegs': renderMyLegsView(); break;
    case 'viewFull': renderFullRaceView(); break;
    case 'viewSettings': renderSettingsView(); break;
  }
  renderHeader();
  
  // Re-mount sprites after HTML injection!
  window.spriteAnimator.mount();
}

// --- HEADER ---
function renderHeader() {
  const current = engine.getCurrentLeg();
  const completedLegs = RACE_CONFIG.legs.filter((_, i) => engine.isLegComplete(i + 1)).length;
  const completedMiles = RACE_CONFIG.legs.filter((_, i) => engine.isLegComplete(i + 1))
    .reduce((sum, l) => sum + l.distance, 0);
  const progress = (completedLegs / 36) * 100;

  document.getElementById('progressFill').style.width = `${progress}%`;
  document.getElementById('hdrLeg').textContent = engine.state.raceStarted ? `${current}/36` : '--/36';
  document.getElementById('hdrMiles').textContent = completedMiles.toFixed(1);
  document.getElementById('hdrFinish').textContent = RaceEngine.formatTime(engine.getProjectedFinishMs());

  const delta = engine.getCumulativeDelta();
  const hdrDelta = document.getElementById('hdrDelta');
  if (delta === 0 && !engine.state.raceStarted) {
    hdrDelta.textContent = '--';
    hdrDelta.style.color = '';
  } else {
    hdrDelta.textContent = RaceEngine.formatDelta(delta);
    hdrDelta.style.color = delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : '';
  }

  document.getElementById('headerSub').textContent = engine.state.raceStarted
    ? `Race in progress • Leg ${current}`
    : 'Fri Aug 28 • 5:35 AM Start';
}

// --- RACE SNAKE VISUALIZER ---
function generateRaceSnakeSVG(currentLeg) {
  const lats = RACE_CONFIG.legs.map(l => l.gps.lat);
  // We keep latitude to give the trail an organic vertical wiggle
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);

  const w = 400, h = 100, p = 15;
  
  // SCHEMATIC PROJECTION:
  // X is perfectly spaced left-to-right based on leg number (un-bunches everything)
  // Y retains the geographic latitude to keep the trail shape
  const points = RACE_CONFIG.legs.map((l, i) => {
    const x = p + (i / 35) * (w - 2 * p);
    const y = h - (p + ((l.gps.lat - minLat) / (maxLat - minLat)) * (h - 2 * p));
    return { x, y };
  });

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; display:block; overflow:visible;">`;

  // Draw underlying gray track (Thinner stroke: 2)
  const pathData = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`).join(' ');
  svg += `<path d="${pathData}" fill="none" stroke="var(--surface-3)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;

  // Draw completed progress path (Thinner stroke: 2)
  const completedPoints = points.slice(0, currentLeg); 
  if (completedPoints.length > 1) {
    const compPath = completedPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`).join(' ');
    svg += `<path d="${compPath}" fill="none" stroke="url(#snakeGrad)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
  }

  // Left-to-Right gradient
  svg += `<defs>
            <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--accent)" />
              <stop offset="100%" stop-color="var(--green)" />
            </linearGradient>
          </defs>`;

  // Draw exchange nodes
  points.forEach((pt, i) => {
    const legNum = i + 1;
    const isMajor = legNum % 6 === 0;
    
    // Slightly smaller dots to match the thinner path
    const r = isMajor ? 4 : 2; 

    let fill = 'var(--surface-2)';
    let stroke = 'var(--border)';
    let strokeW = 1.5;
    let pulse = '';

    if (engine.isLegComplete(legNum)) {
      fill = 'var(--green)';
      stroke = 'var(--bg)';
    } else if (legNum === currentLeg) {
      fill = 'var(--accent)';
      stroke = '#fff';
      strokeW = 2;
      pulse = `<circle cx="${pt.x}" cy="${pt.y}" r="6" fill="var(--accent)" class="snake-pulse" opacity="0.6"/>`;
    }

    svg += pulse + `<circle cx="${pt.x}" cy="${pt.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;
  });

  svg += `</svg>`;
  return svg;
}

// --- RACE VIEW (Dashboard) ---
function renderRaceView() {
  const current = engine.getCurrentLeg();
  const summary = engine.getLegSummary(current);
  const runner = summary.runner;
  const leg = summary.legData;
  const nextMajorExch = getNextMajorExchange(current);

  let html = `
    <!-- Race Snake SVG Module -->
    <div class="race-snake-container">
      <div class="snake-title">Course Progress (Mt. Hood &rarr; Seaside)</div>
      ${generateRaceSnakeSVG(current)}
    </div>

    <!-- Active Runner -->
    <div class="card card-glow-blue active-runner-card">
      <div style="display:flex;gap:16px;align-items:center;position:relative;z-index:1;margin-bottom:16px;">
        
        <!-- Sprite Animator Box -->
        <div style="width: 72px; height: 72px; border-radius: var(--radius-sm); background: rgba(0,0,0,0.2); border: 1px solid var(--border); display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
          <img class="runner-sprite-el" data-runner="${runner.name}" data-state="run" src="" style="width: 56px; height: 56px; image-rendering: pixelated; object-fit: contain;">
        </div>

        <div style="flex:1;">
          <div class="active-runner-name">${runner.name}</div>
          <div class="active-runner-subtitle" style="margin-bottom:0;">
            <span class="diff-badge diff-${leg.difficulty}">${RaceEngine.difficultyLabel(leg.difficulty)}</span>
            <span class="van-badge van-badge-${leg.van}">Van ${leg.van}</span>
            ${leg.noCellCoverage ? '<span class="gear-badge required" style="margin-left:4px;">📵 No Cell</span>' : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:32px;font-weight:900;color:var(--accent);">${current}</div>
          <div style="font-size:10px;color:var(--text-muted);">LEG</div>
        </div>
      </div>
      <div class="live-stats">
        <div class="live-stat">
          <div class="live-stat-value">${leg.distance}</div>
          <div class="live-stat-label">Miles</div>
        </div>
        <div class="live-stat">
          <div class="live-stat-value">${RaceEngine.formatDuration(summary.estimatedTime)}</div>
          <div class="live-stat-label">Est. Time</div>
        </div>
        <div class="live-stat">
          <div class="live-stat-value">${RaceEngine.formatTime(summary.projectedEnd)}</div>
          <div class="live-stat-label">ETA Exchange</div>
        </div>
      </div>
    </div>

    <!-- Handoff Controls -->
    <div class="handoff-container">
      ${!engine.state.raceStarted ? `
        <button class="btn-handoff btn-start" onclick="startRace()">▶ Start Race — Go Runner 1!</button>
      ` : current === 36 && engine.isLegComplete(36) ? `
        <button class="btn-handoff btn-finish" disabled style="opacity:0.7;">🎉 RACE COMPLETE!</button>
      ` : `
        <button class="btn-handoff ${current === 36 ? 'btn-finish' : 'btn-primary'}" onclick="logHandoffNow()">
          ${current === 36 ? '🏁 Log Finish!' : `⚡ Log Handoff — Leg ${current} → ${current + 1}`}
        </button>
      `}
      <div class="manual-row">
        <input type="time" class="input-time" id="manualTime" step="60" placeholder="Manual time">
        <button class="btn-manual" onclick="logManualHandoff()">Log Time</button>
      </div>
    </div>

    <!-- Driver Quick Link -->
    <div style="margin-top:14px;">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${leg.gps.lat},${leg.gps.lng}"
         target="_blank"
         style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:var(--radius-sm);background:var(--surface-2);border:1px solid var(--border);text-decoration:none;color:var(--text);">
        <span style="font-size:20px;">📍</span>
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--text-muted);">Exchange ${current} — Navigate</div>
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${leg.exchangeAddress}</div>
        </div>
        <span style="color:var(--green);font-size:12px;font-weight:600;">GO →</span>
      </a>
    </div>

    <!-- Next Major Exchange -->
    ${nextMajorExch ? `
    <div class="major-exchange-callout">
      <div class="major-exchange-callout-title">Next Major Van Exchange</div>
      <div class="major-exchange-callout-time">Exchange ${nextMajorExch.leg} — ${RaceEngine.formatTimeWithDay(nextMajorExch.projectedEnd)}</div>
      <div class="major-exchange-callout-sub">${nextMajorExch.legData.exchangeAddress}</div>
    </div>` : ''}

    <!-- Up Next -->
    <div class="section-title">Coming Up</div>
  `;

  const startFrom = Math.min(current + 1, 36);
  for (let i = startFrom; i <= Math.min(startFrom + 3, 36); i++) {
    const s = engine.getLegSummary(i);
    html += renderLegRow(s);
  }

  document.getElementById('viewRace').innerHTML = html;
}

// --- DRIVER VIEW ---
function renderDriverView() {
  const current = engine.getCurrentLeg();
  const summary = engine.getLegSummary(current);
  const leg = summary.legData;
  const nextLeg = current < 36 ? engine.getLegSummary(current + 1) : null;

  const gpsUrl = `https://www.google.com/maps/dir/?api=1&destination=${leg.gps.lat},${leg.gps.lng}`;

  let warnings = [];
  if (leg.notes.includes('NOT ALLOWED TO STOP')) warnings.push(leg.notes);
  if (leg.noCellCoverage) warnings.push('⚠️ No cell phone coverage in this area');
  if (leg.notes.includes('Only Van 2') || leg.notes.includes('Only van 2')) warnings.push('🚐 Only VAN 2 allowed on this section');
  if (leg.notes.includes('Van 1 ONLY')) warnings.push('🚐 Only VAN 1 parking during high congestion');

  let html = `
    <div class="card card-glow-green">
      <div class="driver-destination">
        <!-- THE DRIVING VAN ANIMATION -->
        <div id="driver-van-sprite" class="driver-van-sprite"></div>

        <div class="driver-destination-label">Driving to Exchange ${current}</div>
        <div class="driver-destination-address">${leg.exchangeAddress}</div>
        <a href="${gpsUrl}" target="_blank" class="btn-navigate">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
          Open in Maps
        </a>
        ${warnings.map(w => `<div class="driver-warning">${w}</div>`).join('')}
        ${leg.notes ? `<div class="driver-parking"><strong>Notes:</strong> ${leg.notes}</div>` : ''}
      </div>
    </div>

    ${nextLeg ? `
    <div class="section-title">After That — Exchange ${current + 1}</div>
    <div class="card">
      <div class="driver-destination">
        <div class="driver-destination-label">Next Exchange</div>
        <div class="driver-destination-address">${nextLeg.legData.exchangeAddress}</div>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${nextLeg.legData.gps.lat},${nextLeg.legData.gps.lng}" target="_blank" class="btn-navigate" style="background:var(--surface-3);color:var(--text);box-shadow:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
          Preview in Maps
        </a>
      </div>
    </div>` : ''}
  `;

  document.getElementById('viewDriver').innerHTML = html;
}

// --- MY LEGS / FOR YOU VIEW ---

function getContextMode(runnerId) {
  if (!engine.state.raceStarted) return { mode: 'PRE_RACE', nextLeg: null, legsUntil: null, minutesUntil: null };

  const myLegs = engine.getRunnerLegs(runnerId);
  const currentLeg = engine.getCurrentLeg();

  const myNextLeg = myLegs.find(l => !engine.isLegComplete(l.leg));
  if (!myNextLeg) return { mode: 'FINISHED', nextLeg: null, legsUntil: 0, minutesUntil: 0 };

  if (engine.isLegActive(myNextLeg.leg)) return { mode: 'RUNNING', nextLeg: myNextLeg, legsUntil: 0, minutesUntil: 0 };

  const legsUntil = myNextLeg.leg - currentLeg;
  const timeUntilMs = engine.getProjectedStartMs(myNextLeg.leg) - Date.now();
  const minutesUntil = Math.max(0, Math.round(timeUntilMs / 60000));

  if (legsUntil <= 1 || minutesUntil <= 15) return { mode: 'NEXT_UP', nextLeg: myNextLeg, legsUntil, minutesUntil };
  if (legsUntil <= 3 || minutesUntil <= 60) return { mode: 'ON_DECK', nextLeg: myNextLeg, legsUntil, minutesUntil };
  return { mode: 'RESTING', nextLeg: myNextLeg, legsUntil, minutesUntil };
}

function renderMyLegsView() {
  const myId = getMyRunnerId();
  const runner = engine.getRunnerById(myId);
  const context = getContextMode(myId);
  const myLegs = engine.getRunnerLegs(myId);

  let html = `
    <select class="runner-picker" id="myRunnerSelect" onchange="changeMyRunner(this.value)">
      ${RACE_CONFIG.runners.map(r => `
        <option value="${r.id}" ${r.id === myId ? 'selected' : ''}>
          ${r.name} — Van ${r.van}
        </option>
      `).join('')}
    </select>
  `;

  html += renderContextHero(context, runner, myId);
  html += `<div class="section-title" style="margin-top:24px;">Your 3 Legs</div>`;

  myLegs.forEach(leg => {
    const summary = engine.getLegSummary(leg.leg);
    const pace = summary.pace;
    const gearNeeded = getGearRequirements(leg, summary);
    const isNext = context.nextLeg && context.nextLeg.leg === leg.leg;
    const isComplete = engine.isLegComplete(leg.leg);

    html += `
      <div class="card ${isNext ? 'card-glow-blue' : ''}" style="${isComplete ? 'opacity:0.6;' : ''}">
        <div class="leg-detail-header">
          <div>
            <div class="leg-number">
              ${isComplete ? '✓ ' : isNext ? '▶ ' : ''}LEG ${leg.leg}
              ${isNext ? '<span style="font-size:10px;color:var(--accent);margin-left:6px;">NEXT UP</span>' : ''}
            </div>
            <div class="leg-runner" style="font-size:15px;">
              <span class="diff-badge diff-${leg.difficulty}">${RaceEngine.difficultyLabel(leg.difficulty)}</span>
              ${leg.noCellCoverage ? '<span class="gear-badge warning">📵 No Cell</span>' : ''}
              ${leg.gravel ? '<span class="gear-badge warning">🪨 Gravel</span>' : ''}
            </div>
          </div>
          <span class="van-badge van-badge-${leg.van}">Van ${leg.van}</span>
        </div>

        <div class="leg-meta-grid">
          <div class="leg-meta-item">
            <div class="leg-meta-value">${leg.distance} mi</div>
            <div class="leg-meta-label">Distance</div>
          </div>
          <div class="leg-meta-item">
            <div class="leg-meta-value">${isComplete ? RaceEngine.formatTime(engine.getActualStartMs(leg.leg)) : RaceEngine.formatTime(summary.projectedStart)}</div>
            <div class="leg-meta-label">${isComplete ? 'Started' : 'Proj. Start'}</div>
          </div>
          <div class="leg-meta-item">
            <div class="elev-viz">
              <span class="elev-arrow-up">↑${leg.elevGain}ft</span>
              <span class="elev-arrow-down">↓${Math.abs(leg.elevLoss)}ft</span>
            </div>
            <div class="leg-meta-label">Elevation</div>
          </div>
          <div class="leg-meta-item">
            <div class="leg-meta-value">${isComplete && summary.actualTime ? RaceEngine.formatDuration(summary.actualTime) : RaceEngine.formatDuration(summary.estimatedTime)}</div>
            <div class="leg-meta-label">${isComplete ? 'Actual Time' : 'Est. Time'}</div>
          </div>
        </div>

        ${isComplete && summary.delta !== null ? `
          <div style="text-align:center;margin:10px 0;font-size:14px;font-weight:700;" class="${summary.delta > 0 ? 'delta-behind' : 'delta-ahead'}">
            ${summary.delta <= 0 ? '🔥' : '⏱️'} ${RaceEngine.formatDelta(summary.delta)} vs projected
          </div>
        ` : ''}

        <div class="leg-description">${leg.description}</div>
        ${leg.notes ? `<div class="leg-notes">📋 ${leg.notes}</div>` : ''}

        ${gearNeeded.length > 0 ? `
        <div class="gear-badges">
          ${gearNeeded.map(g => `<span class="gear-badge ${g.type}">${g.label}</span>`).join('')}
        </div>` : ''}

        ${!isComplete ? `
        <div class="pace-edit-row">
          <span class="pace-label">Pace:</span>
          <input class="pace-input" type="number" min="4" max="20" value="${pace.min}"
            onchange="updatePace(${leg.leg}, this.value, this.nextElementSibling.nextElementSibling.value)">
          <span class="pace-sep">:</span>
          <input class="pace-input" type="number" min="0" max="59" value="${pace.sec}"
            onchange="updatePace(${leg.leg}, this.previousElementSibling.previousElementSibling.value, this.value)">
          <span class="pace-label">/mi</span>
          <span class="pace-est">= ${RaceEngine.formatDuration(summary.estimatedTime)}</span>
        </div>` : ''}

        ${!isComplete && leg.gps ? `
        <a href="https://www.google.com/maps/dir/?api=1&destination=${leg.gps.lat},${leg.gps.lng}"
           target="_blank"
           style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 14px;border-radius:8px;background:var(--surface-2);color:var(--accent);font-size:12px;font-weight:600;text-decoration:none;border:1px solid var(--border);">
          📍 Navigate to Exchange ${leg.leg}
        </a>` : ''}
      </div>
    `;
  });

  document.getElementById('viewMyLegs').innerHTML = html;
}

function renderContextHero(context, runner, runnerId) {
  const { mode, nextLeg, legsUntil, minutesUntil } = context;
  const spriteState = mode === 'RUNNING' ? 'run' : 'idle';

  // The custom pixel art avatar box!
  const spriteBox = `
    <div style="width: 100px; height: 100px; border-radius: var(--radius-sm); background: rgba(0,0,0,0.2); border: 1px solid var(--border); display: flex; justify-content: center; align-items: center; flex-shrink: 0;">
      <img class="runner-sprite-el" data-runner="${runner.name}" data-state="${spriteState}" src="" style="width: 80px; height: 80px; image-rendering: pixelated; object-fit: contain;">
    </div>
  `;

  switch(mode) {
    case 'PRE_RACE': {
      const firstLeg = engine.getRunnerLegs(runnerId)[0];
      const firstSummary = engine.getLegSummary(firstLeg.leg);
      return `
        <div class="card card-glow-blue" style="display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Race starts soon</div>
            <div style="font-size:22px;font-weight:800;">Hey ${runner.name.split(' ')[0]} 👋</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px;">
              Your first leg: <strong>Leg ${firstLeg.leg}</strong> • ${firstLeg.distance} mi • ${RaceEngine.difficultyLabel(firstLeg.difficulty)}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
              Projected start: ${RaceEngine.formatTime(firstSummary.projectedStart)}
            </div>
          </div>
        </div>`;
    }

    case 'RUNNING': {
      const elapsed = Date.now() - engine.getActualStartMs(nextLeg.leg);
      return `
        <div class="card card-glow-green" style="display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--green);font-weight:700;text-transform:uppercase;letter-spacing:1px;">You're Running</div>
            <div style="font-size:28px;font-weight:900;color:var(--text);margin:4px 0;">Leg ${nextLeg.leg}</div>
            <div style="font-size:14px;color:var(--text-muted);">${nextLeg.distance} mi • ${RaceEngine.difficultyLabel(nextLeg.difficulty)}</div>
            <div style="margin-top:8px;font-size:13px;color:var(--text-muted);">
              ⏱️ Elapsed: <strong style="color:var(--text);">${RaceEngine.formatDuration(elapsed)}</strong>
            </div>
          </div>
        </div>`;
    }

    case 'NEXT_UP': {
      const summary = engine.getLegSummary(nextLeg.leg);
      return `
        <div class="card card-glow-orange" style="display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--orange);font-weight:700;text-transform:uppercase;letter-spacing:1px;">You're Next</div>
            <div style="font-size:24px;font-weight:800;margin:4px 0;">Leg ${nextLeg.leg}</div>
            <div style="font-size:13px;color:var(--text-muted);">
              ${minutesUntil > 0 ? `~${minutesUntil} min until handoff` : 'Handoff imminent!'}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
              ${nextLeg.distance} mi • ${RaceEngine.difficultyLabel(nextLeg.difficulty)}
            </div>
          </div>
        </div>`;
    }

    case 'ON_DECK': {
      const summary = engine.getLegSummary(nextLeg.leg);
      return `
        <div class="card card-glow-blue" style="display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">On Deck</div>
            <div style="font-size:20px;font-weight:700;margin:4px 0;">Leg ${nextLeg.leg} in ~${minutesUntil} min</div>
            <div style="font-size:12px;color:var(--text-muted);">
              ${legsUntil} leg${legsUntil > 1 ? 's' : ''} before yours. Start getting ready.
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
              Proj. Start: ${RaceEngine.formatTime(summary.projectedStart)}
            </div>
          </div>
        </div>`;
    }

    case 'RESTING': {
      const summary = engine.getLegSummary(nextLeg.leg);
      const hoursUntil = Math.floor(minutesUntil / 60);
      const minsRemainder = minutesUntil % 60;
      const timeStr = hoursUntil > 0 ? `${hoursUntil}h ${minsRemainder}m` : `${minutesUntil} min`;
      return `
        <div class="card" style="border-color:var(--border); display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:var(--text-dim);">Next up: Leg ${nextLeg.leg}</div>
            <div style="font-size:22px;font-weight:800;color:var(--text-muted);margin:4px 0;">${timeStr} away</div>
            <div style="font-size:12px;color:var(--text-muted);">
              Projected: ~${RaceEngine.formatTime(summary.projectedStart)}
            </div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">
              🛏️ Rest up. Eat. Hydrate. You've got time.
            </div>
          </div>
        </div>`;
    }

    case 'FINISHED': {
      const completedLegs = engine.getRunnerLegs(runnerId).filter(l => engine.isLegComplete(l.leg));
      const totalActual = completedLegs.reduce((sum, l) => {
        const s = engine.getLegSummary(l.leg);
        return sum + (s.actualTime || 0);
      }, 0);
      return `
        <div class="card card-glow-green" style="display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:24px;margin-bottom:4px;">🎉</div>
            <div style="font-size:20px;font-weight:800;">You're Done!</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">
              All 3 legs complete • Total running time: ${RaceEngine.formatDuration(totalActual)}
            </div>
          </div>
        </div>`;
    }

    default:
      return '';
  }
}

// --- FULL RACE VIEW ---
let fullRaceFilter = 'all';

function renderFullRaceView() {
  let html = `
    <div class="race-filter-row">
      <button class="filter-btn ${fullRaceFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">All</button>
      <button class="filter-btn ${fullRaceFilter === '1' ? 'active' : ''}" onclick="setFilter('1')">Van 1</button>
      <button class="filter-btn ${fullRaceFilter === '2' ? 'active' : ''}" onclick="setFilter('2')">Van 2</button>
    </div>
  `;

  const summaries = engine.getAllLegSummaries();
  summaries.forEach(s => {
    if (fullRaceFilter !== 'all' && s.legData.van.toString() !== fullRaceFilter) return;

    const statusClass = s.status === 'complete' ? 'complete' : s.status === 'active' ? 'active' : '';
    const numClass = s.status === 'complete' ? 'complete' : s.status === 'active' ? 'active' : '';
    const isMajor = s.legData.majorExchange ? 'major-exchange' : '';

    html += `
      <div class="race-leg-row ${statusClass} ${isMajor}">
        <div class="leg-row-num ${numClass}">${s.leg}</div>
        <div class="leg-row-info">
          <div class="leg-row-name">${s.runner.name}</div>
          <div class="leg-row-meta">
            ${s.legData.distance}mi • 
            <span class="diff-badge diff-${s.legData.difficulty}" style="padding:1px 5px;font-size:9px;">${s.legData.difficulty}</span>
            ${s.legData.majorExchange ? ' • 🔄 Major Exchange' : ''}
          </div>
        </div>
        <div class="leg-row-time">
          <div class="leg-row-time-value">${RaceEngine.formatTime(s.projectedStart)}</div>
          <div class="leg-row-time-label">${RaceEngine.formatDuration(s.estimatedTime)}</div>
          ${s.delta !== null ? `
            <span class="leg-row-delta ${s.delta > 0 ? 'delta-behind' : 'delta-ahead'}">
              ${RaceEngine.formatDelta(s.delta)}
            </span>` : ''}
        </div>
      </div>
    `;
  });

  document.getElementById('viewFull').innerHTML = html;
}

function setFilter(f) {
  fullRaceFilter = f;
  renderFullRaceView();
}

// --- SETTINGS VIEW ---
function renderSettingsView() {
  document.getElementById('viewSettings').innerHTML = `
    <div class="setting-card">
      <h3>Race Info</h3>
      <p style="font-size:14px;font-weight:600;">Hood to Coast 2026 — 44th Annual</p>
      <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Start: Fri Aug 28, 2026 at 5:35 AM</p>
      <p style="font-size:13px;color:var(--text-muted);">AFT: 29:46:10 (Anticipated Finish Time)</p>
      <p style="font-size:13px;color:var(--text-muted);">Course: 199.07 miles • 36 legs • 12 runners</p>
    </div>
    <div class="setting-card">
      <h3>Your Runner</h3>
      <select class="runner-picker" onchange="setMyRunnerId(parseInt(this.value)); renderSettingsView();">
        ${RACE_CONFIG.runners.map(r => `
          <option value="${r.id}" ${r.id === getMyRunnerId() ? 'selected' : ''}>${r.name}</option>
        `).join('')}
      </select>
      <p style="font-size:12px;color:var(--text-muted);">This sets which runner's legs you see in "My Legs" view.</p>
    </div>
    <div class="setting-card">
      <h3>Data Storage</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">All data stored locally on device. Works fully offline — critical for the no-coverage zone (legs 19–32).</p>
      <button class="btn-danger" onclick="confirmReset()">Reset All Race Data</button>
    </div>
    <div class="setting-card">
      <h3>About</h3>
      <p style="font-size:12px;color:var(--text-muted);line-height:1.6;">Built by the team captain. 13 years of Hood to Coast. No more fat-thumbing the Google Sheet at 3am with no signal on a gravel road in rural Oregon.</p>
    </div>
  `;
}

// --- ACTIONS ---
function startRace() {
  engine.logStart(1);
  renderView('viewRace');
}

function logHandoffNow() {
  engine.logHandoff(engine.getCurrentLeg());
  renderView('viewRace');
}

function logManualHandoff() {
  const input = document.getElementById('manualTime');
  if (!input || !input.value) return;
  const [hours, minutes] = input.value.split(':').map(Number);
  const raceStart = new Date(RACE_CONFIG.startTime);
  let logTime = new Date(raceStart);
  logTime.setHours(hours, minutes, 0, 0);
  if (logTime.getTime() < engine.getRaceStartMs()) {
    logTime.setDate(logTime.getDate() + 1);
  }
  const current = engine.getCurrentLeg();
  if (!engine.state.raceStarted) {
    engine.logStart(1, logTime.getTime());
  } else {
    engine.logHandoff(current, logTime.getTime());
  }
  input.value = '';
  renderView('viewRace');
}

function changeMyRunner(val) {
  setMyRunnerId(parseInt(val));
  renderMyLegsView();
  // BUG FIX: Explicitly tell the SpriteEngine to re-find the new runner image
  // immediately after the dropdown triggers the HTML change!
  window.spriteAnimator.mount();
}

function updatePace(legNum, min, sec) {
  engine.setPace(legNum, parseInt(min) || 10, parseInt(sec) || 0);
  renderMyLegsView();
  renderHeader();
  window.spriteAnimator.mount();
}

function confirmReset() {
  if (confirm('Reset ALL race data? This clears all logged handoff times and pace edits. Cannot be undone.')) {
    engine.resetState();
    renderView('viewRace');
  }
}

// --- HELPERS ---

function getNextMajorExchange(currentLeg) {
  const majorLegs = [6, 12, 18, 24, 30];
  for (const ml of majorLegs) {
    if (ml >= currentLeg && !engine.isLegComplete(ml)) {
      return engine.getLegSummary(ml);
    }
  }
  return null;
}

function getGearRequirements(leg, summary) {
  const gear = [];
  const startTime = new Date(summary.projectedStart);
  const endTime = new Date(summary.projectedEnd);
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();

  const needsVest = startHour >= 18 || startHour < 9 || endHour >= 18 || endHour < 9;
  const needsLights = startHour >= 18 || startHour < 7 || endHour >= 18 || endHour < 7;

  if (needsVest) gear.push({ label: '🦺 Reflective Vest', type: 'required' });
  if (needsLights) gear.push({ label: '🔦 LED Flashers + Headlamp', type: 'required' });
  if (leg.gravel) gear.push({ label: '😷 Bandana (dust)', type: 'warning' });
  if (leg.noCellCoverage) gear.push({ label: '📵 No Cell Coverage', type: 'warning' });
  if (leg.noShade) gear.push({ label: '☀️ No Shade', type: 'warning' });
  if (leg.notes && leg.notes.includes('Water NOT')) gear.push({ label: '💧 Pack Water!', type: 'required' });

  return gear;
}

function renderLegRow(s) {
  return `
    <div class="race-leg-row ${s.status} ${s.legData.majorExchange ? 'major-exchange' : ''}">
      <div class="leg-row-num ${s.status}">${s.leg}</div>
      <div class="leg-row-info">
        <div class="leg-row-name">${s.runner.name}</div>
        <div class="leg-row-meta">
          ${s.legData.distance}mi •
          <span class="diff-badge diff-${s.legData.difficulty}" style="padding:1px 5px;font-size:9px;">${s.legData.difficulty}</span>
          <span class="van-badge van-badge-${s.legData.van}" style="margin-left:4px;">V${s.legData.van}</span>
        </div>
      </div>
      <div class="leg-row-time">
        <div class="leg-row-time-value">${RaceEngine.formatTime(s.projectedStart)}</div>
        <div class="leg-row-time-label">${RaceEngine.formatDuration(s.estimatedTime)}</div>
      </div>
    </div>
  `;
}

// --- INIT ---
renderView('viewRace');

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('✓ Offline ready'))
    .catch(err => console.log('SW failed:', err));
}
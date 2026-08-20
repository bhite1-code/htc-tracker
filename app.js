// --- GLOBAL CRASH CATCHER ---
// If the app freezes, this prints the exact error to the screen!
window.onerror = function(msg, url, lineNo, columnNo, error) {
  document.body.innerHTML = `
    <div style="padding: 30px; padding-top:100px; color: #ff5c5c; font-family: monospace; font-size: 14px; background: #0a0e17; min-height: 100vh;">
      <h3 style="margin-bottom:10px;">⚠️ SYSTEM CRASH</h3>
      <p><strong>Error:</strong> ${msg}</p>
      <p><strong>Line:</strong> ${lineNo}</p>
      <button onclick="localStorage.clear(); location.reload();" style="padding:12px; margin-top:20px; background:var(--red); color:white; border:none; font-weight:bold; border-radius:8px; width:100%;">HARD RESET APP</button>
    </div>`;
  return false;
};

// HTC 2026 Race Tracker - App UI
const engine = new RaceEngine(RACE_CONFIG);

// --- SPRITE ANIMATOR ENGINE ---
const SPRITE_CONFIG = { idle: 2, run: 8, sit: 1 };

class SpriteAnimator {
  constructor() {
    this.sprites = [];
    this.vanSprites = [];
    this.vanFrame = 0;
    this.sitTimer = 0;
    this.isSitting = false;
    this.interval = null;

    ['touchstart', 'click', 'scroll'].forEach(evt => 
      window.addEventListener(evt, () => this.resetSitTimer(), { passive: true })
    );

    this.start();
  }

  resetSitTimer() {
    this.sitTimer = 0;
    if (this.isSitting) {
      this.isSitting = false;
      this.tick(); 
    }
  }

  start() {
    this.interval = setInterval(() => {
      this.sitTimer += 0.2; 
      if (this.sitTimer > 10) this.isSitting = true; 
      this.tick();
    }, 200);
  }

  mount() {
    this.sprites = Array.from(document.querySelectorAll('.runner-sprite-el')).map(el => {
      const runnerName = el.dataset.runner.split(' ')[0].toLowerCase();
      return {
        el: el,
        runner: runnerName,
        baseState: el.dataset.state || 'idle',
        frame: 0,
        isBroken: false
      };
    });

    this.vanSprites = Array.from(document.querySelectorAll('.driver-van-sprite'));
    this.tick();
  }

  tick() {
    this.sprites.forEach(s => {
      if (s.isBroken) return; 

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
        s.el.onerror = null; 
        s.isBroken = true; 
        s.el.style.opacity = '0'; 
      };
    });

    if (this.vanSprites && this.vanSprites.length > 0) {
      this.vanFrame = (this.vanFrame + 1) % 9;
      const col = this.vanFrame % 3;
      const row = Math.floor(this.vanFrame / 3);
      this.vanSprites.forEach(van => {
         van.style.backgroundPosition = `${col * 50}% ${row * 50}%`;
      });
    }
  }
}

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
  window.spriteAnimator.mount();
}

// --- DAY/NIGHT ENVIRONMENT ENGINE ---
function updateDayNightCycle() {
  const current = Math.max(1, Math.min(engine.getCurrentLeg(), 36));
  const summary = engine.getLegSummary(current);
  const date = new Date(summary.projectedStart);
  const hour = date.getHours();
  
  let timeOfDay = 'day';
  if (hour >= 20 || hour < 5) timeOfDay = 'night';
  else if (hour >= 5 && hour < 8) timeOfDay = 'dawn';
  
  document.body.setAttribute('data-time', timeOfDay);
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

  updateDayNightCycle();
}

// --- RACE SNAKE VISUALIZER ---
function generateRaceSnakeSVG(currentLeg) {
  const lats = RACE_CONFIG.legs.map(l => l.gps.lat);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);

  const w = 400, h = 100, p = 15;
  
  const points = RACE_CONFIG.legs.map((l, i) => {
    const x = p + (i / 35) * (w - 2 * p);
    const y = h - (p + ((l.gps.lat - minLat) / (maxLat - minLat)) * (h - 2 * p));
    return { x, y };
  });

  let svg = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; display:block; overflow:visible;">`;

  const pathData = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`).join(' ');
  svg += `<path d="${pathData}" fill="none" stroke="var(--surface-3)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;

  const completedPoints = points.slice(0, currentLeg); 
  if (completedPoints.length > 1) {
    const compPath = completedPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`).join(' ');
    svg += `<path d="${compPath}" fill="none" stroke="url(#snakeGrad)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="snake-path-animate" />`;
  }

  svg += `<defs>
            <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="var(--accent)" />
              <stop offset="100%" stop-color="var(--green)" />
            </linearGradient>
          </defs>`;

  points.forEach((pt, i) => {
    const legNum = i + 1;
    const isMajor = legNum % 6 === 0;
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

  const runnerFirstName = runner.name.split(' ')[0].toLowerCase();
  const prefillSrc = `assets/${runnerFirstName}/run/down/1.png`;

  // FIXED GOOGLE MAPS NATIVE URL
  const mapNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${leg.gps.lat},${leg.gps.lng}`;

  let html = `
    <div class="race-snake-container">
      <div class="snake-title">Course Progress (Mt. Hood → Seaside)</div>
      ${generateRaceSnakeSVG(current)}
    </div>

    <div class="card card-glow-blue active-runner-card">
      <div style="display:flex;gap:16px;align-items:center;position:relative;z-index:1;margin-bottom:16px;">
        <div style="width: 80px; height: 80px; border-radius: var(--radius-sm); background: rgba(0,0,0,0.2); border: 1px solid var(--border); display: flex; justify-content: center; align-items: center; flex-shrink: 0; overflow:hidden;">
          <img class="runner-sprite-el" data-runner="${runner.name}" data-state="run" src="${prefillSrc}" onerror="this.style.opacity='0'" style="width: 56px; height: 56px; image-rendering: pixelated; object-fit: contain; transform: scale(1.4); transform-origin: center; transition: opacity 0.2s;">
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
          <div style="font-size:42px; font-family:Outfit, sans-serif; font-weight:900; letter-spacing:-1px; color:var(--accent); line-height: 0.8; margin-bottom: 4px;">${current}</div>
          <div style="font-size:10px;color:var(--text-muted);font-weight:700;">LEG</div>
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

    <div class="handoff-container">
      ${!engine.state.raceStarted ? `
        <button class="btn-handoff btn-start" onclick="startRace()">▶ Start Race!</button>
      ` : current === 36 && engine.isLegComplete(36) ? `
        <button class="btn-handoff btn-finish" disabled style="opacity:0.7;">🎉 RACE COMPLETE!</button>
      ` : `
        <button class="btn-handoff ${current === 36 ? 'btn-finish' : 'btn-primary'}" onclick="logHandoffNow()">
          ${current === 36 ? '🏁 Log Finish!' : `⚡ Log Handoff → ${current + 1}`}
        </button>
      `}
      <div class="manual-row">
        <input type="time" class="input-time" id="manualTime" step="60" placeholder="Manual time">
        <button class="btn-manual" onclick="logManualHandoff()">Update</button>
      </div>
    </div>

    <div style="margin-top:20px; margin-bottom: 12px;">
      <a href="${mapNavUrl}" target="_blank"
         style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:var(--radius-sm);background:var(--surface-2);border:1px solid var(--border);text-decoration:none;color:var(--text);box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <div style="width: 32px; height: 32px; flex-shrink:0;">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#3b9eff"/>
            </svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px; font-weight: 700; color:var(--accent); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom:2px;">Navigate to Exchange ${current}</div>
          <div style="font-size:14px; font-weight:500; line-height:1.4; color:var(--text); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
              ${leg.exchangeAddress}
          </div>
        </div>
        <div style="flex-shrink:0; background: rgba(0, 214, 143, 0.15); border-radius: 20px; padding: 6px 12px; display:flex; align-items:center; gap: 4px;">
            <span style="color:var(--green);font-size:12px;font-weight:700;">GO</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </a>
    </div>

    ${nextMajorExch ? `
    <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-left: 3px solid var(--orange); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
      <div style="font-size: 11px; font-weight: 700; color: var(--orange); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Next Major Exchange: ${nextMajorExch.leg}</div>
      <div style="font-size: 13px; color: var(--text-muted);">ETA: <strong style="color:var(--text);">${RaceEngine.formatTimeWithDay(nextMajorExch.projectedEnd)}</strong></div>
    </div>` : ''}

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

  const mapNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${leg.gps.lat},${leg.gps.lng}`;

  let warnings = [];
  if (leg.notes.includes('NOT ALLOWED TO STOP')) warnings.push(leg.notes);
  if (leg.noCellCoverage) warnings.push('⚠️ No cell phone coverage in this area');
  if (leg.notes.includes('Only Van 2') || leg.notes.includes('Only van 2')) warnings.push('🚐 Only VAN 2 allowed on this section');
  if (leg.notes.includes('Van 1 ONLY')) warnings.push('🚐 Only VAN 1 parking during high congestion');

  let html = `
    <div class="card card-glow-green">
      <div class="driver-destination">
        <div class="driver-van-sprite"></div>
        <div class="driver-destination-label">Driving to Exchange ${current}</div>
        <div class="driver-destination-address">${leg.exchangeAddress}</div>
        <a href="${mapNavUrl}" target="_blank" class="btn-navigate">
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

function formatTimeLeft(totalMins) {
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${m}m`;
}

function renderMyLegsView() {
  const myId = getMyRunnerId();
  const runner = engine.getRunnerById(myId);
  const context = getContextMode(myId);
  const myLegs = engine.getRunnerLegs(myId);

  const hasSetPace = localStorage.getItem(`htc_paces_set_${myId}`) === 'true';
  let pacePromptHtml = '';
  
  if (!hasSetPace) {
    pacePromptHtml = `
      <div class="card card-glow-orange" style="margin-top:24px; padding: 16px; border-color: var(--orange);">
        <div style="font-weight: 800; color: var(--orange); margin-bottom: 8px;">⚠️ Action Required: Set Your Paces</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          You haven't set your anticipated pace yet. Enter a base pace below to apply it to all your legs, or adjust them individually below. <strong>These save automatically and won't delete if we reset the race.</strong>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="number" id="basePaceMin" placeholder="Min" style="width: 65px; padding: 10px; background: var(--surface-3); border: 1px solid var(--border); color: white; border-radius: 6px; font-size: 16px; text-align: center;">
            <span style="font-weight:bold;">:</span>
            <input type="number" id="basePaceSec" placeholder="Sec" style="width: 65px; padding: 10px; background: var(--surface-3); border: 1px solid var(--border); color: white; border-radius: 6px; font-size: 16px; text-align: center;">
            <button class="btn-primary" style="padding: 10px 16px; flex: 1; font-family:Outfit, sans-serif; font-size: 16px; font-weight: 700; border-radius: 6px; border:none; color:white; background: linear-gradient(135deg, var(--accent), #2b7fd4);" onclick="applyBasePace(${myId})">Apply</button>
        </div>
      </div>
    `;
  }

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
  html += pacePromptHtml; 
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
            <div class="leg-runner" style="font-family:Outfit, sans-serif; font-size:20px; font-weight:800; letter-spacing:-0.5px; margin-bottom:2px;">
              <span class="diff-badge diff-${leg.difficulty}" style="font-family:Inter, sans-serif;">${RaceEngine.difficultyLabel(leg.difficulty)}</span>
              ${leg.noCellCoverage ? '<span class="gear-badge warning" style="font-family:Inter, sans-serif;">📵 No Cell</span>' : ''}
              ${leg.gravel ? '<span class="gear-badge warning" style="font-family:Inter, sans-serif;">🪨 Gravel</span>' : ''}
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
      </div>
    `;
  });

  document.getElementById('viewMyLegs').innerHTML = html;
}

function renderContextHero(context, runner, runnerId) {
  const { mode, nextLeg, legsUntil, minutesUntil } = context;
  const spriteState = mode === 'RUNNING' ? 'run' : 'idle';
  const runnerFirstName = runner.name.split(' ')[0].toLowerCase();
  
  const prefillSrc = `assets/${runnerFirstName}/${spriteState}/down/1.png`;

  const spriteBox = `
    <div style="width: 100px; height: 100px; border-radius: var(--radius-sm); background: rgba(0,0,0,0.2); border: 1px solid var(--border); display: flex; justify-content: center; align-items: center; flex-shrink: 0; overflow:hidden;">
      <img class="runner-sprite-el" data-runner="${runner.name}" data-state="${spriteState}" src="${prefillSrc}" onerror="this.style.opacity='0'" style="width: 70px; height: 70px; image-rendering: pixelated; object-fit: contain; transform: scale(1.4); transform-origin: center; transition: opacity 0.2s;">
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
            <div class="active-runner-name" style="font-size:24px;">Hey ${runner.name.split(' ')[0]} 👋</div>
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
            <div class="active-runner-name" style="font-size:28px; color:var(--text); margin:4px 0;">Leg ${nextLeg.leg}</div>
            <div style="font-size:14px;color:var(--text-muted);">${nextLeg.distance} mi • ${RaceEngine.difficultyLabel(nextLeg.difficulty)}</div>
            <div style="margin-top:8px;font-size:13px;color:var(--text-muted);">
              ⏱️ Elapsed: <strong style="color:var(--text);">${RaceEngine.formatDuration(elapsed)}</strong>
            </div>
          </div>
        </div>`;
    }

    case 'NEXT_UP': {
      const summary = engine.getLegSummary(nextLeg.leg);
      const pulseClass = minutesUntil <= 15 ? 'imminent' : '';
      return `
        <div class="card card-glow-orange ${pulseClass}" style="display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--orange);font-weight:700;text-transform:uppercase;letter-spacing:1px;">You're Next</div>
            <div class="active-runner-name" style="font-size:24px; margin:4px 0;">Leg ${nextLeg.leg}</div>
            <div style="font-size:13px;color:var(--text-muted);">
              ${minutesUntil > 0 ? `~${formatTimeLeft(minutesUntil)} until handoff` : 'Handoff imminent!'}
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
            <div class="active-runner-name" style="font-size:24px; margin:4px 0;">Leg ${nextLeg.leg}</div>
            <div style="font-size:12px;color:var(--text-muted);">
              ${legsUntil} leg${legsUntil > 1 ? 's' : ''} before yours. (~${formatTimeLeft(minutesUntil)})
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">
              Proj. Start: ${RaceEngine.formatTime(summary.projectedStart)}
            </div>
          </div>
        </div>`;
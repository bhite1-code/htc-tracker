// --- GLOBAL CRASH CATCHER ---
window.onerror = function(msg, url, lineNo, columnNo, error) {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed; inset:0; background:white; color:red; z-index:999999; padding:40px; font-size:20px; overflow-y:auto;';
  errDiv.innerHTML = `<strong>CRASH DETECTED</strong><br><br>${msg}<br><br>Line: ${lineNo}<br><br><button onclick="localStorage.clear(); window.location.reload(true);" style="padding:20px; background:black; color:white; width:100%; font-size:18px; margin-top:20px; border-radius:10px;">HARD RESET APP</button>`;
  document.body.appendChild(errDiv);
  return false;
};

// --- CINEMATIC INTRO CONTROLLER ---
const PROGRESS_DURATION_MS = 10500; 
const AUTO_FINISH_MS = 17000;       
let introInterval = null;
let autoFinishTimeout = null;

function runIntroSequence() {
  const introScreen = document.getElementById('introScreen');
  const fill = document.getElementById('introProgressFill');
  const status = document.getElementById('introStatusText');
  const launchBtn = document.getElementById('btnIntroLaunch');
  if (!introScreen || !fill || !status) return;

  if (launchBtn) launchBtn.classList.remove('visible');

  const messages = [
    { pct: 18, text: "MOUNTING RETRO TELEMETRY..." },
    { pct: 36, text: "CALIBRATING MT. HOOD ELEVATIONS..." },
    { pct: 56, text: "INITIALIZING VAN RADIO SYNC..." },
    { pct: 76, text: "LOCKING SATELLITE FIXES..." },
    { pct: 95, text: "READY FOR RACE DAY. GO DEUCES WILD!" },
    { pct: 100, text: "SYSTEM READY. READY TO LAUNCH." }
  ];

  const startTime = Date.now();
  let buttonRevealed = false;

  introInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(100, (elapsed / PROGRESS_DURATION_MS) * 100);
    fill.style.width = `${progress}%`;

    const currentMsg = messages.find(m => progress <= m.pct) || messages[messages.length - 1];
    status.textContent = currentMsg.text;

    if (progress >= 100 && !buttonRevealed) {
      buttonRevealed = true;
      if (launchBtn) launchBtn.classList.add('visible');
      clearInterval(introInterval);
    }
  }, 50);

  autoFinishTimeout = setTimeout(() => {
    finishIntro();
  }, AUTO_FINISH_MS);
}

function finishIntro() {
  if (introInterval) clearInterval(introInterval);
  if (autoFinishTimeout) clearTimeout(autoFinishTimeout);
  const introScreen = document.getElementById('introScreen');
  if (introScreen) {
    introScreen.classList.add('hidden');
    const video = introScreen.querySelector('video');
    if (video) video.pause();
  }
}

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

// --- PERSISTED SETTINGS ---
function getMyRunnerId() {
  return parseInt(localStorage.getItem('htc_my_runner') || '1');
}
function setMyRunnerId(id) {
  localStorage.setItem('htc_my_runner', id.toString());
}

// Check if paces are locked/set for this runner in the engine state
function hasRunnerSetPaces(runnerId) {
  const runnerLegs = engine.getRunnerLegs(runnerId);
  // Check if any of their legs have a custom pace set in the engine state, or flagged in storage
  const hasEnginePace = runnerLegs.some(l => engine.state.paces && engine.state.paces[l.leg]);
  const hasLocalStoragePace = localStorage.getItem(`htc_paces_set_${runnerId}`) === 'true';
  return hasEnginePace || hasLocalStoragePace;
}

// --- VIEW SWITCHING ---
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

  const mapNavUrl = `https://www.google.com/maps/search/?api=1&query=${leg.gps.lat},${leg.gps.lng}`;

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

  const mapNavUrl = `https://www.google.com/maps/search/?api=1&query=${leg.gps.lat},${leg.gps.lng}`;

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
        <a href="https://www.google.com/maps/search/?api=1&query=${nextLeg.legData.gps.lat},${nextLeg.legData.gps.lng}" target="_blank" class="btn-navigate" style="background:var(--surface-3);color:var(--text);box-shadow:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
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

  const setPaces = hasRunnerSetPaces(myId);
  let pacePromptHtml = '';
  
  if (!setPaces) {
    pacePromptHtml = `
      <div class="card card-glow-orange" style="margin-top:24px; padding: 16px; border-color: var(--orange);">
        <div style="font-weight: 800; color: var(--orange); margin-bottom: 8px;">⚠️ Action Required: Set Your Paces</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          You haven't set your anticipated pace yet. Enter a base pace below to lock it to all your legs. <strong>Once saved, it locks into the engine state so it syncs across all your devices.</strong>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="number" id="basePaceMin" placeholder="Min" style="width: 65px; padding: 10px; background: var(--surface-3); border: 1px solid var(--border); color: white; border-radius: 6px; font-size: 16px; text-align: center;">
            <span style="font-weight:bold;">:</span>
            <input type="number" id="basePaceSec" placeholder="Sec" style="width: 65px; padding: 10px; background: var(--surface-3); border: 1px solid var(--border); color: white; border-radius: 6px; font-size: 16px; text-align: center;">
            <button class="btn-primary" style="padding: 10px 16px; flex: 1; font-family:Outfit, sans-serif; font-size: 16px; font-weight: 700; border-radius: 6px; border:none; color:white; background: linear-gradient(135deg, var(--accent), #2b7fd4);" onclick="applyBasePace(${myId})">Lock & Apply</button>
        </div>
      </div>
    `;
  } else {
    pacePromptHtml = `
      <div style="margin-top: 16px; padding: 10px 14px; background: rgba(0, 214, 143, 0.1); border: 1px solid rgba(0, 214, 143, 0.3); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 12px; color: var(--green); font-weight: 700;">🔒 Paces Locked & Cloud Synced</span>
        <button style="background:none; border:none; color:var(--text-muted); font-size:11px; text-decoration:underline; cursor:pointer;" onclick="unlockPaces(${myId})">Edit Paces</button>
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

function unlockPaces(runnerId) {
  localStorage.removeItem(`htc_paces_set_${runnerId}`);
  renderMyLegsView();
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
    }

    case 'RESTING': {
      const summary = engine.getLegSummary(nextLeg.leg);
      return `
        <div class="card" style="border-color:var(--border); display:flex; align-items:center; gap: 16px; text-align:left;">
          ${spriteBox}
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:var(--text-dim);">Next up: Leg ${nextLeg.leg}</div>
            <div class="active-runner-name" style="font-size:24px; color:var(--text-muted); margin:4px 0;">${formatTimeLeft(minutesUntil)}</div>
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
            <div class="active-runner-name" style="font-size:24px;">You're Done!</div>
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
  
  const completedLegs = [];
  for (let i = 1; i <= 36; i++) {
    if (engine.isLegComplete(i)) completedLegs.push(i);
  }
  const fixLegOptions = completedLegs.map(l => `<option value="${l}">Leg ${l}</option>`).join('');

  document.getElementById('viewSettings').innerHTML = `
    <!-- OFFLINE BULK SYNC -->
    <div class="setting-card" style="border-color: var(--accent); background: linear-gradient(135deg, rgba(59, 158, 255, 0.05), var(--surface));">
      <h3 style="color:var(--accent);">📻 Off-Grid Radio Sync</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Share your van's recent completed legs, or import a bulk code received from the other van via Meshtastic.</p>
      
      <button class="btn-manual" style="width:100%; margin-bottom:8px; background: rgba(59, 158, 255, 0.1); border-color:var(--accent);" onclick="exportBulkSync()">
        📤 Copy Outbound Sync (Last 6 Legs)
      </button>
      <button class="btn-manual" style="width:100%; background:var(--surface-3); border-color:var(--accent); color:var(--text);" onclick="importBulkSync()">
        📥 Paste Inbound Sync
      </button>
    </div>

    <div class="setting-card">
      <h3>Replay Intro</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Show the cinematic boot sequence again.</p>
      <button class="btn-manual" style="width:100%;" onclick="document.getElementById('introScreen').classList.remove('hidden'); const v = document.querySelector('#introScreen video'); if(v){ v.currentTime=0; v.play(); } runIntroSequence();">🎬 Replay Intro Screen</button>
    </div>

    <div class="setting-card">
      <h3>Race Info</h3>
      <p style="font-size:14px;font-weight:600;">Hood to Coast 2026 — 44th Annual</p>
      <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">Start: Fri Aug 28, 2026 at 5:35 AM</p>
      <p style="font-size:13px;color:var(--text-muted);">AFT: 29:46:10 (Anticipated Finish Time)</p>
      <p style="font-size:13px;color:var(--text-muted);">Course: 199.07 miles • 36 legs • 12 runners</p>
    </div>

    <div class="setting-card">
      <h3>Fix a Wrong Entry</h3>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Accidentally clicked early or entered the wrong time? Fix it here.</p>
      
      <button class="btn-danger" style="margin-bottom:16px; border-color:var(--orange); color:var(--orange);" onclick="undoLastHandoff()">↩ Undo Last Handoff</button>

      ${completedLegs.length > 0 ? `
      <div style="border-top: 1px solid var(--border); padding-top: 12px;">
        <label style="font-size:11px;color:var(--text-muted);">EDIT PAST TIME:</label>
        <div style="display:flex; gap:8px; margin-top:6px;">
          <select id="fixLegSelect" class="input-time" style="flex: 0.5; font-size:13px;">
            ${fixLegOptions}
          </select>
          <input type="time" class="input-time" id="fixLegTime" step="60" style="flex: 1;">
        </div>
        <button class="btn-manual" style="width:100%; margin-top:8px; background: rgba(59, 158, 255, 0.1);" onclick="fixLoggedTime()">Update Time</button>
      </div>
      ` : ''}
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
      <button class="btn-danger" onclick="confirmReset()">Reset Race Progress</button>
    </div>
  `;
}

// --- TOAST NOTIFICATIONS ---
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = "position:fixed; top:80px; left:50%; transform:translateX(-50%); background:var(--accent); color:#fff; padding:12px 24px; border-radius:30px; font-weight:800; font-family:Outfit, sans-serif; z-index:99999; box-shadow:0 8px 24px rgba(0,0,0,0.5); font-size:15px; pointer-events:none; text-align:center; white-space:nowrap; animation: toastIn 0.3s ease-out;";
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.4s ease';
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

// --- BULK OFFLINE SYNC LOGIC ---
function exportBulkSync() {
  if (!navigator.clipboard) return alert("Clipboard API not supported by this browser.");
  
  let syncData = [];
  
  for (let i = 1; i <= 36; i++) {
    if (engine.state.actuals[`leg_${i}_end`]) {
      let d = new Date(engine.state.actuals[`leg_${i}_end`]);
      let hh = String(d.getHours()).padStart(2, '0');
      let mm = String(d.getMinutes()).padStart(2, '0');
      syncData.push(`${i}:${hh}${mm}`); 
    }
  }
  
  if (syncData.length === 0) return showToast("No completed legs to sync yet!");
  
  let payloadArr = syncData.slice(-6);
  let payloadStr = `HTC|SYNC|${payloadArr.join(',')}`;
  
  navigator.clipboard.writeText(payloadStr).then(() => {
    showToast(`📻 Copied ${payloadArr.length} legs to clipboard!`);
  }).catch(e => {
    alert("Clipboard copy failed.");
  });
}

async function importBulkSync() {
  try {
    const text = await navigator.clipboard.readText();
    
    if (!text || !text.startsWith("HTC|SYNC|")) {
      return alert("No valid Bulk Sync code found on clipboard.\nMake sure it starts with HTC|SYNC|");
    }
    
    const dataStr = text.replace("HTC|SYNC|", "");
    const pairs = dataStr.split(',');
    let importedCount = 0;
    
    const raceStart = new Date(RACE_CONFIG.startTime);
    
    pairs.forEach(pair => {
      const parts = pair.split(':');
      if (parts.length === 2 && parts[1].length === 4) {
        const leg = parseInt(parts[0]);
        const hrs = parseInt(parts[1].substring(0,2));
        const mins = parseInt(parts[1].substring(2,4));
        
        let logTime = new Date(raceStart);
        logTime.setHours(hrs, mins, 0, 0);
        
        if (logTime.getTime() < engine.getRaceStartMs() - 3600000) {
          logTime.setDate(logTime.getDate() + 1);
        }
        
        engine.state.actuals[`leg_${leg}_end`] = logTime.getTime();
        if (leg < 36) {
          engine.state.actuals[`leg_${leg + 1}_start`] = logTime.getTime();
        }
        importedCount++;
      }
    });
    
    if (importedCount > 0) {
      engine.saveState();
      renderView('viewSettings');
      showToast(`✅ Successfully synced ${importedCount} legs!`);
    } else {
      alert("Could not parse the times in the sync code.");
    }
  } catch(e) {
    alert("Clipboard access denied or clipboard is empty.");
  }
}

// --- ACTIONS ---
function startRace() {
  if (navigator.vibrate) navigator.vibrate([200]); 
  engine.logStart(1);
  renderView('viewRace');
}

function logHandoffNow() {
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
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

function undoLastHandoff() {
  if (!confirm('Are you sure you want to undo the last handoff?')) return;
  
  const current = engine.getCurrentLeg();
  
  if (current === 36 && engine.isLegComplete(36)) {
    delete engine.state.actuals['leg_36_end'];
    engine.saveState();
    switchView('viewRace');
    return;
  }
  
  if (current === 1 && !engine.state.raceStarted) return;
  
  if (current === 1 && engine.state.raceStarted) {
    delete engine.state.actuals['leg_1_start'];
    engine.state.raceStarted = false;
    engine.saveState();
    switchView('viewRace');
    return;
  }
  
  const legToUndo = current - 1;
  delete engine.state.actuals[`leg_${legToUndo}_end`];
  delete engine.state.actuals[`leg_${current}_start`];
  engine.state.currentLeg = legToUndo;
  engine.saveState();
  
  switchView('viewRace');
}

function fixLoggedTime() {
  const legStr = document.getElementById('fixLegSelect').value;
  const timeStr = document.getElementById('fixLegTime').value;
  if (!legStr || !timeStr) {
    alert("Please enter a valid time.");
    return;
  }

  const legNum = parseInt(legStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const raceStart = new Date(RACE_CONFIG.startTime);
  let logTime = new Date(raceStart);
  logTime.setHours(hours, minutes, 0, 0);

  if (logTime.getTime() < engine.getRaceStartMs() - 3600000) { 
    logTime.setDate(logTime.getDate() + 1);
  }

  engine.state.actuals[`leg_${legNum}_end`] = logTime.getTime();
  if (legNum < 36) {
    engine.state.actuals[`leg_${legNum + 1}_start`] = logTime.getTime();
  }
  engine.saveState();

  alert(`Leg ${legNum} time successfully updated!`);
  renderView('viewSettings');
}

function changeMyRunner(val) {
  setMyRunnerId(parseInt(val));
  renderMyLegsView();
  window.spriteAnimator.mount();
}

function applyBasePace(runnerId) {
  const min = parseInt(document.getElementById('basePaceMin').value);
  const sec = parseInt(document.getElementById('basePaceSec').value);
  
  if (isNaN(min) || isNaN(sec)) {
    alert("Please enter a valid minutes and seconds pace.");
    return;
  }
  
  const myLegs = engine.getRunnerLegs(runnerId);
  myLegs.forEach(l => {
    engine.setPace(l.leg, min, sec);
  });
  
  // Lock it in engine state and flag locally
  engine.saveState();
  localStorage.setItem(`htc_paces_set_${runnerId}`, 'true');
  renderMyLegsView();
  renderHeader();
  showToast("🔒 Paces locked and saved to cloud sync!");
}

function updatePace(legNum, min, sec) {
  engine.setPace(legNum, parseInt(min) || 10, parseInt(sec) || 0);
  
  const myId = getMyRunnerId();
  localStorage.setItem(`htc_paces_set_${myId}`, 'true');
  
  renderMyLegsView();
  renderHeader();
  window.spriteAnimator.mount();
}

function confirmReset() {
  if (confirm('Reset ALL logged handoff times? \n\n(Don\'t worry, your custom runner paces will NOT be deleted).')) {
    
    const savedPaces = engine.state.paces ? JSON.parse(JSON.stringify(engine.state.paces)) : {};
    
    engine.resetState();
    
    if (Object.keys(savedPaces).length > 0) {
      engine.state.paces = savedPaces;
    }
    
    engine.saveState();
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
try {
  renderView('viewRace');
  runIntroSequence();
  
  const style = document.createElement('style');
  style.innerHTML = `@keyframes toastIn { from { top: -20px; opacity: 0; } to { top: 80px; opacity: 1; } }`;
  document.head.appendChild(style);
  
} catch (e) {
  console.error("Critical Render Failure:", e);
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed; inset:0; background:white; color:red; z-index:999999; padding:40px; font-size:20px; overflow-y:auto;';
  errDiv.innerHTML = `<strong>RENDER FAILED</strong><br><br>${e.message}<br><br><button onclick="localStorage.clear(); window.location.reload(true);" style="padding:20px; background:black; color:white; width:100%; font-size:18px;">HARD RESET APP</button>`;
  document.body.appendChild(errDiv);
}

// --- THE SW TERMINATOR ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log("Service Worker Terminated to clear cache.");
    }
  });
}

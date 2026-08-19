// HTC Race Engine - Calculation & State Management
// All time math done in milliseconds. No AM/PM bugs. No rollover issues.

class RaceEngine {
  constructor(config) {
    this.config = config;
    this.state = this.loadState() || this.createFreshState();
  }

  // --- STATE MANAGEMENT ---

  createFreshState() {
    const paces = {};
    this.config.legs.forEach(leg => {
      const runner = this.config.runners.find(r => r.id === leg.runnerId);
      paces[`leg_${leg.leg}`] = { min: runner.defaultPace.min, sec: runner.defaultPace.sec };
    });

    return {
      version: 1,
      raceStarted: false,
      currentLeg: 1,
      paces: paces,           // per-leg paces: { leg_1: {min, sec}, leg_2: ... }
      actuals: {},            // logged times: { leg_1_start: epoch, leg_1_end: epoch, ... }
      runnerProfiles: {},     // runner-specific overrides
      lastUpdated: Date.now()
    };
  }

  saveState() {
    this.state.lastUpdated = Date.now();
    localStorage.setItem('htc_race_state', JSON.stringify(this.state));
  }

  loadState() {
    const saved = localStorage.getItem('htc_race_state');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { return null; }
    }
    return null;
  }

  resetState() {
    this.state = this.createFreshState();
    this.saveState();
  }

  // --- PACE HELPERS ---

  getPaceMsPerMile(legNum) {
    const pace = this.state.paces[`leg_${legNum}`];
    if (!pace) return 10 * 60 * 1000; // fallback 10:00/mi
    return (pace.min * 60 + pace.sec) * 1000;
  }

  setPace(legNum, min, sec) {
    this.state.paces[`leg_${legNum}`] = { min, sec };
    this.saveState();
  }

  getEstimatedTimeMs(legNum) {
    const leg = this.config.legs.find(l => l.leg === legNum);
    if (!leg) return 0;
    return Math.round(this.getPaceMsPerMile(legNum) * leg.distance);
  }

  // --- TIME PROJECTION ENGINE ---
  // Everything cascades from race start. If an actual is logged, it replaces the projected.

  getRaceStartMs() {
    return new Date(this.config.startTime).getTime();
  }

  getProjectedStartMs(legNum) {
    if (legNum === 1) return this.getRaceStartMs();

    // If previous leg has an actual end time, use that
    const prevEnd = this.state.actuals[`leg_${legNum - 1}_end`];
    if (prevEnd) return prevEnd;

    // Otherwise cascade from previous projected start + estimated time
    return this.getProjectedStartMs(legNum - 1) + this.getEstimatedTimeMs(legNum - 1);
  }

  getProjectedEndMs(legNum) {
    // If this leg has actual end, use it
    const actualEnd = this.state.actuals[`leg_${legNum}_end`];
    if (actualEnd) return actualEnd;

    // If this leg has actual start, use actual start + estimated time
    const actualStart = this.state.actuals[`leg_${legNum}_start`];
    if (actualStart) return actualStart + this.getEstimatedTimeMs(legNum);

    // Otherwise: projected start + estimated time
    return this.getProjectedStartMs(legNum) + this.getEstimatedTimeMs(legNum);
  }

  getActualStartMs(legNum) {
    return this.state.actuals[`leg_${legNum}_start`] || null;
  }

  getActualEndMs(legNum) {
    return this.state.actuals[`leg_${legNum}_end`] || null;
  }

  // --- TIME LOGGING ---

  logHandoff(legNum, timestamp = null) {
    const time = timestamp || Date.now();

    // A handoff means: current leg ends, next leg starts
    this.state.actuals[`leg_${legNum}_end`] = time;
    if (legNum < 36) {
      this.state.actuals[`leg_${legNum + 1}_start`] = time;
    }

    // Advance current leg
    if (legNum < 36) {
      this.state.currentLeg = legNum + 1;
    }

    this.saveState();
  }

  logStart(legNum, timestamp = null) {
    const time = timestamp || Date.now();
    this.state.actuals[`leg_${legNum}_start`] = time;
    this.state.currentLeg = legNum;
    this.state.raceStarted = true;
    this.saveState();
  }

  clearActual(legNum, type) {
    delete this.state.actuals[`leg_${legNum}_${type}`];
    this.saveState();
  }

  // --- RACE STATUS ---

  getCurrentLeg() {
    return this.state.currentLeg;
  }

  isLegComplete(legNum) {
    return !!this.state.actuals[`leg_${legNum}_end`];
  }

  isLegActive(legNum) {
    return this.state.actuals[`leg_${legNum}_start`] && !this.state.actuals[`leg_${legNum}_end`];
  }

  getTimeDelta(legNum) {
    // How far ahead/behind vs projected for a completed leg
    const actualEnd = this.state.actuals[`leg_${legNum}_end`];
    if (!actualEnd) return null;

    const projectedEnd = this.getProjectedStartMs(legNum) + this.getEstimatedTimeMs(legNum);
    return actualEnd - projectedEnd; // negative = ahead, positive = behind
  }

  getCumulativeDelta() {
    // Total time ahead/behind across all completed legs
    let delta = 0;
    for (let i = 1; i <= 36; i++) {
      if (this.isLegComplete(i)) {
        const d = this.getTimeDelta(i);
        if (d !== null) delta += d;
      }
    }
    return delta;
  }

  getProjectedFinishMs() {
    return this.getProjectedEndMs(36);
  }

  getProjectedFinishTime() {
    return new Date(this.getProjectedFinishMs());
  }

  // --- RUNNER DATA ---

  getRunnerLegs(runnerId) {
    return this.config.legs.filter(l => l.runnerId === runnerId);
  }

  getRunnerById(runnerId) {
    return this.config.runners.find(r => r.id === runnerId);
  }

  getLegData(legNum) {
    return this.config.legs.find(l => l.leg === legNum);
  }

  getLegRunner(legNum) {
    const leg = this.getLegData(legNum);
    if (!leg) return null;
    return this.getRunnerById(leg.runnerId);
  }

  // --- FULL LEG SUMMARY ---

  getLegSummary(legNum) {
    const leg = this.getLegData(legNum);
    const runner = this.getLegRunner(legNum);
    const pace = this.state.paces[`leg_${legNum}`];
    const estTimeMs = this.getEstimatedTimeMs(legNum);
    const projStart = this.getProjectedStartMs(legNum);
    const projEnd = this.getProjectedEndMs(legNum);
    const actualStart = this.getActualStartMs(legNum);
    const actualEnd = this.getActualEndMs(legNum);
    const delta = this.getTimeDelta(legNum);

    return {
      leg: legNum,
      runner: runner,
      legData: leg,
      pace: pace,
      estimatedTime: estTimeMs,
      projectedStart: projStart,
      projectedEnd: projEnd,
      actualStart: actualStart,
      actualEnd: actualEnd,
      actualTime: (actualStart && actualEnd) ? actualEnd - actualStart : null,
      delta: delta,
      status: this.isLegComplete(legNum) ? 'complete' :
              this.isLegActive(legNum) ? 'active' : 'upcoming'
    };
  }

  getAllLegSummaries() {
    return Array.from({length: 36}, (_, i) => this.getLegSummary(i + 1));
  }

  // --- FORMAT HELPERS ---

  static formatTime(ms) {
    if (!ms && ms !== 0) return '--:--';
    const date = new Date(ms);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  static formatTimeWithDay(ms) {
    if (!ms && ms !== 0) return '--:--';
    const date = new Date(ms);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const day = days[date.getDay()];
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${hours}:${minutes} ${ampm}`;
  }

  static formatDuration(ms) {
    if (!ms && ms !== 0) return '--:--';
    const totalSec = Math.round(Math.abs(ms) / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2,'0')}`;
  }

  static formatPace(min, sec) {
    return `${min}:${sec.toString().padStart(2, '0')}/mi`;
  }

  static formatDelta(ms) {
    if (!ms && ms !== 0) return '--';
    const sign = ms < 0 ? '-' : '+';
    const formatted = RaceEngine.formatDuration(ms);
    return `${sign}${formatted}`;
  }

  static difficultyColor(diff) {
    const colors = { 'E': '#4CAF50', 'M': '#FF9800', 'H': '#f44336', 'VH': '#9C27B0' };
    return colors[diff] || '#999';
  }

  static difficultyLabel(diff) {
    const labels = { 'E': 'Easy', 'M': 'Moderate', 'H': 'Hard', 'VH': 'Very Hard' };
    return labels[diff] || diff;
  }
}

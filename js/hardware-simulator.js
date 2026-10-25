/**
 * AquaSavers Simulated Hardware Engine 2.0
 * Generates physically authentic telemetry representing the ESP32 prototype.
 * Emits real-time event logs for the live activity terminal.
 */

class HardwareSimulator {
  constructor() {
    this.isRunning = false;
    this.timer = null;

    // Parameters
    this.computePowerWatts = 450;
    this.ambientTempC = 24.2;
    this.feedTdsPpm = 32000;
    this.feedLevel = 88.0;
    this.fanSpeed = 'medium';

    // State Variables
    this.tSource = 69.5;
    this.tEvaporator = 55.8;
    this.tCondenser = 27.5;
    this.distillateTotalMl = 36.2;
    this.dropCount = 724;
    this.distillateRateMlHr = 18.5;
    this.status = 'ACTIVE';

    this.listeners = [];
    this.logListeners = [];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => this.step(), 1000);
    this.emitLog('Hardware simulator started. Generating baseline telemetry.', 'normal');
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setComputePower(watts) {
    this.computePowerWatts = Math.max(50, Math.min(1000, watts));
    this.emitLog(`Server workload set to ${this.computePowerWatts} W.`, 'highlight');
  }

  setFeedwaterType(type) {
    switch (type) {
      case 'brackish':
        this.feedTdsPpm = 3500;
        this.emitLog('Feedwater switched to Brackish Well (3,500 ppm).', 'normal');
        break;
      case 'industrial':
        this.feedTdsPpm = 12500;
        this.emitLog('Feedwater switched to Industrial Runoff (12,500 ppm).', 'normal');
        break;
      case 'seawater':
      default:
        this.feedTdsPpm = 32000;
        this.emitLog('Feedwater switched to Seawater (32,000 ppm).', 'normal');
        break;
    }
  }

  setFanSpeed(speed) {
    this.fanSpeed = speed;
    this.emitLog(`Cooling fan speed set to ${speed.toUpperCase()}.`, 'normal');
  }

  step() {
    let fanFactor = 1.0;
    if (this.fanSpeed === 'low') fanFactor = 1.25;
    if (this.fanSpeed === 'high') fanFactor = 0.75;

    const targetSource = this.ambientTempC + (this.computePowerWatts * 0.11 * fanFactor);
    const targetEvaporator = this.ambientTempC + (this.computePowerWatts * 0.082);
    const targetCondenser = this.ambientTempC + (this.computePowerWatts * 0.018 * fanFactor);

    const alphaHeat = 0.08;
    const alphaCool = 0.05;

    this.tSource += (targetSource - this.tSource) * (this.tSource < targetSource ? alphaHeat : alphaCool);
    this.tEvaporator += (targetEvaporator - this.tEvaporator) * (this.tEvaporator < targetEvaporator ? alphaHeat : alphaCool);
    this.tCondenser += (targetCondenser - this.tCondenser) * (this.tCondenser < targetCondenser ? alphaHeat : alphaCool);

    const jitter = (Math.random() - 0.5) * 0.2;
    const tSourceReported = Math.round((this.tSource + jitter) * 10) / 10;
    const tEvapReported = Math.round((this.tEvaporator + jitter * 0.8) * 10) / 10;
    const tCondReported = Math.round((this.tCondenser + jitter * 0.5) * 10) / 10;
    const tAmbReported = Math.round((this.ambientTempC + (Math.random() - 0.5) * 0.1) * 10) / 10;

    let newDrops = 0;
    if (tEvapReported > 40.0) {
      const yieldCalc = AquaPhysics.calculateDistillateYield(this.computePowerWatts, tEvapReported, this.ambientTempC, 0.65);
      this.distillateRateMlHr = Math.round(yieldCalc.mlPerHour * 10) / 10;

      const dropsPerSec = (this.distillateRateMlHr / 3600) * 20;
      if (Math.random() < dropsPerSec) {
        newDrops = Math.floor(dropsPerSec) + 1;
      }
      this.status = 'ACTIVE';
    } else if (tSourceReported > 35.0) {
      this.distillateRateMlHr = 0.0;
      this.status = 'WARMING';
    } else {
      this.distillateRateMlHr = 0.0;
      this.status = 'STANDBY';
    }

    if (newDrops > 0) {
      this.dropCount += newDrops;
      this.distillateTotalMl += newDrops * 0.05;
      this.feedLevel = Math.max(5.0, this.feedLevel - (newDrops * 0.005));

      if (Math.random() < 0.25) {
        this.emitLog(`💧 Clean water collected (+${(newDrops * 0.05).toFixed(2)} mL). Purity: 99.9%`, 'success');
      }
    }

    const distTds = Math.round((9.5 + Math.sin(Date.now() / 8000) * 2.0 + (Math.random() - 0.5) * 0.5) * 10) / 10;

    const packet = {
      timestamp: Date.now(),
      source: 'SIMULATOR',
      device: 'AquaSavers-Virtual-ESP32',
      t_source: tSourceReported,
      t_evaporator: tEvapReported,
      t_condenser: tCondReported,
      t_ambient: tAmbReported,
      distillate_rate: this.distillateRateMlHr,
      distillate_total: Math.round(this.distillateTotalMl * 10) / 10,
      feed_tds: this.feedTdsPpm,
      distillate_tds: distTds,
      feed_level: Math.round(this.feedLevel * 10) / 10,
      drops: this.dropCount,
      compute_power_w: this.computePowerWatts,
      status: this.status
    };

    this.notify(packet);
  }

  onTelemetry(callback) {
    this.listeners.push(callback);
  }

  onLog(callback) {
    this.logListeners.push(callback);
  }

  emitLog(message, type = 'normal') {
    const timeStr = new Date().toLocaleTimeString([], { hour12: false });
    for (const cb of this.logListeners) {
      try {
        cb({ time: timeStr, text: message, type: type });
      } catch (e) {}
    }
  }

  notify(packet) {
    for (const cb of this.listeners) {
      try {
        cb(packet);
      } catch (err) {}
    }
  }
}

window.HardwareSimulator = HardwareSimulator;

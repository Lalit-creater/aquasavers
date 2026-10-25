/**
 * AquaSavers Telemetry Dashboard & Canvas Engine (Porcelain Lux Edition)
 * Powers circular dial gauge, vertical thermal spectrum, live timeline chart,
 * accordions, and CSV telemetry exports.
 */

class TelemetryDashboard {
  constructor(bridge, simulator) {
    this.bridge = bridge;
    this.simulator = simulator;

    this.maxHistory = 90;
    this.history = [];

    this.chartCanvas = null;
    this.chartCtx = null;
    this.latestPacket = null;
    this.packetCount = 0;
    this.isPaused = false;
  }

  init() {
    this.initChart();
    this.bindEvents();
    this.initAccordions();

    this.bridge.onTelemetry((packet) => {
      if (!this.isPaused) {
        this.handleTelemetry(packet);
      }
    });

    this.bridge.onStateChange((state, detail) => {
      this.updateConnectionStatusUI(state, detail);
    });
    // Fix: emit the initial state immediately so the badge shows on load
    this.updateConnectionStatusUI(this.bridge.connectionMode, '');

    this.simulator.onLog((logItem) => {
      this.addLogEntry(logItem);
    });
  }

  initChart() {
    this.chartCanvas = document.getElementById('telemetry-chart');
    if (!this.chartCanvas) return;
    this.chartCtx = this.chartCanvas.getContext('2d');

    const resizeCanvas = () => {
      const rect = this.chartCanvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.chartCanvas.width = rect.width * dpr;
      this.chartCanvas.height = 200 * dpr;
      this.chartCanvas.style.width = `${rect.width}px`;
      this.chartCanvas.style.height = `200px`;
      this.chartCtx.scale(dpr, dpr);
      this.drawCharts();
    };

    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 50);
  }

  initAccordions() {
    const items = document.querySelectorAll('.accordion-item');
    items.forEach(item => {
      const header = item.querySelector('.accordion-header');
      if (header) {
        header.addEventListener('click', () => {
          item.classList.toggle('open');
        });
      }
    });
  }

  bindEvents() {
    // Workload Slider
    const slider = document.getElementById('sim-power-slider');
    const powerVal = document.getElementById('sim-power-val');
    const topWatts = document.getElementById('metric-top-watts');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (powerVal) powerVal.textContent = `${val} W`;
        if (topWatts) topWatts.textContent = `${val} W`;
        this.simulator.setComputePower(val);
      });
    }

    // Feedwater Salinity selector
    const feedSelect = document.getElementById('feedwater-select');
    if (feedSelect) {
      feedSelect.addEventListener('change', (e) => {
        this.simulator.setFeedwaterType(e.target.value);
      });
    }

    // Play / Pause controls
    const playBtn = document.getElementById('ctrl-btn-play');
    const pauseBtn = document.getElementById('ctrl-btn-pause');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.isPaused = false;
        playBtn.classList.add('dark-btn');
        if (pauseBtn) pauseBtn.classList.remove('dark-btn');
      });
    }
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.isPaused = true;
        pauseBtn.classList.add('dark-btn');
        if (playBtn) playBtn.classList.remove('dark-btn');
      });
    }

    // Export Telemetry CSV
    const exportBtn = document.getElementById('export-telemetry-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCsv());
    }
  }

  handleTelemetry(packet) {
    this.latestPacket = packet;
    this.packetCount++;

    this.history.push({
      time: new Date(packet.timestamp || Date.now()).toLocaleTimeString([], { hour12: false }),
      Server_Heat_C: packet.t_source,
      Boiling_Chamber_C: packet.t_evaporator,
      Cooling_Coil_C: packet.t_condenser,
      t_source: packet.t_source,
      t_evap: packet.t_evaporator,
      t_cond: packet.t_condenser,
      dist_rate: packet.distillate_rate,
      dist_total: packet.distillate_total
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.updateDials(packet);
    this.drawCharts();
  }

  updateDials(packet) {
    // 1. Server Heat (T_source)
    const elSource = document.getElementById('metric-t-source');
    const barStemSource = document.getElementById('bar-stem-source');
    const barPillSource = document.getElementById('bar-pill-source');
    if (elSource) elSource.textContent = `${packet.t_source.toFixed(1)}°C`;
    if (barStemSource) {
      const height = Math.min(85, Math.max(20, (packet.t_source / 90) * 80));
      barStemSource.style.height = `${height}px`;
    }
    if (barPillSource) barPillSource.textContent = `${packet.t_source.toFixed(1)}°C`;

    // 2. Evaporation Chamber (T_evap)
    const barStemEvap = document.getElementById('bar-stem-evap');
    const barPillEvap = document.getElementById('bar-pill-evap');
    const topTemp = document.getElementById('metric-top-temp');
    if (barStemEvap) {
      const height = Math.min(85, Math.max(20, (packet.t_evaporator / 90) * 80));
      barStemEvap.style.height = `${height}px`;
    }
    if (barPillEvap) barPillEvap.textContent = `${packet.t_evaporator.toFixed(1)}°C`;
    if (topTemp) topTemp.textContent = `${packet.t_evaporator.toFixed(1)}°C`;

    // 3. Condenser (T_condenser) — live bar
    const barStemCond = document.getElementById('bar-stem-cond');
    const barPillCond = document.getElementById('bar-pill-cond');
    if (barStemCond) {
      const height = Math.min(85, Math.max(10, (packet.t_condenser / 90) * 80));
      barStemCond.style.height = `${height}px`;
    }
    if (barPillCond) barPillCond.textContent = `${packet.t_condenser.toFixed(1)}°C`;

    // 4. System Verification panel — live temps
    const sysTempSource = document.getElementById('sys-temp-source');
    const sysTempEvap = document.getElementById('sys-temp-evap');
    const sysTempCond = document.getElementById('sys-temp-cond');
    if (sysTempSource) sysTempSource.textContent = `${packet.t_source.toFixed(1)}°C`;
    if (sysTempEvap) sysTempEvap.textContent = `${packet.t_evaporator.toFixed(1)}°C`;
    if (sysTempCond) sysTempCond.textContent = `${packet.t_condenser.toFixed(1)}°C`;

    // 5. Thermal Gradient ΔT in specs accordion
    const specDeltaT = document.getElementById('spec-delta-t');
    if (specDeltaT && window.AquaPhysics) {
      const deltaT = AquaPhysics.calculateThermalDelta(packet.t_source, packet.t_condenser);
      specDeltaT.textContent = `${deltaT.toFixed(1)}°C`;
    }

    // 6. Clean Water Recovery Rate (Circular Dial)
    const elRate = document.getElementById('metric-dist-rate');
    const elTotal = document.getElementById('metric-dist-total');
    const elNavWater = document.getElementById('nav-total-water');
    const arc = document.getElementById('dial-active-arc');

    if (elRate) elRate.textContent = `${packet.distillate_rate.toFixed(1)}`;
    if (elTotal) elTotal.textContent = `${packet.distillate_total.toFixed(1)} mL`;
    if (elNavWater) elNavWater.textContent = `${packet.distillate_total.toFixed(1)} mL`;

    if (arc) {
      const maxRate = 35; // mL/hr max scale
      const circ = 238.76;
      const progress = Math.min(1, Math.max(0.05, packet.distillate_rate / maxRate));
      const offset = circ * (1 - progress);
      arc.style.strokeDashoffset = offset;
    }

    // 7. Drop count
    const elDrops = document.getElementById('metric-drops');
    if (elDrops && packet.drops !== undefined) {
      elDrops.textContent = packet.drops.toLocaleString();
    }

    // 8. Water Purity & Salt Removal
    const elDistTds = document.getElementById('metric-dist-tds');
    const elRejection = document.getElementById('metric-salt-rejection');
    if (elDistTds) elDistTds.textContent = `${packet.distillate_tds.toFixed(1)} ppm`;
    if (elRejection && window.AquaPhysics) {
      const rej = AquaPhysics.calculateSaltRejection(packet.feed_tds, packet.distillate_tds);
      elRejection.textContent = `${rej.toFixed(1)}%`;
    }

    // 9. Live System Status
    this.updateLiveSystemStatus(packet);

    // 10. Process Stage Indicator
    this.updateStageIndicator(packet.status);

    // 11. Packet Counter in Sub-Header
    const elPackets = document.getElementById('packet-counter');
    if (elPackets) elPackets.textContent = `${this.packetCount} readings logged`;
  }

  updateStageIndicator(status) {
    const warming = document.getElementById('stage-warming');
    const evaporating = document.getElementById('stage-evaporating');
    const condensing = document.getElementById('stage-condensing');
    if (!warming || !evaporating || !condensing) return;

    // Reset all
    [warming, evaporating, condensing].forEach(el => {
      el.classList.remove('stage-active', 'stage-done', 'stage-inactive');
    });

    if (status === 'STANDBY') {
      warming.classList.add('stage-inactive');
      evaporating.classList.add('stage-inactive');
      condensing.classList.add('stage-inactive');
    } else if (status === 'WARMING') {
      warming.classList.add('stage-active');
      evaporating.classList.add('stage-inactive');
      condensing.classList.add('stage-inactive');
    } else { // ACTIVE
      warming.classList.add('stage-done');
      evaporating.classList.add('stage-active');
      condensing.classList.add('stage-active');
    }
  }

  updateLiveSystemStatus(packet) {
    const statusEsp32 = document.getElementById('status-esp32');
    const statusSensors = document.getElementById('status-sensors');
    const statusWaterLevel = document.getElementById('status-water-level');
    const statusPump = document.getElementById('status-pump');
    const statusFeed = document.getElementById('status-feed');
    const statusTime = document.getElementById('status-time');

    if (statusEsp32) {
      if (this.bridge.connectionMode === 'LIVE_USB' || this.bridge.connectionMode === 'LIVE_WIFI') {
        statusEsp32.textContent = 'Connected (' + this.bridge.connectionMode.replace('LIVE_', '') + ')';
        statusEsp32.style.color = '#10b981'; // Green
      } else if (this.bridge.connectionMode === 'CONNECTING') {
        statusEsp32.textContent = 'Connecting...';
        statusEsp32.style.color = '#f59e0b';
      } else {
        statusEsp32.textContent = 'Disconnected (Simulated)';
        statusEsp32.style.color = 'var(--primary-amber)';
      }
    }

    if (statusSensors) {
      if (packet.t_source > 0 && packet.t_evaporator > 0 && packet.t_condenser > 0) {
        statusSensors.textContent = 'Online';
        statusSensors.style.color = '#10b981';
      } else {
        statusSensors.textContent = 'Error / Offline';
        statusSensors.style.color = '#ef4444';
      }
    }

    if (statusWaterLevel) {
      if (packet.feed_level !== undefined) {
        if (packet.feed_level > 80) statusWaterLevel.textContent = 'Normal (' + packet.feed_level.toFixed(1) + '%)';
        else if (packet.feed_level < 20) statusWaterLevel.textContent = 'Low (' + packet.feed_level.toFixed(1) + '%)';
        else statusWaterLevel.textContent = 'Normal (' + packet.feed_level.toFixed(1) + '%)';
      }
    }

    if (statusPump) {
      if (packet.status === 'ACTIVE' || packet.status === 'WARMING') {
        statusPump.textContent = 'ON';
        statusPump.style.color = '#10b981';
      } else {
        statusPump.textContent = 'OFF';
        statusPump.style.color = 'var(--text-muted)';
      }
    }

    if (statusFeed) {
      statusFeed.textContent = packet.source === 'SIMULATOR' ? 'Simulated' : 'Live Sensor Feed';
      statusFeed.style.color = packet.source === 'SIMULATOR' ? 'var(--primary-amber)' : '#10b981';
    }

    if (statusTime) {
      statusTime.textContent = new Date(packet.timestamp || Date.now()).toLocaleTimeString();
    }
  }

  drawTimeSeries(canvasId, valId, dataKey, color, units) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Setup tooltip div if doesn't exist
    let tooltip = document.getElementById(canvasId + '-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = canvasId + '-tooltip';
      tooltip.className = 'graph-tooltip';
      canvas.parentElement.appendChild(tooltip);

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;

        const padLeft = 30;
        const padRight = 10;
        const graphWidth = canvas.width - padLeft - padRight;

        if (x >= padLeft && x <= padLeft + graphWidth && this.history.length > 0) {
          const pointWidth = graphWidth / Math.max(1, (this.maxHistory - 1));
          const idx = Math.min(this.history.length - 1, Math.max(0, Math.round((x - padLeft) / pointWidth) - (this.maxHistory - this.history.length)));
          if (idx >= 0 && this.history[idx]) {
            const dataPoint = this.history[idx];
            let v = dataPoint[dataKey];
            if (v === undefined) {
              if (dataKey === 'Server_Heat_C') v = dataPoint.t_source;
              else if (dataKey === 'Boiling_Chamber_C') v = dataPoint.t_evap;
              else if (dataKey === 'Cooling_Coil_C') v = dataPoint.t_cond;
              else v = 0;
            }
            tooltip.textContent = dataPoint.time + ' → ' + (typeof v === 'number' ? v.toFixed(1) : v) + units;
            tooltip.style.left = x + 'px';
            tooltip.style.top = (e.clientY - rect.top) + 'px';
            tooltip.classList.add('visible');
          }
        } else {
          tooltip.classList.remove('visible');
        }
      });

      canvas.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    }

    const ctx = canvas.getContext('2d');
    const width = parseFloat(canvas.parentElement.clientWidth) || 300;
    const height = parseFloat(canvas.parentElement.clientHeight) || 140;

    // Ensure canvas dimensions match CSS
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const padLeft = 30;
    const padRight = 10;
    const padTop = 15;
    const padBottom = 20;
    const graphWidth = width - padLeft - padRight;
    const graphHeight = height - padTop - padBottom;

    if (this.history.length === 0) return;

    // Determine min/max
    let minVal = Number.MAX_VALUE;
    let maxVal = Number.MIN_VALUE;
    for (const p of this.history) {
      let v = p[dataKey];
      if (v === undefined) {
        if (dataKey === 'Server_Heat_C') v = p.t_source;
        else if (dataKey === 'Boiling_Chamber_C') v = p.t_evap;
        else if (dataKey === 'Cooling_Coil_C') v = p.t_cond;
        else v = 0;
      }
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    // Add padding to range
    const range = Math.max(5, maxVal - minVal);
    minVal = Math.max(0, minVal - range * 0.2);
    maxVal = maxVal + range * 0.2;

    // Draw Grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';

    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const y = padTop + (graphHeight / steps) * i;
      const val = maxVal - ((maxVal - minVal) / steps) * i;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + graphWidth, y);
      ctx.stroke();

      ctx.fillText(Math.round(val), padLeft - 6, y + 4);
    }

    // Draw Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const pointWidth = graphWidth / Math.max(1, (this.maxHistory - 1));
    const startOffset = this.maxHistory - this.history.length;

    for (let i = 0; i < this.history.length; i++) {
      const x = padLeft + (i + startOffset) * pointWidth;
      let val = this.history[i][dataKey];
      if (val === undefined) {
        if (dataKey === 'Server_Heat_C') val = this.history[i].t_source;
        else if (dataKey === 'Boiling_Chamber_C') val = this.history[i].t_evap;
        else if (dataKey === 'Cooling_Coil_C') val = this.history[i].t_cond;
        else val = 0;
      }
      const y = padTop + graphHeight - ((val - minVal) / (maxVal - minVal || 1)) * graphHeight;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill Area under line
    ctx.lineTo(padLeft + graphWidth, padTop + graphHeight);
    ctx.lineTo(padLeft + startOffset * pointWidth, padTop + graphHeight);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + graphHeight);
    gradient.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba').replace(/#[0-9a-fA-F]{6}/, (m) => {
      const r = parseInt(m.substring(1, 3), 16);
      const g = parseInt(m.substring(3, 5), 16);
      const b = parseInt(m.substring(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',0.3)';
    }));
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Update Live Value Text
    const valEl = document.getElementById(valId);
    if (valEl && this.history.length > 0) {
      const lastPoint = this.history[this.history.length - 1];
      let v = lastPoint[dataKey];
      if (v === undefined) {
        if (dataKey === 'Server_Heat_C') v = lastPoint.t_source;
        else if (dataKey === 'Boiling_Chamber_C') v = lastPoint.t_evap;
        else if (dataKey === 'Cooling_Coil_C') v = lastPoint.t_cond;
        else v = 0;
      }
      valEl.textContent = (typeof v === 'number' ? v.toFixed(1) : v) + units;
    }
  }

  drawCharts() {
    this.drawTimeSeries('chart-source', 'val-trend-source', 'Server_Heat_C', '#ef4444', '°C');
    this.drawTimeSeries('chart-evap', 'val-trend-evap', 'Boiling_Chamber_C', '#f59e0b', '°C');
    this.drawTimeSeries('chart-cond', 'val-trend-cond', 'Cooling_Coil_C', '#06b6d4', '°C');
    this.drawTimeSeries('chart-water', 'val-trend-water', 'dist_rate', '#3b82f6', ' mL/hr');
  }

  addLogEntry(item) {
    const logBox = document.getElementById('activity-terminal');
    if (!logBox) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${item.type || 'normal'}`;
    entry.innerHTML = `<span class="time">[${item.time || new Date().toLocaleTimeString([], { hour12: false })}]</span> ${item.text}`;

    logBox.appendChild(entry);
    while (logBox.children.length > 25) {
      logBox.removeChild(logBox.firstChild);
    }
    logBox.scrollTop = logBox.scrollHeight;
  }

  updateConnectionStatusUI(mode, detail) {
    const badge = document.getElementById('status-mode-tag');
    const connectBtn = document.getElementById('open-connect-modal-btn');
    const statusEsp32 = document.getElementById('status-esp32');
    const statusFeed = document.getElementById('status-feed');

    if (badge) {
      if (mode === 'SIMULATED') {
        badge.className = 'pulse-live-badge';
        badge.innerHTML = `<span class="dot-live"></span> SIMULATED PROTOTYPE FEED`;
      } else if (mode === 'LIVE_USB') {
        badge.className = 'pulse-live-badge';
        badge.innerHTML = `<span class="dot-live" style="background:#10b981;"></span> ESP32 LIVE (USB)`;
      } else if (mode === 'LIVE_WIFI') {
        badge.className = 'pulse-live-badge';
        badge.innerHTML = `<span class="dot-live" style="background:#10b981;"></span> ESP32 LIVE (WI-FI)`;
      } else if (mode === 'CONNECTING') {
        badge.className = 'pulse-live-badge';
        badge.innerHTML = `<span class="dot-live" style="background:#f59e0b;"></span> CONNECTING...`;
      }
    }

    if (connectBtn) {
      if (mode === 'SIMULATED') {
        connectBtn.innerHTML = `<span>🔌</span> Connect ESP32`;
      } else if (mode === 'LIVE_USB' || mode === 'LIVE_WIFI') {
        connectBtn.innerHTML = `<span>🔌</span> ESP32 Connected`;
      }
    }

    if (statusEsp32) {
      if (mode === 'LIVE_USB' || mode === 'LIVE_WIFI') {
        statusEsp32.textContent = 'Connected (' + mode.replace('LIVE_', '') + ')';
        statusEsp32.style.color = '#10b981';
      } else if (mode === 'CONNECTING') {
        statusEsp32.textContent = 'Connecting...';
        statusEsp32.style.color = '#f59e0b';
      } else {
        statusEsp32.textContent = 'Disconnected (Simulated)';
        statusEsp32.style.color = 'var(--primary-amber)';
      }
    }

    if (statusFeed) {
      statusFeed.textContent = mode === 'SIMULATED' ? 'Simulated' : 'Live Sensor Feed';
      statusFeed.style.color = mode === 'SIMULATED' ? 'var(--primary-amber)' : '#10b981';
    }
  }

  exportCsv() {
    if (this.history.length === 0) {
      if (window.showToast) {
        window.showToast('No telemetry data collected yet.', 'info');
      } else {
        alert('No telemetry data collected yet.');
      }
      return;
    }

    let csv = 'Time,Server_Heat_C,Boiling_Chamber_C,Cooling_Coil_C,Distillate_Rate_mL_hr,Distillate_Total_mL\n';
    for (const h of this.history) {
      const sHeat = h.Server_Heat_C !== undefined ? h.Server_Heat_C : h.t_source;
      const bChamb = h.Boiling_Chamber_C !== undefined ? h.Boiling_Chamber_C : h.t_evap;
      const cCoil = h.Cooling_Coil_C !== undefined ? h.Cooling_Coil_C : h.t_cond;
      csv += `${h.time},${sHeat},${bChamb},${cCoil},${h.dist_rate},${h.dist_total}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquasavers_run_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.showToast) {
      window.showToast('Telemetry data exported successfully as CSV!', 'success');
    }
  }
}

window.TelemetryDashboard = TelemetryDashboard;

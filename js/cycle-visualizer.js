/**
 * AquaSavers Thermodynamic Flow Visualizer
 * 60 FPS HTML5 Canvas particle simulation coupling compute heat transfer,
 * boiling, condensation, and clean water collection with simple terminology.
 */

class CycleVisualizer {
  constructor(bridge) {
    this.bridge = bridge;
    this.canvas = null;
    this.ctx = null;
    this.animId = null;

    // Current thermodynamic state (updated via telemetry)
    this.tSource = 70.0;
    this.tEvap = 56.0;
    this.tCond = 28.0;
    this.rateMlHr = 18.0;
    this.distillateTotal = 35.0;

    // Selected stage: 'compute', 'transfer', 'evap', 'cond', 'distillate'
    this.selectedStage = 'evap';

    // Particle systems
    this.heatParticles = [];
    this.vaporParticles = [];
    this.droplets = [];
    this.bubbles = [];

    this.nodes = {};
  }

  init() {
    this.canvas = document.getElementById('cycle-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Subscribe to telemetry
    this.bridge.onTelemetry((packet) => {
      this.tSource = packet.t_source || 65.0;
      this.tEvap = packet.t_evaporator || 52.0;
      this.tCond = packet.t_condenser || 28.0;
      this.rateMlHr = packet.distillate_rate || 0.0;
      this.distillateTotal = packet.distillate_total || 0.0;
    });

    // Canvas click detection to select stage
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleClick(x, y);
    });

    this.initParticles();
    this.animate();
    this.updateStageInspector(this.selectedStage);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = Math.max(380, Math.min(460, window.innerHeight * 0.45));

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.updateNodePositions();
  }

  updateNodePositions() {
    const w = this.width;
    const h = this.height;
    const centerY = h * 0.52;

    this.nodes = {
      compute: {
        id: 'compute',
        name: '1. Computer / Server',
        sub: 'Heat Source',
        x: w * 0.12,
        y: centerY,
        w: w * 0.16,
        h: h * 0.52,
        color: '#ef4444'
      },
      transfer: {
        id: 'transfer',
        name: '2. Heat Pipes',
        sub: 'Heat Transfer',
        x: w * 0.30,
        y: centerY,
        w: w * 0.12,
        h: h * 0.28,
        color: '#f97316'
      },
      evap: {
        id: 'evap',
        name: '3. Boiling Chamber',
        sub: 'Evaporation',
        x: w * 0.50,
        y: centerY,
        w: w * 0.18,
        h: h * 0.62,
        color: '#eab308'
      },
      cond: {
        id: 'cond',
        name: '4. Cooling Coil',
        sub: 'Condensation',
        x: w * 0.72,
        y: centerY,
        w: w * 0.16,
        h: h * 0.56,
        color: '#06b6d4'
      },
      distillate: {
        id: 'distillate',
        name: '5. Clean Water Tank',
        sub: 'Recovered Water',
        x: w * 0.90,
        y: centerY + h * 0.08,
        w: w * 0.14,
        h: h * 0.44,
        color: '#10b981'
      }
    };
  }

  initParticles() {
    this.heatParticles = [];
    for (let i = 0; i < 35; i++) {
      this.heatParticles.push({
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.005,
        offsetY: (Math.random() - 0.5) * 16,
        size: 2.5 + Math.random() * 2.5
      });
    }

    this.vaporParticles = [];
    for (let i = 0; i < 40; i++) {
      this.vaporParticles.push({
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.006,
        offsetY: (Math.random() - 0.5) * 12,
        size: 2.5 + Math.random() * 3.5,
        opacity: Math.random() * 0.7 + 0.3
      });
    }

    this.droplets = [];
    this.bubbles = [];
    for (let i = 0; i < 18; i++) {
      this.bubbles.push({
        x: Math.random(),
        y: Math.random(),
        speedY: 0.005 + Math.random() * 0.01,
        radius: 1.5 + Math.random() * 2.5
      });
    }
  }

  handleClick(clickX, clickY) {
    for (const key in this.nodes) {
      const n = this.nodes[key];
      const left = n.x - n.w / 2;
      const right = n.x + n.w / 2;
      const top = n.y - n.h / 2;
      const bottom = n.y + n.h / 2;

      if (clickX >= left && clickX <= right && clickY >= top && clickY <= bottom) {
        this.selectedStage = key;
        this.updateStageInspector(key);
        break;
      }
    }
  }

  updateStageInspector(stageKey) {
    const title = document.getElementById('inspector-title');
    const desc = document.getElementById('inspector-desc');
    const stat1 = document.getElementById('inspector-stat1');
    const stat2 = document.getElementById('inspector-stat2');

    if (!title) return;

    const data = {
      compute: {
        title: 'Step 1: Computer / Server Rack',
        desc: 'Computers generate a lot of heat while working. Normally, this heat is blown away and wasted. AquaSavers captures this heat right from the processor chip.',
        stat1: `Temperature: ${this.tSource.toFixed(1)}°C`,
        stat2: 'Status: Heat Generation Active'
      },
      transfer: {
        title: 'Step 2: Sealed Heat Pipes',
        desc: 'Copper heat pipes move heat from the computer to the water chamber. The computer coolant and dirty water never touch each other, keeping the computer 100% safe and dry.',
        stat1: `Heat Delta: ${(this.tSource - this.tEvap).toFixed(1)}°C`,
        stat2: 'Isolation: 100% Sealed'
      },
      evap: {
        title: 'Step 3: Boiling Chamber',
        desc: 'Salty or non-drinking water is warmed up by the computer heat. Pure water turns into clean steam (vapor) and floats up. Salt, sand, and impurities stay at the bottom.',
        stat1: `Chamber Temp: ${this.tEvap.toFixed(1)}°C`,
        stat2: 'Purity Action: Salt Separated'
      },
      cond: {
        title: 'Step 4: Cooling Coil',
        desc: 'The clean steam travels through this cold coil. As it cools down, the steam turns back into clean liquid water droplets, just like rain.',
        stat1: `Coil Temp: ${this.tCond.toFixed(1)}°C`,
        stat2: 'Process: Steam turns to Water'
      },
      distillate: {
        title: 'Step 5: Clean Water Tank',
        desc: 'Clean recovered water (distillate) drips into this tank. A sensor tests the purity to confirm that salt and contaminants have been removed.',
        stat1: `Recovery Rate: ${this.rateMlHr.toFixed(1)} mL/hr`,
        stat2: `Total Collected: ${this.distillateTotal.toFixed(1)} mL`
      }
    };

    const cur = data[stageKey] || data['evap'];
    title.textContent = cur.title;
    desc.textContent = cur.desc;
    if (stat1) stat1.textContent = cur.stat1;
    if (stat2) stat2.textContent = cur.stat2;
  }

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());
    this.render();
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const heatSpeedMultiplier = Math.max(0.6, (this.tSource - 25) / 45);

    // 1. Draw Connection Ducts
    this.drawDucts(ctx);

    // 2. Draw 5 Nodes
    this.drawComputeNode(ctx, this.nodes.compute);
    this.drawTransferNode(ctx, this.nodes.transfer);
    this.drawEvaporatorNode(ctx, this.nodes.evap);
    this.drawCondenserNode(ctx, this.nodes.cond);
    this.drawDistillateNode(ctx, this.nodes.distillate);

    // 3. Draw Particles
    this.drawHeatParticles(ctx, heatSpeedMultiplier);
    this.drawVaporParticles(ctx, heatSpeedMultiplier);
    this.drawCondenserDroplets(ctx);
  }

  drawDucts(ctx) {
    const nc = this.nodes.compute;
    const ne = this.nodes.evap;
    const ncd = this.nodes.cond;
    const nd = this.nodes.distillate;

    ctx.save();
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Thermal transfer pipe (Red-orange)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.moveTo(nc.x + nc.w / 2, nc.y);
    ctx.lineTo(ne.x - ne.w / 2, ne.y);
    ctx.stroke();

    // Steam duct from Evaporator to Condenser (Cyan)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
    ctx.beginPath();
    ctx.moveTo(ne.x, ne.y - ne.h * 0.38);
    ctx.bezierCurveTo(
      ne.x + 40, ne.y - ne.h * 0.45,
      ncd.x - 40, ncd.y - ncd.h * 0.45,
      ncd.x, ncd.y - ncd.h * 0.38
    );
    ctx.stroke();

    // Water drain from Condenser to Tank
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.beginPath();
    ctx.moveTo(ncd.x, ncd.y + ncd.h * 0.38);
    ctx.lineTo(nd.x - nd.w * 0.2, nd.y - nd.h * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  drawComputeNode(ctx, n) {
    const isSelected = this.selectedStage === 'compute';
    ctx.save();
    const x = n.x - n.w / 2;
    const y = n.y - n.h / 2;

    ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.18)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isSelected ? '#ef4444' : 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = isSelected ? 16 : 6;

    this.roundRect(ctx, x, y, n.w, n.h, 12, true, true);
    ctx.shadowBlur = 0;

    // Server rack slot lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const slotY = y + (n.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x + 8, slotY);
      ctx.lineTo(x + n.w - 8, slotY);
      ctx.stroke();

      ctx.fillStyle = (Math.sin(Date.now() / 300 + i) > 0) ? '#22c55e' : '#15803d';
      ctx.beginPath();
      ctx.arc(x + 16, slotY - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1. SERVER', n.x, y + 20);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(`${this.tSource.toFixed(1)}°C`, n.x, y + n.h - 14);

    ctx.restore();
  }

  drawTransferNode(ctx, n) {
    const isSelected = this.selectedStage === 'transfer';
    ctx.save();
    const x = n.x - n.w / 2;
    const y = n.y - n.h / 2;

    ctx.fillStyle = isSelected ? 'rgba(249, 115, 22, 0.18)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isSelected ? '#f97316' : 'rgba(249, 115, 22, 0.45)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = isSelected ? 16 : 6;

    this.roundRect(ctx, x, y, n.w, n.h, 10, true, true);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2. HEAT PIPES', n.x, y + 18);

    ctx.fillStyle = '#f97316';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('HEAT FLOW', n.x, y + n.h / 2 + 5);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('100% Sealed', n.x, y + n.h - 12);

    ctx.restore();
  }

  drawEvaporatorNode(ctx, n) {
    const isSelected = this.selectedStage === 'evap';
    ctx.save();
    const x = n.x - n.w / 2;
    const y = n.y - n.h / 2;

    ctx.fillStyle = isSelected ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isSelected ? '#eab308' : 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = isSelected ? 16 : 6;

    this.roundRect(ctx, x, y, n.w, n.h, 14, true, true);
    ctx.shadowBlur = 0;

    // Saline Water Layer in bottom half
    const waterHeight = n.h * 0.45;
    const waterY = y + n.h - waterHeight - 6;

    const grad = ctx.createLinearGradient(0, waterY, 0, y + n.h);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    grad.addColorStop(1, 'rgba(14, 116, 144, 0.7)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, x + 6, waterY, n.w - 12, waterHeight, 8, true, false);

    // Draw boiling bubbles
    if (this.tEvap > 40.0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (const b of this.bubbles) {
        b.y -= b.speedY * ((this.tEvap - 30) / 30);
        if (b.y < 0) b.y = 1.0;
        const bx = x + 10 + b.x * (n.w - 20);
        const by = waterY + b.y * waterHeight;
        ctx.beginPath();
        ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Salt particles at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let i = 0; i < 6; i++) {
      const cx = x + 14 + i * ((n.w - 28) / 5);
      ctx.beginPath();
      ctx.arc(cx, y + n.h - 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('3. BOILING TANK', n.x, y + 20);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(`${this.tEvap.toFixed(1)}°C`, n.x, y + 38);

    ctx.fillStyle = '#fef08a';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('Salts stay here', n.x, y + n.h - 16);

    ctx.restore();
  }

  drawCondenserNode(ctx, n) {
    const isSelected = this.selectedStage === 'cond';
    ctx.save();
    const x = n.x - n.w / 2;
    const y = n.y - n.h / 2;

    ctx.fillStyle = isSelected ? 'rgba(6, 182, 212, 0.18)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isSelected ? '#06b6d4' : 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = isSelected ? 16 : 6;

    this.roundRect(ctx, x, y, n.w, n.h, 14, true, true);
    ctx.shadowBlur = 0;

    // Helical Condenser Coil
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const coilYStart = y + 46;
    const coilYEnd = y + n.h - 32;
    const coilSteps = 6;
    const stepHeight = (coilYEnd - coilYStart) / coilSteps;

    for (let i = 0; i < coilSteps; i++) {
      const cy = coilYStart + i * stepHeight;
      ctx.ellipse(n.x, cy + stepHeight / 2, n.w * 0.3, stepHeight * 0.4, 0, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('4. COOLING COIL', n.x, y + 20);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillText(`${this.tCond.toFixed(1)}°C`, n.x, y + 38);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('Steam -> Water', n.x, y + n.h - 14);

    ctx.restore();
  }

  drawDistillateNode(ctx, n) {
    const isSelected = this.selectedStage === 'distillate';
    ctx.save();
    const x = n.x - n.w / 2;
    const y = n.y - n.h / 2;

    ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isSelected ? '#10b981' : 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = isSelected ? 16 : 6;

    this.roundRect(ctx, x, y, n.w, n.h, 12, true, true);
    ctx.shadowBlur = 0;

    // Distillate Water Level in beaker
    const fillFraction = Math.min(0.85, 0.25 + (this.distillateTotal / 150) * 0.6);
    const waterHeight = n.h * fillFraction;
    const waterY = y + n.h - waterHeight - 6;

    const grad = ctx.createLinearGradient(0, waterY, 0, y + n.h);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    grad.addColorStop(1, 'rgba(5, 150, 105, 0.8)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, x + 6, waterY, n.w - 12, waterHeight, 6, true, false);

    // Beaker curve
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, waterY);
    ctx.quadraticCurveTo(n.x, waterY + 3, x + n.w - 6, waterY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('5. CLEAN TANK', n.x, y + 18);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`${this.distillateTotal.toFixed(1)} mL`, n.x, y + 36);

    ctx.fillStyle = '#6ee7b7';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Pure Distillate', n.x, y + n.h - 12);

    ctx.restore();
  }

  drawHeatParticles(ctx, speedMult) {
    const startX = this.nodes.compute.x + this.nodes.compute.w / 2;
    const endX = this.nodes.evap.x - this.nodes.evap.w / 2;
    const pipeY = this.nodes.transfer.y;

    ctx.save();
    for (const p of this.heatParticles) {
      p.progress += p.speed * speedMult;
      if (p.progress > 1.0) p.progress = 0;

      const px = startX + p.progress * (endX - startX);
      const py = pipeY + p.offsetY;

      ctx.fillStyle = (p.progress < 0.5) ? '#ef4444' : '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawVaporParticles(ctx, speedMult) {
    if (this.tEvap < 40.0) return;

    const ne = this.nodes.evap;
    const ncd = this.nodes.cond;
    const startX = ne.x;
    const startY = ne.y - ne.h * 0.38;
    const endX = ncd.x;
    const endY = ncd.y - ncd.h * 0.38;

    ctx.save();
    for (const p of this.vaporParticles) {
      p.progress += p.speed * speedMult;
      if (p.progress > 1.0) p.progress = 0;

      const t = p.progress;
      const cp1x = ne.x + 40;
      const cp1y = ne.y - ne.h * 0.45;
      const cp2x = ncd.x - 40;
      const cp2y = ncd.y - ncd.h * 0.45;

      const px = Math.pow(1 - t, 3) * startX +
                 3 * Math.pow(1 - t, 2) * t * cp1x +
                 3 * (1 - t) * Math.pow(t, 2) * cp2x +
                 Math.pow(t, 3) * endX;

      const py = Math.pow(1 - t, 3) * startY +
                 3 * Math.pow(1 - t, 2) * t * cp1y +
                 3 * (1 - t) * Math.pow(t, 2) * cp2y +
                 Math.pow(t, 3) * endY + p.offsetY;

      ctx.fillStyle = `rgba(224, 242, 254, ${p.opacity})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCondenserDroplets(ctx) {
    const ncd = this.nodes.cond;
    const nd = this.nodes.distillate;
    const startX = ncd.x;
    const startY = ncd.y + ncd.h * 0.38;
    const endX = nd.x - nd.w * 0.2;
    const endY = nd.y - nd.h * 0.35;

    if (this.rateMlHr > 0.5 && Math.random() < 0.08) {
      this.droplets.push({
        progress: 0,
        speed: 0.02 + Math.random() * 0.015,
        size: 3 + Math.random() * 1.5
      });
    }

    ctx.save();
    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.progress += d.speed;
      if (d.progress >= 1.0) {
        this.droplets.splice(i, 1);
        continue;
      }

      const dx = startX + d.progress * (endX - startX);
      const dy = startY + d.progress * (endY - startY) + Math.pow(d.progress, 2) * 6;

      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(dx, dy, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

window.CycleVisualizer = CycleVisualizer;

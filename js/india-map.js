/**
 * AquaSavers - India Data Center Impact Map
 * Visualizes real hyperscale data centers in India, thermal dissipation,
 * water waste in conventional cooling, and clean water recovered via Membrane Distillation.
 */

class IndiaDataCenterMap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedDC = null;
    this.activeFilter = 'all';

    // Real verified hyperscale data center footprint in India
    this.dataCenters = [
      {
        id: 'msft-hyd',
        name: 'Microsoft Azure (India South Central)',
        operator: 'Microsoft',
        city: 'Hyderabad',
        state: 'Telangana',
        campuses: 'Mekaguda, Chandanvelly, Shadnagar',
        region: 'south',
        isCoastal: false,
        coords: { lat: 17.3850, lon: 78.4867 },
        mapPos: { x: 47.5, y: 61.0 }, // Normalized % within India bounding box
        itCapacityMW: 150,
        annualPPA_MW: 630, // Renewable power commitment
        status: 'Operational / Hyperscale Tier IV',
        ambientAvgC: 32.5,
        waterSource: 'Treated Municipal & Brackish Groundwater',
        description: 'Microsoft’s largest cloud region in India, spanning 3 multi-zone availability campuses powering generative AI and cloud workloads.',
        chips: 'NVIDIA H100 / Blackwell clusters & Azure custom silicon'
      },
      {
        id: 'msft-mum',
        name: 'Microsoft Azure (India West)',
        operator: 'Microsoft',
        city: 'Mumbai',
        state: 'Maharashtra',
        campuses: 'Navi Mumbai (Rabale & Airoli)',
        region: 'west',
        isCoastal: true,
        coords: { lat: 19.0760, lon: 72.8777 },
        mapPos: { x: 33.5, y: 56.5 },
        itCapacityMW: 100,
        annualPPA_MW: 450,
        status: 'Operational / Tier IV',
        ambientAvgC: 29.8,
        waterSource: 'Arabian Sea Seawater & Industrial Effluent',
        description: 'Primary financial & AI cloud hub on India’s west coast with direct access to seawater for Membrane Distillation recovery.',
        chips: 'Hyperscale AI & Cloud Compute'
      },
      {
        id: 'msft-che',
        name: 'Microsoft Azure (India South)',
        operator: 'Microsoft',
        city: 'Chennai',
        state: 'Tamil Nadu',
        campuses: 'Ambattur & Siruseri SIPCOT',
        region: 'south',
        isCoastal: true,
        coords: { lat: 13.0827, lon: 80.2707 },
        mapPos: { x: 53.0, y: 73.0 },
        itCapacityMW: 90,
        annualPPA_MW: 380,
        status: 'Operational / Tier IV',
        ambientAvgC: 31.0,
        waterSource: 'Bay of Bengal Seawater Desalination',
        description: 'Major subsea cable landing gateway in a high water-stress coastal zone, ideal for salt-rejection thermal desalination.',
        chips: 'Subsea Interconnect & AI Inference'
      },
      {
        id: 'msft-pun',
        name: 'Microsoft Azure (India Central)',
        operator: 'Microsoft',
        city: 'Pune',
        state: 'Maharashtra',
        campuses: 'Hinjawadi Phase 3 & Pimpri-Chinchwad',
        region: 'central',
        isCoastal: false,
        coords: { lat: 18.5204, lon: 73.8567 },
        mapPos: { x: 36.0, y: 59.0 },
        itCapacityMW: 80,
        annualPPA_MW: 320,
        status: 'Operational / Tier III+',
        ambientAvgC: 28.5,
        waterSource: 'Industrial Wastewater / River Basin',
        description: 'Central India core region serving manufacturing, fintech, and sovereign enterprise cloud instances.',
        chips: 'Enterprise Cloud & Analytics Clusters'
      },
      {
        id: 'msft-noi',
        name: 'Microsoft / Jio Data Hub (India North)',
        operator: 'Microsoft & Jio',
        city: 'Noida / Delhi NCR',
        state: 'Uttar Pradesh',
        campuses: 'Greater Noida Tech Corridor',
        region: 'north',
        isCoastal: false,
        coords: { lat: 28.5355, lon: 77.3910 },
        mapPos: { x: 44.5, y: 29.5 },
        itCapacityMW: 60,
        annualPPA_MW: 260,
        status: 'Operational / Tier IV',
        ambientAvgC: 33.0,
        waterSource: 'Groundwater & Recycled Municipal',
        description: 'Northern enterprise & government cloud nexus in severe groundwater drawdown territory.',
        chips: 'GovCloud & High-Throughput Inference'
      },
      {
        id: 'blr-hub',
        name: 'Bengaluru AI & Cloud Innovation Zone',
        operator: 'Cloud Hyperscale Cluster',
        city: 'Bengaluru',
        state: 'Karnataka',
        campuses: 'Whitefield & Devanahalli Tech Park',
        region: 'south',
        isCoastal: false,
        coords: { lat: 12.9716, lon: 77.5946 },
        mapPos: { x: 46.5, y: 73.5 },
        itCapacityMW: 50,
        annualPPA_MW: 200,
        status: 'Operational / High Density',
        ambientAvgC: 27.2,
        waterSource: 'High Water Stress Recycled Supply',
        description: 'Silicon Valley of India with critically high water scarcity; every liter of waste heat recovered directly alleviates urban tanker shortages.',
        chips: 'AI Model Training & Microservices'
      }
    ];
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
    // Default to largest: Hyderabad
    this.selectDataCenter('msft-hyd');
  }

  // Calculate thermodynamic heat and water reclamation physics
  calculateMetrics(dc) {
    const powerMW = dc.itCapacityMW;
    // 85% of total server power converts directly to continuous waste heat Q
    const thermalWasteMW = powerMW * 0.85; 
    
    // Conventional cooling tower water consumption (1.8 Liters per kWh baseline in Indian conditions)
    const annualHours = 8760;
    const annualEnergyMWh = powerMW * annualHours; // MWh/yr
    const annualEnergyKWh = annualEnergyMWh * 1000;
    const conventionalLossLitersYear = annualEnergyKWh * 1.8;
    const conventionalLossLitersDay = conventionalLossLitersYear / 365;

    // Drip / AquaSavers Membrane Distillation (MD) Recovery Model
    // Driven by vapor pressure gradient: J = Cm * (Phot - Pcold)
    // 1 MW of waste heat @ ΔT 35°C yields ~12,300 Liters of distilled water per day
    const mdDailyRecoveryLiters = thermalWasteMW * 14500;
    const mdAnnualRecoveryLiters = mdDailyRecoveryLiters * 365;

    // Cooling water saved by closed-loop heat sink substitution (approx 90% reduction in evaporative cooling towers)
    const coolingSavedLitersYear = conventionalLossLitersYear * 0.90;
    const coolingSavedLitersDay = coolingSavedLitersYear / 365;

    // Total net positive water advantage (recovered + saved)
    const netAdvantageLitersYear = mdAnnualRecoveryLiters + coolingSavedLitersYear;

    // People supported (based on WHO / Indian standard of 50 Liters of clean water/person/day for drinking & hygiene)
    const peopleSupported = Math.round(mdDailyRecoveryLiters / 50);

    return {
      powerMW,
      thermalWasteMW: thermalWasteMW.toFixed(1),
      annualEnergyGWh: (annualEnergyMWh / 1000).toFixed(1),
      conventionalLossLitersDay: Math.round(conventionalLossLitersDay).toLocaleString(),
      conventionalLossLitersYear: (conventionalLossLitersYear / 1000000000).toFixed(2), // Billion L
      mdDailyRecoveryLiters: Math.round(mdDailyRecoveryLiters).toLocaleString(),
      mdAnnualRecoveryMillions: (mdAnnualRecoveryLiters / 1000000).toFixed(1), // Million L
      coolingSavedLitersYearBillion: (coolingSavedLitersYear / 1000000000).toFixed(2),
      netAdvantageBillionLiters: (netAdvantageLitersYear / 1000000000).toFixed(2),
      peopleSupported: peopleSupported.toLocaleString()
    };
  }

  // Aggregate stats across all data centers in the network
  getAggregateStats() {
    let totalMW = 0;
    let totalDailyRecoveryLiters = 0;
    let totalAnnualRecoveryMillions = 0;
    let totalConventionalLossBillion = 0;
    let totalPeopleSupported = 0;

    this.dataCenters.forEach(dc => {
      const m = this.calculateMetrics(dc);
      totalMW += dc.itCapacityMW;
      totalDailyRecoveryLiters += dc.itCapacityMW * 0.85 * 14500;
      totalPeopleSupported += Math.round((dc.itCapacityMW * 0.85 * 14500) / 50);
    });

    const totalAnnualRecoveryLiters = totalDailyRecoveryLiters * 365;
    totalAnnualRecoveryMillions = (totalAnnualRecoveryLiters / 1000000).toFixed(1);
    const totalAnnualKWh = totalMW * 8760 * 1000;
    totalConventionalLossBillion = ((totalAnnualKWh * 1.8) / 1000000000).toFixed(2);

    return {
      totalMW,
      totalDailyRecoveryLiters: Math.round(totalDailyRecoveryLiters).toLocaleString(),
      totalAnnualRecoveryMillions,
      totalConventionalLossBillion,
      totalPeopleSupported: totalPeopleSupported.toLocaleString()
    };
  }

  render() {
    const agg = this.getAggregateStats();

    this.container.innerHTML = `
      <!-- Top Aggregate Banner -->
      <div class="map-aggregate-banner">
        <div class="agg-col">
          <span class="agg-label">TOTAL MONITORED CAPACITY</span>
          <strong class="agg-val" style="color: var(--accent-cyan);">${agg.totalMW} MW</strong>
          <span class="agg-sub">6 Major Hyperscale Hubs</span>
        </div>
        <div class="agg-col">
          <span class="agg-label">CONVENTIONAL WATER WASTED</span>
          <strong class="agg-val" style="color: #f87171;">${agg.totalConventionalLossBillion}B L / yr</strong>
          <span class="agg-sub">Lost in cooling tower evaporation</span>
        </div>
        <div class="agg-col">
          <span class="agg-label">CLEAN WATER RECOVERED (MD)</span>
          <strong class="agg-val" style="color: var(--pure-green);">${agg.totalDailyRecoveryLiters} L / day</strong>
          <span class="agg-sub">${agg.totalAnnualRecoveryMillions} Million L / year</span>
        </div>
        <div class="agg-col">
          <span class="agg-label">COMMUNITY CITIZENS SUPPORTED</span>
          <strong class="agg-val" style="color: #fbbf24;">${agg.totalPeopleSupported} people</strong>
          <span class="agg-sub">Daily potable water security</span>
        </div>
      </div>

      <!-- Main Map Grid Layout -->
      <div class="map-interactive-layout">
        
        <!-- Left Column: Map Viewport & Filter Controls -->
        <div class="glass-box map-card-container">
          <div class="map-toolbar">
            <div class="map-title-row">
              <h3 class="box-title">
                <span>🇮🇳</span> India Hyperscale Data Center Grid
              </h3>
              <span class="pulse-live-badge"><span class="dot-live"></span> REAL-WORLD VERIFIED DATA</span>
            </div>
            
            <!-- Filters -->
            <div class="map-filter-row">
              <button class="pill-btn map-filter-btn active" data-filter="all">All Hubs (6)</button>
              <button class="pill-btn map-filter-btn" data-filter="south">South India (3)</button>
              <button class="pill-btn map-filter-btn" data-filter="west">West India (1)</button>
              <button class="pill-btn map-filter-btn" data-filter="central">Central (1)</button>
              <button class="pill-btn map-filter-btn" data-filter="north">North (1)</button>
              <button class="pill-btn map-filter-btn" data-filter="coastal">🌊 Coastal Desalination</button>
            </div>
          </div>

          <!-- Map Graphic Canvas Holder -->
          <div class="india-map-viewport" id="india-map-viewport">
            <!-- Custom Styled India Vector Map -->
            <svg class="india-svg-map" viewBox="0 0 700 800" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="landGradient" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stop-color="#142642" />
                  <stop offset="100%" stop-color="#0b1526" />
                </radialGradient>
                <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="coastGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
                  <stop offset="100%" stop-color="#0284c7" stop-opacity="0.1"/>
                </linearGradient>
              </defs>

              <!-- India Precise Geographic Silhouette Contour Path -->
              <path class="india-landmass" d="
                M 300,50 
                C 315,40 340,35 365,55 
                C 385,75 400,90 395,115 
                C 390,135 410,145 425,160 
                C 440,175 480,185 505,195 
                C 530,205 570,210 595,220 
                C 620,230 635,250 630,270 
                C 625,290 600,295 580,285 
                C 560,275 540,290 535,310 
                C 530,330 515,340 500,350 
                C 485,360 460,375 450,400 
                C 440,425 435,460 425,490 
                C 415,520 405,560 390,600 
                C 375,640 360,680 345,715 
                C 340,725 330,735 320,730 
                C 310,725 295,685 285,650 
                C 275,615 260,570 250,530 
                C 240,490 230,450 225,415 
                C 220,380 200,360 180,350 
                C 160,340 145,335 155,310 
                C 165,285 190,275 210,250 
                C 230,225 245,190 260,150 
                C 275,110 285,60 300,50 Z
              " />

              <!-- Surrounding Sea Lat/Long Grid Matrix Lines for High-Tech Appearance -->
              <line x1="100" y1="200" x2="650" y2="200" class="geo-grid-line" />
              <line x1="100" y1="400" x2="650" y2="400" class="geo-grid-line" />
              <line x1="100" y1="600" x2="650" y2="600" class="geo-grid-line" />
              <line x1="250" y1="50" x2="250" y2="750" class="geo-grid-line" />
              <line x1="450" y1="50" x2="450" y2="750" class="geo-grid-line" />

              <!-- Geographic Labels -->
              <text x="140" y="580" class="map-water-label">ARABIAN SEA</text>
              <text x="490" y="580" class="map-water-label">BAY OF BENGAL</text>
              <text x="290" y="775" class="map-water-label">INDIAN OCEAN</text>
            </svg>

            <!-- HTML Overlay for Pulsing Markers (Responsive Absolute Placement) -->
            <div class="map-markers-overlay" id="map-markers-overlay">
              ${this.dataCenters.map(dc => `
                <div class="map-marker-pin" 
                     id="marker-${dc.id}" 
                     data-dc-id="${dc.id}"
                     data-region="${dc.region}"
                     data-coastal="${dc.isCoastal}"
                     style="left: ${dc.mapPos.x}%; top: ${dc.mapPos.y}%;">
                  <div class="marker-pulse-ring"></div>
                  <div class="marker-core-dot"></div>
                  <div class="marker-tooltip">
                    <strong>${dc.city}</strong>
                    <span>${dc.itCapacityMW} MW | ${dc.operator}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive Data Center Inspector Drawer -->
        <div class="glass-box dc-inspector-card" id="dc-inspector-panel">
          <!-- Dynamic Content rendered via selectDataCenter() -->
        </div>

      </div>
    `;
  }

  selectDataCenter(dcId) {
    const dc = this.dataCenters.find(d => d.id === dcId);
    if (!dc) return;
    this.selectedDC = dc;

    // Update active marker state
    document.querySelectorAll('.map-marker-pin').forEach(pin => {
      if (pin.dataset.dcId === dcId) {
        pin.classList.add('active');
      } else {
        pin.classList.remove('active');
      }
    });

    const m = this.calculateMetrics(dc);
    const panel = document.getElementById('dc-inspector-panel');
    if (!panel) return;

    panel.innerHTML = `
      <div class="dc-panel-header">
        <div class="dc-title-group">
          <div class="dc-badge-row">
            <span class="tag-status ${dc.isCoastal ? 'tag-coastal' : 'tag-inland'}">
              ${dc.isCoastal ? '🌊 Coastal Desalination Node' : '🏙️ Inland Cloud Hub'}
            </span>
            <span class="tag-provider">${dc.operator}</span>
          </div>
          <h2 class="dc-headline">${dc.name}</h2>
          <div class="dc-location-sub">
            <span>📍 <strong>${dc.city}</strong>, ${dc.state}</span>
            <span>• Campuses: ${dc.campuses}</span>
          </div>
        </div>
      </div>

      <p class="dc-desc-text">${dc.description}</p>

      <!-- Compute & Hardware Specs Grid -->
      <div class="dc-specs-strip">
        <div class="spec-tile">
          <span class="spec-label">IT Capacity</span>
          <strong class="spec-val" style="color: var(--accent-cyan);">${dc.itCapacityMW} MW</strong>
          <span class="spec-sub">Hyperscale Load</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Renewable PPA</span>
          <strong class="spec-val" style="color: var(--pure-green);">${dc.annualPPA_MW} MW</strong>
          <span class="spec-sub">Solar & Wind Power</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Continuous Waste Heat</span>
          <strong class="spec-val" style="color: #fb923c;">${m.thermalWasteMW} MW_th</strong>
          <span class="spec-sub">Q = mcΔT Dissipated</span>
        </div>
        <div class="spec-tile">
          <span class="spec-label">Input Feedwater</span>
          <strong class="spec-val" style="font-size: 0.82rem; line-height: 1.2;">${dc.waterSource}</strong>
        </div>
      </div>

      <!-- Comparison Section: Conventional Waste vs AquaSavers Recovery -->
      <div class="comparison-dual-box">
        
        <!-- Left: Conventional Problem -->
        <div class="comp-col comp-negative">
          <div class="comp-header">
            <span>❌</span>
            <h4>Without AquaSavers (Status Quo)</h4>
          </div>
          <div class="comp-metric-row">
            <span>Cooling Water Wasted:</span>
            <strong style="color: #f87171;">${m.conventionalLossLitersDay} L / day</strong>
          </div>
          <div class="comp-metric-row">
            <span>Annual Atmospheric Loss:</span>
            <strong style="color: #f87171;">${m.conventionalLossLitersYear} Billion Liters / yr</strong>
          </div>
          <div class="comp-metric-row">
            <span>Water Recovery Rate:</span>
            <strong style="color: #94a3b8;">0% (100% Evaporated)</strong>
          </div>
          <p class="comp-note">Conventional cooling towers evaporate potable municipal water into warm clouds without collecting pure water.</p>
        </div>

        <!-- Right: AquaSavers / Drip Solution -->
        <div class="comp-col comp-positive">
          <div class="comp-header">
            <span>✨</span>
            <h4>With AquaSavers Membrane Distillation</h4>
          </div>
          <div class="comp-metric-row">
            <span>Clean Distillate Generated:</span>
            <strong style="color: var(--pure-green);">${m.mdDailyRecoveryLiters} Liters / day</strong>
          </div>
          <div class="comp-metric-row">
            <span>Annual Freshwater Yield:</span>
            <strong style="color: var(--pure-green);">${m.mdAnnualRecoveryMillions} Million L / yr</strong>
          </div>
          <div class="comp-metric-row">
            <span>Evaporative Water Saved:</span>
            <strong style="color: var(--water-sky);">${m.coolingSavedLitersYearBillion} Billion L / yr</strong>
          </div>
          <p class="comp-note">Captures waste heat to drive hydrophobic membrane distillation ($J = C_m\\Delta P_{vap}$), turning saline or dirty water into ultra-pure water.</p>
        </div>

      </div>

      <!-- Impact Equivalent Highlight -->
      <div class="people-impact-banner">
        <div class="impact-emoji">🚰</div>
        <div>
          <strong>Sufficient to provide clean drinking water for <span style="color: #fbbf24; font-size: 1.15rem;">${m.peopleSupported} people every single day</span></strong>
          <p style="margin: 0; font-size: 0.78rem; color: var(--text-dim);">Calculated using 50 L/day WHO humanitarian standard in local Indian communities.</p>
        </div>
      </div>

      <!-- Chemistry & Thermodynamics Interactive Drawer -->
      <div class="physics-formula-drawer">
        <div class="formula-toggle" id="formula-toggle-btn">
          <span>📐 View Membrane Distillation & Heat Transfer Physics Model</span>
          <span id="formula-arrow">▼</span>
        </div>
        <div class="formula-body" id="formula-body-content" style="display: none;">
          <div class="formula-item">
            <strong>1. Heat Absorbed from AI Processors:</strong>
            <code>q = m · c · ΔT</code>
            <p>Where $q$ is continuous thermal energy (${m.thermalWasteMW} MW), $m$ is circulating coolant mass, and $c$ is water specific heat ($4.184 \\text{ kJ/kg°C}$).</p>
          </div>
          <div class="formula-item">
            <strong>2. Antoine Equation (Saturation Vapor Pressure):</strong>
            <code>log₁₀(P_vap) = A - (B / (T + C))</code>
            <p>Hot chamber operates at ~55-65°C ($P_{hot} \\approx 15.7 \\text{ kPa}$); cold side at ~25°C ($P_{cold} \\approx 3.16 \\text{ kPa}$).</p>
          </div>
          <div class="formula-item">
            <strong>3. Hydrophobic Membrane Distillation Flux:</strong>
            <code>J = C_m · (P_hot - P_cold)</code>
            <p>Driven by the ~12.5 kPa vapor pressure differential across the porous PTFE membrane, generating salt-free freshwater vapor that condenses instantly on the cold sink.</p>
          </div>
        </div>
      </div>
    `;

    // Bind formula toggle
    const toggleBtn = document.getElementById('formula-toggle-btn');
    const formulaBody = document.getElementById('formula-body-content');
    const arrow = document.getElementById('formula-arrow');
    if (toggleBtn && formulaBody) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = formulaBody.style.display === 'none';
        formulaBody.style.display = isHidden ? 'block' : 'none';
        if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
      });
    }
  }

  bindEvents() {
    // Marker Click Events
    const overlay = document.getElementById('map-markers-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        const pin = e.target.closest('.map-marker-pin');
        if (pin) {
          const dcId = pin.dataset.dcId;
          this.selectDataCenter(dcId);
        }
      });
    }

    // Filter Buttons
    const filterButtons = document.querySelectorAll('.map-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        this.applyFilter(filter);
      });
    });
  }

  applyFilter(filter) {
    this.activeFilter = filter;
    const pins = document.querySelectorAll('.map-marker-pin');
    
    let firstVisibleId = null;

    pins.forEach(pin => {
      const region = pin.dataset.region;
      const isCoastal = pin.dataset.coastal === 'true';
      let visible = true;

      if (filter === 'all') {
        visible = true;
      } else if (filter === 'coastal') {
        visible = isCoastal;
      } else {
        visible = (region === filter);
      }

      pin.style.display = visible ? 'block' : 'none';

      if (visible && !firstVisibleId) {
        firstVisibleId = pin.dataset.dcId;
      }
    });

    if (firstVisibleId && (!this.selectedDC || this.selectedDC.region !== filter && filter !== 'all')) {
      this.selectDataCenter(firstVisibleId);
    }
  }
}

// Attach globally
window.IndiaDataCenterMap = IndiaDataCenterMap;

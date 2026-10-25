/**
 * AquaSavers Master Controller 2.0
 * Modern tab routing, friendly calculator, and ESP32 connection modal.
 */

document.addEventListener('DOMContentLoaded', () => {
  const simulator = new HardwareSimulator();
  const bridge = new ESP32Bridge(simulator);
  const dashboard = new TelemetryDashboard(bridge, simulator);
  const visualizer = new CycleVisualizer(bridge);
  const indiaMap = new IndiaDataCenterMap('india-map-root');

  dashboard.init();
  visualizer.init();
  bridge.init();
  indiaMap.init();

  // Tab Navigation
  const navLinks = document.querySelectorAll('.nav-link');
  const viewSections = document.querySelectorAll('.view-section');

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetId = link.dataset.view;

      navLinks.forEach(l => l.classList.remove('active'));
      viewSections.forEach(s => s.classList.remove('active'));

      link.classList.add('active');
      const targetView = document.getElementById(targetId);
      if (targetView) {
        targetView.classList.add('active');
      }

      if (targetId === 'view-flow') {
        setTimeout(() => visualizer.resize(), 50);
      } else if (targetId === 'view-monitor') {
        setTimeout(() => {
          if (dashboard.initChart) dashboard.initChart();
          if (dashboard.drawCharts) dashboard.drawCharts();
        }, 50);
      }
    });
  });

  const modal = document.getElementById('connect-modal');
  const openModalBtn = document.getElementById('open-connect-modal-btn');
  const setupTriggerBtn = document.getElementById('setup-connect-trigger-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const quickSettingsBtn = document.getElementById('btn-quick-settings');
  const notificationsBtn = document.getElementById('btn-notifications');
  const connectUsbBtn = document.getElementById('btn-connect-usb');
  const connectWifiBtn = document.getElementById('btn-connect-wifi');
  const revertBtn = document.getElementById('btn-revert-sim');
  const wifiIpInput = document.getElementById('wifi-ip-box');
  const webSerialAlert = document.getElementById('web-serial-alert');

  if (webSerialAlert && !bridge.isWebSerialSupported()) {
    webSerialAlert.style.display = 'block';
    if (connectUsbBtn) connectUsbBtn.disabled = true;
  }

  const openModal = () => { if (modal) modal.classList.add('active'); };
  const closeModal = () => { if (modal) modal.classList.remove('active'); };

  if (openModalBtn) openModalBtn.addEventListener('click', openModal);
  if (setupTriggerBtn) setupTriggerBtn.addEventListener('click', openModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  if (quickSettingsBtn) {
    quickSettingsBtn.addEventListener('click', () => {
      showToast('Settings: Simulation rate 1000ms • Auto-reconnect active', 'info');
    });
  }

  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', () => {
      const purityEl = document.getElementById('metric-salt-rejection');
      const purityVal = purityEl ? purityEl.textContent : '99.9%';
      showToast(`No critical alerts. Distillate purity at optimal ${purityVal}`, 'success');
    });
  }

  if (connectUsbBtn) {
    connectUsbBtn.addEventListener('click', async () => {
      try {
        await bridge.connectSerial();
        showToast('Connected to ESP32 via USB (115200 baud)!', 'success');
        closeModal();
      } catch (err) {
        showToast(err.message || 'Connection cancelled', 'error');
      }
    });
  }

  if (connectWifiBtn) {
    connectWifiBtn.addEventListener('click', async () => {
      const ip = wifiIpInput.value.trim();
      if (!ip) {
        showToast('Please enter an IP address', 'error');
        return;
      }
      const endpoint = ip.startsWith('http') ? `${ip}/api/telemetry` : `http://${ip}/api/telemetry`;
      try {
        await bridge.connectWifi(endpoint);
        showToast(`Connected to ESP32 over Wi-Fi (${ip})!`, 'success');
        closeModal();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (revertBtn) {
    revertBtn.addEventListener('click', async () => {
      await bridge.disconnect();
      showToast('Switched to Simulated Hardware Feed', 'info');
      closeModal();
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Impact Calculator
  const calcScale = () => {
    const kw = parseFloat(document.getElementById('calc-server-power')?.value || 10);
    const techType = document.getElementById('calc-tech-type')?.value || 'vacuum';

    let efficiency = 0.65;
    if (techType === 'membrane') efficiency = 0.72;
    if (techType === 'atmospheric') efficiency = 0.52;

    const yieldStats = AquaPhysics.calculateDistillateYield(kw * 1000, 65, 25, efficiency);
    const litersDay = yieldStats.litersPerDay;
    const litersYear = litersDay * 365;

    // 2.1 L wasted in cooling towers per kWh
    const wastedDay = kw * 24 * 2.1;
    const wastedYear = wastedDay * 365;
    const netYear = litersYear + wastedYear;

    const elKwVal = document.getElementById('calc-server-power-val');
    const elDistDay = document.getElementById('result-dist-day');
    const elDistYear = document.getElementById('result-dist-year');
    const elCoolingWasted = document.getElementById('result-cooling-wasted');
    const elNetSaved = document.getElementById('result-net-saved');

    if (elKwVal) elKwVal.textContent = kw >= 1000 ? `${(kw/1000).toFixed(1)} MW` : `${kw} kW`;
    if (elDistDay) elDistDay.textContent = `${Math.round(litersDay).toLocaleString()} Liters / day`;
    if (elDistYear) elDistYear.textContent = `${Math.round(litersYear).toLocaleString()} Liters / yr`;
    if (elCoolingWasted) elCoolingWasted.textContent = `${Math.round(wastedDay).toLocaleString()} Liters / day`;
    if (elNetSaved) elNetSaved.textContent = `${Math.round(netYear).toLocaleString()} Liters / yr`;
  };

  ['calc-server-power', 'calc-tech-type'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcScale);
  });
  calcScale();

  // Copy Arduino Code Button
  const copyBtn = document.getElementById('copy-firmware-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const codeEl = document.getElementById('firmware-code-block');
      if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          showToast('Arduino code copied to clipboard!', 'success');
        }).catch(() => {
          showToast('Could not copy automatically', 'error');
        });
      }
    });
  }

  function showToast(message, type = 'info') {
    const rack = document.getElementById('toast-rack');
    if (!rack) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'}</span>
      <span>${message}</span>
    `;

    rack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  window.showToast = showToast;
});

/**
 * AquaSavers ESP32 Hardware Bridge
 * Handles real-time communication via Web Serial API (USB) and Wi-Fi HTTP / WebSockets.
 * Switches seamlessly between Simulated Hardware and Physical ESP32 Hardware.
 */

class ESP32Bridge {
  constructor(simulator) {
    this.simulator = simulator;
    this.connectionMode = 'SIMULATED'; // 'SIMULATED', 'CONNECTING', 'LIVE_USB', 'LIVE_WIFI'
    this.serialPort = null;
    this.serialReader = null;
    this.wifiInterval = null;
    this.wifiEndpoint = 'http://192.168.4.1/api/telemetry';

    this.telemetryListeners = [];
    this.stateListeners = [];

    // Route simulator packets when in SIMULATED mode
    this.simulator.onTelemetry((packet) => {
      if (this.connectionMode === 'SIMULATED') {
        this.emitTelemetry(packet);
      }
    });
  }

  init() {
    // Start with simulator active
    this.setMode('SIMULATED');
    this.simulator.start();
  }

  isWebSerialSupported() {
    return 'serial' in navigator;
  }

  setMode(mode, detail = '') {
    this.connectionMode = mode;
    for (const cb of this.stateListeners) {
      cb(mode, detail);
    }
  }

  onTelemetry(callback) {
    this.telemetryListeners.push(callback);
  }

  onStateChange(callback) {
    this.stateListeners.push(callback);
  }

  emitTelemetry(packet) {
    for (const cb of this.telemetryListeners) {
      try {
        cb(packet);
      } catch (e) {
        console.error('Telemetry dispatch error:', e);
      }
    }
  }

  // ----- Web Serial API (USB Plug & Play) -----
  async connectSerial() {
    if (!this.isWebSerialSupported()) {
      throw new Error('Web Serial is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }

    try {
      this.setMode('CONNECTING', 'Waiting for USB serial device selection...');
      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open({ baudRate: 115200 });

      this.simulator.stop();
      this.setMode('LIVE_USB', 'Connected via USB (115200 baud)');
      this.readSerialStream();
    } catch (err) {
      console.warn('Serial connection aborted/failed:', err);
      this.disconnect();
      throw err;
    }
  }

  async readSerialStream() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    this.serialReader = reader;

    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const data = JSON.parse(trimmed);
              data.source = 'ESP32_USB';
              this.emitTelemetry(data);
            } catch (jsonErr) {
              // Ignore partial or malformed line
            }
          }
        }
      }
    } catch (readErr) {
      console.error('Serial read stream error:', readErr);
    } finally {
      reader.releaseLock();
      this.disconnect();
    }
  }

  // ----- Wi-Fi HTTP Polling -----
  async connectWifi(endpoint) {
    if (endpoint) this.wifiEndpoint = endpoint;
    this.setMode('CONNECTING', `Connecting to ESP32 at ${this.wifiEndpoint}...`);

    try {
      // Test fetch
      const resp = await fetch(this.wifiEndpoint, { mode: 'cors', cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP Error: ${resp.status}`);
      const testData = await resp.json();

      this.simulator.stop();
      this.setMode('LIVE_WIFI', `Connected to ESP32 at ${this.wifiEndpoint}`);
      testData.source = 'ESP32_WIFI';
      this.emitTelemetry(testData);

      // Start polling
      if (this.wifiInterval) clearInterval(this.wifiInterval);
      this.wifiInterval = setInterval(async () => {
        try {
          const r = await fetch(this.wifiEndpoint, { mode: 'cors', cache: 'no-cache' });
          if (r.ok) {
            const data = await r.json();
            data.source = 'ESP32_WIFI';
            this.emitTelemetry(data);
          }
        } catch (pollErr) {
          console.warn('Wi-Fi poll dropped packet:', pollErr);
        }
      }, 1000);

    } catch (err) {
      this.disconnect();
      throw new Error(`Could not reach ESP32 at ${this.wifiEndpoint}. Ensure you are connected to the AquaSavers Wi-Fi.`);
    }
  }

  // Disconnect physical hardware and revert to simulator
  async disconnect() {
    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
      } catch (e) {}
      this.serialReader = null;
    }

    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch (e) {}
      this.serialPort = null;
    }

    if (this.wifiInterval) {
      clearInterval(this.wifiInterval);
      this.wifiInterval = null;
    }

    this.setMode('SIMULATED', 'Switched to Simulated Hardware Mode');
    this.simulator.start();
  }
}

window.ESP32Bridge = ESP32Bridge;

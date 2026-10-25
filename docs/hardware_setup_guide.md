# AquaSavers Physical Prototype - Hardware & Firmware Setup Guide

This guide details how to build, wire, and flash the ESP32 microcontroller for the AquaSavers thermal water recovery prototype.

---

## 1. System Overview

```
[ Heat Source: Server CPU / Dummy Load ]
                 │ (Conduction via Heat Pipes)
                 ▼
      [ Evaporation Chamber ] ──(Water Vapor)──► [ Condenser Coil ]
                 │ (Leaves Salts/TDS)                    │
                 ▼                                       ▼
       [ Brine Drain ]                         [ Distillate Reservoir ]
                                                         │
                                                  (Drop Counter & TDS)
```

The ESP32 collects telemetry across all thermodynamic stages and streams it to the AquaSavers web interface over **USB Serial (115200 baud)** or **Wi-Fi HTTP (`/api/telemetry`)**.

---

## 2. Bill of Materials (BOM)

| Component | Quantity | Purpose | Approximate Cost |
|---|---|---|---|
| **ESP32 NodeMCU Development Board** | 1 | Microcontroller & dual Wi-Fi/Serial communication | ~$5.00 |
| **DS18B20 Waterproof Temperature Probes** | 3 | $T_{\text{source}}$, $T_{\text{evaporator}}$, and $T_{\text{condenser}}$ | ~$6.00 |
| **4.7kΩ Resistor** | 1 | Pull-up resistor for DS18B20 OneWire bus | ~$0.10 |
| **Analog TDS (Total Dissolved Solids) Sensor** | 1 | Purity sensor in distillate reservoir (measures salt separation) | ~$8.00 |
| **Optical Drop Counter / IR Flow Sensor** | 1 | Calibrated drops of recovered distillate (20 drops = 1.0 mL) | ~$3.00 |
| **HC-SR04 Ultrasonic Distance Sensor** | 1 | Non-contact liquid level for saline feedwater tank | ~$2.00 |
| **Solderless Breadboard & Jumper Wires** | 1 set | Benchtop prototype prototyping | ~$5.00 |

---

## 3. Wiring Diagram & ESP32 Pinout

| Sensor Pin | ESP32 Pin | Notes |
|---|---|---|
| **DS18B20 Data (Yellow)** | **GPIO 4** | Connect all 3 sensor yellow wires to GPIO 4. Connect 4.7kΩ resistor between GPIO 4 and 3.3V. |
| **DS18B20 VCC (Red)** | **3.3V** | Power rail |
| **DS18B20 GND (Black)** | **GND** | Common ground |
| **Drop Counter / Flow (Signal)** | **GPIO 5** | Configured with internal pull-up & interrupt on falling edge |
| **TDS Sensor (Analog Out)** | **GPIO 34** | ADC1 channel (0 - 3.3V) |
| **Ultrasonic HC-SR04 TRIG** | **GPIO 18** | Trigger pulse output |
| **Ultrasonic HC-SR04 ECHO** | **GPIO 19** | Echo return pulse input |
| **Built-in LED** | **GPIO 2** | Flashes on each telemetry packet emitted |

---

## 4. Software & Flashing Instructions

### Step A: Arduino IDE Setup
1. Download and install [Arduino IDE](https://www.arduino.cc/en/software).
2. Go to **File > Preferences**, in *Additional Boards Manager URLs*, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Open **Tools > Board > Boards Manager**, search for `esp32` and install **esp32 by Espressif Systems**.
4. Select board: **Tools > Board > ESP32 Arduino > ESP32 Dev Module**.

### Step B: Install Required Libraries
Go to **Tools > Manage Libraries...** and install:
1. `OneWire` (by Paul Stoffregen)
2. `DallasTemperature` (by Miles Burton)
3. `ArduinoJson` (by Benoit Blanchon, version 6.x or 7.x)

### Step C: Flash the Firmware
1. Open [`firmware/esp32_aquasavers.ino`](file:///d:/Antigravity/firmware/esp32_aquasavers.ino).
2. Plug your ESP32 into your computer via a Micro-USB or USB-C data cable.
3. Select your ESP32 COM port under **Tools > Port**.
4. Click **Upload**.

---

## 5. Connecting to the Web Software

When your hardware is flashed and connected:
1. Open the **AquaSavers Web Application** in Google Chrome, Microsoft Edge, or Opera.
2. Click **Connect ESP32** in the top navigation header.
3. Choose either:
   - **Web Serial (USB)**: Click "Connect via USB", select your ESP32 COM port in the browser popup, and click Connect. The dashboard turns green and streams physical sensor readings immediately!
   - **Wi-Fi**: Connect your laptop or phone to the ESP32's Wi-Fi network (`AquaSavers-AP`, password: `waterrecovery`), then enter `http://192.168.4.1` into the Wi-Fi field and click Connect.

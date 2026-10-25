/**
 * AquaSavers Thermodynamic & Desalination Physics Engine
 * Formulates real heat transfer, phase transitions, and water recovery metrics.
 */

const AquaPhysics = {
  // Latent heat of vaporization of water as a function of temperature (kJ/kg)
  // Empirical approximation: h_fg(T) ~ 2501 - 2.361 * T
  latentHeatOfVaporization(tempC) {
    const t = Math.max(10, Math.min(120, tempC));
    return 2501.0 - (2.361 * t);
  },

  // Specific heat capacity of liquid water (kJ / kg*K)
  specificHeatCapacity: 4.184,

  // Density of water (kg/L)
  waterDensity: 1.0,

  /**
   * Calculate theoretical distillate yield rate from available thermal power
   * @param {number} thermalPowerWatts - Waste thermal power available (W)
   * @param {number} evapTempC - Evaporation chamber temperature (°C)
   * @param {number} feedTempC - Feedwater inlet temperature (°C)
   * @param {number} systemEfficiency - Thermal transfer & recovery factor (0.0 to 1.0)
   * @returns {object} Yield rates in mL/hr, L/day, and kg/s
   */
  calculateDistillateYield(thermalPowerWatts, evapTempC = 60, feedTempC = 25, systemEfficiency = 0.65) {
    if (thermalPowerWatts <= 0) {
      return { mlPerHour: 0, litersPerDay: 0, kgPerSecond: 0, effectivePowerW: 0 };
    }

    const effectivePowerKw = (thermalPowerWatts * systemEfficiency) / 1000.0; // kW
    const hfg = this.latentHeatOfVaporization(evapTempC); // kJ/kg
    const sensibleHeat = this.specificHeatCapacity * Math.max(0, evapTempC - feedTempC); // kJ/kg
    const totalEnergyPerKg = hfg + sensibleHeat; // kJ/kg needed

    const kgPerSecond = effectivePowerKw / totalEnergyPerKg;
    const kgPerHour = kgPerSecond * 3600;
    const litersPerHour = kgPerHour / this.waterDensity;
    const mlPerHour = litersPerHour * 1000;
    const litersPerDay = litersPerHour * 24;

    return {
      mlPerHour: Math.max(0, mlPerHour),
      litersPerDay: Math.max(0, litersPerDay),
      kgPerSecond: Math.max(0, kgPerSecond),
      effectivePowerKw: effectivePowerKw
    };
  },

  /**
   * Salt Rejection Percentage (TDS Purity)
   */
  calculateSaltRejection(feedTdsPpm, distillateTdsPpm) {
    if (!feedTdsPpm || feedTdsPpm <= 0) return 100;
    const rejection = ((feedTdsPpm - distillateTdsPpm) / feedTdsPpm) * 100;
    return Math.max(0, Math.min(99.99, rejection));
  },

  /**
   * Compare AquaSavers water recovery vs. Traditional Evaporative Data Center Cooling Tower
   * Conventional cooling towers consume roughly 1.8 to 2.5 Liters of fresh municipal drinking water
   * for every 1 kWh of IT compute heat rejected into the atmosphere!
   */
  compareWithConventionalCooling(computeKwh) {
    // 1 kWh = 3600 kJ
    const coolingTowerWaterConsumedLiters = computeKwh * 2.1; // Liters of municipal water wasted
    const aquaSaversWaterRecoveredLiters = (computeKwh * 0.75 * 3600) / (2400); // ~1.12 L recovered from non-potable feed
    const netWaterDeltaLiters = coolingTowerWaterConsumedLiters + aquaSaversWaterRecoveredLiters;

    return {
      coolingTowerWaterConsumedLiters,
      aquaSaversWaterRecoveredLiters,
      netWaterAdvantageLiters: netWaterDeltaLiters
    };
  },

  /**
   * Compute thermal gradient quality between heat source and condenser
   */
  calculateThermalDelta(tSource, tCondenser) {
    return Math.max(0, tSource - tCondenser);
  }
};

window.AquaPhysics = AquaPhysics;

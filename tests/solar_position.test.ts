import { describe, it, expect } from 'vitest';
import {
  calculateSolarPosition,
  getSolarNoonWIB,
  calculateEquationOfTimeMinutes,
  YOGYAKARTA_LATITUDE,
  YOGYAKARTA_LONGITUDE,
} from '../src/core/math/SolarPosition';

describe('SolarPosition - Equation of Time & Longitude Correction for Yogyakarta WIB', () => {
  it('correctly calculates Equation of Time throughout the year within physical bounds (-15 to +17 minutes)', () => {
    for (let day = 1; day <= 365; day += 5) {
      const eot = calculateEquationOfTimeMinutes(day);
      expect(eot).toBeGreaterThanOrEqual(-15);
      expect(eot).toBeLessThanOrEqual(17);
    }
  });

  it('guarantees solar noon in Yogyakarta falls strictly between 11:20 and 11:55 WIB throughout the entire year', () => {
    let minNoonWIB = Infinity;
    let maxNoonWIB = -Infinity;

    for (let day = 1; day <= 365; day++) {
      const noonWIB = getSolarNoonWIB(day, YOGYAKARTA_LONGITUDE);
      if (noonWIB < minNoonWIB) minNoonWIB = noonWIB;
      if (noonWIB > maxNoonWIB) maxNoonWIB = noonWIB;

      // 11:20 WIB = 11 + 20/60 = 11.333
      // 11:55 WIB = 11 + 55/60 = 11.916
      expect(noonWIB).toBeGreaterThanOrEqual(11 + 20 / 60);
      expect(noonWIB).toBeLessThanOrEqual(11 + 55 / 60);
    }

    // Solar noon should average around 11:38 WIB (since Yogyakarta is at 110.37° E vs 105° E central meridian)
    const averageNoonWIB = (minNoonWIB + maxNoonWIB) / 2;
    expect(averageNoonWIB).toBeCloseTo(11 + 38 / 60, 1);
  });

  it('calculates highest solar elevation at solar noon', () => {
    const day = 172; // June solstice
    const noonWIB = getSolarNoonWIB(day, YOGYAKARTA_LONGITUDE);

    const posAtNoon = calculateSolarPosition(noonWIB, day);
    const posAt9AM = calculateSolarPosition(9.0, day);
    const posAt3PM = calculateSolarPosition(15.0, day);

    expect(posAtNoon.altitudeDegrees).toBeGreaterThan(posAt9AM.altitudeDegrees);
    expect(posAtNoon.altitudeDegrees).toBeGreaterThan(posAt3PM.altitudeDegrees);
    expect(posAtNoon.isDaylight).toBe(true);
    expect(posAtNoon.intensity).toBeGreaterThan(0.9);
  });

  it('correctly flags night time as no daylight', () => {
    const posMidnight = calculateSolarPosition(0.0, 172);
    expect(posMidnight.isDaylight).toBe(false);
    expect(posMidnight.intensity).toBe(0);

    const pos2AM = calculateSolarPosition(2.0, 172);
    expect(pos2AM.isDaylight).toBe(false);
    expect(pos2AM.intensity).toBe(0);
  });
});

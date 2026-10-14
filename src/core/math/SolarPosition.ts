import * as THREE from 'three';

/**
 * Solar position calculator for Yogyakarta, Indonesia
 * Coordinates: Latitude 7.8° S (-7.8), Longitude 110.37° E
 * Time Zone: WIB (UTC+7, Central Meridian 105° E)
 *
 * Implements:
 * - Equation of Time (EoT) calculation across 365 days
 * - Longitude correction (+21.48 minutes for Yogyakarta 110.37° E vs 105° E)
 * - Accurate True Solar Time (LST) from clock time (WIB)
 * - Zenith and azimuth directional vectors for Three.js lighting
 */
export interface SolarCoordinates {
  altitude: number; // in radians (-PI/2 to PI/2)
  azimuth: number;  // in radians (0 to 2PI, 0 = North, PI/2 = East, PI = South, 3PI/2 = West)
  altitudeDegrees: number;
  azimuthDegrees: number;
  direction: THREE.Vector3; // Normalized vector pointing to the sun
  isDaylight: boolean;
  intensity: number; // 0 (night) to 1.0 (zenith solar brightness)
  solarTimeHours: number; // True solar time in decimal hours
  solarNoonWIBHours: number; // Time of solar noon in WIB
}

export const YOGYAKARTA_LATITUDE = -7.8; // degrees
export const YOGYAKARTA_LONGITUDE = 110.37; // degrees
export const WIB_CENTRAL_MERIDIAN = 105.0; // degrees (UTC+7)

/**
 * Equation of Time (EoT) in minutes using standard Spencer approximation.
 * Accounts for Earth's orbital eccentricity and axial tilt.
 */
export function calculateEquationOfTimeMinutes(dayOfYear: number): number {
  // B in radians: day 81 is approx vernal equinox
  const B = ((360 / 365) * (dayOfYear - 81) * Math.PI) / 180;
  // Spencer's empirical formula in minutes:
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * Calculate the exact clock time (WIB) when the sun reaches highest elevation (solar noon)
 * for a given day of the year.
 * Returns decimal hours (e.g. 11.63 = 11:38 WIB).
 */
export function getSolarNoonWIB(dayOfYear: number, longitude: number = YOGYAKARTA_LONGITUDE): number {
  const eotMin = calculateEquationOfTimeMinutes(dayOfYear);
  // 4 minutes per degree longitude difference
  const longitudeCorrectionMin = 4 * (longitude - WIB_CENTRAL_MERIDIAN);
  const totalOffsetMin = longitudeCorrectionMin + eotMin;
  return 12.0 - totalOffsetMin / 60;
}

/**
 * Convert clock time (WIB) to True Local Solar Time (LST)
 */
export function wibToSolarTime(
  wibHour: number,
  dayOfYear: number = 172,
  longitude: number = YOGYAKARTA_LONGITUDE
): number {
  const eotMin = calculateEquationOfTimeMinutes(dayOfYear);
  const longitudeCorrectionMin = 4 * (longitude - WIB_CENTRAL_MERIDIAN);
  const totalOffsetHours = (longitudeCorrectionMin + eotMin) / 60;
  let solarTime = wibHour + totalOffsetHours;

  // Wrap within [0, 24)
  while (solarTime < 0) solarTime += 24;
  while (solarTime >= 24) solarTime -= 24;
  return solarTime;
}

export function calculateSolarPosition(
  wibHour: number, // 0 to 24 WIB clock time
  dayOfYear: number = 172, // Default June solstice (~dry tropical season)
  latitude: number = YOGYAKARTA_LATITUDE,
  longitude: number = YOGYAKARTA_LONGITUDE
): SolarCoordinates {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const latRad = latitude * rad;

  // Calculate True Solar Time
  const solarTimeHours = wibToSolarTime(wibHour, dayOfYear, longitude);
  const solarNoonWIB = getSolarNoonWIB(dayOfYear, longitude);

  // Approximate solar declination delta (Cooper's formula)
  const declination = 23.45 * Math.sin(rad * ((360 / 365) * (284 + dayOfYear))) * rad;

  // Solar hour angle H (15 degrees per hour, 0 at true solar noon)
  const hourAngle = (solarTimeHours - 12) * 15 * rad;

  // Solar altitude (elevation above horizon)
  const sinAltitude =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);

  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

  // Solar azimuth (angle from true North)
  const cosAltitude = Math.cos(altitude);
  let azimuth: number;

  if (Math.abs(cosAltitude) < 0.0001) {
    azimuth = 0;
  } else {
    const cosAzimuth =
      (Math.sin(altitude) * Math.sin(latRad) - Math.sin(declination)) /
      (cosAltitude * Math.cos(latRad));
    const clampedCos = Math.max(-1, Math.min(1, cosAzimuth));
    const rawAzimuth = Math.acos(clampedCos);

    // Morning (solarTimeHours < 12) = Sun is East, afternoon = Sun is West
    if (Math.sin(hourAngle) > 0) {
      azimuth = 2 * Math.PI - rawAzimuth;
    } else {
      azimuth = rawAzimuth;
    }
  }

  // 3D vector pointing from origin towards the sun:
  // Three.js coordinates: Y is UP, Z is SOUTH (positive Z), X is EAST (positive X)
  const dirX = Math.sin(azimuth) * cosAltitude;
  const dirY = Math.sin(altitude);
  const dirZ = -Math.cos(azimuth) * cosAltitude;

  const direction = new THREE.Vector3(dirX, Math.max(0.01, dirY), dirZ).normalize();

  const isDaylight = altitude > 0.02; // Sun is above horizon
  // Intensity factor based on atmospheric angle
  const intensity = isDaylight ? Math.min(1, Math.sin(altitude) * 1.2) : 0;

  return {
    altitude,
    azimuth,
    altitudeDegrees: altitude * deg,
    azimuthDegrees: azimuth * deg,
    direction,
    isDaylight,
    intensity,
    solarTimeHours,
    solarNoonWIBHours: solarNoonWIB,
  };
}

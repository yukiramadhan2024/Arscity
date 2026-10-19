import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { calculateSolarPosition } from '../core/math/SolarPosition';

export interface FacadeHeatData {
  buildingId: string;
  northScore: number; // 0 (cold/shaded) to 100 (intense heat)
  southScore: number;
  eastScore: number;  // Typically hot in morning tropics
  westScore: number;  // Typically very hot in afternoon tropics
  overallComfortScore: number; // 0 to 100
  shadowLengthMeters: number;
  shadowDirection: THREE.Vector3;
  recommendations: string[];
}

export interface DaylightAutonomyReport {
  buildingId: string;
  daylightAutonomyScore: number; // 0 to 100%
  status: 'optimal' | 'adequate' | 'insufficient';
  statusLabel: string;
  depthToHeightRatio: number;
  hasCourtyard: boolean;
  hasSkylightOrSawtooth: boolean;
  coreDaylightSufficiency: number; // %
  recommendations: string[];
}

export type DaylightEvaluation = DaylightAutonomyReport;

export interface RooftopSolarEstimate {
  buildingId: string;
  effectiveRoofAreaM2: number;
  installedCapacityKwp: number;
  annualGenerationKwh: number;
  annualElectricitySavingsIdr: number;
  tenYearSavingsIdr: number;
  installationCapexIdr: number;
  paybackPeriodYears: number;
  co2ReductionTonsPerYear: number;
}

export class SolarAnalyzer {
  private buildingManager: BuildingManager;
  private scene: THREE.Scene;
  public isHeatmapActive: boolean = false;
  private heatmapOverlayGroup: THREE.Group;

  constructor(buildingManager: BuildingManager, scene: THREE.Scene) {
    this.buildingManager = buildingManager;
    this.scene = scene;
    this.heatmapOverlayGroup = new THREE.Group();
    this.heatmapOverlayGroup.name = 'SolarHeatmapGroup';
    scene.add(this.heatmapOverlayGroup);
  }

  public analyzeBuilding(
    buildingId: string,
    currentHour: number = 14.0,
    dayOfYear: number = 172
  ): FacadeHeatData | null {
    const bld = this.buildingManager.buildings.get(buildingId);
    if (!bld) return null;

    const coords = calculateSolarPosition(currentHour, dayOfYear);
    const bldHeight = bld.floorCount * (bld.floorHeight || 3.2);

    // Ground shadow vector (horizontal projection opposite to sun direction)
    const horizSun = new THREE.Vector3(coords.direction.x, 0, coords.direction.z);
    const horizLen = horizSun.length();
    const shadowDirection = horizLen > 0.001
      ? new THREE.Vector3(-horizSun.x / horizLen, 0, -horizSun.z / horizLen)
      : new THREE.Vector3(0, 0, 0);

    const shadowLengthMeters = (coords.isDaylight && coords.altitude > 0.05)
      ? Math.min(200, bldHeight / Math.tan(coords.altitude))
      : 0;

    // Physical solar radiation per facade based on orientation dot product
    const rot = bld.rotationY;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    // World normals for East, West, North, South faces of rotated building
    const normalEast = new THREE.Vector3(cosR, 0, -sinR);
    const normalWest = new THREE.Vector3(-cosR, 0, sinR);
    const normalNorth = new THREE.Vector3(sinR, 0, cosR);
    const normalSouth = new THREE.Vector3(-sinR, 0, -cosR);

    const calcFaceHeat = (normal: THREE.Vector3): number => {
      if (!coords.isDaylight) return 0;
      const dot = Math.max(0, normal.dot(coords.direction));
      return Math.round(dot * coords.intensity * 100);
    };

    let eastHeat = calcFaceHeat(normalEast);
    let westHeat = calcFaceHeat(normalWest);
    let northHeat = calcFaceHeat(normalNorth);
    let southHeat = calcFaceHeat(normalSouth);

    // Overhang protection factor (wider overhang shelters high solar angles)
    const overhang = bld.roofOverhang || 0.8;
    const protectionFactor = Math.max(0.55, 1.0 - overhang * 0.28);

    eastHeat = Math.round(eastHeat * protectionFactor);
    westHeat = Math.round(westHeat * protectionFactor);
    northHeat = Math.round(northHeat * protectionFactor);
    southHeat = Math.round(southHeat * protectionFactor);

    const avgHeat = (eastHeat + westHeat + northHeat + southHeat) / 4;
    const comfortScore = Math.max(10, Math.round(100 - avgHeat * 0.75));

    const recommendations: string[] = [];
    if (westHeat > 55) {
      recommendations.push(
        'Fasad Barat menerima radiasi surya sore tinggi. Tambahkan teritis atap (≥1.2 m), sun louvers, atau vegetasi peneduh di sisi barat.'
      );
    }
    if (eastHeat > 55) {
      recommendations.push(
        'Fasad Timur terpapar radiasi pagi. Gunakan kaca low-e atau tirai jalusi horizontal.'
      );
    }
    if (overhang < 1.0) {
      recommendations.push(
        'Teritis atap saat ini (< 1.0 m) kurang melindungi dinding dari terpaan tampias hujan tropis dan radiasi langsung.'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Orientasi fasad dan teritis atap sudah ideal untuk iklim tropis lembap Yogyakarta!'
      );
    }

    return {
      buildingId,
      northScore: northHeat,
      southScore: southHeat,
      eastScore: eastHeat,
      westScore: westHeat,
      overallComfortScore: comfortScore,
      shadowLengthMeters,
      shadowDirection,
      recommendations
    };
  }

  public setHeatmapVisible(
    visible: boolean,
    currentHour: number = 14.0,
    dayOfYear: number = 172
  ): void {
    this.isHeatmapActive = visible;

    // Dispose old overlay children
    while (this.heatmapOverlayGroup.children.length > 0) {
      const child = this.heatmapOverlayGroup.children[0];
      this.heatmapOverlayGroup.remove(child);
      child.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }

    if (!visible) return;

    // 1. Build 3D Sun-Path Arc around focal center
    let focalCenter = new THREE.Vector3(0, 0, 0);
    const selBld = this.buildingManager.getSelectedBuilding();
    if (selBld) {
      focalCenter.copy(selBld.position);
    } else if (this.buildingManager.buildings.size > 0) {
      let count = 0;
      for (const bld of this.buildingManager.buildings.values()) {
        focalCenter.add(bld.position);
        count++;
      }
      if (count > 0) focalCenter.divideScalar(count);
    }
    this.buildSunPathArc(focalCenter, currentHour, dayOfYear);

    // 2. Build Facade Heat Indicators & Real Shadow Direction
    for (const bld of this.buildingManager.buildings.values()) {
      const data = this.analyzeBuilding(bld.id, currentHour, dayOfYear);
      if (!data) continue;

      const group = new THREE.Group();
      group.position.copy(bld.position);

      const w = bld.width;
      const l = bld.length;
      const h = bld.floorCount * (bld.floorHeight || 3.2);

      // Color maps: Green (#34C759) -> Amber (#FF9500) -> Red (#FF3B30)
      const getHeatColor = (score: number): number => {
        if (score > 60) return 0xff3b30; // Red hot
        if (score > 30) return 0xff9500; // Amber warm
        return 0x34c759;                // Green comfortable
      };

      // 1. Facade Heat Indicators
      const subGroup = new THREE.Group();
      subGroup.rotation.y = bld.rotationY;

      // West face plate
      const westMat = new THREE.MeshBasicMaterial({
        color: getHeatColor(data.westScore),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const westPlane = new THREE.Mesh(new THREE.PlaneGeometry(l, h), westMat);
      westPlane.position.set(w * 0.5 + 0.1, h * 0.5 + 0.35, 0);
      westPlane.rotation.y = Math.PI * 0.5;
      subGroup.add(westPlane);

      // East face plate
      const eastMat = new THREE.MeshBasicMaterial({
        color: getHeatColor(data.eastScore),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const eastPlane = new THREE.Mesh(new THREE.PlaneGeometry(l, h), eastMat);
      eastPlane.position.set(-w * 0.5 - 0.1, h * 0.5 + 0.35, 0);
      eastPlane.rotation.y = -Math.PI * 0.5;
      subGroup.add(eastPlane);

      group.add(subGroup);

      // 2. Real Astronomical Shadow Direction Arrow
      if (data.shadowLengthMeters > 0.5) {
        const arrow = new THREE.ArrowHelper(
          data.shadowDirection,
          new THREE.Vector3(0, 0.15, 0),
          Math.min(30, data.shadowLengthMeters),
          0x1c1c1e, // Deep shadow ink
          Math.min(2.5, data.shadowLengthMeters * 0.25),
          Math.min(1.2, data.shadowLengthMeters * 0.15)
        );
        group.add(arrow);
      }

      this.heatmapOverlayGroup.add(group);
    }
  }

  /**
   * Constructs a 3D Sun-Path Arc around the focal point.
   * Renders the true daylight trajectory of the sun across the sky with dashed line,
   * solar elevation arc, ground orientation compass ring, and active sun disc position.
   */
  private buildSunPathArc(center: THREE.Vector3, currentHour: number, dayOfYear: number): void {
    const R = 35; // Radius of local celestial hemisphere
    const daylightPoints: THREE.Vector3[] = [];
    let activeSunPos: THREE.Vector3 | null = null;

    // Sample hours from 05:00 to 19:00 with 0.2h granularity
    for (let h = 5.0; h <= 19.0; h += 0.2) {
      const coords = calculateSolarPosition(h, dayOfYear);
      if (coords.isDaylight && coords.altitude > 0) {
        const pt = new THREE.Vector3(
          center.x + coords.direction.x * R,
          center.y + Math.max(0.2, coords.direction.y * R),
          center.z + coords.direction.z * R
        );
        daylightPoints.push(pt);

        if (Math.abs(h - currentHour) < 0.25 && !activeSunPos) {
          activeSunPos = pt.clone();
        }
      }
    }

    if (daylightPoints.length >= 2) {
      // 1. Dashed Sun-Path Arc
      const arcGeom = new THREE.BufferGeometry().setFromPoints(daylightPoints);
      const arcMat = new THREE.LineDashedMaterial({
        color: 0xffaa00,
        dashSize: 1.5,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });
      const arcLine = new THREE.Line(arcGeom, arcMat);
      arcLine.computeLineDistances();
      this.heatmapOverlayGroup.add(arcLine);

      // 2. Active Sun Disc on Arc
      if (activeSunPos) {
        const sunMarkerGeom = new THREE.SphereGeometry(1.4, 16, 16);
        const sunMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const sunMesh = new THREE.Mesh(sunMarkerGeom, sunMarkerMat);
        sunMesh.position.copy(activeSunPos);
        this.heatmapOverlayGroup.add(sunMesh);

        // Ray line from sun to ground center
        const rayGeom = new THREE.BufferGeometry().setFromPoints([activeSunPos, center]);
        const rayMat = new THREE.LineBasicMaterial({
          color: 0xffdd44,
          transparent: true,
          opacity: 0.45,
          depthWrite: false
        });
        const rayLine = new THREE.Line(rayGeom, rayMat);
        this.heatmapOverlayGroup.add(rayLine);
      }
    }

    // 3. Ground Orientation Compass Ring
    const compassGeom = new THREE.RingGeometry(R - 0.5, R + 0.5, 64);
    compassGeom.rotateX(-Math.PI / 2);
    const compassMat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const compassMesh = new THREE.Mesh(compassGeom, compassMat);
    compassMesh.position.set(center.x, 0.08, center.z);
    this.heatmapOverlayGroup.add(compassMesh);
  }

  /**
   * Evaluates indoor natural daylight sufficiency and autonomy according to SNI 03-2396-2001.
   */
  public static evaluateDaylightAutonomy(bld: BuildingInstance): DaylightAutonomyReport {
    const depth = Math.min(bld.width, bld.length);
    const floorHeight = bld.floorHeight || 3.2;
    const depthToHeightRatio = Math.round((depth / floorHeight) * 10) / 10;

    const hasCourtyard = Boolean(
      bld.presetKey?.includes('courtyard') ||
      bld.presetKey === 'courtyard_block' ||
      bld.name.toLowerCase().includes('courtyard')
    );
    const hasSkylightOrSawtooth = bld.roofType === 'sawtooth' || bld.roofType === 'shed_industrial';

    // Daylight penetration depth is ~2.5x window/ceiling height from each facade
    const maxNaturalPenetrationM = floorHeight * 2.5;
    const coreDarkZoneDepthM = Math.max(0, depth - maxNaturalPenetrationM * 2.0);

    let score = 100 - Math.min(70, coreDarkZoneDepthM * 5.0);

    if (hasCourtyard) score += 25;
    if (hasSkylightOrSawtooth) score += 20;
    if (floorHeight >= 3.5) score += 8;

    const daylightAutonomyScore = Math.max(15, Math.min(100, Math.round(score)));

    let status: DaylightAutonomyReport['status'] = 'optimal';
    let statusLabel = 'Optimal (Terang Alami)';
    if (daylightAutonomyScore < 55) {
      status = 'insufficient';
      statusLabel = 'Kurang (Ruang Tengah Gelap)';
    } else if (daylightAutonomyScore < 75) {
      status = 'adequate';
      statusLabel = 'Cukup / Standar';
    }

    const coreDaylightSufficiency = Math.max(
      10,
      Math.min(100, Math.round(100 - coreDarkZoneDepthM * 6.5 + (hasCourtyard ? 30 : 0)))
    );

    const recommendations: string[] = [];
    if (status === 'insufficient') {
      recommendations.push(
        `Ketebalan bangunan (${depth} m) terlalu masif tanpa sumur cahaya. Ruangan tengah membutuhkan lampu listrik terus-menerus di siang hari (SNI 03-2396).`
      );
      recommendations.push(
        'Rekomendasi Desain: Tambahkan inner courtyard (taman dalam), void cahaya (lightwell), atau gunakan atap gergaji (sawtooth roof).'
      );
    } else if (status === 'adequate') {
      recommendations.push(
        'Pencahayaan alami cukup baik pada zona perimeter 6-8 meter, namun perhatikan ventilasi dan bukaan pada koridor tengah.'
      );
    }
    if (floorHeight < 3.0) {
      recommendations.push(
        'Tinggi plafon (< 3.0 m) membatasi sudut penetrasi cahaya langit alami ke dalam ruangan.'
      );
    }

    return {
      buildingId: bld.id,
      daylightAutonomyScore,
      status,
      statusLabel,
      depthToHeightRatio,
      hasCourtyard,
      hasSkylightOrSawtooth,
      coreDaylightSufficiency,
      recommendations
    };
  }

  public evaluateDaylightAutonomy(bld: BuildingInstance): DaylightAutonomyReport {
    return SolarAnalyzer.evaluateDaylightAutonomy(bld);
  }

  /**
   * Calculates rooftop solar photovoltaic (PV) generation potential, kWp, and OPEX savings.
   * Grounded in Yogyakarta solar irradiance (~4.8 kWh/m²/day).
   */
  public static estimateRooftopSolar(bld: BuildingInstance): RooftopSolarEstimate {
    const footprintArea = bld.width * bld.length;
    // Usable roof area after setbacks, gutters, and maintenance corridors (~65%)
    const effectiveRoofAreaM2 = Math.round(footprintArea * 0.65 * 10) / 10;

    // Commercial PV density: ~6.0 m² per 1.0 kWp
    const installedCapacityKwp = Math.round((effectiveRoofAreaM2 / 6.0) * 10) / 10;

    // Yogyakarta solar yield: ~1,400 kWh/kWp/year (Performance Ratio = 0.80)
    const annualGenerationKwh = Math.round(installedCapacityKwp * 1400);

    // PLN Tariff R1 savings: Rp 1,500 per kWh
    const annualElectricitySavingsIdr = annualGenerationKwh * 1500;
    const tenYearSavingsIdr = annualElectricitySavingsIdr * 10;

    // Solar PV system installation CAPEX: ~Rp 13,500,000 per kWp (all-in inverter & racking)
    const installationCapexIdr = Math.round(installedCapacityKwp * 13_500_000);
    const paybackPeriodYears = annualElectricitySavingsIdr > 0
      ? Math.round((installationCapexIdr / annualElectricitySavingsIdr) * 10) / 10
      : 0;

    // CO2 emission factor for Java-Bali grid: 0.85 kg CO2 / kWh
    const co2ReductionTonsPerYear = Math.round(((annualGenerationKwh * 0.85) / 1000) * 10) / 10;

    return {
      buildingId: bld.id,
      effectiveRoofAreaM2,
      installedCapacityKwp,
      annualGenerationKwh,
      annualElectricitySavingsIdr,
      tenYearSavingsIdr,
      installationCapexIdr,
      paybackPeriodYears,
      co2ReductionTonsPerYear
    };
  }

  public estimateRooftopSolar(bld: BuildingInstance): RooftopSolarEstimate {
    return SolarAnalyzer.estimateRooftopSolar(bld);
  }

  public dispose(): void {
    this.setHeatmapVisible(false);
    this.scene.remove(this.heatmapOverlayGroup);
  }
}

export const solarAnalyzer = {
  evaluateDaylightAutonomy: SolarAnalyzer.evaluateDaylightAutonomy,
  estimateRooftopSolar: SolarAnalyzer.estimateRooftopSolar
};

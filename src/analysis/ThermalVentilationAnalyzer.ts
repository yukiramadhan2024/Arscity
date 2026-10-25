import * as THREE from 'three';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import type { LotManager } from '../zones/LotManager';
import { BuildingCatalogRegistry } from '../buildings/BuildingCatalogRegistry';
import { advancedBuildingCodeRegistry } from '../zones/AdvancedBuildingCode';
import { InteriorInteractiveSystem } from '../buildings/InteriorInteractiveSystem';

export interface ThermalComfortReport {
  buildingId: string;
  hasCrossVentilation: boolean;
  overhangMeters: number;
  hasShadeTreesNearby: boolean;
  outdoorTempC: number;
  indoorEstimatedTempC: number;
  comfortRating: 'Sangat Nyaman' | 'Cukup Nyaman' | 'Kurang Nyaman' | 'Panas / Perlu AC' | 'Nyaman Alami' | 'Hangat';
  acPowerKw: number;
  monthlyAcCostIdr: number;
  formattedMonthlyAcCost: string;
  recommendations: string[];
  // Cellular Automata Neighborhood Diffusion (Radius 25m)
  neighborhoodCoolingC: number;
  neighborhoodHeatIslandC: number;
  neighborhoodRunoffSurplusM3Hr: number;
  neighborhoodWaterAbsorptionAidM3Hr: number;
  riverCoolingBonusC?: number;
  // Unified Ventilation Metrics
  crossVentilationScore: number;
  windSpeedMps: number;
  airChangePerHour: number;
  statusText: string;
  advice: string;
}

export type VentilationData = ThermalComfortReport;

export interface CityThermalVentilationSummary {
  totalBuildings: number;
  crossVentilatedCount: number;
  crossVentilationRatioPercent: number;
  averageIndoorTempC: number;
  outdoorBaselineTempC: number;
  totalMonthlyAcSavingsIdr: number;
  formattedTotalSavings: string;
}

export class ThermalVentilationAnalyzer {
  protected buildingManager: BuildingManager;
  protected landscapeManager: LandscapeManager;
  protected scene: THREE.Scene;
  public lotManager?: LotManager;

  public isActive: boolean = false;
  public isWindActive: boolean = false;
  protected visualGroup: THREE.Group;

  private windArrowsGroup: THREE.Group;
  private arrowPositions: Float32Array | null = null;
  private arrowGeometry: THREE.BufferGeometry | null = null;
  private arrowCount: number = 200;

  constructor(
    buildingManager: BuildingManager,
    param2?: LandscapeManager | THREE.Scene,
    param3?: THREE.Scene | LandscapeManager,
    lotManager?: LotManager
  ) {
    this.buildingManager = buildingManager;
    if (param2 instanceof THREE.Scene) {
      this.scene = param2;
      this.landscapeManager = (param3 as LandscapeManager) || new LandscapeManager(this.scene);
    } else {
      this.landscapeManager = (param2 as LandscapeManager) || new LandscapeManager(param3 instanceof THREE.Scene ? param3 : new THREE.Scene());
      this.scene = (param3 instanceof THREE.Scene ? param3 : (param2 as any)?.scene) || new THREE.Scene();
    }
    this.lotManager = lotManager;

    this.visualGroup = new THREE.Group();
    this.visualGroup.name = 'ThermalVentilationVisualGroup';
    this.scene.add(this.visualGroup);

    this.windArrowsGroup = new THREE.Group();
    this.windArrowsGroup.name = 'VentilationWindGroup';
    this.scene.add(this.windArrowsGroup);
  }

  public setLotManager(lotManager: LotManager): void {
    this.lotManager = lotManager;
  }

  public analyzeBuilding(buildingId: string): ThermalComfortReport | null {
    const bld = this.buildingManager.buildings.get(buildingId);
    if (!bld) return null;

    // 1. Cross-ventilation evaluation
    let hasCrossVentilation = false;
    if (bld.floors && bld.floors.length > 0) {
      const sidesWithOpenings = new Set<number>();
      for (const floor of bld.floors) {
        if (floor.walls) {
          for (let i = 0; i < floor.walls.length; i++) {
            const w = floor.walls[i];
            if (w.openings && w.openings.length > 0) {
              const hasOpening = w.openings.some(op => 
                op.type.startsWith('window') || op.type.startsWith('door') || op.type === 'balcony'
              );
              if (hasOpening) {
                sidesWithOpenings.add(i % 4);
              }
            }
          }
        }
      }
      hasCrossVentilation = sidesWithOpenings.size >= 2;
    } else {
      const catalogItem = bld.presetKey ? BuildingCatalogRegistry.getBuilding(bld.presetKey) : undefined;
      if (catalogItem) {
        hasCrossVentilation = catalogItem.hasCrossVentilation;
      } else {
        const crossVentilatedPresets = [
          'joglo',
          'limasan',
          'house_36',
          'house_54',
          'villa_2fl',
          'community_hall',
          'school'
        ];
        hasCrossVentilation = crossVentilatedPresets.includes(bld.presetKey || '');
      }
    }

    // 2. Overhang evaluation
    const overhangMeters = bld.roofOverhang ?? (bld.presetKey ? BuildingCatalogRegistry.getBuilding(bld.presetKey)?.defaultOverhang : undefined) ?? 1.2;

    // 3. Proximity of shade trees & Neighborhood Diffusion within 25m radius
    let hasShadeTreesNearby = false;
    let neighborCoolingAssets = 0;
    let specificAestheticCoolingC = 0.0;
    if (this.landscapeManager && this.landscapeManager.items) {
      for (const item of this.landscapeManager.items.values()) {
        const isTree = item.type === 'shade_tree' || item.type.startsWith('tree_');
        const dist = item.position.distanceTo(bld.position);
        if (isTree) {
          if (dist <= 18.0) {
            hasShadeTreesNearby = true;
          } else if (dist <= 25.0) {
            neighborCoolingAssets++;
          }
        }

        // Microclimate specific cooling within 25m:
        if (dist <= 25.0) {
          if (item.type === 'tree_tabebuya_pink' || item.type === 'tree_tabebuya_gold') {
            specificAestheticCoolingC = Math.max(specificAestheticCoolingC, 2.0);
          } else if (item.type === 'tree_flamboyan') {
            specificAestheticCoolingC = Math.max(specificAestheticCoolingC, 2.4);
          } else if (item.type === 'tree_banyan_kurung') {
            specificAestheticCoolingC = Math.max(specificAestheticCoolingC, 3.2);
          } else if (item.type === 'fountain_reflecting_pool' || item.type === 'flora_lotus_water') {
            specificAestheticCoolingC = Math.max(specificAestheticCoolingC, 2.5);
          } else if (item.type === 'tree_asam_jawa') {
            specificAestheticCoolingC = Math.max(specificAestheticCoolingC, 2.8);
          } else if (item.type === 'street_timber_pergola') {
            specificAestheticCoolingC = Math.max(specificAestheticCoolingC, 1.5);
          }
        }
      }
    }

    // Cellular Automata: Neighborhood Lot Thermal & Hydrological Diffusion
    let neighborhoodCoolingC = 0.0;
    let neighborhoodHeatIslandC = 0.0;
    let neighborhoodRunoffSurplusM3Hr = 0.0;
    let neighborhoodWaterAbsorptionAidM3Hr = 0.0;

    if (this.lotManager && this.lotManager.lots) {
      for (const lot of this.lotManager.lots.values()) {
        const dist = lot.position.distanceTo(bld.position);
        if (dist <= 25.0 && dist > 1.0) {
          const kdh = lot.metrics?.kdhPercent ?? ((lot as any).kdhMin !== undefined ? (lot as any).kdhMin * 100 : 0);
          const kdb = lot.metrics?.kdbPercent ?? ((lot as any).kdbMax !== undefined ? (lot as any).kdbMax * 100 : 0);

          if (kdh >= 30) {
            neighborhoodCoolingC += 0.6;
            neighborhoodWaterAbsorptionAidM3Hr += 0.3;
          }
          if (kdb > 75 && kdh < 15) {
            neighborhoodHeatIslandC += 0.8;
            neighborhoodRunoffSurplusM3Hr += 0.4;
          }
        }
      }
    }

    neighborhoodCoolingC += Math.min(1.5, neighborCoolingAssets * 0.5);
    neighborhoodCoolingC = Math.min(3.0, Math.round(neighborhoodCoolingC * 10) / 10);
    neighborhoodHeatIslandC = Math.min(2.0, Math.round(neighborhoodHeatIslandC * 10) / 10);
    neighborhoodRunoffSurplusM3Hr = Math.round(neighborhoodRunoffSurplusM3Hr * 10) / 10;
    neighborhoodWaterAbsorptionAidM3Hr = Math.round(neighborhoodWaterAbsorptionAidM3Hr * 10) / 10;

    // 4. Indoor Temperature Estimation (Yogyakarta tropical afternoon baseline = 32.5°C)
    const outdoorTempC = 32.5;
    const doorOpenRatio = InteriorInteractiveSystem.getInstance().getBuildingDoorOpenFactor(bld.id);
    const doorVentBonus = doorOpenRatio * 0.8; // Up to -0.8°C cooling breeze from physical door aperture
    const ventBenefit = (hasCrossVentilation ? 2.4 : 0.0) + doorVentBonus;
    const overhangBenefit = overhangMeters >= 1.2 ? 1.6 : overhangMeters < 0.8 ? -1.0 : 0.5;
    const treeBenefit = Math.max(hasShadeTreesNearby ? 1.8 : 0.0, specificAestheticCoolingC);

    const riverBenefits = advancedBuildingCodeRegistry.checkRiverBufferBenefits(bld, this.landscapeManager);
    const riverCoolingBonus = riverBenefits.hasShadeTrees ? Math.abs(riverBenefits.microclimateBonusC) : 0.0;

    let indoorEstimatedTempC =
      outdoorTempC -
      ventBenefit -
      overhangBenefit -
      treeBenefit -
      riverCoolingBonus +
      neighborhoodHeatIslandC -
      neighborhoodCoolingC;
    indoorEstimatedTempC = Math.round(indoorEstimatedTempC * 10) / 10;

    let comfortRating: ThermalComfortReport['comfortRating'];
    if (indoorEstimatedTempC <= 27.0) {
      comfortRating = 'Sangat Nyaman';
    } else if (indoorEstimatedTempC <= 28.5) {
      comfortRating = 'Cukup Nyaman';
    } else if (indoorEstimatedTempC <= 30.5) {
      comfortRating = 'Kurang Nyaman';
    } else {
      comfortRating = 'Panas / Perlu AC';
    }

    // 5. Monthly AC Electricity Cost Calculation
    const totalFloorArea = BuildingManager.getBuildingTotalFloorArea(bld);
    let acPowerKw = 0;
    let monthlyAcCostIdr = 0;

    if (indoorEstimatedTempC > 27.0) {
      const deltaT = indoorEstimatedTempC - 24.0;
      acPowerKw = Math.max(0.4, (totalFloorArea * 0.075 * (deltaT / 3.0)));
      monthlyAcCostIdr = Math.round(acPowerKw * 10 * 30 * 1500);
    }

    const formattedMonthlyAcCost = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(monthlyAcCostIdr);

    // 6. Cross-ventilation score & Air changes per hour
    const minDim = Math.min(bld.width, bld.length);
    let score = hasCrossVentilation ? 85 : 45;
    if (minDim <= 8) score += 10;
    else if (minDim >= 18) score -= 15;
    if (bld.presetKey === 'joglo' || bld.presetKey === 'community_hall') {
      score = Math.min(98, score + 10);
    }
    score = Math.max(20, Math.min(98, score));
    const windSpeedMps = 2.4;
    const airChangePerHour = parseFloat((score * 0.15).toFixed(1));
    const statusText = hasCrossVentilation ? 'Ventilasi Silang Efektif (SNI 03-6572)' : 'Ventilasi Silang Terbatas';

    // 7. Practical Educational Recommendations
    const recommendations: string[] = [];
    if (!hasCrossVentilation) {
      recommendations.push(
        'Tambahkan jendela/jalusi di sisi dinding berseberangan agar terjadi aliran udara silang (cross-ventilation).'
      );
    }
    if (overhangMeters < 1.0) {
      recommendations.push(
        'Perlebar teritisan atap menjadi minimal 1.2 m untuk menaungi dinding dari radiasi panas matahari siang/sore.'
      );
    }
    if (!hasShadeTreesNearby) {
      recommendations.push(
        'Tanam pohon peneduh (misal Trembesi) di halaman kavling untuk menciptakan iklim mikro sejuk melalui transpirasi.'
      );
    }
    if (neighborhoodHeatIslandC > 0) {
      recommendations.push(
        'Kawasan sekitar memancarkan efek pulau panas (Urban Heat Island). Tanam vegetasi peneduh di perimeter kavling.'
      );
    }
    if (neighborhoodRunoffSurplusM3Hr > 0) {
      recommendations.push(
        'Kavling tetangga melimpahkan air limpasan hujan. Buat sumur resapan atau biopori penangkap limpasan.'
      );
    }

    const advice = recommendations.length > 0
      ? recommendations[0]
      : 'Aliran udara alami mengalir lancar antar-ruang, mengurangi kelembapan dan beban pendinginan.';

    return {
      buildingId,
      hasCrossVentilation,
      overhangMeters,
      hasShadeTreesNearby,
      outdoorTempC,
      indoorEstimatedTempC,
      comfortRating,
      acPowerKw: Math.round(acPowerKw * 100) / 100,
      monthlyAcCostIdr,
      formattedMonthlyAcCost,
      recommendations,
      neighborhoodCoolingC,
      neighborhoodHeatIslandC,
      neighborhoodRunoffSurplusM3Hr,
      neighborhoodWaterAbsorptionAidM3Hr,
      riverCoolingBonusC: riverCoolingBonus,
      crossVentilationScore: score,
      windSpeedMps,
      airChangePerHour,
      statusText,
      advice
    };
  }

  public getCityThermalVentilationSummary(): CityThermalVentilationSummary {
    const buildings = Array.from(this.buildingManager.buildings.values());
    if (buildings.length === 0) {
      return {
        totalBuildings: 0,
        crossVentilatedCount: 0,
        crossVentilationRatioPercent: 0,
        averageIndoorTempC: 32.5,
        outdoorBaselineTempC: 32.5,
        totalMonthlyAcSavingsIdr: 0,
        formattedTotalSavings: 'Rp 0'
      };
    }

    let crossCount = 0;
    let sumIndoorTemp = 0;
    let baselineTotalAcCost = 0;
    let actualTotalAcCost = 0;

    for (const bld of buildings) {
      const data = this.analyzeBuilding(bld.id);
      if (!data) continue;
      if (data.hasCrossVentilation) crossCount++;
      sumIndoorTemp += data.indoorEstimatedTempC;

      const totalFloorArea = BuildingManager.getBuildingTotalFloorArea(bld);
      const baselineKw = Math.max(0.4, totalFloorArea * 0.075 * ((32.5 - 24.0) / 3.0));
      baselineTotalAcCost += Math.round(baselineKw * 10 * 30 * 1500);
      actualTotalAcCost += data.monthlyAcCostIdr;
    }

    const savings = Math.max(0, baselineTotalAcCost - actualTotalAcCost);
    const avgTemp = parseFloat((sumIndoorTemp / buildings.length).toFixed(1));
    const ratio = parseFloat(((crossCount / buildings.length) * 100).toFixed(1));

    return {
      totalBuildings: buildings.length,
      crossVentilatedCount: crossCount,
      crossVentilationRatioPercent: ratio,
      averageIndoorTempC: avgTemp,
      outdoorBaselineTempC: 32.5,
      totalMonthlyAcSavingsIdr: savings,
      formattedTotalSavings: new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(savings)
    };
  }

  public setWindVisible(visible: boolean): void {
    this.isWindActive = visible;
    this.windArrowsGroup.clear();
    this.setVisible(visible);

    if (!visible) return;

    this.arrowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.arrowCount * 3);
    const radius = 90;

    for (let i = 0; i < this.arrowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * radius * 2;
      positions[i * 3 + 1] = 2.0 + Math.random() * 8.0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
    }

    this.arrowPositions = positions;
    this.arrowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const points = new THREE.Points(this.arrowGeometry, material);
    this.windArrowsGroup.add(points);
  }

  public update(deltaTime: number): void {
    if (!this.isWindActive || !this.arrowPositions || !this.arrowGeometry) return;

    const speed = 18 * deltaTime;
    const box = 90;

    for (let i = 0; i < this.arrowCount; i++) {
      this.arrowPositions[i * 3] -= speed * 0.7;
      this.arrowPositions[i * 3 + 2] -= speed * 0.7;

      if (this.arrowPositions[i * 3] < -box) {
        this.arrowPositions[i * 3] = box;
      }
      if (this.arrowPositions[i * 3 + 2] < -box) {
        this.arrowPositions[i * 3 + 2] = box;
      }
    }

    this.arrowGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * Builds a 3D Extruded Curved Ribbon Arrow (#00B4D8 -> #48CAE4) that winds through
   * architectural openings with a glowing aerodynamic arrowhead.
   */
  protected create3DCurvedRibbonArrow(
    points: THREE.Vector3[],
    primaryColor: number = 0x00b4d8,
    glowColor: number = 0x48cae4,
    tubeRadius: number = 0.15
  ): THREE.Group {
    const group = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3(points);

    // 1. Volumetric Ribbon Tube Geometry
    const tubeGeom = new THREE.TubeGeometry(curve, 48, tubeRadius, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: glowColor,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
      depthTest: true
    });
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    tubeMesh.renderOrder = 930;
    group.add(tubeMesh);

    // 2. Aerodynamic Arrowhead Cone at Curve Endpoint
    const endPt = points[points.length - 1];
    const tangent = curve.getTangent(1.0).normalize();
    const coneGeom = new THREE.ConeGeometry(tubeRadius * 2.5, 1.2, 16);
    coneGeom.translate(0, 0.6, 0);
    coneGeom.rotateX(Math.PI / 2);

    const coneMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.95
    });
    const coneMesh = new THREE.Mesh(coneGeom, coneMat);
    coneMesh.position.copy(endPt);
    coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    coneMesh.renderOrder = 935;
    group.add(coneMesh);

    return group;
  }

  public setVisible(visible: boolean): void {
    this.isActive = visible;
    this.clearVisuals();

    if (!visible) return;

    for (const bld of this.buildingManager.buildings.values()) {
      const report = this.analyzeBuilding(bld.id);
      if (!report) continue;

      const group = new THREE.Group();
      group.position.copy(bld.position);

      const isKopiRasa = bld.id.includes('cafe') || (bld.presetKey && bld.presetKey.includes('cafe'));
      const isMieNusantara = bld.id.includes('mie') || (bld.presetKey && bld.presetKey.includes('mie'));

      if (isKopiRasa) {
        // Weaves smoothly into side windows, swirls across barista counter, exits front facade
        const p1 = new THREE.Vector3(-bld.width * 0.9, 2.1, -bld.length * 0.35);
        const p2 = new THREE.Vector3(-bld.width * 0.35, 2.3, -bld.length * 0.15);
        const p3 = new THREE.Vector3(0, 2.2, 0.05);
        const p4 = new THREE.Vector3(bld.width * 0.45, 2.4, bld.length * 0.22);
        const p5 = new THREE.Vector3(bld.width * 1.15, 2.5, bld.length * 0.4);

        const rotatedPoints = [p1, p2, p3, p4, p5].map(p =>
          p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bld.rotationY)
        );
        group.add(this.create3DCurvedRibbonArrow(rotatedPoints, 0x00b4d8, 0x48cae4, 0.16));
      } else if (isMieNusantara) {
        // Weaves smoothly through 2nd floor balcony & side louvers, across dining hall
        const p1 = new THREE.Vector3(-bld.width * 0.95, 5.6, -bld.length * 0.3);
        const p2 = new THREE.Vector3(-bld.width * 0.35, 5.8, -bld.length * 0.1);
        const p3 = new THREE.Vector3(0, 5.75, 0.05);
        const p4 = new THREE.Vector3(bld.width * 0.4, 5.9, bld.length * 0.18);
        const p5 = new THREE.Vector3(bld.width * 1.1, 6.1, bld.length * 0.38);

        const rotatedPoints = [p1, p2, p3, p4, p5].map(p =>
          p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bld.rotationY)
        );
        group.add(this.create3DCurvedRibbonArrow(rotatedPoints, 0x00b4d8, 0x48cae4, 0.18));
      } else if (report.hasCrossVentilation) {
        // Graceful S-curve ribbons through building core
        const arrowCount = 2;
        for (let i = 0; i < arrowCount; i++) {
          const offsetZ = (i - (arrowCount - 1) / 2) * (bld.length * 0.32);
          const yBase = 1.8 + (bld.floorCount > 1 ? 1.5 : 0);

          const p1 = new THREE.Vector3(-bld.width * 0.85, yBase, offsetZ - 0.8);
          const p2 = new THREE.Vector3(-bld.width * 0.3, yBase + 0.3, offsetZ);
          const p3 = new THREE.Vector3(bld.width * 0.3, yBase + 0.1, offsetZ + 0.3);
          const p4 = new THREE.Vector3(bld.width * 0.95, yBase + 0.4, offsetZ + 0.7);

          const rotatedPoints = [p1, p2, p3, p4].map(p =>
            p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bld.rotationY)
          );
          group.add(this.create3DCurvedRibbonArrow(rotatedPoints, 0x00b4d8, 0x48cae4, 0.14));
        }
      } else {
        // Blocked / deflected breeze around unventilated envelope
        const yBase = 1.8;
        const p1 = new THREE.Vector3(-bld.width * 0.85, yBase, -bld.length * 0.2);
        const p2 = new THREE.Vector3(-bld.width * 0.45, yBase + 0.2, -bld.length * 0.45);
        const p3 = new THREE.Vector3(0, yBase + 0.4, -bld.length * 0.7);

        const rotatedPoints = [p1, p2, p3].map(p =>
          p.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), bld.rotationY)
        );
        group.add(this.create3DCurvedRibbonArrow(rotatedPoints, 0xf59e0b, 0xfbbf24, 0.13));
      }

      this.visualGroup.add(group);
    }
  }

  public clearVisuals(): void {
    while (this.visualGroup.children.length > 0) {
      const child = this.visualGroup.children[0];
      this.visualGroup.remove(child);
      child.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).geometry?.dispose();
          const mat = (c as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
    }
  }

  public dispose(): void {
    this.setVisible(false);
    this.setWindVisible(false);
    this.scene.remove(this.visualGroup);
    this.scene.remove(this.windArrowsGroup);
  }
}

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ZONE_RULES, ZoneType, LotParcel, BUILDING_CODE_DISCLAIMER } from '../src/zones/ZoneTypes';
import { LotManager } from '../src/zones/LotManager';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Building Code Metrics & Regulations (T2.2)', () => {
  it('includes mandatory educational disclaimer', () => {
    expect(BUILDING_CODE_DISCLAIMER).toBe(
      'Aturan disederhanakan untuk belajar, bukan pengganti ketentuan resmi (PBG dan RDTR daerah).'
    );
  });

  it('correctly calculates KDB percentage based on real footprint and lot area', () => {
    const lotAreaM2 = 120; // 8 x 15 kavling
    const groundFootprintM2 = 72; // 6 x 12 building
    const kdbPercent = Math.round((groundFootprintM2 / lotAreaM2) * 100);
    expect(kdbPercent).toBe(60);

    const residentialMaxKDB = ZONE_RULES.residential.maxKDB;
    expect(kdbPercent <= residentialMaxKDB).toBe(true);

    const oversizedFootprint = 84;
    const oversizedKDB = Math.round((oversizedFootprint / lotAreaM2) * 100);
    expect(oversizedKDB).toBe(70);
    expect(oversizedKDB > residentialMaxKDB).toBe(true);
  });

  it('correctly calculates KLB floor area ratio', () => {
    const lotAreaM2 = 200;
    const footprintM2 = 80;
    const floorCount = 3;
    const totalFloorAreaM2 = footprintM2 * floorCount; // 240 m²

    const klbRatio = parseFloat((totalFloorAreaM2 / lotAreaM2).toFixed(2));
    expect(klbRatio).toBe(1.2);
    expect(klbRatio <= ZONE_RULES.residential.maxKLB).toBe(true);
  });

  it('evaluates GSB front, side, and rear requirements per zone', () => {
    expect(ZONE_RULES.residential.minGSBFront).toBe(3.0);
    expect(ZONE_RULES.residential.minGSBSide).toBe(1.5);
    expect(ZONE_RULES.residential.minGSBRear).toBe(2.0);

    expect(ZONE_RULES.commercial.minGSBFront).toBe(4.0);
    expect(ZONE_RULES.office.minGSBFront).toBe(5.0);
  });

  it('evaluates LotManager building code with polygon containment and violations', () => {
    const scene = new THREE.Scene();
    const bldMgr = new BuildingManager(scene);
    const lotMgr = new LotManager(scene, bldMgr);

    // Create a lot at origin: 15m wide (X: -7.5 to 7.5), 20m length (Z: -10 to 10)
    // Area = 300 m2
    const lot = lotMgr.createLot(new THREE.Vector3(0, 0, 0), 15, 20, 'residential');
    expect(lot.areaM2).toBe(300);

    // 1. Compliant Building: 8m wide, 10m long at center
    // Setback front (Z+): lot edge is Z=10, building front is Z=5 => distance = 5m (> 3m minGSBFront)
    // Setback side (X): lot edge is X=7.5, building side is X=4 => distance = 3.5m (> 1.5m minGSBSide)
    // Footprint: 80 m2 (KDB = 27%)
    const bld1: BuildingInstance = {
      id: 'test_bld_1',
      presetKey: 'house_36',
      name: 'Rumah Uji 1',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 8,
      length: 10,
      floorCount: 2,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 0.6,
      wallMaterial: 'plaster',
      wallColor: 0xffffff,
      roofMaterial: 'genteng'
    };
    bldMgr.buildings.set(bld1.id, bld1);

    lotMgr.evaluateBuildingCode(lot);
    expect(lot.containedBuildingIds).toContain('test_bld_1');
    expect(lot.metrics.groundFootprintM2).toBe(80);
    expect(lot.metrics.totalFloorAreaM2).toBe(160);
    expect(lot.metrics.kdbPercent).toBe(27);
    expect(lot.metrics.gsbFrontActualM).toBe(5.0);
    expect(lot.metrics.gsbSideActualM).toBe(3.5);
    expect(lot.metrics.gsbRearActualM).toBe(5.0);
  });

  it('detects OUT_OF_BOUNDS violation when building footprint protrudes outside lot', () => {
    const scene = new THREE.Scene();
    const bldMgr = new BuildingManager(scene);
    const lotMgr = new LotManager(scene, bldMgr);

    // Lot: 10m x 10m (X: -5 to 5, Z: -5 to 5)
    const lot = lotMgr.createLot(new THREE.Vector3(0, 0, 0), 10, 10, 'residential');

    // Building: 12m wide x 6m length centered at (0, 0, 0) => extends to X = -6 and X = +6!
    const protrudingBld: BuildingInstance = {
      id: 'protruding_bld',
      presetKey: 'house_36',
      name: 'Rumah Melebihi Batas',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 12,
      length: 6,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 0.5,
      wallMaterial: 'brick',
      wallColor: 0xffffff,
      roofMaterial: 'genteng'
    };
    bldMgr.buildings.set(protrudingBld.id, protrudingBld);

    lotMgr.evaluateBuildingCode(lot);
    const outOfBounds = lot.violations.find((v) => v.code === 'OUT_OF_BOUNDS');
    expect(outOfBounds).toBeDefined();
    expect(outOfBounds?.title).toContain('Keluar Batas Kavling');
  });

  it('calculates KDH strictly from LandscapeManager items (unmarked lot is paved, not green)', () => {
    const scene = new THREE.Scene();
    const bldMgr = new BuildingManager(scene);
    const landMgr = new LandscapeManager(scene);
    const lotMgr = new LotManager(scene, bldMgr, undefined, landMgr);

    const lot = lotMgr.createLot(new THREE.Vector3(0, 0, 0), 10, 10, 'residential'); // 100 m2
    lotMgr.evaluateBuildingCode(lot);

    // With no landscape items, green area is 0 and KDH is 0%, all unmarked space is paved
    expect(lot.metrics.greenAreaM2).toBe(0);
    expect(lot.metrics.kdhPercent).toBe(0);
    expect(lot.metrics.pavedAreaM2).toBe(100);

    // Add a 4x4m grass garden (16 m2)
    landMgr.createItem('grass_garden', new THREE.Vector3(0, 0, 0), { width: 4, length: 4 });
    lotMgr.evaluateBuildingCode(lot);

    expect(lot.metrics.greenAreaM2).toBe(16);
    expect(lot.metrics.kdhPercent).toBe(16);
    expect(lot.metrics.pavedAreaM2).toBe(84);
  });
});

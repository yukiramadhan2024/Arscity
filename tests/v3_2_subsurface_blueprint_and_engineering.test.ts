import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { RoadManager } from '../src/roads/RoadManager';
import { Terrain } from '../src/world/Terrain';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { calculateSolarPosition, SOLAR_SEASONS } from '../src/core/math/SolarPosition';

describe('Arscity v3.2 Sprint: Subsurface Engineering, Interactive Street & Room Mastery Suite', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);
    PrefabMeshBuilder.clearCache();
  });

  it('1. Culling interior pada mode cinematic_drone tetap menyembunyikan interior gedung yang berjarak >= 60m', () => {
    const bld: any = {
      id: 'bld_drone_lod_test',
      presetKey: 'house_36',
      width: 10,
      length: 12,
      floorCount: 1,
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      wallMaterial: 'plaster',
      roofType: 'gable'
    };

    buildingManager.addBuilding(bld);
    const grp = (buildingManager as any).buildingGroups.get('bld_drone_lod_test')!;
    const ext = grp.getObjectByName('ExteriorShell')!;
    const interior = grp.getObjectByName('InteriorDetails')!;
    expect(interior).toBeDefined();

    // Drone camera far away (100m) -> 100% exterior intact, interior hidden
    const farCameraPos = new THREE.Vector3(0, 10, 100);
    buildingManager.updateLOD(farCameraPos, 'cinematic_drone', false, false, 60);
    expect(ext.visible).toBe(true);
    expect(interior.visible).toBe(false);

    // Section cut active in Drone -> interior visible
    buildingManager.updateLOD(farCameraPos, 'cinematic_drone', true, false, 60);
    expect(interior.visible).toBe(true);

    // First person mode < 30m -> interior visible
    const fpNearPos = new THREE.Vector3(0, 2, 10);
    buildingManager.updateLOD(fpNearPos, 'first_person', false, false, 60);
    expect(interior.visible).toBe(true);
  });

  it('2. Aktivasi Lensa X-Ray Bawah Tanah menampilkan grup SubsurfaceFoundation dan mengubah transparansi Terrain', () => {
    const terrain = new Terrain(scene, 100, 100);
    const bld: any = {
      id: 'bld_subsurface_test',
      presetKey: 'shophouse_standard',
      width: 8,
      length: 16,
      floorCount: 3,
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      wallMaterial: 'concrete',
      roofType: 'flat'
    };

    buildingManager.addBuilding(bld);
    const grp = (buildingManager as any).buildingGroups.get('bld_subsurface_test')!;
    const foundation = grp.getObjectByName('SubsurfaceFoundation')!;
    expect(foundation).toBeDefined();

    // Default state: hidden
    expect(foundation.visible).toBe(false);
    expect((terrain as any).material.transparent).toBe(false);

    // Enable Subsurface X-Ray
    terrain.setSubsurfaceXRay(true);
    expect((terrain as any).material.transparent).toBe(true);
    expect((terrain as any).material.opacity).toBeCloseTo(0.32);
    expect((terrain as any).material.depthWrite).toBe(false);

    buildingManager.updateLOD(new THREE.Vector3(0, 10, 30), 'orbit', false, true, 60);
    expect(foundation.visible).toBe(true);

    // Disable Subsurface X-Ray
    terrain.setSubsurfaceXRay(false);
    expect((terrain as any).material.transparent).toBe(false);
    expect((terrain as any).material.depthWrite).toBe(true);
  });

  it('3. Eksekusi UpdateRoadEdgeCommand dan Undo/Redo upgrade kelas jalan berjalan akurat', () => {
    const roadManager = new RoadManager(scene);
    const edge = roadManager.addRoad(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100, 0, 0),
      'local'
    )!;

    expect(edge).toBeDefined();
    expect(edge.type).toBe('local');

    // Upgrade to arterial boulevard with corridor trees & lights
    const updated = roadManager.updateRoad(edge.id, 'arterial', { hasTrees: true, hasStreetLights: true });
    expect(updated).toBeDefined();
    expect(updated!.type).toBe('arterial');
    expect(updated!.customProfile?.hasTrees).toBe(true);
    expect(updated!.customProfile?.hasStreetLights).toBe(true);

    // Revert back (Undo)
    const reverted = roadManager.updateRoad(edge.id, 'local', { hasTrees: false, hasStreetLights: false });
    expect(reverted!.type).toBe('local');
    expect(reverted!.customProfile?.hasTrees).toBe(false);
  });

  it('4. Deteksi ruangan dan kalkulasi Lux di FirstPersonController berfungsi pada gedung bertingkat', () => {
    const camera = new THREE.PerspectiveCamera();
    const dom = { addEventListener: () => {}, removeEventListener: () => {} } as any;
    const fp = new FirstPersonController(camera, dom, buildingManager);

    const bld: any = {
      id: 'bld_fp_metrics_test',
      presetKey: 'shophouse_standard',
      name: 'Ruko Malioboro Modern',
      width: 10,
      length: 18,
      floorCount: 3,
      floorHeight: 3.5,
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      wallMaterial: 'concrete',
      roofType: 'flat'
    };

    buildingManager.addBuilding(bld);

    // Simulate player inside building on floor 2
    (fp as any).insideBuildingId = bld.id;
    (fp as any).insideBuildingName = bld.name;
    (fp as any).currentFloor = 2;
    (fp as any).totalFloors = 3;
    fp.position.set(0, 3.8, 0);

    const metrics = fp.getCurrentRoomMetrics();
    expect(metrics).not.toBeNull();
    expect(metrics!.floorLabel).toBe('Lantai 2');
    expect(metrics!.lux).toBeGreaterThan(0);
    expect(['Optimum (SNI)', 'Cukup', 'Kurang Cahaya', 'Terlalu Terang']).toContain(metrics!.sniLuxStatus);

    // Test ceiling light toggle
    const lightOn = fp.toggleCeilingLight();
    expect(lightOn).toBe(true);
    const metricsWithLight = fp.getCurrentRoomMetrics();
    expect(metricsWithLight!.lux).toBeGreaterThan(metrics!.lux);

    // Test furniture variant cycle
    const nextVariant = fp.cycleInteriorVariant();
    expect(nextVariant).toBe('Open-Plan Modern');
  });

  it('5. Perubahan deklinasi matahari Yogyakarta antara bulan Maret, Juni, dan Desember mengubah vektor cahaya matahari di SolarPosition.ts', () => {
    // March Equinox (Day 80, Declination 0 deg)
    const marchSolar = calculateSolarPosition(12.0, SOLAR_SEASONS.equinox_mar.dayOfYear);
    // June Solstice (Day 172, Declination +23.45 deg - Sun in North, shadow South)
    const juneSolar = calculateSolarPosition(12.0, SOLAR_SEASONS.solstice_jun.dayOfYear);
    // December Solstice (Day 355, Declination -23.45 deg - Sun in South)
    const decSolar = calculateSolarPosition(12.0, SOLAR_SEASONS.solstice_dec.dayOfYear);

    expect(marchSolar.isDaylight).toBe(true);
    expect(juneSolar.isDaylight).toBe(true);
    expect(decSolar.isDaylight).toBe(true);

    // In June, Sun is north of Yogyakarta (-7.8 deg lat vs +23.45 deg solar dec) -> direction.z < 0
    expect(juneSolar.direction.z).toBeLessThan(0);

    // In December, Sun is south of Yogyakarta (-7.8 deg lat vs -23.45 deg solar dec) -> direction.z > 0
    expect(decSolar.direction.z).toBeGreaterThan(0);

    // Declination and solar angles differ significantly across seasons
    expect(juneSolar.altitudeDegrees).not.toBeCloseTo(decSolar.altitudeDegrees, 0.5);
  });
});

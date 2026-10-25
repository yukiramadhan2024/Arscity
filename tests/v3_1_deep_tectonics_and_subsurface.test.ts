import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  calculateSolarPosition,
  getSolarSeasonDayOfYear,
  getSolarSeasonFromDay,
  SOLAR_SEASONS,
  getSolarNoonWIB,
  YOGYAKARTA_LONGITUDE,
} from '../src/core/math/SolarPosition';
import { TectonicComponents } from '../src/buildings/TectonicComponents';
import { StructuralChecker } from '../src/simulation/StructuralChecker';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { InteriorLayoutFactory } from '../src/buildings/InteriorLayoutFactory';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LotManager } from '../src/zones/LotManager';
import { RoadManager } from '../src/roads/RoadManager';
import { UpdateRoadEdgeCommand, SwapInteriorVariantCommand } from '../src/core/commands/CityCommands';
import { Engine } from '../src/core/engine/Engine';

describe('Arscity v3.1 Sprint: Deep Tectonics, Subsurface Engineering & Micro-Space Mastery', () => {

  describe('FITUR 1: Deklinasi Surya Tahunan & Musim Tropis Yogyakarta', () => {
    it('accurately shifts solar azimuth by approx 180 degrees between June (solstice_jun) and December (solstice_dec)', () => {
      const junDay = getSolarSeasonDayOfYear('solstice_jun'); // Day 172 (~21 June)
      const decDay = getSolarSeasonDayOfYear('solstice_dec'); // Day 355 (~22 December)

      expect(junDay).toBe(172);
      expect(decDay).toBe(355);

      // In Yogyakarta (-7.8 S latitude):
      // At solar noon in June, sun is at +23.45 N (North), shadows fall to South (+Z), dirZ < 0
      const junNoon = getSolarNoonWIB(junDay, YOGYAKARTA_LONGITUDE);
      const junPos = calculateSolarPosition(junNoon, junDay);

      // At solar noon in December, sun is at -23.45 S (South), shadows fall to North (-Z), dirZ > 0
      const decNoon = getSolarNoonWIB(decDay, YOGYAKARTA_LONGITUDE);
      const decPos = calculateSolarPosition(decNoon, decDay);

      // June Azimuth should be close to True North (0 deg / 360 deg)
      expect(junPos.azimuthDegrees).toBeLessThan(15);
      expect(junPos.direction.z).toBeLessThan(0); // Points towards North (-Z)

      // December Azimuth should be close to True South (180 deg)
      expect(decPos.azimuthDegrees).toBeGreaterThan(165);
      expect(decPos.azimuthDegrees).toBeLessThan(195);
      expect(decPos.direction.z).toBeGreaterThan(0); // Points towards South (+Z)

      // Azimuth difference between June and December solar noon should be ~180 degrees
      const azimuthDiff = Math.abs(decPos.azimuthDegrees - junPos.azimuthDegrees);
      expect(azimuthDiff).toBeGreaterThan(165);
      expect(azimuthDiff).toBeLessThan(195);

      // March equinox: near equator, day 80
      const marDay = getSolarSeasonDayOfYear('equinox_mar');
      expect(marDay).toBe(80);
      const marSeason = getSolarSeasonFromDay(marDay);
      expect(marSeason).toBe('equinox_mar');
    });

    it('verifies all 3 solar seasons have valid metadata in SOLAR_SEASONS', () => {
      expect(SOLAR_SEASONS.equinox_mar.declinationDeg).toBeCloseTo(0, 1);
      expect(SOLAR_SEASONS.solstice_jun.declinationDeg).toBeCloseTo(23.45, 1);
      expect(SOLAR_SEASONS.solstice_dec.declinationDeg).toBeCloseTo(-23.45, 1);
    });
  });

  describe('FITUR 2: Lensa X-Ray Bawah Tanah / Subsurface Foundation & Hydrology', () => {
    it('generates continuous river stone strip foundation (-1.2m) for 1-2 floor buildings', () => {
      const group = TectonicComponents.buildSubsurfaceFoundation(1, 10, 15);
      expect(group.name).toBe('SubsurfaceFoundationMesh');
      expect(group.children.length).toBeGreaterThan(0);

      // Verify all foundation meshes are situated at Y < 0
      let hasDeepNegativeY = false;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (child.position.y <= -0.5) hasDeepNegativeY = true;
        }
      });
      expect(hasDeepNegativeY).toBe(true);
    });

    it('generates reinforced concrete footplat pads (-2.5m) for 3-5 floor buildings', () => {
      const group = TectonicComponents.buildSubsurfaceFoundation(4, 16, 20);
      expect(group.name).toBe('SubsurfaceFoundationMesh');

      let minPosY = 0;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (child.position.y < minPosY) minPosY = child.position.y;
        }
      });
      expect(minPosY).toBeLessThanOrEqual(-2.0); // Reaches down to -2.5m
    });

    it('generates deep bore piles (-12.0m) and heavy pile caps for 18-floor skyscrapers', () => {
      const group = TectonicComponents.buildSubsurfaceFoundation(18, 30, 40);
      expect(group.name).toBe('SubsurfaceFoundationMesh');

      let minPosY = 0;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (child.position.y < minPosY) minPosY = child.position.y;
        }
      });
      // Piles extend down towards -12.0m
      expect(minPosY).toBeLessThanOrEqual(-6.0);
    });

    it('evaluates foundation depth adequacy and soil saturation in StructuralChecker', () => {
      const checker = StructuralChecker.getInstance();

      const lowRiseBld: BuildingInstance = {
        id: 'bld_low',
        presetKey: 'house_36',
        name: 'Rumah Sederhana',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'hip',
        roofOverhang: 1.0,
        wallMaterial: 'brick',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile'
      };

      const highRiseBld: BuildingInstance = {
        id: 'bld_high',
        presetKey: 'skyscraper_office_tower',
        name: 'Menara Kantor 18 Lantai',
        category: 'office',
        position: new THREE.Vector3(50, 0, 50),
        rotationY: 0,
        width: 30,
        length: 40,
        floorCount: 18,
        floorHeight: 4.2,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#1e293b',
        roofMaterial: 'metal'
      };

      const repLow = checker.evaluateBuilding(lowRiseBld);
      expect(repLow.foundationDepthM).toBe(1.2);
      expect(repLow.foundationType).toContain('Batu Kali');
      expect(repLow.isFoundationAdequate).toBe(true);

      const repHigh = checker.evaluateBuilding(highRiseBld);
      expect(repHigh.foundationDepthM).toBe(12.0);
      expect(repHigh.foundationType).toContain('Tiang Pancang');
      expect(repHigh.isFoundationAdequate).toBe(true);
    });
  });

  describe('FITUR 3: Interaksi Ruangan Mikro & Interior Layout Swapper', () => {
    it('detects active room inside building and computes SNI Lux, ACH, and noise attenuation', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);

      const bld: BuildingInstance = {
        id: 'bld_test_interior',
        presetKey: 'house_36',
        name: 'Rumah Tipe 36',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 1.0,
        wallMaterial: 'brick',
        wallColor: '#fff',
        roofMaterial: 'clay_tile'
      };

      bld.interiorLayouts = InteriorLayoutFactory.getLayoutForBuilding(
        bld.presetKey,
        bld.width,
        bld.length,
        bld.floorHeight,
        bld.floorCount
      );

      bldMgr.buildings.set(bld.id, bld);

      const camera = new THREE.PerspectiveCamera();
      const dom = { addEventListener: () => {}, removeEventListener: () => {}, requestPointerLock: () => {} } as any;
      const fpController = new FirstPersonController(camera, dom, bldMgr);

      // Player stands inside the building
      fpController.enter(new THREE.Vector3(1, 1.65, 1));
      fpController.insideBuildingId = bld.id;
      fpController.insideBuildingName = bld.name;
      fpController.currentFloor = 1;

      const metrics = fpController.getCurrentRoomMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.floorLabel).toBe('Lantai 1');
      expect(metrics!.areaM2).toBeGreaterThan(0);
      expect(metrics!.lux).toBeGreaterThanOrEqual(40);
      expect(metrics!.ach).toBeGreaterThan(4);
      expect(metrics!.temperatureC).toBeCloseTo(27.6, 1);
      expect(metrics!.noiseDba).toBeLessThan(65); // Noise attenuated by walls
    });

    it('cycles interior layout variants (A -> B -> C) via SwapInteriorVariantCommand with Undo/Redo', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);

      const bld: BuildingInstance = {
        id: 'bld_cafe',
        presetKey: 'resto_mie_gacoan',
        name: 'Resto Mie Gacoan',
        category: 'commercial',
        position: new THREE.Vector3(20, 0, 20),
        rotationY: 0,
        width: 14,
        length: 22,
        floorCount: 1,
        floorHeight: 4.5,
        roofType: 'shed_industrial',
        roofOverhang: 1.2,
        wallMaterial: 'brick',
        wallColor: '#1e293b',
        roofMaterial: 'metal',
        interiorVariant: 'variant_a'
      };
      bldMgr.buildings.set(bld.id, bld);

      const mockEngine = {
        buildingManager: bldMgr
      } as any;

      // Swap to variant_b
      const cmdB = new SwapInteriorVariantCommand(mockEngine, bld.id, 'variant_b');
      cmdB.execute();
      expect(bld.interiorVariant).toBe('variant_b');

      // Undo back to variant_a
      cmdB.undo();
      expect(bld.interiorVariant).toBe('variant_a');

      // Redo to variant_b
      cmdB.redo();
      expect(bld.interiorVariant).toBe('variant_b');
    });
  });

  describe('FITUR 4 & 5: Smart Block Subdivider & Road Edge Upgrade Command', () => {
    it('subdivides a block into uniform parcels facing the nearest road', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);
      const roadMgr = new RoadManager(scene);
      const lotMgr = new LotManager(scene, bldMgr, roadMgr);

      // Add a road on the South edge (Z = 30)
      roadMgr.addRoad(new THREE.Vector3(-40, 0, 30), new THREE.Vector3(40, 0, 30), 'local');

      // Subdivide a 40x40m block centered at (0, 0, 0) into 10x20m parcels
      const center = new THREE.Vector3(0, 0, 0);
      const parcels = lotMgr.subdivideBlock(center, 40, 40, 10, 20, 'residential');

      // 40/10 = 4 cols, 40/20 = 2 rows -> 8 parcels
      expect(parcels.length).toBe(8);

      for (const p of parcels) {
        expect(p.width).toBe(10);
        expect(p.length).toBe(20);
        expect(p.areaM2).toBe(200);
        expect(p.frontEdgeIndex).toBeDefined();
      }
    });

    it('upgrades existing road edge with UpdateRoadEdgeCommand supporting Undo/Redo', () => {
      const scene = new THREE.Scene();
      const roadMgr = new RoadManager(scene);
      const edge = roadMgr.addRoad(new THREE.Vector3(0, 0, 0), new THREE.Vector3(50, 0, 0), 'local');
      expect(edge).not.toBeNull();
      expect(edge!.type).toBe('local');

      const mockEngine = {
        roadManager: roadMgr
      } as any;

      // Upgrade to collector with shade trees
      const cmd = new UpdateRoadEdgeCommand(mockEngine, edge!.id, {
        type: 'collector',
        customProfile: { hasTrees: true, hasStreetLights: true }
      });

      cmd.execute();
      expect(edge!.type).toBe('collector');
      expect(edge!.customProfile?.hasTrees).toBe(true);

      // Undo back to local
      cmd.undo();
      expect(edge!.type).toBe('local');
      expect(edge!.customProfile?.hasTrees).toBeUndefined();

      // Redo back to collector
      cmd.redo();
      expect(edge!.type).toBe('collector');
      expect(edge!.customProfile?.hasTrees).toBe(true);
    });
  });
});

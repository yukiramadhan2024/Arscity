import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { CinematicDroneController } from '../src/core/engine/CinematicDroneController';
import { GeoJSONImporter } from '../src/io/GeoJSONImporter';
import { Terrain } from '../src/world/Terrain';
import { structuralChecker } from '../src/simulation/StructuralChecker';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { RunoffSimulator } from '../src/simulation/RunoffSimulator';
import { RunoffOverlay } from '../src/analysis/RunoffOverlay';

describe('Arscity v3.0.0 Next-Gen Features Test Suite', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    camera.position.set(0, 1.65, 0);
  });

  const mockDomElement = {
    requestPointerLock: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  } as any;

  describe('1. Multi-Floor Traversal & Interior Physics (FirstPersonController)', () => {
    it('initializes on ground floor (Lantai 1) with human eye-level height (1.65m)', () => {
      const fpc = new FirstPersonController(camera, mockDomElement);
      expect(fpc.currentFloor).toBe(1);
      expect(fpc.totalFloors).toBe(1);
      expect(fpc.insideBuildingId).toBeNull();
      fpc.dispose();
    });

    it('navigates upstairs and downstairs between floors up to building total floors', () => {
      const fpc = new FirstPersonController(camera, mockDomElement);

      // Simulate player standing inside a 4-story building
      fpc.insideBuildingId = 'bld_office_01';
      fpc.insideBuildingName = 'Menara Kantor Sudirman';
      fpc.totalFloors = 4;
      fpc.floorHeight = 3.5;
      fpc.currentFloor = 1;

      // Ascend to floor 2
      fpc.traverseFloor('up');
      expect(fpc.currentFloor).toBe(2);
      expect(fpc.position.y).toBeCloseTo(1.65 + 1 * 3.5);

      // Ascend to floor 3 and 4
      fpc.traverseFloor('up');
      expect(fpc.currentFloor).toBe(3);
      fpc.traverseFloor('up');
      expect(fpc.currentFloor).toBe(4);

      // Clamped at top floor (cannot exceed 4)
      fpc.traverseFloor('up');
      expect(fpc.currentFloor).toBe(4);

      // Descend back down to floor 3
      fpc.traverseFloor('down');
      expect(fpc.currentFloor).toBe(3);
      expect(fpc.position.y).toBeCloseTo(1.65 + 2 * 3.5);

      // Descend to ground floor (clamped at 1)
      fpc.traverseFloor('down');
      fpc.traverseFloor('down');
      fpc.traverseFloor('down');
      expect(fpc.currentFloor).toBe(1);
      expect(fpc.position.y).toBeCloseTo(1.65);

      fpc.dispose();
    });
  });

  describe('2. 6-DOF Manual Free-Fly & Custom Keyframe Tour Director (CinematicDroneController)', () => {
    const mockRenderer = {
      domElement: { captureStream: () => null, toDataURL: () => '' }
    } as any;
    const mockBuildingManager = {
      buildings: new Map()
    } as any;

    it('manages custom keyframe addition, removal, and clearance', () => {
      const drone = new CinematicDroneController(camera, mockRenderer, mockBuildingManager);
      drone.clearKeyframes();
      expect(drone.getKeyframes().length).toBe(0);

      // Set camera transform
      camera.position.set(10, 25, 30);
      camera.quaternion.set(0, 0, 0, 1);

      // Add keyframe 1
      const kf1 = drone.addKeyframe(50, 10.0);
      expect(drone.getKeyframes().length).toBe(1);
      expect(kf1.position.x).toBe(10);
      expect(kf1.position.y).toBe(25);
      expect(kf1.fov).toBe(50);
      expect(kf1.timeOfDay).toBe(10.0);

      // Add keyframe 2
      camera.position.set(40, 15, 60);
      drone.addKeyframe(24, 14.5);
      expect(drone.getKeyframes().length).toBe(2);

      // Remove keyframe
      drone.removeKeyframe(0);
      expect(drone.getKeyframes().length).toBe(1);
      expect(drone.getKeyframes()[0].fov).toBe(24);

      // Clear all
      drone.clearKeyframes();
      expect(drone.getKeyframes().length).toBe(0);
      drone.dispose();
    });

    it('plays custom cinematic keyframe tour with Catmull-Rom and Slerp interpolation', () => {
      const drone = new CinematicDroneController(camera, mockRenderer, mockBuildingManager);
      drone.clearKeyframes();

      // Setup 3 keyframes
      camera.position.set(0, 10, 0);
      drone.addKeyframe(50, 8.0);
      camera.position.set(20, 15, 20);
      drone.addKeyframe(35, 12.0);
      camera.position.set(50, 30, 50);
      drone.addKeyframe(24, 17.0);

      let interpolatedHour = 0;
      drone.onTimeOfDayInterpolated = (h) => {
        interpolatedHour = h;
      };

      drone.startCustomTour(6.0); // 6 seconds tour
      expect(drone.subMode).toBe('custom_tour');

      // Update tour at mid-point (progress 0.5)
      drone.update(3.0);
      expect(camera.position.x).toBeGreaterThan(0);
      expect(interpolatedHour).toBeGreaterThan(8.0);

      drone.stopCustomTour();
      expect(drone.subMode).toBe('free_fly');
      drone.dispose();
    });
  });

  describe('3. Offline GeoJSON Map Importer & .arscity Project Serializer', () => {
    it('parses LineString roads into metric CAD road coordinates', () => {
      const sampleGeoJson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { highway: 'primary', name: 'Jl. Malioboro' },
            geometry: {
              type: 'LineString',
              coordinates: [
                [110.3658, -7.7956],
                [110.3662, -7.7980]
              ]
            }
          }
        ]
      };

      const parsed = GeoJSONImporter.parseGeoJSON(sampleGeoJson);
      expect(parsed.roads.length).toBe(1);
      expect(parsed.roads[0].type).toBe('arterial');
      expect(parsed.roads[0].start.x).toBeDefined();
      expect(parsed.roads[0].end.x).toBeDefined();
    });

    it('parses Polygon features into architectural building instances', () => {
      const sampleGeoJson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { building: 'commercial', name: 'Ruko Arkade Malioboro', levels: 3 },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [10, 20],
                  [18, 20],
                  [18, 32],
                  [10, 32],
                  [10, 20]
                ]
              ]
            }
          }
        ]
      };

      const parsed = GeoJSONImporter.parseGeoJSON(sampleGeoJson);
      expect(parsed.buildings.length).toBe(1);
      const b = parsed.buildings[0];
      expect(b.presetKey).toBe('ruko_3fl');
      expect(b.floorCount).toBe(3);
      expect(b.width).toBe(8);
      expect(b.length).toBe(12);
      expect(b.position?.x).toBe(14);
      expect(b.position?.z).toBe(26);
    });

    it('formats and structures .arscity project file format', () => {
      // Mock engine with roads and buildings
      const mockEngine: any = {
        roadManager: {
          graph: {
            nodes: new Map(),
            edges: new Map()
          }
        },
        buildingManager: {
          buildings: new Map()
        },
        landscapeManager: {
          items: new Map()
        },
        lotManager: {
          lots: new Map()
        },
        lightingSystem: { currentDayOfYear: 172 },
        weatherSystem: { currentWeather: 'sunny' }
      };

      const jsonStr = GeoJSONImporter.exportToArscity(mockEngine, 'Kota_Baru');
      expect(jsonStr).toContain('"format": "arscity"');
      expect(jsonStr).toContain('"version": "3.0.0"');
      expect(jsonStr).toContain('"projectName": "Kota_Baru"');
    });
  });

  describe('4. Earthquake Mw 6.3 Simulation & Building Stability', () => {
    it('evaluates Joglo and Modular homes as stable with no soft-story issues', () => {
      const jogloInstance: BuildingInstance = {
        id: 'bld_joglo_01',
        presetKey: 'joglo',
        name: 'Joglo Kepatihan',
        category: 'public',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 12,
        length: 12,
        floorCount: 1,
        floorHeight: 4.5,
        roofType: 'joglo',
        roofOverhang: 1.8,
        wallMaterial: 'wood',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile'
      };

      const report = structuralChecker.evaluateBuilding(jogloInstance);
      expect(report.hasSoftStory).toBe(false);
      expect(report.score).toBeGreaterThanOrEqual(75);
    });

    it('triggers and stops earthquake shake simulation cleanly', () => {
      expect(structuralChecker.isShaking()).toBe(false);

      const mockEngine: any = {
        buildingManager: {
          buildings: new Map(),
          buildingGroups: new Map()
        },
        cameraController: {
          activeCamera: camera
        },
        scene
      };

      structuralChecker.triggerEarthquakeShakeTest(mockEngine);
      expect(structuralChecker.isShaking()).toBe(true);

      structuralChecker.stopEarthquakeShakeTest();
      expect(structuralChecker.isShaking()).toBe(false);
    });
  });

  describe('5. Terrain Sculpting & Foundation Skirt (Auto-Talud)', () => {
    it('modifies terrain elevation and performs continuous bilinear interpolation', () => {
      const terrain = new Terrain(scene, 200, 32);

      // Baseline height is 0
      expect(terrain.getHeightAt(0, 0)).toBe(0);

      // Raise terrain at (0, 0) by 5.0m
      terrain.modifyElevation(0, 0, 20, 5.0, 'raise');
      const peakH = terrain.getHeightAt(0, 0);
      expect(peakH).toBeGreaterThan(3.5);

      // Bilinear interpolation at fraction coordinate
      const fracH = terrain.getHeightAt(2.5, 2.5);
      expect(fracH).toBeGreaterThan(0);
      expect(fracH).toBeLessThanOrEqual(peakH);

      // Flatten area around (0, 0)
      terrain.flattenArea(-10, -10, 10, 10, 2.0);
      expect(terrain.getHeightAt(0, 0)).toBeCloseTo(2.0, 1);

      terrain.dispose();
    });

    it('generates a solid foundation skirt mesh (batu talud) to prevent floating', () => {
      const skirt = PrefabMeshBuilder.buildFoundationSkirt(10, 12, 2.5, 'concrete');
      expect(skirt).toBeDefined();
      expect(skirt.name).toBe('FoundationSkirt');
      expect(skirt.position.y).toBeLessThan(0); // penetrates ground
      skirt.geometry.dispose();
      (skirt.material as THREE.Material).dispose();
    });
  });

  describe('6. Extreme Monsoon Storm & 3D Flood Surface Mesh', () => {
    it('activates extreme storm intensity (120 mm/hr) and triggers 3D FloodSurfaceMesh on low KDH lots', () => {
      const sim = RunoffSimulator.getInstance();
      sim.setExtremeStorm(true);
      expect(sim.isExtremeStorm).toBe(true);
      expect(sim.coefficients.rainfallIntensityMmHr).toBe(120.0);

      const overlay = new RunoffOverlay(scene);
      overlay.setExtremeStorm(true);
      expect(overlay.isExtremeStorm).toBe(true);

      // Reset
      sim.setExtremeStorm(false);
      expect(sim.coefficients.rainfallIntensityMmHr).toBe(60.0);
      overlay.dispose();
    });
  });
});

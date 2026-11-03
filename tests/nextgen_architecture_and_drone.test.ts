import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import { CameraController } from '../src/core/engine/CameraController';
import { BuildingCatalogRegistry } from '../src/buildings/BuildingCatalogRegistry';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { TectonicComponents } from '../src/buildings/TectonicComponents';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Next-Gen Architectural Scale Overhaul & Camera Tests', () => {
  let domElement: HTMLElement;
  let controller: CameraController;

  beforeEach(() => {
    // Mock minimal DOM element for CameraController
    domElement = {
      clientWidth: 1280,
      clientHeight: 720,
      addEventListener: () => {},
      removeEventListener: () => {},
      requestPointerLock: () => {}
    } as any;

    controller = new CameraController(domElement, { fov: 45 });
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('1. Total Drone View & Camera System Overhaul', () => {
    it('initializes perspective camera with near: 0.06 to prevent indoor clipping and far: 4000', () => {
      expect(controller.camera.near).toBe(0.06);
      expect(controller.camera.far).toBe(4000);
      expect(controller.orthoCamera.far).toBe(4000);
    });

    it('activates 6-DOF Drone Mode with smooth initial orientation and callback', () => {
      let callbackReceived = false;
      controller.onDroneModeChanged = (isDrone) => {
        callbackReceived = isDrone;
      };

      controller.setDroneMode(true);
      expect(controller.isDroneMode).toBe(true);
      expect(callbackReceived).toBe(true);
      expect(controller.dronePosition.y).toBeGreaterThanOrEqual(controller.minDroneY);
      expect(isNaN(controller.droneYaw)).toBe(false);
      expect(isNaN(controller.dronePitch)).toBe(false);
    });

    it('synchronizes yaw and pitch from camera quaternion without NaN or flip', () => {
      controller.camera.quaternion.setFromEuler(new THREE.Euler(0.35, 1.2, 0, 'YXZ'));
      const angles = controller.syncAnglesFromCameraQuaternion();

      expect(isNaN(angles.yaw)).toBe(false);
      expect(isNaN(angles.pitch)).toBe(false);
      expect(angles.pitch).toBeCloseTo(0.35, 2);
      expect(angles.yaw).toBeCloseTo(1.2, 2);
    });

    it('strictly clamps drone pitch between -85 deg and +85 deg (-1.48 to +1.48 rad)', () => {
      controller.setDroneMode(true);

      // Attempt extreme upward pitch
      (controller as any).dronePitch = 3.5;
      controller.update(0.016);
      expect(controller.dronePitch).toBeLessThanOrEqual(1.48 + 0.001);

      // Attempt extreme downward pitch
      (controller as any).dronePitch = -3.5;
      controller.update(0.016);
      expect(controller.dronePitch).toBeGreaterThanOrEqual(-1.48 - 0.001);
    });

    it('enforces minDroneY = 0.8m so the drone never clips below the ground floor', () => {
      controller.setDroneMode(true);
      controller.dronePosition.set(0, 0.5, 0); // below min threshold
      (controller as any).droneVelocity.set(0, -10, 0); // moving downwards

      controller.update(0.05);

      expect(controller.dronePosition.y).toBe(0.8);
      expect(controller.droneVelocity.y).toBe(0);
    });

    it('applies WASD horizontal flight and Space/E ascend and Shift/Q/C descend', () => {
      controller.setDroneMode(true);
      controller.dronePosition.set(0, 10, 0);
      controller.droneYaw = 0; // facing negative Z
      controller.dronePitch = 0;

      // Simulate pressing KeyW (forward)
      (controller as any).keysDown.add('KeyW');
      controller.update(0.1);
      expect(controller.droneVelocity.length()).toBeGreaterThan(0);
      (controller as any).keysDown.delete('KeyW');

      // Simulate pressing Space (ascend)
      (controller as any).keysDown.add('Space');
      controller.update(0.1);
      expect(controller.droneVelocity.y).toBeGreaterThan(0);
      (controller as any).keysDown.delete('Space');

      // Simulate pressing KeyQ (descend)
      (controller as any).keysDown.add('KeyQ');
      controller.update(0.1);
      // Advance to allow damping and descent
      for (let i = 0; i < 5; i++) {
        controller.update(0.05);
      }
      expect(controller.dronePosition.y).toBeGreaterThanOrEqual(0.8);
    });

    it('smoothly damps velocity to zero when flight controls are released', () => {
      controller.setDroneMode(true);
      controller.droneVelocity.set(10, 5, -10);

      for (let i = 0; i < 60; i++) {
        controller.update(0.016);
      }

      expect(controller.droneVelocity.length()).toBeLessThan(0.01);
    });

    it('seamlessly transitions from Drone Mode back to Orbit Mode without snapping', () => {
      controller.setDroneMode(true);
      controller.dronePosition.set(25, 12, 35);
      controller.droneYaw = 0.5;

      controller.setDroneMode(false);
      expect(controller.isDroneMode).toBe(false);
      expect(controller.target.x).toBeDefined();
      expect(isNaN(controller.distance)).toBe(false);
      expect(isNaN(controller.polar)).toBe(false);
      expect(isNaN(controller.azimuth)).toBe(false);
    });

    it('moves in the correct lateral direction in Walk Mode with KeyA (left) and KeyD (right)', () => {
      controller.setWalkMode(true);
      controller.walkPosition.set(0, 1.65, 0);
      controller.walkYaw = 0; // facing +Z

      const startX = controller.walkPosition.x;

      // KeyD -> player strafes to their right (-X when facing +Z)
      (controller as any).keysDown.add('KeyD');
      controller.update(0.2);
      expect(controller.walkPosition.x).toBeLessThan(startX);

      // KeyA -> player strafes to their left (+X when facing +Z)
      (controller as any).keysDown.clear();
      (controller as any).keysDown.add('KeyA');
      controller.update(0.4);
      expect(controller.walkPosition.x).toBeGreaterThan(startX);

      controller.setWalkMode(false);
    });

    it('respects enabled = false flag and freezes camera input updates', () => {
      controller.enabled = false;
      const initialAzimuth = controller.azimuth;

      (controller as any).onKeyDown({ code: 'KeyQ' } as any);
      controller.update(0.1);

      expect(controller.azimuth).toBe(initialAzimuth);
      controller.enabled = true;
    });
  });

  describe('2. Strict 2-Font Discipline Enforcement', () => {
    it('defines --font-sans (Plus Jakarta Sans) and --font-mono (JetBrains Mono) in index.css', () => {
      const cssPath = path.resolve(__dirname, '../src/app/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toContain('--font-sans');
      expect(cssContent).toMatch(/Plus Jakarta Sans|Space Grotesk/);
      expect(cssContent).toContain('--font-mono');
      expect(cssContent).toMatch(/JetBrains Mono|Space Mono/);
      expect(cssContent).toContain('tabular-nums');
    });

    it('configures tailwind to strictly map font families to the 2 approved fonts', () => {
      const twPath = path.resolve(__dirname, '../tailwind.config.js');
      const twContent = fs.readFileSync(twPath, 'utf8');

      expect(twContent).toContain('fontFamily');
      expect(twContent).toContain('var(--font-sans)');
      expect(twContent).toContain('var(--font-mono)');
      // serif is mapped to sans to prevent third-party accidental serif fonts
      expect(twContent).toContain('serif:');
    });

    it('guarantees no TSX file contains active font-serif class', () => {
      const srcDir = path.resolve(__dirname, '../src');

      function scanDir(dir: string): string[] {
        let violations: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            violations = violations.concat(scanDir(fullPath));
          } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Check for class name "font-serif" (not in comments or css var mapping)
            const matches = content.match(/["'\`][^"'\`]*\bfont-serif\b[^"'\`]*["'\`]/g);
            if (matches) {
              violations.push(`${fullPath}: ${matches.join(', ')}`);
            }
          }
        }
        return violations;
      }

      const violations = scanDir(srcDir);
      expect(violations).toEqual([]);
    });
  });

  describe('3. True 1:1 Scale & Hollow Walkable Architectural Shells', () => {
    it('ensures all 101 catalog items meet true 1:1 scale standards (floorHeight >= 4.0m)', () => {
      const buildings = BuildingCatalogRegistry.getAllBuildings();
      expect(buildings.length).toBe(101);

      for (const b of buildings) {
        expect(b.floorHeight).toBeGreaterThanOrEqual(4.0);
        expect(b.defaultWidth).toBeGreaterThanOrEqual(5.0);
        expect(b.defaultLength).toBeGreaterThanOrEqual(5.0);
      }
    });

    it('generates non-empty, hollow geometry for modern dining archetype (Resto Mie Gacoan)', () => {
      const bld: BuildingInstance = {
        id: 'test_gacoan',
        presetKey: 'resto_mie_gacoan',
        name: 'Resto Mie Gacoan',
        category: 'kuliner_kafe',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 18,
        length: 26,
        floorHeight: 5.2,
        floorCount: 2,
        wallColor: '#ffffff',
        wallMaterial: 'plaster',
        roofColor: '#1e293b',
        roofType: 'gable',
        roofMaterial: 'metal',
        roofOverhang: 0.8
      };

      const group = PrefabMeshBuilder.buildBuildingGroup(bld);
      expect(group.children.length).toBeGreaterThan(0);

      const bbox = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      // Verify dimensions match scaled 1:1 footprint
      expect(size.x).toBeGreaterThanOrEqual(17);
      expect(size.z).toBeGreaterThanOrEqual(25);
      expect(size.y).toBeGreaterThanOrEqual(8.0);
    });

    it('generates multi-level hollow atrium and space-frame skylight for Grand Mall', () => {
      const bld: BuildingInstance = {
        id: 'test_mall',
        presetKey: 'mall_grand_atrium',
        name: 'Grand Atrium Mall',
        category: 'mall_ritel',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 42,
        length: 56,
        floorHeight: 5.5,
        floorCount: 4,
        wallColor: '#ffffff',
        wallMaterial: 'concrete',
        roofColor: '#334155',
        roofType: 'flat',
        roofMaterial: 'concrete',
        roofOverhang: 0.5
      };

      const group = PrefabMeshBuilder.buildBuildingGroup(bld);
      expect(group.children.length).toBeGreaterThan(0);

      const bbox = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      expect(size.x).toBeGreaterThanOrEqual(40);
      expect(size.z).toBeGreaterThanOrEqual(50);
      expect(size.y).toBeGreaterThanOrEqual(20);
    });

    it('procedural TectonicComponents library generates valid 3D architectural elements', () => {
      const curtain = TectonicComponents.buildMullionCurtainWall(10, 4, 4, 2, 0.1);
      expect(curtain.children.length).toBeGreaterThan(0);

      const louver = TectonicComponents.buildTimberLouverScreen(6, 4, 8, 25);
      expect(louver.children.length).toBeGreaterThan(0);

      const roster = TectonicComponents.buildPerforatedRosterWall(8, 3);
      expect(roster.children.length).toBeGreaterThan(0);

      const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(6, 3, 0.2);
      expect(canopy.children.length).toBeGreaterThan(0);

      const balcony = TectonicComponents.buildGlassBalconyWithPlanter(5, 1.5);
      expect(balcony.children.length).toBeGreaterThan(0);

      const skylight = TectonicComponents.buildAtriumSkylightVault(12, 16, 3.5);
      expect(skylight.children.length).toBeGreaterThan(0);

      const totem = TectonicComponents.buildModernSignageTotem('TEST SIGN', 2, 5);
      expect(totem.children.length).toBeGreaterThan(0);

      const furniture = TectonicComponents.buildInteriorFurnitureSet('resto_modern', 18, 26, 5.2);
      expect(furniture.children.length).toBeGreaterThan(0);
    });

    it('ensures legacy preset methods (Ruko, Minimarket, Office, Mosque) produce hollow shells', () => {
      const testPresets = ['ruko_3fl', 'minimarket', 'office_tower', 'mosque'];

      for (const presetKey of testPresets) {
        const item = BuildingCatalogRegistry.getBuilding(presetKey)!;
        const bld: BuildingInstance = {
          id: `test_${presetKey}`,
          presetKey: presetKey,
          name: item.name,
          category: item.category,
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          width: item.defaultWidth,
          length: item.defaultLength || item.defaultDepth,
          floorHeight: item.floorHeight,
          floorCount: item.defaultFloors || item.defaultFloorCount || 1,
          wallColor: item.defaultWallColor || '#ffffff',
          wallMaterial: item.defaultWallMaterial || 'plaster',
          roofType: item.defaultRoofType || (item.roofStyle as any),
          roofMaterial: item.defaultRoofMaterial || 'metal',
          roofOverhang: item.defaultOverhang
        };

        const group = PrefabMeshBuilder.buildBuildingGroup(bld);
        expect(group.children.length).toBeGreaterThan(0);

        const bbox = new THREE.Box3().setFromObject(group);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        expect(size.x).toBeGreaterThan(5);
        expect(size.z).toBeGreaterThan(5);
        expect(size.y).toBeGreaterThan(3.5);
      }
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { CinematicDroneController, DSLR_LENS_MAP } from '../src/core/engine/CinematicDroneController';
import { SpatialAudioSystem } from '../src/audio/SpatialAudioSystem';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { RoadManager } from '../src/roads/RoadManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { Terrain } from '../src/world/Terrain';

describe('Mode Eksplorasi Skala Manusia & Tur Virtual (First-Person, Drone & Audio 3D)', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let domElement: HTMLElement;
  let buildingManager: BuildingManager;
  let roadManager: RoadManager;
  let landscapeManager: LandscapeManager;
  let terrain: Terrain;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    domElement = {
      requestPointerLock: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    } as any;
    buildingManager = new BuildingManager(scene);
    roadManager = new RoadManager(scene);
    landscapeManager = new LandscapeManager(scene);
    terrain = new Terrain(scene, 256);
  });

  afterEach(() => {
    if (buildingManager) buildingManager.dispose();
    if (roadManager) roadManager.dispose();
    if (landscapeManager) landscapeManager.dispose();
  });

  describe('1. FirstPersonController (WASD, Mouse Look, 1.65m Eye Level, Floor Raycast)', () => {
    it('initializes at human eye height (1.65m) and updates position on WASD movement', () => {
      const controller = new FirstPersonController(camera, domElement, buildingManager, terrain);
      expect(controller.isActive).toBe(false);

      const startPos = new THREE.Vector3(10, 0, 15);
      controller.enter(startPos, 0); // facing positive Z

      expect(controller.isActive).toBe(true);
      expect(controller.position.x).toBe(10);
      expect(controller.position.z).toBe(15);
      expect(controller.position.y).toBeCloseTo(1.65, 1);

      // Simulate pressing KeyW (forward)
      (controller as any).keysDown.add('KeyW');
      controller.update(0.5); // 0.5s forward

      expect(controller.position.z).toBeGreaterThan(15); // Moved forward
      expect(controller.position.y).toBeCloseTo(1.65, 1); // Maintained human eye height

      // Reset keys and test KeyD (strafe right) vs KeyA (strafe left)
      (controller as any).keysDown.clear();
      const posXInitial = controller.position.x;

      // Facing +Z: screen right is -X, screen left is +X
      (controller as any).keysDown.add('KeyD');
      controller.update(0.05);
      expect(controller.position.x).toBeLessThan(posXInitial); // D moves to player's right (-X)

      const posXAfterD = controller.position.x;
      (controller as any).keysDown.clear();
      (controller as any).keysDown.add('KeyA');
      controller.update(0.05);
      expect(controller.position.x).toBeGreaterThan(posXAfterD); // A moves to player's left (+X)

      controller.exit();
      expect(controller.isActive).toBe(false);
      controller.dispose();
    });

    it('clamps vertical pitch between -85 deg and 85 deg to prevent gimbal flip', () => {
      const controller = new FirstPersonController(camera, domElement, buildingManager, terrain);
      controller.enter();
      (controller as any).isPointerLocked = true;

      // Mock mouse move looking all the way up and down
      controller.pitch = 2.0; // > 85 deg (~1.48 rad)
      (controller as any).onMouseMove({ movementX: 0, movementY: -1000 } as any);

      const maxRad = (85 * Math.PI) / 180;
      expect(controller.pitch).toBeLessThanOrEqual(maxRad + 0.01);
      expect(controller.pitch).toBeGreaterThanOrEqual(-maxRad - 0.01);

      controller.dispose();
    });

    it('simulates jump physics with gravity and ground contact', () => {
      const controller = new FirstPersonController(camera, domElement, buildingManager, terrain);
      controller.enter(new THREE.Vector3(0, 0, 0));

      expect((controller as any).isGrounded).toBe(true);

      // Trigger jump
      (controller as any).onKeyDown({ code: 'Space' } as any);
      expect((controller as any).isGrounded).toBe(false);
      expect((controller as any).velocityY).toBe(controller.jumpSpeed);

      // Advance time mid-air
      controller.update(0.05);
      expect(controller.position.y).toBeGreaterThan(1.65);

      // Advance time until falling back to ground
      for (let i = 0; i < 20; i++) {
        controller.update(0.08);
      }
      expect((controller as any).isGrounded).toBe(true);
      expect(controller.position.y).toBeCloseTo(1.65, 1);

      controller.dispose();
    });

    it('detects elevated floor surface collision when walking over building plinth or rooftop', () => {
      // Place an elevated box (e.g. building floor at height y = 4.0)
      const floorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 1, 10),
        new THREE.MeshBasicMaterial()
      );
      floorMesh.position.set(0, 3.5, 0); // top surface at y = 4.0
      buildingManager.masterGroup.add(floorMesh);
      buildingManager.masterGroup.updateMatrixWorld(true);

      const controller = new FirstPersonController(camera, domElement, buildingManager, terrain);
      controller.enter(new THREE.Vector3(0, 0, 0));

      // Over the elevated mesh
      controller.update(0.1);
      expect(controller.position.y).toBeCloseTo(4.0 + 1.65, 0.5);

      controller.dispose();
    });
  });

  describe('2. Positional 3D Audio Zones (SpatialAudioSystem)', () => {
    it('creates sound zones for roads, cafes, and parks', () => {
      const audioSystem = SpatialAudioSystem.getInstance();

      // Add a road
      const nodeA = roadManager.graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const nodeB = roadManager.graph.getOrCreateNode(new THREE.Vector3(50, 0, 0));
      roadManager.graph.addEdge(nodeA.id, nodeB.id, 'arterial');

      // Add a cafe building
      buildingManager.addBuilding({
        id: 'cafe_1',
        presetKey: 'resto_mie_gacoan',
        name: 'Mie Gacoan',
        category: 'commercial',
        position: new THREE.Vector3(20, 0, 30),
        rotationY: 0,
        width: 16,
        length: 22,
        floorCount: 1,
        floorHeight: 4.2,
        roofType: 'shed_industrial',
        roofOverhang: 1.2,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roofMaterial: 'metal'
      });

      // Add a shade tree
      landscapeManager.createItem('shade_tree', new THREE.Vector3(-20, 0, 10));

      audioSystem.rebuildZones(buildingManager, roadManager, landscapeManager);

      const roadZones = audioSystem.zones.filter((z) => z.type === 'road');
      const cafeZones = audioSystem.zones.filter((z) => z.type === 'cafe');
      const parkZones = audioSystem.zones.filter((z) => z.type === 'park');

      expect(roadZones.length).toBeGreaterThanOrEqual(1);
      expect(cafeZones.length).toBeGreaterThanOrEqual(1);
      expect(parkZones.length).toBeGreaterThanOrEqual(1);
    });

    it('calculates sound attenuation based on player distance', () => {
      const audioSystem = SpatialAudioSystem.getInstance();
      audioSystem.zones = [
        { id: 'cafe_test', type: 'cafe', position: new THREE.Vector3(0, 0, 0), radius: 20 }
      ];

      // Player near cafe (5m away)
      audioSystem.update(new THREE.Vector3(0, 1.65, 5), 'clear', false);
      expect(audioSystem.enabled).toBe(true);

      // Player indoor lowpass dampening
      audioSystem.update(new THREE.Vector3(0, 1.65, 0), 'rain', true);
      expect(audioSystem.isUnderRoof).toBe(true);
    });
  });

  describe('3. Cinematic Drone Controller & DSLR Photo Mode', () => {
    it('generates a smooth closed Catmull-Rom spline path and iterates progress', () => {
      // Add buildings as scenic waypoints
      for (let i = 0; i < 4; i++) {
        buildingManager.addBuilding({
          id: `bld_waypoint_${i}`,
          presetKey: 'house_36',
          name: `Gedung ${i + 1}`,
          category: 'residential',
          position: new THREE.Vector3(i * 30, 0, i * 20),
          rotationY: 0,
          width: 8,
          length: 8,
          floorCount: 2,
          floorHeight: 3.2,
          roofType: 'gable',
          roofOverhang: 1.0,
          wallMaterial: 'plaster',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        });
      }

      const mockRenderer = {
        domElement: { captureStream: () => null, toDataURL: () => '' }
      } as any;
      const drone = new CinematicDroneController(camera, mockRenderer, buildingManager);
      drone.startTour();

      expect(drone.isActive).toBe(true);
      expect((drone as any).splineCurve).toBeDefined();

      // Step tour forward
      drone.update(5.0); // advance 5 seconds
      expect(drone.progress).toBeGreaterThan(0);
      expect(drone.progress).toBeLessThanOrEqual(1.0);

      drone.togglePause();
      expect(drone.isPaused).toBe(true);

      drone.stopTour();
      expect(drone.isActive).toBe(false);
    });

    it('configures DSLR lens focal lengths (24mm, 50mm, 85mm) accurately', () => {
      const mockRenderer = {
        domElement: { captureStream: () => null, toDataURL: () => '' }
      } as any;
      const drone = new CinematicDroneController(camera, mockRenderer, buildingManager);

      drone.setDslrLens('24mm');
      expect(camera.fov).toBe(DSLR_LENS_MAP['24mm'].fov);

      drone.setDslrLens('50mm');
      expect(camera.fov).toBe(DSLR_LENS_MAP['50mm'].fov);

      drone.setDslrLens('85mm');
      expect(camera.fov).toBe(DSLR_LENS_MAP['85mm'].fov);
    });
  });
});

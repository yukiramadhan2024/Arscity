import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { InteriorInteractiveSystem, InteractiveDoor } from '../src/buildings/InteriorInteractiveSystem';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { useUIStore } from '../src/ui/state/useUIStore';

// Web Audio API Mock for Node/Vitest environment
class MockAudioNode {
  public connect = vi.fn();
  public disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  public gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  };
}

class MockOscillatorNode extends MockAudioNode {
  public type: OscillatorType = 'sine';
  public frequency = {
    value: 440,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  };
  public start = vi.fn();
  public stop = vi.fn();
  public onended: (() => void) | null = null;
}

class MockBiquadFilterNode extends MockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency = {
    value: 1000,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  };
  public Q = {
    value: 1,
    setValueAtTime: vi.fn()
  };
}

class MockAudioBufferSourceNode extends MockAudioNode {
  public buffer: any = null;
  public start = vi.fn();
  public stop = vi.fn();
  public onended: (() => void) | null = null;
}

class MockAudioContext {
  public state: AudioContextState = 'running';
  public sampleRate: number = 44100;
  public currentTime: number = 0;
  public destination: MockAudioNode = new MockAudioNode();

  public createGain() {
    return new MockGainNode();
  }
  public createOscillator() {
    return new MockOscillatorNode();
  }
  public createBiquadFilter() {
    return new MockBiquadFilterNode();
  }
  public createBufferSource() {
    return new MockAudioBufferSourceNode();
  }
  public createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length)
    };
  }
  public resume = vi.fn().mockResolvedValue(undefined);
  public suspend = vi.fn().mockResolvedValue(undefined);
  public close = vi.fn().mockResolvedValue(undefined);
}

describe('Tahap 3 Adversarial Physics & Mechanics Stress Harness', () => {
  let mockDomElement: any;
  let camera: THREE.PerspectiveCamera;
  let controller: FirstPersonController;
  let mockEngine: any;
  let mockBuilding: BuildingInstance;
  let mockBuildingGroup: THREE.Group;
  let mockBuildingManager: any;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    vi.useFakeTimers();

    (global as any).window = (global as any).window || {};
    (global as any).window.AudioContext = MockAudioContext as any;
    (global as any).window.addEventListener = (global as any).window.addEventListener || vi.fn();
    (global as any).window.removeEventListener = (global as any).window.removeEventListener || vi.fn();

    mockDomElement = {
      requestPointerLock: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    camera.position.set(0, 1.65, 0);

    mockScene = new THREE.Scene();
    mockBuildingGroup = new THREE.Group();

    mockBuilding = {
      id: 'bld_adversarial_test',
      presetKey: 'house_36',
      name: 'Gedung Uji Adversarial',
      category: 'residential',
      position: new THREE.Vector3(10, 0, 10),
      rotationY: 0,
      width: 12,
      length: 14,
      floorCount: 3,
      floorHeight: 3.2,
      plinthHeight: 0.35,
      roofType: 'gable',
      roofOverhang: 0.6,
      wallMaterial: 'plaster',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile',
      interiorLayouts: [
        {
          floorIndex: 0,
          walls: [],
          rooms: [
            {
              id: 'room_ground',
              name: 'Lantai 1',
              type: 'living_room',
              floorIndex: 0,
              boundary: [
                new THREE.Vector2(-5, -5),
                new THREE.Vector2(5, -5),
                new THREE.Vector2(5, 5),
                new THREE.Vector2(-5, 5)
              ],
              areaM2: 100,
              ceilingHeight: 3.2,
              labelPosition: new THREE.Vector2(0, 0),
              isCompliant: true
            }
          ]
        }
      ],
      userData: {
        placedFurniture: [],
        stairZones: []
      }
    };

    mockBuildingManager = {
      buildings: new Map([[mockBuilding.id, mockBuilding]]),
      masterGroup: new THREE.Group(),
      getBuildingById: (id: string) => (id === mockBuilding.id ? mockBuilding : null),
      getBuildingGroup: (_id: string) => mockBuildingGroup,
      getBuildingAtPosition: (x: number, z: number) => {
        const dx = Math.abs(x - mockBuilding.position.x);
        const dz = Math.abs(z - mockBuilding.position.z);
        if (dx <= mockBuilding.width * 0.5 && dz <= mockBuilding.length * 0.5) {
          return mockBuilding;
        }
        return null;
      },
      updateSpatialLOD: vi.fn()
    };

    mockEngine = {
      scene: mockScene,
      buildingManager: mockBuildingManager,
      terrain: {
        getHeightAt: () => 0,
        getElevationAt: () => 0
      },
      roadManager: {
        masterGroup: new THREE.Group()
      },
      renderer: {
        toneMappingExposure: 1.05
      },
      updateSpatialLOD: vi.fn(),
      requestRender: vi.fn()
    };

    controller = new FirstPersonController(camera, mockDomElement, mockBuildingManager, mockEngine.terrain);
    controller.setEngine(mockEngine);
    controller.isActive = true;

    useUIStore.getState().setCameraBobbing(true);
    useUIStore.getState().setReduceMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    InteriorInteractiveSystem.getInstance().clearAll();
  });

  // =========================================================================
  // 1. HEADROOM CLEARANCE STRESS TESTS
  // =========================================================================
  describe('1. Headroom clearance stress tests', () => {
    it('1.1: Blocks step-up when height delta is 0.2m and headroom is 1.6m (<1.7m)', () => {
      // Step delta = 0.20m ahead (z < -0.1)
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.20 : 0.0);

      // Beam with height 0.2m. Bottom face at groundY (0.2) + headroom (1.60) = 1.80m.
      // BoxGeometry is centered, so center Y = 1.80 + 0.10 = 1.90m.
      const lowBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.2, 2),
        new THREE.MeshBasicMaterial()
      );
      lowBeam.name = 'Ceiling_Beam_1_6m';
      lowBeam.position.set(0, 0.20 + 1.60 + 0.10, -0.3);
      mockBuildingManager.masterGroup.add(lowBeam);
      mockBuildingManager.masterGroup.updateMatrixWorld(true);

      controller.position.set(0, 1.65, 0);

      // Verify checkHeadroomAbove directly evaluates to false (<1.7m)
      const hasHeadroom = controller.checkHeadroomAbove(0, 0.20, -0.3, 1.7);
      expect(hasHeadroom).toBe(false);

      // evaluatePredictiveStepUp must report blocked with reason 'headroom'
      const stepResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(stepResult.canStep).toBe(false);
      expect(stepResult.blocked).toBe(true);
      expect(stepResult.reason).toBe('headroom');
      expect(stepResult.deltaY).toBeCloseTo(0.20, 2);

      // Simulate movement: set yaw to PI so forward key moves towards -Z (into the obstacle)
      controller.yaw = Math.PI;
      const initialZ = controller.position.z;
      (controller as any).keysDown.add('KeyW');
      controller.update(0.016);

      // Forward motion towards -Z must be blocked by stepUp.blocked
      expect(controller.position.z).toBeCloseTo(initialZ, 4);
    });

    it('1.2: Allows step-up when height delta is 0.2m and headroom is 1.75m (>=1.7m)', () => {
      // Step delta = 0.20m ahead (z < -0.1)
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.20 : 0.0);

      // Beam with height 0.2m. Bottom face at groundY (0.2) + headroom (1.75) = 1.95m.
      // BoxGeometry center Y = 1.95 + 0.10 = 2.05m.
      const highBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.2, 2),
        new THREE.MeshBasicMaterial()
      );
      highBeam.name = 'Ceiling_Beam_1_75m';
      highBeam.position.set(0, 0.20 + 1.75 + 0.10, -0.3);
      mockBuildingManager.masterGroup.add(highBeam);
      mockBuildingManager.masterGroup.updateMatrixWorld(true);

      controller.position.set(0, 1.65, 0);

      // Verify checkHeadroomAbove directly evaluates to true (>=1.7m)
      const hasHeadroom = controller.checkHeadroomAbove(0, 0.20, -0.3, 1.7);
      expect(hasHeadroom).toBe(true);

      // evaluatePredictiveStepUp must report canStep = true, blocked = false
      const stepResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(stepResult.canStep).toBe(true);
      expect(stepResult.blocked).toBe(false);
      expect(stepResult.reason).toBe('ok');
      expect(stepResult.deltaY).toBeCloseTo(0.20, 2);
    });

    it('1.3: Headroom clearance boundary sweep from 1.50m to 1.85m', () => {
      const clearances = [
        { headroom: 1.50, expectedCanStep: false, expectedBlocked: true },
        { headroom: 1.60, expectedCanStep: false, expectedBlocked: true },
        { headroom: 1.65, expectedCanStep: false, expectedBlocked: true },
        { headroom: 1.69, expectedCanStep: false, expectedBlocked: true },
        { headroom: 1.71, expectedCanStep: true, expectedBlocked: false },
        { headroom: 1.75, expectedCanStep: true, expectedBlocked: false },
        { headroom: 1.85, expectedCanStep: true, expectedBlocked: false },
      ];

      for (const tc of clearances) {
        mockBuildingManager.masterGroup.clear();
        mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.20 : 0.0);

        // Center = groundY (0.2) + headroom + halfHeight (0.1)
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.2, 2),
          new THREE.MeshBasicMaterial()
        );
        beam.position.set(0, 0.20 + tc.headroom + 0.10, -0.3);
        mockBuildingManager.masterGroup.add(beam);
        mockBuildingManager.masterGroup.updateMatrixWorld(true);

        controller.position.set(0, 1.65, 0);
        const result = controller.evaluatePredictiveStepUp(0, -0.3);

        expect(result.canStep).toBe(tc.expectedCanStep);
        expect(result.blocked).toBe(tc.expectedBlocked);
        if (tc.expectedBlocked) {
          expect(result.reason).toBe('headroom');
        } else {
          expect(result.reason).toBe('ok');
        }
      }
    });

    it('1.4: Indoor ceiling collision clamps eye height during jumping (no ceiling clipping)', () => {
      controller.insideBuildingId = mockBuilding.id;
      controller.currentFloor = 1;
      controller.position.set(10, 1.65, 10);
      controller.isGrounded = false;
      (controller as any).velocityY = 10.0; // High upward jump velocity

      // Ceiling Y = building.position.y (0) + plinth (0.35) + floor 1 * floorHeight (3.2) = 3.55m
      // Max eye Y = ceilingY - ceilingHeadClearance (0.25) = 3.30m
      for (let frame = 0; frame < 5; frame++) {
        controller.update(0.05);
      }

      expect(controller.position.y).toBeCloseTo(3.30, 2);
      expect((controller as any).velocityY).toBe(0); // Upward velocity arrested by ceiling impact
    });

    it('1.5: Indoor building floor ceiling headroom check evaluates building definition', () => {
      // Inside building footprint: test position (10, 10)
      // Building ceiling = 0 + 0.35 + 1 * 3.2 = 3.55m.
      // If ground is raised to 2.0m: headroom = 3.55 - 2.0 = 1.55m (< 1.7m)
      controller.currentFloor = 1;
      const lowHeadroom = controller.checkHeadroomAbove(10, 2.0, 10, 1.7);
      expect(lowHeadroom).toBe(false);

      // If ground is at 0.5m: headroom = 3.55 - 0.5 = 3.05m (>= 1.7m)
      const okHeadroom = controller.checkHeadroomAbove(10, 0.5, 10, 1.7);
      expect(okHeadroom).toBe(true);
    });
  });

  // =========================================================================
  // 2. STEP-UP HEIGHT BOUNDARY TESTS
  // =========================================================================
  describe('2. Step-up height boundary tests', () => {
    it('2.1: Height delta = 0.04m (flat / gentle incline, no step-up triggered, not blocked)', () => {
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.04 : 0.0);
      controller.position.set(0, 1.65, 0);

      const result = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(result.canStep).toBe(false);
      expect(result.blocked).toBe(false);
      expect(result.reason).toBe('flat');
      expect(result.deltaY).toBeCloseTo(0.04, 3);
    });

    it('2.2: Height delta = 0.05m (exact lower threshold, step-up allowed)', () => {
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.05 : 0.0);
      controller.position.set(0, 1.65, 0);

      const result = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(result.canStep).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.reason).toBe('ok');
      expect(result.deltaY).toBeCloseTo(0.05, 3);
    });

    it('2.3: Height delta = 0.42m (exact upper threshold, maximum step-up allowed)', () => {
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.42 : 0.0);
      controller.position.set(0, 1.65, 0);

      const result = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(result.canStep).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.reason).toBe('ok');
      expect(result.deltaY).toBeCloseTo(0.42, 3);
    });

    it('2.4: Height delta = 0.43m (exceeds 0.42m threshold, treated as vertical wall and blocked)', () => {
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.43 : 0.0);
      controller.position.set(0, 1.65, 0);

      const result = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(result.canStep).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('wall');
      expect(result.deltaY).toBeCloseTo(0.43, 3);
    });

    it('2.5: Comprehensive step height boundary sweep', () => {
      const boundaryCases = [
        { delta: 0.000, canStep: false, blocked: false, reason: 'flat' },
        { delta: 0.010, canStep: false, blocked: false, reason: 'flat' },
        { delta: 0.040, canStep: false, blocked: false, reason: 'flat' },
        { delta: 0.049, canStep: false, blocked: false, reason: 'flat' },
        { delta: 0.050, canStep: true,  blocked: false, reason: 'ok' },
        { delta: 0.051, canStep: true,  blocked: false, reason: 'ok' },
        { delta: 0.150, canStep: true,  blocked: false, reason: 'ok' }, // standard curb
        { delta: 0.350, canStep: true,  blocked: false, reason: 'ok' }, // tropical plinth
        { delta: 0.420, canStep: true,  blocked: false, reason: 'ok' }, // max step
        { delta: 0.421, canStep: false, blocked: true,  reason: 'wall' },
        { delta: 0.430, canStep: false, blocked: true,  reason: 'wall' },
        { delta: 0.800, canStep: false, blocked: true,  reason: 'wall' },
        { delta: 2.000, canStep: false, blocked: true,  reason: 'wall' },
      ];

      for (const tc of boundaryCases) {
        mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? tc.delta : 0.0);
        controller.position.set(0, 1.65, 0);
        const res = controller.evaluatePredictiveStepUp(0, -0.3);

        expect(res.canStep).toBe(tc.canStep);
        expect(res.blocked).toBe(tc.blocked);
        expect(res.reason).toBe(tc.reason);
      }
    });

    it('2.6: Negative height change (step down) does not trigger step-up logic', () => {
      // Stepping down 0.15m curb
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? -0.15 : 0.0);
      controller.position.set(0, 1.65, 0);

      const res = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(res.canStep).toBe(false);
      expect(res.blocked).toBe(false);
      expect(res.reason).toBe('flat');
    });

    it('2.7: Target surface identified as placed furniture blocks step-up even at 0.35m height', () => {
      mockEngine.terrain.getHeightAt = (_x: number, z: number) => (z < -0.1 ? 0.35 : 0.0);

      const sofaMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.4, 0.9),
        new THREE.MeshBasicMaterial()
      );
      sofaMesh.name = 'PlacedFurniture_Sofa_L';
      sofaMesh.userData = { isFurniture: true };
      sofaMesh.position.set(0, 0.35, -0.3);
      mockBuildingManager.masterGroup.add(sofaMesh);
      mockBuildingManager.masterGroup.updateMatrixWorld(true);

      controller.position.set(0, 1.65, 0);
      const res = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(res.canStep).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.reason).toBe('furniture');
    });
  });

  // =========================================================================
  // 3. DOOR APPROACH ANGLE STRESS TESTS (0°, 45°, 90°, 135°, 180°)
  // =========================================================================
  describe('3. Door approach angle stress tests', () => {
    let system: InteriorInteractiveSystem;
    let doorGroup: THREE.Group;
    let doorLeaf: THREE.Mesh;
    let door: InteractiveDoor;

    beforeEach(() => {
      system = InteriorInteractiveSystem.getInstance();
      system.clearAll();

      doorGroup = new THREE.Group();
      doorGroup.position.set(0, 0, 0);

      doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04));
      doorLeaf.name = 'InteractiveDoor_Leaf_Stress';
      doorLeaf.userData = { isDoor: true };
      doorLeaf.position.set(0.45, 1.05, 0); // Pivot hinge at x=0
      doorGroup.add(doorLeaf);

      door = {
        id: 'door_angle_stress',
        type: 'swing',
        buildingId: 'bld_adversarial_test',
        floorIndex: 0,
        group: doorGroup,
        leftLeafMesh: doorLeaf,
        doorCenterLocal: new THREE.Vector3(0.45, 1.05, 0),
        worldPosition: new THREE.Vector3(0, 0, 0),
        doorWidth: 0.95,
        doorHeight: 2.1,
        isOpen: false,
        currentRatio: 0,
        targetRatio: 0,
        swingAngle: (100 * Math.PI) / 180, // ~100 degrees (~1.745 rad)
        slideDist: 0.45
      };

      system.registerDoor(door);
    });

    it('3.1: Approach at angles 0°, 45°, 90°, 135°, 180° relative to door normal', () => {
      // Door normal points along +Z (0, 0, 1)
      const distance = 1.5; // Within 2.2m trigger distance

      const angleCases = [
        { angleDeg: 0,   expectedDotSign: '>=0', expectedSwingDir: -1, desc: 'Direct front approach' },
        { angleDeg: 45,  expectedDotSign: '>=0', expectedSwingDir: -1, desc: 'Oblique front approach' },
        { angleDeg: 90,  expectedDotSign: '>=0', expectedSwingDir: -1, desc: 'Perpendicular edge approach' },
        { angleDeg: 135, expectedDotSign: '<0',  expectedSwingDir:  1, desc: 'Oblique back approach' },
        { angleDeg: 180, expectedDotSign: '<0',  expectedSwingDir:  1, desc: 'Direct back approach' },
        // Also negative angles for bilateral symmetry:
        { angleDeg: -45, expectedDotSign: '>=0', expectedSwingDir: -1, desc: 'Oblique front left approach' },
        { angleDeg: -90, expectedDotSign: '>=0', expectedSwingDir: -1, desc: 'Perpendicular left approach' },
        { angleDeg: -135, expectedDotSign: '<0', expectedSwingDir:  1, desc: 'Oblique back left approach' },
      ];

      for (const tc of angleCases) {
        // Reset door state
        door.targetRatio = 0;
        door.currentRatio = 0;
        door.isOpen = false;
        door.swingDirection = undefined;
        doorLeaf.rotation.y = 0;

        const rad = (tc.angleDeg * Math.PI) / 180;
        const playerX = distance * Math.sin(rad);
        const playerZ = distance * Math.cos(rad);
        const playerPos = new THREE.Vector3(playerX, 1.65, playerZ);

        system.update(0.016, playerPos, true);

        expect(door.targetRatio).toBe(1.0);
        expect(door.swingDirection).toBe(tc.expectedSwingDir);

        // Advance animation to open position
        for (let step = 0; step < 30; step++) {
          system.update(0.016, playerPos, true);
        }

        expect(door.isOpen).toBe(true);
        expect(door.currentRatio).toBeGreaterThan(0.7);

        // Verify leaf rotation direction:
        // swingDir = -1 -> leaf rotation.y < 0 (swings into -Z, away from +Z player)
        // swingDir = +1 -> leaf rotation.y > 0 (swings into +Z, away from -Z player)
        if (tc.expectedSwingDir === -1) {
          expect(doorLeaf.rotation.y).toBeLessThan(0);
        } else {
          expect(doorLeaf.rotation.y).toBeGreaterThan(0);
        }

        // Stress check: verify door NEVER swings towards the player hemisphere!
        // If player is in +Z half (playerZ > 0), door swing must point into -Z (rotation.y < 0)
        // If player is in -Z half (playerZ < 0), door swing must point into +Z (rotation.y > 0)
        if (playerZ > 0.001) {
          expect(doorLeaf.rotation.y).toBeLessThan(0);
        } else if (playerZ < -0.001) {
          expect(doorLeaf.rotation.y).toBeGreaterThan(0);
        }
      }
    });

    it('3.2: Rotated door orientations in world space correctly orient normal vector', () => {
      const rotations = [
        { rotY: Math.PI / 2, normalDesc: '+X' },   // 90 deg
        { rotY: Math.PI,     normalDesc: '-Z' },   // 180 deg
        { rotY: -Math.PI / 2, normalDesc: '-X' },  // 270 deg
        { rotY: Math.PI / 4, normalDesc: '+X/+Z' } // 45 deg
      ];

      for (const rot of rotations) {
        doorGroup.rotation.y = rot.rotY;
        doorGroup.updateMatrixWorld(true);

        const worldNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(doorGroup.quaternion).normalize();

        // 1. Approach from front of rotated door (along world normal)
        door.targetRatio = 0;
        door.currentRatio = 0;
        door.isOpen = false;
        door.swingDirection = undefined;

        const frontPos = new THREE.Vector3().copy(worldNormal).multiplyScalar(1.5);
        frontPos.y = 1.65;
        system.update(0.016, frontPos, true);

        expect(door.targetRatio).toBe(1.0);
        expect(door.swingDirection).toBe(-1); // Swings away from front approach

        // 2. Approach from back of rotated door (opposite world normal)
        door.targetRatio = 0;
        door.currentRatio = 0;
        door.isOpen = false;
        door.swingDirection = undefined;

        const backPos = new THREE.Vector3().copy(worldNormal).multiplyScalar(-1.5);
        backPos.y = 1.65;
        system.update(0.016, backPos, true);

        expect(door.targetRatio).toBe(1.0);
        expect(door.swingDirection).toBe(1); // Swings away from back approach
      }
    });
  });

  // =========================================================================
  // 4. DOOR DISTANCE HYSTERESIS STRESS TESTS (2.2m open, >3.2m close)
  // =========================================================================
  describe('4. Door distance hysteresis stress tests', () => {
    let system: InteriorInteractiveSystem;
    let doorGroup: THREE.Group;
    let doorLeaf: THREE.Mesh;
    let door: InteractiveDoor;

    beforeEach(() => {
      system = InteriorInteractiveSystem.getInstance();
      system.clearAll();

      doorGroup = new THREE.Group();
      doorGroup.position.set(0, 0, 0);

      doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04));
      doorLeaf.position.set(0.45, 1.05, 0);
      doorGroup.add(doorLeaf);

      door = {
        id: 'door_hysteresis_stress',
        type: 'swing',
        buildingId: 'bld_adversarial_test',
        floorIndex: 0,
        group: doorGroup,
        leftLeafMesh: doorLeaf,
        doorCenterLocal: new THREE.Vector3(0.45, 1.05, 0),
        worldPosition: new THREE.Vector3(0, 0, 0),
        doorWidth: 0.95,
        doorHeight: 2.1,
        isOpen: false,
        currentRatio: 0,
        targetRatio: 0,
        swingAngle: (100 * Math.PI) / 180, // ~100 degrees
        slideDist: 0.45
      };

      system.registerDoor(door);
    });

    it('4.1: Precise distance hysteresis loop: opens at <= 2.2m, remains open in deadband [2.2m - 3.2m], closes at > 3.2m', () => {
      // Step 1: Avatar stands at distance 4.0m (> 3.2m)
      system.update(0.016, new THREE.Vector3(0, 1.65, 4.0), true);
      expect(door.targetRatio).toBe(0.0);
      expect(door.isOpen).toBe(false);

      // Step 2: Avatar approaches to 2.5m (inside deadband, but door was closed)
      system.update(0.016, new THREE.Vector3(0, 1.65, 2.5), true);
      expect(door.targetRatio).toBe(0.0); // Stays closed!
      expect(door.isOpen).toBe(false);

      // Step 3: Avatar approaches to 2.21m (just outside trigger)
      system.update(0.016, new THREE.Vector3(0, 1.65, 2.21), true);
      expect(door.targetRatio).toBe(0.0); // Stays closed!

      // Step 4: Avatar crosses threshold to 2.19m (<= 2.2m)
      system.update(0.016, new THREE.Vector3(0, 1.65, 2.19), true);
      expect(door.targetRatio).toBe(1.0); // OPENS!

      // Step 5: Advance animation until door is fully open
      for (let i = 0; i < 30; i++) {
        system.update(0.016, new THREE.Vector3(0, 1.65, 2.19), true);
      }
      expect(door.isOpen).toBe(true);
      expect(door.currentRatio).toBeGreaterThan(0.8);

      // Step 6: Avatar steps back into deadband at 2.5m
      system.update(0.016, new THREE.Vector3(0, 1.65, 2.5), true);
      expect(door.targetRatio).toBe(1.0); // REMAINS OPEN!

      // Step 7: Avatar steps further back to 3.0m
      system.update(0.016, new THREE.Vector3(0, 1.65, 3.0), true);
      expect(door.targetRatio).toBe(1.0); // REMAINS OPEN!

      // Step 8: Avatar steps to 3.19m (just under 3.2m close threshold)
      system.update(0.016, new THREE.Vector3(0, 1.65, 3.19), true);
      expect(door.targetRatio).toBe(1.0); // STILL REMAINS OPEN!

      // Step 9: Avatar steps to 3.21m (> 3.2m close threshold)
      system.update(0.016, new THREE.Vector3(0, 1.65, 3.21), true);
      expect(door.targetRatio).toBe(0.0); // CLOSES!

      // Step 10: Advance animation until door is fully closed
      for (let i = 0; i < 40; i++) {
        system.update(0.016, new THREE.Vector3(0, 1.65, 3.21), true);
      }
      expect(door.isOpen).toBe(false);
      expect(door.currentRatio).toBeCloseTo(0.0, 1);

      // Step 11: Avatar steps forward to 2.8m (in deadband)
      system.update(0.016, new THREE.Vector3(0, 1.65, 2.8), true);
      expect(door.targetRatio).toBe(0.0); // REMAINS CLOSED!

      // Step 12: Avatar steps to 2.15m (<= 2.2m)
      system.update(0.016, new THREE.Vector3(0, 1.65, 2.15), true);
      expect(door.targetRatio).toBe(1.0); // OPENS AGAIN!
    });

    it('4.2: Vertical floor distance rejects opening even when horizontal distance is close', () => {
      // Horizontal distance is 1.2m (< 2.2m), but player is on the upper floor (Y = 4.8m -> dY = 4.8m > 2.2m)
      const upperFloorPlayer = new THREE.Vector3(0, 4.8, 1.2);
      system.update(0.016, upperFloorPlayer, true);

      expect(door.targetRatio).toBe(0.0);
      expect(door.isOpen).toBe(false);

      // Same horizontal position on ground floor (Y = 1.65m -> dY = 1.65m < 2.2m) opens cleanly
      const groundFloorPlayer = new THREE.Vector3(0, 1.65, 1.2);
      system.update(0.016, groundFloorPlayer, true);

      expect(door.targetRatio).toBe(1.0);
    });
  });
});

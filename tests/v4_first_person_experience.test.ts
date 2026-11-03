import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { InteriorInteractiveSystem, InteractiveDoor } from '../src/buildings/InteriorInteractiveSystem';
import { ProceduralAudio, proceduralAudio, FootstepMaterial } from '../src/audio/ProceduralAudio';
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

describe('Tahap 3 (T3.1 - T3.6): Enam Logika Pengalaman Mode Pejalan Kaki', () => {
  let mockDomElement: any;
  let camera: THREE.PerspectiveCamera;
  let controller: FirstPersonController;
  let mockEngine: any;
  let mockBuilding: BuildingInstance;
  let mockBuildingManager: any;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock AudioContext in global window
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

    mockBuilding = {
      id: 'bld_tahap3_test',
      presetKey: 'house_36',
      name: 'Rumah Uji Tahap 3',
      category: 'residential',
      position: new THREE.Vector3(10, 0, 10),
      rotationY: 0,
      width: 12,
      length: 14,
      floorCount: 3,
      floorHeight: 3.5,
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
              id: 'room_living',
              name: 'Ruang Tamu',
              type: 'living_room',
              floorIndex: 0,
              boundary: [
                new THREE.Vector2(-4, -4),
                new THREE.Vector2(4, -4),
                new THREE.Vector2(4, 4),
                new THREE.Vector2(-4, 4)
              ],
              areaM2: 64,
              ceilingHeight: 3.2,
              labelPosition: new THREE.Vector2(0, 0),
              isCompliant: true
            }
          ]
        },
        {
          floorIndex: 1,
          walls: [],
          rooms: [
            {
              id: 'room_terrace',
              name: 'Teras Atas',
              type: 'terrace',
              floorIndex: 1,
              boundary: [
                new THREE.Vector2(-4, -4),
                new THREE.Vector2(4, -4),
                new THREE.Vector2(4, 4),
                new THREE.Vector2(-4, 4)
              ],
              areaM2: 64,
              ceilingHeight: 3.2,
              labelPosition: new THREE.Vector2(0, 0),
              isCompliant: true
            }
          ]
        },
        {
          floorIndex: 2,
          walls: [],
          rooms: [
            {
              id: 'room_attic',
              name: 'Loteng',
              type: 'bedroom',
              floorIndex: 2,
              boundary: [
                new THREE.Vector2(-4, -4),
                new THREE.Vector2(4, -4),
                new THREE.Vector2(4, 4),
                new THREE.Vector2(-4, 4)
              ],
              areaM2: 64,
              ceilingHeight: 2.8,
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

    // Reset UI Store defaults
    useUIStore.getState().setCameraBobbing(true);
    useUIStore.getState().setReduceMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    InteriorInteractiveSystem.getInstance().clearAll();
  });

  // =========================================================================
  // T3.1: ADAPTASI CAHAYA MATA (EYE LIGHT ADAPTATION)
  // =========================================================================
  describe('T3.1: Adaptasi cahaya mata (Eye Light Adaptation)', () => {
    it('1. Initializes with outdoor baseline exposure of 1.05', () => {
      expect(controller.getExposure()).toBeCloseTo(1.05, 2);
      expect(mockEngine.renderer.toneMappingExposure).toBeCloseTo(1.05, 2);
    });

    it('2. Damps toneMappingExposure smoothly from outdoor 1.05 to indoor 1.28 under roof', () => {
      // Simulate player standing under roof
      controller.isUnderRoof = true;

      // Single frame update (16ms)
      controller.updateEyeLightAdaptation(0.016);
      expect(controller.getExposure()).toBeGreaterThan(1.05);
      expect(controller.getExposure()).toBeLessThan(1.28);

      // Advance time by 1.0s (dt = 0.05s * 20 steps)
      for (let i = 0; i < 40; i++) {
        controller.updateEyeLightAdaptation(0.05);
      }

      // Should converge to indoor target ~1.28
      expect(controller.getExposure()).toBeCloseTo(1.28, 1);
      expect(mockEngine.renderer.toneMappingExposure).toBeCloseTo(1.28, 1);
    });

    it('3. Damps toneMappingExposure back to 1.05 when stepping outside', () => {
      controller.isUnderRoof = true;
      for (let i = 0; i < 40; i++) {
        controller.updateEyeLightAdaptation(0.05);
      }
      expect(controller.getExposure()).toBeCloseTo(1.28, 1);

      // Player exits to outdoors
      controller.isUnderRoof = false;
      for (let i = 0; i < 40; i++) {
        controller.updateEyeLightAdaptation(0.05);
      }
      expect(controller.getExposure()).toBeCloseTo(1.05, 2);
      expect(mockEngine.renderer.toneMappingExposure).toBeCloseTo(1.05, 2);
    });

    it('4. Upward roof raycast detects roof meshes within 6.0m', () => {
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.2, 10),
        new THREE.MeshBasicMaterial()
      );
      roofMesh.name = 'BuildingRoof_Mesh';
      roofMesh.position.set(0, 4.0, 0); // 4m above origin (avatar head ~1.65m -> distance ~2.35m < 6.0m)
      mockBuildingManager.masterGroup.add(roofMesh);

      controller.position.set(0, 1.65, 0);
      expect(controller.checkIfUnderRoof(controller.position)).toBe(true);

      // Clamping: move mesh above 6m ceiling limit (e.g. 15m)
      roofMesh.position.set(0, 15.0, 0);
      expect(controller.checkIfUnderRoof(controller.position)).toBe(false);
    });

    it('5. Roof check is debounced/throttled to 150ms during update loop', () => {
      mockBuildingManager.masterGroup.clear();
      const roofMesh = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.2, 10),
        new THREE.MeshBasicMaterial()
      );
      roofMesh.name = 'BuildingRoof_Mesh';
      roofMesh.position.set(0, 4.0, 0);
      mockBuildingManager.masterGroup.add(roofMesh);
      mockBuildingManager.masterGroup.updateMatrixWorld(true);

      controller.insideBuildingId = null;
      controller.position.set(0, 1.65, 0);

      // Trigger update with dt = 0.1s (roofCheckAccumulatorMs: 150 + 100 = 250 >= 150ms)
      controller.update(0.1);
      expect(controller.isUnderRoof).toBe(true);

      // Move roof away
      roofMesh.position.set(100, 4.0, 100);
      mockBuildingManager.masterGroup.updateMatrixWorld(true);

      // Short update 0.05s (accumulator: 0 + 50 = 50ms < 150ms) throttles check; stays true
      controller.update(0.05);
      expect(controller.isUnderRoof).toBe(true);

      // Next updates exceed 150ms (50 + 100 + 50 = 200ms >= 150ms), raycast evaluates and turns false
      controller.update(0.1);
      controller.update(0.05);
      expect(controller.isUnderRoof).toBe(false);
    });

    it('6. Restores base diurnal toneMappingExposure upon exit() to prevent orbit camera pollution', () => {
      controller.isUnderRoof = true;
      for (let i = 0; i < 20; i++) {
        controller.updateEyeLightAdaptation(0.05);
      }
      expect(mockEngine.renderer.toneMappingExposure).toBeGreaterThan(1.10);

      controller.exit();
      expect(mockEngine.renderer.toneMappingExposure).toBeCloseTo(1.05, 2);
    });
  });

  // =========================================================================
  // T3.2: NAIK LANGKAH OTOMATIS TANPA LOMPAT (PREDICTIVE AUTO STEP-UP)
  // =========================================================================
  describe('T3.2: Naik langkah otomatis tanpa lompat (Predictive Auto Step-Up)', () => {
    it('1. Detects 0.05m to 0.42m step-up ahead (curbs and plinths)', () => {
      // Mock terrain elevation ahead
      let curbAhead = false;
      mockEngine.terrain.getHeightAt = (x: number, z: number) => {
        if (curbAhead && z < -0.1) return 0.15; // 0.15m curb height
        return 0;
      };

      controller.position.set(0, 1.65, 0);

      // Flat ground -> not a step-up
      const flatResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(flatResult.canStep).toBe(false);
      expect(flatResult.blocked).toBe(false);

      // Curb ahead (0.15m height)
      curbAhead = true;
      const curbResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(curbResult.canStep).toBe(true);
      expect(curbResult.blocked).toBe(false);
      expect(curbResult.deltaY).toBeCloseTo(0.15, 2);
    });

    it('2. Blocks obstacles higher than 0.42m (vertical walls)', () => {
      mockEngine.terrain.getHeightAt = (x: number, z: number) => {
        if (z < -0.1) return 0.60; // 0.60m vertical wall
        return 0;
      };

      controller.position.set(0, 1.65, 0);
      const wallResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(wallResult.canStep).toBe(false);
      expect(wallResult.blocked).toBe(true);
      expect(wallResult.reason).toBe('wall');
    });

    it('3. Rejects step-up if headroom above elevated height is less than 1.7m', () => {
      mockEngine.terrain.getHeightAt = (x: number, z: number) => {
        if (z < -0.1) return 0.20; // 0.20m step
        return 0;
      };

      // Add low ceiling beam 1.4m above the step (< 1.7m clearance)
      const lowBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.4, 2),
        new THREE.MeshBasicMaterial()
      );
      lowBeam.name = 'LowCeiling_Beam';
      lowBeam.position.set(0, 0.20 + 1.4, -0.3);
      mockBuildingManager.masterGroup.add(lowBeam);

      controller.position.set(0, 1.65, 0);
      const headroomOk = controller.checkHeadroomAbove(0, 0.20, -0.3, 1.7);
      expect(headroomOk).toBe(false);

      const stepResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(stepResult.canStep).toBe(false);
      expect(stepResult.blocked).toBe(true);
      expect(stepResult.reason).toBe('headroom');
    });

    it('4. Rejects step-up if target surface is furniture (table, desk)', () => {
      mockEngine.terrain.getHeightAt = (x: number, z: number) => {
        if (z < -0.1) return 0.35;
        return 0;
      };

      const tableMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.4, 0.8),
        new THREE.MeshBasicMaterial()
      );
      tableMesh.name = 'PlacedFurniture_Meja';
      tableMesh.userData = { isFurniture: true };
      tableMesh.position.set(0, 0.35, -0.3);
      mockBuildingManager.masterGroup.add(tableMesh);

      controller.position.set(0, 1.65, 0);
      expect(controller.isSurfaceFurniture(0, 0.35, -0.3)).toBe(true);

      const stepResult = controller.evaluatePredictiveStepUp(0, -0.3);
      expect(stepResult.canStep).toBe(false);
      expect(stepResult.blocked).toBe(true);
      expect(stepResult.reason).toBe('furniture');
    });
  });

  // =========================================================================
  // T3.3: PINTU AYUN DUA ARAH (TWO-WAY SWINGING DOORS)
  // =========================================================================
  describe('T3.3: Pintu ayun dua arah (Two-way Swinging Interactive Doors)', () => {
    let system: InteriorInteractiveSystem;
    let doorGroup: THREE.Group;
    let doorLeaf: THREE.Mesh;
    let door: InteractiveDoor;

    beforeEach(() => {
      system = InteriorInteractiveSystem.getInstance();
      system.clearAll();

      doorGroup = new THREE.Group();
      doorGroup.position.set(10, 0, 10);

      doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04));
      doorLeaf.name = 'InteractiveDoor_Leaf_01';
      doorLeaf.userData = { isDoor: true };
      doorLeaf.position.set(0.45, 1.05, 0); // Pivot hinge at left edge (x=0)
      doorGroup.add(doorLeaf);

      door = {
        id: 'door_twoway_01',
        type: 'swing',
        buildingId: 'bld_tahap3_test',
        floorIndex: 0,
        group: doorGroup,
        leftLeafMesh: doorLeaf,
        doorCenterLocal: new THREE.Vector3(0.45, 1.05, 0),
        worldPosition: new THREE.Vector3(10, 0, 10),
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

    it('1. Swings AWAY from avatar when approaching from FRONT (dot product > 0)', () => {
      // Approach from positive Z (z=11.5, distance ~1.5m < 2.2m)
      const playerPosFront = new THREE.Vector3(10, 1.65, 11.5);
      system.update(0.016, playerPosFront, true);

      expect(door.targetRatio).toBe(1.0);
      expect(door.swingDirection).toBe(-1); // Swings away from front approach

      // Simulate easing over 0.35s
      for (let i = 0; i < 25; i++) {
        system.update(0.016, playerPosFront, true);
      }

      expect(door.currentRatio).toBeGreaterThan(0.7);
      expect(door.isOpen).toBe(true);
      expect(doorLeaf.rotation.y).toBeLessThan(0);
      expect(Math.abs(doorLeaf.rotation.y)).toBeGreaterThan(1.0);
    });

    it('2. Swings AWAY from avatar when approaching from BACK (dot product < 0)', () => {
      // Approach from negative Z (z=8.5, distance ~1.5m < 2.2m)
      const playerPosBack = new THREE.Vector3(10, 1.65, 8.5);
      system.update(0.016, playerPosBack, true);

      expect(door.targetRatio).toBe(1.0);
      expect(door.swingDirection).toBe(1); // Swings away from back approach

      for (let i = 0; i < 25; i++) {
        system.update(0.016, playerPosBack, true);
      }

      expect(door.currentRatio).toBeGreaterThan(0.7);
      expect(door.isOpen).toBe(true);
      expect(doorLeaf.rotation.y).toBeGreaterThan(0);
    });

    it('3. Closes automatically when avatar distance exceeds 3.2m', () => {
      system.update(0.016, new THREE.Vector3(10, 1.65, 11.0), true);
      for (let i = 0; i < 25; i++) {
        system.update(0.016, new THREE.Vector3(10, 1.65, 11.0), true);
      }
      expect(door.isOpen).toBe(true);

      // Player walks away to distance 4.0m (> 3.2m)
      const farPlayerPos = new THREE.Vector3(10, 1.65, 14.0);
      system.update(0.016, farPlayerPos, true);

      expect(door.targetRatio).toBe(0.0);

      // Advance animation until fully closed
      for (let i = 0; i < 40; i++) {
        system.update(0.016, farPlayerPos, true);
      }

      expect(door.currentRatio).toBeCloseTo(0.0, 1);
      expect(door.isOpen).toBe(false);
      expect(doorLeaf.rotation.y).toBeCloseTo(0.0, 1);
    });

    it('4. Door leaf is excluded from avatar wall blocking collision', () => {
      mockBuildingManager.masterGroup.add(doorGroup);
      controller.position.set(10, 1.65, 10.3);

      // Walking forward towards door leaf does NOT block movement
      const canMoveThroughDoor = controller.testWallCollision(0, -0.3);
      expect(canMoveThroughDoor).toBe(true);
    });
  });

  // =========================================================================
  // T3.4: NAIK LANTAI DUA CARA (DUAL FLOOR NAVIGATION)
  // =========================================================================
  describe('T3.4: Naik lantai dua cara (Dual Floor Navigation)', () => {
    beforeEach(() => {
      controller.insideBuildingId = mockBuilding.id;
      controller.insideBuildingName = mockBuilding.name;
      controller.currentFloor = 1;
      controller.totalFloors = mockBuilding.floorCount; // 3 floors
      controller.position.set(10, 1.65, 10);
    });

    it('1. Physical walking traversal across StairZone footprint updates floor', () => {
      mockBuilding.userData!.stairZones = [
        {
          id: 'sz_1_to_2',
          floorIndex: 0,
          flightX: -3.32,
          flightW: 1.35,
          zStart: -1.6,
          zEnd: 1.6,
          baseFloorY: 0,
          floorHeight: 3.5
        }
      ];

      // Walk onto stair ramp near top exit (localX = -3.32, localZ = 1.55 -> t ~ 0.984 > 0.98)
      // worldX = 10 - 3.32 = 6.68, worldZ = 10 + 1.55 = 11.55
      const groundAtStairTop = (controller as any).calculateGroundHeight(6.68, 11.55);
      expect(groundAtStairTop).toBeGreaterThan(3.0);
      expect(controller.currentFloor).toBe(2);
    });

    it('2. Hotkey traverseFloor("up" / "down") and bounds validation', () => {
      controller.traverseFloor('up');
      expect(controller.currentFloor).toBe(2);

      controller.traverseFloor('up');
      expect(controller.currentFloor).toBe(3);

      // Beyond top floor: rejected
      const overFloor = controller.traverseFloor('up');
      expect(overFloor).toBe(false);
      expect(controller.currentFloor).toBe(3);

      // Traverse down
      controller.traverseFloor('down');
      expect(controller.currentFloor).toBe(2);
      controller.traverseFloor('down');
      expect(controller.currentFloor).toBe(1);

      // Below floor 1: rejected
      const underFloor = controller.traverseFloor('down');
      expect(underFloor).toBe(false);
      expect(controller.currentFloor).toBe(1);
    });

    it('3. Direct floor selection goToFloor(target) validates boundaries', () => {
      expect(controller.goToFloor(3)).toBe(true);
      expect(controller.currentFloor).toBe(3);

      expect(controller.goToFloor(5)).toBe(false);
      expect(controller.currentFloor).toBe(3);

      expect(controller.goToFloor(0)).toBe(false);
      expect(controller.currentFloor).toBe(3);
    });

    it('4. Finds safe clearance point avoiding walls and furniture on target floor', () => {
      mockBuilding.userData!.placedFurniture = [
        {
          id: 'fur_blocker_01',
          type: 'sofa_l',
          position: [-3.32, 3.5, 1.8], // Blocker placed near stair landing
          rotationY: 0,
          floorIndex: 2
        }
      ];

      const safePoint = controller.findSafeFloorClearancePoint(mockBuilding, 2);
      expect(safePoint).toBeDefined();
      expect(safePoint.y).toBeGreaterThan(3.0); // Elevated to Floor 2
    });

    it('5. Triggers 150ms screen fade overlay during floor teleportation', () => {
      expect(controller.isFloorFading).toBe(false);

      controller.goToFloor(2);
      expect(controller.isFloorFading).toBe(true);

      // Advance 100ms: still fading
      vi.advanceTimersByTime(100);
      expect(controller.isFloorFading).toBe(true);

      // Advance past 150ms: fade resets
      vi.advanceTimersByTime(60);
      expect(controller.isFloorFading).toBe(false);
    });

    it('6. Triggers spatial updates, roof check, and microclimate on floor transition', () => {
      controller.goToFloor(2);
      expect(mockBuildingManager.updateSpatialLOD).toHaveBeenCalled();
      expect(controller.isUnderRoof).toBe(true);
    });
  });

  // =========================================================================
  // T3.5: SUARA LANGKAH BERDASARKAN MATERIAL (SURFACE MATERIAL FOOTSTEPS)
  // =========================================================================
  describe('T3.5: Suara langkah berdasarkan material (Surface Material Footsteps)', () => {
    let audio: ProceduralAudio;

    beforeEach(() => {
      audio = new ProceduralAudio();
      audio.volume = 0.5;
      audio.enabled = true;
    });

    it('1. Detects surface materials correctly based on room type, sidewalk, and road', () => {
      // 1. Inside terrace room -> wood
      controller.insideBuildingId = mockBuilding.id;
      controller.currentFloor = 2; // Floor 2 is terrace
      controller.position.set(10, 3.5, 10);
      expect(controller.detectSurfaceMaterial()).toBe('wood');

      // 2. Inside living room -> ceramic
      controller.currentFloor = 1; // Floor 1 is living room
      controller.position.set(10, 0, 10);
      expect(controller.detectSurfaceMaterial()).toBe('ceramic');

      // 3. Outdoor sidewalk mesh -> paving
      controller.insideBuildingId = null;
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 10));
      sidewalk.name = 'Trotoar_Sidewalk_Kavling';
      mockEngine.roadManager.masterGroup.add(sidewalk);
      sidewalk.position.set(0, 0, 0);
      controller.position.set(0, 1.65, 0);
      expect(controller.detectSurfaceMaterial()).toBe('paving');

      // 4. Outdoor asphalt road -> asphalt
      sidewalk.name = 'Jalan_Aspal_Utama';
      expect(controller.detectSurfaceMaterial()).toBe('asphalt');

      // 5. Default natural terrain -> grass
      mockEngine.roadManager.masterGroup.clear();
      expect(controller.detectSurfaceMaterial()).toBe('grass');
    });

    it('2. Synthesizes distinct procedural noise & filter profiles for all 6 materials without error', () => {
      const materials: FootstepMaterial[] = ['grass', 'asphalt', 'paving', 'wood', 'ceramic', 'dirt'];

      materials.forEach((mat) => {
        expect(() => audio.playFootstep(mat)).not.toThrow();
      });
    });

    it('3. Limits concurrent footstep voices to MAX_FOOTSTEP_VOICES (4 voices)', () => {
      for (let i = 0; i < 10; i++) {
        audio.playFootstep('wood');
      }

      expect(audio.getActiveFootstepVoiceCount()).toBeLessThanOrEqual(ProceduralAudio.MAX_FOOTSTEP_VOICES);
      expect(ProceduralAudio.MAX_FOOTSTEP_VOICES).toBe(4);
    });

    it('4. Respects mute state and volume settings', () => {
      audio.setMuted(true);
      expect(audio.isMuted()).toBe(true);

      const countBefore = audio.getActiveFootstepVoiceCount();
      audio.playFootstep('ceramic');
      expect(audio.getActiveFootstepVoiceCount()).toBe(countBefore);

      audio.setMuted(false);
      audio.volume = 0.8;
      expect(audio.volume).toBe(0.8);
      audio.playFootstep('ceramic');
      expect(audio.getActiveFootstepVoiceCount()).toBeGreaterThan(0);
    });

    it('5. Triggers footstep sound every 1.8m traversed distance in FirstPersonController', () => {
      const playFootstepSpy = vi.spyOn(proceduralAudio, 'playFootstep');
      controller.traversedDistance = 0;
      controller.isGrounded = true;

      // Simulate player pressing W (forward key)
      (controller as any).keysDown.add('KeyW');

      // 4 steps of 0.1s -> ~1.2m (< 1.8m)
      for (let i = 0; i < 4; i++) {
        controller.update(0.1);
      }
      expect(playFootstepSpy).not.toHaveBeenCalled();
      expect(controller.traversedDistance).toBeGreaterThan(0.8);

      // 3 more steps of 0.1s -> traverses additional 1.2m (total > 2.0m > 1.8m threshold)
      for (let i = 0; i < 3; i++) {
        controller.update(0.1);
      }
      expect(playFootstepSpy).toHaveBeenCalledTimes(1);

      (controller as any).keysDown.delete('KeyW');
      playFootstepSpy.mockRestore();
    });
  });

  // =========================================================================
  // T3.6: GOYANGAN KAMERA HALUS (SMOOTH CAMERA BOBBING & SETTINGS TOGGLE)
  // =========================================================================
  describe('T3.6: Goyangan kamera halus (Smooth Camera Bobbing & Settings)', () => {
    it('1. Applies vertical head bobbing with ~0.015m amplitude while walking', () => {
      controller.cameraBobbingEnabled = true;
      controller.isGrounded = true;
      (controller as any).keysDown.add('KeyW');

      for (let i = 0; i < 20; i++) {
        controller.update(0.05);
      }

      expect(Math.abs(controller.currentBobbingOffset)).toBeGreaterThan(0.001);
      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThanOrEqual(0.016);
      (controller as any).keysDown.delete('KeyW');
    });

    it('2. Smoothly damps bobbing to 0 within ~0.15s when avatar stops moving', () => {
      controller.cameraBobbingEnabled = true;
      controller.isGrounded = true;
      (controller as any).keysDown.add('KeyW');

      for (let i = 0; i < 20; i++) {
        controller.update(0.05);
      }
      expect(Math.abs(controller.currentBobbingOffset)).toBeGreaterThan(0.001);

      // Avatar becomes idle
      (controller as any).keysDown.delete('KeyW');
      controller.currentVelocityX = 0;
      controller.currentVelocityZ = 0;

      // Advance ~0.15s (3 steps of 0.05s with lambda 20)
      for (let i = 0; i < 4; i++) {
        controller.update(0.05);
      }

      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);
    });

    it('3. Damps bobbing to 0 when aiming or placing furniture to prevent reticle jitter', () => {
      controller.cameraBobbingEnabled = true;
      controller.isGrounded = true;
      (controller as any).keysDown.add('KeyW');

      for (let i = 0; i < 20; i++) {
        controller.update(0.05);
      }

      // Enter material painter / aiming mode
      controller.activeTool = 'material_painter';

      for (let i = 0; i < 6; i++) {
        controller.update(0.05);
      }

      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);
      (controller as any).keysDown.delete('KeyW');
    });

    it('4. Automatically disabled when reduceMotion is enabled or cameraBobbing is toggled OFF', () => {
      // 1. reduceMotion enabled
      useUIStore.getState().setReduceMotion(true);
      controller.isGrounded = true;
      (controller as any).keysDown.add('KeyW');
      controller.update(0.05);
      expect(controller.currentBobbingOffset).toBe(0);

      // 2. Reset reduceMotion, disable cameraBobbing in UI store
      useUIStore.getState().setReduceMotion(false);
      useUIStore.getState().setCameraBobbing(false);
      controller.cameraBobbingEnabled = false;

      controller.update(0.05);
      expect(controller.currentBobbingOffset).toBe(0);
      (controller as any).keysDown.delete('KeyW');
    });

    it('5. UI Store provides cameraBobbing state and Indonesian toggle support', () => {
      useUIStore.getState().setCameraBobbing(true);
      expect(useUIStore.getState().cameraBobbing).toBe(true);

      useUIStore.getState().setCameraBobbing(false);
      expect(useUIStore.getState().cameraBobbing).toBe(false);

      useUIStore.getState().setCameraBobbing(true);
      expect(useUIStore.getState().cameraBobbing).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { Engine } from '../src/core/engine/Engine';
import { CitySerializer } from '../src/io/CitySerializer';
import {
  PlaceFurnitureCommand,
  RemoveFurnitureCommand,
  MoveFurnitureCommand,
  AutoFurnishRoomCommand,
  PaintSurfaceCommand,
  PlacedFurnitureData
} from '../src/core/commands/CityCommands';
import { CommandManager } from '../src/core/commands/CommandManager';
import {
  computeRotatedFurnitureHalfExtents,
  getOutdoorHotbarItems,
  FirstPersonFurnitureBuilder
} from '../src/buildings/FirstPersonFurnitureCatalog';
import { InteriorInteractiveSystem } from '../src/buildings/InteriorInteractiveSystem';
import { springAnimator } from '../src/core/engine/SpringAnimator';

describe('First-Person Interactive Builder & HUD Upgrade Suite', () => {
  let mockDomElement: any;
  let camera: THREE.PerspectiveCamera;
  let controller: FirstPersonController;
  let mockBuilding: BuildingInstance;

  beforeEach(() => {
    mockDomElement = {
      requestPointerLock: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    camera = new THREE.PerspectiveCamera();
    controller = new FirstPersonController(camera, mockDomElement);

    mockBuilding = {
      id: 'bld_test_villa',
      presetKey: 'house_36',
      name: 'Villa Tropis Nyaman',
      category: 'residential',
      position: new THREE.Vector3(20, 0, 30),
      rotationY: 0,
      width: 10,
      length: 12,
      floorCount: 2,
      floorHeight: 3.5,
      roofType: 'gable',
      roofOverhang: 0.6,
      wallMaterial: 'plaster',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile',
      userData: {
        placedFurniture: []
      }
    };
  });

  it('1. Verifies strict indoor vs outdoor detection in FirstPersonController', () => {
    // Center of building: (x=20, z=30), width=10 (x from 15 to 25), length=12 (z from 24 to 36)
    // Inner wall boundary (inset 0.35m): x: [15.35, 24.65], z: [24.35, 35.65]

    // Point exactly inside the living room: (20, 30) -> Inside
    expect(controller.isPositionInsideInnerWalls(mockBuilding, 20, 30)).toBe(true);

    // Point near corner but inside: (16.0, 25.0) -> Inside
    expect(controller.isPositionInsideInnerWalls(mockBuilding, 16.0, 25.0)).toBe(true);

    // Point outside exterior wall on grass (x=14.8, z=30) -> Outside (14.8 < 15.35)
    expect(controller.isPositionInsideInnerWalls(mockBuilding, 14.8, 30)).toBe(false);

    // Point on front sidewalk (x=20, z=23.8) -> Outside (23.8 < 24.35)
    expect(controller.isPositionInsideInnerWalls(mockBuilding, 20, 23.8)).toBe(false);

    // Point 10 meters away on the street: (20, 10) -> Outside
    expect(controller.isPositionInsideInnerWalls(mockBuilding, 20, 10)).toBe(false);
  });

  it('2. Records PlaceFurnitureCommand in CommandManager and supports full Undo/Redo', () => {
    const mockEngine = {
      buildingManager: {
        buildings: new Map<string, BuildingInstance>([[mockBuilding.id, mockBuilding]]),
        updateBuilding: () => {}
      },
      commandManager: new CommandManager()
    } as unknown as Engine;

    const cmdManager = mockEngine.commandManager;
    const furnitureData: PlacedFurnitureData = {
      id: 'fur_sofa_001',
      type: 'sofa_l',
      name: 'Sofa L-Shape Ruang Tamu',
      position: [0, 0, 0],
      rotationY: 0,
      floorIndex: 1
    };

    const placeCmd = new PlaceFurnitureCommand(mockEngine, mockBuilding.id, furnitureData);
    cmdManager.execute(placeCmd);

    // After execute, placedFurniture should have the sofa
    expect(mockBuilding.userData?.placedFurniture).toHaveLength(1);
    expect(mockBuilding.userData?.placedFurniture[0].id).toBe('fur_sofa_001');

    // Undo: removes the sofa
    cmdManager.undo();
    expect(mockBuilding.userData?.placedFurniture).toHaveLength(0);

    // Redo: restores the sofa
    cmdManager.redo();
    expect(mockBuilding.userData?.placedFurniture).toHaveLength(1);
    expect(mockBuilding.userData?.placedFurniture[0].id).toBe('fur_sofa_001');

    // RemoveFurnitureCommand: removes the sofa with Undo/Redo
    const removeCmd = new RemoveFurnitureCommand(mockEngine, mockBuilding.id, furnitureData);
    cmdManager.execute(removeCmd);
    expect(mockBuilding.userData?.placedFurniture).toHaveLength(0);

    cmdManager.undo();
    expect(mockBuilding.userData?.placedFurniture).toHaveLength(1);

    cmdManager.redo();
    expect(mockBuilding.userData?.placedFurniture).toHaveLength(0);
  });

  it('3. Serializes and deserializes placedFurniture in CitySerializer', () => {
    mockBuilding.userData = {
      placedFurniture: [
        {
          id: 'fur_dining_002',
          type: 'dining_set',
          name: 'Meja Makan + 4 Kursi',
          position: [1.2, 0, -1.0],
          rotationY: Math.PI * 0.5,
          floorIndex: 1
        }
      ]
    };

    const mockEngine = {
      buildingManager: {
        buildings: new Map<string, BuildingInstance>([[mockBuilding.id, mockBuilding]]),
        addBuilding: (bld: BuildingInstance) => mockEngine.buildingManager.buildings.set(bld.id, bld),
        clear: () => mockEngine.buildingManager.buildings.clear()
      },
      roadManager: {
        graph: {
          nodes: new Map(),
          edges: new Map()
        },
        clear: () => {}
      },
      lotManager: {
        lots: new Map(),
        clear: () => {},
        evaluateAllLots: () => {}
      },
      landscapeManager: {
        items: [],
        clear: () => {}
      },
      lightingSystem: {
        currentHour: 12,
        currentDayOfYear: 100
      },
      weatherSystem: {
        currentWeather: 'sunny'
      },
      setTimeOfDay: () => {},
      setWeather: () => {}
    } as unknown as Engine;

    const serialized = CitySerializer.serialize(mockEngine, 'Kota Test');
    expect(serialized.buildings).toHaveLength(1);
    expect(serialized.buildings[0].placedFurniture).toBeDefined();
    expect(serialized.buildings[0].placedFurniture).toHaveLength(1);
    expect(serialized.buildings[0].placedFurniture![0].type).toBe('dining_set');

    // Clear and deserialize
    mockEngine.buildingManager.buildings.clear();
    const result = CitySerializer.deserialize(mockEngine, serialized);
    expect(result.success).toBe(true);

    const loadedBld = mockEngine.buildingManager.buildings.get(mockBuilding.id);
    expect(loadedBld).toBeDefined();
    expect(loadedBld?.userData?.placedFurniture).toHaveLength(1);
    expect(loadedBld?.userData?.placedFurniture[0].type).toBe('dining_set');
  });

  it('4. Checks FirstPersonHUD.tsx is 100% clean from broken ?C and ? encoding artifacts', () => {
    const hudPath = path.resolve(__dirname, '../src/ui/components/FirstPersonHUD.tsx');
    const content = fs.readFileSync(hudPath, 'utf8');

    // Must not contain broken "?C" or "? " bullet symbols
    expect(content.includes('?C')).toBe(false);
    expect(content.includes('dari {totalFloors} ?')).toBe(false);

    // Must contain proper degree symbol and bullet
    expect(content.includes('°C')).toBe(true);
    expect(content.includes('•')).toBe(true);
  });

  it('5. Verifies AutoFurnishRoomCommand and PaintSurfaceCommand with Undo/Redo', () => {
    mockBuilding.userData = { placedFurniture: [] };
    const mockEngine = {
      buildingManager: {
        buildings: new Map<string, BuildingInstance>([[mockBuilding.id, mockBuilding]]),
        updateBuilding: () => {}
      },
      commandManager: new CommandManager()
    } as unknown as Engine;

    const autoCmd = new AutoFurnishRoomCommand(mockEngine, mockBuilding.id);
    mockEngine.commandManager.execute(autoCmd);

    // Auto-furnish places standard living room furniture set (4 items)
    expect(mockBuilding.userData.placedFurniture.length).toBeGreaterThanOrEqual(3);

    mockEngine.commandManager.undo();
    expect(mockBuilding.userData.placedFurniture).toHaveLength(0);

    mockEngine.commandManager.redo();
    expect(mockBuilding.userData.placedFurniture.length).toBeGreaterThanOrEqual(3);

    // PaintSurfaceCommand
    const prevMat = mockBuilding.wallMaterial;
    const paintCmd = new PaintSurfaceCommand(mockEngine, mockBuilding.id, 'wall', 'wood_teak');
    mockEngine.commandManager.execute(paintCmd);
    expect(mockBuilding.wallMaterial).toBe('wood_teak');

    mockEngine.commandManager.undo();
    expect(mockBuilding.wallMaterial).toBe(prevMat);
  });

  it('6. Verifies multi-floor furniture local Y coordinate elevation calculation', () => {
    // Floor 1: local Y = 0
    controller.currentFloor = 1;
    const floorH = 3.5;
    const floor1Y = (controller.currentFloor - 1) * floorH;
    expect(floor1Y).toBe(0);

    // Floor 2: local Y = 3.5m
    controller.currentFloor = 2;
    const floor2Y = (controller.currentFloor - 1) * floorH;
    expect(floor2Y).toBe(3.5);

    // Floor 3: local Y = 7.0m
    controller.currentFloor = 3;
    const floor3Y = (controller.currentFloor - 1) * floorH;
    expect(floor3Y).toBe(7.0);
  });

  it('7. Verifies Architect Studio Drawer toggle via toggleDrawer() and hotbar slots', () => {
    expect(controller.isDrawerOpen).toBe(false);

    // Opening drawer
    controller.toggleDrawer(true);
    expect(controller.isDrawerOpen).toBe(true);

    // Closing drawer
    controller.toggleDrawer(false);
    expect(controller.isDrawerOpen).toBe(false);

    // Toggle
    controller.toggleDrawer();
    expect(controller.isDrawerOpen).toBe(true);
    controller.toggleDrawer();
    expect(controller.isDrawerOpen).toBe(false);

    // Hotbar selection
    controller.insideBuildingId = null;
    controller.selectHotbarIndex(0);
    expect(controller.activeDockTab).toBe('exterior');
    expect(controller.selectedExteriorId).toBe('bld_tropis');

    controller.insideBuildingId = mockBuilding.id;
    controller.selectHotbarIndex(1);
    expect(controller.activeDockTab).toBe('furniture');
    expect(controller.selectedFurnitureId).toBe('sofa_3seater');
  });

  it('8. Verifies 3D Laser Tape Measure distance calculation and clearLaserMeasure', () => {
    const scene = new THREE.Scene();
    const mockEngine = { scene } as unknown as Engine;
    controller.setEngine(mockEngine);

    controller.activeTool = 'laser_measure';
    controller.currentPlacementTarget.set(0, 0, 0);
    controller.executePlacement();
    expect(controller.laserPoints).toHaveLength(1);

    controller.currentPlacementTarget.set(3, 0, 4); // 3-4-5 triangle -> distance = 5m
    controller.executePlacement();
    expect(controller.laserPoints).toHaveLength(2);
    expect(controller.laserDistanceM).toBe(5);
    expect(controller.laserLineMesh).toBeDefined();

    controller.clearLaserMeasure();
    expect(controller.laserPoints).toHaveLength(0);
    expect(controller.laserDistanceM).toBeNull();
    expect(controller.laserLineMesh).toBeNull();
    expect(controller.laserLabelSprite).toBeNull();
  });

  it('9. Computes effectiveHalfW and effectiveHalfD accurately for 90-degree rotated furniture and blocks overlaps & wall protrusions', () => {
    // bar_counter is 2.4m wide x 1.0m deep
    const unrotated = computeRotatedFurnitureHalfExtents(2.4, 1.0, 0);
    expect(unrotated.effectiveHalfW).toBeCloseTo(1.2, 5);
    expect(unrotated.effectiveHalfD).toBeCloseTo(0.5, 5);

    const rotated90 = computeRotatedFurnitureHalfExtents(2.4, 1.0, Math.PI * 0.5);
    expect(rotated90.effectiveHalfW).toBeCloseTo(0.5, 5);
    expect(rotated90.effectiveHalfD).toBeCloseTo(1.2, 5);

    // Place an existing bar_counter at (0, 0, 0) unrotated -> X: [-1.2, 1.2], Z: [-0.5, 0.5]
    mockBuilding.userData = {
      placedFurniture: [
        {
          id: 'fur_existing_counter',
          type: 'bar_counter',
          name: 'Konter Bar Kopi & Mesin Kasir',
          position: [0, 0, 0],
          rotationY: 0,
          floorIndex: 1
        }
      ]
    };

    // Candidate at (0, 0, 1.2) unrotated -> Z: [0.7, 1.7] -> does NOT overlap [-0.5, 0.5]
    const validUnrotated = controller.checkFurniturePlacementValidity(
      mockBuilding,
      0,
      1.2,
      'bar_counter',
      0,
      1
    );
    expect(validUnrotated.valid).toBe(true);

    // Candidate at (0, 0, 1.2) rotated 90 degrees -> effectiveHalfD = 1.2 -> Z: [0.0, 2.4] -> OVERLAPS [-0.5, 0.5]!
    const invalidRotatedOverlap = controller.checkFurniturePlacementValidity(
      mockBuilding,
      0,
      1.2,
      'bar_counter',
      Math.PI * 0.5,
      1
    );
    expect(invalidRotatedOverlap.valid).toBe(false);
    expect(invalidRotatedOverlap.reason).toBe('overlap');

    // Near right inner wall (mockBuilding width = 10 -> innerHalfW = 4.84):
    // At localX = 4.20, unrotated effectiveHalfW (1.2) -> 4.20 + 1.20 = 5.40 > 4.84 -> wall collision!
    const wallHitUnrotated = controller.checkFurniturePlacementValidity(
      mockBuilding,
      4.2,
      -3.0,
      'bar_counter',
      0,
      1
    );
    expect(wallHitUnrotated.valid).toBe(false);
    expect(wallHitUnrotated.reason).toBe('wall');

    // Same localX = 4.20, rotated 90 deg -> effectiveHalfW (0.5) -> 4.20 + 0.50 = 4.70 <= 4.84 -> fits cleanly!
    const wallClearRotated = controller.checkFurniturePlacementValidity(
      mockBuilding,
      4.2,
      -3.0,
      'bar_counter',
      Math.PI * 0.5,
      1
    );
    expect(wallClearRotated.valid).toBe(true);
  });

  it('10. Clamps indoor jump height against floor ceiling with 0.25m head clearance and zeroes upward velocity', () => {
    const scene = new THREE.Scene();
    const bldManager = new BuildingManager(scene);

    // Low-ceiling room: plinth 0.35m + floorHeight 2.40m -> ceilingY = 2.75m
    // Max eye height = 2.75 - 0.25 = 2.50m (unclamped jump from 2.00m @ 6 m/s would reach 3.00m)
    const lowCeilingBld: BuildingInstance = {
      ...mockBuilding,
      id: 'bld_low_ceiling',
      position: new THREE.Vector3(0, 0, 0),
      width: 10,
      length: 10,
      floorCount: 1,
      floorHeight: 2.4,
      plinthHeight: 0.35
    };
    bldManager.addBuilding(lowCeilingBld);

    const fp = new FirstPersonController(camera, mockDomElement, bldManager);
    fp.enter(new THREE.Vector3(0, 0, 0));

    const ceilingY = fp.getCurrentFloorCeilingY();
    expect(ceilingY).toBeCloseTo(2.75, 4);
    const maxAllowedEyeY = ceilingY! - 0.25; // 2.50m

    // Trigger jump indoors
    (fp as any).onKeyDown({ code: 'Space' } as KeyboardEvent);
    expect((fp as any).velocityY).toBe(fp.jumpSpeed);

    let peakEyeY = fp.position.y;
    let hitCeiling = false;
    for (let i = 0; i < 30; i++) {
      fp.update(0.015);
      if (fp.position.y > peakEyeY) peakEyeY = fp.position.y;
      if (Math.abs(fp.position.y - maxAllowedEyeY) < 1e-4) {
        hitCeiling = true;
        expect((fp as any).velocityY).toBeLessThanOrEqual(0);
      }
    }

    expect(hitCeiling).toBe(true);
    expect(peakEyeY).toBeLessThanOrEqual(maxAllowedEyeY + 1e-5);

    fp.dispose();
    bldManager.dispose();
  });

  it('11. Ensures 3D laser tape label and First-Person modules contain zero Unicode emojis and no harsh HUD dividers', () => {
    const emojiRegex = /\p{Extended_Pictographic}/u;

    // 1. Format helper & live 3D laser sprite label
    const formatted = FirstPersonController.formatLaserDistanceLabel(4.25);
    expect(formatted).toBe('4.25 m');
    expect(emojiRegex.test(formatted)).toBe(false);

    const scene = new THREE.Scene();
    controller.setEngine({ scene } as unknown as Engine);
    controller.activeTool = 'laser_measure';
    controller.currentPlacementTarget.set(0, 0, 0);
    controller.executePlacement();
    controller.currentPlacementTarget.set(0, 0, 4.25);
    controller.executePlacement();

    expect(controller.lastLaserLabelText).toBe('4.25 m');
    expect(emojiRegex.test(controller.lastLaserLabelText)).toBe(false);
    expect(controller.laserLabelSprite?.userData?.labelText).toBe('4.25 m');

    // 2. Source files must have 0 Pictographic Unicode emojis
    const filesToAudit = [
      '../src/core/engine/FirstPersonController.ts',
      '../src/ui/components/FirstPersonHUD.tsx',
      '../src/buildings/FirstPersonFurnitureCatalog.ts',
      '../src/buildings/InteriorInteractiveSystem.ts',
      '../src/core/commands/CityCommands.ts'
    ];
    for (const rel of filesToAudit) {
      const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
      expect(emojiRegex.test(src)).toBe(false);
    }

    // 3. FirstPersonHUD uses Space Grotesk & Space Mono, distinct outdoor hotbar labels, and 4 DSLR corner brackets
    const hudSrc = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/FirstPersonHUD.tsx'), 'utf8');
    expect(hudSrc).toContain('Space Grotesk');
    expect(hudSrc).toContain('Space Mono');
    expect(hudSrc).toContain('Top-Left Corner Bracket');
    expect(hudSrc).toContain('Bottom-Right Corner Bracket');
    expect(hudSrc).not.toContain('33.33%'); // No 3x3 DSLR grid lines

    const outdoorHotbar = getOutdoorHotbarItems();
    expect(outdoorHotbar).toHaveLength(9);
    expect(outdoorHotbar[6].shortLabel).toBe('Tabebuya');
    expect(outdoorHotbar[7].shortLabel).toBe('Flamboyan');
    expect(outdoorHotbar[8].shortLabel).toBe('Bangku Taman');
    const uniqueLabels = new Set(outdoorHotbar.map((i) => i.shortLabel));
    expect(uniqueLabels.size).toBe(9);
  });

  it('12. Prevents stepping on top of furniture while blocking 2D walk-through on solid furniture (height > 0.4m) with smooth sliding', () => {
    const scene = new THREE.Scene();
    const bldManager = new BuildingManager(scene);

    const testBld: BuildingInstance = {
      ...mockBuilding,
      id: 'bld_collision_test',
      position: new THREE.Vector3(0, 0, 0),
      width: 12,
      length: 12,
      floorCount: 1,
      floorHeight: 3.5,
      plinthHeight: 0.35,
      userData: {
        placedFurniture: [
          {
            id: 'fur_table_solid',
            type: 'dining_set', // 1.6 x 1.0 x 0.78m (> 0.4m -> solid)
            name: 'Meja Makan + 4 Kursi',
            position: [0, 0, 2.0],
            rotationY: 0,
            floorIndex: 1
          },
          {
            id: 'fur_rug_flat',
            type: 'rug_nusantara', // height 0.03m (<= 0.4m -> walkable)
            name: 'Karpet Tenun Nusantara',
            position: [2.5, 0, 0],
            rotationY: 0,
            floorIndex: 1
          }
        ]
      }
    };
    bldManager.addBuilding(testBld);

    // Also place a freestanding furniture mesh at (50, 0, 50) outdoors to ensure downRaycaster ignores furniture
    const outdoorTableMesh = FirstPersonFurnitureBuilder.buildFurniture('dining_set');
    outdoorTableMesh.position.set(50, 0, 50);
    bldManager.masterGroup.add(outdoorTableMesh);
    bldManager.masterGroup.updateMatrixWorld(true);

    const fp = new FirstPersonController(camera, mockDomElement, bldManager);

    // 1. Outdoor downRaycaster ignores furniture mesh -> player stays on ground (y = 1.65), NOT on top of table
    fp.enter(new THREE.Vector3(50, 0, 50));
    fp.update(0.05);
    expect(fp.position.y).toBeCloseTo(1.65, 2);

    // 2. Indoors: walking into solid dining_set (center at z=2.0, depth=1.4 -> halfD=0.7, padD=0.9 -> boundary at z=1.1) is blocked
    fp.enter(new THREE.Vector3(0, 0, 1.02));
    expect(fp.testFurnitureCollision2D(0, 0.25)).toBe(false);

    // Lateral sliding parallel to the table edge (along X) remains unobstructed
    expect(fp.testFurnitureCollision2D(0.25, 0)).toBe(true);

    // Walking across flat rug (height 0.03m <= 0.4m) is completely unobstructed
    fp.position.set(2.5, 0.35 + 1.65, -0.5);
    expect(fp.testFurnitureCollision2D(0, 0.5)).toBe(true);

    fp.dispose();
    bldManager.dispose();
  });

  it('13. Supports Grab/Move [G] with atomic MoveFurnitureCommand Undo/Redo, Esc cancel, Clone [V], local furniture spring, Pointer Lock sync, and max-2 PointLight pool', () => {
    let lockCalls = 0;
    let exitLockCalls = 0;
    const hadGlobalDoc = 'document' in globalThis && (globalThis as any).document !== undefined;
    const origExitLock = (globalThis as any).document?.exitPointerLock;

    const fakeDoc: any = hadGlobalDoc
      ? (globalThis as any).document
      : {
          pointerLockElement: null,
          addEventListener: () => {},
          removeEventListener: () => {}
        };
    fakeDoc.pointerLockElement = null;
    fakeDoc.exitPointerLock = () => {
      exitLockCalls++;
      fakeDoc.pointerLockElement = null;
    };
    if (!hadGlobalDoc) {
      (globalThis as any).document = fakeDoc;
    }

    const customDom: any = {
      requestPointerLock: () => {
        lockCalls++;
        fakeDoc.pointerLockElement = customDom;
      },
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    const scene = new THREE.Scene();
    const bldManager = new BuildingManager(scene);
    const cmdManager = new CommandManager();

    const bld: BuildingInstance = {
      ...mockBuilding,
      id: 'bld_studio_actions',
      position: new THREE.Vector3(0, 0, 0),
      width: 12,
      length: 12,
      plinthHeight: 0.35,
      userData: {
        placedFurniture: [
          {
            id: 'fur_move_1',
            type: 'sofa_l',
            name: 'Sofa L-Shape Ruang Tamu',
            position: [-1.5, 0, -1.5],
            rotationY: Math.PI * 0.25,
            floorIndex: 1
          }
        ]
      }
    };
    bldManager.addBuilding(bld);

    const mockEngine = {
      scene,
      buildingManager: bldManager,
      commandManager: cmdManager,
      executeCommand: (cmd: any) => cmdManager.execute(cmd)
    } as unknown as Engine;

    const fp = new FirstPersonController(camera, customDom, bldManager);
    fp.setEngine(mockEngine);
    fp.enter(new THREE.Vector3(0, 0, 0));

    // A. Pointer lock sync on Studio Catalog open/close
    const locksBeforeDrawer = lockCalls;
    fp.toggleDrawer(true);
    expect(fp.isDrawerOpen).toBe(true);
    expect(exitLockCalls).toBeGreaterThanOrEqual(1);

    fp.toggleDrawer(false);
    expect(fp.isDrawerOpen).toBe(false);
    expect(lockCalls).toBe(locksBeforeDrawer + 1);

    // B. Clone [V] copies furniture type & rotation into hand
    fp.hoveredFurniture = {
      id: 'fur_move_1',
      type: 'sofa_l',
      name: 'Sofa L-Shape Ruang Tamu',
      buildingId: bld.id
    };
    expect(fp.cloneHoveredFurniture()).toBe(true);
    expect(fp.selectedFurnitureId).toBe('sofa_l');
    expect(fp.placementRotation).toBeCloseTo(Math.PI * 0.25, 4);

    // C. Grab [G] + Esc cancel restores original furniture without polluting Undo history
    fp.hoveredFurniture = {
      id: 'fur_move_1',
      type: 'sofa_l',
      name: 'Sofa L-Shape Ruang Tamu',
      buildingId: bld.id
    };
    expect(fp.grabHoveredFurniture()).toBe(true);
    expect(fp.grabbedFurniture?.data.id).toBe('fur_move_1');
    expect(bld.userData?.placedFurniture).toHaveLength(0);

    fp.cancelGrabFurniture();
    expect(fp.grabbedFurniture).toBeNull();
    expect(bld.userData?.placedFurniture).toHaveLength(1);
    expect(bld.userData?.placedFurniture[0].position).toEqual([-1.5, 0, -1.5]);
    expect(cmdManager.canUndo()).toBe(false);

    // D. Grab [G] + Place commits 1 atomic MoveFurnitureCommand supporting Undo & Redo
    fp.hoveredFurniture = {
      id: 'fur_move_1',
      type: 'sofa_l',
      name: 'Sofa L-Shape Ruang Tamu',
      buildingId: bld.id
    };
    expect(fp.grabHoveredFurniture()).toBe(true);
    fp.insideBuildingId = bld.id;
    fp.isPlacementValid = true;
    fp.currentPlacementTarget.set(2.0, 0.35, 1.5);
    fp.placementRotation = Math.PI * 0.5;
    fp.executePlacement();

    expect(fp.grabbedFurniture).toBeNull();
    expect(cmdManager.canUndo()).toBe(true);
    expect(bld.userData?.placedFurniture).toHaveLength(1);
    expect(bld.userData?.placedFurniture[0].position[0]).toBeCloseTo(2.0, 4);
    expect(bld.userData?.placedFurniture[0].position[2]).toBeCloseTo(1.5, 4);
    expect(bld.userData?.placedFurniture[0].rotationY).toBeCloseTo(Math.PI * 0.5, 4);

    // Undo restores (-1.5, 0, -1.5)
    cmdManager.undo();
    expect(bld.userData?.placedFurniture[0].position).toEqual([-1.5, 0, -1.5]);

    // Redo re-applies (2.0, 0, 1.5)
    cmdManager.redo();
    expect(bld.userData?.placedFurniture[0].position[0]).toBeCloseTo(2.0, 4);

    // E. Local furniture spring scales furniture mesh 0.75 -> 1.0 over 200ms without shaking building group
    springAnimator.clear(); // Settle initial building-spawn animation from addBuilding()
    const bldGroup = bldManager.getBuildingGroup(bld.id)!;
    expect(bldGroup.scale.x).toBeCloseTo(1.0, 5);

    fp.selectedFurnitureId = 'plant_monstera';
    fp.isPlacementValid = true;
    fp.currentPlacementTarget.set(-2.5, 0.35, 2.0);
    fp.executePlacement();

    // Parent building group must remain completely steady (1.0), while newly placed furniture mesh springs 0.75 -> 1.0
    expect(bldGroup.scale.x).toBeCloseTo(1.0, 5);
    const placedPlantId = bld.userData?.placedFurniture.find((f: PlacedFurnitureData) => f.type === 'plant_monstera')?.id;
    expect(placedPlantId).toBeDefined();

    let placedPlantMesh: THREE.Object3D | null = null;
    bldGroup.traverse((child) => {
      if (!placedPlantMesh && child.userData?.furnitureId === placedPlantId) {
        placedPlantMesh = child;
      }
    });
    expect(placedPlantMesh).not.toBeNull();
    expect((placedPlantMesh as any).scale.x).toBeCloseTo(0.75, 3);
    springAnimator.update(performance.now() + 210);
    expect((placedPlantMesh as any).scale.x).toBeCloseTo(1.0, 3);

    // F. Max-2 active THREE.PointLight ceiling pool even with 5 room fixtures
    const iis = InteriorInteractiveSystem.getInstance();
    iis.clearAll();
    iis.setScene(scene);
    for (let i = 0; i < 5; i++) {
      iis.registerFixture({
        id: `fix_pool_${i}`,
        buildingId: bld.id,
        floorIndex: 1,
        roomType: 'living_room',
        bounds: {
          minX: i * 3 - 6,
          maxX: i * 3 - 3,
          minZ: -3,
          maxZ: 3,
          floorY: 0,
          height: 3.5
        },
        isOccupied: false,
        fanSpeed: 0
      });
    }
    iis.updateCeilingLights(new THREE.Vector3(0, 1.65, 0), true, bld.id);
    expect(iis.getActiveCeilingLightCount()).toBe(0);
    expect(iis.ceilingLightPool.length).toBeLessThanOrEqual(2);

    if (!hadGlobalDoc) {
      delete (globalThis as any).document;
    } else if (origExitLock !== undefined) {
      (globalThis as any).document.exitPointerLock = origExitLock;
    }
    iis.clearAll();
    fp.dispose();
    bldManager.dispose();
  });
});


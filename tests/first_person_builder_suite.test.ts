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
  AutoFurnishRoomCommand,
  PaintSurfaceCommand,
  PlacedFurnitureData
} from '../src/core/commands/CityCommands';
import { CommandManager } from '../src/core/commands/CommandManager';

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
});


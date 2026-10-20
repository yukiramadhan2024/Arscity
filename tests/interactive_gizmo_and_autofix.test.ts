import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { AutoFixService } from '../src/zones/AutoFixService';
import { LotParcel, ZONE_RULES } from '../src/zones/ZoneTypes';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { CommandManager } from '../src/core/commands/CommandManager';
import { UpdateBuildingParamCommand } from '../src/core/commands/CityCommands';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LotManager } from '../src/zones/LotManager';
import { RoadManager } from '../src/roads/RoadManager';
import { LandscapeManager } from '../src/world/LandscapeManager';

describe('Smart Auto-Fix & 3D Gizmo Parameter Manipulation', () => {
  let scene: THREE.Scene;
  let commandManager: CommandManager;
  let buildingManager: BuildingManager;
  let roadManager: RoadManager;
  let landscapeManager: LandscapeManager;
  let lotManager: LotManager;
  let mockEngine: any;

  beforeEach(() => {
    scene = new THREE.Scene();
    commandManager = new CommandManager();
    buildingManager = new BuildingManager(scene);
    roadManager = new RoadManager(scene);
    landscapeManager = new LandscapeManager(scene);
    lotManager = new LotManager(scene, buildingManager, roadManager, landscapeManager);

    mockEngine = {
      scene,
      commandManager,
      buildingManager,
      roadManager,
      landscapeManager,
      lotManager,
      executeCommand: (cmd: any) => commandManager.execute(cmd),
      undo: () => commandManager.undo(),
      redo: () => commandManager.redo()
    };
  });

  it('correctly detects lots requiring Auto-Fix (canAutoFix)', () => {
    const lot: LotParcel = {
      id: 'lot_test_1',
      name: 'Kavling Uji',
      zone: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      width: 20,
      length: 20,
      areaM2: 400,
      containedBuildingIds: ['bld_1'],
      metrics: {
        groundFootprintM2: 280,
        totalFloorAreaM2: 280,
        greenAreaM2: 20,
        pavedAreaM2: 100,
        kdbPercent: 70, // Max for residential is 60%
        klbRatio: 0.7,
        kdhPercent: 5,  // Min for residential is 25%
        gsbFrontActualM: 1.5, // Min is 3.0m
        gsbSideActualM: 2.0,
        gsbRearActualM: 2.0,
        gsbDistanceM: 1.5,
        maxFloors: 1
      },
      violations: [
        {
          code: 'KDB',
          title: 'KDB Berlebih',
          actual: '70%',
          allowed: '60%',
          message: 'Melebihi batas',
          advice: 'Kecilkan'
        }
      ]
    };

    const building: BuildingInstance = {
      id: 'bld_1',
      presetKey: 'house_36',
      name: 'Rumah Uji',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 7),
      rotationY: 0,
      width: 16,
      length: 17,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 0.8,
      roofColor: '#a04030',
      roofMaterial: 'clay_tile',
      wallColor: '#ffffff',
      wallMaterial: 'plaster'
    };

    expect(AutoFixService.canAutoFix(lot, building)).toBe(true);
  });

  it('applies Smart Auto-Fix: corrects GSB, scales KDB footprint, enhances KDH, and supports full Undo/Redo', () => {
    // 1. Create a lot in lotManager
    const lot = lotManager.createLot(new THREE.Vector3(0, 0, 0), 20, 20, 'residential');

    // 2. Add an oversized building that breaches GSB and KDB
    const building: BuildingInstance = {
      id: 'bld_fix_test',
      presetKey: 'house_36',
      name: 'Rumah Uji Pelanggar',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 7), // Far forward near road edge
      rotationY: 0,
      width: 17,
      length: 16,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 0.8,
      roofColor: '#a04030',
      roofMaterial: 'clay_tile',
      wallColor: '#ffffff',
      wallMaterial: 'plaster'
    };
    buildingManager.addBuilding(building);
    lotManager.evaluateBuildingCode(lot);

    const initialPos = building.position.clone();
    const initialWidth = building.width;
    const initialLength = building.length;

    // Apply Smart Auto-Fix
    const result = AutoFixService.applyAutoFix(mockEngine, lot, building);
    expect(result.success).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);

    // Verify building was pushed back to satisfy front GSB
    expect(building.position.z).toBeLessThan(initialPos.z);

    // Verify building footprint was resized to satisfy KDB max
    const newFootprintArea = building.width * building.length;
    const maxAllowedArea = lot.areaM2 * (ZONE_RULES.residential.maxKDB / 100);
    expect(newFootprintArea).toBeLessThanOrEqual(maxAllowedArea + 0.1);

    // Verify command was registered and can be undone
    expect(commandManager.canUndo()).toBe(true);

    // Undo Auto-Fix
    mockEngine.undo();
    expect(building.position.z).toBeCloseTo(initialPos.z, 2);
    expect(building.width).toBe(initialWidth);
    expect(building.length).toBe(initialLength);

    // Redo Auto-Fix
    mockEngine.redo();
    expect(building.position.z).toBeLessThan(initialPos.z);
    expect(building.width * building.length).toBeLessThanOrEqual(maxAllowedArea + 0.1);
  });

  it('records 3D Gizmo floor height adjustments and supports Undo/Redo', () => {
    const building: BuildingInstance = {
      id: 'bld_gizmo_floor',
      presetKey: 'shophouse_standard',
      name: 'Ruko Uji',
      category: 'commercial',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 8,
      length: 14,
      floorCount: 2,
      floorHeight: 3.5,
      roofType: 'flat',
      roofOverhang: 0.5,
      roofColor: '#505050',
      roofMaterial: 'concrete',
      wallColor: '#f0f0f0',
      wallMaterial: 'concrete'
    };
    buildingManager.addBuilding(building);

    // Simulate Gizmo vertical extrusion handle: 2 floors -> 4 floors
    const cmdFloor = new UpdateBuildingParamCommand(
      mockEngine,
      building.id,
      { floorCount: 2 },
      { floorCount: 4 },
      'Gizmo Extrude Lantai'
    );
    mockEngine.executeCommand(cmdFloor);

    expect(building.floorCount).toBe(4);
    expect(commandManager.canUndo()).toBe(true);

    mockEngine.undo();
    expect(building.floorCount).toBe(2);

    mockEngine.redo();
    expect(building.floorCount).toBe(4);
  });

  it('records 3D Gizmo roof overhang / tritisan adjustments and supports Undo/Redo', () => {
    const building: BuildingInstance = {
      id: 'bld_gizmo_overhang',
      presetKey: 'joglo_heritage',
      name: 'Joglo Uji',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 12,
      length: 12,
      floorCount: 1,
      floorHeight: 3.8,
      roofType: 'joglo',
      roofOverhang: 0.8,
      roofColor: '#8B4513',
      roofMaterial: 'clay_tile',
      wallColor: '#8B5A2B',
      wallMaterial: 'wood'
    };
    buildingManager.addBuilding(building);

    // Simulate Gizmo overhang handle: 0.8m -> 1.8m
    const cmdOverhang = new UpdateBuildingParamCommand(
      mockEngine,
      building.id,
      { roofOverhang: 0.8 },
      { roofOverhang: 1.8 },
      'Gizmo Overhang Tritisan Atap'
    );
    mockEngine.executeCommand(cmdOverhang);

    expect(building.roofOverhang).toBe(1.8);

    mockEngine.undo();
    expect(building.roofOverhang).toBe(0.8);

    mockEngine.redo();
    expect(building.roofOverhang).toBe(1.8);
  });

  it('records 3D Gizmo rotation ring with 15° magnetic snapping and supports Undo/Redo', () => {
    const building: BuildingInstance = {
      id: 'bld_gizmo_rotation',
      presetKey: 'house_36',
      name: 'Rumah Putar Uji',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 8,
      length: 10,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 0.8,
      roofColor: '#a04030',
      roofMaterial: 'clay_tile',
      wallColor: '#ffffff',
      wallMaterial: 'plaster'
    };
    buildingManager.addBuilding(building);

    // Simulate 45° rotation (3 snap steps of 15°)
    const targetRad = (45 * Math.PI) / 180;
    const cmdRotate = new UpdateBuildingParamCommand(
      mockEngine,
      building.id,
      { rotationY: 0 },
      { rotationY: targetRad },
      'Gizmo Rotasi 45 Derajat'
    );
    mockEngine.executeCommand(cmdRotate);

    expect(building.rotationY).toBeCloseTo(targetRad, 3);

    mockEngine.undo();
    expect(building.rotationY).toBe(0);

    mockEngine.redo();
    expect(building.rotationY).toBeCloseTo(targetRad, 3);
  });
});

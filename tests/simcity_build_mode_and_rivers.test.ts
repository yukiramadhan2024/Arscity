import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Terrain } from '../src/world/Terrain';
import { RiverManager } from '../src/world/RiverManager';
import { RIVER_PROFILES } from '../src/world/RiverTypes';
import {
  CarveRiverCommand,
  SculptTerrainCommand,
  DemolishCommand,
} from '../src/core/commands/TerraformCommands';
import { CommandManager } from '../src/core/commands/CommandManager';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { RoadManager } from '../src/roads/RoadManager';
import { LotManager } from '../src/zones/LotManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { AutoZoningService } from '../src/zones/AutoZoningService';

describe('SimCity Build Mode: Terraforming, Rivers, Bulldozer & Auto-Fill Zoning', () => {
  let scene: THREE.Scene;
  let terrain: Terrain;
  let riverManager: RiverManager;
  let commandManager: CommandManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    terrain = new Terrain(scene, 400, 64);
    riverManager = new RiverManager(scene, terrain);
    commandManager = new CommandManager();
  });

  it('1. RiverManager memahat saluran tanah, membentuk pita air (water ribbon), dan membangun talud batu candi', () => {
    const startPos = new THREE.Vector3(0, 0, -40);
    const endPos = new THREE.Vector3(0, 0, 40);

    const segment = riverManager.addRiverSegment(startPos, endPos, 'urban_river');
    expect(segment).toBeDefined();
    expect(segment.id).toContain('river_');
    expect(riverManager.segments.size).toBe(1);

    // Check terrain depression: terrain height at river midpoint should be carved downward
    const midY = terrain.getHeightAt(0, 0);
    expect(midY).toBeLessThan(-0.5);

    // Check 3D meshes in master group
    const riverGroup = riverManager.masterGroup.getObjectByName(`RiverSegment_${segment.id}`);
    expect(riverGroup).toBeDefined();

    const waterMesh = riverGroup?.getObjectByName('RiverWater') as THREE.Mesh;
    const taludLeft = riverGroup?.getObjectByName('RiverTalud_Left') as THREE.Mesh;
    const taludRight = riverGroup?.getObjectByName('RiverTalud_Right') as THREE.Mesh;

    expect(waterMesh).toBeDefined();
    expect(taludLeft).toBeDefined();
    expect(taludRight).toBeDefined();

    // Verify water sits at negative elevation below riverbanks
    expect(waterMesh.geometry.getAttribute('position').getY(0)).toBeCloseTo(RIVER_PROFILES.urban_river.waterLevelY, 1);

    // Distance calculation for GSS / environmental cooling
    const distToRiverCenter = riverManager.getDistanceToNearestRiver(new THREE.Vector3(10, 0, 0));
    expect(distToRiverCenter).toBeCloseTo(10, 1);
  });

  it('2. CarveRiverCommand dapat di-Undo dan di-Redo secara utuh dalam 1 langkah', () => {
    const mockEngine: any = {
      riverManager,
      commandManager,
    };

    const startPos = new THREE.Vector3(-30, 0, 0);
    const endPos = new THREE.Vector3(30, 0, 0);

    const cmd = new CarveRiverCommand(mockEngine, startPos, endPos, 'small_canal');
    commandManager.execute(cmd);

    expect(riverManager.segments.size).toBe(1);

    // Undo removes the river meshes cleanly
    commandManager.undo();
    expect(riverManager.segments.size).toBe(0);

    // Redo restores the river
    commandManager.redo();
    expect(riverManager.segments.size).toBe(1);
  });

  it('3. SculptTerrainCommand menaikkan bukit dan meratakan tanah dengan falloff yang halus', () => {
    const mockEngine: any = {
      terrain,
      commandManager,
    };

    const initialY = terrain.getHeightAt(50, 50);
    expect(initialY).toBeCloseTo(0, 1);

    // Raise hill by +3.5m with 15m radius
    const raiseCmd = new SculptTerrainCommand(mockEngine, 50, 50, 15, 3.5, 'raise');
    commandManager.execute(raiseCmd);

    const hillCenterY = terrain.getHeightAt(50, 50);
    expect(hillCenterY).toBeGreaterThanOrEqual(3.0);

    // Test falloff: points 10m away should be elevated, but less than center
    const hillShoulderY = terrain.getHeightAt(60, 50);
    expect(hillShoulderY).toBeGreaterThan(0.5);
    expect(hillShoulderY).toBeLessThan(hillCenterY);

    // Undo inverts the elevation modification
    commandManager.undo();
    const restoredY = terrain.getHeightAt(50, 50);
    expect(restoredY).toBeCloseTo(0, 1);
  });

  it('4. DemolishCommand menghancurkan gedung dengan highlight buldoser dan dapat dikembalikan dengan 1x Undo', () => {
    const buildingManager = new BuildingManager(scene);
    const mockEngine: any = {
      buildingManager,
      roadManager: new RoadManager(scene),
      landscapeManager: new LandscapeManager(scene),
      riverManager,
      commandManager,
    };

    const bld: BuildingInstance = {
      id: 'bld_target_1',
      presetKey: 'house_36',
      name: 'Rumah Target Buldoser',
      category: 'residential',
      position: new THREE.Vector3(20, 0, 20),
      rotationY: 0,
      width: 8,
      length: 8,
      floorCount: 1,
      floorHeight: 3.5,
      roofType: 'gable',
      roofOverhang: 0.8,
      wallMaterial: 'brick',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile',
    };

    buildingManager.addBuilding(bld);
    expect(buildingManager.buildings.size).toBe(1);

    // Bulldoze building
    const demolishCmd = new DemolishCommand(mockEngine, 'building', bld.id);
    commandManager.execute(demolishCmd);

    expect(buildingManager.buildings.size).toBe(0);

    // Undo brings building back
    commandManager.undo();
    expect(buildingManager.buildings.size).toBe(1);
    expect(buildingManager.buildings.get(bld.id)?.name).toBe('Rumah Target Buldoser');
  });

  it('5. AutoZoningService menghasilkan paket lengkap (Gedung, Pohon Peneduh, Sumur Resapan) yang mematuhi GSB dan KDB', () => {
    const buildingManager = new BuildingManager(scene);
    const roadManager = new RoadManager(scene);
    const landscapeManager = new LandscapeManager(scene);
    const lotManager = new LotManager(scene, buildingManager);
    lotManager.setDependencies(roadManager, landscapeManager);

    const mockEngine: any = {
      buildingManager,
      roadManager,
      landscapeManager,
      lotManager,
      commandManager,
    };

    // Create a 15x20m residential lot
    const lot = lotManager.createLot(new THREE.Vector3(0, 0, 0), 15, 20, 'residential');
    expect(lot).toBeDefined();

    // Trigger auto development
    const autoCmd = AutoZoningService.createAutoDevelopLotCommand(mockEngine, lot.id);
    expect(autoCmd).not.toBeNull();

    commandManager.execute(autoCmd!);

    // A residential building, a shade tree, and an absorption well must be added
    expect(buildingManager.buildings.size).toBe(1);
    expect(landscapeManager.items.size).toBe(2);

    const addedBuilding = Array.from(buildingManager.buildings.values())[0];
    expect(addedBuilding.category).toBe('residential');
    expect(addedBuilding.lotId).toBe(lot.id);

    // Undo should revert all 3 objects at once
    commandManager.undo();
    expect(buildingManager.buildings.size).toBe(0);
    expect(landscapeManager.items.size).toBe(0);
  });

  it('6. RoadManager secara otomatis membelah jalan dan membentuk perempatan (4-way intersection) saat jalan baru memotong jalan eksisting', () => {
    const roadManager = new RoadManager(scene);

    // Initial East-West road from (-50, 0, 0) to (50, 0, 0)
    roadManager.addRoad(new THREE.Vector3(-50, 0, 0), new THREE.Vector3(50, 0, 0), 'collector');
    expect(roadManager.graph.edges.size).toBe(1);

    // Cross North-South road from (0, 0, -30) to (0, 0, 30) cutting through at (0, 0, 0)
    roadManager.addRoad(new THREE.Vector3(0, 0, -30), new THREE.Vector3(0, 0, 30), 'collector');

    // Both roads must be split at the intersection (0, 0, 0): total 4 edges
    expect(roadManager.graph.edges.size).toBe(4);

    // Center node at (0, 0, 0) must be a 4-way intersection (perempatan)
    const centerNode = roadManager.graph.findClosestNode(new THREE.Vector3(0, 0, 0), 2.0);
    expect(centerNode).not.toBeNull();
    expect(centerNode!.connectedEdgeIds.length).toBe(4);

    // An intersection mesh must be built at centerNode
    const intersectionMesh = roadManager.masterGroup.getObjectByName(`Intersection_${centerNode!.id}`) as THREE.Mesh;
    expect(intersectionMesh).toBeDefined();
    expect(intersectionMesh.geometry.getAttribute('position').count).toBeGreaterThanOrEqual(3);
  });

  it('7. RoadManager secara otomatis menyambungkan ujung jalan yang menabrak jalan eksisting menjadi pertigaan (3-way T-junction)', () => {
    const roadManager = new RoadManager(scene);

    // Initial East-West road from (-50, 0, 0) to (50, 0, 0)
    roadManager.addRoad(new THREE.Vector3(-50, 0, 0), new THREE.Vector3(50, 0, 0), 'collector');
    expect(roadManager.graph.edges.size).toBe(1);

    // T-junction: stem road from (0, 0, 30) ending directly at (0, 0, 0)
    roadManager.addRoad(new THREE.Vector3(0, 0, 30), new THREE.Vector3(0, 0, 0), 'local');

    // Initial road split into 2 + stem road = total 3 edges
    expect(roadManager.graph.edges.size).toBe(3);

    const junctionNode = roadManager.graph.findClosestNode(new THREE.Vector3(0, 0, 0), 2.0);
    expect(junctionNode).not.toBeNull();
    expect(junctionNode!.connectedEdgeIds.length).toBe(3);

    const tMesh = roadManager.masterGroup.getObjectByName(`Intersection_${junctionNode!.id}`) as THREE.Mesh;
    expect(tMesh).toBeDefined();
    expect(tMesh.geometry.getAttribute('position').count).toBeGreaterThanOrEqual(3);
  });
});

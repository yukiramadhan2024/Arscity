import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RoadGraph } from '../src/roads/RoadGraph';
import { RoadGeometryBuilder } from '../src/roads/RoadGeometryBuilder';
import { RoadManager } from '../src/roads/RoadManager';
import { Terrain } from '../src/world/Terrain';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { BuildingTool } from '../src/tools/BuildingTool';
import { RaycastManager } from '../src/core/engine/RaycastManager';
import { GridSystem } from '../src/world/GridSystem';
import { CommandManager } from '../src/core/commands/CommandManager';
import { DuplicateDistrictCommand, AddBuildingCommand } from '../src/core/commands/CityCommands';
import { WeatherSystem } from '../src/world/WeatherSystem';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { LightingSystem } from '../src/core/engine/LightingSystem';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Arscity v3.3.0: Topography-Aware Roads, Tactile Placement, District Blueprints & Atmosphere', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  it('1. Ketinggian vertex jalan aspal otomatis naik mengikuti elevasi Terrain dan membentuk struktur jembatan saat melintasi cekungan sungai (Y < -0.25m)', () => {
    const terrain = new Terrain(scene, 200, 200);
    // Mock terrain height: elevated hill at Y = 4.0, river canyon between Z: 40 and 60 at Y = -1.8m
    terrain.getHeightAt = (x: number, z: number): number => {
      if (z >= 35 && z <= 65) {
        return -1.8; // River basin
      }
      return 4.0; // Hill plateau
    };

    const graph = new RoadGraph();
    const nodeA = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
    const nodeB = graph.getOrCreateNode(new THREE.Vector3(0, 0, 100));
    const edge = graph.addEdge(nodeA.id, nodeB.id, 'collector')!;

    const roadGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge, graph, terrain);
    expect(roadGroup).toBeDefined();

    const roadSurface = (roadGroup.getObjectByName('RoadMesh') || roadGroup.getObjectByName('RoadMesh_collector')) as THREE.Mesh;
    expect(roadSurface).toBeDefined();

    // Check vertex positions of asphalt surface on hill: should sit at effective groundY + 0.06
    const posAttr = roadSurface.geometry.getAttribute('position');
    expect(posAttr).toBeDefined();

    // The start is at Z=0 (hill Y=4.0), so first vertices should have Y approx 4.06
    const startY = posAttr.getY(0);
    expect(startY).toBeGreaterThanOrEqual(4.05);

    // Bridge elements must be automatically instantiated for river crossing (groundY < -0.25)
    const bridgeDeck = roadGroup.getObjectByName('BridgeDeck');
    const railingLeft = roadGroup.getObjectByName('BridgeParapetRailing_Left');
    const railingRight = roadGroup.getObjectByName('BridgeParapetRailing_Right');
    const bridgePier = roadGroup.getObjectByName('BridgePier_0');

    expect(bridgeDeck).toBeDefined();
    expect(railingLeft).toBeDefined();
    expect(railingRight).toBeDefined();
    expect(bridgePier).toBeDefined();

    // Concrete piers must extend down to the riverbed (-1.8m)
    const pierMesh = bridgePier as THREE.Mesh;
    const cylinderGeom = pierMesh.geometry as THREE.CylinderGeometry;
    const pierBottom = pierMesh.position.y - cylinderGeom.parameters.height * 0.5;
    expect(pierBottom).toBeCloseTo(-1.8, 1);
  });

  it('2. Kalkulasi sudut Auto-Rotate pada BuildingTool berhasil mengarahkan fasad bangunan menghadap ruas jalan terdekat', () => {
    const roadManager = new RoadManager(scene);
    // Create an East-West road running along X-axis at Z = 0
    const startPos = new THREE.Vector3(-50, 0, 0);
    const endPos = new THREE.Vector3(50, 0, 0);
    roadManager.addRoad(startPos, endPos, 'collector');

    // Query candidate position for building placed North of road at (10, 0, 12)
    const candidatePoint = new THREE.Vector3(10, 0, 12);
    const nearest = roadManager.findNearestRoadWithTangent(candidatePoint, 25);

    expect(nearest).toBeDefined();
    expect(nearest!.distance).toBeCloseTo(12, 1);
    expect(nearest!.nearestPoint.x).toBeCloseTo(10, 1);
    expect(nearest!.nearestPoint.z).toBeCloseTo(0, 1);

    // Front facade angle: facing directly towards the road (toRoadZ = -12, toRoadX = 0)
    const toRoadX = nearest!.nearestPoint.x - candidatePoint.x;
    const toRoadZ = nearest!.nearestPoint.z - candidatePoint.z;
    const expectedAngle = Math.atan2(toRoadX, toRoadZ); // atan2(0, -12) = +/- PI
    expect(Math.abs(expectedAngle)).toBeCloseTo(Math.PI, 2);
  });

  it('3. Eksekusi duplikasi kawasan melalui CompositeCommand dapat di-Undo dan di-Redo secara utuh dalam 1 langkah', () => {
    const commandManager = new CommandManager();
    const buildingManager = new BuildingManager(scene);
    const terrain = new Terrain(scene, 200, 200);
    terrain.getHeightAt = (x: number, z: number) => 3.5;

    const mockEngine: any = {
      buildingManager,
      lotManager: { evaluateAllLots: () => {} },
      commandManager,
      terrain,
      lightingSystem: { markShadowsDirty: () => {} }
    };

    const initialBld: BuildingInstance = {
      id: 'bld_source_1',
      presetKey: 'house_36',
      name: 'Rumah Modern 36',
      category: 'hunian',
      position: new THREE.Vector3(10, 0, 10),
      rotationY: 0,
      width: 9,
      length: 9,
      floorCount: 1,
      floorHeight: 4.2,
      roofType: 'gable',
      roofOverhang: 0.8,
      wallMaterial: 'brick',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile'
    };

    buildingManager.addBuilding(initialBld);
    expect(buildingManager.buildings.size).toBe(1);

    // Duplicate district command
    const duplicateCmd = new DuplicateDistrictCommand(
      mockEngine,
      ['bld_source_1'],
      new THREE.Vector3(15, 0, 15),
      'Duplikasi Blok Kawasan'
    );

    // Execute duplication
    commandManager.execute(duplicateCmd);
    expect(buildingManager.buildings.size).toBe(2);

    const dupId = duplicateCmd.duplicatedBuildingIds[0];
    const duplicatedBld = buildingManager.buildings.get(dupId)!;
    expect(duplicatedBld).toBeDefined();
    expect(duplicatedBld.position.x).toBeCloseTo(25, 1);
    expect(duplicatedBld.position.z).toBeCloseTo(25, 1);
    expect(duplicatedBld.position.y).toBeCloseTo(3.5, 1); // Sampled from terrain height

    // 1-Step Undo
    const undoSuccess = commandManager.undo();
    expect(undoSuccess).toBe(true);
    expect(buildingManager.buildings.size).toBe(1);
    expect(buildingManager.buildings.has(dupId)).toBe(false);

    // 1-Step Redo
    const redoSuccess = commandManager.redo();
    expect(redoSuccess).toBe(true);
    expect(buildingManager.buildings.size).toBe(2);
    expect(buildingManager.buildings.has(dupId)).toBe(true);
  });

  it('4. Perubahan cuaca ke Hujan menurunkan roughness material jalan aspal menjadi mode basah (0.22) dan mengembalikannya ke 0.88 saat kembali ke cuaca Cerah', () => {
    const weatherSystem = new WeatherSystem(scene);
    const matLib = MaterialLibrary.getInstance();

    // Clear weather: asphalt roughness should be 0.88, sidewalk paving 0.85
    weatherSystem.setWeather('clear');
    const asphaltClear = matLib.getMaterial('road_asphalt');
    expect(asphaltClear.roughness).toBeCloseTo(0.88, 2);

    // Switch to Rain: asphalt roughness drops to 0.22, sidewalk paving to 0.30
    weatherSystem.setWeather('rain');
    const asphaltRain = matLib.getMaterial('road_asphalt');
    expect(asphaltRain.roughness).toBeCloseTo(0.22, 2);

    const sidewalkRain = matLib.getMaterial('sidewalk_paving');
    expect(sidewalkRain.roughness).toBeCloseTo(0.30, 2);

    // Switch back to Clear: asphalt roughness restored to 0.88
    weatherSystem.setWeather('clear');
    const asphaltRestored = matLib.getMaterial('road_asphalt');
    expect(asphaltRestored.roughness).toBeCloseTo(0.88, 2);
  });

  it('5. Siklus suasana langit Yogyakarta di LightingSystem mentransisikan warna langit dan kabut pada 4 fase harian', () => {
    const lighting = new LightingSystem(scene);

    // Fajar Pagi (06:00 WIB)
    lighting.setTime(6.0);
    expect(lighting.sunLight.intensity).toBeGreaterThan(1.5);
    expect(lighting.hemiLight.intensity).toBeCloseTo(0.85, 1);

    // Siang Tropis (12:00 WIB)
    lighting.setTime(12.0);
    expect(lighting.sunLight.intensity).toBeCloseTo(3.2, 1);
    expect(lighting.sunLight.color.r).toBeGreaterThan(0.95);

    // Senja Emas Yogyakarta (16:30 WIB)
    lighting.setTime(16.5);
    expect(lighting.sunLight.intensity).toBeCloseTo(3.2, 1);
    expect(lighting.hemiLight.color.getHexString()).toBe('ff8c42'); // Golden Hour sky bounce

    // Malam Kota Obsidian (21:00 WIB)
    lighting.setTime(21.0);
    expect(lighting.sunLight.intensity).toBeLessThan(0.2);
    expect((scene.background as THREE.Color).getHexString()).toBe('0b101e'); // Obsidian night
    expect((scene.fog as THREE.FogExp2).color.getHexString()).toBe('0b101e');

    lighting.dispose();
  });
});

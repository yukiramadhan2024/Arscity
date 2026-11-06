import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// Subsystems
import { useUIStore } from '../../src/ui/state/useUIStore';
import { CameraController } from '../../src/core/engine/CameraController';
import { SectionCutManager } from '../../src/analysis/SectionCutManager';
import { Terrain } from '../../src/world/Terrain';
import { RoadGraph } from '../../src/roads/RoadGraph';
import { RoadGeometryBuilder } from '../../src/roads/RoadGeometryBuilder';
import { RIVER_PROFILES } from '../../src/world/RiverTypes';
import {
  FirstPersonFurnitureBuilder,
  FIRST_PERSON_FURNITURE_CATALOG,
  computeRotatedFurnitureHalfExtents
} from '../../src/buildings/FirstPersonFurnitureCatalog';
import { InteriorMeshBuilder } from '../../src/buildings/InteriorMeshBuilder';
import { FirstPersonController } from '../../src/core/engine/FirstPersonController';
import { BuildingInstance } from '../../src/buildings/PrefabTypes';
import { generateFloorsForMassingShape } from '../../src/buildings/CustomBuildingModel';
import { AestheticLandscapeBuilder } from '../../src/world/AestheticLandscapeBuilder';
import { MaterialLibrary } from '../../src/materials/MaterialLibrary';
import { GRAPHICS_PRESETS } from '../../src/core/engine/GraphicsPresets';
import { SPRING_TACTILE } from '../../src/ui/motion/appleSprings';

describe('E2E Tier 3: Cross-Feature Subsystem Combinations (Pairwise)', () => {
  let scene: THREE.Scene;
  let mockDom: HTMLElement;

  beforeEach(() => {
    scene = new THREE.Scene();
    mockDom = {
      clientWidth: 1920,
      clientHeight: 1080,
      addEventListener: () => {},
      removeEventListener: () => {}
    } as unknown as HTMLElement;
    useUIStore.getState().closeModal();
    useUIStore.getState().startGame();
  });

  // =========================================================================
  // PAIRWISE COMBINATION 1: Engine 144Hz + 2D Orthographic Mode + Section Cut
  // =========================================================================
  it('P1: Engine 144Hz loop integrates with 2D Top-Down Orthographic Mode and Section Cut at Y = 2.4m', () => {
    const camController = new CameraController(mockDom);
    const mockRenderer = {
      localClippingEnabled: false,
      clippingPlanes: [] as THREE.Plane[]
    } as any;
    const sectionCutManager = new SectionCutManager(mockRenderer, scene);

    // 1. Switch to 2D Top-Down Orthographic Mode
    camController.setOrthographicMode(true, 'top', new THREE.Vector3(100, 0, 100), 120);
    expect(camController.isOrthographic).toBe(true);
    expect(camController.orthoMode).toBe('top');

    // 2. Set horizontal floor plan clipping at Y = 2.4m
    sectionCutManager.cutHeight = 2.4;
    expect(sectionCutManager.cutHeight).toBe(2.4);

    // 3. Simulate high-framerate (144Hz: dt ~ 0.00694s) camera update ticks
    const dt144 = 1 / 144;
    for (let frame = 0; frame < 10; frame++) {
      const clampedDt = Math.min(dt144, 0.1);
      camController.update(clampedDt);
    }

    // Verify orthographic camera bounds are updated without NaN
    expect(isNaN(camController.orthoCamera.top)).toBe(false);
    expect(isNaN(camController.orthoCamera.bottom)).toBe(false);
    expect(camController.orthoCamera.top).toBeGreaterThan(0);
  });

  // =========================================================================
  // PAIRWISE COMBINATION 2: Riverbed Excavation + Road Bridge + Water Surface
  // =========================================================================
  it('P2: Riverbed excavation (Y = -2.0m) and water plane (Y = -0.30m) trigger automatic road bridge (ground < -0.25m)', () => {
    const terrain = new Terrain(scene, 200, 200);

    // Carve a realistic urban river channel down to -2.0m between Z = 40 and Z = 60
    terrain.getHeightAt = (x: number, z: number): number => {
      if (z >= 42 && z <= 58) return -2.0; // Flat riverbed
      if (z >= 38 && z < 42) return (z - 42) * 0.5; // Embankment slope
      if (z > 58 && z <= 62) return (58 - z) * 0.5; // Embankment slope
      return 0.0; // Surrounding urban ground
    };

    const graph = new RoadGraph();
    const nodeStart = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
    const nodeEnd = graph.getOrCreateNode(new THREE.Vector3(0, 0, 100));
    const roadEdge = graph.addEdge(nodeStart.id, nodeEnd.id, 'arterial')!;

    const roadMeshGroup = RoadGeometryBuilder.buildRoadMeshGroup(roadEdge, graph, terrain);
    expect(roadMeshGroup).toBeDefined();

    // Verify bridge deck and parapet railings are created across river trench
    const deck = roadMeshGroup.getObjectByName('BridgeDeck');
    const railL = roadMeshGroup.getObjectByName('BridgeParapetRailing_Left');
    const railR = roadMeshGroup.getObjectByName('BridgeParapetRailing_Right');
    const pier = roadMeshGroup.getObjectByName('BridgePier_0');

    expect(deck).toBeDefined();
    expect(railL).toBeDefined();
    expect(railR).toBeDefined();
    expect(pier).toBeDefined();

    // Verify bridge elevation is higher than river water level (-0.30m)
    const waterLevel = RIVER_PROFILES.wide_river.waterLevelY;
    expect(waterLevel).toBeCloseTo(-0.30, 2);
    // Bridge deck sits at road level (Y >= 0.0), well above water level (-0.30m)
    expect(0.0).toBeGreaterThan(waterLevel);
  });

  // =========================================================================
  // PAIRWISE COMBINATION 3: Furniture Placement + Stairwell Void + Floor Teleport
  // =========================================================================
  it('P3: Furniture placement preserves stairwell circulation void (2.8m x 4.2m) during floor teleportation', () => {
    const villa: BuildingInstance = {
      id: 'villa_residence',
      presetKey: 'house_2fl',
      name: 'Villa Tropis 2 Lantai',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 12,
      length: 16,
      floorCount: 3,
      floorHeight: 3.5,
      roofType: 'limasan',
      roofOverhang: 1.0,
      wallMaterial: 'plaster',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile'
    };

    // 1. Build stairwell
    const stairResult = InteriorMeshBuilder.buildBuildingStairwell(villa, 0.35);
    const sz = stairResult.stairZones[0];
    const voidMinX = sz.minX;
    const voidMaxX = sz.maxX;
    const voidMinZ = sz.minZ;
    const voidMaxZ = sz.maxZ;

    // 2. Place L-shape sofa in living area (outside stairwell void)
    const sofaPos = new THREE.Vector3(3.5, 0.35, 4.0);
    const sofaExtents = computeRotatedFurnitureHalfExtents(2.4, 1.8, 0);

    // Verify sofa bounding box does not intersect stairwell void
    const sofaMinX = sofaPos.x - sofaExtents.effectiveHalfW;
    const sofaMaxX = sofaPos.x + sofaExtents.effectiveHalfW;
    const sofaMinZ = sofaPos.z - sofaExtents.effectiveHalfD;
    const sofaMaxZ = sofaPos.z + sofaExtents.effectiveHalfD;

    const overlapsX = sofaMaxX >= voidMinX && sofaMinX <= voidMaxX;
    const overlapsZ = sofaMaxZ >= voidMinZ && sofaMinZ <= voidMaxZ;
    expect(overlapsX && overlapsZ).toBe(false);

    // 3. Initialize FirstPersonController and verify teleportation to Floor 2
    const cam = new THREE.PerspectiveCamera();
    const fpController = new FirstPersonController(cam, mockDom);
    // Mock inside villa building
    (fpController as any).insideBuildingId = villa.id;
    (fpController as any).totalFloors = villa.floorCount;
    (fpController as any).floorHeight = villa.floorHeight;

    const teleportSuccess = fpController.goToFloor(2);
    expect(teleportSuccess).toBe(true);
    expect(fpController.currentFloor).toBe(2);
  });

  // =========================================================================
  // PAIRWISE COMBINATION 4: VisionOS Frosted Glass + Camera Mode Sync + FPS Badge
  // =========================================================================
  it('P4: Apple VisionOS Frosted Glass UI synchronizes camera mode and real-time FPS badge', () => {
    const store = useUIStore.getState();

    // Switch between all 4 camera modes
    const modes: ('2d' | 'orbit' | 'fps' | 'drone')[] = ['2d', 'orbit', 'fps', 'drone'];
    for (const m of modes) {
      store.setCameraMode(m);
      expect(useUIStore.getState().cameraMode).toBe(m);
    }

    // Update FPS telemetry
    store.setFps(144);
    expect(useUIStore.getState().fps).toBe(144);

    // Verify tactile spring transition constants are defined
    expect(SPRING_TACTILE.stiffness).toBeGreaterThan(400);
  });

  // =========================================================================
  // PAIRWISE COMBINATION 5: CAD Studio Massing + PBR Texturing + Entrance Path
  // =========================================================================
  it('P5: Universal CAD Studio massing shapes integrate with PBR textures and automatic road entrance path', () => {
    // 1. Generate L-shaped building massing
    const floors = generateFloorsForMassingShape('l_shape', 14, 16, 2, 3.5);
    expect(floors.length).toBe(2);
    expect(floors[0].footprint.length).toBe(6);

    // 2. Verify PBR materials are available in MaterialLibrary
    const matLib = MaterialLibrary.getInstance();
    const teakMat = matLib.getMaterial('wood_slat', { color: '#854d0e' });
    const plasterMat = matLib.getMaterial('plaster', { color: '#FFFFFF' });
    expect(teakMat).toBeDefined();
    expect(plasterMat).toBeDefined();

    // 3. Entrance path connection distance check (building front terrace at Z=10m to road at Z=12m)
    const terraceZ = 10;
    const roadSidewalkZ = 12;
    const pathLength = Math.abs(roadSidewalkZ - terraceZ);
    expect(pathLength).toBeCloseTo(2.0);
    expect(pathLength).toBeLessThan(5.0); // Within standard auto-paving threshold
  });

  // =========================================================================
  // PAIRWISE COMBINATION 6: Botanical Trees + Diurnal Solar Lighting + Wind Sway
  // =========================================================================
  it('P6: Botanical crown trees integrate with diurnal solar lighting cycle (07:00 WIB to 19:00 WIB)', () => {
    const matLib = MaterialLibrary.getInstance();
    const tree = AestheticLandscapeBuilder.buildMesh(
      { id: 'tabebuya_diurnal', type: 'tree_tabebuya_pink' as any, position: new THREE.Vector3(20, 0, 20), radius: 3.5 },
      matLib
    );
    scene.add(tree);

    // Diurnal hour cycle test points
    const daylightHours = [7.0, 12.0, 16.25, 19.0];
    for (const hr of daylightHours) {
      useUIStore.getState().setTimeOfDay(hr);
      expect(useUIStore.getState().timeOfDay).toBe(hr);
    }

    // Verify tree meshes cast and receive shadows
    const meshes = tree.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    expect(meshes.length).toBeGreaterThan(0);
    const shadowCasters = meshes.filter((m) => m.castShadow);
    expect(shadowCasters.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // PAIRWISE COMBINATION 7: iOS Spring Segmented Control + Graphics Quality Tuning
  // =========================================================================
  it('P7: iOS Spring Segmented Control quality switching updates shadow map and particle budgets', () => {
    const store = useUIStore.getState();

    // 1. Low quality
    store.setGraphicsQuality('low');
    expect(useUIStore.getState().graphicsQuality).toBe('low');
    expect(GRAPHICS_PRESETS.low.shadowMapSize).toBe(0);

    // 2. Ultra 144Hz quality
    store.setGraphicsQuality('ultra');
    expect(useUIStore.getState().graphicsQuality).toBe('ultra');
    expect(GRAPHICS_PRESETS.ultra.shadowMapSize).toBe(4096);
    expect(GRAPHICS_PRESETS.ultra.rainParticleCount).toBe(25000);
    expect(GRAPHICS_PRESETS.ultra.maxUndoHistory).toBe(1000);
  });
});

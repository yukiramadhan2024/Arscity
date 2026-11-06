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
import { InteriorInteractiveSystem, InteractiveDoor } from '../../src/buildings/InteriorInteractiveSystem';
import { InteriorMeshBuilder } from '../../src/buildings/InteriorMeshBuilder';
import { FirstPersonController } from '../../src/core/engine/FirstPersonController';
import { BuildingInstance } from '../../src/buildings/PrefabTypes';
import { generateFloorsForMassingShape } from '../../src/buildings/CustomBuildingModel';
import { AestheticLandscapeBuilder } from '../../src/world/AestheticLandscapeBuilder';
import { MaterialLibrary } from '../../src/materials/MaterialLibrary';
import { GRAPHICS_PRESETS } from '../../src/core/engine/GraphicsPresets';
import { LIGHT_THEME_TOKENS } from '../../src/ui/constants/themeTokens';

describe('E2E Tier 4: Real-World Application Scenarios (Integration & User Journeys)', () => {
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
  // JOURNEY 1: Tropical Waterfront Boulevard Masterplan
  // =========================================================================
  it('Journey 1: Complete Tropical Waterfront Boulevard Masterplan workflow', () => {
    // 1. Terrain riverbed carving
    const terrain = new Terrain(scene, 300, 300);
    terrain.getHeightAt = (x: number, z: number): number => {
      // River channel running along Z = 70 to Z = 90
      if (z >= 74 && z <= 86) return -2.0; // Riverbed excavation Y = -2.0m
      if (z >= 70 && z < 74) return (z - 74) * 0.5;
      if (z > 86 && z <= 90) return (86 - z) * 0.5;
      return 0.0;
    };

    // 2. Hydrological water elevation check
    const waterLevel = RIVER_PROFILES.wide_river.waterLevelY;
    expect(waterLevel).toBeCloseTo(-0.30, 2);

    // 3. Arterial road bridging over river channel
    const graph = new RoadGraph();
    const nodeA = graph.getOrCreateNode(new THREE.Vector3(50, 0, 0));
    const nodeB = graph.getOrCreateNode(new THREE.Vector3(50, 0, 150));
    const edge = graph.addEdge(nodeA.id, nodeB.id, 'arterial')!;

    const roadGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge, graph, terrain);
    expect(roadGroup).toBeDefined();

    // Verify bridge components generated across river channel
    const bridgeDeck = roadGroup.getObjectByName('BridgeDeck');
    const railingL = roadGroup.getObjectByName('BridgeParapetRailing_Left');
    const railingR = roadGroup.getObjectByName('BridgeParapetRailing_Right');
    expect(bridgeDeck).toBeDefined();
    expect(railingL).toBeDefined();
    expect(railingR).toBeDefined();

    // 4. Plant flowering Tabebuya trees along waterfront boulevard
    const matLib = MaterialLibrary.getInstance();
    const tree1 = AestheticLandscapeBuilder.buildMesh(
      { id: 'tree_wf_1', type: 'tree_tabebuya_pink' as any, position: new THREE.Vector3(42, 0, 60), radius: 3.5 },
      matLib
    );
    const tree2 = AestheticLandscapeBuilder.buildMesh(
      { id: 'tree_wf_2', type: 'tree_tabebuya_gold' as any, position: new THREE.Vector3(58, 0, 60), radius: 3.5 },
      matLib
    );
    expect(tree1.children.length).toBeGreaterThanOrEqual(2);
    expect(tree2.children.length).toBeGreaterThanOrEqual(2);

    // 5. Switch to 2D Top-Down Masterplan view with horizontal clipping at Y = 2.4m
    const camController = new CameraController(mockDom);
    camController.setOrthographicMode(true, 'top', new THREE.Vector3(50, 0, 75), 150);
    expect(camController.isOrthographic).toBe(true);
    expect(camController.orthoMode).toBe('top');

    const mockRenderer = { localClippingEnabled: false, clippingPlanes: [] as THREE.Plane[] } as any;
    const sectionCut = new SectionCutManager(mockRenderer, scene);
    sectionCut.cutHeight = 2.4;
    expect(sectionCut.cutHeight).toBe(2.4);
  });

  // =========================================================================
  // JOURNEY 2: Human-Scale Architectural Walkthrough
  // =========================================================================
  it('Journey 2: Complete Human-Scale Architectural Walkthrough with 3D doors, furniture & floor teleport', () => {
    // 1. Multi-story architectural residence instance
    const building: BuildingInstance = {
      id: 'bld_residence_walkthrough',
      presetKey: 'house_2fl',
      name: 'Rumah Tropis Modern 3 Lantai',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 14,
      length: 16,
      floorCount: 3,
      floorHeight: 3.6,
      roofType: 'limasan',
      roofOverhang: 1.0,
      wallMaterial: 'plaster',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile'
    };

    // 2. Stairwell void construction
    const stairResult = InteriorMeshBuilder.buildBuildingStairwell(building, 0.35);
    expect(stairResult.stairZones.length).toBe(2);
    const sz1 = stairResult.stairZones[0];
    expect(sz1.maxX - sz1.minX).toBeCloseTo(2.8, 1);
    expect(sz1.maxZ - sz1.minZ).toBeCloseTo(4.2, 1);

    // 3. 3D entrance door with dual handles and edge hinge rotation
    const doorSys = InteriorInteractiveSystem.getInstance();
    doorSys.clearAll();

    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, 8); // Front entrance
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.05));
    doorGroup.add(leaf);

    const door: InteractiveDoor = {
      id: 'entrance_door_walkthrough',
      type: 'swing',
      buildingId: building.id,
      floorIndex: 1,
      group: doorGroup,
      leftLeafMesh: leaf,
      doorCenterLocal: new THREE.Vector3(0, 1.05, 0),
      worldPosition: new THREE.Vector3(0, 0, 8),
      doorWidth: 0.9,
      doorHeight: 2.1,
      isOpen: false,
      currentRatio: 0.0,
      targetRatio: 0.0,
      swingAngle: -Math.PI * 0.5,
      slideDist: 0.85
    };
    doorSys.registerDoor(door);

    // Avatar approaches entrance door (distance < 2.2m)
    doorSys.update(0.1, new THREE.Vector3(0, 0, 7.0), true);
    expect(door.targetRatio).toBe(1.0);

    // 4. Inspect realistic furniture on Floor 1
    const sofa = FirstPersonFurnitureBuilder.buildFurniture('sofa_l');
    expect(sofa).toBeDefined();
    expect(sofa.userData.isFurniture).toBe(true);

    // 5. Teleport to Floor 2 using FirstPersonController
    const cam = new THREE.PerspectiveCamera();
    const fp = new FirstPersonController(cam, mockDom);
    (fp as any).insideBuildingId = building.id;
    (fp as any).totalFloors = building.floorCount;
    (fp as any).floorHeight = building.floorHeight;

    const wentToFloor2 = fp.goToFloor(2);
    expect(wentToFloor2).toBe(true);
    expect(fp.currentFloor).toBe(2);

    // 6. Teleport to Floor 3 (top floor)
    const wentToFloor3 = fp.goToFloor(3);
    expect(wentToFloor3).toBe(true);
    expect(fp.currentFloor).toBe(3);
  });

  // =========================================================================
  // JOURNEY 3: Universal CAD Studio Prototyping Flow
  // =========================================================================
  it('Journey 3: Complete Universal CAD Studio Prototyping Flow across Mode 1, 2, and 3', () => {
    // 1. Studio Mode 1: Massing & Roof Architecture
    const massingShapes = ['box', 'l_shape', 'courtyard_u', 'stepped_podium', 'cantilever'] as const;
    for (const shape of massingShapes) {
      const floors = generateFloorsForMassingShape(shape, 16, 18, 3, 3.5);
      expect(floors.length).toBe(3);
      for (const fl of floors) {
        expect(fl.footprint.length).toBeGreaterThanOrEqual(4);
      }
    }

    // 2. Studio Mode 2: Furniture Customization & Catalog
    const sofaItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'sofa_3seater')!;
    expect(sofaItem).toBeDefined();
    expect(sofaItem.category).toBe('living');
    expect(sofaItem.seatHeight).toBeCloseTo(0.45);

    // 3. Studio Mode 3: Park Pavilion & Aesthetic Placement
    const matLib = MaterialLibrary.getInstance();
    const gazebo = AestheticLandscapeBuilder.buildMesh(
      { id: 'custom_gazebo', type: 'pavilion_garden_gazebo' as any, position: new THREE.Vector3(0, 0, 0) },
      matLib
    );
    expect(gazebo).toBeDefined();
    expect(gazebo.children.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // JOURNEY 4: Adaptive Graphics & Display Calibration Journey
  // =========================================================================
  it('Journey 4: Complete Adaptive Graphics & Display Calibration Journey', () => {
    const store = useUIStore.getState();

    // 1. Open Settings modal
    store.openModal('settings');
    expect(useUIStore.getState().activeModal).toBe('settings');
    expect(useUIStore.getState().showSettings).toBe(true);

    // 2. Verify no white-on-white text collision: labels are high-contrast Navy Blue (#072D59 / #0F3D75) on Seal Blue
    expect(LIGHT_THEME_TOKENS.label).toBe('#072D59');
    expect(LIGHT_THEME_TOKENS.labelSecondary).toBe('#0F3D75');

    // 3. Switch to Ultra 144Hz Graphics preset
    store.setGraphicsQuality('ultra');
    expect(useUIStore.getState().graphicsQuality).toBe('ultra');
    expect(GRAPHICS_PRESETS.ultra.shadowMapSize).toBe(4096);

    // 4. Verify 144 FPS telemetry reporting in UI store
    store.setFps(144);
    expect(useUIStore.getState().fps).toBe(144);

    // 5. Toggle Accessibility options (reduceMotion & highContrast)
    store.setReduceMotion(true);
    expect(useUIStore.getState().reduceMotion).toBe(true);

    store.setHighContrast(true);
    expect(useUIStore.getState().highContrast).toBe(true);

    // 6. Close Settings cleanly
    store.closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });
});

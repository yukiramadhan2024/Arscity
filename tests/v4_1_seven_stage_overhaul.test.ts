import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { CustomBuildingMeshBuilder } from '../src/buildings/CustomBuildingMeshBuilder';
import { generateFloorsForMassingShape, CustomBuilding } from '../src/buildings/CustomBuildingModel';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { CameraController } from '../src/core/engine/CameraController';
import { BuildingGizmoManager } from '../src/core/engine/BuildingGizmoManager';
import { ProceduralAudio, proceduralAudio } from '../src/audio/ProceduralAudio';
import { RoadManager } from '../src/roads/RoadManager';
import { RoadTool } from '../src/tools/RoadTool';
import { RaycastManager } from '../src/core/engine/RaycastManager';
import { GridSystem } from '../src/world/GridSystem';
import { LotManager } from '../src/zones/LotManager';
import { ZONE_RULES } from '../src/zones/ZoneTypes';
import { TRIAD_PALETTE, LIGHT_THEME_TOKENS, DARK_THEME_TOKENS } from '../src/ui/constants/themeTokens';

function createMockDomElement(): HTMLElement {
  return {
    clientWidth: 1280,
    clientHeight: 720,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
      right: 1280,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
  } as unknown as HTMLElement;
}

describe('Arscity V4.1 — 7-Stage Critical Overhaul Verification Suite', () => {
  // =========================================================================
  // TAHAP 1: Placed Furniture Visibility & Z-Fighting / Depth Precision
  // =========================================================================
  describe('Tahap 1: Placed Furniture Visibility & Z-Fighting Elimination', () => {
    it('attaches placed furniture at y = baseFloorElevation + plinthHeight + 0.01 with visible=true and frustumCulled=false', () => {
      const scene = new THREE.Scene();
      const bm = new BuildingManager(scene);
      const bld = bm.addBuilding({
        id: 'bld_fur_t1',
        presetKey: 'house_54',
        name: 'Rumah Uji Furnitur',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 10,
        length: 12,
        floorCount: 2,
        floorHeight: 3.4,
        roofType: 'hip',
        roofOverhang: 1.2,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roofMaterial: 'clay_tile'
      });

      const furMesh = bm.attachFurniture(bld.id, {
        id: 'sofa_test_1',
        type: 'sofa',
        name: 'Sofa Ruang Tamu',
        floorIndex: 0,
        position: [1.0, 0.0, 1.5], // baseFloorElevation = 0.0 -> accurateY = 0.0 + 0.35 + 0.01 = 0.36
        rotationY: 0
      });

      expect(furMesh).not.toBeNull();
      expect(furMesh!.visible).toBe(true);
      expect(furMesh!.frustumCulled).toBe(false);
      expect(furMesh!.position.y).toBeCloseTo(0.36, 2);

      let childMeshesChecked = 0;
      furMesh!.traverse((child) => {
        expect(child.visible).toBe(true);
        expect(child.frustumCulled).toBe(false);
        if ((child as THREE.Mesh).isMesh) childMeshesChecked++;
      });
      expect(childMeshesChecked).toBeGreaterThan(0);

      // Verify NEVER hidden when < 45m or when inside building in First-Person mode
      const grp = bm.getBuildingGroup(bld.id)!;
      const dynGroup = grp.getObjectByName('DynamicFurnitureGroup')!;
      expect(dynGroup).toBeDefined();

      // In 3D Orbit mode -> placedFurniture is culled to maintain 144 FPS
      bm.updateLOD(new THREE.Vector3(0, 12, 42), 'orbit', false, false, 60, 'high', null);
      expect(dynGroup.visible).toBe(false);

      // In 2D Plan mode -> placedFurniture on Floor 1 is visible
      bm.updateLOD(new THREE.Vector3(0, 50, 0), 'orbit', true, false, 60, 'high', null);
      expect(dynGroup.visible).toBe(true);

      // Distance < 30m in First-Person mode -> MUST be visible
      bm.updateLOD(new THREE.Vector3(0, 2, 10), 'first_person', false, false, 60, 'high', null);
      expect(dynGroup.visible).toBe(true);

      // Inside building in First-Person mode -> MUST stay visible regardless of center distance
      bm.updateLOD(new THREE.Vector3(2, 2.0, 2), 'first_person', false, false, 60, 'high', bld.id);
      expect(dynGroup.visible).toBe(true);

      bm.updateSpatialLOD(new THREE.Vector3(2, 2.0, 2), true, bld.id, true);
      expect(dynGroup.visible).toBe(true);
    });

    it('configures camera.near = 0.35 and polygonOffset on windows, floor belts, and road markings', () => {
      const dummyDom = createMockDomElement();
      const camCtrl = new CameraController(dummyDom);
      expect(camCtrl.camera.near).toBe(0.35);
      expect(camCtrl.camera.far).toBe(2500);

      const matLib = MaterialLibrary.getInstance();
      const glassMat = matLib.getMaterial('glass');
      const beltMat = matLib.getMaterial('floor_belt');
      const markMat = matLib.getMaterial('road_marking');

      expect(glassMat.polygonOffset).toBe(true);
      expect(glassMat.polygonOffsetFactor).toBeLessThanOrEqual(-1);
      expect(beltMat.polygonOffset).toBe(true);
      expect(markMat.polygonOffset).toBe(true);
    });
  });

  // =========================================================================
  // TAHAP 2: Seal Blue, Navy Blue, Crimson Pink Theme Overhaul
  // =========================================================================
  describe('Tahap 2: Seal Blue (#DBF2FC), Navy Blue (#072D59), and Crimson Pink (#FD6E8E) Palette', () => {
    it('locks the 60-30-10 triad tokens and forbids !important on color properties in index.css', () => {
      expect(TRIAD_PALETTE.sealBlue.toLowerCase()).toBe('#dbf2fc');
      expect(TRIAD_PALETTE.navyBlue.toLowerCase()).toBe('#072d59');
      expect(TRIAD_PALETTE.crimsonPink.toLowerCase()).toBe('#fd6e8e');
      expect(LIGHT_THEME_TOKENS.accent.toLowerCase()).toBe('#fd6e8e');
      expect(LIGHT_THEME_TOKENS.label.toLowerCase()).toBe('#072d59');
      expect(LIGHT_THEME_TOKENS.surfaceSolid.toLowerCase()).toBe('#dbf2fc');
      expect(DARK_THEME_TOKENS.accent.toLowerCase()).toBe('#fd6e8e');
      expect(DARK_THEME_TOKENS.surfaceSolid.toLowerCase()).toBe('#072d59');

      const cssContent = fs.readFileSync(path.resolve(__dirname, '../src/app/index.css'), 'utf-8');
      const cssWithoutTopHeaderOuter = cssContent.replace(/\.top-header\s*\{[^}]*\}/g, '');
      const colorImportantRegex = /(?:^|[\s;{])(?:color|background|background-color|border-color)\s*:[^;{}]*!important/gim;
      expect(cssWithoutTopHeaderOuter.match(colorImportantRegex)).toBeNull();
    });
  });

  // =========================================================================
  // TAHAP 3: Sub-Part Building Customization, Roof Badge & Pentatonic Audio
  // =========================================================================
  describe('Tahap 3: Sub-Part Building Customization, Roof Floor Badge & Pentatonic Audio', () => {
    it('partitions buildings into independent SubPart_* groups, highlights selected sub-part in Crimson Pink, and resizes independently', () => {
      const scene = new THREE.Scene();
      const bm = new BuildingManager(scene);
      const bld = bm.addBuilding({
        id: 'bld_subpart_t3',
        presetKey: 'office_tower',
        name: 'Menara Kantor Modular',
        category: 'commercial',
        position: new THREE.Vector3(10, 0, 10),
        rotationY: 0,
        width: 16,
        length: 16,
        floorCount: 5,
        floorHeight: 3.6,
        roofType: 'flat',
        roofOverhang: 0.8,
        wallMaterial: 'concrete',
        wallColor: '#e2e8f0',
        roofMaterial: 'concrete',
        apronDepth: 8.5
      });

      const grp = bm.getBuildingGroup(bld.id)!;
      expect(grp.getObjectByName('SubPart_main_tower')).toBeDefined();
      expect(grp.getObjectByName('SubPart_podium_base')).toBeDefined();

      // Select only podium_base sub-part -> Crimson Pink glow mesh added
      bm.selectBuilding(bld.id, 'podium_base');
      expect(bm.selectedSubPart).toBe('podium_base');
      const crimsonGlow = scene.getObjectByName('SelectedSubPartCrimsonGlow') as THREE.Mesh;
      expect(crimsonGlow).toBeDefined();
      expect((crimsonGlow.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xfd6e8e);

      // Resize podium_base width without changing main_tower floor count
      const updated = bm.resizeBuildingSubPart(bld.id, 'podium_base', {
        partWidth: 24,
        partDepth: 20,
        partFloors: 2
      });
      expect(updated?.partWidth).toBe(24);
      expect(bm.getBuilding(bld.id)!.floorCount).toBe(5);

      // Verify CityRT.com clickable roof floor badge stepSubPartFloor(+1)
      const cam = new THREE.PerspectiveCamera(45, 1.77, 0.25, 1000);
      const dom = createMockDomElement();
      const mockEngine: any = {
        activeToolName: 'select',
        buildingManager: bm,
        lotManager: new LotManager(scene, bm),
        roadManager: { graph: { edges: new Map(), nodes: new Map() } },
        commandManager: { execute: (cmd: any) => cmd.execute() },
        executeCommand: (cmd: any) => cmd.execute()
      };
      const gizmo = new BuildingGizmoManager(mockEngine, scene, cam, dom);
      bm.selectBuilding(bld.id, 'main_tower');
      gizmo.update();
      expect(gizmo.masterGroup.getObjectByName('Gizmo_roof_badge_up')).toBeDefined();

      gizmo.stepSubPartFloor(1);
      expect(bm.getBuilding(bld.id)!.floorCount).toBe(6);
    });

    it('defines major pentatonic scale frequencies (C5-C6) and executes playScaleStepSound & playPlacementChord cleanly', () => {
      expect(ProceduralAudio.PENTATONIC_SCALE_HZ).toEqual([523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]);
      expect(() => proceduralAudio.playScaleStepSound(0)).not.toThrow();
      expect(() => proceduralAudio.playScaleStepSound(5)).not.toThrow();
      expect(() => proceduralAudio.playPlacementChord()).not.toThrow();
    });
  });

  // =========================================================================
  // TAHAP 4: Road Continuation Snap Nodes & Automatic River Bridges
  // =========================================================================
  describe('Tahap 4: Magnetic Road Continuation Snap (8m) & Automatic River Bridge Builder', () => {
    it('snaps within 8m of a dead-end node, aligns outgoing tangent, and renders DeadEndSnap_* markers', () => {
      const scene = new THREE.Scene();
      const rm = new RoadManager(scene);
      const edge = rm.addRoad(new THREE.Vector3(0, 0, 0), new THREE.Vector3(20, 0, 0), 'collector');
      expect(edge).not.toBeNull();

      // Cursor 6.5m ahead and 2.0m off-center -> total distance ~6.8m (< 8.0m snap radius)
      const cursorNearEnd = new THREE.Vector3(26.5, 0, 2.0);
      const snapInfo = rm.findContinuationSnapNode(cursorNearEnd, 8.0);
      expect(snapInfo).not.toBeNull();
      expect(snapInfo!.isDeadEnd).toBe(true);
      expect(snapInfo!.node.position.x).toBeCloseTo(20, 1);
      expect(snapInfo!.outgoingTangent!.x).toBeCloseTo(1, 2);
      expect(snapInfo!.outgoingTangent!.z).toBeCloseTo(0, 2);

      const cam = new THREE.PerspectiveCamera(45, 1.77, 0.25, 1000);
      const grid = new GridSystem(scene);
      const raycaster = new RaycastManager(createMockDomElement(), cam, grid, scene);
      const roadTool = new RoadTool(rm, raycaster, scene);
      roadTool.setVisible(true);

      let foundDeadEndSnap = false;
      roadTool.snapMarkersGroup.traverse((obj) => {
        if (obj.name.startsWith('DeadEndSnap_')) foundDeadEndSnap = true;
      });
      expect(foundDeadEndSnap).toBe(true);

      // Verify collinear tangent continuation snap when drawing slightly off-axis from dead-end
      roadTool.isDrawing = true;
      (roadTool as any).startPoint = new THREE.Vector3(20, 0, 0);
      (roadTool as any).startSnapTangent = new THREE.Vector3(1, 0, 0);
      const resolved = roadTool.resolveSnappedEndpoint(new THREE.Vector3(40, 0, 2.5));
      expect(resolved.point.z).toBeCloseTo(0, 3);
    });

    it('automatically builds concrete BridgeDeck, left/right Parapet Railings, and riverbed Piers when groundY < -0.20m', () => {
      const scene = new THREE.Scene();
      const rm = new RoadManager(scene);
      // Mock terrain with a river channel between x = 15..35 at depth -2.4m (< -0.20m)
      rm.terrain = {
        getHeightAt: (x: number, _z: number) => (x > 15 && x < 35 ? -2.4 : 0.0)
      } as any;

      const bridgeEdge = rm.addRoad(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(50, 0, 0),
        'arterial'
      );
      expect(bridgeEdge).not.toBeNull();
      expect(bridgeEdge!.isBridge).toBe(true);

      const bridgeGroup = rm.masterGroup.getObjectByName(`Road_${bridgeEdge!.id}`)!;
      expect(bridgeGroup).toBeDefined();
      expect(bridgeGroup.userData.isBridge).toBe(true);
      expect(bridgeGroup.getObjectByName('BridgeDeck')).toBeDefined();
      expect(bridgeGroup.getObjectByName('BridgeParapetRailing_Left')).toBeDefined();
      expect(bridgeGroup.getObjectByName('BridgeParapetRailing_Right')).toBeDefined();

      let pierCount = 0;
      bridgeGroup.traverse((c) => {
        if (c.name.startsWith('BridgePier_')) pierCount++;
      });
      expect(pierCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // TAHAP 5: Automatic Polygon Parking Lot Zone (CS2 Placemaker Style)
  // =========================================================================
  describe('Tahap 5: Polygon Parking Lot Zone ("Zona Parkir Terpadu (Parking Lot)")', () => {
    it('calculates 2.5m x 5.0m stalls aligned with longest edge, formats Indonesian badge, and generates full 3D parking lot props', () => {
      expect(ZONE_RULES.parking_lot).toBeDefined();
      expect(ZONE_RULES.parking_lot.name).toBe('Zona Parkir Terpadu (Parking Lot)');

      // Verify Indonesian formatting: "Luas 1.450 m2 - 32 Slot Parkir"
      expect(LotManager.formatParkingBadgeText(1450, 32)).toBe('Luas 1.450 m2 - 32 Slot Parkir');

      const scene = new THREE.Scene();
      const bm = new BuildingManager(scene);
      const rm = new RoadManager(scene);
      rm.addRoad(new THREE.Vector3(-30, 0, -18), new THREE.Vector3(30, 0, -18), 'collector');
      const lm = new LotManager(scene, bm, rm);

      // 40m x 26m polygon = 1.040 m2
      const poly = [
        { x: -20, y: -13 },
        { x: 20, y: -13 },
        { x: 20, y: 13 },
        { x: -20, y: 13 }
      ];
      const lot = lm.createPolygonLot(poly, 'parking_lot');

      expect(lot.zone).toBe('parking_lot');
      expect(lot.areaM2).toBeCloseTo(1040, 0);
      expect(lot.parkingCapacity).toBeGreaterThanOrEqual(20);

      const lotGroup = lm.masterGroup.getObjectByName(`Lot_${lot.id}`)!;
      expect(lotGroup).toBeDefined();
      expect(lotGroup.getObjectByName('ParkingAsphaltSurface')).toBeDefined();
      expect(lotGroup.getObjectByName('ParkingPerimeterCurb')).toBeDefined();
      expect(lotGroup.getObjectByName('ParkingStallLines')).toBeDefined();
      expect(lotGroup.getObjectByName('ParkingEntranceApron')).toBeDefined();
      expect(lotGroup.getObjectByName('ParkingInfoBadge')).toBeDefined();

      let carCount = 0;
      let lampCount = 0;
      let islandCount = 0;
      lotGroup.traverse((c) => {
        if (c.name === 'ParkedCarSilhouette') carCount++;
        if (c.name === 'ParkingLightPole') lampCount++;
        if (c.name === 'CornerPlanterIsland') islandCount++;
      });
      expect(carCount).toBeGreaterThan(0);
      expect(lampCount).toBeGreaterThan(0);
      expect(islandCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // TAHAP 6: Contractor Steel Frame H-Beam CAD Studio & Facade Modules
  // =========================================================================
  describe('Tahap 6: Contractor Steel Frame H-Beam, Carport + Top Balcony & Vertical Secondary Skin', () => {
    it('builds exposed black H-Beam columns/girders, ceramic grid floors, wooden stairs, carport white car, top grey fascia balcony, and vertical secondary skin', () => {
      const model: CustomBuilding = {
        id: 'contractor_cad_test',
        name: 'Rumah Kontraktor Baja H-Beam',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        plinthHeight: 0.35,
        floors: generateFloorsForMassingShape('box', 10, 12, 2, 3.4),
        roof: {
          type: 'flat',
          pitchAngle: 0,
          overhang: 0.8,
          material: 'concrete_slab'
        },
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        exposeSteelFrame: true,
        hasCarportAndTopBalcony: true,
        hasVerticalSecondarySkin: true
      };

      const grp = CustomBuildingMeshBuilder.buildCustomBuilding(model);

      expect(grp.getObjectByName('ContractorSteelFrameGroup')).toBeDefined();
      expect(grp.getObjectByName('SteelHBeamColumn')).toBeDefined();
      expect(grp.getObjectByName('SteelHBeamGirder')).toBeDefined();
      expect(grp.getObjectByName('SteelRoofTruss')).toBeDefined();
      expect(grp.getObjectByName('CeramicGridFloorSlab')).toBeDefined();
      expect(grp.getObjectByName('ExposedWoodenStaircase')).toBeDefined();

      expect(grp.getObjectByName('CarportAndTopBalconyGroup')).toBeDefined();
      expect(grp.getObjectByName('CarportCanopyBay')).toBeDefined();
      expect(grp.getObjectByName('CarportIronGate')).toBeDefined();
      expect(grp.getObjectByName('CarportParkedCar')).toBeDefined();
      expect(grp.getObjectByName('TopBalconyFasciaPanel')).toBeDefined();
      expect(grp.getObjectByName('TopBalconyRailing')).toBeDefined();

      expect(grp.getObjectByName('VerticalSecondarySkinGroup')).toBeDefined();
      expect(grp.getObjectByName('VerticalSecondarySkinScreen')).toBeDefined();
    });
  });
});

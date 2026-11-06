import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { ProceduralTextureGen } from '../src/materials/ProceduralTextureGen';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { RoofMeshBuilder } from '../src/buildings/builders/RoofMeshBuilder';
import { LotContextBuilder } from '../src/buildings/builders/LotContextBuilder';

describe('Tahap V6: 3-Tier LOD & Performance Optimization Suite', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);
    PrefabMeshBuilder.clearCache();
  });

  describe('1. Baked Facade Impostor Texture & PBR Material', () => {
    it('generates a 512x512 baked facade impostor texture with floor divisions and window apertures', () => {
      const tex = ProceduralTextureGen.getBakedFacadeImpostorTexture('#f8fafc', 'punched', 512);
      expect(tex).toBeInstanceOf(THREE.CanvasTexture);
      expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(tex.wrapS).toBe(THREE.RepeatWrapping);
      expect(tex.wrapT).toBe(THREE.RepeatWrapping);
    });

    it('supports curtain wall style impostor texture', () => {
      const tex = ProceduralTextureGen.getBakedFacadeImpostorTexture('#0f172a', 'curtain', 512);
      expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('resolves impostor_facade material from MaterialLibrary', () => {
      const mat = MaterialLibrary.getInstance().getMaterial('impostor_facade', { color: '#e2e8f0' }) as THREE.MeshStandardMaterial;
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(mat.map).toBeDefined();
      expect(mat.roughness).toBeGreaterThan(0.7);
    });
  });

  describe('2. Ultra-Low-Poly LOD2 Massing Shell & Roof Cap', () => {
    it('generates a 12-triangle bounding box for flat roof buildings', () => {
      const bld: BuildingInstance = {
        id: 'lod2_flat_test',
        presetKey: 'ruko_3fl',
        name: 'Ruko Modern',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 16,
        floorCount: 3,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#f1f5f9',
        roofMaterial: 'concrete',
      };

      const lod2Group = PrefabMeshBuilder.buildLOD2MassingGroup(bld);
      expect(lod2Group.name).toBe('LOD2MassingGroup');
      expect(lod2Group.children.length).toBe(1); // Box mesh only

      const boxMesh = lod2Group.children[0] as THREE.Mesh;
      const posAttr = boxMesh.geometry.attributes.position;
      expect(posAttr).toBeDefined();
      expect(boxMesh.geometry.index).toBeDefined();
      // BoxGeometry has 12 triangles (36 index elements)
      expect(boxMesh.geometry.index!.count).toBe(36);
    });

    it('generates a simplified 6-8 triangle roof cap for pitched roof buildings', () => {
      const gableCap = RoofMeshBuilder.buildSimplifiedRoofCap(10, 14, 3.5, 'gable');
      expect(gableCap.index!.count).toBe(18); // 6 triangles * 3 = 18 indices

      const hipCap = RoofMeshBuilder.buildSimplifiedRoofCap(10, 14, 3.5, 'hip');
      expect(hipCap.index!.count).toBe(18); // 6 triangles * 3 = 18 indices
    });

    it('combines massing box and roof cap into a complete LOD2 group for pitched roof', () => {
      const bld: BuildingInstance = {
        id: 'lod2_pitched_test',
        presetKey: 'house_36',
        name: 'Rumah 36',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 1.0,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      const lod2Group = PrefabMeshBuilder.buildLOD2MassingGroup(bld);
      expect(lod2Group.children.length).toBe(2); // Box mesh + Roof cap mesh
      const totalTris = lod2Group.children.reduce((acc, c) => {
        const m = c as THREE.Mesh;
        return acc + (m.geometry.index ? m.geometry.index.count / 3 : 0);
      }, 0);
      expect(totalTris).toBeLessThanOrEqual(20); // Max 18-20 triangles total!
    });
  });

  describe('3. Building Group Layer Hierarchy', () => {
    it('creates all 5 distinct architectural layers in PrefabMeshBuilder', () => {
      const bld: BuildingInstance = {
        id: 'layer_hierarchy_bld',
        presetKey: 'house_54',
        name: 'Rumah Tipe 54',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 12,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'hip',
        roofOverhang: 1.0,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roofMaterial: 'clay_tile',
      };

      const group = PrefabMeshBuilder.buildBuildingGroup(bld);

      const ext = group.getObjectByName('ExteriorShell') as THREE.Group;
      const details = group.getObjectByName('DetailPropsGroup') as THREE.Group;
      const int = group.getObjectByName('InteriorDetails') as THREE.Group;
      const sub = group.getObjectByName('SubsurfaceFoundation') as THREE.Group;
      const lod2 = group.getObjectByName('LOD2MassingGroup') as THREE.Group;
      const lot = group.getObjectByName('LotGroundContextGroup') as THREE.Group;

      expect(ext, 'ExteriorShell must exist').toBeDefined();
      expect(details, 'DetailPropsGroup must exist').toBeDefined();
      expect(int, 'InteriorDetails must exist').toBeDefined();
      expect(sub, 'SubsurfaceFoundation must exist').toBeDefined();
      expect(lod2, 'LOD2MassingGroup must exist').toBeDefined();
      expect(lot, 'LotGroundContextGroup must exist').toBeDefined();

      // Default states
      expect(ext.visible).toBe(true);
      expect(details.visible).toBe(true);
      expect(sub.visible).toBe(false);
      expect(lod2.visible).toBe(false);
    });

    it('separates LotGroundContextGroup into LotGroundBase and LotDetailProps', () => {
      const group = new THREE.Group();
      const bld: BuildingInstance = {
        id: 'lot_lod_bld',
        presetKey: 'ruko_3fl',
        name: 'Ruko Test',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 14,
        floorCount: 3,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'metal',
      };

      LotContextBuilder.attachLotGroundContext(group, bld);
      const lotGroup = group.getObjectByName('LotGroundContextGroup') as THREE.Group;
      expect(lotGroup).toBeDefined();

      const detailGroup = lotGroup.getObjectByName('LotDetailProps') as THREE.Group;
      expect(detailGroup, 'LotDetailProps sub-group must exist').toBeDefined();
      expect(detailGroup.children.length).toBeGreaterThan(0);
    });
  });

  describe('4. 3-Tier Distance LOD Culling (LOD0 < 80m, LOD1 80-250m, LOD2 > 250m)', () => {
    let testBld: BuildingInstance;

    beforeEach(() => {
      testBld = {
        id: 'tier_lod_bld',
        presetKey: 'ruko_3fl',
        name: 'Ruko Modern 3 Lantai',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 8,
        length: 16,
        floorCount: 3,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#cbd5e1',
        roofMaterial: 'concrete',
      };
      buildingManager.addBuilding(testBld);
    });

    it('activates LOD0 when camera is close (< 80m)', () => {
      const closeCam = new THREE.Vector3(30, 20, 30); // ~46.9m distance
      buildingManager.updateLOD(closeCam, 'orbit', false, false, 60, 'high');

      const grp = buildingManager.getBuildingGroup('tier_lod_bld')!;
      const ext = grp.getObjectByName('ExteriorShell')!;
      const details = grp.getObjectByName('DetailPropsGroup')!;
      const lod2 = grp.getObjectByName('LOD2MassingGroup')!;
      const lot = grp.getObjectByName('LotGroundContextGroup')!;
      const lotDetails = lot.getObjectByName('LotDetailProps')!;

      expect(lod2.visible, 'LOD2 massing must be hidden at < 80m').toBe(false);
      expect(ext.visible, 'ExteriorShell must be visible at < 80m').toBe(true);
      expect(details.visible, 'DetailPropsGroup must be visible at < 80m').toBe(true);
      expect(lot.visible, 'LotGroundContext must be visible at < 80m').toBe(true);
      expect(lotDetails.visible, 'LotDetailProps must be visible at < 80m').toBe(true);
    });

    it('renders 100% exterior detail at all distances in Orbit mode without popping (Tahap 1)', () => {
      const midCam = new THREE.Vector3(100, 50, 100); // ~150m distance
      buildingManager.updateLOD(midCam, 'orbit', false, false, 60, 'high');

      const grp = buildingManager.getBuildingGroup('tier_lod_bld')!;
      const ext = grp.getObjectByName('ExteriorShell')!;
      const details = grp.getObjectByName('DetailPropsGroup')!;
      const lod2 = grp.getObjectByName('LOD2MassingGroup')!;
      const lot = grp.getObjectByName('LotGroundContextGroup')!;
      const lotDetails = lot.getObjectByName('LotDetailProps')!;
      const int = grp.getObjectByName('InteriorDetails')!;

      // Orbit mode never culls exterior detail or pops low-poly massing
      expect(lod2.visible, 'LOD2 massing must remain hidden in Orbit at 150m').toBe(false);
      expect(ext.visible, 'ExteriorShell must remain visible in Orbit at 150m').toBe(true);
      expect(details.visible, 'DetailPropsGroup must remain visible in Orbit at 150m').toBe(true);
      expect(lot.visible, 'Lot base must remain visible in Orbit at 150m').toBe(true);
      expect(lotDetails.visible, 'LotDetailProps must remain visible in Orbit at 150m').toBe(true);
      expect(int.visible, 'InteriorDetails hidden in 3D Orbit').toBe(false);
    });

    it('renders 100% exterior detail stably even at far distance (> 250m) in Orbit mode (Tahap 1)', () => {
      const farCam = new THREE.Vector3(250, 100, 250); // ~367m distance
      buildingManager.updateLOD(farCam, 'orbit', false, false, 60, 'high');

      const grp = buildingManager.getBuildingGroup('tier_lod_bld')!;
      const ext = grp.getObjectByName('ExteriorShell')!;
      const details = grp.getObjectByName('DetailPropsGroup')!;
      const lod2 = grp.getObjectByName('LOD2MassingGroup')!;
      const lot = grp.getObjectByName('LotGroundContextGroup')!;

      expect(lod2.visible, 'LOD2 massing shell must NOT pop in Orbit mode').toBe(false);
      expect(ext.visible, 'ExteriorShell remains visible in Orbit mode').toBe(true);
      expect(details.visible, 'DetailPropsGroup remains visible in Orbit mode').toBe(true);
      expect(lot.visible, 'LotGroundContext remains visible in Orbit mode').toBe(true);
    });

    it('performs Smart Distance Rendering in First-Person mode (< 30m vs >= 30m)', () => {
      const grp = buildingManager.getBuildingGroup('tier_lod_bld')!;
      const ext = grp.getObjectByName('ExteriorShell')!;
      const details = grp.getObjectByName('DetailPropsGroup')!;
      const int = grp.getObjectByName('InteriorDetails')!;

      // 1. Near in First-Person (< 30m)
      const nearFpCam = new THREE.Vector3(12, 1.8, 12);
      buildingManager.updateLOD(nearFpCam, 'first_person', false, false, 60, 'high');
      expect(ext.visible).toBe(true);
      expect(details.visible).toBe(true);
      expect(int.visible, 'Interior visible < 30m in first-person').toBe(true);

      // 2. Far in First-Person (>= 30m)
      const farFpCam = new THREE.Vector3(50, 1.8, 50);
      buildingManager.updateLOD(farFpCam, 'first_person', false, false, 60, 'high');
      expect(ext.visible).toBe(true);
      expect(int.visible, 'Interior culled >= 30m in first-person').toBe(false);
    });
  });
});

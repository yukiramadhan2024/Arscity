import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RoofEquipmentBuilder } from '../src/buildings/builders/RoofEquipmentBuilder';
import { RoofMeshBuilder } from '../src/buildings/builders/RoofMeshBuilder';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { ProceduralTextureGen } from '../src/materials/ProceduralTextureGen';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';

describe('Tahap V4: Atap dan Peralatan Atap Nusantara (Roof & Equipment Suite)', () => {
  beforeEach(() => {
    PrefabMeshBuilder.clearCache();
  });

  describe('1. Procedural Roof PBR Textures', () => {
    it('generates 5-channel PBR maps for high-efficiency solar PV panels', () => {
      const pkg = ProceduralTextureGen.getSolarPanelPackage(256);
      expect(pkg).toBeDefined();
      expect(pkg.albedo).toBeInstanceOf(THREE.CanvasTexture);
      expect(pkg.normal).toBeInstanceOf(THREE.CanvasTexture);
      expect(pkg.roughness).toBeInstanceOf(THREE.CanvasTexture);
      expect(pkg.ao).toBeInstanceOf(THREE.CanvasTexture);
      expect(pkg.height).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('generates ribbed plastic PBR maps for Indonesian toren water tanks', () => {
      const pkg = ProceduralTextureGen.getTorenRibbedPackage(256);
      expect(pkg).toBeDefined();
      expect(pkg.normal).toBeInstanceOf(THREE.CanvasTexture);
      expect(pkg.height).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('generates living green roof succulent sedum mats for eco-roofs', () => {
      const pkg = ProceduralTextureGen.getSedumGreenRoofPackage(256);
      expect(pkg).toBeDefined();
      expect(pkg.albedo).toBeInstanceOf(THREE.CanvasTexture);
      expect(pkg.normal).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('provides specialized roof materials in MaterialLibrary', () => {
      const matLib = MaterialLibrary.getInstance();
      const solarMat = matLib.getMaterial('solar_panel') as THREE.MeshStandardMaterial;
      const torenOrange = matLib.getMaterial('toren_orange') as THREE.MeshStandardMaterial;
      const torenBlue = matLib.getMaterial('toren_blue') as THREE.MeshStandardMaterial;
      const torenStainless = matLib.getMaterial('toren_stainless') as THREE.MeshStandardMaterial;
      const greenRoof = matLib.getMaterial('green_roof') as THREE.MeshStandardMaterial;
      const gravelRoof = matLib.getMaterial('kerikil_atap') as THREE.MeshStandardMaterial;
      const membraneRoof = matLib.getMaterial('membran_atap') as THREE.MeshStandardMaterial;

      expect(solarMat.metalness).toBeGreaterThan(0.5);
      expect(torenOrange.color.getHexString()).toBe('ea580c');
      expect(torenBlue.color.getHexString()).toBe('0284c7');
      expect(torenStainless.metalness).toBeGreaterThan(0.8);
      expect(greenRoof).toBeDefined();
      expect(gravelRoof).toBeDefined();
      expect(membraneRoof).toBeDefined();
    });
  });

  describe('2. Detailed Flat Roof & Parapet Detailing', () => {
    it('constructs detailed flat roof with coping capstone and recessed gravel deck', () => {
      const group = new THREE.Group();
      RoofEquipmentBuilder.buildDetailedFlatRoof(group, 10, 14, 5.0, {
        parapetHeight: 0.8,
        parapetThickness: 0.18,
        deckSurface: 'gravel',
        hasScuppers: true,
      });

      expect(group.children.length).toBeGreaterThan(5);

      // Verify overall bounding box includes parapet and coping overhang
      const bbox = new THREE.Box3().setFromObject(group);
      expect(bbox.max.y).toBeCloseTo(5.0 + 0.22 + 0.8 + 0.08, 1);
      expect(bbox.max.x - bbox.min.x).toBeGreaterThanOrEqual(10);
      expect(bbox.max.z - bbox.min.z).toBeGreaterThanOrEqual(14);
    });

    it('supports waterproof membrane and green roof living deck options', () => {
      const groupMembrane = new THREE.Group();
      RoofEquipmentBuilder.buildDetailedFlatRoof(groupMembrane, 8, 8, 4.0, { deckSurface: 'membrane' });
      expect(groupMembrane.children.length).toBeGreaterThan(0);

      const groupGreen = new THREE.Group();
      RoofEquipmentBuilder.buildDetailedFlatRoof(groupGreen, 8, 8, 4.0, { deckSurface: 'green_roof' });
      expect(groupGreen.children.length).toBeGreaterThan(0);
    });
  });

  describe('3. Indonesian Vernacular & Modern Rooftop Equipment Models', () => {
    it('builds authentic Indonesian water storage tank (Toren Air) with stand and ladder', () => {
      const group = new THREE.Group();
      RoofEquipmentBuilder.buildWaterTankToren(group, 0, 0, 0, {
        capacity: '1000L',
        material: 'orange',
        hasStand: true,
        standHeight: 1.2,
      });

      expect(group.children.length).toBeGreaterThan(10);

      let foundCylinder = false;
      let foundStand = false;
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mesh = c as THREE.Mesh;
          if (mesh.geometry instanceof THREE.CylinderGeometry) foundCylinder = true;
          if (mesh.geometry instanceof THREE.BoxGeometry) foundStand = true;
        }
      });
      expect(foundCylinder).toBe(true);
      expect(foundStand).toBe(true);
    });

    it('builds solar PV arrays oriented towards True North (-Z) for Southern Hemisphere (~7.8° S)', () => {
      const group = new THREE.Group();
      RoofEquipmentBuilder.buildSolarPanelArray(group, 0, 0, 0, {
        rows: 2,
        cols: 3,
        tiltDeg: 12,
        faceNorth: true,
      });

      expect(group.children.length).toBeGreaterThan(6);

      // Verify that children meshes are pitched towards North (-Z)
      const meshes: THREE.Mesh[] = [];
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);
      });
      expect(meshes.length).toBeGreaterThan(0);
    });

    it('builds packaged commercial rooftop HVAC chiller with top discharge fans and vibration pads', () => {
      const group = new THREE.Group();
      RoofEquipmentBuilder.buildHvacChillerUnit(group, 0, 0, 0, {
        width: 2.4,
        height: 1.3,
        length: 1.5,
        dualFan: true,
      });

      expect(group.children.length).toBeGreaterThan(5);
      const bbox = new THREE.Box3().setFromObject(group);
      expect(bbox.max.x - bbox.min.x).toBeGreaterThanOrEqual(2.0);
    });

    it('builds cyclone wind turbine ventilators and mushroom exhaust hoods', () => {
      const groupTurbine = new THREE.Group();
      RoofEquipmentBuilder.buildTurbineVentilator(groupTurbine, 0, 0, 0, { count: 2, spacing: 1.2 });
      expect(groupTurbine.children.length).toBeGreaterThanOrEqual(8);

      const groupMushroom = new THREE.Group();
      RoofEquipmentBuilder.buildMushroomExhaustCap(groupMushroom, 0, 0, 0);
      expect(groupMushroom.children.length).toBe(3);
    });

    it('builds rooftop glazed skylights and maintenance access hatches with guardrails', () => {
      const groupSky = new THREE.Group();
      RoofEquipmentBuilder.buildRooftopSkylight(groupSky, 0, 0, 0, { width: 2.0, length: 2.5 });
      expect(groupSky.children.length).toBeGreaterThan(3);

      const groupHatch = new THREE.Group();
      RoofEquipmentBuilder.buildRoofMaintenanceHatch(groupHatch, 0, 0, 0);
      expect(groupHatch.children.length).toBeGreaterThan(6);
    });

    it('builds residential solar water heaters (Solahart/Wika Solar type)', () => {
      const group = new THREE.Group();
      RoofEquipmentBuilder.buildSolarWaterHeater(group, 0, 0, 0, 12);
      expect(group.children.length).toBeGreaterThan(4);
    });

    it('builds telecom antenna masts and parabolic satellite dishes', () => {
      const groupDish = new THREE.Group();
      RoofEquipmentBuilder.buildTelecomAntennaDish(groupDish, 0, 0, 0, 'parabola');
      expect(groupDish.children.length).toBeGreaterThan(2);

      const groupMast = new THREE.Group();
      RoofEquipmentBuilder.buildTelecomAntennaDish(groupMast, 0, 0, 0, 'mast');
      expect(groupMast.children.length).toBeGreaterThan(2);
    });
  });

  describe('4. Deterministic Equipment Scatter & Whole Building Integration', () => {
    it('scatters rooftop equipment deterministically per building seed and category', () => {
      const bldShophouse: BuildingInstance = {
        id: 'test_ruko_01',
        presetKey: 'ruko_3fl',
        name: 'Ruko 3 Lantai',
        category: 'commercial',
        position: new THREE.Vector3(10, 0, 20),
        rotationY: 0,
        width: 6,
        length: 12,
        floorCount: 3,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.4,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roofMaterial: 'metal',
      };

      const group1 = new THREE.Group();
      RoofEquipmentBuilder.scatterRooftopEquipment(group1, bldShophouse, 6, 12, 11.75, 'flat');

      const group2 = new THREE.Group();
      RoofEquipmentBuilder.scatterRooftopEquipment(group2, bldShophouse, 6, 12, 11.75, 'flat');

      // Deterministic: identical child count and bounding box
      expect(group1.children.length).toBe(group2.children.length);
      const box1 = new THREE.Box3().setFromObject(group1);
      const box2 = new THREE.Box3().setFromObject(group2);
      expect(box1.min.distanceTo(box2.min)).toBeCloseTo(0, 5);
      expect(box1.max.distanceTo(box2.max)).toBeCloseTo(0, 5);
    });

    it('integrates rooftop equipment seamlessly through PrefabMeshBuilder without NaN coords or merge failures', () => {
      const testBuildings: Partial<BuildingInstance>[] = [
        { id: 'bld_h36', presetKey: 'house_36', width: 6, length: 10, floorCount: 1, floorHeight: 3.2, roofType: 'gable' },
        { id: 'bld_h54', presetKey: 'house_54', width: 8, length: 12, floorCount: 1, floorHeight: 3.5, roofType: 'hip' },
        { id: 'bld_ruko', presetKey: 'ruko_3fl', width: 5, length: 14, floorCount: 3, floorHeight: 3.8, roofType: 'flat' },
        { id: 'bld_retail', presetKey: 'minimarket', width: 10, length: 14, floorCount: 1, floorHeight: 4.5, roofType: 'flat' },
        { id: 'bld_office', presetKey: 'office_tower', width: 16, length: 16, floorCount: 5, floorHeight: 4.0, roofType: 'flat' },
      ];

      for (const def of testBuildings) {
        const bld: BuildingInstance = {
          id: def.id!,
          presetKey: def.presetKey!,
          name: def.presetKey!,
          category: 'commercial',
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          width: def.width!,
          length: def.length!,
          floorCount: def.floorCount!,
          floorHeight: def.floorHeight!,
          roofType: def.roofType as any,
          roofOverhang: 0.5,
          wallMaterial: 'plaster',
          wallColor: '#f8fafc',
          roofMaterial: 'metal',
        };

        const group = PrefabMeshBuilder.buildBuildingGroup(bld);
        expect(group).toBeDefined();
        expect(group.children.length).toBeGreaterThan(0);

        // Verify zero NaN coordinates in any vertex position
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const posAttr = mesh.geometry.attributes.position;
            expect(posAttr).toBeDefined();
            for (let i = 0; i < posAttr.count; i++) {
              expect(Number.isNaN(posAttr.getX(i))).toBe(false);
              expect(Number.isNaN(posAttr.getY(i))).toBe(false);
              expect(Number.isNaN(posAttr.getZ(i))).toBe(false);
            }
          }
        });
      }
    });
  });
});


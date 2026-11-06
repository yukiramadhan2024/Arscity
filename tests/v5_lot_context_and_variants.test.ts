import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { LotContextBuilder } from '../src/buildings/builders/LotContextBuilder';
import { BuildingVariantGenerator } from '../src/buildings/BuildingVariantGenerator';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { ProceduralTextureGen } from '../src/materials/ProceduralTextureGen';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';

describe('Tahap V5: Konteks Kavling, Vegetasi & Generator Variasi Suite', () => {
  beforeEach(() => {
    PrefabMeshBuilder.clearCache();
  });

  describe('1. Ambient Contact Shadow & Markings PBR', () => {
    it('generates soft Gaussian radial contact shadow texture', () => {
      const tex = ProceduralTextureGen.getContactShadowTexture(256);
      expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    });

    it('provides contact_shadow, marking_white, and marking_yellow materials', () => {
      const matLib = MaterialLibrary.getInstance();
      const shadowMat = matLib.getMaterial('contact_shadow') as THREE.MeshStandardMaterial;
      const whiteMat = matLib.getMaterial('marking_white') as THREE.MeshStandardMaterial;
      const yellowMat = matLib.getMaterial('marking_yellow') as THREE.MeshStandardMaterial;

      expect(shadowMat.transparent).toBe(true);
      expect(shadowMat.depthWrite).toBe(false);
      expect(whiteMat.color.getHexString()).toBe('f8fafc');
      expect(yellowMat.color.getHexString()).toBe('facc15');
    });
  });

  describe('2. Lot Context & Forecourt Builder', () => {
    const commercialBld: BuildingInstance = {
      id: 'ruko_sample',
      presetKey: 'ruko_3fl',
      name: 'Ruko 3 Lantai',
      category: 'commercial',
      position: new THREE.Vector3(0, 0, 0),
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

    it('builds commercial parking lot with asphalt, stall striping, wheel stops and curbs', () => {
      const group = new THREE.Group();
      LotContextBuilder.buildCommercialParkingLot(group, commercialBld, { showParkedVehicles: false });

      expect(group.children.length).toBeGreaterThan(6);

      let foundWheelStops = false;
      let foundContactShadow = false;
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          if (m.geometry instanceof THREE.PlaneGeometry && (m.material as THREE.Material).transparent) {
            foundContactShadow = true;
          }
          if (m.material === MaterialLibrary.getInstance().getMaterial('concrete_board')) {
            foundWheelStops = true;
          }
        }
      });
      expect(foundWheelStops).toBe(true);
      expect(foundContactShadow).toBe(true);
    });

    it('strictly disables parked vehicles by default', () => {
      const groupDefault = new THREE.Group();
      LotContextBuilder.buildCommercialParkingLot(groupDefault, commercialBld);

      // Verify no car/vehicle meshes when showParkedVehicles is omitted/false
      let carCount = 0;
      groupDefault.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          if (m.geometry instanceof THREE.CylinderGeometry && m.geometry.parameters.radialSegments === 12) {
            carCount++; // Car tire
          }
        }
      });
      expect(carCount).toBe(0);
    });

    it('renders stylized parked vehicles when optionally toggled on', () => {
      const groupToggled = new THREE.Group();
      LotContextBuilder.buildCommercialParkingLot(groupToggled, commercialBld, {
        showParkedVehicles: true,
        seed: 12345,
      });

      let foundCarTire = false;
      groupToggled.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          if (m.geometry instanceof THREE.CylinderGeometry && m.geometry.parameters.radialSegments === 12) {
            foundCarTire = true;
          }
        }
      });
      expect(foundCarTire).toBe(true);
    });

    it('builds residential driveway with paving, front garden stepping stones, and perimeter fence', () => {
      const resBld: BuildingInstance = {
        id: 'house_sample',
        presetKey: 'house_36',
        name: 'Rumah Tipe 36',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      const group = new THREE.Group();
      LotContextBuilder.buildResidentialDrivewayAndFence(group, resBld);

      expect(group.children.length).toBeGreaterThan(8);
      const bbox = new THREE.Box3().setFromObject(group);
      expect(bbox.max.z).toBeGreaterThan(resBld.length * 0.5);
    });

    it('builds public plaza forecourt with tactile tiles and bicycle racks', () => {
      const pubBld: BuildingInstance = {
        id: 'puskesmas_sample',
        presetKey: 'puskesmas',
        name: 'Puskesmas',
        category: 'public',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 14,
        length: 16,
        floorCount: 2,
        floorHeight: 4.2,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'metal',
      };

      const group = new THREE.Group();
      LotContextBuilder.buildPublicPlazaForecourt(group, pubBld);
      expect(group.children.length).toBeGreaterThan(6);
    });
  });

  describe('3. Building Variant Generator & Anti-Cloning', () => {
    it('provides at least 12 distinct neutral tropical palettes', () => {
      expect(BuildingVariantGenerator.TROPICAL_NEUTRAL_PALETTES.length).toBeGreaterThanOrEqual(12);
      for (const p of BuildingVariantGenerator.TROPICAL_NEUTRAL_PALETTES) {
        expect(p.id).toBeDefined();
        expect(p.primaryWall).toMatch(/^#[0-9a-f]{6}$/i);
        expect(p.roofMaterial).toBeDefined();
        expect(p.windowFrame).toBeDefined();
      }
    });

    it('generates reproducible deterministic variants from building ID and position', () => {
      const bld1: BuildingInstance = {
        id: 'bld_alpha',
        presetKey: 'house_54',
        name: 'Rumah 54',
        category: 'residential',
        position: new THREE.Vector3(15, 0, 30),
        rotationY: 0,
        width: 8,
        length: 12,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'hip',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      const var1 = BuildingVariantGenerator.getVariantForBuilding(bld1);
      const var2 = BuildingVariantGenerator.getVariantForBuilding(bld1);

      expect(var1.seed).toBe(var2.seed);
      expect(var1.palette.id).toBe(var2.palette.id);
      expect(var1.weatheringIntensity).toBeCloseTo(var2.weatheringIntensity, 5);
    });

    it('shifts seed when adjacent identical buildings are detected (anti-clone protection)', () => {
      const bldA: BuildingInstance = {
        id: 'bld_lot_1',
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
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };

      // Identical building placed on next lot 8 meters away
      const bldB: BuildingInstance = {
        ...bldA,
        id: 'bld_lot_2',
        position: new THREE.Vector3(8, 0, 0),
      };

      const varA = BuildingVariantGenerator.getVariantForBuilding(bldA);
      const varB = BuildingVariantGenerator.getVariantForBuilding(bldB, [bldA]);

      // Seed must not result in identical palette
      expect(varA.seed).not.toBe(varB.seed);
    });

    it('validates form logic to ensure watertight geometry without disjoint volumes', () => {
      const validBld: BuildingInstance = {
        id: 'v_ok',
        presetKey: 'house_36',
        name: 'OK',
        category: 'residential',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 6,
        length: 10,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 0.5,
        wallMaterial: 'plaster',
        wallColor: '#ffffff',
        roofMaterial: 'clay_tile',
      };
      expect(BuildingVariantGenerator.validateFormLogic(validBld)).toBe(true);

      const invalidBld: BuildingInstance = {
        ...validBld,
        width: -5,
      };
      expect(BuildingVariantGenerator.validateFormLogic(invalidBld)).toBe(false);
    });
  });

  describe('4. Whole Building Group Integration', () => {
    it('automatically attaches functional lot ground context to buildings in PrefabMeshBuilder', () => {
      const bld: BuildingInstance = {
        id: 'bld_complete_ruko',
        presetKey: 'ruko_3fl',
        name: 'Ruko Lengkap',
        category: 'commercial',
        position: new THREE.Vector3(20, 0, 40),
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

      const group = PrefabMeshBuilder.buildBuildingGroup(bld);
      expect(group).toBeDefined();

      const contextGroup = group.getObjectByName('LotGroundContextGroup');
      expect(contextGroup).toBeDefined();
      expect(contextGroup!.children.length).toBeGreaterThan(0);

      // Verify no NaN coordinates in the entire building hierarchy
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          const pos = m.geometry.attributes.position;
          expect(pos).toBeDefined();
          for (let i = 0; i < pos.count; i++) {
            expect(Number.isNaN(pos.getX(i))).toBe(false);
            expect(Number.isNaN(pos.getY(i))).toBe(false);
            expect(Number.isNaN(pos.getZ(i))).toBe(false);
          }
        }
      });
    });
  });
});

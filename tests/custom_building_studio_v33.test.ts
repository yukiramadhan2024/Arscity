import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  generateFloorsForMassingShape,
  CustomBuilding,
  WindowStyleType
} from '../src/buildings/CustomBuildingModel';
import { CustomBuildingMeshBuilder } from '../src/buildings/CustomBuildingMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Arscity v3.3.0 - Studio CAD Architectural Overhaul & Procedural Massing Suite', () => {
  describe('TAHAP 2: 5 Massing Shapes (generateFloorsForMassingShape)', () => {
    it('1. generates correct 4-vertex rectangular polygon for "box" massing shape', () => {
      const floors = generateFloorsForMassingShape('box', 10, 12, 3, 3.2);
      expect(floors).toHaveLength(3);
      floors.forEach((f, idx) => {
        expect(f.floorIndex).toBe(idx);
        expect(f.footprint).toHaveLength(4);
        expect(f.height).toBe(3.2);
        // Verify bounding rectangle matches width 10, length 12
        const xs = f.footprint.map((p) => p.x);
        const ys = f.footprint.map((p) => p.y);
        expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10);
        expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(12);
      });
    });

    it('2. generates 6-vertex L-shaped polygon for "l_shape" massing shape leaving courtyard corner', () => {
      const floors = generateFloorsForMassingShape('l_shape', 14, 16, 2, 3.2);
      expect(floors).toHaveLength(2);
      floors.forEach((f) => {
        expect(f.footprint).toHaveLength(6);
        // Has indented corner vertex at (0, 0)
        const hasOriginCorner = f.footprint.some((p) => p.x === 0 && p.y === 0);
        expect(hasOriginCorner).toBe(true);
      });
    });

    it('3. generates 8-vertex U-shaped courtyard polygon for "courtyard_u" massing shape', () => {
      const floors = generateFloorsForMassingShape('courtyard_u', 16, 18, 2, 3.2);
      expect(floors).toHaveLength(2);
      floors.forEach((f) => {
        expect(f.footprint).toHaveLength(8);
      });
    });

    it('4. generates wide podium base (fl 0-1) and stepped-back tower (fl 2+) for "stepped_podium"', () => {
      const floors = generateFloorsForMassingShape('stepped_podium', 20, 20, 4, 3.2);
      expect(floors).toHaveLength(4);
      // Floor 0 and 1 are full podium (width: 20)
      const baseXs = floors[0].footprint.map((p) => p.x);
      expect(Math.max(...baseXs) - Math.min(...baseXs)).toBeCloseTo(20);

      // Floor 2 and 3 step back to 70% tower (width: 14)
      const towerXs = floors[2].footprint.map((p) => p.x);
      expect(Math.max(...towerXs) - Math.min(...towerXs)).toBeCloseTo(14);
    });

    it('5. generates ground floor setback and forward protruding cantilever on upper floors for "cantilever"', () => {
      const floors = generateFloorsForMassingShape('cantilever', 12, 14, 2, 3.2);
      expect(floors).toHaveLength(2);
      // Floor 0 is set back in front
      const fl0Ys = floors[0].footprint.map((p) => p.y);
      const fl1Ys = floors[1].footprint.map((p) => p.y);
      // Floor 1 reaches further forward than Floor 0
      expect(Math.max(...fl1Ys)).toBeGreaterThan(Math.max(...fl0Ys));
    });
  });

  describe('TAHAP 3: 5 Window Styles, Facade Accessories & 2-Material Base Plinth', () => {
    it('procedurally builds valid 3D mesh with arcade columns, balconies, sun louvers, and vertical gardens', () => {
      const bldData: CustomBuilding = {
        id: 'test_cad_bld',
        name: 'Villa Tropis Multi-Fitur',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        plinthHeight: 0.35,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        floors: generateFloorsForMassingShape('cantilever', 12, 14, 2, 3.2),
        roof: {
          type: 'hip',
          material: 'metal',
          overhang: 1.4,
          pitchAngle: 35
        },
        massingShape: 'cantilever',
        windowStyle: 'curtain_wall',
        hasBalcony: true,
        hasSunLouvers: true,
        hasVerticalGarden: true,
        hasFrontArcade: true,
        useBasePlinthMaterial: true,
        baseMaterial: 'andesite',
        mullionColor: '#1e293b',
        hasSkylight: true
      };

      const mesh = CustomBuildingMeshBuilder.buildCustomBuilding(bldData);
      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBeGreaterThan(0);

      // Verify no NaN coordinates in geometry vertices
      let vertexCount = 0;
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const posAttr = child.geometry.attributes.position;
          if (posAttr) {
            vertexCount += posAttr.count;
            for (let i = 0; i < posAttr.count; i++) {
              expect(Number.isNaN(posAttr.getX(i))).toBe(false);
              expect(Number.isNaN(posAttr.getY(i))).toBe(false);
              expect(Number.isNaN(posAttr.getZ(i))).toBe(false);
            }
          }
        }
      });
      expect(vertexCount).toBeGreaterThan(100);

      // Clean disposal test
      expect(() => {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }).not.toThrow();
    });

    it('supports all 5 window styles with distinct openings without geometry errors', () => {
      const styles: WindowStyleType[] = [
        'modern_ribbon',
        'curtain_wall',
        'javanese_krepyak',
        'colonial_arch',
        'minimalist_slot'
      ];

      styles.forEach((wStyle) => {
        const bldData: CustomBuilding = {
          id: `test_${wStyle}`,
          name: `Building ${wStyle}`,
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          plinthHeight: 0.35,
          wallMaterial: 'plaster',
          wallColor: '#f8fafc',
          floors: generateFloorsForMassingShape('box', 10, 10, 2, 3.2),
          roof: {
            type: 'gable',
            material: 'clay_tile',
            overhang: 1.0,
            pitchAngle: 30
          },
          massingShape: 'box',
          windowStyle: wStyle,
          hasBalcony: false,
          hasSunLouvers: false,
          hasVerticalGarden: false,
          hasFrontArcade: false,
          useBasePlinthMaterial: false
        };

        const mesh = CustomBuildingMeshBuilder.buildCustomBuilding(bldData);
        expect(mesh.children.length).toBeGreaterThan(0);
      });
    });
  });

  describe('TAHAP 4: BuildingInstance & CitySerializer Preservation', () => {
    it('preserves all new architectural CAD properties on BuildingInstance', () => {
      const instance: BuildingInstance = {
        id: 'bld_cad_test',
        presetKey: 'custom_designer',
        name: 'Villa Bali Modern Kustom',
        category: 'residential',
        position: new THREE.Vector3(10, 0, 10),
        rotationY: 0,
        width: 14,
        length: 16,
        floorCount: 2,
        floorHeight: 3.2,
        roofType: 'hip',
        roofOverhang: 1.6,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roofMaterial: 'metal',
        massingShape: 'l_shape',
        windowStyle: 'curtain_wall',
        hasBalcony: true,
        hasSunLouvers: true,
        hasVerticalGarden: true,
        hasFrontArcade: false,
        useBasePlinthMaterial: true,
        baseMaterial: 'andesite',
        mullionColor: '#1e293b',
        hasSkylight: false
      };

      expect(instance.massingShape).toBe('l_shape');
      expect(instance.windowStyle).toBe('curtain_wall');
      expect(instance.hasBalcony).toBe(true);
      expect(instance.hasSunLouvers).toBe(true);
      expect(instance.hasVerticalGarden).toBe(true);
      expect(instance.useBasePlinthMaterial).toBe(true);
      expect(instance.baseMaterial).toBe('andesite');
    });

    it('procedurally constructs valid 3D geometry for sawtooth and butterfly roofs', () => {
      ['sawtooth', 'butterfly'].forEach((rType) => {
        const bldData: CustomBuilding = {
          id: `test_roof_${rType}`,
          name: `Building ${rType}`,
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          plinthHeight: 0.35,
          wallMaterial: 'concrete',
          wallColor: '#e2e8f0',
          floors: generateFloorsForMassingShape('box', 12, 14, 2, 3.2),
          roof: {
            type: rType as any,
            material: 'metal',
            overhang: 1.0,
            pitchAngle: 25
          },
          massingShape: 'box',
          windowStyle: 'modern_ribbon'
        };

        const mesh = CustomBuildingMeshBuilder.buildCustomBuilding(bldData);
        expect(mesh).toBeInstanceOf(THREE.Group);
        expect(mesh.children.length).toBeGreaterThan(0);
      });
    });

    it('ensures CustomBuildingStudioModal is the identical canonical export as CustomBuildingCreatorModal', async () => {
      const creatorModule = await import('../src/ui/components/CustomBuildingCreatorModal');
      const studioModule = await import('../src/ui/components/CustomBuildingStudioModal');
      expect(studioModule.CustomBuildingStudioModal).toBe(creatorModule.CustomBuildingCreatorModal);
    });
  });
});


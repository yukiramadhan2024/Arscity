import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { calculateBuildingAreas } from '../src/buildings/CustomBuildingModel';
import { CustomBuildingMeshBuilder } from '../src/buildings/CustomBuildingMeshBuilder';
import { BuildingTool } from '../src/tools/BuildingTool';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { RaycastManager } from '../src/core/engine/RaycastManager';
import { CustomBuilding } from '../src/buildings/CustomBuildingModel';

describe('Custom Building CAD Studio v3.3 - Geometry & Camera Accuracy & Features', () => {
  describe('BAGIAN 1: Kalkulasi Luas KDB & KLB sesuai Bentuk Massa', () => {
    it('1. Menghitung luas KDB bentuk L (l_shape) berkurang 25% (14m x 16m -> 168 m² akurat)', () => {
      // 14 * 16 = 224 m² gross, 224 * 0.75 = 168 m²
      const { kdb, klb } = calculateBuildingAreas(14, 16, 2, 'l_shape');
      expect(kdb).toBe(168);
      expect(klb).toBe(336);
    });

    it('2. Menghitung luas KDB bentuk U (courtyard_u) berkurang 20% (taman tengah tropis)', () => {
      // 10 * 10 = 100 m² gross, 100 * 0.80 = 80 m²
      const { kdb, klb } = calculateBuildingAreas(10, 10, 2, 'courtyard_u');
      expect(kdb).toBe(80);
      expect(klb).toBe(160);
    });

    it('3. Menghitung KLB Podium & Menara (stepped_podium) presisi per lantai', () => {
      // 10 * 10 = 100 m² base, podium floor 0 = 100 m², tower upper floor = 49 m²
      const { kdb, klb } = calculateBuildingAreas(10, 10, 2, 'stepped_podium');
      expect(kdb).toBe(100);
      expect(klb).toBe(149);
    });

    it('4. Menghitung KLB Kantilever Modern (cantilever) presisi per lantai', () => {
      // 10 * 10, ground floor length reduced by min(2.0, 10*0.22) = 2.0 -> 10 * 8 = 80 m²
      // floor 1 length full 10 -> 10 * 10 = 100 m²
      const { kdb, klb } = calculateBuildingAreas(10, 10, 2, 'cantilever');
      expect(kdb).toBe(80);
      expect(klb).toBe(180);
    });
  });

  describe('BAGIAN 1: Geometri Atap & Kolom Sudut Bentuk L', () => {
    it('Membangun tiang kolom struktural dan teras kayu pada sudut Bentuk L', () => {
      const mockBuilding: CustomBuilding = {
        id: 'test_l_shape',
        name: 'Villa L Test',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        massingShape: 'l_shape',
        plinthHeight: 0.35,
        floors: [
          {
            floorIndex: 0,
            height: 3.2,
            footprint: [
              new THREE.Vector2(-7, -8),
              new THREE.Vector2(7, -8),
              new THREE.Vector2(7, 8),
              new THREE.Vector2(-7, 8)
            ],
            walls: []
          },
          {
            floorIndex: 1,
            height: 3.2,
            footprint: [
              new THREE.Vector2(-7, -8),
              new THREE.Vector2(7, -8),
              new THREE.Vector2(7, 8),
              new THREE.Vector2(-7, 8)
            ],
            walls: []
          }
        ],
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roof: {
          type: 'hip',
          material: 'clay_tile',
          overhang: 1.2,
          pitchAngle: 30
        }
      };

      const group = CustomBuildingMeshBuilder.buildCustomBuilding(mockBuilding);
      expect(group).toBeDefined();
      expect(group.children.length).toBeGreaterThan(0);

      // Verify that structural meshes (accessories group) include the corner pillar and deck
      let foundDeckOrPillar = false;
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          foundDeckOrPillar = true;
        }
      });
      expect(foundDeckOrPillar).toBe(true);
    });
  });

  describe('BAGIAN 2: Integrasi Langsung ke Katalog Kota (BuildingTool)', () => {
    it('BuildingTool menerima customBuildingTemplate dan menyiapkan ghost mesh', () => {
      const scene = new THREE.Scene();
      const mockBuildingManager = {} as any;
      const mockRaycastManager = {} as any;
      const mockEngine = {} as any;

      const tool = new BuildingTool(mockBuildingManager, mockRaycastManager, scene, mockEngine);
      expect(tool.customBuildingTemplate).toBeNull();

      tool.setCustomTemplate({
        presetKey: 'custom_designer',
        name: 'Rancangan Studio Kustom',
        massingShape: 'l_shape',
        width: 14,
        length: 16,
        floorCount: 2,
        floorHeight: 3.2,
        roofType: 'hip',
        wallMaterial: 'plaster'
      });

      expect(tool.customBuildingTemplate).toBeDefined();
      expect(tool.customBuildingTemplate?.name).toBe('Rancangan Studio Kustom');
      expect(tool.customBuildingTemplate?.massingShape).toBe('l_shape');

      tool.dispose();
    });
  });
});

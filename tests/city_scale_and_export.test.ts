import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { cityScoreAnalyzer } from '../src/analysis/CityScoreAnalyzer';
import { advancedBuildingCodeRegistry } from '../src/zones/AdvancedBuildingCode';
import { RealWorldExporter } from '../src/io/RealWorldExporter';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Milestone T6: Skala Kota, Aturan Lanjutan, dan Ekspor CAD/3D', () => {
  it('mengevaluasi aturan bangunan lanjutan: batas tinggi vs lebar jalan', () => {
    const mockRoadManager: any = {
      graph: {
        edges: new Map([
          ['edge_1', {
            id: 'edge_1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            customProfile: { width: 6.0 }, // Jalan lingkungan 6m -> Max H = 6 * 1.5 = 9.0m
            length: 50
          }]
        ]),
        nodes: new Map([
          ['n1', { id: 'n1', position: new THREE.Vector3(0, 0, 0), connectedEdgeIds: ['edge_1'] }],
          ['n2', { id: 'n2', position: new THREE.Vector3(50, 0, 0), connectedEdgeIds: ['edge_1'] }]
        ])
      }
    };

    // Bangunan 2 lantai (tinggi ~ 2 * 3.2 + 2.5 = 8.9m <= 9.0m) -> lolos
    const shortBuilding: BuildingInstance = {
      id: 'bld_1',
      presetKey: 'house_36',
      name: 'Rumah Tinggal',
      category: 'residential',
      position: new THREE.Vector3(25, 0, 5),
      rotationY: 0,
      width: 8,
      length: 12,
      floorCount: 2,
      floorHeight: 3.2,
      footprintPolygon: [
        new THREE.Vector2(-4, -6),
        new THREE.Vector2(4, -6),
        new THREE.Vector2(4, 6),
        new THREE.Vector2(-4, 6)
      ],
      floors: [],
      roofType: 'hip',
      roofOverhang: 1.0,
      wallMaterial: 'brick',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile'
    };

    const shortViolations = advancedBuildingCodeRegistry.evaluateBuilding(shortBuilding, mockRoadManager);
    expect(shortViolations.some(v => v.code === 'HEIGHT_TO_ROAD_WIDTH')).toBe(false);

    // Bangunan 5 lantai (tinggi ~ 5 * 3.2 + 2.5 = 18.5m > 9.0m) -> melanggar tinggi dan wajib tangga darurat
    const tallBuilding: BuildingInstance = {
      ...shortBuilding,
      id: 'bld_2',
      floorCount: 5
    };

    const tallViolations = advancedBuildingCodeRegistry.evaluateBuilding(tallBuilding, mockRoadManager);
    expect(tallViolations.some(v => v.code === 'HEIGHT_TO_ROAD_WIDTH')).toBe(true);
    expect(tallViolations.some(v => v.code === 'EMERGENCY_STAIRS_REQUIRED')).toBe(true);
  });

  it('menghitung skor akses pejalan kaki 400m dan RTH kota', () => {
    const mockBuildingManager: any = {
      buildings: new Map<string, BuildingInstance>([
        ['sch', {
          id: 'sch',
          name: 'Sekolah Dasar',
          presetKey: 'school',
          category: 'public',
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          width: 20,
          length: 30,
          floorCount: 2,
          floorHeight: 3.2,
          roofType: 'gable',
          roofOverhang: 1.2,
          wallMaterial: 'plaster',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        }],
        ['res1', {
          id: 'res1',
          name: 'Rumah 1',
          presetKey: 'house_36',
          category: 'residential',
          position: new THREE.Vector3(100, 0, 100), // ~141m dari sekolah (<= 400m)
          rotationY: 0,
          width: 6,
          length: 10,
          floorCount: 1,
          floorHeight: 3.2,
          roofType: 'hip',
          roofOverhang: 1.0,
          wallMaterial: 'brick',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        }],
        ['res2', {
          id: 'res2',
          name: 'Rumah 2',
          presetKey: 'house_54',
          category: 'residential',
          position: new THREE.Vector3(600, 0, 600), // ~848m dari sekolah (> 400m)
          rotationY: 0,
          width: 8,
          length: 12,
          floorCount: 1,
          floorHeight: 3.2,
          roofType: 'hip',
          roofOverhang: 1.0,
          wallMaterial: 'brick',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        }]
      ])
    };

    const mockRoadManager: any = {
      graph: {
        edges: new Map(),
        nodes: new Map([
          ['n1', { id: 'n1', connectedEdgeIds: ['e1', 'e2', 'e3'] }],
          ['n2', { id: 'n2', connectedEdgeIds: ['e1'] }]
        ])
      }
    };

    const mockLandscapeManager: any = {
      items: new Map([
        ['t1', { id: 't1', type: 'grass_garden', width: 20, length: 20 }]
      ])
    };

    const mockLotManager: any = {
      lots: new Map()
    };

    const score = cityScoreAnalyzer.evaluateCity(
      mockBuildingManager,
      mockRoadManager,
      mockLandscapeManager,
      mockLotManager
    );

    // 1 dari 2 rumah dalam radius 400m -> 50%
    expect(score.walkabilityPercent).toBe(50);
    expect(score.facilities.length).toBe(1);
    expect(score.facilities[0].type).toBe('school');
    expect(score.overallSustainabilityScore).toBeGreaterThan(0);
    expect(score.overallSustainabilityScore).toBeLessThanOrEqual(100);
  });

  it('menghasilkan berkas DXF 2D yang valid dengan layer terstruktur', () => {
    const mockBuildingManager: any = {
      buildings: new Map<string, any>([
        ['bld_1', {
          id: 'bld_1',
          presetKey: 'house_36',
          name: 'Rumah Sederhana',
          category: 'residential',
          position: new THREE.Vector3(10, 0, 10),
          rotationY: 0,
          width: 6,
          length: 10,
          floorCount: 1,
          floorHeight: 3.2,
          footprintPolygon: [
            new THREE.Vector2(-3, -5),
            new THREE.Vector2(3, -5),
            new THREE.Vector2(3, 5),
            new THREE.Vector2(-3, 5)
          ],
          floors: [
            {
              floorIndex: 0,
              elevation: 0,
              rooms: [
                { id: 'r1', name: 'Ruang Tamu', type: 'living', areaM2: 15, boundary: [] }
              ],
              partitions: [
                { start: new THREE.Vector2(-3, 0), end: new THREE.Vector2(3, 0), thickness: 0.15, hasDoor: true }
              ]
            }
          ],
          roofType: 'hip',
          roofOverhang: 1.0,
          wallMaterial: 'brick',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        }]
      ])
    };

    const mockLotManager: any = {
      lots: new Map([
        ['lot_1', {
          id: 'lot_1',
          name: 'Kavling A-1',
          polygon: [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(20, 0),
            new THREE.Vector2(20, 20),
            new THREE.Vector2(0, 20)
          ]
        }]
      ])
    };

    const mockRoadManager: any = {
      graph: {
        edges: new Map([
          ['e1', {
            id: 'e1',
            startNodeId: 'n1',
            endNodeId: 'n2'
          }]
        ]),
        nodes: new Map([
          ['n1', { id: 'n1', position: new THREE.Vector3(0, 0, 0) }],
          ['n2', { id: 'n2', position: new THREE.Vector3(50, 0, 0) }]
        ])
      }
    };

    const dxf = RealWorldExporter.exportFloorPlanToDXF(
      mockBuildingManager,
      mockLotManager,
      mockRoadManager
    );

    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('HEADER');
    expect(dxf).toContain('TABLES');
    expect(dxf).toContain('LAYER');
    expect(dxf).toContain('LOT_BOUNDARY');
    expect(dxf).toContain('BUILDING_WALLS');
    expect(dxf).toContain('INTERIOR_PARTITIONS');
    expect(dxf).toContain('ROAD_NETWORK');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('EOF');
  });
});

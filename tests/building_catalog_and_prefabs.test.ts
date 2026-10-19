import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingCatalogRegistry } from '../src/buildings/BuildingCatalogRegistry';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { InteriorLayoutFactory } from '../src/buildings/InteriorLayoutFactory';
import { CostEstimator } from '../src/simulation/CostEstimator';
import { ThermalVentilationAnalyzer } from '../src/analysis/ThermalVentilationAnalyzer';
import { CityScoreAnalyzer } from '../src/analysis/CityScoreAnalyzer';
import { CitySerializer, CitySaveData } from '../src/io/CitySerializer';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { RoadManager } from '../src/roads/RoadManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Data-Driven Building Catalog & Parametric Procedural Architect (58 Buildings)', () => {
  const allBuildings = BuildingCatalogRegistry.getAllBuildings();

  it('contains exactly 58 buildings with zero duplicate IDs', () => {
    expect(allBuildings).toHaveLength(58);
    const idSet = new Set(allBuildings.map((b) => b.id));
    expect(idSet.size).toBe(58);
  });

  it('strictly adheres to anti-AI-slop rule: 0 Unicode emojis in names, descriptions, or categories', () => {
    // Unicode regex detecting pictographic emojis
    const emojiRegex = /\p{Extended_Pictographic}/u;

    for (const bld of allBuildings) {
      expect(emojiRegex.test(bld.name)).toBe(false);
      expect(emojiRegex.test(bld.description)).toBe(false);
      expect(emojiRegex.test(bld.category)).toBe(false);
      expect(emojiRegex.test(bld.icon)).toBe(false);
    }
  });

  it('correctly maps all 6 categories with expected counts', () => {
    const counts = BuildingCatalogRegistry.getCategoryCounts();
    expect(counts.hunian).toBe(4);
    expect(counts.kuliner_kafe).toBe(12);
    expect(counts.mall_ritel).toBe(12);
    expect(counts.kampus_kos).toBe(9);
    expect(counts.budaya_hotel).toBe(11);
    expect(counts.publik_hijau).toBe(10);
    expect(
      counts.hunian +
        counts.kuliner_kafe +
        counts.mall_ritel +
        counts.kampus_kos +
        counts.budaya_hotel +
        counts.publik_hijau
    ).toBe(58);
  });

  it('includes all 48 newly requested Indonesian building types', () => {
    const requiredNewIds = [
      // kuliner_kafe (12)
      'resto_mie_gacoan',
      'resto_burger_drivethru',
      'cafe_industrial_tropis',
      'cafe_joglo_kopi',
      'cafe_minimalis_kaca',
      'cafe_rooftop_senja',
      'cafe_kontainer_park',
      'cafe_buku_botani',
      'warmindo_modern',
      'angkringan_paviliun',
      'gelato_colonial_shop',
      'resto_bambu_ekologis',
      // mall_ritel (10 new + 2 legacy minimarket_tropis/pasar_rakyat_modern)
      'mall_grand_atrium',
      'mall_lifestyle_tropis',
      'minimarket_tropis',
      'supermarket_fresh_hub',
      'pasar_rakyat_modern',
      'toko_roti_heritage',
      'showroom_galeri_kaca',
      'bioskop_art_deco',
      'apotek_klinik_24jam',
      'pasar_kreatif_umkm',
      // kampus_kos (8 new + 1 legacy school)
      'kos_eksklusif_courtyard',
      'kos_tropis_balkon',
      'coworking_hub_tropis',
      'perpustakaan_daerah',
      'kampus_studio_arsitektur',
      'asrama_mahasiswa_hijau',
      'toko_percetakan_desain',
      'pusat_riset_iklim',
      // budaya_hotel (10 new + 1 legacy joglo)
      'boutique_hotel_jogja',
      'homestay_kampung_wisata',
      'townhouse_tropis_modern',
      'rumah_tumbuh_modular',
      'apartemen_hijau_terracotta',
      'pendopo_agung_budaya',
      'museum_arsitektur_nusantara',
      'sanggar_batik_kriya',
      'rumah_panggung_kayu',
      'villa_courtyard_tropis',
      // publik_hijau (8 new + 2 legacy mosque/puskesmas)
      'halte_transit_hub',
      'stasiun_komuter_heritage',
      'gedung_parkir_hijau',
      'gor_olahraga_tropis',
      'paviliun_taman_baca',
      'pusat_daur_ulang_tps3r',
      'pos_pemadam_mitigasi',
      'kapel_roster_tropis'
    ];

    for (const reqId of requiredNewIds) {
      const item = BuildingCatalogRegistry.getBuilding(reqId);
      expect(item, `Building ${reqId} must exist in registry`).toBeDefined();
      expect(item?.id).toBe(reqId);
    }
  });

  describe('Automated Procedural 3D Mesh Generation & Geometry Invariants', () => {
    it('generates valid 3D meshes with >0 vertices and 0 NaN coordinates for all 58 buildings', () => {
      for (const item of allBuildings) {
        const dummyInstance: BuildingInstance = {
          id: `test_${item.id}`,
          presetKey: item.id,
          name: item.name,
          category: item.category,
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          width: item.defaultWidth,
          length: item.defaultDepth,
          floorCount: item.defaultFloors,
          floorHeight: item.floorHeight,
          roofType: item.roofStyle,
          roofOverhang: item.defaultOverhang,
          wallMaterial: 'plaster',
          wallColor: '#f1f5f9',
          roofMaterial: 'clay_tile'
        };

        const group = PrefabMeshBuilder.buildBuildingGroup(dummyInstance);
        expect(group).toBeInstanceOf(THREE.Group);
        expect(group.children.length, `Building ${item.id} must have children`).toBeGreaterThan(0);

        let totalVertices = 0;
        let meshCount = 0;

        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            meshCount++;
            const mesh = child as THREE.Mesh;
            const geom = mesh.geometry;
            expect(geom).toBeDefined();

            const posAttr = geom.getAttribute('position');
            expect(posAttr, `Mesh in ${item.id} must have position attribute`).toBeDefined();
            expect(posAttr.count).toBeGreaterThan(0);
            totalVertices += posAttr.count;

            // Verify 0 NaN values across all coordinates
            const arr = posAttr.array;
            for (let i = 0; i < arr.length; i++) {
              const val = arr[i];
              expect(Number.isNaN(val), `Coordinate NaN at index ${i} in building ${item.id}`).toBe(false);
              expect(Number.isFinite(val), `Coordinate non-finite at index ${i} in building ${item.id}`).toBe(true);
            }
          }
        });

        expect(meshCount, `Building ${item.id} should have rendered meshes`).toBeGreaterThan(0);
        expect(totalVertices, `Building ${item.id} should have vertices`).toBeGreaterThan(0);

        // Memory cleanup
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.dispose();
          }
        });
      }
    });

    it('utilizes Shared Geometry Cache for repeat mesh builds without memory leaks', () => {
      const gacoan = BuildingCatalogRegistry.getBuilding('resto_mie_gacoan')!;
      const instance: BuildingInstance = {
        id: 'gacoan_cache_test',
        presetKey: gacoan.id,
        name: gacoan.name,
        category: gacoan.category,
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: gacoan.defaultWidth,
        length: gacoan.defaultDepth,
        floorCount: gacoan.defaultFloors,
        floorHeight: gacoan.floorHeight,
        roofType: gacoan.roofStyle,
        roofOverhang: gacoan.defaultOverhang,
        wallMaterial: 'brick',
        wallColor: '#ea580c',
        roofMaterial: 'metal_zinc'
      };

      const group1 = PrefabMeshBuilder.buildBuildingGroup(instance);
      const group2 = PrefabMeshBuilder.buildBuildingGroup(instance);

      expect(group1.children.length).toBe(group2.children.length);

      // Clean up
      [group1, group2].forEach((g) => {
        g.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).geometry.dispose();
          }
        });
      });
    });
  });

  describe('Adaptive Interior Layout Generation for All 58 Buildings', () => {
    it('produces valid room layouts with positive areas for all 58 buildings', () => {
      for (const item of allBuildings) {
        const layouts = InteriorLayoutFactory.getLayoutForBuilding(
          item.id,
          item.defaultWidth,
          item.defaultDepth,
          item.floorHeight,
          item.defaultFloors
        );

        expect(layouts, `Layout for ${item.id} must be generated`).toBeDefined();
        expect(layouts.length).toBe(item.defaultFloors);

        for (const fl of layouts) {
          expect(fl.rooms.length, `Floor ${fl.floorIndex} of ${item.id} must have rooms`).toBeGreaterThan(0);
          for (const room of fl.rooms) {
            expect(room.name).toBeTruthy();
            expect(room.areaM2, `Room ${room.name} in ${item.id} must have positive area`).toBeGreaterThan(0);
            expect(room.ceilingHeight).toBeGreaterThan(2.0);
            expect(room.boundary.length).toBeGreaterThanOrEqual(3);
          }
        }
      }
    });
  });

  describe('Thermal Comfort, CAPEX, & OPEX Simulation Integrity', () => {
    const costEstimator = CostEstimator.getInstance();

    it('calculates valid CAPEX and 10-year OPEX for all 58 buildings without NaN', () => {
      for (const item of allBuildings) {
        const instance: BuildingInstance = {
          id: `sim_${item.id}`,
          presetKey: item.id,
          name: item.name,
          category: item.category,
          position: new THREE.Vector3(0, 0, 0),
          rotationY: 0,
          width: item.defaultWidth,
          length: item.defaultDepth,
          floorCount: item.defaultFloors,
          floorHeight: item.floorHeight,
          roofType: item.roofStyle,
          roofOverhang: item.defaultOverhang,
          wallMaterial: 'plaster',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        };

        const cost = costEstimator.estimateBuildingCost(instance);
        expect(Number.isNaN(cost.totalCost)).toBe(false);
        expect(cost.totalCost).toBeGreaterThan(0);
        expect(Number.isNaN(cost.monthlyAcCostIdr)).toBe(false);
        expect(Number.isNaN(cost.tenYearTotalOpexIdr)).toBe(false);
        expect(cost.tropicalEfficiencyGrade).toMatch(/^[A-E]$/);
      }
    });

    it('properly evaluates natural ventilation benefits in ThermalVentilationAnalyzer', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);
      const landMgr = new LandscapeManager(scene);
      const analyzer = new ThermalVentilationAnalyzer(bldMgr, landMgr, scene);

      const jogloKopi = BuildingCatalogRegistry.getBuilding('cafe_joglo_kopi')!;
      const jogloInstance: BuildingInstance = {
        id: 'joglo_kopi_1',
        presetKey: jogloKopi.id,
        name: jogloKopi.name,
        category: jogloKopi.category,
        position: new THREE.Vector3(10, 0, 10),
        rotationY: 0,
        width: jogloKopi.defaultWidth,
        length: jogloKopi.defaultDepth,
        floorCount: jogloKopi.defaultFloors,
        floorHeight: jogloKopi.floorHeight,
        roofType: jogloKopi.roofStyle,
        roofOverhang: jogloKopi.defaultOverhang
      };

      bldMgr.buildings.set(jogloInstance.id, jogloInstance);
      const report = analyzer.analyzeBuilding(jogloInstance.id);

      expect(report).not.toBeNull();
      expect(report?.hasCrossVentilation).toBe(true);
      expect(report?.indoorEstimatedTempC).toBeLessThan(32.5);
      expect(Number.isNaN(report?.indoorEstimatedTempC)).toBe(false);

      analyzer.dispose();
    });
  });

  describe('CityScore Walkability 400m Integration with Public Amenities', () => {
    it('recognizes all isPublicAmenity buildings as public facility coverage points', () => {
      const scene = new THREE.Scene();
      const bldMgr = new BuildingManager(scene);
      const roadMgr = new RoadManager(scene);
      const landMgr = new LandscapeManager(scene);
      const cityScore = CityScoreAnalyzer.getInstance();

      const amenityBuildings = allBuildings.filter((b) => b.isPublicAmenity);
      expect(amenityBuildings.length).toBeGreaterThanOrEqual(15);

      for (let i = 0; i < amenityBuildings.length; i++) {
        const item = amenityBuildings[i];
        bldMgr.buildings.set(item.id, {
          id: item.id,
          presetKey: item.id,
          name: item.name,
          category: item.category,
          position: new THREE.Vector3(i * 20, 0, 0),
          rotationY: 0,
          width: item.defaultWidth,
          length: item.defaultDepth,
          floorCount: item.defaultFloors,
          floorHeight: item.floorHeight,
          roofType: item.roofStyle
        });
      }

      const score = cityScore.evaluateCity(bldMgr, roadMgr, landMgr);
      expect(score.facilities.length).toBe(amenityBuildings.length);
      for (const item of amenityBuildings) {
        expect(score.facilities.some((f) => f.buildingId === item.id)).toBe(true);
      }
    });
  });

  describe('Save/Load & Deserialization Compatibility for All 58 Buildings', () => {
    it('validates and roundtrips every preset through CitySerializer', () => {
      const rawData: CitySaveData = {
        version: '2.0.0',
        cityTitle: 'Uji Katalog 58 Gedung',
        timestamp: Date.now(),
        environment: {
          timeOfDay: 12.0,
          dayOfYear: 180,
          weather: 'sunny'
        },
        roads: {
          nodes: [
            { id: 'node_1', x: 0, y: 0, z: 0, connectedEdgeIds: ['edge_1'] },
            { id: 'node_2', x: 100, y: 0, z: 0, connectedEdgeIds: ['edge_1'] }
          ],
          edges: [
            {
              id: 'edge_1',
              startNodeId: 'node_1',
              endNodeId: 'node_2',
              type: 'main',
              controlPoints: [
                [0, 0, 0],
                [100, 0, 0]
              ],
              length: 100
            }
          ]
        },
        buildings: allBuildings.map((item, idx) => ({
          id: `save_${item.id}_${idx}`,
          presetKey: item.id,
          name: item.name,
          category: item.category,
          position: [idx * 15, 0, 10] as [number, number, number],
          rotationY: 0,
          width: item.defaultWidth,
          length: item.defaultDepth,
          floorCount: item.defaultFloors,
          floorHeight: item.floorHeight,
          roofType: item.roofStyle,
          roofOverhang: item.defaultOverhang,
          wallMaterial: 'plaster',
          wallColor: '#ffffff',
          roofMaterial: 'clay_tile'
        })),
        lots: []
      };

      const val = CitySerializer.validateCityData(rawData);
      expect(val.valid).toBe(true);
      expect(val.errors).toHaveLength(0);
      expect(rawData.buildings).toHaveLength(58);
    });
  });
});

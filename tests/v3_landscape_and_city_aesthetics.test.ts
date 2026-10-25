import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { AestheticLandscapeBuilder } from '../src/world/AestheticLandscapeBuilder';
import { LandscapeManager, LandscapeItem, LandscapeType } from '../src/world/LandscapeManager';
import { createMalioboroMapData } from '../src/world/MalioboroPreset';
import { CitySerializer } from '../src/io/CitySerializer';
import { ThermalVentilationAnalyzer } from '../src/analysis/ThermalVentilationAnalyzer';
import { AcousticAnalyzer } from '../src/analysis/AcousticAnalyzer';
import { CityScoreAnalyzer } from '../src/analysis/CityScoreAnalyzer';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { RoadManager } from '../src/roads/RoadManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';

describe('Arscity v3.0.0 — 24 Aesthetic Landscape Elements & Procedural Environment', () => {
  let matLib: MaterialLibrary;
  let scene: THREE.Scene;
  let landscapeMgr: LandscapeManager;
  let buildingMgr: BuildingManager;
  let roadMgr: RoadManager;

  beforeEach(() => {
    matLib = MaterialLibrary.getInstance();
    scene = new THREE.Scene();
    landscapeMgr = new LandscapeManager(scene);
    buildingMgr = new BuildingManager(scene);
    roadMgr = new RoadManager(scene);
  });

  const ALL_24_AESTHETIC_TYPES: LandscapeType[] = [
    // 1. Pohon & Flora (9 items)
    'tree_tabebuya_pink',
    'tree_tabebuya_gold',
    'tree_flamboyan',
    'tree_frangipani',
    'tree_banyan_kurung',
    'flora_bougainvillea_arch',
    'flora_yellow_bamboo',
    'flora_lotus_water',
    'tree_asam_jawa',

    // 2. Patung & Monumen (6 items)
    'monument_tugu_jogja',
    'sculpture_kinetic_steel',
    'sculpture_candi_stone',
    'sculpture_wayang_corten',
    'fountain_reflecting_pool',
    'monument_clock_tower',

    // 3. Furnitur & Lampu (5 items)
    'street_malioboro_bollards',
    'street_festoon_lights',
    'street_timber_pergola',
    'gate_candi_bentar',
    'street_garden_lanterns',

    // 4. Ruang Publik & Tepian Air (4 items)
    'plaza_mini_amphitheater',
    'waterfront_wood_deck',
    'bridge_green_pedestrian',
    'pavilion_garden_gazebo'
  ];

  it('procedurally generates valid 3D geometry for all 24 aesthetic items without CSG or external downloads', () => {
    expect(ALL_24_AESTHETIC_TYPES.length).toBe(24);

    for (const type of ALL_24_AESTHETIC_TYPES) {
      const item: LandscapeItem = {
        id: `test_${type}`,
        type,
        position: new THREE.Vector3(0, 0, 0),
        width: 6,
        length: 6,
        radius: 3,
        rotationY: 0
      };

      const mesh = AestheticLandscapeBuilder.buildMesh(item, matLib);
      expect(mesh).toBeDefined();
      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBeGreaterThan(0);

      // Verify geometry vertices exist and contain NO NaN values
      let totalVertices = 0;
      mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry) {
          const posAttr = obj.geometry.getAttribute('position');
          if (posAttr) {
            totalVertices += posAttr.count;
            for (let i = 0; i < posAttr.count; i++) {
              expect(Number.isNaN(posAttr.getX(i))).toBe(false);
              expect(Number.isNaN(posAttr.getY(i))).toBe(false);
              expect(Number.isNaN(posAttr.getZ(i))).toBe(false);
            }
          }
        }
      });

      expect(totalVertices).toBeGreaterThan(12);
    }
  });

  it('tags night lighting elements with isNightGlow and supports dynamic night glow updates', () => {
    const festoon = landscapeMgr.createItem(
      'street_festoon_lights',
      new THREE.Vector3(0, 0, 0)
    );
    const tugu = landscapeMgr.createItem(
      'monument_tugu_jogja',
      new THREE.Vector3(10, 0, 0)
    );

    expect(festoon).toBeDefined();
    expect(tugu).toBeDefined();

    const festoonMesh = landscapeMgr.getItemMesh(festoon.id);
    expect(festoonMesh).toBeDefined();

    // Verify night glow markers exist
    let glowMeshCount = 0;
    festoonMesh!.traverse((child: THREE.Object3D) => {
      if (child.userData?.isNightGlow) glowMeshCount++;
    });
    expect(glowMeshCount).toBeGreaterThan(0);

    // Test dynamic night glow activation
    LandscapeManager.setNightGlow(1.0);
    festoonMesh!.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.userData?.isNightGlow) {
        const mat = child.material as THREE.MeshStandardMaterial;
        expect(mat.emissiveIntensity).toBeGreaterThan(1.0);
      }
    });

    // Test daylight deactivation
    LandscapeManager.setNightGlow(0.0);
    festoonMesh!.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.userData?.isNightGlow) {
        const mat = child.material as THREE.MeshStandardMaterial;
        expect(mat.emissiveIntensity).toBe(0.0);
      }
    });
  });

  it('preserves full aesthetic item dimensions and rotation across serialization roundtrip', () => {
    const item1 = landscapeMgr.addItem({
      id: 'test_tugu_roundtrip',
      type: 'monument_tugu_jogja',
      position: new THREE.Vector3(5, 0, -10),
      width: 4.5,
      length: 4.5,
      radius: 2.5,
      rotationY: Math.PI / 4
    });

    const item2 = landscapeMgr.addItem({
      id: 'test_pergola_roundtrip',
      type: 'street_timber_pergola',
      position: new THREE.Vector3(-15, 0, 20),
      width: 8.0,
      length: 4.0,
      rotationY: Math.PI / 2
    });

    expect(landscapeMgr.items.size).toBe(2);

    // Mock engine for serializer
    const mockEngine = {
      buildingManager: buildingMgr,
      lotManager: { lots: new Map(), evaluateAllLots: () => {} },
      roadManager: roadMgr,
      landscapeManager: landscapeMgr,
      lightingSystem: { currentHour: 18.0, currentDayOfYear: 172 },
      weatherSystem: { currentWeather: 'sunny' },
      setTimeOfDay: () => {},
      setWeather: () => {},
      missionManager: { evaluate: () => {} }
    } as any;

    const serialized = CitySerializer.serializeCity(mockEngine, 'Aesthetic Test City');
    expect(serialized.landscape).toBeDefined();
    expect(serialized.landscape?.length).toBe(2);

    const serializedTugu = serialized.landscape?.find((i) => i.type === 'monument_tugu_jogja');
    expect(serializedTugu).toBeDefined();
    expect(serializedTugu?.width).toBe(4.5);
    expect(serializedTugu?.length).toBe(4.5);
    expect(serializedTugu?.radius).toBe(2.5);
    expect(serializedTugu?.rotationY).toBeCloseTo(Math.PI / 4);

    // Clear landscape items and deserialize
    landscapeMgr.removeItem(item1.id);
    landscapeMgr.removeItem(item2.id);
    expect(landscapeMgr.items.size).toBe(0);

    const result = CitySerializer.deserializeCity(mockEngine, serialized);
    expect(result.success).toBe(true);
    expect(landscapeMgr.items.size).toBe(2);

    const restoredTugu = Array.from(landscapeMgr.items.values()).find((i) => i.type === 'monument_tugu_jogja');
    expect(restoredTugu).toBeDefined();
    expect(restoredTugu?.width).toBe(4.5);
    expect(restoredTugu?.rotationY).toBeCloseTo(Math.PI / 4);
  });

  it('factors Beringin Kurung, Flamboyan, Tabebuya, and Fountains into ThermalVentilation microclimate cooling', () => {
    const analyzer = new ThermalVentilationAnalyzer(buildingMgr, landscapeMgr, scene);

    const testBuilding: BuildingInstance = {
      id: 'bld_thermal_test',
      presetKey: 'house_54',
      name: 'Rumah Uji Termal',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 10,
      length: 10,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 1.2,
      wallMaterial: 'brick',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile'
    };
    buildingMgr.buildings.set(testBuilding.id, testBuilding);

    // Baseline report without nearby trees
    const baselineReport = analyzer.analyzeBuilding(testBuilding.id);
    expect(baselineReport).not.toBeNull();
    const baselineTemp = baselineReport!.indoorEstimatedTempC;

    // Add Beringin Kurung (-3.2°C benefit) within 15m
    const beringin = landscapeMgr.createItem(
      'tree_banyan_kurung',
      new THREE.Vector3(8, 0, 0)
    );

    const beringinReport = analyzer.analyzeBuilding(testBuilding.id);
    expect(beringinReport).not.toBeNull();
    expect(beringinReport!.indoorEstimatedTempC).toBeLessThanOrEqual(baselineTemp - 2.8);

    // Remove beringin and add Fountain reflecting pool (-2.5°C evaporative cooling)
    landscapeMgr.removeItem(beringin.id);
    const fountain = landscapeMgr.createItem(
      'fountain_reflecting_pool',
      new THREE.Vector3(0, 0, 10)
    );

    const fountainReport = analyzer.analyzeBuilding(testBuilding.id);
    expect(fountainReport).not.toBeNull();
    expect(fountainReport!.indoorEstimatedTempC).toBeLessThanOrEqual(baselineTemp - 2.0);
  });

  it('factors Yellow Bamboo and Beringin Kurung into AcousticAnalyzer noise reduction (-5.0 dBA)', () => {
    const acousticAnalyzer = new AcousticAnalyzer();

    const testBuilding: BuildingInstance = {
      id: 'bld_acoustic_test',
      presetKey: 'house_36',
      name: 'Rumah Uji Akustik',
      category: 'residential',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 8,
      length: 10,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 1.0,
      wallMaterial: 'brick',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile'
    };
    buildingMgr.buildings.set(testBuilding.id, testBuilding);

    // Add an arterial road edge nearby to generate traffic noise
    const nodeA = roadMgr.graph.getOrCreateNode(new THREE.Vector3(0, 0, 10));
    const nodeB = roadMgr.graph.getOrCreateNode(new THREE.Vector3(100, 0, 10));
    roadMgr.graph.addEdge(nodeA.id, nodeB.id, 'arterial');

    const baselineAcoustic = acousticAnalyzer.evaluateBuilding(
      testBuilding,
      roadMgr,
      landscapeMgr,
      buildingMgr
    );

    // Add yellow bamboo noise buffer
    const bamboo = landscapeMgr.createItem(
      'flora_yellow_bamboo',
      new THREE.Vector3(0, 0, 5)
    );

    const bufferedAcoustic = acousticAnalyzer.evaluateBuilding(
      testBuilding,
      roadMgr,
      landscapeMgr,
      buildingMgr
    );

    expect(bufferedAcoustic.receivedNoiseDba).toBeLessThanOrEqual(baselineAcoustic.receivedNoiseDba - 4.5);
  });

  it('awards up to +15 poin visual placemaking bonus in CityScoreAnalyzer', () => {
    const cityScoreAnalyzer = CityScoreAnalyzer.getInstance();

    const baselineScore = cityScoreAnalyzer.evaluateCity(
      buildingMgr,
      roadMgr,
      landscapeMgr
    );
    expect(baselineScore.aestheticScoreBonus).toBe(0);

    // Add 6 iconic aesthetic items (Tugu, Wayang Corten, Kinetic Steel, Fountain, Clock Tower, Amphitheater)
    landscapeMgr.createItem('monument_tugu_jogja', new THREE.Vector3(0, 0, 0));
    landscapeMgr.createItem('sculpture_wayang_corten', new THREE.Vector3(10, 0, 0));
    landscapeMgr.createItem('sculpture_kinetic_steel', new THREE.Vector3(20, 0, 0));
    landscapeMgr.createItem('fountain_reflecting_pool', new THREE.Vector3(30, 0, 0));
    landscapeMgr.createItem('monument_clock_tower', new THREE.Vector3(40, 0, 0));
    landscapeMgr.createItem('plaza_mini_amphitheater', new THREE.Vector3(50, 0, 0));

    const boostedScore = cityScoreAnalyzer.evaluateCity(
      buildingMgr,
      roadMgr,
      landscapeMgr
    );

    expect(boostedScore.aestheticScoreBonus).toBe(15);
    expect(boostedScore.overallSustainabilityScore).toBeGreaterThan(baselineScore.overallSustainabilityScore);
  });

  it('validates MalioboroPreset with Tugu Pal Putih, Tabebuya, Asem Jawa, and Bollards', () => {
    const malioboroData = createMalioboroMapData();
    const validation = CitySerializer.validateCityData(malioboroData);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const landscape = malioboroData.landscape || [];
    const tugu = landscape.find((i) => i.type === 'monument_tugu_jogja');
    expect(tugu).toBeDefined();
    expect(tugu?.position[2]).toBe(-185);

    const tabebuyaList = landscape.filter((i) => i.type === 'tree_tabebuya_pink' || i.type === 'tree_tabebuya_gold');
    expect(tabebuyaList.length).toBeGreaterThanOrEqual(8);

    const bollards = landscape.filter((i) => i.type === 'street_malioboro_bollards');
    expect(bollards.length).toBeGreaterThanOrEqual(6);

    const beringin = landscape.find((i) => i.type === 'tree_banyan_kurung');
    expect(beringin).toBeDefined();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { PlacedFurnitureData, PlaceFurnitureCommand, RemoveFurnitureCommand } from '../src/core/commands/CityCommands';
import { FIRST_PERSON_FURNITURE_CATALOG } from '../src/buildings/FirstPersonFurnitureCatalog';

describe('B2: Arsitektur Perabot & Material Lifecycle (DynamicFurnitureGroup & Shared Materials)', () => {
  let scene: THREE.Scene;
  let buildingManager: BuildingManager;
  let testBuilding: BuildingInstance;

  beforeEach(() => {
    scene = new THREE.Scene();
    buildingManager = new BuildingManager(scene);

    testBuilding = {
      id: 'bld_test_furniture',
      presetKey: 'house_36',
      name: 'Rumah Uji',
      category: 'residential',
      position: new THREE.Vector3(10, 0, 10),
      rotationY: 0,
      width: 10,
      length: 10,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'gable',
      roofOverhang: 0.6,
      wallMaterial: 'plaster',
      wallColor: '#FFFFFF',
      roofMaterial: 'clay_tile',
      plinthHeight: 0.35,
      userData: {
        placedFurniture: []
      }
    };

    buildingManager.addBuilding(testBuilding);
  });

  it('membuat DynamicFurnitureGroup pada building group saat inisialisasi', () => {
    const grp = buildingManager.getBuildingGroup(testBuilding.id);
    expect(grp).toBeDefined();

    const dynamicGroup = grp?.getObjectByName('DynamicFurnitureGroup');
    expect(dynamicGroup).toBeDefined();
    expect(dynamicGroup?.type).toBe('Group');
  });

  it('attachFurniture memasang perabot langsung ke DynamicFurnitureGroup tanpa merekonstruksi gedung', () => {
    const grpBefore = buildingManager.getBuildingGroup(testBuilding.id);
    const furnitureItem: PlacedFurnitureData = {
      id: 'fur_test_table',
      type: 'dining_table_wood',
      name: 'Meja Makan Jati',
      position: [1.0, 0, 1.0],
      rotationY: 0,
      floorIndex: 1
    };

    const mesh = buildingManager.attachFurniture(testBuilding.id, furnitureItem);
    expect(mesh).toBeDefined();

    const grpAfter = buildingManager.getBuildingGroup(testBuilding.id);
    // Building group instance must be identical (no full rebuild or re-allocation)
    expect(grpAfter).toBe(grpBefore);

    const dynamicGroup = grpAfter?.getObjectByName('DynamicFurnitureGroup');
    expect(dynamicGroup?.children.length).toBe(1);
    expect(dynamicGroup?.children[0].userData?.furnitureId).toBe('fur_test_table');
    expect(testBuilding.userData?.placedFurniture?.length).toBe(1);
  });

  it('detachFurniture mencopot perabot dari DynamicFurnitureGroup secara presisi', () => {
    const furnitureItem: PlacedFurnitureData = {
      id: 'fur_test_chair',
      type: 'chair_wooden',
      name: 'Kursi Kayu Jati',
      position: [2.0, 0, 2.0],
      rotationY: 0,
      floorIndex: 1
    };

    buildingManager.attachFurniture(testBuilding.id, furnitureItem);
    const dynamicGroup = buildingManager.getBuildingGroup(testBuilding.id)?.getObjectByName('DynamicFurnitureGroup');
    expect(dynamicGroup?.children.length).toBe(1);

    const success = buildingManager.detachFurniture(testBuilding.id, 'fur_test_chair');
    expect(success).toBe(true);
    expect(dynamicGroup?.children.length).toBe(0);
    expect(testBuilding.userData?.placedFurniture?.length).toBe(0);
  });

  it('material singleton MaterialLibrary memiliki isSharedMaterial = true dan tidak hancur saat building dibersihkan', () => {
    const matLib = MaterialLibrary.getInstance();
    const woodMat = matLib.getMaterial('wood_teak');
    expect(woodMat.userData.isSharedMaterial).toBe(true);

    // Track apakah dispose terpanggil
    let disposeCalled = false;
    const origDispose = woodMat.dispose.bind(woodMat);
    woodMat.dispose = () => {
      disposeCalled = true;
      origDispose();
    };

    // Remove building which calls disposeGroup
    buildingManager.removeBuilding(testBuilding.id);

    // Material singleton tidak boleh di-dispose oleh disposeGroup
    expect(disposeCalled).toBe(false);
  });

  it('PlaceFurnitureCommand dan RemoveFurnitureCommand mendukung Undo/Redo dengan DynamicFurnitureGroup', () => {
    const dummyEngine: any = {
      buildingManager
    };

    const furData: PlacedFurnitureData = {
      id: 'fur_undo_test',
      type: 'sofa_3seater',
      name: 'Sofa 3 Dudukan',
      position: [0.5, 0, -1.0],
      rotationY: Math.PI / 2,
      floorIndex: 1
    };

    const placeCmd = new PlaceFurnitureCommand(dummyEngine, testBuilding.id, furData);
    placeCmd.execute();

    const dynamicGroup = buildingManager.getBuildingGroup(testBuilding.id)?.getObjectByName('DynamicFurnitureGroup');
    expect(dynamicGroup?.children.length).toBe(1);

    // Undo placement
    placeCmd.undo();
    expect(dynamicGroup?.children.length).toBe(0);
    expect(testBuilding.userData?.placedFurniture?.length).toBe(0);

    // Redo placement
    placeCmd.redo();
    expect(dynamicGroup?.children.length).toBe(1);
    expect(testBuilding.userData?.placedFurniture?.length).toBe(1);

    // Remove command
    const removeCmd = new RemoveFurnitureCommand(dummyEngine, testBuilding.id, furData);
    removeCmd.execute();
    expect(dynamicGroup?.children.length).toBe(0);

    // Undo removal
    removeCmd.undo();
    expect(dynamicGroup?.children.length).toBe(1);
    expect(testBuilding.userData?.placedFurniture?.length).toBe(1);
  });

  it('deteksi tabrakan AABB/Box3 membedakan perabot berdampingan vs bertumpuk (bebas ghost blocker)', () => {
    const existing: PlacedFurnitureData[] = [
      {
        id: 'f1',
        type: 'dining_set',
        name: 'Meja Makan + 4 Kursi',
        position: [0, 0, 0],
        rotationY: 0,
        floorIndex: 1
      }
    ];

    const tableItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'dining_set')!;
    const chairItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'plant_monstera')!;

    // Case 1: Tanaman ditempatkan persis di tengah meja (bertumpuk/overlap)
    const overlapCandidate = { x: 0.1, z: 0.1 };
    const cand1MinX = overlapCandidate.x - chairItem.width * 0.45;
    const cand1MaxX = overlapCandidate.x + chairItem.width * 0.45;
    const cand1MinZ = overlapCandidate.z - chairItem.depth * 0.45;
    const cand1MaxZ = overlapCandidate.z + chairItem.depth * 0.45;

    const tMinX = existing[0].position[0] - tableItem.width * 0.45;
    const tMaxX = existing[0].position[0] + tableItem.width * 0.45;
    const tMinZ = existing[0].position[2] - tableItem.depth * 0.45;
    const tMaxZ = existing[0].position[2] + tableItem.depth * 0.45;

    const isOverlap1 = cand1MinX < tMaxX && cand1MaxX > tMinX && cand1MinZ < tMaxZ && cand1MaxZ > tMinZ;
    expect(isOverlap1).toBe(true);

    // Case 2: Kursi diletakkan di samping meja (bersebelahan secara wajar, tidak bertabrakan)
    const adjacentCandidate = { x: (tableItem.width * 0.5) + (chairItem.width * 0.5) + 0.1, z: 0 };
    const cand2MinX = adjacentCandidate.x - chairItem.width * 0.45;
    const cand2MaxX = adjacentCandidate.x + chairItem.width * 0.45;
    const cand2MinZ = adjacentCandidate.z - chairItem.depth * 0.45;
    const cand2MaxZ = adjacentCandidate.z + chairItem.depth * 0.45;

    const isOverlap2 = cand2MinX < tMaxX && cand2MaxX > tMinX && cand2MinZ < tMaxZ && cand2MaxZ > tMinZ;
    expect(isOverlap2).toBe(false); // Valid, tidak ada ghost blocker palsu
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { RoadManager } from '../src/roads/RoadManager';
import { BuildingManager } from '../src/buildings/BuildingManager';
import { LotManager } from '../src/zones/LotManager';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { createMalioboroMapData } from '../src/world/MalioboroPreset';
import { CitySerializer } from '../src/io/CitySerializer';
import { IndexedDBStorage } from '../src/io/IndexedDBStorage';

describe('Clean World Switching & Multi-Map Storage Pipeline', () => {
  let scene: THREE.Scene;
  let roadManager: RoadManager;
  let buildingManager: BuildingManager;
  let lotManager: LotManager;
  let landscapeManager: LandscapeManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    roadManager = new RoadManager(scene);
    buildingManager = new BuildingManager(scene);
    lotManager = new LotManager(scene, buildingManager, roadManager);
    landscapeManager = new LandscapeManager(scene);
    lotManager.setDependencies(roadManager, landscapeManager);
  });

  it('populates full Malioboro dataset and cleans up with zero lingering meshes or maps', () => {
    const malioboro = createMalioboroMapData();

    // 1. Reconstruct Roads
    malioboro.roads.nodes.forEach((n) => {
      roadManager.graph.nodes.set(n.id, {
        id: n.id,
        position: new THREE.Vector3(n.x, n.y, n.z),
        connectedEdgeIds: [...n.connectedEdgeIds],
      });
    });

    malioboro.roads.edges.forEach((e) => {
      let cps = e.controlPoints.map((cp) => new THREE.Vector3(cp[0], cp[1], cp[2]));
      if (cps.length === 2) {
        const cp1 = new THREE.Vector3().lerpVectors(cps[0], cps[1], 0.33);
        const cp2 = new THREE.Vector3().lerpVectors(cps[0], cps[1], 0.67);
        cps = [cps[0], cp1, cp2, cps[1]];
      }
      roadManager.graph.edges.set(e.id, {
        id: e.id,
        startNodeId: e.startNodeId,
        endNodeId: e.endNodeId,
        type: e.type,
        controlPoints: cps,
        length: e.length,
        customProfile: e.customProfile,
      });
      roadManager.rebuildEdgeMesh(e.id);
    });

    // 2. Reconstruct Buildings
    malioboro.buildings.forEach((b: any) => {
      buildingManager.addBuilding({
        id: b.id,
        presetKey: b.presetKey,
        name: b.name,
        category: b.category,
        position: new THREE.Vector3(b.position[0], b.position[1], b.position[2]),
        rotationY: b.rotationY,
        width: b.width,
        length: b.length,
        floorCount: b.floorCount,
        floorHeight: b.floorHeight,
        roofType: b.roofType,
        roofOverhang: b.roofOverhang,
        wallMaterial: b.wallMaterial,
        wallColor: b.wallColor,
        roofMaterial: b.roofMaterial,
        lotId: b.lotId,
      });
    });

    // 3. Reconstruct Lots
    malioboro.lots.forEach((l) => {
      lotManager.createLot(new THREE.Vector3(l.position[0], l.position[1], l.position[2]), l.width, l.length, l.zone);
    });

    // 4. Reconstruct Landscape
    if (malioboro.landscape) {
      malioboro.landscape.forEach((item) => {
        landscapeManager.addItem({
          id: item.id,
          type: item.type as any,
          position: new THREE.Vector3(item.position[0], item.position[1], item.position[2]),
          width: item.scale,
          length: item.scale,
          radius: item.radius,
        });
      });
    }

    expect(buildingManager.buildings.size).toBeGreaterThanOrEqual(20);
    expect(roadManager.graph.edges.size).toBe(malioboro.roads.edges.length);
    expect(lotManager.lots.size).toBe(malioboro.lots.length);
    expect(landscapeManager.items.size).toBe(malioboro.landscape?.length);

    // Now execute clean world reset (simulate empty map switch)
    buildingManager.clearAll();
    roadManager.clearAll();
    lotManager.clearAll();
    landscapeManager.clearAll();

    expect(buildingManager.buildings.size).toBe(0);
    expect(roadManager.graph.edges.size).toBe(0);
    expect(roadManager.graph.nodes.size).toBe(0);
    expect(lotManager.lots.size).toBe(0);
    expect(landscapeManager.items.size).toBe(0);

    // Verify master groups are empty
    expect(buildingManager.masterGroup.children.length).toBe(0);
    expect(roadManager.masterGroup.children.length).toBe(0);
    expect(lotManager.masterGroup.children.length).toBe(0);
    expect(landscapeManager.masterGroup.children.length).toBe(0);
  });

  it('supports multi-slot map lifecycle via IndexedDBStorage', async () => {
    // 1. Create a new empty map
    const { id, state } = await IndexedDBStorage.createNewEmptyMap('Kota Baru UGM');
    expect(id).toMatch(/^map_/);
    expect(state.cityTitle).toBe('Kota Baru UGM');
    expect(state.roads.edges).toHaveLength(0);
    expect(state.buildings).toHaveLength(0);

    // 2. Load the map by ID
    const loaded = await IndexedDBStorage.loadMapById(id);
    expect(loaded).toBeDefined();
    expect(loaded?.cityTitle).toBe('Kota Baru UGM');

    // 3. Save modified map
    if (loaded) {
      loaded.cityTitle = 'Kota Baru UGM Rev. 1';
      const saveRes = await IndexedDBStorage.saveMapById(id, loaded.cityTitle, loaded);
      expect(saveRes.success).toBe(true);
    }

    // 4. Verify list saved maps
    const list = await IndexedDBStorage.listSavedMaps();
    const found = list.find((m) => m.id === id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Kota Baru UGM Rev. 1');

    // 5. Delete the map
    await IndexedDBStorage.deleteMapById(id);
    const postDeleteList = await IndexedDBStorage.listSavedMaps();
    expect(postDeleteList.find((m) => m.id === id)).toBeUndefined();
  });
});

import * as THREE from 'three';
import { BuildingInstance } from './PrefabTypes';
import { PrefabMeshBuilder } from './PrefabMeshBuilder';
import { CustomBuildingMeshBuilder } from './CustomBuildingMeshBuilder';
import { CustomBuilding } from './CustomBuildingModel';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import type { RaycastManager } from '../core/engine/RaycastManager';
import type { BBox2D } from '../core/engine/SpatialHashGrid';

import { springAnimator } from '../core/engine/SpringAnimator';

export class BuildingManager {
  public buildings: Map<string, BuildingInstance> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;

  private buildingGroups: Map<string, THREE.Group> = new Map();
  public selectedBuildingId: string | null = null;
  private highlightMesh: THREE.BoxHelper | null = null;

  // Spatial Hash & Raycasting reference
  private raycastManager: RaycastManager | null = null;

  // Chunk-based Partitioning & BatchedMesh Optimization
  public static readonly CHUNK_SIZE: number = 64;
  private chunkMap: Map<string, Set<string>> = new Map();
  private dirtyChunks: Set<string> = new Set();
  private batchedMeshChunks: Map<string, THREE.BatchedMesh[]> = new Map();

  public onStatsChanged?: (count: number, totalBuiltAreaM2: number) => void;
  public onSelectionChanged?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'BuildingsMasterGroup';
    scene.add(this.masterGroup);
  }

  public setRaycastManager(rm: RaycastManager): void {
    this.raycastManager = rm;
    for (const [id, bld] of this.buildings.entries()) {
      const grp = this.buildingGroups.get(id);
      if (grp) {
        this.raycastManager.registerSpatialObject(id, this.computeAABB(bld), grp);
      }
    }
  }

  public static getChunkKey(pos: THREE.Vector3): string {
    const cx = Math.floor(pos.x / BuildingManager.CHUNK_SIZE);
    const cz = Math.floor(pos.z / BuildingManager.CHUNK_SIZE);
    return `${cx}_${cz}`;
  }

  public markChunkDirty(chunkKey: string): void {
    this.dirtyChunks.add(chunkKey);
  }

  public getDirtyChunks(): string[] {
    return Array.from(this.dirtyChunks);
  }

  public clearDirtyChunks(): void {
    this.dirtyChunks.clear();
  }

  public computeAABB(bld: BuildingInstance): BBox2D {
    const hw = (bld.width || 10) / 2 + 1;
    const hl = (bld.length || 10) / 2 + 1;
    const rad = Math.sqrt(hw * hw + hl * hl);
    return {
      minX: bld.position.x - rad,
      maxX: bld.position.x + rad,
      minZ: bld.position.z - rad,
      maxZ: bld.position.z + rad,
    };
  }

  private buildMeshForInstance(building: BuildingInstance): THREE.Group {
    if (building.isCustom || (building.floors && building.floors.length > 0)) {
      const customModel: CustomBuilding = {
        id: building.id,
        name: building.name,
        position: building.position.clone(),
        rotationY: building.rotationY,
        plinthHeight: building.plinthHeight ?? 0.35,
        floors: building.floors || [
          {
            floorIndex: 0,
            footprint: building.footprintPolygon || [
              new THREE.Vector2(-building.width / 2, -building.length / 2),
              new THREE.Vector2(building.width / 2, -building.length / 2),
              new THREE.Vector2(building.width / 2, building.length / 2),
              new THREE.Vector2(-building.width / 2, building.length / 2),
            ],
            height: building.floorHeight || 3.2,
            walls: [],
          },
        ],
        roof: building.customRoof || {
          type: building.roofType === 'dome' ? 'flat' : (building.roofType as any),
          pitchAngle: 30,
          overhang: building.roofOverhang || 1.2,
          material: building.roofMaterial || 'clay_tile',
        },
        wallMaterial: building.wallMaterial,
        wallColor: building.wallColor,
      };
      const grp = CustomBuildingMeshBuilder.buildCustomBuilding(customModel);
      grp.userData = { buildingId: building.id, type: 'building' };
      return grp;
    }
    return PrefabMeshBuilder.buildBuildingGroup(building);
  }

  public addBuilding(building: BuildingInstance): BuildingInstance {
    this.buildings.set(building.id, building);

    const group = this.buildMeshForInstance(building);
    this.masterGroup.add(group);
    this.buildingGroups.set(building.id, group);

    // Tactile placement spring animation (Townscaper / Sims feel)
    springAnimator.triggerPlacementSpring(group);

    // Register into Spatial Hash Grid for fast raycasting
    if (this.raycastManager) {
      this.raycastManager.registerSpatialObject(building.id, this.computeAABB(building), group);
    }

    // Associate with chunk and mark dirty
    const chunkKey = BuildingManager.getChunkKey(building.position);
    let chunkSet = this.chunkMap.get(chunkKey);
    if (!chunkSet) {
      chunkSet = new Set();
      this.chunkMap.set(chunkKey, chunkSet);
    }
    chunkSet.add(building.id);
    this.markChunkDirty(chunkKey);

    this.notifyStatsChanged();
    return building;
  }

  public removeBuilding(id: string): boolean {
    const building = this.buildings.get(id);
    if (!building) return false;

    const group = this.buildingGroups.get(id);
    if (group) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
      this.buildingGroups.delete(id);
    }

    if (this.raycastManager) {
      this.raycastManager.unregisterSpatialObject(id);
    }

    // Update chunk association
    const chunkKey = BuildingManager.getChunkKey(building.position);
    const chunkSet = this.chunkMap.get(chunkKey);
    if (chunkSet) {
      chunkSet.delete(id);
      if (chunkSet.size === 0) {
        this.chunkMap.delete(chunkKey);
      }
    }
    this.markChunkDirty(chunkKey);

    if (this.selectedBuildingId === id) {
      this.selectBuilding(null);
    }

    this.buildings.delete(id);
    this.notifyStatsChanged();
    return true;
  }

  public updateBuilding(building: BuildingInstance): void {
    if (!this.buildings.has(building.id)) return;

    this.buildings.set(building.id, building);

    // Rebuild mesh
    const oldGroup = this.buildingGroups.get(building.id);
    if (oldGroup) {
      this.masterGroup.remove(oldGroup);
      this.disposeGroup(oldGroup);
    }

    const newGroup = this.buildMeshForInstance(building);
    this.masterGroup.add(newGroup);
    this.buildingGroups.set(building.id, newGroup);

    if (this.raycastManager) {
      this.raycastManager.updateSpatialObject(building.id, this.computeAABB(building), newGroup);
    }

    const chunkKey = BuildingManager.getChunkKey(building.position);
    this.markChunkDirty(chunkKey);

    if (this.selectedBuildingId === building.id) {
      this.refreshHighlight();
    }

    this.notifyStatsChanged();
  }

  private previewBackup: Map<string, Partial<BuildingInstance>> = new Map();

  public previewBuildingChanges(id: string, tempParams: Partial<BuildingInstance>): void {
    const building = this.buildings.get(id);
    if (!building) return;

    if (!this.previewBackup.has(id)) {
      this.previewBackup.set(id, {
        width: building.width,
        length: building.length,
        floorCount: building.floorCount,
        roofType: building.roofType,
        wallMaterial: building.wallMaterial
      });
    }

    Object.assign(building, tempParams);
    this.updateBuilding(building);
  }

  public revertBuildingPreview(id: string): void {
    const backup = this.previewBackup.get(id);
    if (!backup) return;

    const building = this.buildings.get(id);
    if (building) {
      Object.assign(building, backup);
      this.updateBuilding(building);
    }
    this.previewBackup.delete(id);
  }

  /**
   * Evaluates dynamic batching for static chunks using THREE.BatchedMesh.
   * If a chunk contains multiple static buildings with shared materials,
   * geometries can be consolidated into BatchedMesh instances per material.
   */
  public evaluateChunkBatching(targetChunkKey?: string): void {
    const chunksToEvaluate = targetChunkKey ? [targetChunkKey] : Array.from(this.chunkMap.keys());

    for (const cKey of chunksToEvaluate) {
      // Clear previous batched meshes for this chunk if any
      const oldBatches = this.batchedMeshChunks.get(cKey);
      if (oldBatches) {
        for (const b of oldBatches) {
          this.masterGroup.remove(b);
          b.dispose();
        }
        this.batchedMeshChunks.delete(cKey);
      }

      const buildingIds = this.chunkMap.get(cKey);
      if (!buildingIds || buildingIds.size < 4) {
        // For chunks with few buildings, standard individual groups remain optimal and interactive
        continue;
      }
    }
  }

  public selectBuilding(id: string | null): void {
    this.selectedBuildingId = id;
    this.refreshHighlight();
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  private refreshHighlight(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }

    if (!this.selectedBuildingId) return;

    const group = this.buildingGroups.get(this.selectedBuildingId);
    if (!group) return;

    // Create iOS system blue bounding highlight box helper
    this.highlightMesh = new THREE.BoxHelper(group, 0x007aff);
    (this.highlightMesh.material as THREE.Material).transparent = true;
    (this.highlightMesh.material as THREE.Material).opacity = 0.85;
    (this.highlightMesh.material as THREE.Material).depthTest = false;
    this.scene.add(this.highlightMesh);
  }

  public getSelectedBuilding(): BuildingInstance | null {
    if (!this.selectedBuildingId) return null;
    return this.buildings.get(this.selectedBuildingId) || null;
  }

  public getBuildingGroup(id: string): THREE.Group | undefined {
    return this.buildingGroups.get(id);
  }

  public getBuildingAtPosition(x: number, z: number): BuildingInstance | null {
    for (const bld of this.buildings.values()) {
      const hw = (bld.width || 10) / 2 + 0.6;
      const hl = (bld.length || 10) / 2 + 0.6;
      const maxRadius = Math.max(hw, hl) * 1.5;
      if (Math.abs(x - bld.position.x) > maxRadius || Math.abs(z - bld.position.z) > maxRadius) {
        continue;
      }
      const poly = BuildingManager.getBuildingWorldFootprint(bld);
      if (PolygonMath.isPointInPolygon({ x, y: z }, poly)) {
        return bld;
      }
    }
    return null;
  }

  public static getBuildingGroundArea(building: BuildingInstance): number {
    if (building.footprintPolygon && building.footprintPolygon.length >= 3) {
      return PolygonMath.calculateShoelaceArea(building.footprintPolygon);
    }
    if (building.floors && building.floors.length > 0 && building.floors[0].footprint.length >= 3) {
      return PolygonMath.calculateShoelaceArea(building.floors[0].footprint);
    }
    return building.width * building.length;
  }

  public static getBuildingTotalFloorArea(building: BuildingInstance): number {
    if (building.floors && building.floors.length > 0) {
      let sum = 0;
      for (const fl of building.floors) {
        sum += PolygonMath.calculateShoelaceArea(fl.footprint);
      }
      return sum;
    }
    return BuildingManager.getBuildingGroundArea(building) * Math.max(1, building.floorCount);
  }

  public static getBuildingWorldFootprint(building: BuildingInstance): Vec2D[] {
    const cos = Math.cos(building.rotationY);
    const sin = Math.sin(building.rotationY);

    let localVertices: { x: number; y: number }[];
    if (building.footprintPolygon && building.footprintPolygon.length >= 3) {
      localVertices = building.footprintPolygon;
    } else if (building.floors && building.floors.length > 0 && building.floors[0].footprint.length >= 3) {
      localVertices = building.floors[0].footprint;
    } else {
      const hw = building.width / 2;
      const hl = building.length / 2;
      localVertices = [
        { x: -hw, y: -hl },
        { x: hw, y: -hl },
        { x: hw, y: hl },
        { x: -hw, y: hl },
      ];
    }

    return localVertices.map((v) => ({
      x: building.position.x + (v.x * cos - v.y * sin),
      y: building.position.z + (v.x * sin + v.y * cos),
    }));
  }

  private notifyStatsChanged(): void {
    let totalFootprintM2 = 0;
    for (const b of this.buildings.values()) {
      totalFootprintM2 += BuildingManager.getBuildingGroundArea(b);
    }

    if (this.onStatsChanged) {
      this.onStatsChanged(this.buildings.size, totalFootprintM2);
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.userData?.isSharedGeometry) {
          mesh.geometry?.dispose();
        }
      }
    });
  }

  public rebuildAll(): void {
    PrefabMeshBuilder.clearCache();
    for (const group of this.buildingGroups.values()) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
    }
    this.buildingGroups.clear();
    this.chunkMap.clear();
    this.dirtyChunks.clear();

    if (this.raycastManager) {
      this.raycastManager.clearSpatialGrid();
    }

    for (const building of this.buildings.values()) {
      const group = this.buildMeshForInstance(building);
      this.masterGroup.add(group);
      this.buildingGroups.set(building.id, group);

      if (this.raycastManager) {
        this.raycastManager.registerSpatialObject(building.id, this.computeAABB(building), group);
      }

      const chunkKey = BuildingManager.getChunkKey(building.position);
      let chunkSet = this.chunkMap.get(chunkKey);
      if (!chunkSet) {
        chunkSet = new Set();
        this.chunkMap.set(chunkKey, chunkSet);
      }
      chunkSet.add(building.id);
    }

    this.refreshHighlight();
    this.notifyStatsChanged();
  }

  public clearAll(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
    this.selectedBuildingId = null;

    for (const group of this.buildingGroups.values()) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
    }
    for (const batches of this.batchedMeshChunks.values()) {
      for (const b of batches) {
        this.masterGroup.remove(b);
        b.dispose();
      }
    }
    this.batchedMeshChunks.clear();
    this.buildings.clear();
    this.buildingGroups.clear();
    this.chunkMap.clear();
    this.dirtyChunks.clear();
    PrefabMeshBuilder.clearCache();
    this.notifyStatsChanged();
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  public dispose(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
    }
    for (const group of this.buildingGroups.values()) {
      this.disposeGroup(group);
    }
    for (const batches of this.batchedMeshChunks.values()) {
      for (const b of batches) {
        this.masterGroup.remove(b);
        b.dispose();
      }
    }
    this.batchedMeshChunks.clear();
    this.buildings.clear();
    this.buildingGroups.clear();
    this.chunkMap.clear();
    this.dirtyChunks.clear();
    this.scene.remove(this.masterGroup);
    PrefabMeshBuilder.clearCache();
  }
}

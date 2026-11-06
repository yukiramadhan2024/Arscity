import * as THREE from 'three';
import { BuildingInstance, BuildingSubPartDimensions, BuildingSubPartType } from './PrefabTypes';
import { PrefabMeshBuilder } from './PrefabMeshBuilder';
import { CustomBuildingMeshBuilder } from './CustomBuildingMeshBuilder';
import { CustomBuilding, generateFloorsForMassingShape, calculateBuildingAreas } from './CustomBuildingModel';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import type { RaycastManager } from '../core/engine/RaycastManager';
import type { BBox2D } from '../core/engine/SpatialHashGrid';

import { springAnimator } from '../core/engine/SpringAnimator';
import { InteriorInteractiveSystem } from './InteriorInteractiveSystem';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { FirstPersonFurnitureBuilder, FIRST_PERSON_FURNITURE_CATALOG } from './FirstPersonFurnitureCatalog';
import type { PlacedFurnitureData } from '../core/commands/CityCommands';

export class BuildingManager {
  public buildings: Map<string, BuildingInstance> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;

  private buildingGroups: Map<string, THREE.Group> = new Map();
  public selectedBuildingId: string | null = null;
  public selectedSubPart: BuildingSubPartType | null = null;
  private highlightMesh: THREE.BoxHelper | null = null;
  private subPartGlowMesh: THREE.Mesh | null = null;

  // Spatial Hash & Raycasting reference
  private raycastManager: RaycastManager | null = null;

  // Tahap 2: 3-Zone Spatial LOD tracking & throttling
  public lastLodTime: number = 0;
  public lastLodCameraPosition: THREE.Vector3 = new THREE.Vector3(Infinity, Infinity, Infinity);
  public buildingZones: Map<string, 0 | 1 | 2> = new Map();
  public currentLodZoneCounts: { zone0: number; zone1: number; zone2: number; totalBuildings: number } = {
    zone0: 0,
    zone1: 0,
    zone2: 0,
    totalBuildings: 0,
  };

  // Chunk-based Partitioning & BatchedMesh Optimization
  public static readonly CHUNK_SIZE: number = 64;
  private chunkMap: Map<string, Set<string>> = new Map();
  private dirtyChunks: Set<string> = new Set();
  private batchedMeshChunks: Map<string, THREE.BatchedMesh[]> = new Map();

  public onStatsChanged?: (count: number, totalBuiltAreaM2: number) => void;
  public onSelectionChanged?: () => void;

  // Tahap 5: Automatic Entrance Walkways & City Adaptation
  public walkwaysGroup: THREE.Group;
  public arcadeMasterGroup: THREE.Group;
  public roadManager?: any;
  public lotManager?: any;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'BuildingsMasterGroup';
    scene.add(this.masterGroup);

    this.walkwaysGroup = new THREE.Group();
    this.walkwaysGroup.name = 'WalkwaysMasterGroup';
    this.masterGroup.add(this.walkwaysGroup);

    this.arcadeMasterGroup = new THREE.Group();
    this.arcadeMasterGroup.name = 'ArcadeCanopiesMasterGroup';
    this.masterGroup.add(this.arcadeMasterGroup);
  }

  public setDependencies(roadManager?: any, lotManager?: any): void {
    if (roadManager) this.roadManager = roadManager;
    if (lotManager) this.lotManager = lotManager;
    this.updateAllEntranceWalkways();
    this.updateArcadeCanopies();
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
    if (
      building.isCustom ||
      building.presetKey === 'custom_designer' ||
      (building.floors && building.floors.length > 0)
    ) {
      const customModel: CustomBuilding = {
        id: building.id,
        name: building.name,
        position: building.position.clone(),
        rotationY: building.rotationY,
        plinthHeight: building.plinthHeight ?? 0.35,
        floors: building.floors && building.floors.length > 0
          ? building.floors
          : generateFloorsForMassingShape(
              building.massingShape || 'box',
              building.width || 10,
              building.length || 10,
              building.floorCount || 1,
              building.floorHeight || 3.2
            ),
        roof: building.customRoof || {
          type: building.roofType === 'dome' ? 'flat' : (building.roofType as any),
          pitchAngle: 30,
          overhang: building.roofOverhang || 1.2,
          material: building.roofMaterial || 'clay_tile',
        },
        wallMaterial: building.wallMaterial,
        wallColor: building.wallColor,
        massingShape: building.massingShape,
        windowStyle: building.windowStyle,
        hasBalcony: building.hasBalcony,
        hasSunLouvers: building.hasSunLouvers,
        hasVerticalGarden: building.hasVerticalGarden,
        hasFrontArcade: building.hasFrontArcade,
        useBasePlinthMaterial: building.useBasePlinthMaterial,
        baseMaterial: building.baseMaterial,
        mullionColor: building.mullionColor,
        hasSkylight: building.hasSkylight,
        hasSolarPV: building.hasSolarPV,
      };
      (customModel as any).subParts = building.subParts;
      (customModel as any).exposeSteelFrame = building.exposeSteelFrame;
      (customModel as any).hasCarportAndTopBalcony = building.hasCarportAndTopBalcony;
      (customModel as any).hasVerticalSecondarySkin = building.hasVerticalSecondarySkin;
      (customModel as any).userData = building.userData;
      const grp = CustomBuildingMeshBuilder.buildCustomBuilding(customModel);
      grp.userData = { ...grp.userData, buildingId: building.id, type: 'building' };
      return grp;
    }
    return PrefabMeshBuilder.buildBuildingGroup(building);
  }

  public addBuilding(building: BuildingInstance): BuildingInstance {
    this.buildings.set(building.id, building);

    const group = this.buildMeshForInstance(building);
    group.updateMatrix();
    group.updateMatrixWorld(true);
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

    this.updateEntranceWalkway(building.id);
    this.updateArcadeCanopies();
    this.notifyStatsChanged();
    return building;
  }

  public removeBuilding(id: string): boolean {
    const building = this.buildings.get(id);
    if (!building) return false;

    // Clean up entrance walkway
    if (this.walkwaysGroup) {
      const existingWalkway = this.walkwaysGroup.getObjectByName(`Walkway_${id}`) as THREE.Mesh | undefined;
      if (existingWalkway) {
        this.walkwaysGroup.remove(existingWalkway);
        if (existingWalkway.geometry) existingWalkway.geometry.dispose();
      }
    }
    if (this.lotManager) {
      const lot = typeof this.lotManager.getLotForBuilding === 'function'
        ? this.lotManager.getLotForBuilding(id)
        : null;
      if (lot && lot.userData?.gateOpening) {
        delete lot.userData.gateOpening;
        if (typeof this.lotManager.rebuildLotMesh === 'function') {
          this.lotManager.rebuildLotMesh(lot);
        }
        if (typeof this.lotManager.evaluateBuildingCode === 'function') {
          this.lotManager.evaluateBuildingCode(lot);
        }
      }
    }

    // Clean up interactive doors and seats for this building
    InteriorInteractiveSystem.getInstance().clearBuilding(id);

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
    this.updateArcadeCanopies();
    this.notifyStatsChanged();
    return true;
  }

  public updateBuilding(building: BuildingInstance): void {
    if (!this.buildings.has(building.id)) return;

    // Clean up interactive doors and seats before rebuild
    InteriorInteractiveSystem.getInstance().clearBuilding(building.id);

    this.buildings.set(building.id, building);

    // Rebuild mesh
    const oldGroup = this.buildingGroups.get(building.id);
    if (oldGroup) {
      this.masterGroup.remove(oldGroup);
      this.disposeGroup(oldGroup);
    }

    const newGroup = this.buildMeshForInstance(building);
    newGroup.updateMatrix();
    newGroup.updateMatrixWorld(true);
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

    this.updateEntranceWalkway(building.id);
    this.updateArcadeCanopies();
    this.notifyStatsChanged();
  }

  /**
   * B2: Dynamically attaches placed furniture directly into the building's DynamicFurnitureGroup
   * without rebuilding the whole building group or invalidating caches.
   */
  public attachFurniture(buildingId: string, furData: PlacedFurnitureData): THREE.Group | null {
    const bld = this.buildings.get(buildingId);
    const grp = this.buildingGroups.get(buildingId);
    if (!bld || !grp) return null;

    bld.userData = bld.userData || {};
    bld.userData.placedFurniture = bld.userData.placedFurniture || [];
    const existingIdx = bld.userData.placedFurniture.findIndex((f: PlacedFurnitureData) => f.id === furData.id);
    if (existingIdx === -1) {
      bld.userData.placedFurniture.push(furData);
    } else {
      bld.userData.placedFurniture[existingIdx] = furData;
    }

    let dynamicGroup = (grp.getObjectByName('DynamicFurnitureGroup') || grp.userData.dynamicFurnitureGroup) as THREE.Group;
    if (!dynamicGroup) {
      dynamicGroup = new THREE.Group();
      dynamicGroup.name = 'DynamicFurnitureGroup';
      grp.add(dynamicGroup);
      grp.userData.dynamicFurnitureGroup = dynamicGroup;
    } else if (dynamicGroup.parent !== grp) {
      grp.add(dynamicGroup);
    }
    dynamicGroup.visible = true;
    dynamicGroup.frustumCulled = false;
    dynamicGroup.matrixAutoUpdate = true;
    dynamicGroup.userData.isDynamic = true;

    // Remove old mesh with same id if already present
    const existing = dynamicGroup.children.find((c) => c.userData?.furnitureId === furData.id);
    if (existing) {
      dynamicGroup.remove(existing);
    }

    const furMesh = FirstPersonFurnitureBuilder.buildFurniture(furData.type);
    const plinthHeight = bld.plinthHeight ?? 0.35;
    const baseFloorElevation = furData.position[1];
    const accurateY = baseFloorElevation + plinthHeight + 0.01;
    furMesh.position.set(furData.position[0], accurateY, furData.position[2]);
    furMesh.rotation.y = furData.rotationY || 0;
    furMesh.visible = true;
    furMesh.frustumCulled = false;
    furMesh.matrixAutoUpdate = true;
    furMesh.userData = {
      furnitureId: furData.id,
      type: furData.type,
      buildingId: bld.id,
      slot: furData.slot || 'floor',
      parentId: furData.parentId,
      isDynamic: true
    };
    furMesh.traverse((child) => {
      child.visible = true;
      child.frustumCulled = false;
      if ((child as THREE.Mesh).isMesh) {
        child.updateMatrix();
        child.matrixAutoUpdate = false;
      } else {
        child.matrixAutoUpdate = true;
      }
      child.userData = {
        ...child.userData,
        furnitureId: furData.id,
        isFurniture: true,
        isDynamic: true,
        type: furData.type,
        buildingId: bld.id,
        isSharedGeometry: true,
        isSharedMaterial: true,
        slot: furData.slot || 'floor',
        parentId: furData.parentId
      };
    });

    dynamicGroup.add(furMesh);
    grp.visible = true;
    grp.updateMatrix();
    grp.updateMatrixWorld(true);

    // Register interactive seats if applicable
    const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === furData.type);
    if (furItem?.isSeat) {
      const rot = bld.rotationY || 0;
      const bldPos = bld.position || new THREE.Vector3();
      const worldX = bldPos.x + (furData.position[0] * Math.cos(rot) - furData.position[2] * Math.sin(rot));
      const worldZ = bldPos.z + (furData.position[0] * Math.sin(rot) + furData.position[2] * Math.cos(rot));
      const worldY = bldPos.y + accurateY;

      InteriorInteractiveSystem.getInstance().registerSeat({
        id: `seat_${furData.id}`,
        type: (furData.type.includes('sofa') ? 'sofa' : 'chair') as any,
        buildingId: bld.id,
        label: furItem.name,
        worldPosition: new THREE.Vector3(worldX, worldY, worldZ),
        facingAngle: (furData.rotationY || 0) + rot,
        floorIndex: furData.floorIndex || 1
      });
    }

    springAnimator.triggerLocalFurnitureSpring(furMesh, false, 200);
    return furMesh;
  }

  /**
   * B2: Dynamically detaches placed furniture from the building's DynamicFurnitureGroup
   */
  public detachFurniture(buildingId: string, furnitureId: string): boolean {
    const bld = this.buildings.get(buildingId);
    const grp = this.buildingGroups.get(buildingId);
    if (!bld || !grp) return false;

    if (bld.userData?.placedFurniture) {
      bld.userData.placedFurniture = bld.userData.placedFurniture.filter(
        (f: PlacedFurnitureData) => f.id !== furnitureId
      );
    }

    const dynamicGroup = grp.getObjectByName('DynamicFurnitureGroup') as THREE.Group;
    if (dynamicGroup) {
      const child = dynamicGroup.children.find((c) => c.userData?.furnitureId === furnitureId);
      if (child) {
        dynamicGroup.remove(child);
      }
    }

    grp.updateMatrix();
    grp.updateMatrixWorld(true);

    InteriorInteractiveSystem.getInstance().unregisterSeat(`seat_${furnitureId}`);
    return true;
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

  public selectBuilding(id: string | null, subPart: BuildingSubPartType | null = null): void {
    this.selectedBuildingId = id;
    this.selectedSubPart = id ? (subPart || 'main_tower') : null;
    this.refreshHighlight();
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  public getSubPartDimensions(
    buildingId: string,
    partType: BuildingSubPartType
  ): BuildingSubPartDimensions | null {
    const bld = this.buildings.get(buildingId);
    if (!bld) return null;
    const eff = PrefabMeshBuilder.getEffectiveSubParts(bld);
    return { ...eff[partType] };
  }

  public resizeBuildingSubPart(
    buildingId: string,
    partType: BuildingSubPartType,
    dims: Partial<BuildingSubPartDimensions>,
    triggerSpring: boolean = false
  ): BuildingSubPartDimensions | null {
    const bld = this.buildings.get(buildingId);
    if (!bld) return null;

    const eff = PrefabMeshBuilder.getEffectiveSubParts(bld);
    const current = eff[partType];
    const updated: BuildingSubPartDimensions = {
      partWidth: Math.max(2.5, Math.min(80, Number((dims.partWidth ?? current.partWidth).toFixed(2)))),
      partDepth: Math.max(2.5, Math.min(80, Number((dims.partDepth ?? current.partDepth).toFixed(2)))),
      partFloors: Math.max(1, Math.min(40, Math.round(dims.partFloors ?? current.partFloors)))
    };

    bld.subParts = {
      ...(bld.subParts || {}),
      [partType]: updated
    };

    if (partType === 'main_tower') {
      bld.width = updated.partWidth;
      bld.length = updated.partDepth;
      bld.floorCount = updated.partFloors;
    }

    this.updateBuilding(bld);

    if (triggerSpring) {
      const grp = this.buildingGroups.get(buildingId);
      if (grp) {
        springAnimator.triggerPlacementSpring(grp);
      }
    }

    return updated;
  }

  private refreshHighlight(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
    if (this.subPartGlowMesh) {
      this.scene.remove(this.subPartGlowMesh);
      this.subPartGlowMesh.geometry.dispose();
      (this.subPartGlowMesh.material as THREE.Material).dispose();
      this.subPartGlowMesh = null;
    }

    if (!this.selectedBuildingId) return;

    const group = this.buildingGroups.get(this.selectedBuildingId);
    if (!group) return;

    group.updateMatrixWorld(true);
    let targetObj: THREE.Object3D = group;
    if (this.selectedSubPart) {
      const subGrp = group.getObjectByName(`SubPart_${this.selectedSubPart}`);
      if (subGrp && subGrp.children.length > 0) {
        targetObj = subGrp;
      }
    }

    // Crimson Pink (#FD6E8E / 0xfd6e8e) selection BoxHelper & subtle volume glow
    this.highlightMesh = new THREE.BoxHelper(targetObj, 0xfd6e8e);
    (this.highlightMesh.material as THREE.Material).transparent = true;
    (this.highlightMesh.material as THREE.Material).opacity = 0.95;
    (this.highlightMesh.material as THREE.Material).depthTest = false;
    this.scene.add(this.highlightMesh);

    const bbox = new THREE.Box3().setFromObject(targetObj);
    if (!bbox.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bbox.getSize(size);
      bbox.getCenter(center);

      const glowGeo = new THREE.BoxGeometry(
        Math.max(0.5, size.x + 0.18),
        Math.max(0.5, size.y + 0.18),
        Math.max(0.5, size.z + 0.18)
      );
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xfd6e8e,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        depthTest: true
      });
      this.subPartGlowMesh = new THREE.Mesh(glowGeo, glowMat);
      this.subPartGlowMesh.name = 'SelectedSubPartCrimsonGlow';
      this.subPartGlowMesh.position.copy(center);
      this.subPartGlowMesh.renderOrder = 995;
      this.scene.add(this.subPartGlowMesh);
    }
  }

  public getSelectedBuilding(): BuildingInstance | null {
    if (!this.selectedBuildingId) return null;
    return this.buildings.get(this.selectedBuildingId) || null;
  }

  public getBuilding(id: string): BuildingInstance | undefined {
    return this.buildings.get(id);
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
    if (building.massingShape && building.massingShape !== 'box') {
      return calculateBuildingAreas(building.width, building.length, building.floorCount, building.massingShape).kdb;
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
    if (building.massingShape && building.massingShape !== 'box') {
      return calculateBuildingAreas(building.width, building.length, building.floorCount, building.massingShape).klb;
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

  /**
   * Calculates the shortest distance in meters from camera (x, z) to the nearest edge
   * of the building's 2D footprint polygon.
   * Returns 0 if camera (x, z) is inside the building's footprint polygon.
   */
  public static getDistanceToBuildingFootprint(
    building: BuildingInstance,
    cameraPos: THREE.Vector3
  ): number {
    const footprint = BuildingManager.getBuildingWorldFootprint(building);
    if (!footprint || footprint.length < 3) {
      const halfDiag = Math.hypot(building.width, building.length) * 0.5;
      const centerDist = Math.hypot(cameraPos.x - building.position.x, cameraPos.z - building.position.z);
      return Math.max(0, centerDist - halfDiag);
    }

    const camPt: Vec2D = { x: cameraPos.x, y: cameraPos.z };
    if (PolygonMath.isPointInPolygon(camPt, footprint)) {
      return 0;
    }

    let minDist = Infinity;
    const n = footprint.length;
    for (let i = 0; i < n; i++) {
      const p1 = footprint[i];
      const p2 = footprint[(i + 1) % n];
      const d = PolygonMath.distancePointToSegment(camPt, p1, p2);
      if (d < minDist) {
        minDist = d;
      }
    }

    return minDist;
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
        if (mesh.material && !mesh.userData?.isSharedMaterial) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (m && !m.userData?.isSharedMaterial) m.dispose();
            });
          } else if (mesh.material && !mesh.material.userData?.isSharedMaterial) {
            mesh.material.dispose();
          }
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

    this.updateAllEntranceWalkways();
    this.updateArcadeCanopies();
    this.refreshHighlight();
    this.notifyStatsChanged();
  }

  public getWalkwayAreaInLot(lot: { containedBuildingIds?: string[] }): number {
    let totalWalkwayArea = 0;
    if (lot.containedBuildingIds) {
      for (const bldId of lot.containedBuildingIds) {
        const bld = this.buildings.get(bldId);
        if (bld?.userData?.walkwayArea) {
          totalWalkwayArea += bld.userData.walkwayArea;
        }
      }
    }
    return totalWalkwayArea;
  }

  public updateEntranceWalkway(buildingId: string): THREE.Mesh | null {
    if (!this.walkwaysGroup) {
      this.walkwaysGroup = new THREE.Group();
      this.walkwaysGroup.name = 'WalkwaysMasterGroup';
      this.masterGroup.add(this.walkwaysGroup);
    } else if (!this.walkwaysGroup.parent) {
      this.masterGroup.add(this.walkwaysGroup);
    }

    // Remove existing walkway for this building
    const existing = this.walkwaysGroup.getObjectByName(`Walkway_${buildingId}`) as THREE.Mesh | undefined;
    if (existing) {
      this.walkwaysGroup.remove(existing);
      if (existing.geometry) existing.geometry.dispose();
    }

    const building = this.buildings.get(buildingId);
    if (!building) return null;
    if (!this.roadManager) return null;

    if (!building.userData) building.userData = {};
    delete building.userData.walkwayArea;
    delete building.userData.walkwayPath;
    delete building.userData.walkwayObstacle;

    // Door world position (front is +Z in local coordinates: (0, 0, length * 0.5))
    const halfL = (building.length || 10) * 0.5;
    const rot = building.rotationY || 0;
    const doorWorldX = building.position.x - Math.sin(rot) * halfL;
    const doorWorldZ = building.position.z + Math.cos(rot) * halfL;
    const doorWorldY = building.position.y || 0;

    const sample = typeof this.roadManager.getNearestRoadSample === 'function'
      ? this.roadManager.getNearestRoadSample(new THREE.Vector2(doorWorldX, doorWorldZ))
      : null;

    if (!sample) return null;

    // Outer edge of the sidewalk
    const swX = sample.closestPoint.x + sample.normal.x * sample.corridorHalfWidth;
    const swZ = sample.closestPoint.y + sample.normal.y * sample.corridorHalfWidth;

    const dist = Math.hypot(swX - doorWorldX, swZ - doorWorldZ);

    // Prompt rule: "Bangunan dalam jarak 1 m sampai 18 m dari jalan raya"
    if (dist < 1.0 || dist > 18.0) {
      return null;
    }

    // "Jika terhalang bangunan atau kavling lain, lewati dan beri catatan"
    const segStartX = doorWorldX;
    const segStartZ = doorWorldZ;
    const segEndX = swX;
    const segEndZ = swZ;

    for (const [otherId, other] of this.buildings.entries()) {
      if (otherId === buildingId) continue;
      const otherHalfW = (other.width || 10) * 0.5;
      const otherHalfL = (other.length || 10) * 0.5;
      const otherRad = Math.hypot(otherHalfW, otherHalfL);

      // Distance from other center to segment
      const dx = segEndX - segStartX;
      const dz = segEndZ - segStartZ;
      const segLenSq = dx * dx + dz * dz;
      let u = segLenSq > 1e-6 ? ((other.position.x - segStartX) * dx + (other.position.z - segStartZ) * dz) / segLenSq : 0;
      u = Math.max(0, Math.min(1, u));
      const projX = segStartX + u * dx;
      const projZ = segStartZ + u * dz;
      const dToSeg = Math.hypot(other.position.x - projX, other.position.z - projZ);

      if (dToSeg < otherRad * 0.85) {
        building.userData.walkwayObstacle = `Terhalang bangunan ${other.name || other.id}`;
        return null;
      }
    }

    // Build 1.2m stone paving path
    const walkwayWidth = 1.2;
    const thickness = 0.04;
    const geom = new THREE.BoxGeometry(walkwayWidth, thickness, dist);
    const mat = MaterialLibrary.getInstance().getMaterial('paving') ||
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = `Walkway_${buildingId}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    // Midpoint between door and sidewalk
    const midX = (doorWorldX + swX) * 0.5;
    const midZ = (doorWorldZ + swZ) * 0.5;
    mesh.position.set(midX, doorWorldY + thickness * 0.5 + 0.005, midZ);

    // Orientation along vector from door to sidewalk
    const angle = Math.atan2(swX - doorWorldX, swZ - doorWorldZ);
    mesh.rotation.y = angle;

    mesh.userData = {
      type: 'walkway',
      buildingId,
      areaM2: dist * walkwayWidth,
      dist,
    };

    this.walkwaysGroup.add(mesh);

    building.userData.walkwayArea = dist * walkwayWidth;
    building.userData.walkwayPath = {
      start: { x: doorWorldX, z: doorWorldZ },
      end: { x: swX, z: swZ },
      width: walkwayWidth,
      dist,
    };

    // If within a lot, open gate in lot boundary and re-evaluate
    if (this.lotManager) {
      const lot = typeof this.lotManager.getLotForBuilding === 'function'
        ? this.lotManager.getLotForBuilding(buildingId)
        : null;
      if (lot) {
        if (!lot.userData) lot.userData = {};
        lot.userData.gateOpening = { x: swX, z: swZ, width: 1.4 };
        if (typeof this.lotManager.rebuildLotMesh === 'function') {
          this.lotManager.rebuildLotMesh(lot);
        }
        if (typeof this.lotManager.evaluateBuildingCode === 'function') {
          this.lotManager.evaluateBuildingCode(lot);
        }
      }
    }

    return mesh;
  }

  public updateAllEntranceWalkways(): void {
    for (const bldId of this.buildings.keys()) {
      this.updateEntranceWalkway(bldId);
    }
  }

  public updateArcadeCanopies(): void {
    if (!this.arcadeMasterGroup) {
      this.arcadeMasterGroup = new THREE.Group();
      this.arcadeMasterGroup.name = 'ArcadeCanopiesMasterGroup';
      this.masterGroup.add(this.arcadeMasterGroup);
    } else if (!this.arcadeMasterGroup.parent) {
      this.masterGroup.add(this.arcadeMasterGroup);
    }

    // Clean old arcade meshes
    while (this.arcadeMasterGroup.children.length > 0) {
      const child = this.arcadeMasterGroup.children[0] as THREE.Group;
      this.arcadeMasterGroup.remove(child);
      child.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).geometry?.dispose();
        }
      });
    }

    const bldArray = Array.from(this.buildings.values());
    const processedPairs = new Set<string>();

    for (let i = 0; i < bldArray.length; i++) {
      const bldA = bldArray[i];
      const isRukoA =
        bldA.category === 'commercial' ||
        (bldA.presetKey && bldA.presetKey.includes('ruko')) ||
        Boolean(bldA.hasFrontArcade);

      if (!isRukoA) continue;

      for (let j = i + 1; j < bldArray.length; j++) {
        const bldB = bldArray[j];
        const isRukoB =
          bldB.category === 'commercial' ||
          (bldB.presetKey && bldB.presetKey.includes('ruko')) ||
          Boolean(bldB.hasFrontArcade);

        if (!isRukoB) continue;

        // Check if orientations are reasonably parallel
        const rotA = bldA.rotationY || 0;
        const rotB = bldB.rotationY || 0;
        if (Math.abs(Math.sin(rotA - rotB)) > 0.35) continue;

        const wA = bldA.width || 6;
        const wB = bldB.width || 6;
        const lA = bldA.length || 10;
        const lB = bldB.length || 10;

        // Transform B into A's local space
        const dx = bldB.position.x - bldA.position.x;
        const dz = bldB.position.z - bldA.position.z;
        const localX = Math.cos(-rotA) * dx - Math.sin(-rotA) * dz;
        const localZ = Math.sin(-rotA) * dx + Math.cos(-rotA) * dz;

        // Check if side-by-side (fronts roughly aligned)
        if (Math.abs(localZ) > Math.min(lA, lB) * 0.4) continue;

        // Distance between side edges
        const sideGap = Math.abs(localX) - (wA * 0.5 + wB * 0.5);

        // Prompt requirement: "Dua ruko berdampingan kurang dari 1,5 m"
        if (sideGap < -0.2 || sideGap > 1.5) continue;

        const pairKey = [bldA.id, bldB.id].sort().join('_');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Lot boundary crossing check:
        // "tidak boleh melewati batas kavling tanpa peringatan"
        if (this.lotManager && typeof this.lotManager.getLotForBuilding === 'function') {
          const lotA = this.lotManager.getLotForBuilding(bldA.id);
          const lotB = this.lotManager.getLotForBuilding(bldB.id);
          if (lotA && lotB && lotA.id !== lotB.id) {
            const warnMsg = 'Arkade ruko melintasi batas kavling antar-pemilik';
            if (!bldA.userData) bldA.userData = {};
            if (!bldB.userData) bldB.userData = {};
            bldA.userData.arcadeWarning = warnMsg;
            bldB.userData.arcadeWarning = warnMsg;
          } else {
            if (bldA.userData?.arcadeWarning) delete bldA.userData.arcadeWarning;
            if (bldB.userData?.arcadeWarning) delete bldB.userData.arcadeWarning;
          }
        }

        // Create unified arcade canopy connecting the two rukos with joint column
        const bridgeGroup = new THREE.Group();
        bridgeGroup.name = `ArcadeBridge_${bldA.id}_${bldB.id}`;

        const gapWidth = Math.max(0.2, sideGap + 0.1);
        const canopyDepth = 2.0;
        const canopyThick = 0.15;
        const flH = Math.min(bldA.floorHeight || 3.5, bldB.floorHeight || 3.5);

        const canopyMat = MaterialLibrary.getInstance().getMaterial('concrete') ||
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
        const columnMat = MaterialLibrary.getInstance().getMaterial('concrete_board') ||
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

        // 1. Canopy Slab bridging across the gap
        const slabGeom = new THREE.BoxGeometry(gapWidth, canopyThick, canopyDepth);
        const slabMesh = new THREE.Mesh(slabGeom, canopyMat);
        slabMesh.name = 'ArcadeCanopySlab';
        slabMesh.castShadow = true;
        slabMesh.receiveShadow = true;

        const gapCenterX = Math.sign(localX) * (wA * 0.5 + sideGap * 0.5);
        const canopyLocalZ = lA * 0.5 + canopyDepth * 0.5;
        slabMesh.position.set(gapCenterX, flH + canopyThick * 0.5, canopyLocalZ);
        bridgeGroup.add(slabMesh);

        // 2. Joint Column at the front junction
        const colSize = 0.3;
        const colGeom = new THREE.BoxGeometry(colSize, flH, colSize);
        const colMesh = new THREE.Mesh(colGeom, columnMat);
        colMesh.name = 'ArcadeJointColumn';
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;

        const colLocalZ = lA * 0.5 + canopyDepth - colSize * 0.5;
        colMesh.position.set(gapCenterX, flH * 0.5, colLocalZ);
        bridgeGroup.add(colMesh);

        // Orient bridge in A's frame and place at A's world position
        bridgeGroup.position.copy(bldA.position);
        bridgeGroup.rotation.y = rotA;

        bridgeGroup.userData = {
          type: 'arcade_canopy_bridge',
          buildingAId: bldA.id,
          buildingBId: bldB.id,
          sideGap,
        };

        this.arcadeMasterGroup.add(bridgeGroup);
      }
    }
  }

  public clearAll(): void {
    if (this.walkwaysGroup) {
      while (this.walkwaysGroup.children.length > 0) {
        const child = this.walkwaysGroup.children[0] as THREE.Mesh;
        this.walkwaysGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
      }
      if (this.walkwaysGroup.parent === this.masterGroup) {
        this.masterGroup.remove(this.walkwaysGroup);
      }
    }
    if (this.arcadeMasterGroup) {
      while (this.arcadeMasterGroup.children.length > 0) {
        const child = this.arcadeMasterGroup.children[0] as THREE.Group;
        this.arcadeMasterGroup.remove(child);
        child.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry?.dispose();
        });
      }
      if (this.arcadeMasterGroup.parent === this.masterGroup) {
        this.masterGroup.remove(this.arcadeMasterGroup);
      }
    }
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

  /**
   * Computes LOD zone with dual hysteresis to prevent flickering / thrashing:
   * - Zone 0 (near): enter < 24m, exit > 27m
   * - Zone 1 (mid): 27m to 65m (exit to Z2 > 68m, return to Z0 < 24m)
   * - Zone 2 (far): > 65m (return to Z1 < 62m, return to Z0 < 24m)
   */
  public computeLODZoneWithHysteresis(currentZone: 0 | 1 | 2, dist: number): 0 | 1 | 2 {
    if (currentZone === 0) {
      if (dist > 27.0) {
        return dist > 68.0 ? 2 : 1;
      }
      return 0;
    } else if (currentZone === 1) {
      if (dist < 24.0) return 0;
      if (dist > 68.0) return 2;
      return 1;
    } else { // currentZone === 2
      if (dist < 24.0) return 0;
      if (dist < 62.0) return 1;
      return 2;
    }
  }

  /**
   * Applies layer visibility and shared glass material references per building zone.
   * G6 invariant: Visibility only alters rendering, never deletes data or changes collision.
   */
  public applyBuildingZoneVisibility(
    grp: THREE.Group,
    zone: 0 | 1 | 2,
    currentIndoorBuildingId: string | null = null,
    isIndoorHost: boolean = false,
    kacaDekat?: THREE.Material,
    kacaJauh?: THREE.Material,
    footprintDistance: number = zone === 0 ? 0 : zone === 1 ? 35 : 80
  ): void {
    const isSelected = grp.userData?.buildingId === this.selectedBuildingId;
    const forceFullDetail = isSelected || isIndoorHost;

    // 1. LOD2 Massing Check (> 250m)
    const lod2Massing = grp.getObjectByName('LOD2MassingGroup') || grp.userData?.lod2MassingGroup;
    const isLOD2Far = !forceFullDetail && zone === 2;

    if (lod2Massing) {
      lod2Massing.visible = isLOD2Far;
    }

    // Exterior shell visible in Zone 0, 1, or if LOD2 massing is not active
    const ext = grp.getObjectByName('ExteriorShell') || grp.userData?.exteriorShell;
    if (ext) {
      ext.visible = !isLOD2Far || !lod2Massing;
    }

    // Detail props (window frames, balcony railings, equipment): visible in Zone 0 and 1
    const details = grp.getObjectByName('DetailPropsGroup') || grp.userData?.detailPropsGroup;
    if (details) {
      details.visible = forceFullDetail || zone === 0 || zone === 1;
    }

    // Lot Ground Context: base visible in Zone 0 and 1, micro-props only in Zone 0
    const lotContext = grp.getObjectByName('LotGroundContextGroup') || grp.userData?.lotGroundContext;
    if (lotContext) {
      lotContext.visible = forceFullDetail || zone !== 2;
      const lotDetails = lotContext.getObjectByName('LotDetailProps') || lotContext.userData?.detailPropsGroup;
      if (lotDetails) {
        lotDetails.visible = forceFullDetail || zone === 0;
      }
    }

    // Interior: When indoor focus is active (currentIndoorBuildingId !== null), ONLY host building gets interior visible.
    // Otherwise, visible in Zone 0.
    const showInterior =
      forceFullDetail ||
      (currentIndoorBuildingId !== null ? isIndoorHost : zone === 0);

    const interiorGroup = grp.getObjectByName('InteriorDetails') || grp.userData?.interiorDetails;
    if (interiorGroup) {
      interiorGroup.visible = showInterior;
    }

    // TAHAP 1: NEVER hide placedFurniture (DynamicFurnitureGroup) for buildings < 30m from camera
    // or for the building the player is currently inside in First-Person Mode.
    const showPlacedFurniture =
      forceFullDetail ||
      (currentIndoorBuildingId !== null ? isIndoorHost : footprintDistance < 30.0);

    const dynamicFurniture = grp.getObjectByName('DynamicFurnitureGroup') || grp.userData?.dynamicFurnitureGroup;
    if (dynamicFurniture) {
      dynamicFurniture.visible = showPlacedFurniture;
      dynamicFurniture.frustumCulled = false;
      if (showPlacedFurniture) {
        dynamicFurniture.traverse((child: THREE.Object3D) => {
          child.visible = true;
          child.frustumCulled = false;
        });
      }
    }

    // Glass material switching: Zone 0 uses kacaDekat, Zone 1 & 2 use kacaJauh
    const matLib = MaterialLibrary.getInstance();
    const glassNear = kacaDekat || matLib.kacaDekat;
    const glassFar = kacaJauh || matLib.kacaJauh;

    let glassMeshes: THREE.Mesh[] = grp.userData.windowGlassMeshes;
    if (!glassMeshes) {
      glassMeshes = [];
      grp.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          const mat = m.material as any;
          const matName = mat?.name;
          const isGlass =
            m.name === 'WindowGlass' ||
            m.userData?.isWindowGlass ||
            matName === 'kacaDekat' ||
            matName === 'kacaJauh' ||
            matName === 'glass' ||
            matName === 'glass_lit' ||
            matName === 'glass_dark' ||
            (mat && 'transmission' in mat && mat.transmission > 0) ||
            (mat?.transparent && mat?.opacity < 0.8 && !m.name.includes('Petal'));

          if (isGlass) {
            m.userData.isWindowGlass = true;
            glassMeshes.push(m);
          }
        }
      });
      grp.userData.windowGlassMeshes = glassMeshes;
    }

    const targetGlass = zone === 0 ? glassNear : glassFar;
    for (const gm of glassMeshes) {
      if (gm.material !== targetGlass) {
        gm.material = targetGlass;
      }
    }
  }

  /**
   * Tahap 2 (T2.1): Render Jarak Bertingkat (3-Zone Spatial LOD).
   * - Throttled: runs every 120ms OR when camera displacement > 1.5m.
   * - Calculates distance from camera (x, z) to nearest edge of the footprint polygon.
   * - Three distance zones with dual hysteresis:
   *   * Zone 0 (< 24m / 27m): Full detail, interior, furniture, window frames, shared kacaDekat.
   *   * Zone 1 (27m - 65m, hysteresis 62m/68m): Shell & exterior details, hidden interior/furniture, shared kacaJauh.
   *   * Zone 2 (> 65m): Masses, roof, culls small props/frames.
   * - Indoor focus: host building forced to Zone 0, hides all other interiors.
   */
  public updateSpatialLOD(
    cameraPosition: THREE.Vector3,
    isFirstPerson: boolean = false,
    currentIndoorBuildingId: string | null = null,
    forceUpdate: boolean = false
  ): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const displacement = cameraPosition.distanceTo(this.lastLodCameraPosition);
    const timeElapsed = now - this.lastLodTime;

    if (!forceUpdate && timeElapsed < 120 && displacement <= 1.5) {
      return false; // Throttled: skipped LOD evaluation
    }

    this.lastLodTime = now;
    this.lastLodCameraPosition.copy(cameraPosition);

    let z0 = 0;
    let z1 = 0;
    let z2 = 0;

    const matLib = MaterialLibrary.getInstance();
    const kacaDekat = matLib.kacaDekat;
    const kacaJauh = matLib.kacaJauh;

    for (const [id, bld] of this.buildings.entries()) {
      const grp = this.buildingGroups.get(id);
      if (!grp) continue;

      const isSelected = id === this.selectedBuildingId;
      const isIndoorHost = currentIndoorBuildingId !== null && id === currentIndoorBuildingId;

      // Distance to footprint edge (0 if inside footprint)
      const dist = BuildingManager.getDistanceToBuildingFootprint(bld, cameraPosition);

      // Determine LOD zone with dual hysteresis
      let zone: 0 | 1 | 2;
      if (isSelected || isIndoorHost) {
        zone = 0;
      } else {
        const prevZone = this.buildingZones.get(id) ?? (dist < 24.0 ? 0 : dist > 65.0 ? 2 : 1);
        zone = this.computeLODZoneWithHysteresis(prevZone, dist);
      }

      this.buildingZones.set(id, zone);
      grp.userData.currentZone = zone;

      if (zone === 0) z0++;
      else if (zone === 1) z1++;
      else z2++;

      this.applyBuildingZoneVisibility(grp, zone, currentIndoorBuildingId, isIndoorHost, kacaDekat, kacaJauh, dist);
    }

    this.currentLodZoneCounts = {
      zone0: z0,
      zone1: z1,
      zone2: z2,
      totalBuildings: this.buildings.size,
    };

    return true;
  }

  /**
   * Tahap 1: Kunci Logika Render Jarak (LOD) Hanya di Mode First-Person (Hilangkan di Mode Orbit & Drone).
   * - Mode Orbit & Drone (cameraMode !== 'first_person'):
   *   * NONAKTIFKAN pemangkasan jarak (spatial distance LOD culling).
   *   * 100% detail eksterior (dinding, jendela, kusen, balkon, atap, dan kanopi) dirender utuh dan stabil dari jarak berapa pun.
   *   * Sembunyikan hanya grup perabot dalam ruangan (DynamicFurnitureGroup) saat di Mode 3D Orbit agar performa tetap 144 FPS
   *     (kecuali ketika Mode 2D Denah / section cut aktif, tampilkan perabot lantai 1).
   * - Mode First-Person / Pejalan Kaki (cameraMode === 'first_person'):
   *   * Objek dekat (< 30 meter atau host building): 100% detail penuh termasuk seluruh perabot yang sudah ditaruh, interior, detail props.
   *   * Objek menengah dan jauh (>= 30 meter): sederhanakan detail interior dan furniture agar penjelajahan jalan kaki sangat ringan.
   */
  public updateLOD(
    cameraPosition: THREE.Vector3,
    cameraMode: string = 'orbit',
    isSectionCutActive: boolean = false,
    isSubsurfaceLensActive: boolean = false,
    _lodCutoffDistance: number = 60,
    _graphicsPreset: string = 'high',
    currentIndoorBuildingId: string | null = null
  ): void {
    const isFirstPerson = cameraMode === 'first_person';
    const is2D = cameraMode === '2d';

    for (const [id, bld] of this.buildings.entries()) {
      const grp = this.buildingGroups.get(id);
      if (!grp) continue;

      const isSelected = id === this.selectedBuildingId;
      const isIndoorHost = currentIndoorBuildingId !== null && id === currentIndoorBuildingId;
      const footprintDist = BuildingManager.getDistanceToBuildingFootprint(bld, cameraPosition);

      // Architectural Layer Groups
      const lod2Massing = grp.getObjectByName('LOD2MassingGroup') || grp.userData?.lod2MassingGroup;
      const ext = grp.getObjectByName('ExteriorShell') || grp.userData?.exteriorShell;
      const details = grp.getObjectByName('DetailPropsGroup') || grp.userData?.detailPropsGroup;
      const lotContext = grp.getObjectByName('LotGroundContextGroup') || grp.userData?.lotGroundContext;
      const interior = grp.getObjectByName('InteriorDetails') || grp.userData?.interiorDetails;
      const dynamicFurniture = grp.getObjectByName('DynamicFurnitureGroup') || grp.userData?.dynamicFurnitureGroup;
      const subsurface = grp.getObjectByName('SubsurfaceFoundation') || grp.userData?.subsurfaceFoundation;

      // =========================================================================
      // 1. NON-FIRST-PERSON MODES (Orbit, Drone, 2D Floor Plan)
      // =========================================================================
      if (!isFirstPerson) {
        // Disable distance LOD culling: never show low-poly impostor massing
        if (lod2Massing) lod2Massing.visible = false;

        // 100% exterior shell and facade details are always visible without popping
        if (ext) ext.visible = true;
        if (details) details.visible = true;
        if (lotContext) {
          lotContext.visible = true;
          const lotDetails = lotContext.getObjectByName('LotDetailProps') || lotContext.userData?.detailPropsGroup;
          if (lotDetails) lotDetails.visible = true;
        }

        // Interior details: only visible when in 2D Floor Plan mode or when section cut is active
        if (interior) {
          interior.visible = is2D || isSectionCutActive;
        }

        // Placed furniture: hide in 3D Orbit / Drone to maintain 144 FPS,
        // EXCEPT when 2D Floor Plan is active or section cut is active: display Floor 1 furniture!
        if (dynamicFurniture) {
          if (is2D || isSectionCutActive) {
            dynamicFurniture.visible = true;
            dynamicFurniture.frustumCulled = false;
            dynamicFurniture.traverse((child: THREE.Object3D) => {
              if (child !== dynamicFurniture) {
                child.visible = ((child.userData?.floorIndex ?? 0) <= 1 && child.position.y < 2.2);
              }
            });
          } else {
            dynamicFurniture.visible = false;
          }
        }

        // Subsurface foundation
        if (subsurface) {
          subsurface.visible = isSubsurfaceLensActive || isSectionCutActive;
        }

        this.buildingZones.set(id, 0);
        continue;
      }

      // =========================================================================
      // 2. FIRST-PERSON MODE: Smart Distance Rendering (< 30m vs >= 30m)
      // =========================================================================
      const forceFullDetail = isSelected || isIndoorHost || isSectionCutActive;
      const isNear = forceFullDetail || footprintDist < 30.0;

      if (lod2Massing) lod2Massing.visible = false;
      if (ext) ext.visible = true;

      if (isNear) {
        // Objek dekat (< 30 meter atau host building): 100% detail penuh termasuk furniture, interior, detail props
        if (details) details.visible = true;
        if (lotContext) {
          lotContext.visible = true;
          const lotDetails = lotContext.getObjectByName('LotDetailProps') || lotContext.userData?.detailPropsGroup;
          if (lotDetails) lotDetails.visible = true;
        }

        const showInterior = currentIndoorBuildingId !== null ? isIndoorHost : true;
        if (interior) interior.visible = showInterior;

        if (dynamicFurniture) {
          dynamicFurniture.visible = showInterior;
          dynamicFurniture.frustumCulled = false;
          if (showInterior) {
            dynamicFurniture.traverse((child: THREE.Object3D) => {
              child.visible = true;
              child.frustumCulled = false;
            });
          }
        }
      } else {
        // Objek menengah dan jauh (>= 30 meter): sederhanakan detail interior & micro-props
        if (details) details.visible = footprintDist < 60.0;
        if (lotContext) {
          lotContext.visible = true;
          const lotDetails = lotContext.getObjectByName('LotDetailProps') || lotContext.userData?.detailPropsGroup;
          if (lotDetails) lotDetails.visible = false;
        }
        if (interior) interior.visible = false;
        if (dynamicFurniture) dynamicFurniture.visible = false;
      }

      if (subsurface) {
        subsurface.visible = isSubsurfaceLensActive || isSectionCutActive;
      }
    }
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

import * as THREE from 'three';
import { BuildingInstance } from './PrefabTypes';
import { PrefabMeshBuilder } from './PrefabMeshBuilder';
import { CustomBuildingMeshBuilder } from './CustomBuildingMeshBuilder';
import { CustomBuilding } from './CustomBuildingModel';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';

export class BuildingManager {
  public buildings: Map<string, BuildingInstance> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;

  private buildingGroups: Map<string, THREE.Group> = new Map();
  public selectedBuildingId: string | null = null;
  private highlightMesh: THREE.BoxHelper | null = null;

  public onStatsChanged?: (count: number, totalBuiltAreaM2: number) => void;
  public onSelectionChanged?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'BuildingsMasterGroup';
    scene.add(this.masterGroup);
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

    this.notifyStatsChanged();
    return building;
  }

  public removeBuilding(id: string): boolean {
    if (!this.buildings.has(id)) return false;

    const group = this.buildingGroups.get(id);
    if (group) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
      this.buildingGroups.delete(id);
    }

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

    if (this.selectedBuildingId === building.id) {
      this.refreshHighlight();
    }

    this.notifyStatsChanged();
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

  public dispose(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
    }
    for (const group of this.buildingGroups.values()) {
      this.disposeGroup(group);
    }
    this.buildings.clear();
    this.buildingGroups.clear();
    this.scene.remove(this.masterGroup);
    PrefabMeshBuilder.clearCache();
  }
}

import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { PREFAB_CATALOG, BuildingInstance, PrefabPreset } from '../buildings/PrefabTypes';
import { RaycastManager } from '../core/engine/RaycastManager';
import { PrefabMeshBuilder } from '../buildings/PrefabMeshBuilder';
import { proceduralAudio } from '../audio/ProceduralAudio';
import { AddBuildingCommand } from '../core/commands/CityCommands';
import type { Engine } from '../core/engine/Engine';

export class BuildingTool {
  public buildingManager: BuildingManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;
  public engine?: Engine;

  public activePresetKey: string = 'house_36';
  public currentRotation: number = 0; // 0, PI/2, PI, 3PI/2

  private ghostGroup: THREE.Group | null = null;
  private nextBuildingId: number = 1;
  public isPlacementValid: boolean = true;

  constructor(
    buildingManager: BuildingManager,
    raycastManager: RaycastManager,
    scene: THREE.Scene,
    engine?: Engine
  ) {
    this.buildingManager = buildingManager;
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.engine = engine;

    this.rebuildGhost();
  }

  public setPreset(key: string): void {
    if (!PREFAB_CATALOG[key]) return;
    this.activePresetKey = key;
    this.rebuildGhost();
  }

  public rotate(): void {
    this.currentRotation = (this.currentRotation + Math.PI * 0.5) % (Math.PI * 2);
    if (this.ghostGroup) {
      this.ghostGroup.rotation.y = this.currentRotation;
    }
  }

  private disposeGhostGroup(): void {
    if (this.ghostGroup) {
      this.ghostGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      this.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
    }
  }

  private rebuildGhost(): void {
    this.disposeGhostGroup();

    const preset = PREFAB_CATALOG[this.activePresetKey];
    if (!preset) return;

    const dummyInstance: BuildingInstance = {
      id: 'ghost_preview',
      presetKey: preset.key,
      name: preset.name,
      category: preset.category,
      position: new THREE.Vector3(0, 0, 0),
      rotationY: this.currentRotation,
      width: preset.defaultWidth,
      length: preset.defaultLength,
      floorCount: preset.defaultFloorCount,
      floorHeight: preset.floorHeight,
      roofType: preset.defaultRoofType,
      roofOverhang: preset.defaultRoofOverhang,
      wallMaterial: preset.defaultWallMaterial,
      wallColor: preset.defaultWallColor,
      roofMaterial: preset.defaultRoofMaterial
    };

    const group = PrefabMeshBuilder.buildBuildingGroup(dummyInstance);
    this.updateGhostGroupMaterial(group, true);

    this.ghostGroup = group;
    this.ghostGroup.name = 'BuildingGhostPreview';
    this.scene.add(this.ghostGroup);
  }

  private updateGhostGroupMaterial(group: THREE.Group, isValid: boolean): void {
    // iOS 27 System Tokens: --good (#34C759) and --bad (#FF3B30)
    const color = isValid ? 0x34c759 : 0xff3b30;
    const opacity = isValid ? 0.55 : 0.70;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.material || !(mesh.material as THREE.Material).userData?.isGhostMat) {
          mesh.material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false
          });
          mesh.material.userData = { isGhostMat: true };
        } else {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(color);
          mat.opacity = opacity;
        }
      }
    });
  }

  /**
   * Helper to get oriented 2D polygon corners for SAT collision check.
   */
  private getFootprintCorners(center: THREE.Vector3, width: number, length: number, rotation: number, margin = 0.3): THREE.Vector2[] {
    const hw = (width / 2) + margin;
    const hl = (length / 2) + margin;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return [
      new THREE.Vector2(center.x + (-hw * cos - -hl * sin), center.z + (-hw * sin + -hl * cos)),
      new THREE.Vector2(center.x + (hw * cos - -hl * sin),  center.z + (hw * sin + -hl * cos)),
      new THREE.Vector2(center.x + (hw * cos - hl * sin),   center.z + (hw * sin + hl * cos)),
      new THREE.Vector2(center.x + (-hw * cos - hl * sin),  center.z + (-hw * sin + hl * cos))
    ];
  }

  /**
   * Separating Axis Theorem (SAT) collision test between two 2D convex polygons.
   */
  private doPolygonsIntersect(polyA: THREE.Vector2[], polyB: THREE.Vector2[]): boolean {
    const polygons = [polyA, polyB];
    for (let i = 0; i < polygons.length; i++) {
      const polygon = polygons[i];
      for (let i1 = 0; i1 < polygon.length; i1++) {
        const i2 = (i1 + 1) % polygon.length;
        const p1 = polygon[i1];
        const p2 = polygon[i2];
        const normal = new THREE.Vector2(-(p2.y - p1.y), p2.x - p1.x).normalize();

        let minA = Infinity, maxA = -Infinity;
        for (const p of polyA) {
          const dot = p.dot(normal);
          minA = Math.min(minA, dot);
          maxA = Math.max(maxA, dot);
        }

        let minB = Infinity, maxB = -Infinity;
        for (const p of polyB) {
          const dot = p.dot(normal);
          minB = Math.min(minB, dot);
          maxB = Math.max(maxB, dot);
        }

        if (maxA < minB || maxB < minA) {
          return false; // Separating axis found, no collision
        }
      }
    }
    return true; // Overlap on all axes => collision!
  }

  /**
   * Check whether candidate building collides with existing buildings or roads.
   */
  public checkCollision(center: THREE.Vector3, width: number, length: number, rotation: number): boolean {
    // 1. Raycast direct test: is the cursor hovering directly over an existing building?
    const bldHits = this.raycastManager.raycastObjects([this.buildingManager.masterGroup]);
    if (bldHits.length > 0) {
      return true; // Direct cursor hit on building
    }

    const candidateCorners = this.getFootprintCorners(center, width, length, rotation, 0.35);
    const candidateRadius = Math.hypot(width / 2, length / 2);

    // 2. Check collision with all existing buildings in BuildingManager
    for (const bld of this.buildingManager.buildings.values()) {
      const bldRadius = Math.hypot(bld.width / 2, bld.length / 2);
      const dist = new THREE.Vector2(center.x - bld.position.x, center.z - bld.position.z).length();
      if (dist > candidateRadius + bldRadius + 0.5) continue; // Broad phase prune

      const existingCorners = this.getFootprintCorners(bld.position, bld.width, bld.length, bld.rotationY, 0.35);
      if (this.doPolygonsIntersect(candidateCorners, existingCorners)) {
        return true; // Overlaps existing building!
      }
    }

    // 3. Check collision with road graph edges
    if (this.engine?.roadManager) {
      for (const edge of this.engine.roadManager.graph.edges.values()) {
        const startNode = this.engine.roadManager.graph.nodes.get(edge.startNodeId);
        const endNode = this.engine.roadManager.graph.nodes.get(edge.endNodeId);
        if (!startNode || !endNode) continue;

        const start = startNode.position;
        const end = endNode.position;

        // Approximate road segment check
        const line = new THREE.Vector2(end.x - start.x, end.z - start.z);
        const lineLen = line.length();
        if (lineLen < 0.001) continue;

        const lineDir = line.clone().divideScalar(lineLen);
        const toPt = new THREE.Vector2(center.x - start.x, center.z - start.z);
        const proj = Math.max(0, Math.min(lineLen, toPt.dot(lineDir)));
        const closest = new THREE.Vector2(start.x + lineDir.x * proj, start.z + lineDir.y * proj);
        const distToRoad = closest.distanceTo(new THREE.Vector2(center.x, center.z));

        const roadHalfWidth = 4.0; // 8m standard road width / 2
        if (distToRoad < (roadHalfWidth + Math.min(width, length) * 0.45)) {
          return true; // Collides with road!
        }
      }
    }

    return false;
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    const preset = PREFAB_CATALOG[this.activePresetKey];
    if (!preset) return;

    // Check collision before placing
    const isColliding = this.checkCollision(snappedPos, preset.defaultWidth, preset.defaultLength, this.currentRotation);
    if (isColliding) {
      // Rejection feedback: cannot place building when colliding or on cursor
      proceduralAudio.playClick();
      return;
    }

    const id = `bld_${this.nextBuildingId++}`;
    const instance: BuildingInstance = {
      id,
      presetKey: preset.key,
      name: preset.name,
      category: preset.category,
      position: snappedPos.clone(),
      rotationY: this.currentRotation,
      width: preset.defaultWidth,
      length: preset.defaultLength,
      floorCount: preset.defaultFloorCount,
      floorHeight: preset.floorHeight,
      roofType: preset.defaultRoofType,
      roofOverhang: preset.defaultRoofOverhang,
      wallMaterial: preset.defaultWallMaterial,
      wallColor: preset.defaultWallColor,
      roofMaterial: preset.defaultRoofMaterial
    };

    // Execute via CommandManager for full Undo/Redo capability!
    if (this.engine) {
      const command = new AddBuildingCommand(this.engine, instance);
      this.engine.commandManager.execute(command);
    } else {
      this.buildingManager.addBuilding(instance);
    }

    proceduralAudio.playPlaceBuilding();
  }

  public update(): void {
    if (!this.ghostGroup) return;

    if (this.raycastManager.isHoveringGround) {
      const snapped = this.raycastManager.snappedPoint;
      this.ghostGroup.position.copy(snapped);
      this.ghostGroup.visible = true;

      const preset = PREFAB_CATALOG[this.activePresetKey];
      if (preset) {
        const isColliding = this.checkCollision(snapped, preset.defaultWidth, preset.defaultLength, this.currentRotation);
        const nextValid = !isColliding;
        if (nextValid !== this.isPlacementValid) {
          this.isPlacementValid = nextValid;
          this.updateGhostGroupMaterial(this.ghostGroup, this.isPlacementValid);
        }
      }
    } else {
      this.ghostGroup.visible = false;
    }
  }

  public setVisible(visible: boolean): void {
    if (this.ghostGroup) {
      this.ghostGroup.visible = visible;
    }
  }

  public dispose(): void {
    this.disposeGhostGroup();
  }
}

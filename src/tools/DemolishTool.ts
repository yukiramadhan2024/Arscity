import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { DemolishCommand, DemolishTargetType } from '../core/commands/TerraformCommands';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';

export class DemolishTool {
  private engine: Engine;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  private hoveredTarget: { type: DemolishTargetType; id: string } | null = null;
  private highlightBox: THREE.Box3Helper;
  private targetBox: THREE.Box3 = new THREE.Box3();

  constructor(engine: Engine, raycastManager: RaycastManager, scene: THREE.Scene) {
    this.engine = engine;
    this.raycastManager = raycastManager;
    this.scene = scene;

    this.highlightBox = new THREE.Box3Helper(this.targetBox, new THREE.Color(0xff3b30));
    this.highlightBox.name = 'DemolishHighlightBox';
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);
  }

  public handleClick(): void {
    if (!this.hoveredTarget) return;

    const cmd = new DemolishCommand(this.engine, this.hoveredTarget.type, this.hoveredTarget.id);
    this.engine.commandManager.execute(cmd);

    // Audio & vibration
    proceduralAudio.playTaptic('boundary');
    this.clearHighlight();
  }

  public update(): void {
    // 1. Raycast for potential targets (buildings, roads, landscape, rivers)
    const buildingMeshes: THREE.Object3D[] = [];
    this.engine.buildingManager.masterGroup.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) buildingMeshes.push(c);
    });

    const roadMeshes: THREE.Object3D[] = [];
    this.engine.roadManager.masterGroup.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) roadMeshes.push(c);
    });

    const landscapeMeshes: THREE.Object3D[] = [];
    this.engine.landscapeManager.masterGroup.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) landscapeMeshes.push(c);
    });

    const riverMeshes: THREE.Object3D[] = [];
    if (this.engine.riverManager) {
      this.engine.riverManager.masterGroup.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) riverMeshes.push(c);
      });
    }

    // Check buildings first
    const bldHits = this.raycastManager.raycastObjects(buildingMeshes);
    if (bldHits.length > 0) {
      let curr: THREE.Object3D | null = bldHits[0].object;
      let bldId: string | null = null;
      while (curr && curr !== this.engine.buildingManager.masterGroup) {
        if (curr.userData && curr.userData.buildingId) {
          bldId = curr.userData.buildingId;
          break;
        }
        curr = curr.parent;
      }
      if (bldId) {
        this.setHoveredTarget('building', bldId, curr || bldHits[0].object);
        return;
      }
    }

    // Check roads
    const roadHits = this.raycastManager.raycastObjects(roadMeshes);
    if (roadHits.length > 0) {
      let curr: THREE.Object3D | null = roadHits[0].object;
      let edgeId: string | null = null;
      while (curr && curr !== this.engine.roadManager.masterGroup) {
        if (curr.userData && curr.userData.edgeId) {
          edgeId = curr.userData.edgeId;
          break;
        }
        curr = curr.parent;
      }
      if (edgeId) {
        this.setHoveredTarget('road', edgeId, curr || roadHits[0].object);
        return;
      }
    }

    // Check landscape items
    const landHits = this.raycastManager.raycastObjects(landscapeMeshes);
    if (landHits.length > 0) {
      let curr: THREE.Object3D | null = landHits[0].object;
      let itemId: string | null = null;
      while (curr && curr !== this.engine.landscapeManager.masterGroup) {
        if (curr.userData && curr.userData.itemId) {
          itemId = curr.userData.itemId;
          break;
        }
        curr = curr.parent;
      }
      if (itemId) {
        this.setHoveredTarget('landscape', itemId, curr || landHits[0].object);
        return;
      }
    }

    // Check rivers
    const riverHits = this.raycastManager.raycastObjects(riverMeshes);
    if (riverHits.length > 0) {
      let curr: THREE.Object3D | null = riverHits[0].object;
      let riverId: string | null = null;
      while (curr && curr !== this.engine.riverManager?.masterGroup) {
        if (curr?.name.startsWith('RiverSegment_')) {
          riverId = curr.name.replace('RiverSegment_', '');
          break;
        }
        curr = curr ? curr.parent : null;
      }
      if (riverId) {
        this.setHoveredTarget('river', riverId, curr || riverHits[0].object);
        return;
      }
    }

    this.clearHighlight();
  }

  private setHoveredTarget(type: DemolishTargetType, id: string, object: THREE.Object3D): void {
    this.hoveredTarget = { type, id };
    this.targetBox.setFromObject(object);
    this.highlightBox.visible = true;
  }

  private clearHighlight(): void {
    this.hoveredTarget = null;
    this.highlightBox.visible = false;
  }

  public dispose(): void {
    this.clearHighlight();
    this.scene.remove(this.highlightBox);
  }
}

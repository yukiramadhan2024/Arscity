import * as THREE from 'three';
import { RoadManager } from '../roads/RoadManager';
import { RoadType, ROAD_PROFILES } from '../roads/RoadTypes';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';

export class RoadTool {
  public roadManager: RoadManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public activeRoadType: RoadType = 'collector';
  public drawMode: 'straight' | 'bezier' = 'straight';

  public isDrawing: boolean = false;
  private startPoint: THREE.Vector3 | null = null;
  private midControlPoint: THREE.Vector3 | null = null;

  // Ghost preview mesh
  private ghostMesh: THREE.Mesh;
  private ghostMaterialValid: THREE.MeshBasicMaterial;
  private ghostMaterialInvalid: THREE.MeshBasicMaterial;

  public currentRoadLength: number = 0;
  public isValidPlacement: boolean = false;
  public onLengthUpdate?: (length: number, isValid: boolean) => void;

  constructor(roadManager: RoadManager, raycastManager: RaycastManager, scene: THREE.Scene) {
    this.roadManager = roadManager;
    this.raycastManager = raycastManager;
    this.scene = scene;

    // iOS 27 System Tokens: --good (#34C759) and --bad (#FF3B30)
    this.ghostMaterialValid = new THREE.MeshBasicMaterial({
      color: 0x34c759,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.ghostMaterialInvalid = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const geom = new THREE.PlaneGeometry(1, 1);
    this.ghostMesh = new THREE.Mesh(geom, this.ghostMaterialValid);
    this.ghostMesh.visible = false;
    this.ghostMesh.name = 'RoadGhostPreview';
    scene.add(this.ghostMesh);
  }

  public setRoadType(type: RoadType): void {
    this.activeRoadType = type;
  }

  public setDrawMode(mode: 'straight' | 'bezier'): void {
    this.drawMode = mode;
    this.cancelDrawing();
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    // Check if snapping to existing node
    const closeNode = this.roadManager.graph.findClosestNode(snappedPos, 2.5);
    const targetPos = closeNode ? closeNode.position.clone() : snappedPos.clone();
    targetPos.y = 0;

    if (!this.isDrawing) {
      // Step 1: Start point
      this.isDrawing = true;
      this.startPoint = targetPos;
      this.ghostMesh.visible = true;
    } else {
      if (this.drawMode === 'straight') {
        // Step 2 (straight): Finish road
        if (this.startPoint && this.isValidPlacement) {
          this.roadManager.addRoad(this.startPoint, targetPos, this.activeRoadType);
          proceduralAudio.playPlaceRoad();
          // Chain drawing: start next road from this end point
          this.startPoint = targetPos;
        }
      } else {
        // Bezier mode
        if (!this.midControlPoint) {
          // Step 2 (bezier): Set curve mid point
          this.midControlPoint = targetPos;
        } else {
          // Step 3 (bezier): Finish curved road
          if (this.startPoint && this.isValidPlacement) {
            const p0 = this.startPoint;
            const p3 = targetPos;
            const p1 = new THREE.Vector3().lerpVectors(p0, this.midControlPoint, 0.65);
            const p2 = new THREE.Vector3().lerpVectors(this.midControlPoint, p3, 0.35);

            this.roadManager.addRoad(p0, p3, this.activeRoadType, [p0, p1, p2, p3]);
            proceduralAudio.playPlaceRoad();
            this.startPoint = targetPos;
            this.midControlPoint = null;
          }
        }
      }
    }
  }

  public update(): void {
    if (!this.isDrawing || !this.startPoint) {
      this.ghostMesh.visible = false;
      return;
    }

    const hoverPos = this.raycastManager.snappedPoint.clone();
    hoverPos.y = 0;

    // Check if hovering near existing node for magnetic snap preview
    const closeNode = this.roadManager.graph.findClosestNode(hoverPos, 2.5);
    const currentEnd = closeNode ? closeNode.position.clone() : hoverPos;
    currentEnd.y = 0;

    const dist = this.startPoint.distanceTo(currentEnd);
    this.currentRoadLength = dist;

    // Minimum road length is 3.5m
    this.isValidPlacement = dist >= 3.5;

    if (this.onLengthUpdate) {
      this.onLengthUpdate(this.currentRoadLength, this.isValidPlacement);
    }

    this.ghostMesh.material = this.isValidPlacement ? this.ghostMaterialValid : this.ghostMaterialInvalid;
    this.ghostMesh.visible = true;

    // Rebuild ribbon geometry for ghost
    const profile = ROAD_PROFILES[this.activeRoadType];
    const width = profile.width;

    const segments = 16;
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const indices: number[] = [];

    let p0 = this.startPoint;
    let p3 = currentEnd;
    let p1 = new THREE.Vector3().lerpVectors(p0, p3, 0.33);
    let p2 = new THREE.Vector3().lerpVectors(p0, p3, 0.67);

    if (this.midControlPoint) {
      p1 = new THREE.Vector3().lerpVectors(p0, this.midControlPoint, 0.65);
      p2 = new THREE.Vector3().lerpVectors(this.midControlPoint, p3, 0.35);
    }

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = this.sampleCubic(p0, p1, p2, p3, t);

      // Tangent
      const tNext = Math.min(1, t + 0.01);
      const ptNext = this.sampleCubic(p0, p1, p2, p3, tNext);
      const tan = new THREE.Vector3().subVectors(ptNext, pt).normalize();
      const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

      const left = pt.clone().addScaledVector(norm, -width * 0.5);
      const right = pt.clone().addScaledVector(norm, width * 0.5);

      const baseIdx = i * 2;
      positions[baseIdx * 3] = left.x;
      positions[baseIdx * 3 + 1] = 0.08;
      positions[baseIdx * 3 + 2] = left.z;

      positions[(baseIdx + 1) * 3] = right.x;
      positions[(baseIdx + 1) * 3 + 1] = 0.08;
      positions[(baseIdx + 1) * 3 + 2] = right.z;

      if (i < segments) {
        indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
        indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
      }
    }

    this.ghostMesh.geometry.dispose();
    const newGeom = new THREE.BufferGeometry();
    newGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    newGeom.setIndex(indices);
    newGeom.computeVertexNormals();
    this.ghostMesh.geometry = newGeom;
  }

  private sampleCubic(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const u = 1 - t;
    return new THREE.Vector3(
      u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      0,
      u * u * u * p0.z + 3 * u * u * t * p1.z + 3 * u * t * t * p2.z + t * t * t * p3.z
    );
  }

  public cancelDrawing(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.midControlPoint = null;
    this.ghostMesh.visible = false;
    if (this.onLengthUpdate) this.onLengthUpdate(0, false);
  }

  public dispose(): void {
    this.cancelDrawing();
    this.scene.remove(this.ghostMesh);
    this.ghostMesh.geometry.dispose();
    this.ghostMaterialValid.dispose();
    this.ghostMaterialInvalid.dispose();
  }
}

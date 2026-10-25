import * as THREE from 'three';
import { RoadManager } from '../roads/RoadManager';
import { RoadType, ROAD_PROFILES } from '../roads/RoadTypes';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';
import { RoadMaterialHelper } from '../roads/RoadMaterialHelper';

export class RoadTool {
  public roadManager: RoadManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public activeRoadType: RoadType = 'collector';
  public drawMode: 'straight' | 'bezier' = 'straight';

  public isDrawing: boolean = false;
  public startPoint: THREE.Vector3 | null = null;
  private midControlPoint: THREE.Vector3 | null = null;

  // Ghost preview mesh & measurement guide lines
  private ghostMesh: THREE.Mesh;
  private guideGroup: THREE.Group;
  private centerGuideLine: THREE.Line;
  private leftGuideLine: THREE.Line;
  private rightGuideLine: THREE.Line;
  private lineMatCenter: THREE.LineDashedMaterial;
  private lineMatEdges: THREE.LineBasicMaterial;

  public currentRoadLength: number = 0;
  public isValidPlacement: boolean = false;
  public onLengthUpdate?: (length: number, isValid: boolean) => void;

  constructor(roadManager: RoadManager, raycastManager: RaycastManager, scene: THREE.Scene) {
    this.roadManager = roadManager;
    this.raycastManager = raycastManager;
    this.scene = scene;

    const initialMat = RoadMaterialHelper.getPreviewMaterial(this.activeRoadType, true);
    const geom = new THREE.BufferGeometry();
    this.ghostMesh = new THREE.Mesh(geom, initialMat);
    this.ghostMesh.visible = false;
    this.ghostMesh.name = 'RoadGhostPreview';
    scene.add(this.ghostMesh);

    // Measurement guides: dashed centerline and edge guides
    this.guideGroup = new THREE.Group();
    this.guideGroup.name = 'RoadGhostGuides';
    this.guideGroup.visible = false;

    this.lineMatCenter = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 1.5,
      gapSize: 1.0,
      linewidth: 1,
      transparent: true,
      opacity: 0.95
    });

    this.lineMatEdges = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 1,
      transparent: true,
      opacity: 0.8
    });

    this.centerGuideLine = new THREE.Line(new THREE.BufferGeometry(), this.lineMatCenter);
    this.leftGuideLine = new THREE.Line(new THREE.BufferGeometry(), this.lineMatEdges);
    this.rightGuideLine = new THREE.Line(new THREE.BufferGeometry(), this.lineMatEdges);

    this.guideGroup.add(this.centerGuideLine);
    this.guideGroup.add(this.leftGuideLine);
    this.guideGroup.add(this.rightGuideLine);
    scene.add(this.guideGroup);

    this.updateGuideStyles();
  }

  public setRoadType(type: RoadType): void {
    this.activeRoadType = type;
    this.updateGuideStyles();
  }

  private updateGuideStyles(): void {
    if (this.activeRoadType === 'pedestrian') {
      this.centerGuideLine.visible = false;
      this.lineMatEdges.color.setHex(0x94a3b8);
    } else if (this.activeRoadType === 'alley') {
      this.centerGuideLine.visible = false;
      this.lineMatEdges.color.setHex(0xe2e8f0);
    } else if (this.activeRoadType === 'cycle') {
      this.centerGuideLine.visible = true;
      this.lineMatCenter.color.setHex(0xffffff);
      this.lineMatEdges.color.setHex(0x22c55e);
    } else if (this.activeRoadType === 'collector' || this.activeRoadType === 'arterial') {
      this.centerGuideLine.visible = true;
      this.lineMatCenter.color.setHex(0xf59e0b);
      this.lineMatEdges.color.setHex(0x38bdf8);
    } else {
      // local
      this.centerGuideLine.visible = true;
      this.lineMatCenter.color.setHex(0xffffff);
      this.lineMatEdges.color.setHex(0x38bdf8);
    }
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

    this.ghostMesh.material = RoadMaterialHelper.getPreviewMaterial(this.activeRoadType, this.isValidPlacement);
    this.ghostMesh.visible = true;

    // Rebuild ribbon geometry for ghost
    const profile = ROAD_PROFILES[this.activeRoadType];
    const width = profile.width;

    const segments = 24;
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const uvs = new Float32Array((segments + 1) * 2 * 2);
    const indices: number[] = [];

    const centerPts: THREE.Vector3[] = [];
    const leftPts: THREE.Vector3[] = [];
    const rightPts: THREE.Vector3[] = [];

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

      centerPts.push(new THREE.Vector3(pt.x, 0.095, pt.z));
      leftPts.push(new THREE.Vector3(left.x, 0.095, left.z));
      rightPts.push(new THREE.Vector3(right.x, 0.095, right.z));

      const baseIdx = i * 2;
      positions[baseIdx * 3] = left.x;
      positions[baseIdx * 3 + 1] = 0.08;
      positions[baseIdx * 3 + 2] = left.z;
      uvs[baseIdx * 2] = 0;
      uvs[baseIdx * 2 + 1] = t * (dist * 0.4);

      positions[(baseIdx + 1) * 3] = right.x;
      positions[(baseIdx + 1) * 3 + 1] = 0.08;
      positions[(baseIdx + 1) * 3 + 2] = right.z;
      uvs[(baseIdx + 1) * 2] = 1;
      uvs[(baseIdx + 1) * 2 + 1] = t * (dist * 0.4);

      if (i < segments) {
        // Segitiga menghadap ke atas (+Y)
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
      }
    }

    this.ghostMesh.geometry.dispose();
    const newGeom = new THREE.BufferGeometry();
    newGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    newGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    newGeom.setIndex(indices);
    newGeom.computeVertexNormals();
    this.ghostMesh.geometry = newGeom;

    // Update measurement guide lines
    this.centerGuideLine.geometry.dispose();
    this.centerGuideLine.geometry = new THREE.BufferGeometry().setFromPoints(centerPts);
    this.centerGuideLine.computeLineDistances();

    this.leftGuideLine.geometry.dispose();
    this.leftGuideLine.geometry = new THREE.BufferGeometry().setFromPoints(leftPts);

    this.rightGuideLine.geometry.dispose();
    this.rightGuideLine.geometry = new THREE.BufferGeometry().setFromPoints(rightPts);

    this.guideGroup.visible = this.isValidPlacement;
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
    if (this.guideGroup) this.guideGroup.visible = false;
    if (this.onLengthUpdate) this.onLengthUpdate(0, false);
  }

  public dispose(): void {
    this.cancelDrawing();
    this.scene.remove(this.ghostMesh);
    if (this.guideGroup) {
      this.scene.remove(this.guideGroup);
      this.centerGuideLine.geometry.dispose();
      this.leftGuideLine.geometry.dispose();
      this.rightGuideLine.geometry.dispose();
      this.lineMatCenter.dispose();
      this.lineMatEdges.dispose();
    }
    this.ghostMesh.geometry.dispose();
  }
}

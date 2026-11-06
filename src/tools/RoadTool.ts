import * as THREE from 'three';
import { RoadManager } from '../roads/RoadManager';
import { RoadType, ROAD_PROFILES } from '../roads/RoadTypes';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';
import { RoadMaterialHelper } from '../roads/RoadMaterialHelper';
import { showSnackbar } from '../ui/state/useSnackbarStore';

export class RoadTool {
  public static readonly SNAP_RADIUS = 8.0;

  public roadManager: RoadManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public activeRoadType: RoadType = 'collector';
  public drawMode: 'straight' | 'bezier' = 'straight';

  public isDrawing: boolean = false;
  public startPoint: THREE.Vector3 | null = null;
  public startSnapTangent: THREE.Vector3 | null = null;
  private midControlPoint: THREE.Vector3 | null = null;

  // Magnetic continuation & junction snap markers (Crimson Pink #FD6E8E & Seal Blue #DBF2FC)
  public snapMarkersGroup: THREE.Group;
  private lastSnapGraphKey: string = '';

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

    this.snapMarkersGroup = new THREE.Group();
    this.snapMarkersGroup.name = 'RoadSnapMarkersGroup';
    this.snapMarkersGroup.visible = false;
    scene.add(this.snapMarkersGroup);

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

  public setVisible(visible: boolean): void {
    this.snapMarkersGroup.visible = visible;
    if (visible) {
      this.rebuildSnapMarkers(true);
    } else {
      this.cancelDrawing();
    }
  }

  private disposeSnapMarkers(): void {
    while (this.snapMarkersGroup.children.length > 0) {
      const child = this.snapMarkersGroup.children[0];
      this.snapMarkersGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh || (obj as THREE.Line).isLine) {
          (obj as THREE.Mesh).geometry?.dispose();
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        }
      });
    }
  }

  /**
   * Builds Crimson Pink (#FD6E8E) and Seal Blue (#DBF2FC) magnetic continuation rings/boxes
   * at every dead-end node and intersection across the city, plus dashed continuation direction guides.
   */
  public rebuildSnapMarkers(force = false): void {
    const key = `${this.roadManager.graph.nodes.size}:${this.roadManager.graph.edges.size}`;
    if (!force && key === this.lastSnapGraphKey) return;
    this.lastSnapGraphKey = key;

    this.disposeSnapMarkers();

    for (const node of this.roadManager.graph.nodes.values()) {
      if (node.connectedEdgeIds.length === 0) continue;
      const isDeadEnd = node.connectedEdgeIds.length === 1;
      const groundY = this.roadManager.terrain
        ? Math.max(0, this.roadManager.terrain.getHeightAt(node.position.x, node.position.z))
        : 0;

      const markerHolder = new THREE.Group();
      markerHolder.name = isDeadEnd ? `DeadEndSnap_${node.id}` : `JunctionSnap_${node.id}`;
      markerHolder.position.set(node.position.x, groundY + 0.16, node.position.z);
      markerHolder.userData = { nodeId: node.id, isDeadEnd };

      if (isDeadEnd) {
        // Dead-end magnetic box (Crimson Pink #FD6E8E) + Seal Blue (#DBF2FC) outer ring
        const boxGeom = new THREE.PlaneGeometry(2.6, 2.6);
        boxGeom.rotateX(-Math.PI / 2);
        const boxMat = new THREE.MeshBasicMaterial({
          color: 0xfd6e8e,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3
        });
        const boxMesh = new THREE.Mesh(boxGeom, boxMat);
        boxMesh.name = 'SnapDeadEndPad';

        const outerRingGeom = new THREE.RingGeometry(2.1, 2.75, 28);
        outerRingGeom.rotateX(-Math.PI / 2);
        const outerRingMat = new THREE.MeshBasicMaterial({
          color: 0xdbf2fc,
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3
        });
        const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat);
        outerRing.name = 'SnapOuterRing';

        const outgoingTan = this.roadManager.getNodeOutgoingTangent(node.id);
        if (outgoingTan) {
          boxMesh.rotation.y = Math.atan2(outgoingTan.x, outgoingTan.z);

          // Dashed continuation preview line extending 14m along outgoing road direction
          const dashPts = [
            new THREE.Vector3(0, 0.04, 0),
            new THREE.Vector3(outgoingTan.x * 14.0, 0.04, outgoingTan.z * 14.0)
          ];
          const dashGeom = new THREE.BufferGeometry().setFromPoints(dashPts);
          const dashMat = new THREE.LineDashedMaterial({
            color: 0xfd6e8e,
            dashSize: 1.4,
            gapSize: 0.9,
            transparent: true,
            opacity: 0.92
          });
          const dashLine = new THREE.Line(dashGeom, dashMat);
          dashLine.name = 'ContinuationGuideLine';
          dashLine.computeLineDistances();
          markerHolder.add(dashLine);
        }

        markerHolder.add(boxMesh);
        markerHolder.add(outerRing);
      } else {
        // Intersection magnetic ring (Seal Blue #DBF2FC outer + Crimson Pink #FD6E8E inner)
        const jOuterGeom = new THREE.RingGeometry(2.7, 3.4, 32);
        jOuterGeom.rotateX(-Math.PI / 2);
        const jOuterMat = new THREE.MeshBasicMaterial({
          color: 0xdbf2fc,
          transparent: true,
          opacity: 0.92,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3
        });
        const jOuter = new THREE.Mesh(jOuterGeom, jOuterMat);
        jOuter.name = 'SnapJunctionOuterRing';

        const jInnerGeom = new THREE.RingGeometry(1.1, 1.65, 24);
        jInnerGeom.rotateX(-Math.PI / 2);
        const jInnerMat = new THREE.MeshBasicMaterial({
          color: 0xfd6e8e,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3
        });
        const jInner = new THREE.Mesh(jInnerGeom, jInnerMat);
        jInner.name = 'SnapJunctionInnerRing';

        markerHolder.add(jOuter);
        markerHolder.add(jInner);
      }

      this.snapMarkersGroup.add(markerHolder);
    }
  }

  /**
   * Resolves magnetic continuation / junction / edge snap within 8.0m cursor radius
   * and applies collinear tangent alignment when extending a dead-end road straight ahead.
   */
  public resolveSnappedEndpoint(rawPos: THREE.Vector3): {
    point: THREE.Vector3;
    snappedNodeId: string | null;
    outgoingTangent: THREE.Vector3 | null;
  } {
    const pos = rawPos.clone();
    pos.y = 0;

    const snapNode = this.roadManager.findContinuationSnapNode(pos, RoadTool.SNAP_RADIUS);
    if (snapNode) {
      const locked = snapNode.position.clone();
      locked.y = 0;
      return {
        point: locked,
        snappedNodeId: snapNode.node.id,
        outgoingTangent: snapNode.outgoingTangent
      };
    }

    const nearEdge = this.roadManager.graph.findNearestEdgePoint(pos, 5.0);
    if (nearEdge) {
      const locked = nearEdge.point.clone();
      locked.y = 0;
      return {
        point: locked,
        snappedNodeId: null,
        outgoingTangent: null
      };
    }

    // Collinear tangent alignment when continuing from a dead-end node in straight mode
    if (this.isDrawing && this.startPoint && this.startSnapTangent && !this.midControlPoint) {
      const delta = pos.clone().sub(this.startPoint);
      delta.y = 0;
      const dist = delta.length();
      if (dist >= 3.5) {
        const dirNorm = delta.clone().divideScalar(dist);
        const cosAngle = dirNorm.dot(this.startSnapTangent);
        if (cosAngle >= 0.94) {
          const aligned = this.startPoint.clone().addScaledVector(this.startSnapTangent, dist);
          aligned.y = 0;
          return {
            point: aligned,
            snappedNodeId: null,
            outgoingTangent: null
          };
        }
      }
    }

    return {
      point: pos,
      snappedNodeId: null,
      outgoingTangent: null
    };
  }

  private buildAlignedControlPoints(
    p0: THREE.Vector3,
    p3: THREE.Vector3,
    endOutgoingTangent: THREE.Vector3 | null
  ): THREE.Vector3[] | undefined {
    if (this.midControlPoint) {
      const p1 = new THREE.Vector3().lerpVectors(p0, this.midControlPoint, 0.65);
      const p2 = new THREE.Vector3().lerpVectors(this.midControlPoint, p3, 0.35);
      return [p0.clone(), p1, p2, p3.clone()];
    }

    const delta = new THREE.Vector3().subVectors(p3, p0);
    delta.y = 0;
    const dist = delta.length();
    if (dist < 3.5) return undefined;
    const dirNorm = delta.clone().divideScalar(dist);

    let hasCustomTangent = false;
    let p1 = new THREE.Vector3().lerpVectors(p0, p3, 0.33);
    let p2 = new THREE.Vector3().lerpVectors(p0, p3, 0.67);

    if (this.startSnapTangent) {
      const dotStart = dirNorm.dot(this.startSnapTangent);
      if (dotStart > 0.08 && dotStart < 0.9995) {
        p1 = p0.clone().addScaledVector(this.startSnapTangent, dist * 0.36);
        hasCustomTangent = true;
      }
    }

    if (endOutgoingTangent) {
      // Road arrives into end node opposite its outgoing continuation tangent
      const negDir = dirNorm.clone().negate();
      const dotEnd = negDir.dot(endOutgoingTangent);
      if (dotEnd > 0.08 && dotEnd < 0.9995) {
        p2 = p3.clone().addScaledVector(endOutgoingTangent, dist * 0.36);
        hasCustomTangent = true;
      }
    }

    return hasCustomTangent ? [p0.clone(), p1, p2, p3.clone()] : undefined;
  }

  public setDrawMode(mode: 'straight' | 'bezier'): void {
    this.drawMode = mode;
    this.cancelDrawing();
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    const resolved = this.resolveSnappedEndpoint(snappedPos);
    const targetPos = resolved.point;

    if (!this.isDrawing) {
      // Step 1: Start point (capture outgoing continuation tangent if snapped to dead-end node)
      this.isDrawing = true;
      this.startPoint = targetPos;
      this.startSnapTangent = resolved.outgoingTangent ? resolved.outgoingTangent.clone() : null;
      this.ghostMesh.visible = true;
      proceduralAudio.playSnapTick();
    } else {
      if (this.drawMode === 'straight') {
        // Step 2 (straight): Finish road (with automatic tangent-aligned curve if turning from dead-end)
        const distNow = this.startPoint ? this.startPoint.distanceTo(targetPos) : 0;
        if (this.startPoint && (this.isValidPlacement || distNow >= 3.5)) {
          const alignedControlPts = this.buildAlignedControlPoints(
            this.startPoint,
            targetPos,
            resolved.outgoingTangent
          );
          const edge = this.roadManager.addRoad(
            this.startPoint,
            targetPos,
            this.activeRoadType,
            alignedControlPts
          );
          proceduralAudio.playPlaceRoad();
          proceduralAudio.playPlacementChord();

          const dist = Math.round(this.startPoint.distanceTo(targetPos));
          const prof = ROAD_PROFILES[this.activeRoadType];
          const width = prof?.width || 8;
          const roadName = prof?.name || `Jalan ${this.activeRoadType}`;
          const isBridge = Boolean(edge?.isBridge) || this.startPoint.y < -0.20 || targetPos.y < -0.20;
          const detail = isBridge
            ? `Panjang ${dist} m • Lebar ${width} m • Jembatan Otomatis Aktif`
            : `Panjang ${dist} m • Lebar ${width} m`;

          showSnackbar({
            variant: 'success',
            title: `${roadName} Dibangun`,
            detail,
            undoable: true,
            groupKey: `place_road_${this.activeRoadType}`,
          });

          this.isDrawing = false;
          this.startPoint = null;
          this.startSnapTangent = null;
          this.midControlPoint = null;
          this.ghostMesh.visible = false;
          if (this.guideGroup) this.guideGroup.visible = false;
          if (this.onLengthUpdate) this.onLengthUpdate(0, false);
          this.rebuildSnapMarkers(true);
        } else if (this.startPoint) {
          proceduralAudio.playTaptic('boundary');
          showSnackbar({
            variant: 'warning',
            title: 'Ruas Jalan Terlalu Pendek',
            detail: 'Panjang minimum 3,5 meter',
            groupKey: 'road_too_short',
          });
        }
      } else {
        // Bezier mode
        if (!this.midControlPoint) {
          // Step 2 (bezier): Set curve mid point
          this.midControlPoint = targetPos;
        } else {
          // Step 3 (bezier): Finish curved road
          const distNow = this.startPoint ? this.startPoint.distanceTo(targetPos) : 0;
          if (this.startPoint && (this.isValidPlacement || distNow >= 3.5)) {
            const p0 = this.startPoint;
            const p3 = targetPos;
            const p1 = new THREE.Vector3().lerpVectors(p0, this.midControlPoint, 0.65);
            const p2 = new THREE.Vector3().lerpVectors(this.midControlPoint, p3, 0.35);

            const edge = this.roadManager.addRoad(p0, p3, this.activeRoadType, [p0, p1, p2, p3]);
            proceduralAudio.playPlaceRoad();
            proceduralAudio.playPlacementChord();

            const dist = Math.round(p0.distanceTo(p3));
            const prof = ROAD_PROFILES[this.activeRoadType];
            const width = prof?.width || 8;
            const roadName = prof?.name || `Jalan Lengkung ${this.activeRoadType}`;
            const isBridge = Boolean(edge?.isBridge) || p0.y < -0.20 || p3.y < -0.20;
            const detail = isBridge
              ? `Panjang ${dist} m • Lebar ${width} m • Jembatan Otomatis Aktif`
              : `Panjang ${dist} m • Lebar ${width} m`;

            showSnackbar({
              variant: 'success',
              title: `${roadName} Dibangun`,
              detail,
              undoable: true,
              groupKey: `place_road_${this.activeRoadType}`,
            });

            this.isDrawing = false;
            this.startPoint = null;
            this.startSnapTangent = null;
            this.midControlPoint = null;
            this.ghostMesh.visible = false;
            if (this.guideGroup) this.guideGroup.visible = false;
            if (this.onLengthUpdate) this.onLengthUpdate(0, false);
            this.rebuildSnapMarkers(true);
          } else if (this.startPoint) {
            proceduralAudio.playTaptic('boundary');
            showSnackbar({
              variant: 'warning',
              title: 'Ruas Jalan Terlalu Pendek',
              detail: 'Panjang minimum 3,5 meter',
              groupKey: 'road_too_short',
            });
          }
        }
      }
    }
  }

  public update(): void {
    this.snapMarkersGroup.visible = true;
    this.rebuildSnapMarkers(false);

    const hoverRaw = this.raycastManager.snappedPoint.clone();
    hoverRaw.y = 0;
    const resolved = this.resolveSnappedEndpoint(hoverRaw);

    // Highlight active hovered snap marker within 8m radius
    for (const marker of this.snapMarkersGroup.children) {
      const isHovered = marker.userData?.nodeId && marker.userData.nodeId === resolved.snappedNodeId;
      marker.scale.setScalar(isHovered ? 1.28 : 1.0);
    }

    if (!this.isDrawing || !this.startPoint) {
      this.ghostMesh.visible = false;
      return;
    }

    const currentEnd = resolved.point;
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

    const p0 = this.startPoint;
    const p3 = currentEnd;
    const aligned = this.buildAlignedControlPoints(p0, p3, resolved.outgoingTangent);
    const p1 = aligned ? aligned[1] : new THREE.Vector3().lerpVectors(p0, p3, 0.33);
    const p2 = aligned ? aligned[2] : new THREE.Vector3().lerpVectors(p0, p3, 0.67);

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
    this.startSnapTangent = null;
    this.midControlPoint = null;
    this.ghostMesh.visible = false;
    if (this.guideGroup) this.guideGroup.visible = false;
    if (this.onLengthUpdate) this.onLengthUpdate(0, false);
  }

  public dispose(): void {
    this.cancelDrawing();
    this.disposeSnapMarkers();
    this.scene.remove(this.snapMarkersGroup);
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

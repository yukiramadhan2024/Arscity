import * as THREE from 'three';
import {
  BuildingInstance,
  BuildingSubPartDimensions,
  BuildingSubPartType
} from '../../buildings/PrefabTypes';
import { BuildingManager } from '../../buildings/BuildingManager';
import { PrefabMeshBuilder } from '../../buildings/PrefabMeshBuilder';
import { BuildingCatalogRegistry } from '../../buildings/BuildingCatalogRegistry';
import { UpdateBuildingParamCommand } from '../commands/CityCommands';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { ZONE_RULES } from '../../zones/ZoneTypes';
import type { Engine } from './Engine';

export type ActiveGizmoHandle =
  | 'floor'
  | 'overhang'
  | 'rotation'
  | 'subpart_width_right'
  | 'subpart_width_left'
  | 'subpart_depth_front'
  | 'roof_badge_up'
  | 'roof_badge_down'
  | null;

const SUBPART_LABELS_ID: Record<BuildingSubPartType, string> = {
  main_tower: 'Menara Utama',
  side_wing: 'Sayap Samping',
  podium_base: 'Podium Dasar',
  roof_crown: 'Mahkota Atap'
};

export interface GizmoDragState {
  handle: ActiveGizmoHandle;
  buildingId: string;
  subPart: BuildingSubPartType;
  startPointer: THREE.Vector2;
  startWorldPos: THREE.Vector3;
  initialFloorCount: number;
  initialOverhang: number;
  initialRotationY: number;
  initialSubPartDims: BuildingSubPartDimensions;
  initialSubPartsSnapshot?: Partial<Record<BuildingSubPartType, BuildingSubPartDimensions>>;
  lastSnapAngle: number;
  lastStepSoundMetric: number;
}

export class BuildingGizmoManager {
  private engine: Engine;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  public masterGroup: THREE.Group;
  private floorHandleMesh: THREE.Group | null = null;
  private roofBadgeUpMesh: THREE.Group | null = null;
  private roofBadgeDownMesh: THREE.Group | null = null;
  private widthRightHandleMesh: THREE.Group | null = null;
  private widthLeftHandleMesh: THREE.Group | null = null;
  private depthFrontHandleMesh: THREE.Group | null = null;
  private overhangHandleMesh: THREE.Group | null = null;
  private rotationRingMesh: THREE.Group | null = null;

  private activeHandle: ActiveGizmoHandle = null;
  private hoveredHandle: ActiveGizmoHandle = null;
  private dragState: GizmoDragState | null = null;

  private raycaster: THREE.Raycaster;
  private mousePos: THREE.Vector2 = new THREE.Vector2(-999, -999);
  private dragPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Live telemetry for floating HUD / UI
  public liveGizmoTelemetry: {
    active: boolean;
    type: ActiveGizmoHandle;
    label: string;
    value: string;
    secondary?: string;
    warning?: string;
  } = {
    active: false,
    type: null,
    label: '',
    value: ''
  };

  constructor(engine: Engine, scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.engine = engine;
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();

    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'BuildingGizmoMasterGroup';
    this.scene.add(this.masterGroup);

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
    }
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public update(): void {
    const selectedBld = this.engine.buildingManager.getSelectedBuilding();
    if (!selectedBld || this.engine.activeToolName !== 'select') {
      this.masterGroup.visible = false;
      this.liveGizmoTelemetry.active = false;
      return;
    }

    this.masterGroup.visible = true;
    const activeSubPart = this.engine.buildingManager.selectedSubPart || 'main_tower';

    // Check if gizmo needs rebuild or reposition
    if (
      this.masterGroup.userData.currentBuildingId !== selectedBld.id ||
      this.masterGroup.userData.currentSubPart !== activeSubPart
    ) {
      this.rebuildGizmoForBuilding(selectedBld, activeSubPart);
    } else {
      this.updateGizmoPositions(selectedBld, activeSubPart);
    }

    // Scale invariance: Keep gizmos visible and comfortably clickable at any camera zoom
    const dist = this.camera.position.distanceTo(selectedBld.position);
    const scaleFactor = Math.max(0.6, Math.min(2.5, dist * 0.04));

    if (this.floorHandleMesh) this.floorHandleMesh.scale.setScalar(scaleFactor);
    if (this.roofBadgeUpMesh) this.roofBadgeUpMesh.scale.setScalar(scaleFactor);
    if (this.roofBadgeDownMesh) this.roofBadgeDownMesh.scale.setScalar(scaleFactor);
    if (this.widthRightHandleMesh) this.widthRightHandleMesh.scale.setScalar(scaleFactor);
    if (this.widthLeftHandleMesh) this.widthLeftHandleMesh.scale.setScalar(scaleFactor);
    if (this.depthFrontHandleMesh) this.depthFrontHandleMesh.scale.setScalar(scaleFactor);
    if (this.overhangHandleMesh) {
      this.overhangHandleMesh.scale.setScalar(scaleFactor);
    }
    if (this.rotationRingMesh) {
      this.rotationRingMesh.position.set(selectedBld.position.x, 0.08, selectedBld.position.z);
    }
  }

  private rebuildGizmoForBuilding(bld: BuildingInstance, subPart: BuildingSubPartType = 'main_tower'): void {
    this.clearGizmoMeshes();
    this.masterGroup.userData.currentBuildingId = bld.id;
    this.masterGroup.userData.currentSubPart = subPart;

    // 1. Vertical Floor Extrusion Handle (Top of Selected Sub-Part Roof)
    this.floorHandleMesh = this.createFloorHandle();
    this.masterGroup.add(this.floorHandleMesh);

    // 1b. CityRT.com Floating Roof Badges [(^)] & [(v)] directly above sub-part roof
    this.roofBadgeUpMesh = this.createRoofStepBadge('[(^)] +Lt', 'roof_badge_up', '#FD6E8E', '#FFFFFF');
    this.masterGroup.add(this.roofBadgeUpMesh);

    this.roofBadgeDownMesh = this.createRoofStepBadge('[(v)] -Lt', 'roof_badge_down', '#DBF2FC', '#072D59');
    this.masterGroup.add(this.roofBadgeDownMesh);

    // 1c. Miniopolis Horizontal Sub-Part Resize Arrows (Left / Right Width + Front Depth)
    this.widthRightHandleMesh = this.createHorizontalResizeHandle('subpart_width_right', new THREE.Vector3(1, 0, 0), 0xfd6e8e);
    this.masterGroup.add(this.widthRightHandleMesh);

    this.widthLeftHandleMesh = this.createHorizontalResizeHandle('subpart_width_left', new THREE.Vector3(-1, 0, 0), 0xfd6e8e);
    this.masterGroup.add(this.widthLeftHandleMesh);

    this.depthFrontHandleMesh = this.createHorizontalResizeHandle('subpart_depth_front', new THREE.Vector3(0, 0, 1), 0xfd6e8e);
    this.masterGroup.add(this.depthFrontHandleMesh);

    // 2. Roof Overhang (Tritisan / Overstek) Handle
    this.overhangHandleMesh = this.createOverhangHandle();
    this.masterGroup.add(this.overhangHandleMesh);

    // 3. Rotation Ring Handle (Base of Building)
    this.rotationRingMesh = this.createRotationRing(bld);
    this.masterGroup.add(this.rotationRingMesh);

    this.updateGizmoPositions(bld, subPart);
  }

  private createRoofStepBadge(
    label: string,
    handleType: 'roof_badge_up' | 'roof_badge_down',
    bgHex: string,
    fgHex: string
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Gizmo_${handleType}`;
    group.userData = { isHandle: true, type: handleType };

    // Raycastable backing pill disc + billboard sprite
    const hitGeo = new THREE.BoxGeometry(1.45, 0.52, 0.25);
    const hitMat = new THREE.MeshBasicMaterial({
      color: bgHex === '#FD6E8E' ? 0xfd6e8e : 0xdbf2fc,
      transparent: true,
      opacity: 0.96,
      depthTest: false
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.renderOrder = 1001;
    hitMesh.userData = { isHandle: true, type: handleType, badgeLabel: label };
    group.add(hitMesh);

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgHex;
        ctx.strokeStyle = '#072D59';
        ctx.lineWidth = 6;
        const r = 42;
        ctx.beginPath();
        ctx.moveTo(8 + r, 8);
        ctx.lineTo(248 - r, 8);
        ctx.quadraticCurveTo(248, 8, 248, 8 + r);
        ctx.lineTo(248, 88 - r);
        ctx.quadraticCurveTo(248, 88, 248 - r, 88);
        ctx.lineTo(8 + r, 88);
        ctx.quadraticCurveTo(8, 88, 8, 88 - r);
        ctx.lineTo(8, 8 + r);
        ctx.quadraticCurveTo(8, 8, 8 + r, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = fgHex;
        ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 128, 49);

        const tex = new THREE.CanvasTexture(canvas);
        const sprMat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthTest: false,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(sprMat);
        sprite.scale.set(1.65, 0.62, 1);
        sprite.renderOrder = 1002;
        sprite.userData = { isHandle: true, type: handleType, badgeLabel: label };
        group.add(sprite);
        hitMesh.material.opacity = 0.02; // Invisible hit volume behind crisp sprite
      }
    }

    return group;
  }

  private createHorizontalResizeHandle(
    handleType: 'subpart_width_right' | 'subpart_width_left' | 'subpart_depth_front',
    dir: THREE.Vector3,
    colorHex: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `Gizmo_${handleType}`;
    group.userData = { isHandle: true, type: handleType };

    const stemGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.65, 12);
    stemGeom.translate(0, 0.325, 0);
    const stemMat = new THREE.MeshBasicMaterial({
      color: 0xdbf2fc,
      depthTest: false,
      transparent: true,
      opacity: 0.92
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.renderOrder = 998;
    stem.userData = { isHandle: true, type: handleType };

    const coneGeom = new THREE.ConeGeometry(0.28, 0.58, 16);
    coneGeom.translate(0, 0.88, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      depthTest: false,
      transparent: true,
      opacity: 0.96
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.renderOrder = 999;
    cone.userData = { isHandle: true, type: handleType };

    const arrowPivot = new THREE.Group();
    arrowPivot.add(stem);
    arrowPivot.add(cone);

    if (dir.x > 0) arrowPivot.rotation.z = -Math.PI / 2;
    else if (dir.x < 0) arrowPivot.rotation.z = Math.PI / 2;
    else if (dir.z > 0) arrowPivot.rotation.x = Math.PI / 2;

    group.add(arrowPivot);
    return group;
  }

  private createFloorHandle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Gizmo_FloorHandle';

    // Stem (Seal Blue)
    const stemGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 16);
    stemGeom.translate(0, 0.5, 0);
    const stemMat = new THREE.MeshBasicMaterial({
      color: 0xdbf2fc,
      depthTest: false,
      transparent: true,
      opacity: 0.92
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.renderOrder = 998;
    group.add(stem);

    // Arrow / Diamond Cone (Crimson Pink)
    const coneGeom = new THREE.ConeGeometry(0.35, 0.7, 16);
    coneGeom.translate(0, 1.35, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfd6e8e,
      depthTest: false,
      transparent: true,
      opacity: 0.96
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.renderOrder = 999;
    cone.userData = { isHandle: true, type: 'floor' };
    group.add(cone);

    group.userData = { isHandle: true, type: 'floor' };
    return group;
  }

  private createOverhangHandle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Gizmo_OverhangHandle';

    // Horizontal arrow pointer
    const arrowGeom = new THREE.ConeGeometry(0.28, 0.6, 16);
    arrowGeom.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xff9500,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);
    arrow.renderOrder = 999;
    arrow.userData = { isHandle: true, type: 'overhang' };
    group.add(arrow);

    // Disc grip
    const discGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.06, 16);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.renderOrder = 998;
    disc.userData = { isHandle: true, type: 'overhang' };
    group.add(disc);

    group.userData = { isHandle: true, type: 'overhang' };
    return group;
  }

  private createRotationRing(bld: BuildingInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Gizmo_RotationRing';

    const radius = Math.sqrt(
      (bld.width / 2) * (bld.width / 2) + (bld.length / 2) * (bld.length / 2)
    ) + 1.2;

    // Torus ring
    const torusGeom = new THREE.TorusGeometry(radius, 0.1, 16, 64);
    torusGeom.rotateX(Math.PI / 2);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      depthTest: false,
      transparent: true,
      opacity: 0.6
    });
    const torus = new THREE.Mesh(torusGeom, torusMat);
    torus.renderOrder = 997;
    torus.userData = { isHandle: true, type: 'rotation' };
    group.add(torus);

    // Cardinal direction notch ticks (every 90 deg) & 15 deg indicators
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const isCardinal = i % 6 === 0;
      const markerGeom = new THREE.BoxGeometry(
        isCardinal ? 0.35 : 0.18,
        0.05,
        isCardinal ? 0.8 : 0.4
      );
      const markerMat = new THREE.MeshBasicMaterial({
        color: isCardinal ? 0xffffff : 0x007aff,
        depthTest: false,
        transparent: true,
        opacity: isCardinal ? 0.95 : 0.5
      });
      const marker = new THREE.Mesh(markerGeom, markerMat);
      marker.position.set(Math.sin(angle) * radius, 0.02, Math.cos(angle) * radius);
      marker.rotation.y = angle;
      marker.renderOrder = 998;
      group.add(marker);
    }

    group.userData = { isHandle: true, type: 'rotation' };
    return group;
  }

  private updateGizmoPositions(bld: BuildingInstance, subPart: BuildingSubPartType = 'main_tower'): void {
    const floorH = bld.floorHeight || 3.2;
    const eff = PrefabMeshBuilder.getEffectiveSubParts(bld);
    const dims = eff[subPart];
    const rot = bld.rotationY || 0;
    const upAxis = new THREE.Vector3(0, 1, 0);

    // Compute world-space bounding box of the selected sub-part if available
    const bldGroup = this.engine.buildingManager.getBuildingGroup(bld.id);
    const subGroup = bldGroup?.getObjectByName(`SubPart_${subPart}`);
    let subCenter = bld.position.clone();
    let subTopY = bld.position.y + (bld.plinthHeight || 0.35) + dims.partFloors * floorH;
    let subMidY = bld.position.y + (bld.plinthHeight || 0.35) + (dims.partFloors * floorH) * 0.5;

    if (subGroup && subGroup.children.length > 0) {
      subGroup.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(subGroup);
      if (!box.isEmpty()) {
        box.getCenter(subCenter);
        subTopY = box.max.y;
        subMidY = (box.min.y + box.max.y) * 0.5;
      }
    } else if (subPart === 'main_tower') {
      subTopY += bld.roofType === 'joglo' ? 4.2 : bld.roofType === 'hip' ? 3.0 : 2.0;
    }

    // 1. Position Floor Handle & CityRT.com Floating Roof Badges [(^)] / [(v)] above sub-part roof
    if (this.floorHandleMesh) {
      this.floorHandleMesh.position.set(subCenter.x, subTopY + 0.25, subCenter.z);
    }
    if (this.roofBadgeUpMesh) {
      const rightOffset = new THREE.Vector3(dims.partFloors > 1 ? 0.95 : 0, 0, 0).applyAxisAngle(upAxis, rot);
      this.roofBadgeUpMesh.position.set(subCenter.x + rightOffset.x, subTopY + 2.15, subCenter.z + rightOffset.z);
    }
    if (this.roofBadgeDownMesh) {
      this.roofBadgeDownMesh.visible = dims.partFloors > 1;
      const leftOffset = new THREE.Vector3(-0.95, 0, 0).applyAxisAngle(upAxis, rot);
      this.roofBadgeDownMesh.position.set(subCenter.x + leftOffset.x, subTopY + 2.15, subCenter.z + leftOffset.z);
    }

    // 1b. Position Miniopolis Horizontal Sub-Part Resize Arrows on Left/Right/Front faces of sub-part
    const halfSubW = Math.max(1.5, dims.partWidth * 0.5) + 0.25;
    const halfSubD = Math.max(1.5, dims.partDepth * 0.5) + 0.25;

    if (this.widthRightHandleMesh) {
      const offR = new THREE.Vector3(halfSubW, 0, 0).applyAxisAngle(upAxis, rot);
      this.widthRightHandleMesh.position.set(subCenter.x + offR.x, subMidY, subCenter.z + offR.z);
      this.widthRightHandleMesh.rotation.y = rot;
    }
    if (this.widthLeftHandleMesh) {
      const offL = new THREE.Vector3(-halfSubW, 0, 0).applyAxisAngle(upAxis, rot);
      this.widthLeftHandleMesh.position.set(subCenter.x + offL.x, subMidY, subCenter.z + offL.z);
      this.widthLeftHandleMesh.rotation.y = rot;
    }
    if (this.depthFrontHandleMesh) {
      const offF = new THREE.Vector3(0, 0, halfSubD).applyAxisAngle(upAxis, rot);
      this.depthFrontHandleMesh.position.set(subCenter.x + offF.x, subMidY, subCenter.z + offF.z);
      this.depthFrontHandleMesh.rotation.y = rot;
    }

    // Position Overhang Handle at roof eaves edge
    const totalFloors = Math.max(1, bld.floorCount || 1);
    const roofBaseH = bld.position.y + (bld.plinthHeight || 0.35) + totalFloors * floorH;
    if (this.overhangHandleMesh) {
      const overhang = bld.roofOverhang ?? 1.2;
      const halfL = (bld.length || 10) / 2;

      const localOffset = new THREE.Vector3(0, roofBaseH, halfL + overhang);
      localOffset.applyAxisAngle(upAxis, rot);

      this.overhangHandleMesh.position.set(
        bld.position.x + localOffset.x,
        roofBaseH + 0.2,
        bld.position.z + localOffset.z
      );
      this.overhangHandleMesh.rotation.y = rot;
    }

    // Position Rotation Ring at base
    if (this.rotationRingMesh) {
      this.rotationRingMesh.position.set(bld.position.x, 0.08, bld.position.z);
      this.rotationRingMesh.rotation.y = rot;
    }
  }

  private clearGizmoMeshes(): void {
    while (this.masterGroup.children.length > 0) {
      const child = this.masterGroup.children[0];
      this.masterGroup.remove(child);
      child.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        } else if ((c as THREE.Sprite).isSprite) {
          const s = c as THREE.Sprite;
          s.material?.map?.dispose();
          s.material?.dispose();
        }
      });
    }
    this.floorHandleMesh = null;
    this.roofBadgeUpMesh = null;
    this.roofBadgeDownMesh = null;
    this.widthRightHandleMesh = null;
    this.widthLeftHandleMesh = null;
    this.depthFrontHandleMesh = null;
    this.overhangHandleMesh = null;
    this.rotationRingMesh = null;
  }

  public getHandleUnderPointer(event: MouseEvent | PointerEvent): ActiveGizmoHandle {
    if (!this.masterGroup.visible) return null;
    const rect = this.domElement.getBoundingClientRect();
    this.mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const intersects = this.raycaster.intersectObjects(this.masterGroup.children, true);

    if (intersects.length > 0) {
      let curr: THREE.Object3D | null = intersects[0].object;
      while (curr && curr !== this.masterGroup) {
        if (curr.userData && curr.userData.type) {
          return curr.userData.type as ActiveGizmoHandle;
        }
        curr = curr.parent;
      }
    }
    return null;
  }

  private gizmoPointerHandled: boolean = false;

  public consumePointerHandled(): boolean {
    const handled = this.gizmoPointerHandled;
    this.gizmoPointerHandled = false;
    return handled;
  }

  public stepSubPartFloor(deltaFloors: number): void {
    const bld = this.engine.buildingManager.getSelectedBuilding();
    if (!bld) return;
    const subPart = this.engine.buildingManager.selectedSubPart || 'main_tower';
    const eff = PrefabMeshBuilder.getEffectiveSubParts(bld);
    const oldDims = { ...eff[subPart] };
    const limits = BuildingCatalogRegistry.getFloorLimits(bld.presetKey);
    const maxFl = Math.max(limits.maxFloors, 16);
    const nextFloors = Math.max(1, Math.min(maxFl, oldDims.partFloors + deltaFloors));
    if (nextFloors === oldDims.partFloors) return;

    const prevSubParts = bld.subParts ? JSON.parse(JSON.stringify(bld.subParts)) : undefined;
    const prevFloorCount = bld.floorCount;

    this.engine.buildingManager.resizeBuildingSubPart(
      bld.id,
      subPart,
      { partFloors: nextFloors },
      true
    );

    const nextSubParts = bld.subParts ? JSON.parse(JSON.stringify(bld.subParts)) : undefined;
    this.engine.executeCommand(
      new UpdateBuildingParamCommand(
        this.engine,
        bld.id,
        { subParts: prevSubParts, floorCount: prevFloorCount },
        { subParts: nextSubParts, floorCount: bld.floorCount },
        `Ubah Lantai ${SUBPART_LABELS_ID[subPart]} (${bld.name}) ke ${nextFloors} Lantai`
      )
    );

    proceduralAudio.playScaleStepSound(nextFloors - 1);
    proceduralAudio.playPlacementChord();
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || this.engine.activeToolName !== 'select') return;

    const handle = this.getHandleUnderPointer(e);
    if (!handle) return;

    const bld = this.engine.buildingManager.getSelectedBuilding();
    if (!bld) return;

    e.preventDefault();
    e.stopPropagation();
    this.gizmoPointerHandled = true;

    // CityRT.com style instant click on floating roof badge [(^)] / [(v)]
    if (handle === 'roof_badge_up') {
      this.stepSubPartFloor(1);
      return;
    }
    if (handle === 'roof_badge_down') {
      this.stepSubPartFloor(-1);
      return;
    }

    const subPart = this.engine.buildingManager.selectedSubPart || 'main_tower';
    const eff = PrefabMeshBuilder.getEffectiveSubParts(bld);
    const subDims = { ...eff[subPart] };

    this.activeHandle = handle;
    this.engine.cameraController.enabled = false; // Prevent camera orbit while dragging handles

    this.dragState = {
      handle,
      buildingId: bld.id,
      subPart,
      startPointer: new THREE.Vector2(e.clientX, e.clientY),
      startWorldPos: bld.position.clone(),
      initialFloorCount: bld.floorCount || 1,
      initialOverhang: bld.roofOverhang ?? 1.2,
      initialRotationY: bld.rotationY || 0,
      initialSubPartDims: subDims,
      initialSubPartsSnapshot: bld.subParts ? JSON.parse(JSON.stringify(bld.subParts)) : undefined,
      lastSnapAngle: bld.rotationY || 0,
      lastStepSoundMetric:
        handle === 'floor'
          ? subDims.partFloors
          : handle === 'subpart_depth_front'
          ? Math.round(subDims.partDepth)
          : Math.round(subDims.partWidth)
    };

    proceduralAudio.playClick();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragState || !this.activeHandle) {
      // Hover detection
      if (this.masterGroup.visible) {
        const hover = this.getHandleUnderPointer(e);
        if (hover !== this.hoveredHandle) {
          this.hoveredHandle = hover;
          this.domElement.style.cursor = hover ? 'pointer' : 'default';
        }
      }
      return;
    }

    const bld = this.engine.buildingManager.buildings.get(this.dragState.buildingId);
    if (!bld) return;

    const dy = this.dragState.startPointer.y - e.clientY; // Upward cursor is positive
    const dx = e.clientX - this.dragState.startPointer.x;
    const subPart = this.dragState.subPart;
    const subLabel = SUBPART_LABELS_ID[subPart];

    if (this.activeHandle === 'floor') {
      // 1 floor per 35 vertical pixels on the selected sub-part
      const floorDelta = Math.round(dy / 35);
      const limits = BuildingCatalogRegistry.getFloorLimits(bld.presetKey);
      const maxFl = Math.max(limits.maxFloors, 16);
      const newFloorCount = Math.max(
        1,
        Math.min(maxFl, this.dragState.initialSubPartDims.partFloors + floorDelta)
      );

      const currentDims = PrefabMeshBuilder.getEffectiveSubParts(bld)[subPart];
      if (newFloorCount !== currentDims.partFloors) {
        this.engine.buildingManager.resizeBuildingSubPart(bld.id, subPart, {
          partFloors: newFloorCount
        });
        proceduralAudio.playScaleStepSound(newFloorCount - 1);
        this.dragState.lastStepSoundMetric = newFloorCount;

        // Telemetry
        const lot = this.engine.lotManager.getLotForBuilding(bld.id);
        const maxKlb = lot ? ZONE_RULES[lot.zone].maxKLB : 2.4;
        const groundArea = BuildingManager.getBuildingGroundArea(bld);
        const lotArea = lot?.areaM2 || 100;
        const currentKlb = (groundArea * bld.floorCount) / lotArea;
        const klbExceeded = currentKlb > maxKlb;

        this.liveGizmoTelemetry = {
          active: true,
          type: 'floor',
          label: `Lantai ${subLabel}`,
          value: `${newFloorCount} Lantai (${(newFloorCount * (bld.floorHeight || 3.2)).toFixed(1).replace('.', ',')} m)`,
          secondary: `KLB: ${currentKlb.toFixed(2).replace('.', ',')} / Maks ${maxKlb.toFixed(2).replace('.', ',')}`,
          warning: klbExceeded ? `Melampaui batas KLB Zona (${currentKlb.toFixed(2).replace('.', ',')} > ${maxKlb})` : undefined
        };
      }
    } else if (
      this.activeHandle === 'subpart_width_right' ||
      this.activeHandle === 'subpart_width_left'
    ) {
      const sign = this.activeHandle === 'subpart_width_right' ? 1 : -1;
      const meterDelta = (dx * sign) / 22; // ~22px per meter
      const steppedW = Math.round((this.dragState.initialSubPartDims.partWidth + meterDelta) * 2) / 2;
      const newWidth = Math.max(3.0, Math.min(48.0, steppedW));
      const currentDims = PrefabMeshBuilder.getEffectiveSubParts(bld)[subPart];

      if (Math.abs(newWidth - currentDims.partWidth) >= 0.45) {
        this.engine.buildingManager.resizeBuildingSubPart(bld.id, subPart, {
          partWidth: newWidth
        });
        const wholeMeter = Math.round(newWidth);
        if (wholeMeter !== this.dragState.lastStepSoundMetric) {
          proceduralAudio.playScaleStepSound(wholeMeter);
          this.dragState.lastStepSoundMetric = wholeMeter;
        }
        this.liveGizmoTelemetry = {
          active: true,
          type: this.activeHandle,
          label: `Lebar ${subLabel}`,
          value: `${newWidth.toFixed(1).replace('.', ',')} m`,
          secondary: `Kedalaman ${currentDims.partDepth.toFixed(1).replace('.', ',')} m • ${currentDims.partFloors} Lantai`
        };
      }
    } else if (this.activeHandle === 'subpart_depth_front') {
      const meterDelta = (-dy + dx * 0.35) / 22;
      const steppedD = Math.round((this.dragState.initialSubPartDims.partDepth + meterDelta) * 2) / 2;
      const newDepth = Math.max(3.0, Math.min(48.0, steppedD));
      const currentDims = PrefabMeshBuilder.getEffectiveSubParts(bld)[subPart];

      if (Math.abs(newDepth - currentDims.partDepth) >= 0.45) {
        this.engine.buildingManager.resizeBuildingSubPart(bld.id, subPart, {
          partDepth: newDepth
        });
        const wholeMeter = Math.round(newDepth);
        if (wholeMeter !== this.dragState.lastStepSoundMetric) {
          proceduralAudio.playScaleStepSound(wholeMeter);
          this.dragState.lastStepSoundMetric = wholeMeter;
        }
        this.liveGizmoTelemetry = {
          active: true,
          type: 'subpart_depth_front',
          label: `Kedalaman ${subLabel}`,
          value: `${newDepth.toFixed(1).replace('.', ',')} m`,
          secondary: `Lebar ${currentDims.partWidth.toFixed(1).replace('.', ',')} m • ${currentDims.partFloors} Lantai`
        };
      }
    } else if (this.activeHandle === 'overhang') {
      // Overhang adjustment: 0.3m to 2.2m (100px = ~1.0m)
      const overhangDelta = dy * 0.01;
      const rawOverhang = this.dragState.initialOverhang + overhangDelta;
      const stepped = Math.round(rawOverhang * 20) / 20; // 0.05m steps
      const newOverhang = Math.max(0.3, Math.min(2.2, stepped));

      if (Math.abs(newOverhang - (bld.roofOverhang ?? 1.2)) >= 0.04) {
        bld.roofOverhang = newOverhang;
        this.engine.buildingManager.updateBuilding(bld);
        proceduralAudio.playGizmoHarmonic(Math.round(newOverhang * 4));

        // Shading and thermal drop calculation (approx 0.8 deg C reduction per 0.3m eave extension)
        const tempDrop = ((newOverhang - 0.3) * 2.2).toFixed(1);

        this.liveGizmoTelemetry = {
          active: true,
          type: 'overhang',
          label: 'Tritisan Atap (Overstek)',
          value: `${newOverhang.toFixed(2)} meter`,
          secondary: `Reduksi Panas Dinding: -${tempDrop} °C`,
          warning: newOverhang < 0.8 ? 'Tritisan terlalu sempit (<0.8m) rentan tampias hujan' : undefined
        };
      }
    } else if (this.activeHandle === 'rotation') {
      // Raycast ground plane to get rotation angle around center
      const rect = this.domElement.getBoundingClientRect();
      this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
        const deltaX = hit.x - bld.position.x;
        const deltaZ = hit.z - bld.position.z;
        let angle = Math.atan2(deltaX, deltaZ);

        // Magnetic snap every 15 degrees (PI / 12)
        const snapStep = Math.PI / 12;
        const snappedAngle = Math.round(angle / snapStep) * snapStep;

        // Check nearest road orientation for magnetic road alignment
        const nearestRoadHeading = this.getNearestRoadHeading(bld.position);
        let finalAngle = snappedAngle;
        if (nearestRoadHeading !== null) {
          const diff = Math.abs((angle - nearestRoadHeading) % (Math.PI / 2));
          if (diff < 0.12 || Math.abs(diff - Math.PI / 2) < 0.12) {
            finalAngle = nearestRoadHeading;
          }
        }

        if (Math.abs(finalAngle - (bld.rotationY || 0)) > 0.02) {
          bld.rotationY = finalAngle;
          this.engine.buildingManager.updateBuilding(bld);

          if (Math.abs(finalAngle - this.dragState.lastSnapAngle) >= snapStep * 0.8) {
            proceduralAudio.playSnapTick();
            this.dragState.lastSnapAngle = finalAngle;
          }

          const deg = Math.round(((finalAngle * 180) / Math.PI) % 360);
          const positiveDeg = deg < 0 ? deg + 360 : deg;

          const footprint = this.getBuildingFootprint(bld);
          const overlapsRoad = this.engine.roadManager.isFootprintOverlappingRoad(footprint, 0.5);
          if (overlapsRoad) {
            proceduralAudio.playTaptic('boundary');
          }

          this.liveGizmoTelemetry = {
            active: true,
            type: 'rotation',
            label: 'Orientasi Fasad 3D',
            value: `${positiveDeg}° (Snap 15°)`,
            secondary: positiveDeg === 0 || positiveDeg === 180 ? 'Orientasi Utara-Selatan Optimal (Minim Radiasi)' : 'Orientasi Menyudut Lintasan Matahari',
            warning: overlapsRoad ? 'Melanggar sempadan jalan / trotoar!' : undefined
          };
        }
      }
    }
  };

  private getBuildingFootprint(bld: BuildingInstance): THREE.Vector2[] {
    const hw = bld.width / 2;
    const hl = bld.length / 2;
    const cos = Math.cos(bld.rotationY || 0);
    const sin = Math.sin(bld.rotationY || 0);
    return [
      new THREE.Vector2(bld.position.x + (-hw * cos - -hl * sin), bld.position.z + (-hw * sin + -hl * cos)),
      new THREE.Vector2(bld.position.x + (hw * cos - -hl * sin),  bld.position.z + (hw * sin + -hl * cos)),
      new THREE.Vector2(bld.position.x + (hw * cos - hl * sin),   bld.position.z + (hw * sin + hl * cos)),
      new THREE.Vector2(bld.position.x + (-hw * cos - hl * sin),  bld.position.z + (-hw * sin + hl * cos))
    ];
  }

  private onPointerUp = (): void => {
    if (!this.dragState || !this.activeHandle) return;

    const bld = this.engine.buildingManager.buildings.get(this.dragState.buildingId);
    if (bld) {
      const subPart = this.dragState.subPart;
      const finalSubDims = PrefabMeshBuilder.getEffectiveSubParts(bld)[subPart];
      const initSubDims = this.dragState.initialSubPartDims;

      // Commit Undo/Redo command for whatever sub-part or building parameter changed
      if (
        (this.activeHandle === 'floor' ||
          this.activeHandle === 'subpart_width_right' ||
          this.activeHandle === 'subpart_width_left' ||
          this.activeHandle === 'subpart_depth_front') &&
        (finalSubDims.partFloors !== initSubDims.partFloors ||
          Math.abs(finalSubDims.partWidth - initSubDims.partWidth) > 0.05 ||
          Math.abs(finalSubDims.partDepth - initSubDims.partDepth) > 0.05)
      ) {
        const nextSubParts = bld.subParts ? JSON.parse(JSON.stringify(bld.subParts)) : undefined;
        this.engine.executeCommand(
          new UpdateBuildingParamCommand(
            this.engine,
            bld.id,
            {
              subParts: this.dragState.initialSubPartsSnapshot,
              width: subPart === 'main_tower' ? initSubDims.partWidth : bld.width,
              length: subPart === 'main_tower' ? initSubDims.partDepth : bld.length,
              floorCount: this.dragState.initialFloorCount
            },
            {
              subParts: nextSubParts,
              width: bld.width,
              length: bld.length,
              floorCount: bld.floorCount
            },
            `Kustomisasi ${SUBPART_LABELS_ID[subPart]} ${bld.name}`
          )
        );
        const grp = this.engine.buildingManager.getBuildingGroup(bld.id);
        if (grp) {
          this.engine.springAnimator.triggerPlacementSpring(grp);
        }
        proceduralAudio.playPlacementChord();
      } else if (
        this.activeHandle === 'overhang' &&
        Math.abs((bld.roofOverhang ?? 1.2) - this.dragState.initialOverhang) > 0.01
      ) {
        this.engine.executeCommand(
          new UpdateBuildingParamCommand(
            this.engine,
            bld.id,
            { roofOverhang: this.dragState.initialOverhang },
            { roofOverhang: bld.roofOverhang },
            `Atur Lebar Tritisan Atap ke ${(bld.roofOverhang ?? 1.2).toFixed(2)}m`
          )
        );
        proceduralAudio.playStarChime();
      } else if (
        this.activeHandle === 'rotation' &&
        Math.abs((bld.rotationY || 0) - this.dragState.initialRotationY) > 0.01
      ) {
        // Prevent rotation that places building into road
        if (this.engine.roadManager.isFootprintOverlappingRoad(this.getBuildingFootprint(bld), 0.5)) {
          bld.rotationY = this.dragState.initialRotationY;
          this.engine.buildingManager.updateBuilding(bld);
          proceduralAudio.playTaptic('boundary');
        } else {
          this.engine.executeCommand(
            new UpdateBuildingParamCommand(
              this.engine,
              bld.id,
              { rotationY: this.dragState.initialRotationY },
              { rotationY: bld.rotationY },
              `Putar Orientasi Bangunan ${bld.name}`
            )
          );
          proceduralAudio.playStarChime();
        }
      }
    }

    this.activeHandle = null;
    this.dragState = null;
    this.engine.cameraController.enabled = true; // Re-enable camera orbit controls
    this.liveGizmoTelemetry.active = false;
  };

  private getNearestRoadHeading(pos: THREE.Vector3): number | null {
    let closestDist = Infinity;
    let heading: number | null = null;

    for (const edge of this.engine.roadManager.graph.edges.values()) {
      const s = this.engine.roadManager.graph.nodes.get(edge.startNodeId);
      const e = this.engine.roadManager.graph.nodes.get(edge.endNodeId);
      if (!s || !e) continue;

      const midX = (s.position.x + e.position.x) / 2;
      const midZ = (s.position.z + e.position.z) / 2;
      const dist = Math.hypot(pos.x - midX, pos.z - midZ);

      if (dist < 35 && dist < closestDist) {
        closestDist = dist;
        heading = Math.atan2(e.position.x - s.position.x, e.position.z - s.position.z);
      }
    }

    return heading;
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
    }
    this.clearGizmoMeshes();
    this.scene.remove(this.masterGroup);
  }
}

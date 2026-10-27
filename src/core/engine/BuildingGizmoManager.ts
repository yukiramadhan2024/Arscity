import * as THREE from 'three';
import { BuildingInstance } from '../../buildings/PrefabTypes';
import { BuildingManager } from '../../buildings/BuildingManager';
import { BuildingCatalogRegistry } from '../../buildings/BuildingCatalogRegistry';
import { UpdateBuildingParamCommand } from '../commands/CityCommands';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { ZONE_RULES } from '../../zones/ZoneTypes';
import type { Engine } from './Engine';

export type ActiveGizmoHandle = 'floor' | 'overhang' | 'rotation' | null;

export interface GizmoDragState {
  handle: ActiveGizmoHandle;
  buildingId: string;
  startPointer: THREE.Vector2;
  startWorldPos: THREE.Vector3;
  initialFloorCount: number;
  initialOverhang: number;
  initialRotationY: number;
  lastSnapAngle: number;
}

export class BuildingGizmoManager {
  private engine: Engine;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  public masterGroup: THREE.Group;
  private floorHandleMesh: THREE.Group | null = null;
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
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
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

    // Check if gizmo needs rebuild or reposition
    if (this.masterGroup.userData.currentBuildingId !== selectedBld.id) {
      this.rebuildGizmoForBuilding(selectedBld);
    } else {
      this.updateGizmoPositions(selectedBld);
    }

    // Scale invariance: Keep gizmos visible and comfortably clickable at any camera zoom
    const dist = this.camera.position.distanceTo(selectedBld.position);
    const scaleFactor = Math.max(0.6, Math.min(2.5, dist * 0.04));

    if (this.floorHandleMesh) {
      this.floorHandleMesh.scale.setScalar(scaleFactor);
    }
    if (this.overhangHandleMesh) {
      this.overhangHandleMesh.scale.setScalar(scaleFactor);
    }
    if (this.rotationRingMesh) {
      // Rotation ring scales with building size + offset
      const baseRadius = Math.sqrt(
        (selectedBld.width / 2) * (selectedBld.width / 2) +
        (selectedBld.length / 2) * (selectedBld.length / 2)
      ) + 1.2;
      this.rotationRingMesh.position.set(selectedBld.position.x, 0.08, selectedBld.position.z);
    }
  }

  private rebuildGizmoForBuilding(bld: BuildingInstance): void {
    this.clearGizmoMeshes();
    this.masterGroup.userData.currentBuildingId = bld.id;

    // 1. Vertical Floor Extrusion Handle (Top of Roof)
    this.floorHandleMesh = this.createFloorHandle();
    this.masterGroup.add(this.floorHandleMesh);

    // 2. Roof Overhang (Tritisan / Overstek) Handle
    this.overhangHandleMesh = this.createOverhangHandle();
    this.masterGroup.add(this.overhangHandleMesh);

    // 3. Rotation Ring Handle (Base of Building)
    this.rotationRingMesh = this.createRotationRing(bld);
    this.masterGroup.add(this.rotationRingMesh);

    this.updateGizmoPositions(bld);
  }

  private createFloorHandle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Gizmo_FloorHandle';

    // Stem
    const stemGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 16);
    stemGeom.translate(0, 0.5, 0);
    const stemMat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      depthTest: false,
      transparent: true,
      opacity: 0.85
    });
    const stem = new THREE.Mesh(stemGeom, stemMat);
    stem.renderOrder = 998;
    group.add(stem);

    // Arrow / Diamond Cone
    const coneGeom = new THREE.ConeGeometry(0.35, 0.7, 16);
    coneGeom.translate(0, 1.35, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x34c759,
      depthTest: false,
      transparent: true,
      opacity: 0.95
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

  private updateGizmoPositions(bld: BuildingInstance): void {
    const floorH = bld.floorHeight || 3.2;
    const totalFloors = Math.max(1, bld.floorCount || 1);
    const roofBaseH = bld.position.y + (bld.plinthHeight || 0.35) + totalFloors * floorH;
    const roofApexH = roofBaseH + (bld.roofType === 'joglo' ? 4.2 : bld.roofType === 'hip' ? 3.0 : 2.0);

    // Position Floor Handle above apex
    if (this.floorHandleMesh) {
      this.floorHandleMesh.position.set(bld.position.x, roofApexH + 0.3, bld.position.z);
    }

    // Position Overhang Handle at roof eaves edge
    if (this.overhangHandleMesh) {
      const overhang = bld.roofOverhang ?? 1.2;
      const halfL = (bld.length || 10) / 2;
      const rot = bld.rotationY || 0;

      // Offset along local Z (front facade)
      const localOffset = new THREE.Vector3(0, roofBaseH, halfL + overhang);
      localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);

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
      this.rotationRingMesh.rotation.y = bld.rotationY || 0;
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
        }
      });
    }
    this.floorHandleMesh = null;
    this.overhangHandleMesh = null;
    this.rotationRingMesh = null;
  }

  private getHandleUnderPointer(event: PointerEvent): ActiveGizmoHandle {
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

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || this.engine.activeToolName !== 'select') return;

    const handle = this.getHandleUnderPointer(e);
    if (!handle) return;

    const bld = this.engine.buildingManager.getSelectedBuilding();
    if (!bld) return;

    e.preventDefault();
    e.stopPropagation();

    this.activeHandle = handle;
    this.engine.cameraController.enabled = false; // Prevent camera orbit while dragging handles

    this.dragState = {
      handle,
      buildingId: bld.id,
      startPointer: new THREE.Vector2(e.clientX, e.clientY),
      startWorldPos: bld.position.clone(),
      initialFloorCount: bld.floorCount || 1,
      initialOverhang: bld.roofOverhang ?? 1.2,
      initialRotationY: bld.rotationY || 0,
      lastSnapAngle: bld.rotationY || 0
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

    if (this.activeHandle === 'floor') {
      // 1 floor per 35 vertical pixels
      const floorDelta = Math.round(dy / 35);
      const limits = BuildingCatalogRegistry.getFloorLimits(bld.presetKey);
      const newFloorCount = Math.max(limits.minFloors, Math.min(limits.maxFloors, this.dragState.initialFloorCount + floorDelta));

      if (newFloorCount !== bld.floorCount) {
        bld.floorCount = newFloorCount;
        this.engine.buildingManager.updateBuilding(bld);
        proceduralAudio.playGizmoHarmonic(newFloorCount);

        // Telemetry
        const lot = this.engine.lotManager.getLotForBuilding(bld.id);
        const maxKlb = lot ? ZONE_RULES[lot.zone].maxKLB : 2.4;
        const groundArea = BuildingManager.getBuildingGroundArea(bld);
        const lotArea = lot?.areaM2 || 100;
        const currentKlb = (groundArea * newFloorCount) / lotArea;
        const klbExceeded = currentKlb > maxKlb;

        this.liveGizmoTelemetry = {
          active: true,
          type: 'floor',
          label: 'Jumlah Lantai',
          value: `${newFloorCount} Lantai (Tinggi ${(newFloorCount * 3.2).toFixed(1)} m)`,
          secondary: `KLB: ${currentKlb.toFixed(2)} / Max ${maxKlb.toFixed(2)}`,
          warning: klbExceeded ? `Melampaui batas KLB Zona (${currentKlb.toFixed(2)} > ${maxKlb})` : undefined
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
      // Commit Undo/Redo command for whatever parameter changed
      if (this.activeHandle === 'floor' && bld.floorCount !== this.dragState.initialFloorCount) {
        this.engine.executeCommand(
          new UpdateBuildingParamCommand(
            this.engine,
            bld.id,
            { floorCount: this.dragState.initialFloorCount },
            { floorCount: bld.floorCount },
            `Ubah Jumlah Lantai ${bld.name} ke ${bld.floorCount}`
          )
        );
        proceduralAudio.playStarChime();
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
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.clearGizmoMeshes();
    this.scene.remove(this.masterGroup);
  }
}

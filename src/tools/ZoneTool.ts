import * as THREE from 'three';
import { LotManager } from '../zones/LotManager';
import { ZoneType, ZONE_RULES } from '../zones/ZoneTypes';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';

import { Engine } from '../core/engine/Engine';
import { AutoZoningService } from '../zones/AutoZoningService';
import { showSnackbar } from '../ui/state/useSnackbarStore';

export class ZoneTool {
  public lotManager: LotManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;
  private engine?: Engine;

  public activeZoneType: ZoneType = 'residential';
  public lotWidth: number = 15;
  public lotLength: number = 20;
  public autoFillOnPaint: boolean = true;

  // Polygon & elastic drag state for Zona Parkir Terpadu (CS2 Placemaker style)
  public polygonVertices: { x: number; y: number }[] = [];
  private dragStartPoint: THREE.Vector3 | null = null;
  private isDraggingBox: boolean = false;
  private suppressNextClick: boolean = false;
  public polygonPreviewGroup: THREE.Group;

  private ghostMesh: THREE.Mesh;
  private ghostMaterial: THREE.MeshBasicMaterial;

  constructor(
    lotManager: LotManager,
    raycastManager: RaycastManager,
    scene: THREE.Scene,
    engine?: Engine
  ) {
    this.lotManager = lotManager;
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.engine = engine;

    const geom = new THREE.PlaneGeometry(this.lotWidth, this.lotLength);
    geom.rotateX(-Math.PI / 2);

    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: ZONE_RULES[this.activeZoneType].colorHexInt,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });

    this.ghostMesh = new THREE.Mesh(geom, this.ghostMaterial);
    this.ghostMesh.position.y = 0.05;
    this.ghostMesh.visible = false;
    scene.add(this.ghostMesh);

    this.polygonPreviewGroup = new THREE.Group();
    this.polygonPreviewGroup.name = 'ParkingPolygonPreviewGroup';
    this.polygonPreviewGroup.visible = false;
    scene.add(this.polygonPreviewGroup);
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
  }

  public setAutoFill(enabled: boolean): void {
    this.autoFillOnPaint = enabled;
  }

  public setZoneType(zone: ZoneType): void {
    this.activeZoneType = zone;
    this.cancelPolygon();
    this.ghostMaterial.color.setHex(ZONE_RULES[zone].colorHexInt);
  }

  public cancelPolygon(): void {
    this.polygonVertices = [];
    this.dragStartPoint = null;
    this.isDraggingBox = false;
    this.clearPolygonPreview();
    this.polygonPreviewGroup.visible = false;
  }

  private clearPolygonPreview(): void {
    while (this.polygonPreviewGroup.children.length > 0) {
      const child = this.polygonPreviewGroup.children[0];
      this.polygonPreviewGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  }

  private rebuildPolygonPreview(hoverPt?: THREE.Vector3): void {
    this.clearPolygonPreview();
    const pts = [...this.polygonVertices];
    if (hoverPt) {
      pts.push({ x: hoverPt.x, y: hoverPt.z });
    }
    if (pts.length === 0) {
      this.polygonPreviewGroup.visible = false;
      return;
    }
    this.polygonPreviewGroup.visible = true;

    // Crimson Pink vertex handles + Seal Blue start-close ring
    pts.forEach((p, idx) => {
      const isStart = idx === 0 && this.polygonVertices.length >= 3;
      const ringGeom = new THREE.RingGeometry(isStart ? 0.65 : 0.35, isStart ? 1.15 : 0.68, 20);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isStart ? 0xdbf2fc : 0xfd6e8e,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const marker = new THREE.Mesh(ringGeom, ringMat);
      marker.position.set(p.x, 0.14, p.y);
      this.polygonPreviewGroup.add(marker);
    });

    if (pts.length >= 2) {
      const linePts = pts.map((p) => new THREE.Vector3(p.x, 0.12, p.y));
      if (pts.length >= 3) {
        linePts.push(new THREE.Vector3(pts[0].x, 0.12, pts[0].y));
      }
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xdbf2fc });
      const outline = new THREE.Line(lineGeom, lineMat);
      this.polygonPreviewGroup.add(outline);
    }

    if (pts.length >= 3) {
      const shape = new THREE.Shape();
      pts.forEach((p, i) => {
        if (i === 0) shape.moveTo(p.x, -p.y);
        else shape.lineTo(p.x, -p.y);
      });
      shape.closePath();
      const fillGeom = new THREE.ShapeGeometry(shape);
      fillGeom.rotateX(-Math.PI / 2);
      const fillMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const fillMesh = new THREE.Mesh(fillGeom, fillMat);
      fillMesh.position.y = 0.06;
      this.polygonPreviewGroup.add(fillMesh);
    }
  }

  public finishPolygon(): boolean {
    if (this.polygonVertices.length < 3) return false;
    const verts = [...this.polygonVertices];
    this.cancelPolygon();

    const newLot = this.lotManager.createPolygonLot(verts, this.activeZoneType);
    this.lotManager.selectLot(newLot.id);
    proceduralAudio.playPlacementChord();

    const cap = newLot.parkingCapacity ?? 0;
    const badgeText = LotManager.formatParkingBadgeText(newLot.areaM2, cap);
    showSnackbar({
      variant: 'success',
      title: 'Zona Parkir Terpadu Dibangun',
      detail: badgeText,
      undoable: false,
      groupKey: `parking_lot_${newLot.id}`
    });
    return true;
  }

  public handlePointerDown(snappedPos: THREE.Vector3): void {
    if (this.activeZoneType === 'parking_lot' && this.polygonVertices.length === 0) {
      this.dragStartPoint = snappedPos.clone();
      this.isDraggingBox = true;
    }
  }

  public handlePointerUp(snappedPos: THREE.Vector3): void {
    if (!this.isDraggingBox || !this.dragStartPoint) {
      this.isDraggingBox = false;
      this.dragStartPoint = null;
      return;
    }
    const start = this.dragStartPoint.clone();
    this.isDraggingBox = false;
    this.dragStartPoint = null;

    const dx = Math.abs(snappedPos.x - start.x);
    const dz = Math.abs(snappedPos.z - start.z);
    if (dx >= 6.0 && dz >= 6.0) {
      this.suppressNextClick = true;
      this.clearPolygonPreview();
      this.polygonPreviewGroup.visible = false;

      const minX = Math.min(start.x, snappedPos.x);
      const maxX = Math.max(start.x, snappedPos.x);
      const minZ = Math.min(start.z, snappedPos.z);
      const maxZ = Math.max(start.z, snappedPos.z);
      const boxVerts = [
        { x: minX, y: minZ },
        { x: maxX, y: minZ },
        { x: maxX, y: maxZ },
        { x: minX, y: maxZ }
      ];
      const newLot = this.lotManager.createPolygonLot(boxVerts, 'parking_lot');
      this.lotManager.selectLot(newLot.id);
      proceduralAudio.playPlacementChord();

      const badgeText = LotManager.formatParkingBadgeText(
        newLot.areaM2,
        newLot.parkingCapacity ?? 0
      );
      showSnackbar({
        variant: 'success',
        title: 'Zona Parkir Terpadu Dibangun',
        detail: badgeText,
        undoable: false,
        groupKey: `parking_lot_${newLot.id}`
      });
    }
  }

  public setLotSize(width: number, length: number): void {
    this.lotWidth = width;
    this.lotLength = length;
    this.ghostMesh.geometry.dispose();
    const geom = new THREE.PlaneGeometry(width, length);
    geom.rotateX(-Math.PI / 2);
    this.ghostMesh.geometry = geom;
  }

  private getAdjustedLotCenter(pos: THREE.Vector3, width: number, length: number): THREE.Vector3 {
    if (!this.engine?.roadManager) return pos.clone();

    const roadMgr = this.engine.roadManager;
    const adjusted = pos.clone();
    const hw = width / 2;
    const hl = length / 2;

    for (let iter = 0; iter < 4; iter++) {
      const corners = [
        new THREE.Vector2(adjusted.x - hw, adjusted.z - hl),
        new THREE.Vector2(adjusted.x + hw, adjusted.z - hl),
        new THREE.Vector2(adjusted.x + hw, adjusted.z + hl),
        new THREE.Vector2(adjusted.x - hw, adjusted.z + hl),
        new THREE.Vector2(adjusted.x, adjusted.z)
      ];

      let maxPenetration = 0;
      const pushNormal = new THREE.Vector2();

      for (const pt of corners) {
        const sample = roadMgr.getNearestRoadSample(pt);
        if (sample) {
          const reqDist = sample.corridorHalfWidth + 0.5;
          if (sample.distance < reqDist) {
            const pen = reqDist - sample.distance;
            if (pen > maxPenetration) {
              maxPenetration = pen;
              pushNormal.copy(sample.normal);
            }
          }
        }
      }

      if (maxPenetration > 0.01) {
        adjusted.x += pushNormal.x * maxPenetration;
        adjusted.z += pushNormal.y * maxPenetration;
      } else {
        break;
      }
    }

    return adjusted;
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }

    // Multi-vertex polygon drawing mode for Zona Parkir Terpadu (CS2 Placemaker)
    if (this.activeZoneType === 'parking_lot') {
      if (this.polygonVertices.length >= 3) {
        const startV = this.polygonVertices[0];
        const distToStart = Math.hypot(snappedPos.x - startV.x, snappedPos.z - startV.y);
        if (distToStart <= 3.8) {
          this.finishPolygon();
          return;
        }
      }

      // If not currently drawing a polygon, allow repainting an existing lot on click
      if (this.polygonVertices.length === 0) {
        const hits = this.raycastManager.raycastObjects([this.lotManager.masterGroup]);
        if (hits.length > 0) {
          let curr: THREE.Object3D | null = hits[0].object;
          let lotId: string | null = null;
          while (curr && curr !== this.lotManager.masterGroup) {
            if (curr.userData && curr.userData.lotId) {
              lotId = curr.userData.lotId;
              break;
            }
            curr = curr.parent;
          }
          if (lotId) {
            this.lotManager.setLotZone(lotId, 'parking_lot');
            this.lotManager.selectLot(lotId);
            const lot = this.lotManager.lots.get(lotId);
            showSnackbar({
              variant: 'success',
              title: 'Zona Parkir Terpadu Diaktifkan',
              detail: lot
                ? LotManager.formatParkingBadgeText(lot.areaM2, lot.parkingCapacity ?? 0)
                : 'Zona Parkir Terpadu',
              groupKey: `repaint_lot_${lotId}`
            });
            return;
          }
        }
      }

      this.polygonVertices.push({ x: snappedPos.x, y: snappedPos.z });
      proceduralAudio.playScaleStepSound(this.polygonVertices.length - 1);
      this.rebuildPolygonPreview();
      return;
    }

    // Check if clicked an existing lot to paint/change its zone
    const hits = this.raycastManager.raycastObjects([this.lotManager.masterGroup]);
    if (hits.length > 0) {
      let curr: THREE.Object3D | null = hits[0].object;
      let lotId: string | null = null;
      while (curr && curr !== this.lotManager.masterGroup) {
        if (curr.userData && curr.userData.lotId) {
          lotId = curr.userData.lotId;
          break;
        }
        curr = curr.parent;
      }

      if (lotId) {
        this.lotManager.setLotZone(lotId, this.activeZoneType);
        this.lotManager.selectLot(lotId);

        showSnackbar({
          variant: 'info',
          title: 'Zona Kavling Diperbarui',
          detail: `Zona: ${this.activeZoneType.toUpperCase()}`,
          groupKey: `repaint_lot_${lotId}`,
        });

        if (this.autoFillOnPaint && this.engine) {
          const autoCmd = AutoZoningService.createAutoDevelopLotCommand(this.engine, lotId);
          if (autoCmd) {
            this.engine.commandManager.execute(autoCmd);
          }
        }
        return;
      }
    }

    // Auto-adjust lot position to guarantee clearance from road corridor
    const adjustedPos = this.getAdjustedLotCenter(snappedPos, this.lotWidth, this.lotLength);

    // Otherwise create new lot at snapped location
    const newLot = this.lotManager.createLot(adjustedPos, this.lotWidth, this.lotLength, this.activeZoneType);
    this.lotManager.selectLot(newLot.id);

    const area = Math.round(this.lotWidth * this.lotLength);
    showSnackbar({
      variant: 'success',
      title: `Kavling ${newLot.name} Dibuat`,
      detail: `Luas ${area} m2`,
      undoable: true,
      groupKey: `zone_${this.activeZoneType}`,
    });

    if (this.autoFillOnPaint && this.engine) {
      const autoCmd = AutoZoningService.createAutoDevelopLotCommand(this.engine, newLot.id);
      if (autoCmd) {
        this.engine.commandManager.execute(autoCmd);
      }
    }
  }

  public update(): void {
    if (this.activeZoneType === 'parking_lot') {
      this.ghostMesh.visible = false;
      if (this.raycastManager.isHoveringGround) {
        const snapped = this.raycastManager.snappedPoint;
        if (this.isDraggingBox && this.dragStartPoint) {
          const minX = Math.min(this.dragStartPoint.x, snapped.x);
          const maxX = Math.max(this.dragStartPoint.x, snapped.x);
          const minZ = Math.min(this.dragStartPoint.z, snapped.z);
          const maxZ = Math.max(this.dragStartPoint.z, snapped.z);
          if (maxX - minX >= 2.0 && maxZ - minZ >= 2.0) {
            this.polygonVertices = [
              { x: minX, y: minZ },
              { x: maxX, y: minZ },
              { x: maxX, y: maxZ },
              { x: minX, y: maxZ }
            ];
            this.rebuildPolygonPreview();
            this.polygonVertices = [];
          }
        } else if (this.polygonVertices.length > 0) {
          this.rebuildPolygonPreview(snapped);
        } else {
          this.ghostMesh.position.set(snapped.x, 0.05, snapped.z);
          this.ghostMesh.visible = true;
        }
      }
      return;
    }

    if (this.raycastManager.isHoveringGround) {
      const snapped = this.raycastManager.snappedPoint;
      const adjusted = this.getAdjustedLotCenter(snapped, this.lotWidth, this.lotLength);

      this.ghostMesh.position.set(
        adjusted.x,
        0.05,
        adjusted.z
      );
      this.ghostMesh.visible = true;
    } else {
      this.ghostMesh.visible = false;
    }
  }

  public setVisible(visible: boolean): void {
    this.ghostMesh.visible = visible;
    if (!visible) {
      this.cancelPolygon();
    }
  }

  public dispose(): void {
    this.cancelPolygon();
    this.scene.remove(this.polygonPreviewGroup);
    this.scene.remove(this.ghostMesh);
    this.ghostMesh.geometry.dispose();
    this.ghostMaterial.dispose();
  }
}

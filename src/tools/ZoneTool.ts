import * as THREE from 'three';
import { LotManager } from '../zones/LotManager';
import { ZoneType, ZONE_RULES } from '../zones/ZoneTypes';
import { RaycastManager } from '../core/engine/RaycastManager';

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
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
  }

  public setAutoFill(enabled: boolean): void {
    this.autoFillOnPaint = enabled;
  }

  public setZoneType(zone: ZoneType): void {
    this.activeZoneType = zone;
    this.ghostMaterial.color.setHex(ZONE_RULES[zone].colorHexInt);
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
      detail: `Luas ${area} m²`,
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
  }

  public dispose(): void {
    this.scene.remove(this.ghostMesh);
    this.ghostMesh.geometry.dispose();
    this.ghostMaterial.dispose();
  }
}

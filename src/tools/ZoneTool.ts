import * as THREE from 'three';
import { LotManager } from '../zones/LotManager';
import { ZoneType, ZONE_RULES } from '../zones/ZoneTypes';
import { RaycastManager } from '../core/engine/RaycastManager';

export class ZoneTool {
  public lotManager: LotManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public activeZoneType: ZoneType = 'residential';
  public lotWidth: number = 15;
  public lotLength: number = 20;

  private ghostMesh: THREE.Mesh;
  private ghostMaterial: THREE.MeshBasicMaterial;

  constructor(lotManager: LotManager, raycastManager: RaycastManager, scene: THREE.Scene) {
    this.lotManager = lotManager;
    this.raycastManager = raycastManager;
    this.scene = scene;

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
        return;
      }
    }

    // Otherwise create new lot at snapped location
    const newLot = this.lotManager.createLot(snappedPos, this.lotWidth, this.lotLength, this.activeZoneType);
    this.lotManager.selectLot(newLot.id);
  }

  public update(): void {
    if (this.raycastManager.isHoveringGround) {
      this.ghostMesh.position.set(
        this.raycastManager.snappedPoint.x,
        0.05,
        this.raycastManager.snappedPoint.z
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

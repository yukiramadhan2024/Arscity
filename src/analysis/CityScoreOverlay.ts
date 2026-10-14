import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoadManager } from '../roads/RoadManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';
import { CityScoreAnalyzer, CityUrbanScore } from './CityScoreAnalyzer';

export class CityScoreOverlay {
  private scene: THREE.Scene;
  private overlayGroup: THREE.Group;
  public isActive: boolean = false;

  private createdGeometries: THREE.BufferGeometry[] = [];
  private createdMaterials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'CityScoreOverlayGroup';
    this.scene.add(this.overlayGroup);
  }

  public setVisible(
    visible: boolean,
    buildingManager?: BuildingManager,
    roadManager?: RoadManager,
    landscapeManager?: LandscapeManager,
    lotManager?: LotManager
  ): CityUrbanScore | null {
    this.isActive = visible;
    this.clear();

    if (!visible || !buildingManager || !roadManager || !landscapeManager || !lotManager) {
      return null;
    }

    const analyzer = CityScoreAnalyzer.getInstance();
    const score = analyzer.evaluateCity(buildingManager, roadManager, landscapeManager, lotManager);

    // 1. Render 400m Walkability Catchment Rings
    for (const fac of score.facilities) {
      const radius = Math.min(fac.coverageRadiusM, 80); // Scaled visual radius for neighborhood scale
      const circleGeo = new THREE.CircleGeometry(radius, 48);
      circleGeo.rotateX(-Math.PI / 2);
      this.createdGeometries.push(circleGeo);

      const color = fac.type === 'school' ? 0x007aff : fac.type === 'puskesmas' ? 0xff3b30 : fac.type === 'mosque' ? 0x34c759 : 0xff9500;
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.createdMaterials.push(mat);

      const mesh = new THREE.Mesh(circleGeo, mat);
      mesh.position.set(fac.position.x, 0.08, fac.position.z);
      this.overlayGroup.add(mesh);

      // Ring border
      const ringGeo = new THREE.RingGeometry(radius * 0.98, radius, 48);
      ringGeo.rotateX(-Math.PI / 2);
      this.createdGeometries.push(ringGeo);

      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.createdMaterials.push(ringMat);

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(fac.position.x, 0.1, fac.position.z);
      this.overlayGroup.add(ringMesh);
    }

    return score;
  }

  public clear(): void {
    while (this.overlayGroup.children.length > 0) {
      const child = this.overlayGroup.children[0];
      this.overlayGroup.remove(child);
      if ((child as any).dispose) {
        (child as any).dispose();
      }
    }

    for (const g of this.createdGeometries) g.dispose();
    this.createdGeometries = [];

    for (const m of this.createdMaterials) m.dispose();
    this.createdMaterials = [];
  }

  public dispose(): void {
    this.clear();
    if (this.overlayGroup.parent) {
      this.overlayGroup.parent.remove(this.overlayGroup);
    }
  }
}

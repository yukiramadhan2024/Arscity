import * as THREE from 'three';
import { RunoffSimulator, InundationPoint, CityRunoffReport } from '../simulation/RunoffSimulator';
import { Terrain } from '../world/Terrain';
import { RoadManager } from '../roads/RoadManager';
import { BuildingManager } from '../buildings/BuildingManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';

export class RunoffOverlay {
  private scene: THREE.Scene;
  private overlayGroup: THREE.Group;
  public isActive: boolean = false;
  public isExtremeStorm: boolean = false;

  private createdGeometries: THREE.BufferGeometry[] = [];
  private createdMaterials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'RunoffOverlayGroup';
    this.scene.add(this.overlayGroup);
  }

  public setExtremeStorm(active: boolean): void {
    this.isExtremeStorm = active;
  }

  public setVisible(
    visible: boolean,
    terrain?: Terrain,
    roadManager?: RoadManager,
    buildingManager?: BuildingManager,
    landscapeManager?: LandscapeManager,
    lotManager?: LotManager
  ): CityRunoffReport | null {
    this.isActive = visible;
    this.clear();

    if (!visible || !terrain || !roadManager || !buildingManager || !landscapeManager || !lotManager) {
      return null;
    }

    const sim = RunoffSimulator.getInstance();
    sim.setExtremeStorm(this.isExtremeStorm);
    const report = sim.evaluateCityRunoff(terrain, roadManager, buildingManager, landscapeManager, lotManager);

    // 1. Render Inundation Pools (water disks at accumulation points)
    for (const pt of report.inundationPoints) {
      const radius = pt.riskLevel === 'high' ? 8.5 : pt.riskLevel === 'medium' ? 6.0 : 4.0;
      const geo = new THREE.CircleGeometry(radius, 24);
      geo.rotateX(-Math.PI / 2);
      this.createdGeometries.push(geo);

      const color = pt.riskLevel === 'high' ? 0x007aff : pt.riskLevel === 'medium' ? 0x5ac8fa : 0x34c759;
      const opacity = pt.riskLevel === 'high' ? 0.65 : pt.riskLevel === 'medium' ? 0.45 : 0.25;

      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      this.createdMaterials.push(mat);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pt.position.x, pt.position.y + 0.08, pt.position.z);
      this.overlayGroup.add(mesh);

      // Warning ring for high risk
      if (pt.riskLevel === 'high') {
        const ringGeo = new THREE.RingGeometry(radius * 0.95, radius, 24);
        ringGeo.rotateX(-Math.PI / 2);
        this.createdGeometries.push(ringGeo);

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xff3b30,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        this.createdMaterials.push(ringMat);

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(pt.position.x, pt.position.y + 0.1, pt.position.z);
        this.overlayGroup.add(ringMesh);
      }
    }

    // 2. Render Rainwater Drainage Streamlines / Flow Direction Arrows
    const arrowHelperCount = 18;
    const step = 28;
    const half = (arrowHelperCount * step) / 2;

    for (let x = -half; x <= half; x += step) {
      for (let z = -half; z <= half; z += step) {
        const y = terrain.getHeightAt(x, z);
        const dhdx = (terrain.getHeightAt(x + 2, z) - terrain.getHeightAt(x - 2, z)) / 4;
        const dhdz = (terrain.getHeightAt(x, z + 2) - terrain.getHeightAt(x, z - 2)) / 4;

        // Gradient vector downhill: -grad(h)
        const flowDir = new THREE.Vector3(-dhdx, 0, -dhdz);
        const slopeLen = flowDir.length();
        if (slopeLen > 0.02) {
          flowDir.normalize();
          const arrowLen = Math.min(6, Math.max(2.5, slopeLen * 25));
          const arrow = new THREE.ArrowHelper(
            flowDir,
            new THREE.Vector3(x, y + 0.25, z),
            arrowLen,
            0x007aff,
            1.0,
            0.6
          );
          this.overlayGroup.add(arrow);
        }
      }
    }

    // 3. Render 3D Semi-Transparent Flood Water Surface on Lots with Low KDH (<25%) / High Runoff
    for (const lot of lotManager.lots.values()) {
      const floodInfo = sim.evaluateLotFlooding(lot, landscapeManager, undefined, lotManager);
      const kdh = lot.metrics?.kdhPercent ?? 0;
      const isLowKdh = kdh < 25;
      const shouldShowFlood = floodInfo.floodDepthCm > 2.0 || (this.isExtremeStorm && isLowKdh && floodInfo.floodDepthCm > 0.5);

      if (shouldShowFlood) {
        const waterGeo = new THREE.PlaneGeometry(lot.width - 0.4, lot.length - 0.4);
        waterGeo.rotateX(-Math.PI / 2);
        this.createdGeometries.push(waterGeo);

        const waterColor = this.isExtremeStorm ? 0x0ea5e9 : floodInfo.riskLevel === 'flooded' ? 0x007aff : 0x38bdf8;
        const waterMat = new THREE.MeshStandardMaterial({
          color: waterColor,
          roughness: 0.1,
          metalness: 0.3,
          transparent: true,
          opacity: 0.55, // 3D semi-transparan FloodSurfaceMesh
          depthWrite: false
        });
        this.createdMaterials.push(waterMat);

        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.name = `FloodSurfaceMesh_${lot.id}`;

        // Rise dynamically during extreme storm and recede when eco-drainage (sumur, biopori, kolam) absorbs runoff
        const baseRise = this.isExtremeStorm ? 0.30 : 0.08;
        const depthRise = (floodInfo.floodDepthCm / 100) * (this.isExtremeStorm ? 1.2 : 0.7);
        const heightM = Math.min(1.4, Math.max(0.12, baseRise + depthRise));

        waterMesh.position.set(lot.position.x, lot.position.y + heightM, lot.position.z);
        this.overlayGroup.add(waterMesh);
      }
    }

    return report;
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

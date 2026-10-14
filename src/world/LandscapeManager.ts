import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import { LotParcel } from '../zones/ZoneTypes';

export type LandscapeType = 'grass_garden' | 'paving_block' | 'shade_tree' | 'well' | 'biopore';

export interface LandscapeItem {
  id: string;
  type: LandscapeType;
  position: THREE.Vector3;
  width?: number; // for rectangular patches (garden/paving)
  length?: number;
  radius?: number; // for circular items (trees: 3m canopy, wells, biopore)
  lotId?: string;
}

export class LandscapeManager {
  public items: Map<string, LandscapeItem> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;
  private itemGroups: Map<string, THREE.Group> = new Map();
  private nextId: number = 1;

  public onLandscapeUpdated?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'LandscapeMasterGroup';
    scene.add(this.masterGroup);
  }

  public addItem(item: LandscapeItem): LandscapeItem {
    this.items.set(item.id, item);

    const group = this.buildMeshForItem(item);
    this.masterGroup.add(group);
    this.itemGroups.set(item.id, group);

    if (this.onLandscapeUpdated) this.onLandscapeUpdated();
    return item;
  }

  public createItem(
    type: LandscapeType,
    position: THREE.Vector3,
    options: { width?: number; length?: number; radius?: number } = {}
  ): LandscapeItem {
    const id = `land_${this.nextId++}`;
    const item: LandscapeItem = {
      id,
      type,
      position: position.clone(),
      width: options.width ?? (type === 'grass_garden' || type === 'paving_block' ? 4 : undefined),
      length: options.length ?? (type === 'grass_garden' || type === 'paving_block' ? 4 : undefined),
      radius: options.radius ?? (type === 'shade_tree' ? 2.5 : type === 'well' ? 0.8 : 0.3),
    };

    return this.addItem(item);
  }

  public removeItem(id: string): boolean {
    if (!this.items.has(id)) return false;

    const group = this.itemGroups.get(id);
    if (group) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
      this.itemGroups.delete(id);
    }

    this.items.delete(id);
    if (this.onLandscapeUpdated) this.onLandscapeUpdated();
    return true;
  }

  private buildMeshForItem(item: LandscapeItem): THREE.Group {
    const group = new THREE.Group();
    group.name = `Landscape_${item.id}`;
    group.position.copy(item.position);
    group.userData = { landscapeId: item.id, type: 'landscape' };

    const matLib = MaterialLibrary.getInstance();

    switch (item.type) {
      case 'grass_garden': {
        const w = item.width || 4;
        const l = item.length || 4;
        const geom = new THREE.PlaneGeometry(w, l);
        geom.rotateX(-Math.PI / 2);
        const mat = matLib.getMaterial('grass');
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = 0.04; // slightly above terrain/lot
        mesh.receiveShadow = true;
        group.add(mesh);
        break;
      }

      case 'paving_block': {
        const w = item.width || 4;
        const l = item.length || 4;
        const geom = new THREE.PlaneGeometry(w, l);
        geom.rotateX(-Math.PI / 2);
        const mat = matLib.getMaterial('paving');
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = 0.04;
        mesh.receiveShadow = true;
        group.add(mesh);
        break;
      }

      case 'shade_tree': {
        const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8);
        const trunkMat = matLib.getMaterial('wood', { color: 0x5c3a21 });
        const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
        trunkMesh.position.y = 1.25;
        trunkMesh.castShadow = true;
        group.add(trunkMesh);

        // Canopy
        const canopyGeom = new THREE.DodecahedronGeometry(item.radius || 2.5, 1);
        const canopyMat = matLib.getMaterial('foliage');
        const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
        canopyMesh.position.y = 3.6;
        canopyMesh.castShadow = true;
        group.add(canopyMesh);
        break;
      }

      case 'well': {
        // Sumur resapan circular ring
        const r = item.radius || 0.8;
        const wellGeom = new THREE.CylinderGeometry(r, r, 0.4, 16);
        const wellMat = matLib.getMaterial('concrete');
        const wellMesh = new THREE.Mesh(wellGeom, wellMat);
        wellMesh.position.y = 0.2;
        group.add(wellMesh);
        break;
      }

      case 'biopore': {
        // Lubang biopori cap
        const r = item.radius || 0.25;
        const bioGeom = new THREE.CylinderGeometry(r, r, 0.1, 12);
        const bioMat = matLib.getMaterial('dark_metal');
        const bioMesh = new THREE.Mesh(bioGeom, bioMat);
        bioMesh.position.y = 0.05;
        group.add(bioMesh);
        break;
      }
    }

    return group;
  }

  /**
   * Calculate true green area inside a specific lot parcel
   */
  public getGreenAreaInLot(lot: LotParcel): number {
    const halfW = lot.width / 2;
    const halfL = lot.length / 2;
    let greenArea = 0;

    for (const item of this.items.values()) {
      const dx = Math.abs(item.position.x - lot.position.x);
      const dz = Math.abs(item.position.z - lot.position.z);

      if (dx <= halfW && dz <= halfL) {
        if (item.type === 'grass_garden') {
          greenArea += (item.width || 4) * (item.length || 4);
        } else if (item.type === 'shade_tree') {
          // Canopy area projection = PI * r^2
          const r = item.radius || 2.5;
          greenArea += Math.PI * r * r;
        }
      }
    }

    return Math.min(lot.areaM2, Math.round(greenArea * 10) / 10);
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
      }
    });
  }

  public dispose(): void {
    for (const grp of this.itemGroups.values()) {
      this.disposeGroup(grp);
    }
    this.items.clear();
    this.itemGroups.clear();
    this.scene.remove(this.masterGroup);
  }
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import { LotParcel } from '../zones/ZoneTypes';
import { applyFoliageSubsurfaceShader } from '../materials/WindShader';

export type LandscapeType =
  | 'grass_garden'
  | 'grass_patch'
  | 'paving_block'
  | 'paving_patch'
  | 'shade_tree'
  | 'tree'
  | 'shrub'
  | 'stepping_stones'
  | 'well'
  | 'biopore'
  | 'river_segment'
  | 'retention_pond'
  | 'bioswale_channel';


export interface LandscapeItem {
  id: string;
  type: LandscapeType;
  position: THREE.Vector3;
  width?: number; // for rectangular patches (garden/paving/river/swale)
  length?: number;
  radius?: number; // for circular items (trees: 3m canopy, wells, biopore, pond)
  lotId?: string;
}

import { springAnimator } from '../core/engine/SpringAnimator';

export class LandscapeManager {
  public items: Map<string, LandscapeItem> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;
  private itemGroups: Map<string, THREE.Group> = new Map();
  private nextId: number = 1;

  public onLandscapeUpdated?: () => void;

  public get elements(): LandscapeItem[] {
    return Array.from(this.items.values());
  }

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

    // Tactile placement spring animation
    springAnimator.triggerPlacementSpring(group);

    if (this.onLandscapeUpdated) this.onLandscapeUpdated();
    return item;
  }

  public createItem(
    type: LandscapeType,
    position: THREE.Vector3,
    options: { width?: number; length?: number; radius?: number } = {}
  ): LandscapeItem {
    const id = `land_${this.nextId++}`;
    let defaultWidth: number | undefined;
    let defaultLength: number | undefined;
    let defaultRadius: number | undefined;

    if (type === 'grass_garden' || type === 'paving_block') {
      defaultWidth = 4;
      defaultLength = 4;
    } else if (type === 'river_segment') {
      defaultWidth = 12;
      defaultLength = 24;
    } else if (type === 'retention_pond') {
      defaultWidth = 16;
      defaultLength = 16;
      defaultRadius = 8;
    } else if (type === 'bioswale_channel') {
      defaultWidth = 3;
      defaultLength = 12;
    } else if (type === 'shade_tree') {
      defaultRadius = 2.5;
    } else if (type === 'well') {
      defaultRadius = 0.8;
    } else if (type === 'biopore') {
      defaultRadius = 0.25;
    }

    const item: LandscapeItem = {
      id,
      type,
      position: position.clone(),
      width: options.width ?? defaultWidth,
      length: options.length ?? defaultLength,
      radius: options.radius ?? defaultRadius,
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
      case 'grass_garden':
      case 'grass_patch': {
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

      case 'paving_block':
      case 'paving_patch': {
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

      case 'shade_tree':
      case 'tree': {
        const rad = item.radius || 2.5;
        const scaleFactor = rad / 2.5;

        // Organic branched trunk
        const baseTrunk = new THREE.CylinderGeometry(0.22 * scaleFactor, 0.38 * scaleFactor, 2.6 * scaleFactor, 8);
        baseTrunk.translate(0, 1.3 * scaleFactor, 0);

        const b1 = new THREE.CylinderGeometry(0.12 * scaleFactor, 0.18 * scaleFactor, 1.6 * scaleFactor, 6);
        b1.rotateZ(0.38);
        b1.rotateY(0.2);
        b1.translate(0.4 * scaleFactor, 2.4 * scaleFactor, 0.1 * scaleFactor);

        const b2 = new THREE.CylinderGeometry(0.11 * scaleFactor, 0.17 * scaleFactor, 1.5 * scaleFactor, 6);
        b2.rotateZ(-0.35);
        b2.rotateY(2.1);
        b2.translate(-0.35 * scaleFactor, 2.5 * scaleFactor, 0.3 * scaleFactor);

        const b3 = new THREE.CylinderGeometry(0.12 * scaleFactor, 0.18 * scaleFactor, 1.6 * scaleFactor, 6);
        b3.rotateZ(-0.32);
        b3.rotateY(-2.0);
        b3.translate(-0.25 * scaleFactor, 2.3 * scaleFactor, -0.35 * scaleFactor);

        const mergedTrunk = mergeGeometries([baseTrunk, b1, b2, b3], false);
        const trunkMat = matLib.getMaterial('wood', { color: 0x452e1e, roughness: 0.92 });
        const trunkMesh = new THREE.Mesh(mergedTrunk || baseTrunk, trunkMat);
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        group.add(trunkMesh);

        // Multi-cluster umbrella canopy
        const domeCenter = new THREE.DodecahedronGeometry(rad * 0.95, 1);
        domeCenter.translate(0, 4.0 * scaleFactor, 0);

        const dome1 = new THREE.DodecahedronGeometry(rad * 0.72, 1);
        dome1.translate(-rad * 0.55, 3.6 * scaleFactor, rad * 0.28);

        const dome2 = new THREE.DodecahedronGeometry(rad * 0.72, 1);
        dome2.translate(rad * 0.58, 3.7 * scaleFactor, -rad * 0.24);

        const dome3 = new THREE.DodecahedronGeometry(rad * 0.65, 1);
        dome3.translate(rad * 0.15, 3.5 * scaleFactor, rad * 0.55);

        const dome4 = new THREE.DodecahedronGeometry(rad * 0.62, 1);
        dome4.translate(-rad * 0.2, 3.8 * scaleFactor, -rad * 0.52);

        const dome5 = new THREE.DodecahedronGeometry(rad * 0.55, 1);
        dome5.translate(rad * 0.4, 3.2 * scaleFactor, rad * 0.4);

        const mergedCanopy = mergeGeometries([domeCenter, dome1, dome2, dome3, dome4, dome5], false);
        const canopyMat = new THREE.MeshStandardMaterial({
          color: 0x2e4f1e,
          roughness: 0.76,
          metalness: 0.02,
        });
        applyFoliageSubsurfaceShader(canopyMat);

        const canopyMesh = new THREE.Mesh(mergedCanopy || domeCenter, canopyMat);
        canopyMesh.castShadow = true;
        canopyMesh.receiveShadow = true;
        group.add(canopyMesh);
        break;
      }

      case 'shrub': {
        // Multi-tier tropical shrubs & ferns
        const s1 = new THREE.DodecahedronGeometry(0.85, 1);
        s1.translate(0, 0.45, 0);
        const s2 = new THREE.DodecahedronGeometry(0.65, 1);
        s2.translate(0.5, 0.35, 0.2);
        const s3 = new THREE.DodecahedronGeometry(0.6, 1);
        s3.translate(-0.45, 0.32, -0.2);

        const mergedShrub = mergeGeometries([s1, s2, s3], false);
        const shrubMat = new THREE.MeshStandardMaterial({
          color: 0x3d7025,
          roughness: 0.8,
          metalness: 0.02,
        });
        applyFoliageSubsurfaceShader(shrubMat);

        const shrubMesh = new THREE.Mesh(mergedShrub || s1, shrubMat);
        shrubMesh.castShadow = true;
        shrubMesh.receiveShadow = true;
        group.add(shrubMesh);
        break;
      }

      case 'stepping_stones': {
        // Natural garden stepping stones
        const stoneMat = matLib.getMaterial('stone_plinth', { color: 0x64748b, roughness: 0.75 });
        const stoneGeom = new THREE.CylinderGeometry(0.42, 0.45, 0.06, 8);
        const stoneMesh = new THREE.Mesh(stoneGeom, stoneMat);
        stoneMesh.position.y = 0.03;
        stoneMesh.receiveShadow = true;
        group.add(stoneMesh);
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

      case 'river_segment': {
        const w = item.width || 12;
        const l = item.length || 24;

        // Riverbed substrate
        const bedGeom = new THREE.PlaneGeometry(w - 1.6, l);
        bedGeom.rotateX(-Math.PI / 2);
        const bedMat = matLib.getMaterial('soil');
        const bedMesh = new THREE.Mesh(bedGeom, bedMat);
        bedMesh.position.y = -0.05;
        group.add(bedMesh);

        // Animated / reflective water surface
        const waterGeom = new THREE.PlaneGeometry(w - 1.2, l);
        waterGeom.rotateX(-Math.PI / 2);
        const waterMat = matLib.getMaterial('water');
        const waterMesh = new THREE.Mesh(waterGeom, waterMat);
        waterMesh.position.y = 0.03;
        group.add(waterMesh);

        // Stone masonry embankment walls (Talud Batu Kali)
        const wallGeom = new THREE.BoxGeometry(0.8, 0.65, l);
        const wallMat = matLib.getMaterial('stone_plinth');

        const leftWall = new THREE.Mesh(wallGeom, wallMat);
        leftWall.position.set(-w / 2 + 0.4, 0.3, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        group.add(leftWall);

        const rightWall = new THREE.Mesh(wallGeom, wallMat);
        rightWall.position.set(w / 2 - 0.4, 0.3, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        group.add(rightWall);

        // GSS Buffer indicator lines (10m from river edge)
        const lineMat = new THREE.LineDashedMaterial({
          color: 0x007aff,
          dashSize: 1.5,
          gapSize: 1.0,
          transparent: true,
          opacity: 0.55
        });

        const halfL = l / 2;
        const gssOffset = w / 2 + 10.0;

        // Left GSS Line
        const leftGssGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-gssOffset, 0.1, -halfL),
          new THREE.Vector3(-gssOffset, 0.1, halfL)
        ]);
        const leftGssLine = new THREE.Line(leftGssGeom, lineMat);
        leftGssLine.computeLineDistances();
        group.add(leftGssLine);

        // Right GSS Line
        const rightGssGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(gssOffset, 0.1, -halfL),
          new THREE.Vector3(gssOffset, 0.1, halfL)
        ]);
        const rightGssLine = new THREE.Line(rightGssGeom, lineMat);
        rightGssLine.computeLineDistances();
        group.add(rightGssLine);
        break;
      }

      case 'retention_pond': {
        const w = item.width || 16;
        const l = item.length || 16;

        // Pond water surface
        const waterGeom = new THREE.PlaneGeometry(w - 1.6, l - 1.6);
        waterGeom.rotateX(-Math.PI / 2);
        const waterMat = matLib.getMaterial('water');
        const waterMesh = new THREE.Mesh(waterGeom, waterMat);
        waterMesh.position.y = 0.04;
        group.add(waterMesh);

        // Stone plinth border coping
        const copingMat = matLib.getMaterial('stone_plinth');

        const horizGeom = new THREE.BoxGeometry(w, 0.45, 0.8);
        const northCoping = new THREE.Mesh(horizGeom, copingMat);
        northCoping.position.set(0, 0.22, -l / 2 + 0.4);
        northCoping.castShadow = true;
        northCoping.receiveShadow = true;
        group.add(northCoping);

        const southCoping = new THREE.Mesh(horizGeom, copingMat);
        southCoping.position.set(0, 0.22, l / 2 - 0.4);
        southCoping.castShadow = true;
        southCoping.receiveShadow = true;
        group.add(southCoping);

        const vertGeom = new THREE.BoxGeometry(0.8, 0.45, l - 1.6);
        const westCoping = new THREE.Mesh(vertGeom, copingMat);
        westCoping.position.set(-w / 2 + 0.4, 0.22, 0);
        westCoping.castShadow = true;
        westCoping.receiveShadow = true;
        group.add(westCoping);

        const eastCoping = new THREE.Mesh(vertGeom, copingMat);
        eastCoping.position.set(w / 2 - 0.4, 0.22, 0);
        eastCoping.castShadow = true;
        eastCoping.receiveShadow = true;
        group.add(eastCoping);
        break;
      }

      case 'bioswale_channel': {
        const w = item.width || 3;
        const l = item.length || 12;

        // Vegetated grass depression
        const grassGeom = new THREE.PlaneGeometry(w, l);
        grassGeom.rotateX(-Math.PI / 2);
        const grassMat = matLib.getMaterial('grass');
        const grassMesh = new THREE.Mesh(grassGeom, grassMat);
        grassMesh.position.y = 0.03;
        grassMesh.receiveShadow = true;
        group.add(grassMesh);

        // Gravel / rock drainage spine in the middle
        const rockGeom = new THREE.PlaneGeometry(w * 0.4, l);
        rockGeom.rotateX(-Math.PI / 2);
        const rockMat = matLib.getMaterial('stone_plinth');
        const rockMesh = new THREE.Mesh(rockGeom, rockMat);
        rockMesh.position.y = 0.04;
        rockMesh.receiveShadow = true;
        group.add(rockMesh);
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
        } else if (item.type === 'bioswale_channel') {
          greenArea += (item.width || 3) * (item.length || 12) * 0.85;
        } else if (item.type === 'retention_pond') {
          greenArea += (item.width || 16) * (item.length || 16) * 0.5;
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

  public rebuildAll(): void {
    for (const grp of this.itemGroups.values()) {
      this.masterGroup.remove(grp);
      this.disposeGroup(grp);
    }
    this.itemGroups.clear();

    for (const item of this.items.values()) {
      const group = this.buildMeshForItem(item);
      this.masterGroup.add(group);
      this.itemGroups.set(item.id, group);
    }
    if (this.onLandscapeUpdated) this.onLandscapeUpdated();
  }

  public clearAll(): void {
    for (const grp of this.itemGroups.values()) {
      this.masterGroup.remove(grp);
      this.disposeGroup(grp);
    }
    this.items.clear();
    this.itemGroups.clear();
    if (this.onLandscapeUpdated) this.onLandscapeUpdated();
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

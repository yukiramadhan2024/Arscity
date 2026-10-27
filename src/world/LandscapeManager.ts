import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import { LotParcel } from '../zones/ZoneTypes';
import { applyFoliageSubsurfaceShader } from '../materials/WindShader';
import { AestheticLandscapeBuilder } from './AestheticLandscapeBuilder';

export type LandscapeType =
  // Standard Ecological & Hydrological Elements
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
  | 'bioswale_channel'
  // Kategori 1: Pohon & Flora Estetik Nusantara
  | 'tree_tabebuya_pink'
  | 'tree_tabebuya_gold'
  | 'tree_flamboyan'
  | 'tree_frangipani'
  | 'tree_banyan_kurung'
  | 'flora_bougainvillea_arch'
  | 'flora_yellow_bamboo'
  | 'flora_lotus_water'
  | 'tree_asam_jawa'
  // Kategori 2: Patung, Monumen, & Tetenger Kota
  | 'monument_tugu_jogja'
  | 'sculpture_kinetic_steel'
  | 'sculpture_candi_stone'
  | 'sculpture_wayang_corten'
  | 'fountain_reflecting_pool'
  | 'monument_clock_tower'
  // Kategori 3: Furnitur Jalan & Estetika Malam
  | 'street_malioboro_bollards'
  | 'street_festoon_lights'
  | 'street_timber_pergola'
  | 'gate_candi_bentar'
  | 'street_garden_lanterns'
  // Kategori 4: Ruang Publik & Tepian Air
  | 'plaza_mini_amphitheater'
  | 'waterfront_wood_deck'
  | 'bridge_green_pedestrian'
  | 'pavilion_garden_gazebo';

export interface LandscapeItem {
  id: string;
  type: LandscapeType;
  position: THREE.Vector3;
  rotationY?: number;
  width?: number; // for rectangular patches (garden/paving/river/swale/deck/bridge)
  length?: number;
  radius?: number; // for circular items (trees: 3m canopy, wells, biopore, pond, fountain)
  lotId?: string;
}

import { springAnimator } from '../core/engine/SpringAnimator';

export class LandscapeManager {
  private static activeManagers: Set<LandscapeManager> = new Set();

  public static setNightGlow(factor: number): void {
    for (const mgr of LandscapeManager.activeManagers) {
      mgr.updateNightGlow(factor);
    }
  }

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
    LandscapeManager.activeManagers.add(this);
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

  public getItemMesh(id: string): THREE.Group | undefined {
    return this.itemGroups.get(id);
  }

  public updateItemPosition(id: string, newPos: THREE.Vector3): void {
    const item = this.items.get(id);
    if (!item) return;
    item.position.copy(newPos);
    const group = this.itemGroups.get(id);
    if (group) {
      group.position.copy(newPos);
    }
    if (this.onLandscapeUpdated) {
      this.onLandscapeUpdated();
    }
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
    } else if (type === 'shade_tree' || type === 'tree') {
      defaultRadius = 2.5;
    } else if (type === 'well') {
      defaultRadius = 0.8;
    } else if (type === 'biopore') {
      defaultRadius = 0.25;
    } else if (type === 'tree_tabebuya_pink' || type === 'tree_tabebuya_gold') {
      defaultRadius = 3.0;
    } else if (type === 'tree_flamboyan') {
      defaultRadius = 3.8;
    } else if (type === 'tree_frangipani') {
      defaultRadius = 2.0;
    } else if (type === 'tree_banyan_kurung') {
      defaultRadius = 6.5;
    } else if (type === 'flora_bougainvillea_arch') {
      defaultWidth = 3.0;
      defaultLength = 1.8;
    } else if (type === 'flora_yellow_bamboo') {
      defaultWidth = 1.6;
      defaultLength = 0.9;
    } else if (type === 'flora_lotus_water') {
      defaultRadius = 2.4;
    } else if (type === 'tree_asam_jawa') {
      defaultRadius = 3.4;
    } else if (type === 'monument_tugu_jogja') {
      defaultWidth = 4.6;
      defaultLength = 4.6;
    } else if (type === 'sculpture_kinetic_steel') {
      defaultRadius = 1.6;
    } else if (type === 'sculpture_candi_stone') {
      defaultWidth = 2.4;
      defaultLength = 2.4;
    } else if (type === 'sculpture_wayang_corten') {
      defaultWidth = 2.6;
      defaultLength = 1.0;
    } else if (type === 'fountain_reflecting_pool') {
      defaultRadius = 4.2;
    } else if (type === 'monument_clock_tower') {
      defaultWidth = 3.2;
      defaultLength = 3.2;
    } else if (type === 'street_malioboro_bollards') {
      defaultWidth = 1.4;
      defaultLength = 3.8;
    } else if (type === 'street_festoon_lights') {
      defaultWidth = 1.0;
      defaultLength = 8.0;
    } else if (type === 'street_timber_pergola') {
      defaultWidth = 4.0;
      defaultLength = 2.4;
    } else if (type === 'gate_candi_bentar') {
      defaultWidth = 6.0;
      defaultLength = 2.0;
    } else if (type === 'street_garden_lanterns') {
      defaultWidth = 1.0;
      defaultLength = 4.2;
    } else if (type === 'plaza_mini_amphitheater') {
      defaultRadius = 7.5;
    } else if (type === 'waterfront_wood_deck') {
      defaultWidth = 8.0;
      defaultLength = 4.2;
    } else if (type === 'bridge_green_pedestrian') {
      defaultWidth = 3.2;
      defaultLength = 14.0;
    } else if (type === 'pavilion_garden_gazebo') {
      defaultWidth = 3.6;
      defaultLength = 3.6;
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
    const matLib = MaterialLibrary.getInstance();

    const isAesthetic =
      item.type.startsWith('tree_tabebuya') ||
      item.type === 'tree_flamboyan' ||
      item.type === 'tree_frangipani' ||
      item.type === 'tree_banyan_kurung' ||
      item.type === 'tree_asam_jawa' ||
      item.type.startsWith('flora_') ||
      item.type.startsWith('monument_') ||
      item.type.startsWith('sculpture_') ||
      item.type === 'fountain_reflecting_pool' ||
      item.type.startsWith('street_') ||
      item.type === 'gate_candi_bentar' ||
      item.type.startsWith('plaza_') ||
      item.type.startsWith('waterfront_') ||
      item.type.startsWith('bridge_') ||
      item.type.startsWith('pavilion_');

    if (isAesthetic) {
      return AestheticLandscapeBuilder.buildMesh(item, matLib);
    }

    const group = new THREE.Group();
    group.name = `Landscape_${item.id}`;
    group.position.copy(item.position);
    group.userData = { landscapeId: item.id, type: 'landscape' };

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
        // Sumur resapan circular surface ring + subterranean infiltration shaft (-3.0m)
        const r = item.radius || 0.8;
        const wellGeom = new THREE.CylinderGeometry(r, r, 0.4, 16);
        const wellMat = matLib.getMaterial('concrete');
        const wellMesh = new THREE.Mesh(wellGeom, wellMat);
        wellMesh.position.y = 0.2;
        group.add(wellMesh);

        // Subterranean concrete percolation well shaft down to -3.0m
        const shaftGeom = new THREE.CylinderGeometry(r * 0.95, r * 0.95, 3.0, 16);
        const shaftMat = matLib.getMaterial('concrete');
        const shaftMesh = new THREE.Mesh(shaftGeom, shaftMat);
        shaftMesh.position.y = -1.5;
        shaftMesh.userData = { isSubsurface: true };
        group.add(shaftMesh);

        // Cyan water infiltration diffusion sphere at bottom of well (-3.0m)
        const bubbleGeom = new THREE.SphereGeometry(r * 2.2, 16, 16);
        const bubbleMat = new THREE.MeshBasicMaterial({
          color: 0x00e5ff,
          transparent: true,
          opacity: 0.45,
          wireframe: false
        });
        const bubbleMesh = new THREE.Mesh(bubbleGeom, bubbleMat);
        bubbleMesh.position.y = -3.0;
        bubbleMesh.userData = { isSubsurface: true };
        group.add(bubbleMesh);
        break;
      }

      case 'biopore': {
        // Lubang biopori cap + subterranean percolation shaft (-1.2m)
        const r = item.radius || 0.25;
        const bioGeom = new THREE.CylinderGeometry(r, r, 0.1, 12);
        const bioMat = matLib.getMaterial('dark_metal');
        const bioMesh = new THREE.Mesh(bioGeom, bioMat);
        bioMesh.position.y = 0.05;
        group.add(bioMesh);

        // Subterranean pipe shaft down to -1.2m
        const pipeGeom = new THREE.CylinderGeometry(r * 0.85, r * 0.85, 1.2, 12);
        const pipeMat = matLib.getMaterial('concrete');
        const pipeMesh = new THREE.Mesh(pipeGeom, pipeMat);
        pipeMesh.position.y = -0.6;
        pipeMesh.userData = { isSubsurface: true };
        group.add(pipeMesh);

        // Cyan soil moisture dispersion sphere at bottom (-1.2m)
        const moistGeom = new THREE.SphereGeometry(0.65, 12, 12);
        const moistMat = new THREE.MeshBasicMaterial({
          color: 0x00b4d8,
          transparent: true,
          opacity: 0.4,
          wireframe: false
        });
        const moistMesh = new THREE.Mesh(moistGeom, moistMat);
        moistMesh.position.y = -1.2;
        moistMesh.userData = { isSubsurface: true };
        group.add(moistMesh);
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
        if (item.type === 'grass_garden' || item.type === 'grass_patch') {
          greenArea += (item.width || 4) * (item.length || 4);
        } else if (item.type === 'shade_tree' || item.type === 'tree') {
          const r = item.radius || 2.5;
          greenArea += Math.PI * r * r;
        } else if (item.type.startsWith('tree_')) {
          const r = item.radius || 3.0;
          greenArea += Math.PI * r * r;
        } else if (item.type === 'flora_bougainvillea_arch') {
          greenArea += (item.width || 3) * (item.length || 1.8) * 0.8;
        } else if (item.type === 'flora_yellow_bamboo') {
          greenArea += (item.width || 1.6) * (item.length || 0.9);
        } else if (item.type === 'flora_lotus_water') {
          const r = item.radius || 2.4;
          greenArea += Math.PI * r * r * 0.7;
        } else if (item.type === 'bioswale_channel') {
          greenArea += (item.width || 3) * (item.length || 12) * 0.85;
        } else if (item.type === 'retention_pond') {
          greenArea += (item.width || 16) * (item.length || 16) * 0.5;
        } else if (item.type === 'fountain_reflecting_pool') {
          const r = item.radius || 4.2;
          greenArea += Math.PI * r * r * 0.4;
        } else if (item.type === 'plaza_mini_amphitheater') {
          const r = item.radius || 7.5;
          greenArea += Math.PI * r * r * 0.35;
        } else if (item.type === 'pavilion_garden_gazebo') {
          greenArea += (item.width || 3.6) * (item.length || 3.6) * 0.5;
        }
      }
    }

    return Math.min(lot.areaM2, Math.round(greenArea * 10) / 10);
  }

  public updateNightGlow(factor: number): void {
    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    for (const group of this.itemGroups.values()) {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && (mat.userData?.isNightGlow || m.userData?.isNightGlow)) {
            const hexColor = mat.userData?.nightColor || m.userData?.nightColor || 0xffb347;
            mat.emissive.setHex(hexColor);
            mat.emissiveIntensity = clamped * 1.8;
            mat.needsUpdate = true;
          }
        }
      });
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (m.userData?.isInstanceMaterial) m.dispose();
            });
          } else if (mesh.material.userData?.isInstanceMaterial) {
            mesh.material.dispose();
          }
        }
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
    LandscapeManager.activeManagers.delete(this);
    for (const grp of this.itemGroups.values()) {
      this.disposeGroup(grp);
    }
    this.items.clear();
    this.itemGroups.clear();
    this.scene.remove(this.masterGroup);
  }
}

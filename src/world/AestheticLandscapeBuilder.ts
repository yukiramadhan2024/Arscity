import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { applyFoliageSubsurfaceShader, applyWindShader } from '../materials/WindShader';
import type { LandscapeItem } from './LandscapeManager';

/**
 * AestheticLandscapeBuilder
 * 100% Procedural 3D Geometry and PBR Construction for Arscity v3.0.0
 * 24 Aesthetic & Iconic Urban Placemaking Elements.
 *
 * All geometries are merged per material group to ensure minimal draw calls
 * and rock-solid 60 FPS performance.
 */
export class AestheticLandscapeBuilder {
  /**
   * Helper to safely merge an array of geometries or fallback to the first one
   */
  private static safeMerge(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) return new THREE.BoxGeometry(0.1, 0.1, 0.1);
    if (geometries.length === 1) return geometries[0];
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      for (const g of geometries) {
        g.dispose();
      }
      return merged;
    }
    return geometries[0];
  }

  /**
   * Builds an aesthetic landscape item group based on its type
   */
  public static buildMesh(item: LandscapeItem, matLib: MaterialLibrary): THREE.Group {
    const group = new THREE.Group();
    group.name = `Aesthetic_${item.type}_${item.id}`;
    group.position.copy(item.position);
    if (item.rotationY) group.rotation.y = item.rotationY;
    group.userData = { landscapeId: item.id, type: item.type };

    switch (item.type) {
      case 'tree_tabebuya_pink':
        this.buildTabebuya(group, item, matLib, true);
        break;
      case 'tree_tabebuya_gold':
        this.buildTabebuya(group, item, matLib, false);
        break;
      case 'tree_flamboyan':
        this.buildFlamboyan(group, item, matLib);
        break;
      case 'tree_frangipani':
        this.buildFrangipani(group, item, matLib);
        break;
      case 'tree_banyan_kurung':
        this.buildBanyanKurung(group, item, matLib);
        break;
      case 'flora_bougainvillea_arch':
        this.buildBougainvilleaArch(group, item, matLib);
        break;
      case 'flora_yellow_bamboo':
        this.buildYellowBamboo(group, item, matLib);
        break;
      case 'flora_lotus_water':
        this.buildLotusWater(group, item, matLib);
        break;
      case 'tree_asam_jawa':
        this.buildAsamJawa(group, item, matLib);
        break;

      case 'monument_tugu_jogja':
        this.buildTuguJogja(group, item, matLib);
        break;
      case 'sculpture_kinetic_steel':
        this.buildKineticSculpture(group, item, matLib);
        break;
      case 'sculpture_candi_stone':
        this.buildCandiStoneSculpture(group, item, matLib);
        break;
      case 'sculpture_wayang_corten':
        this.buildWayangGunungan(group, item, matLib);
        break;
      case 'fountain_reflecting_pool':
        this.buildReflectingFountain(group, item, matLib);
        break;
      case 'monument_clock_tower':
        this.buildClockTower(group, item, matLib);
        break;

      case 'street_malioboro_bollards':
        this.buildMalioboroBollards(group, item, matLib);
        break;
      case 'street_festoon_lights':
        this.buildFestoonLights(group, item, matLib);
        break;
      case 'street_timber_pergola':
        this.buildTimberPergola(group, item, matLib);
        break;
      case 'gate_candi_bentar':
        this.buildCandiBentarGate(group, item, matLib);
        break;
      case 'street_garden_lanterns':
        this.buildGardenLanterns(group, item, matLib);
        break;

      case 'plaza_mini_amphitheater':
        this.buildMiniAmphitheater(group, item, matLib);
        break;
      case 'waterfront_wood_deck':
        this.buildWaterfrontDeck(group, item, matLib);
        break;
      case 'bridge_green_pedestrian':
        this.buildGreenBridge(group, item, matLib);
        break;
      case 'pavilion_garden_gazebo':
        this.buildGardenGazebo(group, item, matLib);
        break;
    }

    return group;
  }

  // =========================================================================
  // 1. POHON & FLORA ESTETIK
  // =========================================================================

  private static buildTabebuya(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary, isPink: boolean): void {
    const rad = item.radius || 3.0;
    const s = rad / 3.0;

    // Organic branched trunk
    const t0 = new THREE.CylinderGeometry(0.24 * s, 0.40 * s, 2.8 * s, 8);
    t0.translate(0, 1.4 * s, 0);

    const b1 = new THREE.CylinderGeometry(0.14 * s, 0.20 * s, 2.0 * s, 6);
    b1.rotateZ(0.42);
    b1.rotateY(0.4);
    b1.translate(0.55 * s, 2.8 * s, 0.2 * s);

    const b2 = new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.8 * s, 6);
    b2.rotateZ(-0.45);
    b2.rotateY(2.2);
    b2.translate(-0.5 * s, 2.7 * s, 0.3 * s);

    const b3 = new THREE.CylinderGeometry(0.13 * s, 0.19 * s, 1.9 * s, 6);
    b3.rotateX(-0.4);
    b3.rotateY(-1.8);
    b3.translate(0.1 * s, 2.9 * s, -0.55 * s);

    const trunkGeom = this.safeMerge([t0, b1, b2, b3]);
    const trunkMat = matLib.getMaterial('bark', { color: 0x4a3424, roughness: 0.92 });
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // Multi-dome canopy clusters
    const c0 = new THREE.DodecahedronGeometry(rad * 0.85, 1);
    c0.translate(0, 4.2 * s, 0);

    const c1 = new THREE.DodecahedronGeometry(rad * 0.65, 1);
    c1.translate(-rad * 0.55, 3.8 * s, rad * 0.35);

    const c2 = new THREE.DodecahedronGeometry(rad * 0.65, 1);
    c2.translate(rad * 0.58, 3.9 * s, -rad * 0.3);

    const c3 = new THREE.DodecahedronGeometry(rad * 0.58, 1);
    c3.translate(rad * 0.2, 3.7 * s, rad * 0.58);

    const c4 = new THREE.DodecahedronGeometry(rad * 0.55, 1);
    c4.translate(-rad * 0.3, 4.1 * s, -rad * 0.5);

    const c5 = new THREE.DodecahedronGeometry(rad * 0.50, 1);
    c5.translate(rad * 0.45, 4.4 * s, rad * 0.2);

    const canopyGeom = this.safeMerge([c0, c1, c2, c3, c4, c5]);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: isPink ? 0x4a7c59 : 0xddb46c, // Subdued tropical foliage green & warm subdued golden floral
      roughness: 0.75,
      metalness: 0.02,
    });
    applyFoliageSubsurfaceShader(canopyMat);

    const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    group.add(canopyMesh);

    // Fallen petal carpet disc
    const petalGeom = new THREE.CylinderGeometry(rad * 0.88, rad * 0.92, 0.02, 16);
    petalGeom.translate(0, 0.01, 0);
    const petalMat = new THREE.MeshStandardMaterial({
      color: isPink ? 0x3e6b4b : 0xede0b8,
      roughness: 0.88,
      metalness: 0.02,
      transparent: true,
      opacity: 0.65,
    });
    const petalMesh = new THREE.Mesh(petalGeom, petalMat);
    petalMesh.name = 'PetalMesh';
    petalMesh.userData = { isDetail: true };
    petalMesh.receiveShadow = true;
    group.add(petalMesh);
  }

  private static buildFlamboyan(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 3.8;
    const s = rad / 3.8;

    // Sculptural spreading horizontal trunk
    const t0 = new THREE.CylinderGeometry(0.32 * s, 0.55 * s, 2.4 * s, 8);
    t0.translate(0, 1.2 * s, 0);

    const b1 = new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 2.8 * s, 6);
    b1.rotateZ(0.75);
    b1.translate(1.1 * s, 2.4 * s, 0.1 * s);

    const b2 = new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 2.8 * s, 6);
    b2.rotateZ(-0.72);
    b2.rotateY(2.1);
    b2.translate(-0.9 * s, 2.3 * s, 0.6 * s);

    const b3 = new THREE.CylinderGeometry(0.17 * s, 0.24 * s, 2.7 * s, 6);
    b3.rotateX(-0.70);
    b3.rotateY(-1.9);
    b3.translate(0.1 * s, 2.4 * s, -1.0 * s);

    const trunkGeom = this.safeMerge([t0, b1, b2, b3]);
    const trunkMat = matLib.getMaterial('bark', { color: 0x443022, roughness: 0.94 });
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // Wide horizontal umbrella canopy clusters
    const c0 = new THREE.DodecahedronGeometry(rad * 0.95, 1);
    c0.scale(1.3, 0.55, 1.3);
    c0.translate(0, 3.8 * s, 0);

    const c1 = new THREE.DodecahedronGeometry(rad * 0.70, 1);
    c1.scale(1.2, 0.5, 1.2);
    c1.translate(-rad * 0.65, 3.5 * s, rad * 0.3);

    const c2 = new THREE.DodecahedronGeometry(rad * 0.70, 1);
    c2.scale(1.2, 0.5, 1.2);
    c2.translate(rad * 0.70, 3.6 * s, -rad * 0.25);

    const c3 = new THREE.DodecahedronGeometry(rad * 0.65, 1);
    c3.scale(1.2, 0.5, 1.2);
    c3.translate(rad * 0.15, 3.4 * s, rad * 0.75);

    const c4 = new THREE.DodecahedronGeometry(rad * 0.62, 1);
    c4.scale(1.2, 0.5, 1.2);
    c4.translate(-rad * 0.25, 3.7 * s, -rad * 0.7);

    const canopyGeom = this.safeMerge([c0, c1, c2, c3, c4]);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Sunset red-orange
      roughness: 0.78,
      metalness: 0.02,
    });
    applyFoliageSubsurfaceShader(canopyMat);

    const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    group.add(canopyMesh);

    // Red petal scatter carpet
    const petalGeom = new THREE.CylinderGeometry(rad * 0.95, rad * 1.0, 0.02, 16);
    petalGeom.translate(0, 0.01, 0);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      opacity: 0.75,
    });
    const petalMesh = new THREE.Mesh(petalGeom, petalMat);
    petalMesh.name = 'PetalMesh';
    petalMesh.userData = { isDetail: true };
    petalMesh.receiveShadow = true;
    group.add(petalMesh);
  }

  private static buildFrangipani(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 2.0;
    const s = rad / 2.0;

    // Gnarled sculptural branches with characteristic crooked elbows
    const t0 = new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 1.6 * s, 6);
    t0.translate(0, 0.8 * s, 0);

    const b1 = new THREE.CylinderGeometry(0.11 * s, 0.15 * s, 1.4 * s, 6);
    b1.rotateZ(0.55);
    b1.translate(0.45 * s, 1.8 * s, 0);

    const b2 = new THREE.CylinderGeometry(0.10 * s, 0.14 * s, 1.3 * s, 6);
    b2.rotateZ(-0.52);
    b2.rotateY(2.2);
    b2.translate(-0.35 * s, 1.7 * s, 0.3 * s);

    const b3 = new THREE.CylinderGeometry(0.10 * s, 0.14 * s, 1.3 * s, 6);
    b3.rotateX(-0.5);
    b3.rotateY(-1.9);
    b3.translate(0.1 * s, 1.8 * s, -0.4 * s);

    const trunkGeom = this.safeMerge([t0, b1, b2, b3]);
    const trunkMat = matLib.getMaterial('wood', { color: 0x856d56, roughness: 0.88 });
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // Terminal leaf rosettes
    const l1 = new THREE.DodecahedronGeometry(0.85 * s, 1);
    l1.translate(0.8 * s, 2.5 * s, 0.1 * s);
    const l2 = new THREE.DodecahedronGeometry(0.80 * s, 1);
    l2.translate(-0.7 * s, 2.4 * s, 0.5 * s);
    const l3 = new THREE.DodecahedronGeometry(0.82 * s, 1);
    l3.translate(0.1 * s, 2.6 * s, -0.7 * s);

    const leafGeom = this.safeMerge([l1, l2, l3]);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x166534, // Deep glossy tropical green
      roughness: 0.70,
      metalness: 0.05,
    });
    applyWindShader(leafMat);

    const leafMesh = new THREE.Mesh(leafGeom, leafMat);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    group.add(leafMesh);

    // Blossoms: 12 white-yellow flower dots
    const flowerGeoms: THREE.BufferGeometry[] = [];
    const positions = [
      [0.8 * s, 2.8 * s, 0.1 * s],
      [0.9 * s, 2.6 * s, 0.3 * s],
      [0.65 * s, 2.7 * s, -0.1 * s],
      [-0.7 * s, 2.7 * s, 0.5 * s],
      [-0.85 * s, 2.5 * s, 0.3 * s],
      [-0.5 * s, 2.6 * s, 0.7 * s],
      [0.1 * s, 2.9 * s, -0.7 * s],
      [0.3 * s, 2.8 * s, -0.6 * s],
      [-0.1 * s, 2.85 * s, -0.8 * s],
    ];

    for (const [fx, fy, fz] of positions) {
      const f = new THREE.CylinderGeometry(0.12 * s, 0.04 * s, 0.06 * s, 5);
      f.translate(fx, fy, fz);
      flowerGeoms.push(f);
    }

    const flowerGeom = this.safeMerge(flowerGeoms);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      metalness: 0.05,
    });
    const flowerMesh = new THREE.Mesh(flowerGeom, flowerMat);
    group.add(flowerMesh);
  }

  private static buildBanyanKurung(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 6.5;
    const s = rad / 6.5;

    // Massive central trunk
    const t0 = new THREE.CylinderGeometry(0.65 * s, 0.95 * s, 4.5 * s, 10);
    t0.translate(0, 2.25 * s, 0);

    // 8 Hanging aerial root columns (sulur akar gantung)
    const rootGeoms: THREE.BufferGeometry[] = [t0];
    const rootAngles = [0.3, 1.1, 1.9, 2.7, 3.5, 4.3, 5.1, 5.9];
    for (const a of rootAngles) {
      const rx = Math.cos(a) * (1.6 * s);
      const rz = Math.sin(a) * (1.6 * s);
      const root = new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 3.8 * s, 6);
      root.translate(rx, 1.9 * s, rz);
      rootGeoms.push(root);
    }

    const trunkGeom = this.safeMerge(rootGeoms);
    const trunkMat = matLib.getMaterial('bark', { color: 0x3d2b1f, roughness: 0.95 });
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // Giant sprawling multi-dome canopy
    const c0 = new THREE.DodecahedronGeometry(rad * 0.9, 1);
    c0.scale(1.2, 0.65, 1.2);
    c0.translate(0, 5.5 * s, 0);

    const c1 = new THREE.DodecahedronGeometry(rad * 0.72, 1);
    c1.scale(1.2, 0.6, 1.2);
    c1.translate(-rad * 0.6, 5.0 * s, rad * 0.35);

    const c2 = new THREE.DodecahedronGeometry(rad * 0.72, 1);
    c2.scale(1.2, 0.6, 1.2);
    c2.translate(rad * 0.62, 5.1 * s, -rad * 0.32);

    const c3 = new THREE.DodecahedronGeometry(rad * 0.68, 1);
    c3.scale(1.2, 0.6, 1.2);
    c3.translate(rad * 0.2, 4.8 * s, rad * 0.65);

    const c4 = new THREE.DodecahedronGeometry(rad * 0.65, 1);
    c4.scale(1.2, 0.6, 1.2);
    c4.translate(-rad * 0.25, 5.2 * s, -rad * 0.6);

    const canopyGeom = this.safeMerge([c0, c1, c2, c3, c4]);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1b4332, // Deep ancient forest green
      roughness: 0.76,
      metalness: 0.02,
    });
    applyFoliageSubsurfaceShader(canopyMat);

    const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    group.add(canopyMesh);

    // Pagar Kurung: Circular / 16-sided white brick perimeter enclosure wall
    const fenceRadius = 3.8 * s;
    const fenceHeight = 0.85 * s;
    const wallGeom = new THREE.CylinderGeometry(fenceRadius, fenceRadius, fenceHeight, 16, 1, true);
    wallGeom.translate(0, fenceHeight / 2, 0);
    const copingGeom = new THREE.TorusGeometry(fenceRadius, 0.12 * s, 8, 16);
    copingGeom.rotateX(Math.PI / 2);
    copingGeom.translate(0, fenceHeight, 0);

    const fenceGeom = this.safeMerge([wallGeom, copingGeom]);
    const fenceMat = matLib.getMaterial('plaster', { color: 0xf8fafc, roughness: 0.85 });
    const fenceMesh = new THREE.Mesh(fenceGeom, fenceMat);
    fenceMesh.castShadow = true;
    fenceMesh.receiveShadow = true;
    group.add(fenceMesh);
  }

  private static buildBougainvilleaArch(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const w = item.width || 3.0;
    const l = item.length || 1.8;
    const h = 3.2;

    // Timber/steel trellis arch posts
    const p1 = new THREE.BoxGeometry(0.16, h, 0.16);
    p1.translate(-w / 2, h / 2, -l / 2);
    const p2 = new THREE.BoxGeometry(0.16, h, 0.16);
    p2.translate(w / 2, h / 2, -l / 2);
    const p3 = new THREE.BoxGeometry(0.16, h, 0.16);
    p3.translate(-w / 2, h / 2, l / 2);
    const p4 = new THREE.BoxGeometry(0.16, h, 0.16);
    p4.translate(w / 2, h / 2, l / 2);

    // Longitudinal & cross trellis rafters
    const b1 = new THREE.BoxGeometry(0.14, 0.14, l + 0.4);
    b1.translate(-w / 2, h, 0);
    const b2 = new THREE.BoxGeometry(0.14, 0.14, l + 0.4);
    b2.translate(w / 2, h, 0);

    const rafterGeoms: THREE.BufferGeometry[] = [p1, p2, p3, p4, b1, b2];
    const rCount = 6;
    for (let i = 0; i < rCount; i++) {
      const rz = -l / 2 + (i / (rCount - 1)) * l;
      const rf = new THREE.BoxGeometry(w + 0.4, 0.08, 0.1);
      rf.translate(0, h + 0.08, rz);
      rafterGeoms.push(rf);
    }

    const archFrameGeom = this.safeMerge(rafterGeoms);
    const frameMat = matLib.getMaterial('wood', { color: 0x3d271d, roughness: 0.85 });
    const frameMesh = new THREE.Mesh(archFrameGeom, frameMat);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    group.add(frameMesh);

    // Cascading magenta-purple bougainvillea vine mass
    const vineGeoms: THREE.BufferGeometry[] = [];
    const vine1 = new THREE.DodecahedronGeometry(0.9, 1);
    vine1.scale(1.4, 0.6, 1.2);
    vine1.translate(0, h + 0.35, 0);
    vineGeoms.push(vine1);

    const vine2 = new THREE.DodecahedronGeometry(0.75, 1);
    vine2.translate(-w / 2 + 0.2, h - 0.2, -l / 2 + 0.2);
    vineGeoms.push(vine2);

    const vine3 = new THREE.DodecahedronGeometry(0.75, 1);
    vine3.translate(w / 2 - 0.2, h - 0.2, l / 2 - 0.2);
    vineGeoms.push(vine3);

    const vine4 = new THREE.DodecahedronGeometry(0.65, 1);
    vine4.translate(-w / 2 + 0.25, 1.8, -l / 2 + 0.2);
    vineGeoms.push(vine4);

    const vine5 = new THREE.DodecahedronGeometry(0.65, 1);
    vine5.translate(w / 2 - 0.25, 1.8, l / 2 - 0.2);
    vineGeoms.push(vine5);

    const vineGeom = this.safeMerge(vineGeoms);
    const vineMat = new THREE.MeshStandardMaterial({
      color: 0xd946ef, // Vivid bougainvillea magenta
      roughness: 0.72,
      metalness: 0.02,
    });
    applyWindShader(vineMat);

    const vineMesh = new THREE.Mesh(vineGeom, vineMat);
    vineMesh.castShadow = true;
    vineMesh.receiveShadow = true;
    group.add(vineMesh);
  }

  private static buildYellowBamboo(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    // Candi stone planter box
    const boxW = 1.6;
    const boxL = 0.9;
    const boxH = 0.45;
    const boxGeom = new THREE.BoxGeometry(boxW, boxH, boxL);
    boxGeom.translate(0, boxH / 2, 0);

    const planterMat = matLib.getMaterial('stone_candi');
    const planterMesh = new THREE.Mesh(boxGeom, planterMat);
    planterMesh.castShadow = true;
    planterMesh.receiveShadow = true;
    group.add(planterMesh);

    // Soil fill
    const soilGeom = new THREE.PlaneGeometry(boxW - 0.16, boxL - 0.16);
    soilGeom.rotateX(-Math.PI / 2);
    soilGeom.translate(0, boxH + 0.01, 0);
    const soilMat = matLib.getMaterial('soil');
    const soilMesh = new THREE.Mesh(soilGeom, soilMat);
    group.add(soilMesh);

    // 14 jointed vertical yellow bamboo culms
    const culmGeoms: THREE.BufferGeometry[] = [];
    const leafGeoms: THREE.BufferGeometry[] = [];

    const culmPositions = [
      [-0.55, -0.22], [-0.35, -0.20], [-0.15, -0.24], [0.10, -0.20], [0.35, -0.22], [0.55, -0.24],
      [-0.45, 0.0], [-0.25, 0.02], [0.0, -0.02], [0.25, 0.0], [0.45, 0.02],
      [-0.50, 0.22], [-0.20, 0.20], [0.15, 0.22], [0.48, 0.20],
    ];

    for (let i = 0; i < culmPositions.length; i++) {
      const [cx, cz] = culmPositions[i];
      const h = 3.4 + (i % 4) * 0.25;

      const culm = new THREE.CylinderGeometry(0.032, 0.038, h, 6);
      culm.translate(cx, boxH + h / 2, cz);
      culmGeoms.push(culm);

      // Node rings
      const nodes = 5;
      for (let n = 1; n < nodes; n++) {
        const ny = boxH + (n / nodes) * h;
        const ring = new THREE.TorusGeometry(0.036, 0.008, 4, 8);
        ring.rotateX(Math.PI / 2);
        ring.translate(cx, ny, cz);
        culmGeoms.push(ring);
      }

      // Upper leaf spray
      const spray = new THREE.DodecahedronGeometry(0.28, 0);
      spray.scale(1.2, 0.7, 1.2);
      spray.translate(cx, boxH + h - 0.2, cz);
      leafGeoms.push(spray);
    }

    const mergedCulms = this.safeMerge(culmGeoms);
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Architectural yellow bamboo
      roughness: 0.55,
      metalness: 0.08,
    });
    const culmMesh = new THREE.Mesh(mergedCulms, bambooMat);
    culmMesh.castShadow = true;
    group.add(culmMesh);

    const mergedLeaves = this.safeMerge(leafGeoms);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.75,
      metalness: 0.02,
    });
    applyWindShader(leafMat);
    const leafMesh = new THREE.Mesh(mergedLeaves, leafMat);
    leafMesh.castShadow = true;
    group.add(leafMesh);

    // Integrated bottom uplight in planter box (glows at night)
    const uplightGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8);
    uplightGeom.translate(0, boxH + 0.02, 0);
    const uplightMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.8,
    });
    uplightMat.userData = { isNightGlow: true, nightColor: 0xffb347 };

    const uplightMesh = new THREE.Mesh(uplightGeom, uplightMat);
    uplightMesh.userData = { isNightGlow: true, nightColor: 0xffb347 };
    group.add(uplightMesh);
  }

  private static buildLotusWater(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 2.4;

    // Water surface disc
    const waterGeom = new THREE.CylinderGeometry(rad, rad, 0.08, 24);
    waterGeom.translate(0, 0.04, 0);
    const waterMat = matLib.getMaterial('water');
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    group.add(waterMesh);

    // 10 Floating round lotus lily pads
    const padGeoms: THREE.BufferGeometry[] = [];
    const padCoords = [
      [0.6, 0.4, 0.45],
      [-0.8, -0.5, 0.50],
      [1.1, -0.7, 0.40],
      [-1.2, 0.6, 0.48],
      [0.2, -1.2, 0.42],
      [-0.3, 1.1, 0.46],
      [1.3, 0.5, 0.38],
      [-0.4, -1.3, 0.42],
      [0.9, 1.2, 0.36],
      [-1.3, -0.8, 0.44],
    ];

    for (const [px, pz, pr] of padCoords) {
      const pad = new THREE.CylinderGeometry(pr, pr, 0.015, 12, 1, false, 0.2, Math.PI * 1.85); // V-notch
      pad.translate(px, 0.085, pz);
      padGeoms.push(pad);
    }

    const mergedPads = this.safeMerge(padGeoms);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.65,
      metalness: 0.02,
    });
    const padMesh = new THREE.Mesh(mergedPads, padMat);
    group.add(padMesh);

    // 5 Blossoming pink/white lotus flowers
    const blossomGeoms: THREE.BufferGeometry[] = [];
    const flowerCoords = [
      [0.55, 0.4],
      [-0.75, -0.45],
      [1.05, -0.65],
      [-0.25, 1.05],
      [0.15, -1.15],
    ];

    for (const [bx, bz] of flowerCoords) {
      const petal = new THREE.ConeGeometry(0.16, 0.18, 6);
      petal.rotateX(Math.PI);
      petal.translate(bx, 0.16, bz);
      blossomGeoms.push(petal);
    }

    const mergedFlowers = this.safeMerge(blossomGeoms);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xfce7f3, // Soft pink petals
      emissive: 0xf472b6,
      emissiveIntensity: 0.25,
      roughness: 0.5,
      metalness: 0.02,
    });
    const flowerMesh = new THREE.Mesh(mergedFlowers, flowerMat);
    group.add(flowerMesh);
  }

  private static buildAsamJawa(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 3.4;
    const s = rad / 3.4;

    // Tall mature street tree trunk
    const t0 = new THREE.CylinderGeometry(0.28 * s, 0.45 * s, 3.2 * s, 8);
    t0.translate(0, 1.6 * s, 0);

    const b1 = new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.2 * s, 6);
    b1.rotateZ(0.48);
    b1.translate(0.6 * s, 3.2 * s, 0);

    const b2 = new THREE.CylinderGeometry(0.15 * s, 0.20 * s, 2.0 * s, 6);
    b2.rotateZ(-0.45);
    b2.rotateY(2.0);
    b2.translate(-0.5 * s, 3.1 * s, 0.4 * s);

    const trunkGeom = this.safeMerge([t0, b1, b2]);
    const trunkMat = matLib.getMaterial('bark', { color: 0x3f2c1d, roughness: 0.94 });
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // Fine weeping umbrella canopy
    const c0 = new THREE.DodecahedronGeometry(rad * 0.9, 1);
    c0.scale(1.2, 0.65, 1.2);
    c0.translate(0, 4.6 * s, 0);

    const c1 = new THREE.DodecahedronGeometry(rad * 0.68, 1);
    c1.scale(1.15, 0.6, 1.15);
    c1.translate(-rad * 0.55, 4.3 * s, rad * 0.35);

    const c2 = new THREE.DodecahedronGeometry(rad * 0.68, 1);
    c2.scale(1.15, 0.6, 1.15);
    c2.translate(rad * 0.55, 4.4 * s, -rad * 0.3);

    const canopyGeom = this.safeMerge([c0, c1, c2]);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x4d7c0f, // Tamarind olive green
      roughness: 0.78,
      metalness: 0.02,
    });
    applyFoliageSubsurfaceShader(canopyMat);

    const canopyMesh = new THREE.Mesh(canopyGeom, canopyMat);
    canopyMesh.castShadow = true;
    canopyMesh.receiveShadow = true;
    group.add(canopyMesh);
  }

  // =========================================================================
  // 2. PATUNG, MONUMEN, & TETENGER KOTA
  // =========================================================================

  private static buildTuguJogja(group: THREE.Group, _item: LandscapeItem, matLib: MaterialLibrary): void {
    // 1. Stepped square ivory-white plinth (3 tiers)
    const p1 = new THREE.BoxGeometry(4.6, 0.45, 4.6);
    p1.translate(0, 0.225, 0);
    const p2 = new THREE.BoxGeometry(3.6, 0.40, 3.6);
    p2.translate(0, 0.65, 0);
    const p3 = new THREE.BoxGeometry(2.8, 0.40, 2.8);
    p3.translate(0, 1.05, 0);

    // Lower monument base & shaft
    const baseBlock = new THREE.BoxGeometry(2.1, 1.8, 2.1);
    baseBlock.translate(0, 2.15, 0);

    // Tapered square obelisk shaft
    const shaft = new THREE.CylinderGeometry(0.72, 0.95, 8.5, 4);
    shaft.rotateY(Math.PI / 4);
    shaft.translate(0, 7.3, 0);

    // Capital & pinnacle neck
    const cap = new THREE.BoxGeometry(1.6, 0.5, 1.6);
    cap.translate(0, 11.8, 0);

    const whiteGeom = this.safeMerge([p1, p2, p3, baseBlock, shaft, cap]);
    const whiteMat = matLib.getMaterial('plaster', { color: 0xfafafa, roughness: 0.85 });
    const whiteMesh = new THREE.Mesh(whiteGeom, whiteMat);
    whiteMesh.castShadow = true;
    whiteMesh.receiveShadow = true;
    group.add(whiteMesh);

    // 2. Gold filigree moldings & Golong-Gilig conical pinnacle
    const goldGeoms: THREE.BufferGeometry[] = [];

    // Moldings
    const mold1 = new THREE.BoxGeometry(2.25, 0.12, 2.25);
    mold1.translate(0, 1.28, 0);
    goldGeoms.push(mold1);

    const mold2 = new THREE.BoxGeometry(2.25, 0.12, 2.25);
    mold2.translate(0, 3.08, 0);
    goldGeoms.push(mold2);

    // Golong-Gilig conical spire
    const cone = new THREE.ConeGeometry(0.65, 2.4, 16);
    cone.translate(0, 13.25, 0);
    goldGeoms.push(cone);

    // Gilded pinnacle orb
    const orb = new THREE.SphereGeometry(0.28, 12, 12);
    orb.translate(0, 14.6, 0);
    goldGeoms.push(orb);

    const goldGeom = this.safeMerge(goldGeoms);
    const goldMat = matLib.getMaterial('gold_leaf');
    const goldMesh = new THREE.Mesh(goldGeom, goldMat);
    goldMesh.castShadow = true;
    group.add(goldMesh);

    // 3. Four corner spotlight fixtures (marked for night glow)
    const uplightGeoms: THREE.BufferGeometry[] = [];
    const lightCoords = [
      [-1.9, -1.9],
      [1.9, -1.9],
      [-1.9, 1.9],
      [1.9, 1.9],
    ];

    for (const [lx, lz] of lightCoords) {
      const box = new THREE.BoxGeometry(0.35, 0.25, 0.35);
      box.translate(lx, 0.125, lz);
      uplightGeoms.push(box);
    }

    const uplightGeom = this.safeMerge(uplightGeoms);
    const uplightMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.8,
    });
    uplightMat.userData = { isNightGlow: true, nightColor: 0xffe4b5 };

    const uplightMesh = new THREE.Mesh(uplightGeom, uplightMat);
    uplightMesh.userData = { isNightGlow: true, nightColor: 0xffe4b5 };
    group.add(uplightMesh);
  }

  private static buildKineticSculpture(group: THREE.Group, _item: LandscapeItem, matLib: MaterialLibrary): void {
    // Polished black granite pedestal
    const p1 = new THREE.CylinderGeometry(1.4, 1.5, 0.7, 8);
    p1.translate(0, 0.35, 0);
    const granMat = matLib.getMaterial('granite');
    const granMesh = new THREE.Mesh(p1, granMat);
    granMesh.castShadow = true;
    granMesh.receiveShadow = true;
    group.add(granMesh);

    // 3D Mobius / twisted kinetic ribbon loop in polished chrome
    const knot1 = new THREE.TorusKnotGeometry(1.2, 0.18, 64, 12, 2, 3);
    knot1.rotateX(Math.PI / 2);
    knot1.translate(0, 2.2, 0);

    const metalMat = matLib.getMaterial('kinetic_metal');
    const knotMesh = new THREE.Mesh(knot1, metalMat);
    knotMesh.castShadow = true;
    knotMesh.receiveShadow = true;
    group.add(knotMesh);

    // Recessed circular uplight ring
    const ringGeom = new THREE.TorusGeometry(1.1, 0.04, 8, 24);
    ringGeom.rotateX(Math.PI / 2);
    ringGeom.translate(0, 0.71, 0);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.1,
      metalness: 0.9,
    });
    ringMat.userData = { isNightGlow: true, nightColor: 0x38bdf8 };

    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.userData = { isNightGlow: true, nightColor: 0x38bdf8 };
    group.add(ringMesh);
  }

  private static buildCandiStoneSculpture(group: THREE.Group, _item: LandscapeItem, matLib: MaterialLibrary): void {
    // Stepped volcanic andesite stone block base
    const p1 = new THREE.BoxGeometry(2.4, 0.5, 2.4);
    p1.translate(0, 0.25, 0);
    const p2 = new THREE.BoxGeometry(1.8, 0.45, 1.8);
    p2.translate(0, 0.725, 0);

    // Abstract geometric chiseled monolithic totem
    const t1 = new THREE.CylinderGeometry(0.7, 0.9, 2.4, 5);
    t1.rotateY(0.4);
    t1.translate(0, 2.15, 0);

    const t2 = new THREE.ConeGeometry(0.85, 1.6, 5);
    t2.rotateX(Math.PI);
    t2.translate(0, 3.8, 0);

    const stoneGeom = this.safeMerge([p1, p2, t1, t2]);
    const stoneMat = matLib.getMaterial('stone_candi');
    const stoneMesh = new THREE.Mesh(stoneGeom, stoneMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    group.add(stoneMesh);

    // Dual ground uplights
    const l1 = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    l1.translate(-1.0, 0.1, 1.0);
    const l2 = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    l2.translate(1.0, 0.1, -1.0);

    const lightGeom = this.safeMerge([l1, l2]);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.8,
    });
    lightMat.userData = { isNightGlow: true, nightColor: 0xffb347 };

    const lightMesh = new THREE.Mesh(lightGeom, lightMat);
    lightMesh.userData = { isNightGlow: true, nightColor: 0xffb347 };
    group.add(lightMesh);
  }

  private static buildWayangGunungan(group: THREE.Group, _item: LandscapeItem, matLib: MaterialLibrary): void {
    // Plinth in candi stone
    const plinth = new THREE.BoxGeometry(2.6, 0.45, 1.0);
    plinth.translate(0, 0.225, 0);
    const plinthMat = matLib.getMaterial('stone_candi');
    const plinthMesh = new THREE.Mesh(plinth, plinthMat);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    group.add(plinthMesh);

    // Layered corten steel Gunungan pointed leaf silhouette
    // We compose the Gunungan shape with 3 geometric tiers (base rect, pentagon taper, apex triangle)
    const baseArch1 = new THREE.BoxGeometry(1.8, 1.6, 0.05);
    baseArch1.translate(0, 1.25, -0.06);

    const midTaper1 = new THREE.CylinderGeometry(0.6, 0.9, 1.8, 4);
    midTaper1.rotateY(Math.PI / 4);
    midTaper1.scale(1.4, 1.0, 0.08);
    midTaper1.translate(0, 2.9, -0.06);

    const apex1 = new THREE.ConeGeometry(0.7, 1.2, 4);
    apex1.rotateY(Math.PI / 4);
    apex1.scale(1.1, 1.0, 0.08);
    apex1.translate(0, 4.3, -0.06);

    // Front plate
    const baseArch2 = baseArch1.clone();
    baseArch2.translate(0, 0, 0.12);
    const midTaper2 = midTaper1.clone();
    midTaper2.translate(0, 0, 0.12);
    const apex2 = apex1.clone();
    apex2.translate(0, 0, 0.12);

    const cortenGeom = this.safeMerge([baseArch1, midTaper1, apex1, baseArch2, midTaper2, apex2]);
    const cortenMat = matLib.getMaterial('corten_steel');
    const cortenMesh = new THREE.Mesh(cortenGeom, cortenMat);
    cortenMesh.castShadow = true;
    cortenMesh.receiveShadow = true;
    group.add(cortenMesh);

    // Central glowing acrylic core (Gunungan internal life tree glow)
    const coreGeom = new THREE.BoxGeometry(1.2, 3.4, 0.06);
    coreGeom.translate(0, 2.5, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.90,
    });
    coreMat.userData = { isNightGlow: true, nightColor: 0xffb347 };

    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.userData = { isNightGlow: true, nightColor: 0xffb347 };
    group.add(coreMesh);
  }

  private static buildReflectingFountain(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 4.2;

    // Octagonal tiered granite pool basin wall
    const poolWall = new THREE.CylinderGeometry(rad, rad * 1.04, 0.65, 8, 1, true);
    poolWall.translate(0, 0.325, 0);
    const coping = new THREE.TorusGeometry(rad, 0.18, 6, 8);
    coping.rotateX(Math.PI / 2);
    coping.translate(0, 0.65, 0);

    // Central 2-tier carved stone fountain pedestal
    const p1 = new THREE.CylinderGeometry(1.1, 1.3, 0.8, 8);
    p1.translate(0, 0.4, 0);
    const bowl1 = new THREE.CylinderGeometry(1.6, 0.8, 0.35, 12);
    bowl1.translate(0, 0.95, 0);
    const p2 = new THREE.CylinderGeometry(0.5, 0.65, 0.8, 8);
    p2.translate(0, 1.45, 0);
    const bowl2 = new THREE.CylinderGeometry(0.9, 0.4, 0.3, 12);
    bowl2.translate(0, 1.95, 0);

    const stoneGeom = this.safeMerge([poolWall, coping, p1, bowl1, p2, bowl2]);
    const stoneMat = matLib.getMaterial('granite');
    const stoneMesh = new THREE.Mesh(stoneGeom, stoneMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    group.add(stoneMesh);

    // Reflecting water surface
    const waterGeom = new THREE.CylinderGeometry(rad - 0.1, rad - 0.1, 0.05, 16);
    waterGeom.translate(0, 0.50, 0);
    const waterMat = matLib.getMaterial('water');
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    group.add(waterMesh);

    // Semburan air: Central vertical geyser + 8 ring jet plumes
    const jetGeoms: THREE.BufferGeometry[] = [];
    const geyser = new THREE.ConeGeometry(0.28, 1.8, 8);
    geyser.translate(0, 2.9, 0);
    jetGeoms.push(geyser);

    const sprayCount = 8;
    for (let i = 0; i < sprayCount; i++) {
      const a = (i / sprayCount) * Math.PI * 2;
      const jx = Math.cos(a) * 2.2;
      const jz = Math.sin(a) * 2.2;
      const jet = new THREE.ConeGeometry(0.12, 1.2, 6);
      jet.rotateZ(Math.cos(a) * 0.25);
      jet.rotateX(Math.sin(a) * 0.25);
      jet.translate(jx, 1.1, jz);
      jetGeoms.push(jet);
    }

    const mergedJets = this.safeMerge(jetGeoms);
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    const jetMesh = new THREE.Mesh(mergedJets, jetMat);
    group.add(jetMesh);

    // Underwater pool lighting ring (glowing turquoise/amber at night)
    const lampGeom = new THREE.TorusGeometry(2.2, 0.06, 6, 16);
    lampGeom.rotateX(Math.PI / 2);
    lampGeom.translate(0, 0.45, 0);

    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.5,
    });
    lampMat.userData = { isNightGlow: true, nightColor: 0x38bdf8 };

    const lampMesh = new THREE.Mesh(lampGeom, lampMat);
    lampMesh.userData = { isNightGlow: true, nightColor: 0x38bdf8 };
    group.add(lampMesh);
  }

  private static buildClockTower(group: THREE.Group, _item: LandscapeItem, matLib: MaterialLibrary): void {
    // 1. Rusticated plinth & tower body
    const base = new THREE.BoxGeometry(3.2, 1.4, 3.2);
    base.translate(0, 0.7, 0);

    const body1 = new THREE.BoxGeometry(2.6, 7.5, 2.6);
    body1.translate(0, 5.15, 0);

    const cornice = new THREE.BoxGeometry(3.0, 0.45, 3.0);
    cornice.translate(0, 9.1, 0);

    const clockChamber = new THREE.BoxGeometry(2.8, 2.4, 2.8);
    clockChamber.translate(0, 10.5, 0);

    const bodyGeom = this.safeMerge([base, body1, cornice, clockChamber]);
    const bodyMat = matLib.getMaterial('plaster', { color: 0xf1f5f9, roughness: 0.85 });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Copper mansard roof & lantern
    const roof1 = new THREE.ConeGeometry(2.2, 2.4, 4);
    roof1.rotateY(Math.PI / 4);
    roof1.translate(0, 12.9, 0);

    const lantern = new THREE.CylinderGeometry(0.5, 0.6, 1.2, 6);
    lantern.translate(0, 14.6, 0);

    const spire = new THREE.ConeGeometry(0.18, 1.2, 6);
    spire.translate(0, 15.6, 0);

    const roofGeom = this.safeMerge([roof1, lantern, spire]);
    const roofMat = matLib.getMaterial('metal', { color: 0x334155, roughness: 0.45 });
    const roofMesh = new THREE.Mesh(roofGeom, roofMat);
    roofMesh.castShadow = true;
    group.add(roofMesh);

    // 3. Four illuminated clock dials (1.4m diameter)
    const dialGeoms: THREE.BufferGeometry[] = [];
    const offsets = [
      [0, 10.5, 1.41, 0],
      [0, 10.5, -1.41, Math.PI],
      [-1.41, 10.5, 0, -Math.PI / 2],
      [1.41, 10.5, 0, Math.PI / 2],
    ];

    for (const [dx, dy, dz, rotY] of offsets) {
      const dial = new THREE.CylinderGeometry(0.68, 0.68, 0.04, 16);
      dial.rotateX(Math.PI / 2);
      dial.rotateY(rotY);
      dial.translate(dx, dy, dz);
      dialGeoms.push(dial);
    }

    const mergedDials = this.safeMerge(dialGeoms);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.1,
    });
    dialMat.userData = { isNightGlow: true, nightColor: 0xffedd5 };

    const dialMesh = new THREE.Mesh(mergedDials, dialMat);
    dialMesh.userData = { isNightGlow: true, nightColor: 0xffedd5 };
    group.add(dialMesh);
  }

  // =========================================================================
  // 3. FURNITUR JALAN & ESTETIKA MALAM
  // =========================================================================

  private static buildMalioboroBollards(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const l = item.length || 3.8;

    // 1. Pavement base strip
    const base = new THREE.BoxGeometry(1.4, 0.08, l);
    base.translate(0, 0.04, 0);
    const baseMat = matLib.getMaterial('paving_block');
    const baseMesh = new THREE.Mesh(base, baseMat);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // 2. Three polished round terrazzo bollard spheres (bola batu teraso Malioboro)
    const bollardGeoms: THREE.BufferGeometry[] = [];
    const bollardZ = [-l * 0.35, 0, l * 0.35];

    for (const bz of bollardZ) {
      const plinth = new THREE.BoxGeometry(0.55, 0.12, 0.55);
      plinth.translate(0.35, 0.14, bz);
      const sphere = new THREE.SphereGeometry(0.30, 16, 16);
      sphere.translate(0.35, 0.46, bz);
      bollardGeoms.push(plinth, sphere);
    }

    const mergedBollards = this.safeMerge(bollardGeoms);
    const terrazzoMat = matLib.getMaterial('terrazzo');
    const bollardMesh = new THREE.Mesh(mergedBollards, terrazzoMat);
    bollardMesh.castShadow = true;
    bollardMesh.receiveShadow = true;
    group.add(bollardMesh);

    // 3. Classic Malioboro green cast-iron & teak wood bench
    const benchGroup = new THREE.Group();
    benchGroup.position.set(-0.35, 0.08, 0);

    const leg1 = new THREE.BoxGeometry(0.12, 0.45, 0.6);
    leg1.translate(0, 0.225, -0.6);
    const leg2 = new THREE.BoxGeometry(0.12, 0.45, 0.6);
    leg2.translate(0, 0.225, 0.6);
    const benchLegGeom = this.safeMerge([leg1, leg2]);
    const legMat = matLib.getMaterial('metal', { color: 0x166534, roughness: 0.6 }); // Heritage Jogja green
    const legMesh = new THREE.Mesh(benchLegGeom, legMat);
    benchGroup.add(legMesh);

    // Teak wood slats
    const slatGeoms: THREE.BufferGeometry[] = [];
    const seatSlat1 = new THREE.BoxGeometry(0.18, 0.04, 1.5);
    seatSlat1.translate(-0.1, 0.45, 0);
    const seatSlat2 = new THREE.BoxGeometry(0.18, 0.04, 1.5);
    seatSlat2.translate(0.1, 0.45, 0);
    const backSlat = new THREE.BoxGeometry(0.04, 0.28, 1.5);
    backSlat.translate(-0.2, 0.72, 0);
    slatGeoms.push(seatSlat1, seatSlat2, backSlat);

    const mergedSlats = this.safeMerge(slatGeoms);
    const woodMat = matLib.getMaterial('wood', { color: 0x854d0e });
    const slatMesh = new THREE.Mesh(mergedSlats, woodMat);
    slatMesh.castShadow = true;
    benchGroup.add(slatMesh);

    group.add(benchGroup);
  }

  private static buildFestoonLights(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const span = item.length || 8.0;
    const postH = 4.2;

    // Two slender black iron posts
    const p1 = new THREE.CylinderGeometry(0.06, 0.09, postH, 8);
    p1.translate(0, postH / 2, -span / 2);
    const arm1 = new THREE.BoxGeometry(0.4, 0.04, 0.04);
    arm1.translate(0, postH, -span / 2);

    const p2 = new THREE.CylinderGeometry(0.06, 0.09, postH, 8);
    p2.translate(0, postH / 2, span / 2);
    const arm2 = new THREE.BoxGeometry(0.4, 0.04, 0.04);
    arm2.translate(0, postH, span / 2);

    const postGeom = this.safeMerge([p1, arm1, p2, arm2]);
    const postMat = matLib.getMaterial('metal', { color: 0x1e293b, roughness: 0.5 });
    const postMesh = new THREE.Mesh(postGeom, postMat);
    postMesh.castShadow = true;
    group.add(postMesh);

    // Catenary sagging cable
    const curvePoints: THREE.Vector3[] = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const z = -span / 2 + t * span;
      // Parabolic sag
      const sag = 4.0 * 0.85 * t * (1.0 - t);
      const y = postH - sag;
      curvePoints.push(new THREE.Vector3(0, y, z));
    }
    const catenaryCurve = new THREE.CatmullRomCurve3(curvePoints);
    const cableGeom = new THREE.TubeGeometry(catenaryCurve, 24, 0.015, 6, false);
    const cableMesh = new THREE.Mesh(cableGeom, postMat);
    group.add(cableMesh);

    // 10 hanging teardrop Edison glass bulbs
    const bulbGeoms: THREE.BufferGeometry[] = [];
    const bulbCount = 10;
    for (let i = 1; i < bulbCount; i++) {
      const t = i / bulbCount;
      const pt = catenaryCurve.getPoint(t);
      const bulb = new THREE.SphereGeometry(0.08, 8, 8);
      bulb.scale(1.0, 1.4, 1.0);
      bulb.translate(pt.x, pt.y - 0.12, pt.z);
      bulbGeoms.push(bulb);
    }

    const mergedBulbs = this.safeMerge(bulbGeoms);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.1,
    });
    bulbMat.userData = { isNightGlow: true, nightColor: 0xffe4b5 };

    const bulbMesh = new THREE.Mesh(mergedBulbs, bulbMat);
    bulbMesh.userData = { isNightGlow: true, nightColor: 0xffe4b5 };
    group.add(bulbMesh);
  }

  private static buildTimberPergola(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const w = item.width || 4.0;
    const l = item.length || 2.4;
    const h = 3.2;

    // 4 Heavy square teak timber columns
    const p1 = new THREE.BoxGeometry(0.2, h, 0.2);
    p1.translate(-w / 2 + 0.2, h / 2, -l / 2 + 0.2);
    const p2 = new THREE.BoxGeometry(0.2, h, 0.2);
    p2.translate(w / 2 - 0.2, h / 2, -l / 2 + 0.2);
    const p3 = new THREE.BoxGeometry(0.2, h, 0.2);
    p3.translate(-w / 2 + 0.2, h / 2, l / 2 - 0.2);
    const p4 = new THREE.BoxGeometry(0.2, h, 0.2);
    p4.translate(w / 2 - 0.2, h / 2, l / 2 - 0.2);

    // Longitudinal main beams
    const b1 = new THREE.BoxGeometry(w + 0.6, 0.2, 0.14);
    b1.translate(0, h + 0.1, -l / 2 + 0.2);
    const b2 = new THREE.BoxGeometry(w + 0.6, 0.2, 0.14);
    b2.translate(0, h + 0.1, l / 2 - 0.2);

    // 10 Cross-rafters (kisi-kisi peneduh) casting rhythmic striped shadows
    const rafterGeoms: THREE.BufferGeometry[] = [p1, p2, p3, p4, b1, b2];
    const rCount = 10;
    for (let i = 0; i < rCount; i++) {
      const rx = -w / 2 + (i / (rCount - 1)) * w;
      const rf = new THREE.BoxGeometry(0.08, 0.14, l + 0.6);
      rf.translate(rx, h + 0.26, 0);
      rafterGeoms.push(rf);
    }

    const pergolaGeom = this.safeMerge(rafterGeoms);
    const woodMat = matLib.getMaterial('wood', { color: 0x78350f, roughness: 0.85 });
    const pergolaMesh = new THREE.Mesh(pergolaGeom, woodMat);
    pergolaMesh.castShadow = true;
    pergolaMesh.receiveShadow = true;
    group.add(pergolaMesh);

    // Ground timber decking
    const deck = new THREE.BoxGeometry(w, 0.08, l);
    deck.translate(0, 0.04, 0);
    const deckMat = matLib.getMaterial('wood', { color: 0x9a5925 });
    const deckMesh = new THREE.Mesh(deck, deckMat);
    deckMesh.receiveShadow = true;
    group.add(deckMesh);
  }

  private static buildCandiBentarGate(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const openingW = item.width || 6.0;
    const towerH = 6.4;

    const buildTower = (sign: number): THREE.BufferGeometry[] => {
      const geoms: THREE.BufferGeometry[] = [];
      const cx = (openingW / 2 + 1.1) * sign;

      // 4 Stepped tiers
      const t1 = new THREE.BoxGeometry(2.0, 1.8, 1.8);
      t1.translate(cx, 0.9, 0);
      const t2 = new THREE.BoxGeometry(1.6, 1.8, 1.5);
      t2.translate(cx, 2.7, 0);
      const t3 = new THREE.BoxGeometry(1.2, 1.6, 1.2);
      t3.translate(cx, 4.4, 0);
      const t4 = new THREE.BoxGeometry(0.8, 1.2, 0.8);
      t4.translate(cx, 5.8, 0);

      // Crown finial
      const finial = new THREE.ConeGeometry(0.4, 0.8, 4);
      finial.rotateY(Math.PI / 4);
      finial.translate(cx, 6.8, 0);

      geoms.push(t1, t2, t3, t4, finial);
      return geoms;
    };

    const leftTowers = buildTower(-1);
    const rightTowers = buildTower(1);

    const gateGeom = this.safeMerge([...leftTowers, ...rightTowers]);
    const brickMat = matLib.getMaterial('brick');
    const gateMesh = new THREE.Mesh(gateGeom, brickMat);
    gateMesh.castShadow = true;
    gateMesh.receiveShadow = true;
    group.add(gateMesh);
  }

  private static buildGardenLanterns(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const span = item.length || 4.2;

    const stoneGeoms: THREE.BufferGeometry[] = [];
    const lightGeoms: THREE.BufferGeometry[] = [];
    const lanternZ = [-span * 0.35, 0, span * 0.35];

    for (let i = 0; i < lanternZ.length; i++) {
      const lz = lanternZ[i];
      const lx = (i % 2 === 0 ? 0.35 : -0.35);

      // Stepped base
      const b1 = new THREE.BoxGeometry(0.5, 0.2, 0.5);
      b1.translate(lx, 0.1, lz);
      const pillar = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 6);
      pillar.translate(lx, 0.425, lz);
      const shelf = new THREE.BoxGeometry(0.65, 0.12, 0.65);
      shelf.translate(lx, 0.71, lz);

      // Pagoda roof cap
      const roof = new THREE.ConeGeometry(0.55, 0.35, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(lx, 1.15, lz);
      const finial = new THREE.SphereGeometry(0.08, 6, 6);
      finial.translate(lx, 1.35, lz);

      stoneGeoms.push(b1, pillar, shelf, roof, finial);

      // Carved light chamber (glowing core)
      const chamber = new THREE.BoxGeometry(0.36, 0.28, 0.36);
      chamber.translate(lx, 0.90, lz);
      lightGeoms.push(chamber);
    }

    const mergedStone = this.safeMerge(stoneGeoms);
    const stoneMat = matLib.getMaterial('stone_candi');
    const stoneMesh = new THREE.Mesh(mergedStone, stoneMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    group.add(stoneMesh);

    const mergedLights = this.safeMerge(lightGeoms);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.1,
    });
    lightMat.userData = { isNightGlow: true, nightColor: 0xffb347 };

    const lightMesh = new THREE.Mesh(mergedLights, lightMat);
    lightMesh.userData = { isNightGlow: true, nightColor: 0xffb347 };
    group.add(lightMesh);
  }

  // =========================================================================
  // 4. RUANG PUBLIK & TEPIAN AIR
  // =========================================================================

  private static buildMiniAmphitheater(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const rad = item.radius || 7.5;

    // Semi-circular concentric stepped tiers (3 tiers)
    const stoneTiers: THREE.BufferGeometry[] = [];
    const grassTiers: THREE.BufferGeometry[] = [];

    const tierCount = 3;
    for (let i = 0; i < tierCount; i++) {
      const rInner = 2.6 + i * 1.5;
      const rOuter = rInner + 1.4;
      const tierH = 0.42 * (i + 1);

      // Stone slab tread
      const stoneTread = new THREE.CylinderGeometry(rOuter, rOuter, 0.12, 16, 1, false, 0, Math.PI);
      stoneTread.translate(0, tierH, 0);
      stoneTiers.push(stoneTread);

      // Grass terrace riser
      const grassRiser = new THREE.CylinderGeometry(rOuter - 0.1, rOuter - 0.1, tierH - 0.12, 16, 1, false, 0, Math.PI);
      grassRiser.translate(0, (tierH - 0.12) / 2, 0);
      grassTiers.push(grassRiser);
    }

    const mergedStone = this.safeMerge(stoneTiers);
    const stoneMat = matLib.getMaterial('stone_candi');
    const stoneMesh = new THREE.Mesh(mergedStone, stoneMat);
    stoneMesh.castShadow = true;
    stoneMesh.receiveShadow = true;
    group.add(stoneMesh);

    const mergedGrass = this.safeMerge(grassTiers);
    const grassMat = matLib.getMaterial('grass');
    const grassMesh = new THREE.Mesh(mergedGrass, grassMat);
    grassMesh.receiveShadow = true;
    group.add(grassMesh);

    // Circular center wooden stage
    const stage = new THREE.CylinderGeometry(2.2, 2.2, 0.28, 20);
    stage.translate(0, 0.14, 0);
    const woodMat = matLib.getMaterial('wood', { color: 0x9a5925 });
    const stageMesh = new THREE.Mesh(stage, woodMat);
    stageMesh.castShadow = true;
    stageMesh.receiveShadow = true;
    group.add(stageMesh);
  }

  private static buildWaterfrontDeck(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const w = item.width || 8.0;
    const l = item.length || 4.2;

    // Teak wood boardwalk platform
    const deck = new THREE.BoxGeometry(w, 0.14, l);
    deck.translate(0, 0.22, 0);
    const woodMat = matLib.getMaterial('wood', { color: 0x9a5925, roughness: 0.72 });
    const deckMesh = new THREE.Mesh(deck, woodMat);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    group.add(deckMesh);

    // Concrete foundation pilings
    const pileGeoms: THREE.BufferGeometry[] = [];
    const pCoords = [
      [-w / 2 + 0.5, -l / 2 + 0.5],
      [0, -l / 2 + 0.5],
      [w / 2 - 0.5, -l / 2 + 0.5],
      [-w / 2 + 0.5, l / 2 - 0.5],
      [0, l / 2 - 0.5],
      [w / 2 - 0.5, l / 2 - 0.5],
    ];

    for (const [px, pz] of pCoords) {
      const pile = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8);
      pile.translate(px, -0.15, pz);
      pileGeoms.push(pile);
    }
    const pileGeom = this.safeMerge(pileGeoms);
    const concreteMat = matLib.getMaterial('concrete');
    const pileMesh = new THREE.Mesh(pileGeom, concreteMat);
    group.add(pileMesh);

    // Glass safety railings along outer perimeter
    const glassRail = new THREE.BoxGeometry(w, 0.9, 0.05);
    glassRail.translate(0, 0.75, l / 2 - 0.05);
    const glassMat = matLib.getMaterial('glass');
    const glassMesh = new THREE.Mesh(glassRail, glassMat);
    group.add(glassMesh);

    // 2 Wooden lounge chaise chairs
    const chairGeoms: THREE.BufferGeometry[] = [];
    for (const cx of [-1.8, 1.8]) {
      const seat = new THREE.BoxGeometry(0.7, 0.35, 1.6);
      seat.translate(cx, 0.45, 0);
      chairGeoms.push(seat);
    }
    const chairGeom = this.safeMerge(chairGeoms);
    const chairMat = matLib.getMaterial('wood', { color: 0x78350f });
    const chairMesh = new THREE.Mesh(chairGeom, chairMat);
    chairMesh.castShadow = true;
    group.add(chairMesh);
  }

  private static buildGreenBridge(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const l = item.length || 14.0;
    const w = item.width || 3.2;

    // Arched bridge deck
    const deck = new THREE.BoxGeometry(w, 0.25, l);
    deck.translate(0, 1.4, 0);
    const woodMat = matLib.getMaterial('wood', { color: 0x854d0e });
    const deckMesh = new THREE.Mesh(deck, woodMat);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    group.add(deckMesh);

    // Structural steel arch girders
    const archGirders: THREE.BufferGeometry[] = [];
    const g1 = new THREE.BoxGeometry(0.2, 0.45, l);
    g1.translate(-w / 2, 1.2, 0);
    const g2 = new THREE.BoxGeometry(0.2, 0.45, l);
    g2.translate(w / 2, 1.2, 0);
    archGirders.push(g1, g2);

    const girderGeom = this.safeMerge(archGirders);
    const metalMat = matLib.getMaterial('metal', { color: 0x1e293b, roughness: 0.5 });
    const girderMesh = new THREE.Mesh(girderGeom, metalMat);
    girderMesh.castShadow = true;
    group.add(girderMesh);

    // Side linear planters with hanging cascading greenery
    const planterGeoms: THREE.BufferGeometry[] = [];
    const foliageGeoms: THREE.BufferGeometry[] = [];

    const pl1 = new THREE.BoxGeometry(0.35, 0.4, l - 1.0);
    pl1.translate(-w / 2 - 0.2, 1.65, 0);
    const pl2 = new THREE.BoxGeometry(0.35, 0.4, l - 1.0);
    pl2.translate(w / 2 + 0.2, 1.65, 0);
    planterGeoms.push(pl1, pl2);

    const f1 = new THREE.BoxGeometry(0.4, 0.5, l - 0.8);
    f1.translate(-w / 2 - 0.2, 1.8, 0);
    const f2 = new THREE.BoxGeometry(0.4, 0.5, l - 0.8);
    f2.translate(w / 2 + 0.2, 1.8, 0);
    foliageGeoms.push(f1, f2);

    const planterGeom = this.safeMerge(planterGeoms);
    const planterMat = matLib.getMaterial('wood', { color: 0x452212 });
    const planterMesh = new THREE.Mesh(planterGeom, planterMat);
    group.add(planterMesh);

    const foliageGeom = this.safeMerge(foliageGeoms);
    const foliageMat = matLib.getMaterial('foliage');
    const foliageMesh = new THREE.Mesh(foliageGeom, foliageMat);
    group.add(foliageMesh);
  }

  private static buildGardenGazebo(group: THREE.Group, item: LandscapeItem, matLib: MaterialLibrary): void {
    const size = item.width || 3.6;
    const h = 2.4;

    // Stone plinth base
    const plinth = new THREE.BoxGeometry(size, 0.45, size);
    plinth.translate(0, 0.225, 0);
    const stoneMat = matLib.getMaterial('stone_plinth');
    const plinthMesh = new THREE.Mesh(plinth, stoneMat);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    group.add(plinthMesh);

    // 4 Turned teak wood pillars
    const colGeoms: THREE.BufferGeometry[] = [];
    const half = size / 2 - 0.35;
    const cCoords = [
      [-half, -half],
      [half, -half],
      [-half, half],
      [half, half],
    ];

    for (const [cx, cz] of cCoords) {
      const col = new THREE.CylinderGeometry(0.12, 0.14, h, 8);
      col.translate(cx, 0.45 + h / 2, cz);
      colGeoms.push(col);
    }

    // Low wooden perimeter bench railings on 3 sides
    const r1 = new THREE.BoxGeometry(size - 0.7, 0.4, 0.1);
    r1.translate(0, 0.65, -half);
    const r2 = new THREE.BoxGeometry(0.1, 0.4, size - 0.7);
    r2.translate(-half, 0.65, 0);
    const r3 = new THREE.BoxGeometry(0.1, 0.4, size - 0.7);
    r3.translate(half, 0.65, 0);
    colGeoms.push(r1, r2, r3);

    const woodGeom = this.safeMerge(colGeoms);
    const woodMat = matLib.getMaterial('wood', { color: 0x854d0e });
    const woodMesh = new THREE.Mesh(woodGeom, woodMat);
    woodMesh.castShadow = true;
    group.add(woodMesh);

    // Traditional tiered pyramidal limasan roof in terracotta tiles
    const roof1 = new THREE.ConeGeometry(size * 0.85, 1.4, 4);
    roof1.rotateY(Math.PI / 4);
    roof1.translate(0, 0.45 + h + 0.7, 0);

    const roofMat = matLib.getMaterial('roof_tile');
    const roofMesh = new THREE.Mesh(roof1, roofMat);
    roofMesh.castShadow = true;
    group.add(roofMesh);
  }
}

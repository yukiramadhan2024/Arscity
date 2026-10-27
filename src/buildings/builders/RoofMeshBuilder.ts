import * as THREE from 'three';
import { MaterialLibrary } from '../../materials/MaterialLibrary';

/**
 * RoofMeshBuilder - Modular builder for all architectural roof typologies:
 * Joglo, Limasan (Hip), Gable (Pelana), Sawtooth, Shed, Arched Vault, Butterfly, Flat.
 */
export class RoofMeshBuilder {
  private static getMaterial(name: string, fallbackColor?: string): THREE.Material {
    return MaterialLibrary.get(name) || MaterialLibrary.getInstance().getMaterial(name, {
      color: fallbackColor ? parseInt(fallbackColor.replace('#', '0x')) : 0xcccccc
    });
  }

  public static addBox(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rotX: number = 0,
    rotY: number = 0,
    rotZ: number = 0
  ): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);
    const uv = geom.attributes.uv;
    if (uv) {
      const uvScale = 1.5;
      const dims = [
        [d, h], // +X
        [d, h], // -X
        [w, d], // +Y
        [w, d], // -Y
        [w, h], // +Z
        [w, h]  // -Z
      ];
      for (let f = 0; f < 6; f++) {
        const [fw, fh] = dims[f];
        const su = Math.max(0.02, fw / uvScale);
        const sv = Math.max(0.02, fh / uvScale);
        for (let v = 0; v < 4; v++) {
          const idx = f * 4 + v;
          uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv);
        }
      }
      uv.needsUpdate = true;
    }

    if (rotX || rotY || rotZ) {
      geom.rotateX(rotX);
      geom.rotateY(rotY);
      geom.rotateZ(rotZ);
    }
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  /**
   * True Tiered Joglo Roof: Broad lower Emper + Soaring center Brunjung + Ridge + Lisplang
   */
  public static buildJogloRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    roofBaseY: number,
    roofTileMat: THREE.Material,
    ridgeCapMat?: THREE.Material,
    finialMat?: THREE.Material,
    lisplangMat?: THREE.Material
  ): void {
    const teakMat = lisplangMat || this.getMaterial('wood_slat', '#451a03');
    const capMat = ridgeCapMat || this.getMaterial('roof_tile', '#9a3412');
    const crownMat = finialMat || this.getMaterial('plaster', '#d97706');

    // 1. Dark Carved Lisplang Fascia Board Trim around lower eave
    const lisplangH = 0.22;
    const lisplangThick = 0.08;
    this.addBox(group, rw + 0.1, lisplangH, lisplangThick, 0, roofBaseY + lisplangH * 0.5, rl * 0.5, teakMat);
    this.addBox(group, rw + 0.1, lisplangH, lisplangThick, 0, roofBaseY + lisplangH * 0.5, -rl * 0.5, teakMat);
    this.addBox(group, lisplangThick, lisplangH, rl + 0.1, rw * 0.5, roofBaseY + lisplangH * 0.5, 0, teakMat);
    this.addBox(group, lisplangThick, lisplangH, rl + 0.1, -rw * 0.5, roofBaseY + lisplangH * 0.5, 0, teakMat);

    // 2. Tier 1: Lower broad eave (Atap Emper, landai & lebar)
    const t1H = 1.1;
    const t1TopW = rw * 0.52;
    const t1TopL = rl * 0.52;
    const cone1 = new THREE.CylinderGeometry(t1TopW * 0.5, rw * 0.5, t1H, 4);
    cone1.rotateY(Math.PI * 0.25);
    cone1.translate(0, roofBaseY + t1H * 0.5, 0);
    const m1 = new THREE.Mesh(cone1, roofTileMat);
    m1.castShadow = true;
    group.add(m1);

    // 3. Tier 2: Soaring Steep Brunjung Roof (curam & menjulang)
    const t2H = 3.2;
    const cone2 = new THREE.ConeGeometry(t1TopW * 0.55, t2H, 4);
    cone2.rotateY(Math.PI * 0.25);
    cone2.translate(0, roofBaseY + t1H + t2H * 0.5, 0);
    const m2 = new THREE.Mesh(cone2, roofTileMat);
    m2.castShadow = true;
    group.add(m2);

    // 4. 3D Terracotta Ridge Caps (Bumbungan wuwungan bertingkat tegas)
    const peakRidge = new THREE.Mesh(new THREE.BoxGeometry(t1TopW * 0.45, 0.28, 0.35), capMat);
    peakRidge.position.set(0, roofBaseY + t1H + t2H + 0.1, 0);
    peakRidge.castShadow = true;
    group.add(peakRidge);

    // 5. Golden Terracotta Ridge Crown Finial (Wuwungan mahkota)
    this.addBox(group, 0.45, 0.45, 1.4, 0, roofBaseY + t1H + t2H + 0.28, 0, crownMat);
  }

  /**
   * Limasan / Hip Roof (Modern Tropical Hip Roof with 3D Ridge & Hip Caps)
   */
  public static buildLimasanRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material,
    lisplangMat?: THREE.Material
  ): void {
    const halfW = rw * 0.5;
    const halfL = rl * 0.5;
    const ridgeLen = Math.max(0.5, rl - rw * 0.75);
    const halfR = ridgeLen * 0.5;
    const slopeLenSide = Math.hypot(halfW, roofH);
    const slopeLenEnd = Math.hypot(halfL - halfR, roofH);

    const geom = new THREE.BufferGeometry();
    const verts = new Float32Array([
      // Left slope
      -halfW, baseY, -halfL,
      -halfW, baseY, halfL,
      0, baseY + roofH, halfR,

      -halfW, baseY, -halfL,
      0, baseY + roofH, halfR,
      0, baseY + roofH, -halfR,

      // Right slope
      halfW, baseY, -halfL,
      0, baseY + roofH, -halfR,
      0, baseY + roofH, halfR,

      halfW, baseY, -halfL,
      0, baseY + roofH, halfR,
      halfW, baseY, halfL,

      // Front slope
      -halfW, baseY, halfL,
      halfW, baseY, halfL,
      0, baseY + roofH, halfR,

      // Back slope
      -halfW, baseY, -halfL,
      0, baseY + roofH, -halfR,
      halfW, baseY, -halfL
    ]);

    const uScaleL = rl / 1.5;
    const vScaleS = slopeLenSide / 1.5;
    const uScaleW = rw / 1.5;
    const vScaleE = slopeLenEnd / 1.5;

    const uvs = new Float32Array([
      // Left slope
      0, 0,  uScaleL, 0,  uScaleL, vScaleS,
      0, 0,  uScaleL, vScaleS,  0, vScaleS,

      // Right slope
      0, vScaleS,  uScaleL, vScaleS,  uScaleL, 0,
      0, vScaleS,  uScaleL, 0,  0, 0,

      // Front slope
      0, 0,  uScaleW, 0,  uScaleW * 0.5, vScaleE,

      // Back slope
      0, 0,  uScaleW * 0.5, vScaleE,  uScaleW, 0
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, roofMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 3D Ridge Cap (Bumbungan Utama Nok 3D)
    this.addBox(group, 0.22, 0.16, ridgeLen + 0.16, 0, baseY + roofH + 0.08, 0, roofMat);

    // Fascia board
    const fasciaMat = lisplangMat || this.getMaterial('wood_slat', '#451a03');
    this.addBox(group, rw + 0.1, 0.18, 0.06, 0, baseY - 0.04, halfL, fasciaMat);
    this.addBox(group, rw + 0.1, 0.18, 0.06, 0, baseY - 0.04, -halfL, fasciaMat);
    this.addBox(group, 0.06, 0.18, rl + 0.1, halfW, baseY - 0.04, 0, fasciaMat);
    this.addBox(group, 0.06, 0.18, rl + 0.1, -halfW, baseY - 0.04, 0, fasciaMat);
  }

  /**
   * Gable / Pelana Roof
   */
  public static buildGableRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material,
    lisplangMat?: THREE.Material
  ): void {
    const halfW = rw * 0.5;
    const halfL = rl * 0.5;
    const slopeLen = Math.hypot(halfW, roofH);

    const geom = new THREE.BufferGeometry();
    const verts = new Float32Array([
      // Left slope
      -halfW, baseY, -halfL,
      -halfW, baseY, halfL,
      0, baseY + roofH, halfL,

      -halfW, baseY, -halfL,
      0, baseY + roofH, halfL,
      0, baseY + roofH, -halfL,

      // Right slope
      0, baseY + roofH, -halfL,
      0, baseY + roofH, halfL,
      halfW, baseY, halfL,

      0, baseY + roofH, -halfL,
      halfW, baseY, halfL,
      halfW, baseY, -halfL,

      // Front gable
      -halfW, baseY, halfL,
      halfW, baseY, halfL,
      0, baseY + roofH, halfL,

      // Back gable
      -halfW, baseY, -halfL,
      0, baseY + roofH, -halfL,
      halfW, baseY, -halfL
    ]);

    const uScaleL = rl / 1.5;
    const vScaleS = slopeLen / 1.5;
    const uScaleW = rw / 1.5;
    const vScaleH = roofH / 1.5;

    const uvs = new Float32Array([
      0, 0,  uScaleL, 0,  uScaleL, vScaleS,
      0, 0,  uScaleL, vScaleS,  0, vScaleS,
      0, vScaleS,  uScaleL, vScaleS,  uScaleL, 0,
      0, vScaleS,  uScaleL, 0,  0, 0,
      0, 0,  uScaleW, 0,  uScaleW * 0.5, vScaleH,
      0, 0,  uScaleW * 0.5, vScaleH,  uScaleW, 0
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, roofMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 3D Ridge Cap
    this.addBox(group, 0.22, 0.16, rl + 0.16, 0, baseY + roofH + 0.08, 0, roofMat);

    // Fascia
    const fasciaMat = lisplangMat || this.getMaterial('wood_slat', '#451a03');
    this.addBox(group, 0.06, 0.18, rl + 0.1, -halfW, baseY - 0.04, 0, fasciaMat);
    this.addBox(group, 0.06, 0.18, rl + 0.1, halfW, baseY - 0.04, 0, fasciaMat);
  }

  /**
   * Sawtooth Industrial Roof
   */
  public static buildSawtoothRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    teethCount: number = 3,
    roofMat: THREE.Material,
    glassMat: THREE.Material
  ): void {
    const toothLen = rl / teethCount;
    const slopeLen = Math.hypot(toothLen, roofH);
    const angle = Math.atan2(roofH, toothLen);

    for (let t = 0; t < teethCount; t++) {
      const toothCenterZ = -rl * 0.5 + (t + 0.5) * toothLen;
      this.addBox(group, rw, 0.12, slopeLen, 0, baseY + roofH * 0.5, toothCenterZ, roofMat, -angle);
      this.addBox(group, rw * 0.95, roofH, 0.05, 0, baseY + roofH * 0.5, toothCenterZ + toothLen * 0.5, glassMat);
    }
  }

  /**
   * Shed (Sandar) Roof
   */
  public static buildShedRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material,
    lisplangMat?: THREE.Material
  ): void {
    const slopeLen = Math.hypot(rl, roofH);
    const angle = Math.atan2(roofH, rl);
    this.addBox(group, rw, 0.15, slopeLen, 0, baseY + roofH * 0.5 + 0.1, 0, roofMat, -angle);

    // 3D Ridge Cap at upper eave
    this.addBox(group, rw + 0.1, 0.16, 0.18, 0, baseY + roofH + 0.1, -rl * 0.5, roofMat);

    // Papan Lisplang
    const fasciaMat = lisplangMat || this.getMaterial('wood_slat', '#451a03');
    this.addBox(group, rw + 0.1, 0.18, 0.08, 0, baseY + 0.09, rl * 0.5, fasciaMat);
  }

  /**
   * Arched Vault Roof
   */
  public static buildArchedVaultRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    vaultH: number,
    roofMat: THREE.Material
  ): void {
    const segs = 8;
    const radius = rw * 0.55;
    const totalAngle = Math.PI * 0.7;
    const angleStep = totalAngle / segs;
    const startAngle = -totalAngle * 0.5;

    for (let i = 0; i < segs; i++) {
      const a = startAngle + (i + 0.5) * angleStep;
      const segW = (rw * 1.1) / segs;
      const px = Math.sin(a) * radius;
      const py = baseY + Math.cos(a) * vaultH;
      this.addBox(group, segW, 0.14, rl, px, py, 0, roofMat, 0, 0, -a);
    }
  }

  /**
   * Butterfly Roof
   */
  public static buildButterflyRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material,
    lisplangMat?: THREE.Material
  ): void {
    const halfW = rw * 0.5;
    const slopeLen = Math.hypot(halfW, roofH);
    const angle = Math.atan2(roofH, halfW);

    this.addBox(group, slopeLen, 0.14, rl, -halfW * 0.5, baseY + roofH * 0.5, 0, roofMat, 0, 0, angle);
    this.addBox(group, slopeLen, 0.14, rl, halfW * 0.5, baseY + roofH * 0.5, 0, roofMat, 0, 0, -angle);

    const fasciaMat = lisplangMat || this.getMaterial('wood_slat', '#451a03');
    this.addBox(group, 0.08, 0.18, rl + 0.1, -halfW, baseY + roofH + 0.09, 0, fasciaMat);
    this.addBox(group, 0.08, 0.18, rl + 0.1, halfW, baseY + roofH + 0.09, 0, fasciaMat);
  }

  /**
   * Modern Flat Roof with Overhang
   */
  public static buildFlatRoofWithOverhang(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    fasciaMat: THREE.Material,
    slabMat: THREE.Material
  ): void {
    this.addBox(group, rw, 0.22, rl, 0, baseY + 0.11, 0, slabMat);
    const fasciaH = 0.4;
    this.addBox(group, rw + 0.05, fasciaH, 0.12, 0, baseY + 0.2, rl * 0.5, fasciaMat);
    this.addBox(group, rw + 0.05, fasciaH, 0.12, 0, baseY + 0.2, -rl * 0.5, fasciaMat);
    this.addBox(group, 0.12, fasciaH, rl + 0.05, rw * 0.5, baseY + 0.2, 0, fasciaMat);
    this.addBox(group, 0.12, fasciaH, rl + 0.05, -rw * 0.5, baseY + 0.2, 0, fasciaMat);
  }
}

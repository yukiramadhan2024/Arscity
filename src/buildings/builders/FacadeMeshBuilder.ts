import * as THREE from 'three';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { RoofMeshBuilder } from './RoofMeshBuilder';

/**
 * FacadeMeshBuilder - Modular builder for building facades, hollow perimeter shells,
 * window assemblies, podium towers, balconies, and foundation plinth skirts.
 */
export class FacadeMeshBuilder {
  private static getMaterial(name: string, fallbackColor?: string): THREE.Material {
    return MaterialLibrary.get(name) || MaterialLibrary.getInstance().getMaterial(name, {
      color: fallbackColor ? parseInt(fallbackColor.replace('#', '0x')) : 0xcccccc
    });
  }

  /**
   * Constructs an automatic adaptive foundation skirt (talud batu candi / beton) beneath the building.
   * Extends downwards into the terrain so the building remains firmly grounded without floating gaps on slopes.
   */
  public static buildFoundationSkirt(
    width: number,
    length: number,
    depth: number = 1.5,
    materialName: string = 'concrete'
  ): THREE.Mesh {
    const skirtGeo = new THREE.BoxGeometry(width + 0.12, depth, length + 0.12);
    MaterialLibrary.applyWorldScaleUVs(skirtGeo, 3.0);
    MaterialLibrary.applyBakedVertexAO(skirtGeo, { minY: -depth * 0.5, fadeHeight: depth * 0.8, baseOcclusion: 0.50 });
    const skirtMat = this.getMaterial(materialName);
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.name = 'FoundationSkirt';
    skirtMesh.position.set(0, -depth / 2 + 0.15, 0);
    skirtMesh.castShadow = true;
    skirtMesh.receiveShadow = true;
    return skirtMesh;
  }

  /**
   * Constructs a real hollow architectural perimeter shell (0.25m thickness)
   * with open walk-through portal and intermediate floor slabs with atrium voids.
   */
  public static buildHollowPerimeterShell(
    group: THREE.Group,
    w: number,
    totalH: number,
    l: number,
    baseY: number,
    wallMat: THREE.Material,
    openPortalFront: boolean = true,
    portalW: number = 3.6,
    portalH: number = 3.6,
    floors: number = 1,
    flH: number = 4.2
  ): void {
    const t = 0.25;
    const frameMat = this.getMaterial('frame');
    const slabMat = this.getMaterial('concrete_board');
    const warmLightMat = this.getMaterial('warm_light');

    // 1. Back wall (-Z)
    RoofMeshBuilder.addBox(group, w, totalH, t, 0, baseY + totalH * 0.5, -l * 0.5 + t * 0.5, wallMat);

    // 2. Left wall (-X)
    const sideL = Math.max(0.1, l - t * 2);
    RoofMeshBuilder.addBox(group, t, totalH, sideL, -w * 0.5 + t * 0.5, baseY + totalH * 0.5, 0, wallMat);

    // 3. Right wall (+X)
    RoofMeshBuilder.addBox(group, t, totalH, sideL, w * 0.5 - t * 0.5, baseY + totalH * 0.5, 0, wallMat);

    // Clean projected floor belt bands (>= 0.06m outward + polygonOffset) so they never z-fight with side walls
    const beltMat = this.getMaterial('floor_belt');
    for (let f = 1; f < floors; f++) {
      const grooveY = baseY + f * flH;
      RoofMeshBuilder.addBox(group, 0.06, 0.08, sideL * 0.96, -w * 0.5 - 0.06, grooveY, 0, beltMat);
      RoofMeshBuilder.addBox(group, 0.06, 0.08, sideL * 0.96, w * 0.5 + 0.06, grooveY, 0, beltMat);
    }

    // 4. Front wall (+Z)
    if (openPortalFront) {
      const pw = Math.min(w - 1.6, Math.max(2.8, portalW));
      const ph = Math.min(totalH - 0.4, Math.max(3.0, portalH));
      const sideWallW = (w - pw) * 0.5;

      if (sideWallW > 0.1) {
        RoofMeshBuilder.addBox(group, sideWallW, totalH, t, -w * 0.5 + sideWallW * 0.5, baseY + totalH * 0.5, l * 0.5 - t * 0.5, wallMat);
      }
      if (sideWallW > 0.1) {
        RoofMeshBuilder.addBox(group, sideWallW, totalH, t, w * 0.5 - sideWallW * 0.5, baseY + totalH * 0.5, l * 0.5 - t * 0.5, wallMat);
      }
      if (totalH > ph + 0.1) {
        const lintelH = totalH - ph;
        RoofMeshBuilder.addBox(group, pw, lintelH, t, 0, baseY + ph + lintelH * 0.5, l * 0.5 - t * 0.5, wallMat);
      }

      // Swung open glass door leaves
      const leafW = pw * 0.35;
      const leafH = ph * 0.95;
      const leafThick = 0.04;
      RoofMeshBuilder.addBox(group, leafThick, leafH, leafW, -pw * 0.5 + leafThick * 0.5, baseY + leafH * 0.5, l * 0.5 - leafW * 0.5, frameMat);
      RoofMeshBuilder.addBox(group, leafThick, leafH, leafW, pw * 0.5 - leafThick * 0.5, baseY + leafH * 0.5, l * 0.5 - leafW * 0.5, frameMat);
      RoofMeshBuilder.addBox(group, pw + 0.1, 0.08, t + 0.06, 0, baseY + ph - 0.04, l * 0.5 - t * 0.5, frameMat);
    } else {
      RoofMeshBuilder.addBox(group, w, totalH, t, 0, baseY + totalH * 0.5, l * 0.5 - t * 0.5, wallMat);
    }

    // Intermediate floor slabs
    const slabThick = 0.28;
    const innerW = Math.max(0.1, w - t * 2);
    const innerL = Math.max(0.1, l - t * 2);
    const atriumW = Math.min(innerW * 0.5, 4.5);
    const atriumL = Math.min(innerL * 0.45, 4.0);

    for (let f = 1; f < floors; f++) {
      const slabBaseY = baseY + f * flH;
      const leftSlabW = (innerW - atriumW) * 0.5;
      if (leftSlabW > 0.2) {
        RoofMeshBuilder.addBox(group, leftSlabW, slabThick, innerL, -innerW * 0.5 + leftSlabW * 0.5, slabBaseY + slabThick * 0.5, 0, slabMat);
        RoofMeshBuilder.addBox(group, leftSlabW, slabThick, innerL, innerW * 0.5 - leftSlabW * 0.5, slabBaseY + slabThick * 0.5, 0, slabMat);
      }
      const backSlabL = innerL - atriumL;
      if (backSlabL > 0.2) {
        RoofMeshBuilder.addBox(group, atriumW, slabThick, backSlabL, 0, slabBaseY + slabThick * 0.5, -innerL * 0.5 + backSlabL * 0.5, slabMat);
      }

      // Atrium perimeter glass balustrades & warm ceiling uplight
      const railH = 1.0;
      RoofMeshBuilder.addBox(group, atriumW, 0.04, 0.04, 0, slabBaseY + slabThick + railH, innerL * 0.5 - atriumL, frameMat);
      RoofMeshBuilder.addBox(group, 0.04, 0.04, atriumL, -atriumW * 0.5, slabBaseY + slabThick + railH, innerL * 0.5 - atriumL * 0.5, frameMat);
      RoofMeshBuilder.addBox(group, 0.04, 0.04, atriumL, atriumW * 0.5, slabBaseY + slabThick + railH, innerL * 0.5 - atriumL * 0.5, frameMat);
      RoofMeshBuilder.addBox(group, atriumW * 0.8, 0.06, 0.12, 0, slabBaseY - 0.03, innerL * 0.5 - atriumL * 0.5, warmLightMat);
    }
  }

  /**
   * Complete Window Assembly with crisp slim frame, glass, and optional louvers
   */
  public static createWindowAssembly(
    group: THREE.Group,
    w: number,
    h: number,
    posX: number,
    posY: number,
    posZ: number,
    frameMat: THREE.Material,
    glassMat: THREE.Material,
    isFloorToCeiling: boolean = false,
    hasLouvers: boolean = false
  ): void {
    const frameThickness = 0.05;
    const minFacadeOffset = 0.06; // >= 0.06m proud of main wall face to eliminate all z-fighting
    const frameDepth = 0.06;

    // Realistic night window illumination: alternate between warm lit and dark unlit panes
    let actualGlassMat = glassMat;
    const hash = Math.abs(Math.sin(posX * 12.9898 + posY * 78.233 + posZ * 43.123) * 43758.5453) % 1;
    const isLit = isFloorToCeiling || hash < 0.45;
    if (!glassMat) {
      actualGlassMat = this.getMaterial(isLit ? 'glass_lit' : 'glass_dark');
    } else {
      const isCustomColor = (glassMat as any).color && ((glassMat as any).color.getHex() !== 0xdbeafe && (glassMat as any).color.getHex() !== 0xffffff);
      if (!isCustomColor) {
        actualGlassMat = this.getMaterial(isLit ? 'glass_lit' : 'glass_dark');
      }
    }

    const glassW = Math.max(0.1, w - frameThickness * 2.5);
    const glassH = Math.max(0.1, h - frameThickness * 2.5);

    // Support X-facing side walls (when posZ is near 0 and posX is at wall edge)
    const isXFacing = Math.abs(posZ) < 0.05 && Math.abs(posX) > 0.5;
    if (isXFacing) {
      const dirX = posX >= 0 ? 1 : -1;
      const glassX = posX + dirX * minFacadeOffset;
      const frameX = posX + dirX * (minFacadeOffset + 0.02);

      RoofMeshBuilder.addBox(group, frameDepth, frameThickness, w, frameX, posY + h * 0.5 - frameThickness * 0.5, posZ, frameMat);
      RoofMeshBuilder.addBox(group, frameDepth, frameThickness, w, frameX, posY - h * 0.5 + frameThickness * 0.5, posZ, frameMat);
      RoofMeshBuilder.addBox(group, frameDepth, h - frameThickness * 2, frameThickness, frameX, posY, posZ - w * 0.5 + frameThickness * 0.5, frameMat);
      RoofMeshBuilder.addBox(group, frameDepth, h - frameThickness * 2, frameThickness, frameX, posY, posZ + w * 0.5 - frameThickness * 0.5, frameMat);
      if (w > 2.0) {
        RoofMeshBuilder.addBox(group, frameDepth, h - frameThickness * 2, frameThickness, frameX, posY, posZ, frameMat);
      }
      RoofMeshBuilder.addBox(group, 0.02, glassH, glassW, glassX, posY, posZ, actualGlassMat);
      return;
    }

    const dirZ = posZ >= 0 ? 1 : -1;
    const glassZ = posZ + dirZ * minFacadeOffset;
    const frameZ = posZ + dirZ * (minFacadeOffset + 0.02);

    RoofMeshBuilder.addBox(group, w, frameThickness, frameDepth, posX, posY + h * 0.5 - frameThickness * 0.5, frameZ, frameMat);
    RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, frameDepth, posX - w * 0.5 + frameThickness * 0.5, posY, frameZ, frameMat);
    RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, frameDepth, posX + w * 0.5 - frameThickness * 0.5, posY, frameZ, frameMat);

    if (!isFloorToCeiling) {
      const sillDepth = 0.10;
      const sillH = 0.07;
      const sillZ = posZ + dirZ * (minFacadeOffset + 0.04);
      const sillMat = this.getMaterial('floor_belt', '#94a3b8');
      RoofMeshBuilder.addBox(group, w + 0.12, sillH, sillDepth, posX, posY - h * 0.5 + sillH * 0.5, sillZ, sillMat);
    } else {
      RoofMeshBuilder.addBox(group, w, frameThickness, frameDepth, posX, posY - h * 0.5 + frameThickness * 0.5, frameZ, frameMat);
    }

    if (w > 2.0) {
      RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, frameDepth * 0.85, posX, posY, frameZ, frameMat);
    }

    RoofMeshBuilder.addBox(group, glassW, glassH, 0.02, posX, posY, glassZ, actualGlassMat);

    if (hasLouvers) {
      const louverMat = this.getMaterial('wood_slat', '#451a03');
      const slats = 4;
      const slatH = 0.08;
      const slatSpacing = h / (slats + 1);
      for (let s = 1; s <= slats; s++) {
        const sy = posY - h * 0.5 + s * slatSpacing;
        RoofMeshBuilder.addBox(group, w - 0.1, slatH, 0.12, posX, sy, posZ + dirZ * (minFacadeOffset + 0.10), louverMat, 0.25 * dirZ);
      }
    }
  }

  /**
   * Commercial Storefront Module (Ruko & Toko Lantai 1)
   * Builds an authentic Indonesian shopfront with rolling door, awning, and glowing sign.
   */
  public static createCommercialStorefront(
    group: THREE.Group,
    w: number,
    h: number,
    posX: number,
    posY: number,
    posZ: number,
    dirZ: number = 1,
    seed: number = 0
  ): void {
    const frameMat = this.getMaterial('frame');
    const rollingMat = this.getMaterial('rolling_door');
    const awningMat = this.getMaterial('awning');
    const signMat = this.getMaterial('storefront_sign', String(seed));

    const doorH = h * 0.82;
    const doorW = w - 0.40;
    const doorZ = posZ + dirZ * 0.06; // >= 0.06m proud of wall surface

    // 1. Top lintel and side guide tracks
    const trackW = 0.08;
    RoofMeshBuilder.addBox(group, trackW, doorH, 0.08, posX - doorW * 0.5 + trackW * 0.5, posY - (h - doorH) * 0.5, doorZ + dirZ * 0.02, frameMat);
    RoofMeshBuilder.addBox(group, trackW, doorH, 0.08, posX + doorW * 0.5 - trackW * 0.5, posY - (h - doorH) * 0.5, doorZ + dirZ * 0.02, frameMat);
    RoofMeshBuilder.addBox(group, doorW, 0.14, 0.10, posX, posY - (h - doorH) * 0.5 + doorH * 0.5, doorZ + dirZ * 0.02, frameMat);

    // 2. Corrugated steel rolling shutter
    RoofMeshBuilder.addBox(group, doorW - trackW * 2, doorH - 0.14, 0.04, posX, posY - (h - doorH) * 0.5 - 0.07, doorZ, rollingMat);

    // 3. Drop-down fabric canopy / awning
    const awningProjection = 1.25;
    const awningDrop = 0.65;
    const awningW = w - 0.10;
    const awningY = posY + doorH * 0.5 - 0.10;
    const awningZ = posZ + dirZ * (awningProjection * 0.5);
    RoofMeshBuilder.addBox(group, awningW, 0.04, awningProjection, posX, awningY - awningDrop * 0.5, awningZ, awningMat, 0.45 * dirZ);

    // 4. Backlit Commercial Signboard Banner (Papan Nama Toko)
    const signH = Math.max(0.60, h - doorH - 0.15);
    const signW = w - 0.20;
    const signY = posY + doorH * 0.5 + signH * 0.5 + 0.05;
    const signZ = posZ + dirZ * 0.08;
    RoofMeshBuilder.addBox(group, signW, signH, 0.06, posX, signY, signZ, signMat);
  }

  /**
   * Tropical Cantilever Canopy & Carport
   */
  public static createTropicalCanopy(
    group: THREE.Group,
    w: number,
    d: number,
    posX: number,
    posY: number,
    posZ: number,
    dirZ: number = 1,
    style: 'concrete' | 'metal' = 'concrete'
  ): void {
    if (style === 'concrete') {
      const slabMat = this.getMaterial('concrete');
      const slabThick = 0.14;
      const slabZ = posZ + dirZ * d * 0.5;
      RoofMeshBuilder.addBox(group, w, slabThick, d, posX, posY, slabZ, slabMat);

      // Support tie rods / brackets (45 degrees)
      const bracketMat = this.getMaterial('dark_metal');
      const rodLen = Math.sqrt(d * d * 0.5);
      const rodThick = 0.04;
      RoofMeshBuilder.addBox(group, rodThick, rodLen, rodThick, posX - w * 0.45, posY + d * 0.25, posZ + dirZ * d * 0.4, bracketMat, -0.78 * dirZ);
      RoofMeshBuilder.addBox(group, rodThick, rodLen, rodThick, posX + w * 0.45, posY + d * 0.25, posZ + dirZ * d * 0.4, bracketMat, -0.78 * dirZ);
    } else {
      const metalMat = this.getMaterial('spandek');
      const frameMat = this.getMaterial('dark_metal');
      const slabZ = posZ + dirZ * d * 0.5;

      // Corrugated roof sheet
      RoofMeshBuilder.addBox(group, w, 0.06, d, posX, posY, slabZ, metalMat, 0.08 * dirZ);

      // Structural twin steel posts
      const postThick = 0.08;
      const postH = posY;
      RoofMeshBuilder.addBox(group, postThick, postH, postThick, posX - w * 0.45, postH * 0.5, posZ + dirZ * (d - 0.15), frameMat);
      RoofMeshBuilder.addBox(group, postThick, postH, postThick, posX + w * 0.45, postH * 0.5, posZ + dirZ * (d - 0.15), frameMat);
    }
  }

  /**
   * Decorative Tropical Roster Breeze Block Screen Wall
   */
  public static createRosterScreenWall(
    group: THREE.Group,
    w: number,
    h: number,
    posX: number,
    posY: number,
    posZ: number,
    facingDir: number = 1
  ): void {
    const rosterMat = this.getMaterial('roster');
    const frameMat = this.getMaterial('concrete');
    const t = 0.15;

    // Outer concrete perimeter framing
    const border = 0.08;
    RoofMeshBuilder.addBox(group, w, border, t + 0.04, posX, posY + h * 0.5 - border * 0.5, posZ, frameMat);
    RoofMeshBuilder.addBox(group, w, border, t + 0.04, posX, posY - h * 0.5 + border * 0.5, posZ, frameMat);
    RoofMeshBuilder.addBox(group, border, h - border * 2, t + 0.04, posX - w * 0.5 + border * 0.5, posY, posZ, frameMat);
    RoofMeshBuilder.addBox(group, border, h - border * 2, t + 0.04, posX + w * 0.5 - border * 0.5, posY, posZ, frameMat);

    // Inner patterned roster screen
    RoofMeshBuilder.addBox(group, w - border * 2, h - border * 2, t, posX, posY, posZ, rosterMat);
  }

  private static addDetailBox(
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
    const mesh = RoofMeshBuilder.addBox(group, w, h, d, x, y, z, mat, rotX, rotY, rotZ);
    mesh.userData = { ...mesh.userData, isDetailProp: true };
    return mesh;
  }

  /**
   * Split AC Outdoor Unit (Unit Kompresor AC Dinding Luar)
   */
  public static buildSplitACOutdoor(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    dirZ: number = 1
  ): void {
    const acMat = this.getMaterial('plester', '#f1f5f9');
    const bracketMat = this.getMaterial('dark_metal', '#334155');
    const fanMat = this.getMaterial('dark_metal', '#1e293b');

    const acW = 0.78;
    const acH = 0.54;
    const acD = 0.28;
    const acZ = z + dirZ * (acD * 0.5 + 0.08);

    // Compressor cabinet body
    this.addDetailBox(group, acW, acH, acD, x, y, acZ, acMat);

    // Front circular fan intake grille
    this.addDetailBox(group, acH * 0.75, acH * 0.75, 0.02, x - acW * 0.12, y, acZ + dirZ * (acD * 0.5 + 0.01), fanMat);

    // Cantilever L-angle mounting brackets
    const bW = 0.04;
    const bL = acD + 0.10;
    this.addDetailBox(group, bW, 0.04, bL, x - acW * 0.38, y - acH * 0.5 - 0.02, z + dirZ * (bL * 0.5), bracketMat);
    this.addDetailBox(group, bW, 0.04, bL, x + acW * 0.38, y - acH * 0.5 - 0.02, z + dirZ * (bL * 0.5), bracketMat);
    this.addDetailBox(group, bW, 0.25, 0.04, x - acW * 0.38, y - acH * 0.5 - 0.12, z + dirZ * 0.02, bracketMat);
    this.addDetailBox(group, bW, 0.25, 0.04, x + acW * 0.38, y - acH * 0.5 - 0.12, z + dirZ * 0.02, bracketMat);

    // Insulated copper refrigerant pipe conduit
    const pipeMat = this.getMaterial('plaster', '#cbd5e1');
    this.addDetailBox(group, 0.04, 0.80, 0.04, x + acW * 0.35, y - 0.40, z + dirZ * 0.04, pipeMat);
  }

  /**
   * Rainwater Downspout Drainage Pipe (Pipa Talang Air Hujan Vertikal)
   */
  public static buildDownspoutPipe(
    group: THREE.Group,
    x: number,
    minY: number,
    maxY: number,
    z: number,
    dirZ: number = 1
  ): void {
    const pipeMat = this.getMaterial('dark_zinc', '#475569');
    const bracketMat = this.getMaterial('dark_metal', '#1e293b');

    const pipeH = Math.max(0.5, maxY - minY);
    const pipeD = 0.08;
    const pipeZ = z + dirZ * (pipeD * 0.5 + 0.04);
    const midY = (minY + maxY) * 0.5;

    // Vertical pipe
    this.addDetailBox(group, pipeD, pipeH, pipeD, x, midY, pipeZ, pipeMat);

    // Top hopper head collector
    this.addDetailBox(group, 0.22, 0.24, 0.18, x, maxY - 0.12, pipeZ, pipeMat);

    // Wall mounting strap brackets every 2 meters
    const straps = Math.max(2, Math.floor(pipeH / 2.0));
    const step = pipeH / straps;
    for (let i = 0; i <= straps; i++) {
      const sy = minY + i * step;
      this.addDetailBox(group, pipeD + 0.04, 0.03, pipeD + 0.06, x, sy, z + dirZ * (pipeD * 0.5 + 0.02), bracketMat);
    }
  }

  /**
   * PLN Digital Electricity Meter Box (Meteran Listrik PLN Dinding)
   */
  public static buildElectricMeterPLN(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    dirZ: number = 1
  ): void {
    const boxMat = this.getMaterial('plester', '#94a3b8');
    const glassMat = this.getMaterial('glass');
    const frameMat = this.getMaterial('dark_metal');

    const mW = 0.22;
    const mH = 0.32;
    const mD = 0.14;
    const mZ = z + dirZ * (mD * 0.5 + 0.02);

    // Weatherproof meter box
    this.addDetailBox(group, mW, mH, mD, x, y, mZ, boxMat);

    // Clear digital display window
    this.addDetailBox(group, mW * 0.65, mH * 0.35, 0.02, x, y + mH * 0.15, mZ + dirZ * (mD * 0.5 + 0.01), glassMat);

    // Conduit cable entry
    this.addDetailBox(group, 0.03, 0.40, 0.03, x, y - mH * 0.5 - 0.20, z + dirZ * 0.03, frameMat);
  }

  /**
   * Balcony Greenery Planter with cascading tropical leaves
   */
  public static buildBalconyPlanter(
    group: THREE.Group,
    w: number,
    x: number,
    y: number,
    z: number,
    dirZ: number = 1
  ): void {
    const planterMat = this.getMaterial('concrete', '#e2e8f0');
    const plantMat = this.getMaterial('foliage', '#15803d');

    const pD = 0.30;
    const pH = 0.32;
    const pZ = z + dirZ * (pD * 0.5);

    // Concrete trough planter
    this.addDetailBox(group, w, pH, pD, x, y, pZ, planterMat);

    // Lush foliage massing cascading over edge
    this.addDetailBox(group, w - 0.05, 0.22, pD + 0.10, x, y + pH * 0.5 + 0.08, pZ + dirZ * 0.05, plantMat);
  }

  /**
   * Exterior Architectural Up/Down Wall Sconce
   */
  public static buildExteriorWallSconce(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    dirZ: number = 1
  ): void {
    const sconceMat = this.getMaterial('dark_metal', '#0f172a');
    const lightMat = this.getMaterial('warm_light', '#fef08a');

    const sW = 0.08;
    const sH = 0.24;
    const sD = 0.08;
    const sZ = z + dirZ * (sD * 0.5 + 0.02);

    this.addDetailBox(group, sW, sH, sD, x, y, sZ, sconceMat);
    // Top & bottom light emission apertures
    this.addDetailBox(group, sW * 0.8, 0.02, sD * 0.8, x, y + sH * 0.5, sZ, lightMat);
    this.addDetailBox(group, sW * 0.8, 0.02, sD * 0.8, x, y - sH * 0.5, sZ, lightMat);
  }
}

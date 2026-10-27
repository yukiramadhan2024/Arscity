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

    // Architectural horizontal shadow grooves (tali air) along side walls
    for (let f = 1; f < floors; f++) {
      const grooveY = baseY + f * flH;
      RoofMeshBuilder.addBox(group, 0.05, 0.08, sideL * 0.95, -w * 0.5 - 0.02, grooveY, 0, frameMat);
      RoofMeshBuilder.addBox(group, 0.05, 0.08, sideL * 0.95, w * 0.5 + 0.02, grooveY, 0, frameMat);
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
    const recess = 0.18;
    const dirZ = posZ >= 0 ? 1 : -1;
    const glassZ = posZ - dirZ * recess;

    RoofMeshBuilder.addBox(group, w, frameThickness, recess, posX, posY + h * 0.5 - frameThickness * 0.5, posZ - dirZ * recess * 0.5, frameMat);
    RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, recess, posX - w * 0.5 + frameThickness * 0.5, posY, posZ - dirZ * recess * 0.5, frameMat);
    RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, recess, posX + w * 0.5 + frameThickness * 0.5, posY, posZ - dirZ * recess * 0.5, frameMat);

    if (!isFloorToCeiling) {
      const sillProjection = 0.06;
      const sillDepth = recess + sillProjection;
      const sillH = 0.07;
      const sillZ = posZ - dirZ * (recess - sillProjection) * 0.5;
      const sillMat = this.getMaterial('concrete', '#94a3b8');
      RoofMeshBuilder.addBox(group, w + 0.12, sillH, sillDepth, posX, posY - h * 0.5 + sillH * 0.5, sillZ, sillMat);
    } else {
      RoofMeshBuilder.addBox(group, w, frameThickness, recess, posX, posY - h * 0.5 + frameThickness * 0.5, posZ - dirZ * recess * 0.5, frameMat);
    }

    const innerDepth = 0.05;
    RoofMeshBuilder.addBox(group, w - frameThickness * 2, frameThickness, innerDepth, posX, posY + h * 0.5 - frameThickness * 1.5, glassZ, frameMat);
    RoofMeshBuilder.addBox(group, w - frameThickness * 2, frameThickness, innerDepth, posX, posY - h * 0.5 + frameThickness * 1.5, glassZ, frameMat);
    RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, innerDepth, posX - w * 0.5 + frameThickness * 1.5, posY, glassZ, frameMat);
    RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, innerDepth, posX + w * 0.5 - frameThickness * 1.5, posY, glassZ, frameMat);

    if (w > 2.0) {
      RoofMeshBuilder.addBox(group, frameThickness, h - frameThickness * 2, innerDepth, posX, posY, glassZ, frameMat);
    }

    const glassW = Math.max(0.1, w - frameThickness * 3);
    const glassH = Math.max(0.1, h - frameThickness * 3);
    RoofMeshBuilder.addBox(group, glassW, glassH, 0.02, posX, posY, glassZ, glassMat);

    if (hasLouvers) {
      const louverMat = this.getMaterial('wood_slat', '#451a03');
      const slats = 4;
      const slatH = 0.08;
      const slatSpacing = h / (slats + 1);
      for (let s = 1; s <= slats; s++) {
        const sy = posY - h * 0.5 + s * slatSpacing;
        RoofMeshBuilder.addBox(group, w - 0.1, slatH, 0.12, posX, sy, posZ + dirZ * 0.05, louverMat, 0.25 * dirZ);
      }
    }
  }
}

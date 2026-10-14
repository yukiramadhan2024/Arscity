import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BuildingInstance, RoofType } from './PrefabTypes';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { InteriorLayoutFactory } from './InteriorLayoutFactory';
import { InteriorMeshBuilder } from './InteriorMeshBuilder';

export interface CachedMeshTemplate {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/**
 * High-End Modern Architectural Mesh Builder for Arscity
 * Crafts articulated volumetric massing, PBR textured surfaces,
 * cantilevered volumes, glass railings, sun louvers, and tropical planters.
 *
 * Milestone T3:
 * - Geometry consolidation per material via mergeGeometries
 * - Geometry caching per preset and architectural parameters
 * - Drastically reduces draw calls and GPU memory overhead
 */
export class PrefabMeshBuilder {
  private static materialsCache: Map<string, THREE.Material> = new Map();
  private static geometryCache: Map<string, CachedMeshTemplate[]> = new Map();

  public static clearCache(): void {
    for (const templates of this.geometryCache.values()) {
      for (const t of templates) {
        t.geometry.dispose();
      }
    }
    this.geometryCache.clear();
  }

  public static getCacheKey(bld: BuildingInstance): string {
    return [
      bld.presetKey || 'custom',
      (bld.width || 0).toFixed(2),
      (bld.length || 0).toFixed(2),
      (bld.floorHeight || 3.2).toFixed(2),
      bld.floorCount || 1,
      bld.roofType || 'hip',
      bld.roofMaterial || '',
      bld.wallMaterial || 'plaster',
      bld.wallColor || ''
    ].join('_');
  }

  /**
   * Centralized PBR Material Generator with Rich Architectural Textures
   */
  public static getMaterial(type: string, color?: string): THREE.Material {
    if (type === 'warm_light') {
      const key = 'warm_light';
      if (!this.materialsCache.has(key)) {
        this.materialsCache.set(key, new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
      }
      return this.materialsCache.get(key)!;
    }
    return MaterialLibrary.getInstance().getMaterial(type, { color });
  }

  /**
   * Consolidates all static child meshes sharing the same material into unified geometries.
   */
  public static optimizeBuildingGroup(group: THREE.Group): CachedMeshTemplate[] {
    group.updateMatrixWorld(true);
    const rootInv = group.matrixWorld.clone().invert();

    const meshesByMaterial = new Map<THREE.Material, { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[]>();
    const allMeshes: THREE.Mesh[] = [];

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        allMeshes.push(child as THREE.Mesh);
      }
    });

    for (const mesh of allMeshes) {
      mesh.updateMatrixWorld(true);
      const relMatrix = rootInv.clone().multiply(mesh.matrixWorld);
      const mat = mesh.material as THREE.Material;
      if (!meshesByMaterial.has(mat)) {
        meshesByMaterial.set(mat, []);
      }
      meshesByMaterial.get(mat)!.push({
        geo: mesh.geometry,
        matrix: relMatrix,
      });
    }

    // Clear raw children from group
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const templates: CachedMeshTemplate[] = [];

    for (const [mat, items] of meshesByMaterial.entries()) {
      if (items.length === 1) {
        const transformedGeo = items[0].geo.clone();
        transformedGeo.applyMatrix4(items[0].matrix);
        items[0].geo.dispose();
        templates.push({ geometry: transformedGeo, material: mat });
      } else {
        const transformedGeos: THREE.BufferGeometry[] = [];
        for (const item of items) {
          const tGeo = item.geo.clone();
          tGeo.applyMatrix4(item.matrix);
          item.geo.dispose();
          transformedGeos.push(tGeo);
        }

        const merged = mergeGeometries(transformedGeos, false);
        for (const tg of transformedGeos) {
          tg.dispose();
        }

        if (merged) {
          templates.push({ geometry: merged, material: mat });
        } else {
          for (const item of items) {
            const fallbackGeo = item.geo.clone().applyMatrix4(item.matrix);
            templates.push({ geometry: fallbackGeo, material: mat });
          }
        }
      }
    }

    return templates;
  }

  /**
   * Master Entrypoint: Dispatches to specialized architectural builders
   */
  public static buildBuildingGroup(building: BuildingInstance): THREE.Group {
    const cacheKey = this.getCacheKey(building);
    const group = new THREE.Group();
    group.name = `Building_${building.id}`;
    group.position.copy(building.position);
    group.rotation.y = building.rotationY;
    group.userData = { buildingId: building.id, type: 'building' };

    // Generate interior architectural room layouts if not present
    if (!building.interiorLayouts) {
      building.interiorLayouts = InteriorLayoutFactory.getLayoutForBuilding(
        building.presetKey,
        building.width,
        building.length,
        building.floorHeight || 3.2,
        building.floorCount || 1
      );
    }

    if (this.geometryCache.has(cacheKey)) {
      const templates = this.geometryCache.get(cacheKey)!;
      for (const item of templates) {
        const mesh = new THREE.Mesh(item.geometry, item.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { isSharedGeometry: true };
        group.add(mesh);
      }
      return group;
    }

    // Build raw group
    const rawGroup = new THREE.Group();

    switch (building.presetKey) {
      case 'house_36':
        this.buildModernHouse36(rawGroup, building);
        break;
      case 'house_54':
        this.buildModernHouse54(rawGroup, building);
        break;
      case 'house_2fl':
        this.buildModernVilla2Story(rawGroup, building);
        break;
      case 'joglo':
        this.buildNeoVernacularJoglo(rawGroup, building);
        break;
      case 'ruko_3fl':
        this.buildModernShophouse(rawGroup, building);
        break;
      case 'minimarket':
        this.buildModernRetail(rawGroup, building);
        break;
      case 'office_tower':
        this.buildModernOfficeTower(rawGroup, building);
        break;
      case 'apartment':
        this.buildModernApartment(rawGroup, building);
        break;
      case 'mosque':
        this.buildModernMosque(rawGroup, building);
        break;
      case 'school':
        this.buildModernSchool(rawGroup, building);
        break;
      case 'puskesmas':
        this.buildModernPuskesmas(rawGroup, building);
        break;
      case 'community_hall':
        this.buildModernCommunityHall(rawGroup, building);
        break;
      default:
        this.buildGenericModernBuilding(rawGroup, building);
        break;
    }

    // Build real 3D interior architecture (walls with 15cm thickness, doors, floors, stairs)
    if (building.interiorLayouts) {
      const plinthH = 0.35;
      for (let fl = 0; fl < building.interiorLayouts.length; fl++) {
        const layout = building.interiorLayouts[fl];
        const floorBaseY = plinthH + fl * (building.floorHeight || 3.2);
        const interiorGroup = InteriorMeshBuilder.buildFloorInterior(
          layout,
          floorBaseY,
          building.floorHeight || 3.2
        );
        rawGroup.add(interiorGroup);
      }
    }

    // Merge meshes sharing the same material
    const templates = this.optimizeBuildingGroup(rawGroup);
    this.geometryCache.set(cacheKey, templates);

    for (const item of templates) {
      const mesh = new THREE.Mesh(item.geometry, item.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { isSharedGeometry: true };
      group.add(mesh);
    }

    return group;
  }

  // ==========================================================================
  // 1. RUMAH TIPE 36 (Modern Minimalist Tropical House)
  // Intersecting dual-mass volume, timber slat accent, cantilevered entry canopy
  // ==========================================================================
  private static buildModernHouse36(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const woodMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.35;

    // 1. Andesite Stone Base
    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Primary Volume (Clean white stucco living quarters)
    const primW = w * 0.65;
    const primL = l * 0.95;
    this.addBox(group, primW, h, primL, -w * 0.5 + primW * 0.5, plinthH + h * 0.5, 0, plasterMat);

    // 3. Secondary Accent Volume (Warm vertical timber slat bedroom wing)
    const secW = w * 0.4;
    const secL = l * 0.85;
    this.addBox(group, secW, h * 0.95, secL, w * 0.5 - secW * 0.5, plinthH + h * 0.475, -l * 0.05, woodMat);

    // 4. Cantilevered Entrance Porch Canopy with Slim Post
    const canopyW = 2.4;
    const canopyL = 1.8;
    const canopyY = plinthH + 2.5;
    this.addBox(group, canopyW, 0.12, canopyL, 0.2, canopyY, l * 0.5 + 0.4, frameMat);
    // Slim metal support post
    this.addCylinder(group, 0.04, 0.04, canopyY - plinthH, 1.2, plinthH + (canopyY - plinthH) * 0.5, l * 0.5 + 1.1, frameMat);

    // 5. Modern Teak Pivot Door
    this.addBox(group, 1.1, 2.3, 0.08, 0.2, plinthH + 1.15, l * 0.5 + 0.02, woodMat);
    this.addBox(group, 0.04, 1.0, 0.06, 0.65, plinthH + 1.15, l * 0.5 + 0.08, frameMat); // vertical pull handle

    // 6. Floor-to-Ceiling Panoramic Living Window
    this.createWindowAssembly(group, 2.0, 2.2, -w * 0.22, plinthH + 1.15, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 7. Architectural Sun Louvers on Timber Wing Window
    this.createWindowAssembly(group, 1.2, 1.4, w * 0.28, plinthH + 1.5, l * 0.4 + 0.02, frameMat, glassMat, false, true);

    // 8. Integrated Planter Box with Tropical Greenery
    this.createPlanterBox(group, 1.8, 0.5, 0.6, -w * 0.22, plinthH + 0.25, l * 0.5 + 0.5);

    // 9. Modern Sleek Standing Seam Roof with deep overhang
    const rw = w + 1.2;
    const rl = l + 1.2;
    const roofY = plinthH + h;
    this.buildModernGableRoof(group, rw, rl, roofY, 1.4, zincRoofMat);
  }

  // ==========================================================================
  // 2. RUMAH TIPE 54 (Modern Tropical Villa 1-Floor)
  // Staggered L-shaped volume, covered terrace, sliding glass doors, roof louvers
  // ==========================================================================
  private static buildModernHouse54(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const woodMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, plinthMat);

    // Main Pavilion Volume
    const mainW = w * 0.7;
    const mainL = l;
    this.addBox(group, mainW, h, mainL, -w * 0.5 + mainW * 0.5, plinthH + h * 0.5, 0, plasterMat);

    // Recessed Outdoor Covered Terrace (Lanai) & Wing
    const wingW = w * 0.35;
    const wingL = l * 0.65;
    this.addBox(group, wingW, h, wingL, w * 0.5 - wingW * 0.5, plinthH + h * 0.5, -l * 0.175, woodMat);

    // Open Covered Terrace Slab with slender columns
    const terraceW = wingW + 0.4;
    const terraceL = l * 0.35;
    const canopyY = plinthH + h;
    this.addBox(group, terraceW, 0.15, terraceL, w * 0.5 - wingW * 0.5, canopyY, l * 0.35, frameMat);
    this.addCylinder(group, 0.05, 0.05, h, w * 0.45, plinthH + h * 0.5, l * 0.48, frameMat);

    // Massive Sliding Glass Patio Doors
    this.createWindowAssembly(group, 3.2, 2.4, -w * 0.15, plinthH + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

    // Modern Pivot Entrance
    this.addBox(group, 1.2, 2.3, 0.08, w * 0.25, plinthH + 1.15, l * 0.2, woodMat);

    // Tropical Planter Garden Along Front Facade
    this.createPlanterBox(group, 2.6, 0.55, 0.7, -w * 0.15, plinthH + 0.28, l * 0.5 + 0.6);

    // Modern Tropical Hip Roof with wide overhanging eaves
    const rw = w + 1.6;
    const rl = l + 1.6;
    this.buildModernHipRoof(group, rw, rl, plinthH + h, 1.6, zincRoofMat);
  }

  // ==========================================================================
  // 3. RUMAH TROPIS 2 LANTAI (Luxury Modern Tropical Villa)
  // Cantilevered 2nd floor box, glass railing balcony, vertical wood screen, planters
  // ==========================================================================
  private static buildModernVilla2Story(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const woodMat = this.getMaterial('wood_slat');
    const concreteMat = this.getMaterial('concrete_board');
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const glassRailMat = this.getMaterial('glass_balustrade');

    const plinthH = 0.4;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // Floor 1: Recessed Living & Dining Mass
    const f1W = w * 0.9;
    const f1L = l * 0.9;
    this.addBox(group, f1W, flH, f1L, 0, plinthH + flH * 0.5, -l * 0.05, plasterMat);

    // Floor 1 Front Accent Wall (Board-formed concrete)
    this.addBox(group, w * 0.4, flH, 0.2, -w * 0.25, plinthH + flH * 0.5, l * 0.4 + 0.05, concreteMat);

    // Floor 1 Entryway & Panoramic Living Glass Wall
    this.createWindowAssembly(group, 3.6, 2.4, w * 0.18, plinthH + 1.25, l * 0.4 + 0.02, frameMat, glassMat, true);
    this.addBox(group, 1.2, 2.4, 0.08, -w * 0.1, plinthH + 1.2, l * 0.4 + 0.1, woodMat);

    // Intermediate Slab (Floating Cantilever Floor 2 Base)
    const f2BaseY = plinthH + flH;
    this.addBox(group, w + 0.4, 0.25, l + 0.4, 0, f2BaseY + 0.125, 0, concreteMat);

    // Floor 2: Cantilevered Master Box (Projecting 1.2m over the front)
    const f2W = w * 0.95;
    const f2L = l * 0.85;
    const f2Z = l * 0.05; // shifted forward
    this.addBox(group, f2W, flH, f2L, 0, f2BaseY + 0.25 + flH * 0.5, f2Z, plasterMat);

    // Floor 2 Feature Vertical Timber Screen (Brise-Soleil)
    this.addBox(group, w * 0.45, flH * 0.9, 0.15, -w * 0.22, f2BaseY + 0.25 + flH * 0.5, l * 0.48 + 0.1, woodMat);

    // Floor 2 Cantilevered Balcony with Glass Railing & Planter Box
    const balcW = w * 0.45;
    const balcDepth = 1.6;
    const balcZ = l * 0.48 + balcDepth * 0.5;
    // Balcony floor
    this.addBox(group, balcW, 0.18, balcDepth, w * 0.22, f2BaseY + 0.25 + 0.09, balcZ, concreteMat);
    // Tempered Glass Balustrade (Translucent Glass Railing)
    this.addBox(group, balcW, 0.9, 0.04, w * 0.22, f2BaseY + 0.25 + 0.65, balcZ + balcDepth * 0.5, glassRailMat);
    this.addBox(group, balcW, 0.05, 0.06, w * 0.22, f2BaseY + 0.25 + 1.1, balcZ + balcDepth * 0.5, frameMat); // top handrail
    // Side glass rail
    this.addBox(group, 0.04, 0.9, balcDepth, w * 0.22 + balcW * 0.5, f2BaseY + 0.25 + 0.65, balcZ, glassRailMat);

    // Lush Balcony Greenery Planter Box
    this.createPlanterBox(group, balcW * 0.8, 0.45, 0.5, w * 0.22, f2BaseY + 0.25 + 0.35, balcZ - 0.2);

    // Balcony Sliding Glass Doors
    this.createWindowAssembly(group, 2.8, 2.3, w * 0.22, f2BaseY + 0.25 + 1.2, l * 0.48, frameMat, glassMat, true);

    // Roof: Floating Thin Roof Slab with Deep Overhang & Anthracite Parapet
    const roofY = f2BaseY + 0.25 + flH;
    const rw = w + 1.6;
    const rl = l + 1.6;
    this.buildModernFlatRoofWithOverhang(group, rw, rl, roofY, zincRoofMat, concreteMat);
  }

  // ==========================================================================
  // 4. JOGLO (Masterpiece Contemporary Neo-Vernacular Joglo)
  // Stepped Andesite plinth, Soko Guru columns, authentic tiered Brunjung roof
  // ==========================================================================
  private static buildNeoVernacularJoglo(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofTileMat = this.getMaterial('roof_tile');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    // Multi-tier Stepped Plinth
    this.addBox(group, w + 1.2, 0.25, l + 1.2, 0, 0.125, 0, plinthMat);
    this.addBox(group, w + 0.6, 0.25, l + 0.6, 0, 0.375, 0, plinthMat);
    const plinthH = 0.5;

    // Enclosed Inner Sanctum (Omah Jero / Dalem) in carved teak & glass
    const innerW = w * 0.65;
    const innerL = l * 0.65;
    this.addBox(group, innerW, h * 0.85, innerL, 0, plinthH + (h * 0.85) * 0.5, -l * 0.05, teakMat);

    // Front Sliding Pocket Glass Doors (Seamless modern tropical indoor-outdoor)
    this.createWindowAssembly(group, innerW * 0.7, 2.6, 0, plinthH + 1.35, -l * 0.05 + innerL * 0.5 + 0.02, frameMat, glassMat, true);

    // Soko Guru Central Master Columns (4 majestic carved teak pillars)
    const sgOffsetW = w * 0.22;
    const sgOffsetL = l * 0.22;
    const sgCoords = [
      [-sgOffsetW, -sgOffsetL],
      [sgOffsetW, -sgOffsetL],
      [-sgOffsetW, sgOffsetL],
      [sgOffsetW, sgOffsetL]
    ];
    for (const [cx, cz] of sgCoords) {
      // Stone base (Umpak)
      this.addBox(group, 0.5, 0.3, 0.5, cx, plinthH + 0.15, cz, plinthMat);
      // Teak Pillar
      this.addCylinder(group, 0.18, 0.18, h * 1.1, cx, plinthH + 0.3 + (h * 1.1) * 0.5, cz, teakMat);
    }

    // Perimeter Colonnade (Soko Rowo) around the open Pendopo veranda
    const periCoords = [
      [-w * 0.45, -l * 0.45], [0, -l * 0.45], [w * 0.45, -l * 0.45],
      [-w * 0.45, l * 0.45], [0, l * 0.45], [w * 0.45, l * 0.45],
      [-w * 0.45, 0], [w * 0.45, 0]
    ];
    for (const [cx, cz] of periCoords) {
      this.addCylinder(group, 0.12, 0.12, h * 0.8, cx, plinthH + (h * 0.8) * 0.5, cz, teakMat);
    }

    // True Tiered Joglo Roof: Broad lower Emper + Soaring center Brunjung
    const roofBaseY = plinthH + h * 0.8;
    const rw = w + 2.0;
    const rl = l + 2.0;

    // Tier 1: Lower broad eave (Atap Emper)
    const t1H = 1.4;
    const t1TopW = rw * 0.6;
    const t1TopL = rl * 0.6;
    const cone1 = new THREE.CylinderGeometry(t1TopW * 0.5, rw * 0.5, t1H, 4);
    cone1.rotateY(Math.PI * 0.25);
    cone1.translate(0, roofBaseY + t1H * 0.5, 0);
    const m1 = new THREE.Mesh(cone1, roofTileMat);
    m1.castShadow = true;
    group.add(m1);

    // Tier 2: Soaring Steep Brunjung Roof with Ridge Ornament
    const t2H = 2.8;
    const cone2 = new THREE.ConeGeometry(t1TopW * 0.55, t2H, 4);
    cone2.rotateY(Math.PI * 0.25);
    cone2.translate(0, roofBaseY + t1H + t2H * 0.5, 0);
    const m2 = new THREE.Mesh(cone2, roofTileMat);
    m2.castShadow = true;
    group.add(m2);

    // Golden Terracotta Ridge Crown (Wuwungan finial)
    this.addBox(group, 0.4, 0.4, 1.2, 0, roofBaseY + t1H + t2H + 0.1, 0, this.getMaterial('plaster', '#d97706'));
  }

  // ==========================================================================
  // 5. RUKO MODERN 3 LANTAI (Contemporary Urban Shophouse)
  // Double-height glass commercial storefront, rhythmic sun fins, top balcony
  // ==========================================================================
  private static buildModernShophouse(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const totalH = flH * 3;

    const plasterMat = this.getMaterial('plaster', '#f1f5f9');
    const concreteMat = this.getMaterial('concrete_board');
    const woodMat = this.getMaterial('wood_slat');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const glassRailMat = this.getMaterial('glass_balustrade');

    // Plinth
    this.addBox(group, w + 0.3, 0.2, l + 0.3, 0, 0.1, 0, concreteMat);

    // Main Structural Shell
    this.addBox(group, w, totalH, l, 0, 0.2 + totalH * 0.5, 0, plasterMat);

    // Floor 1: All-Glass Commercial Storefront with Entrance Door
    this.createWindowAssembly(group, w * 0.85, flH * 0.85, 0, 0.2 + flH * 0.5, l * 0.5 + 0.02, frameMat, glassMat, true);
    // Modern Commercial Signage Fascia Band
    this.addBox(group, w + 0.2, 0.7, 0.3, 0, 0.2 + flH + 0.15, l * 0.5 + 0.15, frameMat);

    // Floor 2: Architectural Cantilevered Concrete Frame with Vertical Sun Fins
    const f2Y = 0.2 + flH * 1.5;
    this.createWindowAssembly(group, w * 0.75, flH * 0.7, 0, f2Y, l * 0.5 + 0.02, frameMat, glassMat, false);
    // 4 vertical shading blades
    for (let i = -1.5; i <= 1.5; i += 1) {
      this.addBox(group, 0.08, flH * 0.85, 0.35, i * (w * 0.22), f2Y, l * 0.5 + 0.2, frameMat);
    }

    // Floor 3: Recessed Residential Balcony with Glass Railing & Planter
    const f3BaseY = 0.2 + flH * 2;
    this.createWindowAssembly(group, w * 0.6, flH * 0.7, 0, f3BaseY + flH * 0.5, l * 0.5 - 0.6, frameMat, glassMat, true);
    // Balcony glass railing
    this.addBox(group, w * 0.85, 0.9, 0.04, 0, f3BaseY + 0.45, l * 0.5 + 0.02, glassRailMat);
    this.addBox(group, w * 0.85, 0.05, 0.06, 0, f3BaseY + 0.9, l * 0.5 + 0.02, frameMat);
    this.createPlanterBox(group, w * 0.4, 0.4, 0.4, -w * 0.25, f3BaseY + 0.2, l * 0.5 - 0.2);

    // Modern Parapet Roof
    this.buildModernFlatRoofWithOverhang(group, w + 0.4, l + 0.4, 0.2 + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // 6. MINIMARKET LINGKUNGAN (Modern Architectural Retail Store)
  // Full-width glass curtain wall, dark composite fascia, illuminated canopy
  // ==========================================================================
  private static buildModernRetail(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#e2e8f0');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const woodMat = this.getMaterial('wood_slat');
    const concreteMat = this.getMaterial('concrete_board');

    // Base
    this.addBox(group, w + 0.4, 0.2, l + 0.4, 0, 0.1, 0, concreteMat);

    // Main Store Hall
    this.addBox(group, w, h, l, 0, 0.2 + h * 0.5, 0, plasterMat);

    // Full Curtain Wall Glass Frontage
    this.createWindowAssembly(group, w * 0.88, h * 0.75, 0, 0.2 + h * 0.45, l * 0.5 + 0.02, frameMat, glassMat, true);

    // Modern Architectural Fascia Band (Anthracite with warm teak accent stripe)
    this.addBox(group, w + 0.6, 0.9, 0.35, 0, 0.2 + h + 0.15, l * 0.5 + 0.15, frameMat);
    this.addBox(group, w + 0.65, 0.18, 0.38, 0, 0.2 + h - 0.2, l * 0.5 + 0.16, woodMat);

    // Cantilevered Glass Entry Canopy with Downlight Glow
    const canopyW = 3.6;
    const canopyL = 2.0;
    this.addBox(group, canopyW, 0.1, canopyL, 0, 0.2 + 2.7, l * 0.5 + 1.0, frameMat);
    this.addBox(group, canopyW * 0.8, 0.02, 0.8, 0, 0.2 + 2.64, l * 0.5 + 1.0, this.getMaterial('warm_light'));

    // Parapet flat roof
    this.buildModernFlatRoofWithOverhang(group, w + 0.4, l + 0.4, 0.2 + h + 0.6, frameMat, concreteMat);
  }

  // ==========================================================================
  // 7. GEDUNG KANTOR MODERN (High-End Architectural Glass & Steel Tower)
  // Horizontal ribbon curtain walls, composite spandrels, rooftop terrace pergola
  // ==========================================================================
  private static buildModernOfficeTower(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const flCount = bld.floorCount;
    const totalH = flH * flCount;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const glassRailMat = this.getMaterial('glass_balustrade');
    const woodMat = this.getMaterial('wood_slat');

    this.addBox(group, w + 0.8, 0.4, l + 0.8, 0, 0.2, 0, concreteMat);

    // Core Solid Shaft (Elevator & service spine)
    this.addBox(group, w * 0.4, totalH, l * 0.35, 0, 0.4 + totalH * 0.5, -l * 0.25, concreteMat);

    // Floors with Ribbon Curtain Walls & Spandrel Panels
    for (let f = 0; f < flCount; f++) {
      const flY = 0.4 + f * flH;

      // Floor intermediate concrete slab
      this.addBox(group, w + 0.2, 0.35, l + 0.2, 0, flY + 0.175, 0, concreteMat);

      // Glass Curtain Wall Ribbon
      const winH = flH - 0.7;
      const winY = flY + 0.35 + winH * 0.5;

      // Front & Back Glass Facades
      this.createWindowAssembly(group, w * 0.9, winH, 0, winY, l * 0.5 + 0.02, frameMat, glassMat, false);
      this.createWindowAssembly(group, w * 0.9, winH, 0, winY, -l * 0.5 - 0.02, frameMat, glassMat, false);

      // Side Glass Facades
      this.createWindowAssembly(group, l * 0.75, winH, 0, winY, 0, frameMat, glassMat, false);

      // Spandrel band above glass
      this.addBox(group, w + 0.1, 0.35, l + 0.1, 0, flY + flH - 0.175, 0, frameMat);
    }

    // Double-Height Grand Entrance Canopy & Atrium Columns
    const canopyW = w * 0.6;
    const canopyL = 3.0;
    this.addBox(group, canopyW, 0.18, canopyL, 0, 0.4 + 3.4, l * 0.5 + 1.5, frameMat);
    this.addCylinder(group, 0.1, 0.1, 3.4, -canopyW * 0.45, 0.4 + 1.7, l * 0.5 + 2.8, frameMat);
    this.addCylinder(group, 0.1, 0.1, 3.4, canopyW * 0.45, 0.4 + 1.7, l * 0.5 + 2.8, frameMat);

    // Rooftop Executive Terrace with Metal Pergola & Planters
    const roofBaseY = 0.4 + totalH;
    this.addBox(group, w, 0.35, l, 0, roofBaseY + 0.175, 0, concreteMat);
    // Perimeter glass parapet
    this.addBox(group, w, 1.1, 0.04, 0, roofBaseY + 0.9, l * 0.5 - 0.05, glassRailMat);
    this.addBox(group, w, 1.1, 0.04, 0, roofBaseY + 0.9, -l * 0.5 + 0.05, glassRailMat);

    // Architectural Pergola on roof
    for (let p = -w * 0.3; p <= w * 0.3; p += 1.2) {
      this.addBox(group, 0.1, 0.15, l * 0.5, p, roofBaseY + 2.6, 0, frameMat);
    }
  }

  // ==========================================================================
  // 8. APARTEMEN MENENGAH (Modern Urban Vertical Residence)
  // Articulated modular facade, individual recessed balconies, timber accents
  // ==========================================================================
  private static buildModernApartment(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const flCount = bld.floorCount;
    const totalH = flH * flCount;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const concreteMat = this.getMaterial('concrete_board');
    const woodMat = this.getMaterial('wood_slat');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const glassRailMat = this.getMaterial('glass_balustrade');

    this.addBox(group, w + 0.6, 0.35, l + 0.6, 0, 0.175, 0, concreteMat);
    this.addBox(group, w, totalH, l, 0, 0.35 + totalH * 0.5, 0, plasterMat);

    // Balconies on every upper floor for multiple residential units
    const bays = 3;
    const baySpacing = w / bays;

    for (let f = 1; f < flCount; f++) {
      const flY = 0.35 + f * flH;

      for (let b = 0; b < bays; b++) {
        const bayX = -w * 0.5 + baySpacing * (b + 0.5);

        // Projecting balcony box
        this.addBox(group, baySpacing * 0.75, 0.2, 1.4, bayX, flY + 0.1, l * 0.5 + 0.7, concreteMat);

        // Glass balcony railing
        this.addBox(group, baySpacing * 0.75, 0.9, 0.04, bayX, flY + 0.65, l * 0.5 + 1.4, glassRailMat);
        this.addBox(group, baySpacing * 0.75, 0.05, 0.06, bayX, flY + 1.1, l * 0.5 + 1.4, frameMat);

        // Balcony sliding glass door
        this.createWindowAssembly(group, baySpacing * 0.65, 2.3, bayX, flY + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

        // Planter box on every other balcony
        if (b % 2 === 0) {
          this.createPlanterBox(group, baySpacing * 0.5, 0.45, 0.4, bayX, flY + 0.35, l * 0.5 + 0.5);
        }
      }
    }

    // Ground Floor Entrance Portico
    this.addBox(group, 4.0, 0.18, 2.4, 0, 0.35 + 2.8, l * 0.5 + 1.2, frameMat);
    this.createWindowAssembly(group, 3.2, 2.5, 0, 0.35 + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, 0.35 + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // 9. MASJID TROPIS (Contemporary Tropical Mosque)
  // Perforated breeze-block screens, colonnade, ribbed emerald & brass dome
  // ==========================================================================
  private static buildModernMosque(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');
    const woodMat = this.getMaterial('wood_slat');

    this.addBox(group, w + 1.4, 0.5, l + 1.4, 0, 0.25, 0, plinthMat);

    // Main Prayer Hall Cube
    const hallW = w * 0.8;
    const hallL = l * 0.8;
    this.addBox(group, hallW, h, hallL, 0, 0.5 + h * 0.5, 0, plasterMat);

    // Perimeter Shade Colonnade (slender square columns with architrave)
    const colSpacing = 3.5;
    const halfW = w * 0.48;
    const halfL = l * 0.48;
    for (let x = -halfW; x <= halfW; x += colSpacing) {
      this.addCylinder(group, 0.14, 0.14, h, x, 0.5 + h * 0.5, halfL, plasterMat);
      this.addCylinder(group, 0.14, 0.14, h, x, 0.5 + h * 0.5, -halfL, plasterMat);
    }

    // Deep shade roof overhang above colonnade
    this.addBox(group, w + 0.6, 0.3, l + 0.6, 0, 0.5 + h + 0.15, 0, plasterMat);

    // Architectural Mashrabiya / Perforated Screen Panels on side walls
    for (let i = -1; i <= 1; i += 2) {
      this.addBox(group, 0.1, h * 0.65, hallL * 0.5, i * (hallW * 0.5 + 0.05), 0.5 + h * 0.5, 0, woodMat);
    }

    // Grand Entrance Portal
    this.addBox(group, 3.2, 3.6, 0.2, 0, 0.5 + 1.8, hallL * 0.5 + 0.05, frameMat);
    this.addBox(group, 2.6, 3.2, 0.1, 0, 0.5 + 1.6, hallL * 0.5 + 0.06, woodMat);

    // Soaring Modern Emerald & Brass Ribbed Dome
    const domeR = Math.min(w, l) * 0.35;
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x059669, // Emerald green
      roughness: 0.25,
      metalness: 0.55
    });
    const domeGeom = new THREE.SphereGeometry(domeR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    domeGeom.translate(0, 0.5 + h + 0.3, 0);
    const domeMesh = new THREE.Mesh(domeGeom, domeMat);
    domeMesh.castShadow = true;
    group.add(domeMesh);

    // Crescent Brass Finial
    this.addCylinder(group, 0.06, 0.06, 1.8, 0, 0.5 + h + 0.3 + domeR + 0.9, 0, this.getMaterial('plaster', '#fbbf24'));
  }

  // ==========================================================================
  // 10. SEKOLAH DASAR (Modern Tropical Campus)
  // Single-loaded open breezeway corridors, sun louvers, cheerful architectural accents
  // ==========================================================================
  private static buildModernSchool(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const totalH = flH * 2;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const accentMat = this.getMaterial('plaster', '#f59e0b'); // Warm sunshine accent
    const concreteMat = this.getMaterial('concrete_board');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    this.addBox(group, w + 0.6, 0.35, l + 0.6, 0, 0.175, 0, concreteMat);

    // Classroom Wings
    this.addBox(group, w * 0.7, totalH, l, -w * 0.15, 0.35 + totalH * 0.5, 0, plasterMat);

    // Open Breezeway Corridors with Safety Railings & Slender Pillars
    const colSpacing = 4.0;
    for (let z = -l * 0.45; z <= l * 0.45; z += colSpacing) {
      this.addCylinder(group, 0.12, 0.12, totalH, w * 0.42, 0.35 + totalH * 0.5, z, frameMat);
    }
    // Floor 2 open corridor slab
    this.addBox(group, w * 0.35, 0.2, l, w * 0.32, 0.35 + flH + 0.1, 0, concreteMat);
    this.addBox(group, 0.05, 1.1, l, w * 0.45, 0.35 + flH + 0.75, 0, frameMat);

    // Ribbon Classroom Windows with Angled Sun Louvers
    for (let f = 0; f < 2; f++) {
      const flY = 0.35 + f * flH;
      const numWin = Math.floor(l / 4.5);
      for (let i = 0; i < numWin; i++) {
        const winZ = -l * 0.4 + i * 4.5;
        this.createWindowAssembly(group, 2.4, 1.6, -w * 0.5 + 0.02, flY + 1.6, winZ, frameMat, glassMat, false, true);
        // Cheerful accent block between classroom windows
        this.addBox(group, 0.05, 2.2, 1.2, -w * 0.5 + 0.03, flY + 1.6, winZ + 2.2, accentMat);
      }
    }

    // Wide Overhanging Eaves Roof
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernGableRoof(group, rw, rl, 0.35 + totalH, 1.8, zincRoofMat);
  }

  // ==========================================================================
  // 11. PUSKESMAS (Modern Healthcare Center)
  // Emergency drop-off portico, clean hygienic white & sage massing, ribbon windows
  // ==========================================================================
  private static buildModernPuskesmas(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const totalH = flH * 2;

    const whiteMat = this.getMaterial('plaster', '#ffffff');
    const sageMat = this.getMaterial('plaster', '#d1fae5'); // Calm hygienic sage green
    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    this.addBox(group, w + 0.6, 0.3, l + 0.6, 0, 0.15, 0, concreteMat);

    // Main Medical Clinic Body
    this.addBox(group, w, totalH, l, 0, 0.3 + totalH * 0.5, 0, whiteMat);
    // Sage Green Accent Block
    this.addBox(group, w * 0.45, totalH * 0.95, 0.25, -w * 0.25, 0.3 + totalH * 0.475, l * 0.5 + 0.1, sageMat);

    // Covered Ambulance / Drop-Off Portico
    const porticoW = 5.0;
    const porticoL = 3.6;
    this.addBox(group, porticoW, 0.2, porticoL, w * 0.15, 0.3 + 3.4, l * 0.5 + porticoL * 0.5, frameMat);
    this.addCylinder(group, 0.12, 0.12, 3.4, w * 0.15 + porticoW * 0.45, 0.3 + 1.7, l * 0.5 + porticoL - 0.2, frameMat);
    this.addCylinder(group, 0.12, 0.12, 3.4, w * 0.15 - porticoW * 0.45, 0.3 + 1.7, l * 0.5 + porticoL - 0.2, frameMat);

    // Clinic Entrance Glass Lobby
    this.createWindowAssembly(group, 3.4, 2.6, w * 0.15, 0.3 + 1.3, l * 0.5 + 0.02, frameMat, glassMat, true);

    // Floor 2 Ribbon Windows
    this.createWindowAssembly(group, w * 0.75, 1.4, 0, 0.3 + flH + 1.6, l * 0.5 + 0.02, frameMat, glassMat, false);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, 0.3 + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // 12. BALAI WARGA (Modern Open Pavilion / Pendopo)
  // Lofty open-air design, timber structural trusses, stone plinth
  // ==========================================================================
  private static buildModernCommunityHall(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('zinc_roof');

    // Raised Stone Plinth with perimeter steps
    this.addBox(group, w + 1.4, 0.4, l + 1.4, 0, 0.2, 0, plinthMat);

    // Open Perimeter Columns
    const spacingW = w * 0.45;
    const spacingL = l * 0.45;
    const colCoords = [
      [-spacingW, -spacingL], [0, -spacingL], [spacingW, -spacingL],
      [-spacingW, spacingL], [0, spacingL], [spacingW, spacingL],
      [-spacingW, 0], [spacingW, 0]
    ];
    for (const [cx, cz] of colCoords) {
      this.addCylinder(group, 0.16, 0.16, h, cx, 0.4 + h * 0.5, cz, teakMat);
    }

    // Exposed Wooden Structural Trusses under roof
    for (let z = -l * 0.35; z <= l * 0.35; z += 3.0) {
      this.addBox(group, w * 0.85, 0.18, 0.12, 0, 0.4 + h - 0.1, z, teakMat);
    }

    // Lofty Modern Tropical Hip Roof
    const rw = w + 2.2;
    const rl = l + 2.2;
    this.buildModernHipRoof(group, rw, rl, 0.4 + h, 2.2, roofMat);
  }

  // ==========================================================================
  // 13. GENERIC FALLBACK (High-End Modern Articulated Building)
  // ==========================================================================
  private static buildGenericModernBuilding(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const totalH = flH * bld.floorCount;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const concreteMat = this.getMaterial('concrete_board');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    this.addBox(group, w + 0.4, 0.3, l + 0.4, 0, 0.15, 0, plinthMat);
    this.addBox(group, w, totalH, l, 0, 0.3 + totalH * 0.5, 0, plasterMat);

    // Window grid per floor
    for (let f = 0; f < bld.floorCount; f++) {
      const flY = 0.3 + f * flH;
      this.createWindowAssembly(group, w * 0.7, flH * 0.6, 0, flY + flH * 0.5, l * 0.5 + 0.02, frameMat, glassMat, f === 0);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, 0.3 + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // REUSABLE ARCHITECTURAL DETAILING HELPERS
  // ==========================================================================

  /**
   * Complete Window Assembly with crisp slim frame, glass, and optional louvers
   */
  private static createWindowAssembly(
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
    const frameThickness = 0.06;
    const frameDepth = 0.08;

    // Outer Frame Top/Bottom
    this.addBox(group, w, frameThickness, frameDepth, posX, posY + h * 0.5 - frameThickness * 0.5, posZ, frameMat);
    this.addBox(group, w, frameThickness, frameDepth, posX, posY - h * 0.5 + frameThickness * 0.5, posZ, frameMat);
    // Outer Frame Left/Right
    this.addBox(group, frameThickness, h, frameDepth, posX - w * 0.5 + frameThickness * 0.5, posY, posZ, frameMat);
    this.addBox(group, frameThickness, h, frameDepth, posX + w * 0.5 - frameThickness * 0.5, posY, posZ, frameMat);

    // Center Mullion for wide windows
    if (w > 1.8) {
      this.addBox(group, frameThickness, h, frameDepth, posX, posY, posZ, frameMat);
    }

    // Glass Pane
    this.addBox(group, w - frameThickness * 2, h - frameThickness * 2, 0.02, posX, posY, posZ, glassMat);

    // Architectural Sun Louvers (Brise-Soleil slats)
    if (hasLouvers) {
      const slatCount = 5;
      const slatSpacing = h / (slatCount + 1);
      for (let s = 1; s <= slatCount; s++) {
        const sy = posY - h * 0.5 + s * slatSpacing;
        this.addBox(group, w * 1.05, 0.04, 0.25, posX, sy, posZ + 0.12, frameMat);
      }
    }
  }

  /**
   * Integrated Concrete Planter Box with Lush Tropical Greenery
   */
  private static createPlanterBox(
    group: THREE.Group,
    w: number,
    h: number,
    depth: number,
    posX: number,
    posY: number,
    posZ: number
  ): void {
    const concreteMat = this.getMaterial('concrete_board', '#64748b');
    const foliageMat = this.getMaterial('foliage');

    // Concrete trough container
    this.addBox(group, w, h, depth, posX, posY, posZ, concreteMat);

    // Lush organic tropical foliage bush spilling over top
    const plantGeom = new THREE.DodecahedronGeometry(w * 0.22, 1);
    plantGeom.scale(w / (w * 0.44), 0.6, depth / (depth * 0.44));
    const plantMesh = new THREE.Mesh(plantGeom, foliageMat);
    plantMesh.position.set(posX, posY + h * 0.5 + 0.15, posZ);
    plantMesh.castShadow = true;
    group.add(plantMesh);
  }

  /**
   * Modern Clean Flat Roof with Deep Cantilevered Overhang & Fascia Band
   */
  private static buildModernFlatRoofWithOverhang(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    fasciaMat: THREE.Material,
    slabMat: THREE.Material
  ): void {
    // Main roof slab
    this.addBox(group, rw, 0.22, rl, 0, baseY + 0.11, 0, slabMat);

    // Dark crisp perimeter fascia drip edge
    const fasciaH = 0.4;
    // Front & Back
    this.addBox(group, rw + 0.05, fasciaH, 0.12, 0, baseY + 0.2, rl * 0.5, fasciaMat);
    this.addBox(group, rw + 0.05, fasciaH, 0.12, 0, baseY + 0.2, -rl * 0.5, fasciaMat);
    // Left & Right
    this.addBox(group, 0.12, fasciaH, rl + 0.05, rw * 0.5, baseY + 0.2, 0, fasciaMat);
    this.addBox(group, 0.12, fasciaH, rl + 0.05, -rw * 0.5, baseY + 0.2, 0, fasciaMat);
  }

  /**
   * Modern Crisp Gable Roof (Pelana) with Minimalist Rakes & Overhangs
   */
  private static buildModernGableRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    const halfW = rw * 0.5;
    const halfL = rl * 0.5;

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

    // UVs for texture tiling
    const uvs = new Float32Array([
      0, 0, 1, 0, 1, 1,   0, 0, 1, 1, 0, 1,
      0, 1, 1, 1, 1, 0,   0, 1, 1, 0, 0, 0,
      0, 0, 1, 0, 0.5, 1, 0, 0, 0.5, 1, 1, 0
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, roofMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  /**
   * Modern Tropical Hip Roof (Limasan) with Crisp Geometry
   */
  private static buildModernHipRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    const halfW = rw * 0.5;
    const halfL = rl * 0.5;
    const ridgeLen = Math.max(0.5, rl - rw * 0.75);
    const halfR = ridgeLen * 0.5;

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

    const uvs = new Float32Array([
      0, 0, 1, 0, 1, 1,   0, 0, 1, 1, 0, 1,
      0, 1, 1, 1, 1, 0,   0, 1, 1, 0, 0, 0,
      0, 0, 1, 0, 0.5, 1, 0, 0, 0.5, 1, 1, 0
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, roofMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Primitive helpers
  private static addBox(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private static addCylinder(
    group: THREE.Group,
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const geom = new THREE.CylinderGeometry(rt, rb, h, 16);
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
}

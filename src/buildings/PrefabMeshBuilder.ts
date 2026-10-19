import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BuildingInstance, RoofType } from './PrefabTypes';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { InteriorLayoutFactory } from './InteriorLayoutFactory';
import { InteriorMeshBuilder } from './InteriorMeshBuilder';
import { BuildingCatalogRegistry, BuildingCatalogItem } from './BuildingCatalogRegistry';
import { TectonicComponents } from './TectonicComponents';

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

    const item = BuildingCatalogRegistry.getBuilding(building.presetKey);

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
      case 'cafe_minimalis_kaca':
      case 'cafe_kopi_rasa':
      case 'tropical_cafe':
        this.buildTropicalCafeKopiRasa(rawGroup, building);
        break;
      case 'resto_mie_gacoan':
      case 'resto_mie_nusantara':
      case 'mie_nusantara':
        this.buildMieNusantaraRestaurant(rawGroup, building);
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
        this.buildByArchetype(rawGroup, building, item);
        break;
    }

    // Build real 3D interior architecture (walls with 15cm thickness, doors, floors, stairs)
    if (building.interiorLayouts) {
      const plinthH = 0.35;
      for (let fl = 0; fl < building.interiorLayouts.length; fl++) {
        const layout = building.interiorLayouts[fl];
        const floorBaseY = plinthH + fl * (building.floorHeight || 4.2);
        const interiorGroup = InteriorMeshBuilder.buildFloorInterior(
          layout,
          floorBaseY,
          building.floorHeight || 4.2
        );
        rawGroup.add(interiorGroup);
      }
    }

    // Add 100% procedural permanent interior furniture set per archetype
    const archetype = item?.archetype || 'standard';
    const furnitureSet = TectonicComponents.buildInteriorFurnitureSet(
      archetype,
      building.width,
      building.length,
      building.floorHeight || 4.2
    );
    rawGroup.add(furnitureSet);

    // Build solid foundation skirt / batu talud underneath building base (prevents floating on sloping ground)
    const foundationSkirt = this.buildFoundationSkirt(
      building.width,
      building.length,
      2.0,
      building.wallMaterial === 'brick' ? 'brick' : 'concrete'
    );
    rawGroup.add(foundationSkirt);

    // Merge meshes sharing the same material
    const templates = this.optimizeBuildingGroup(rawGroup);
    this.geometryCache.set(cacheKey, templates);

    for (const it of templates) {
      const mesh = new THREE.Mesh(it.geometry, it.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { isSharedGeometry: true };
      group.add(mesh);
    }

    return group;
  }

  /**
   * Builds an automatic foundation skirt (talud batu candi / beton) beneath the building.
   * Extends downwards from the building plinth into the terrain so that even on sloped ground,
   * the building remains firmly grounded without any floating gap.
   */
  public static buildFoundationSkirt(
    width: number,
    length: number,
    depth: number = 2.0,
    materialName: string = 'concrete'
  ): THREE.Mesh {
    const skirtGeo = new THREE.BoxGeometry(width + 0.12, depth, length + 0.12);
    const skirtMat = this.getMaterial(materialName);
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.name = 'FoundationSkirt';
    // Positioned directly below building plinth (penetrates ground)
    skirtMesh.position.set(0, -depth / 2 + 0.15, 0);
    skirtMesh.castShadow = true;
    skirtMesh.receiveShadow = true;
    return skirtMesh;
  }

  /**
   * Constructs a real hollow architectural perimeter shell (0.25m thickness)
   * with open walk-through portal so cameras (Drone View & Walk Mode) can enter
   * and intermediate floor slabs with stair/atrium void cutouts.
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
    const t = 0.25; // 0.25m real double-sided wall thickness
    const frameMat = this.getMaterial('frame');
    const slabMat = this.getMaterial('concrete_board');
    const warmLightMat = this.getMaterial('warm_light');

    // 1. Back wall (-Z)
    this.addBox(group, w, totalH, t, 0, baseY + totalH * 0.5, -l * 0.5 + t * 0.5, wallMat);

    // 2. Left wall (-X)
    const sideL = Math.max(0.1, l - t * 2);
    this.addBox(group, t, totalH, sideL, -w * 0.5 + t * 0.5, baseY + totalH * 0.5, 0, wallMat);

    // 3. Right wall (+X)
    this.addBox(group, t, totalH, sideL, w * 0.5 - t * 0.5, baseY + totalH * 0.5, 0, wallMat);

    // Architectural horizontal shadow grooves (tali air) along side walls
    for (let f = 1; f < floors; f++) {
      const grooveY = baseY + f * flH;
      this.addBox(group, 0.05, 0.08, sideL * 0.95, -w * 0.5 - 0.02, grooveY, 0, frameMat);
      this.addBox(group, 0.05, 0.08, sideL * 0.95, w * 0.5 + 0.02, grooveY, 0, frameMat);
    }

    // 4. Front wall (+Z)
    if (openPortalFront) {
      const pw = Math.min(w - 1.6, Math.max(2.8, portalW));
      const ph = Math.min(totalH - 0.4, Math.max(3.0, portalH));
      const sideWallW = (w - pw) * 0.5;

      // Left front wall
      if (sideWallW > 0.1) {
        this.addBox(group, sideWallW, totalH, t, -w * 0.5 + sideWallW * 0.5, baseY + totalH * 0.5, l * 0.5 - t * 0.5, wallMat);
      }
      // Right front wall
      if (sideWallW > 0.1) {
        this.addBox(group, sideWallW, totalH, t, w * 0.5 - sideWallW * 0.5, baseY + totalH * 0.5, l * 0.5 - t * 0.5, wallMat);
      }
      // Lintel over portal
      if (totalH > ph + 0.1) {
        const lintelH = totalH - ph;
        this.addBox(group, pw, lintelH, t, 0, baseY + ph + lintelH * 0.5, l * 0.5 - t * 0.5, wallMat);
      }

      // Open entrance portal: Swung open glass door leaves to the sides
      const leafW = pw * 0.35;
      const leafH = ph * 0.95;
      const leafThick = 0.04;
      // Left swung open door panel (facing inwards along jamb)
      this.addBox(group, leafThick, leafH, leafW, -pw * 0.5 + leafThick * 0.5, baseY + leafH * 0.5, l * 0.5 - leafW * 0.5, frameMat);
      // Right swung open door panel (facing inwards along jamb)
      this.addBox(group, leafThick, leafH, leafW, pw * 0.5 - leafThick * 0.5, baseY + leafH * 0.5, l * 0.5 - leafW * 0.5, frameMat);
      // Portal top header trim
      this.addBox(group, pw + 0.1, 0.08, t + 0.06, 0, baseY + ph - 0.04, l * 0.5 - t * 0.5, frameMat);
    } else {
      this.addBox(group, w, totalH, t, 0, baseY + totalH * 0.5, l * 0.5 - t * 0.5, wallMat);
    }

    // 5. Intermediate Floor Slabs with Stair/Atrium Void Cutout
    for (let f = 1; f < floors; f++) {
      const slabY = baseY + f * flH;
      const slabThick = 0.25;
      // Front half slab
      const halfL = (l - t * 2) * 0.35;
      this.addBox(group, w - t * 2, slabThick, halfL, 0, slabY + slabThick * 0.5, l * 0.5 - t - halfL * 0.5, slabMat);
      // Rear half slab
      this.addBox(group, w - t * 2, slabThick, halfL, 0, slabY + slabThick * 0.5, -l * 0.5 + t + halfL * 0.5, slabMat);
      // Side walkway connecting front and rear (leaving center void open for flight/stairs)
      const walkW = (w - t * 2) * 0.25;
      const voidL = (l - t * 2) - halfL * 2;
      this.addBox(group, walkW, slabThick, voidL, -w * 0.5 + t + walkW * 0.5, slabY + slabThick * 0.5, 0, slabMat);
      this.addBox(group, walkW, slabThick, voidL, w * 0.5 - t - walkW * 0.5, slabY + slabThick * 0.5, 0, slabMat);
    }

    // 6. Warm Ceiling Emissive Light Panels
    for (let f = 0; f < floors; f++) {
      const ceilY = baseY + (f + 1) * flH - 0.06;
      const lightW = Math.min(3.0, (w - t * 2) * 0.5);
      const lightL = Math.min(3.0, (l - t * 2) * 0.5);
      this.addBox(group, lightW, 0.04, lightL, 0, ceilY, 0, warmLightMat);
    }
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
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;

    // 1. Andesite Stone Base (0.4m plinth)
    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Hollow Walkable Shell with 2.8m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 2.8, 3.4, 1, h);

    // 3. Cantilevered Entrance Porch Canopy with Warm Teak Soffit & LED Strip
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.4, 2.2, 0.18);
    canopy.position.set(0.2, plinthH + 3.0, l * 0.5 + 1.1);
    group.add(canopy);

    // 4. Tropical Timber Louver Screen on Bedroom Facade
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.35, h * 0.75, 8, 20);
    louver.position.set(w * 0.28, plinthH + h * 0.12, l * 0.5 + 0.05);
    group.add(louver);

    // 5. Floor-to-Ceiling Panoramic Living Window
    this.createWindowAssembly(group, 2.6, 2.4, -w * 0.25, plinthH + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 6. Integrated Planter Box with Tropical Greenery
    this.createPlanterBox(group, 2.2, 0.55, 0.65, -w * 0.25, plinthH + 0.28, l * 0.5 + 0.5);

    // 7. Modern Sleek Standing Seam Roof with deep overhang
    const rw = w + 1.4;
    const rl = l + 1.4;
    const roofY = plinthH + h;
    this.buildModernGableRoof(group, rw, rl, roofY, 1.5, zincRoofMat);
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
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Walkable Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 3.2, 3.6, 1, h);

    // 2. Cantilevered Lanai Canopy with Warm Wood Soffit
    const lanaiCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.45, 2.4, 0.2);
    lanaiCanopy.position.set(w * 0.22, plinthH + h * 0.85, l * 0.5 + 1.2);
    group.add(lanaiCanopy);

    // 3. Timber Louver Screen for Privacy
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.35, h * 0.75, 10, 25);
    louver.position.set(-w * 0.25, plinthH + h * 0.12, l * 0.5 + 0.05);
    group.add(louver);

    // 4. Massive Sliding Glass Patio Doors
    this.createWindowAssembly(group, 3.8, 2.6, 0, plinthH + 1.35, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 5. Tropical Planter Garden Along Front Facade
    this.createPlanterBox(group, 3.2, 0.55, 0.7, 0, plinthH + 0.28, l * 0.5 + 0.65);

    // 6. Modern Tropical Hip Roof with wide overhanging eaves
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernHipRoof(group, rw, rl, plinthH + h, 1.8, zincRoofMat);
  }

  // ==========================================================================
  // 3. RUMAH TROPIS 2 LANTAI (Luxury Modern Tropical Villa)
  // Cantilevered 2nd floor box, glass railing balcony, vertical wood screen, planters
  // ==========================================================================
  private static buildModernVilla2Story(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const totalH = flH * 2;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const plinthMat = this.getMaterial('stone_plinth');
    const concreteMat = this.getMaterial('concrete_board');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Multi-Level Shell with 3.4m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.4, 3.6, 2, flH);

    // 2. Floor 1 Modern Cantilever Canopy with Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.45, 2.2, 0.18);
    canopy.position.set(-w * 0.22, plinthH + 3.2, l * 0.5 + 1.1);
    group.add(canopy);

    // 3. Floor 2 Modern Cantilevered Glass Balcony with Hanging Planter
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.48, 1.8);
    balcony.position.set(w * 0.22, plinthH + flH, l * 0.5 + 0.9);
    group.add(balcony);

    // 4. Floor 2 Sun-Shading Timber Louvers
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.42, flH * 0.85, 10, 25);
    louver.position.set(-w * 0.24, plinthH + flH + 0.1, l * 0.5 + 0.05);
    group.add(louver);

    // 5. Floor 1 & 2 Large Window Assemblies
    this.createWindowAssembly(group, 3.6, 2.5, w * 0.18, plinthH + 1.3, l * 0.5 + 0.02, frameMat, glassMat, true);
    this.createWindowAssembly(group, 3.2, 2.4, w * 0.22, plinthH + flH + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 6. Roof: Floating Flat Roof Slab with Overhang
    const roofY = plinthH + totalH;
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernFlatRoofWithOverhang(group, rw, rl, roofY, zincRoofMat, concreteMat);
  }


  // ==========================================================================
  // 4. JOGLO (Masterpiece Contemporary Neo-Vernacular Joglo Yogyakarta)
  // Stepped Andesite plinth, Soko Guru columns with authentic Umpak stone pedestals,
  // column base uplight glow, 4-step front stone stairs, 3D terracotta ridge caps,
  // carved lisplang fascia boards, and front yard monument "JOGLO YOGYAKARTA".
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

    // Polished Natural Stone Plinth (Multi-tier Stepped Elevation)
    this.addBox(group, w + 1.2, 0.2, l + 1.2, 0, 0.1, 0, plinthMat);
    this.addBox(group, w + 0.6, 0.2, l + 0.6, 0, 0.3, 0, plinthMat);
    const plinthH = 0.4;

    // Wide 4-Step Polished Stone Stairs leading from ground to front veranda
    const stairsW = Math.min(w * 0.45, 6.0);
    const stairs = TectonicComponents.buildStoneStairs(stairsW, 4, 0.10, 0.35);
    stairs.position.set(0, 0, l * 0.5 + 0.6 + 0.7);
    group.add(stairs);

    // Front Yard Monument in Black Candi Stone: "JOGLO YOGYAKARTA"
    const monument = TectonicComponents.buildJogloMonument();
    monument.position.set(-w * 0.38, 0, l * 0.5 + 4.5);
    monument.rotation.y = Math.PI * 0.08;
    group.add(monument);

    // Enclosed Inner Sanctum (Omah Jero / Dalem) in carved teak & glass
    const innerW = w * 0.65;
    const innerL = l * 0.65;
    this.addBox(group, innerW, h * 0.85, innerL, 0, plinthH + (h * 0.85) * 0.5, -l * 0.05, teakMat);

    // Front Sliding Pocket Glass Doors (Seamless modern tropical indoor-outdoor)
    this.createWindowAssembly(group, innerW * 0.7, 2.6, 0, plinthH + 1.35, -l * 0.05 + innerL * 0.5 + 0.02, frameMat, glassMat, true);

    // Soko Guru Central Master Columns with Authentic Stepped Umpak (Batu Candi Hitam) + Uplight Glow
    const sgOffsetW = w * 0.22;
    const sgOffsetL = l * 0.22;
    const sgCoords = [
      [-sgOffsetW, -sgOffsetL],
      [sgOffsetW, -sgOffsetL],
      [-sgOffsetW, sgOffsetL],
      [sgOffsetW, sgOffsetL]
    ];
    for (const [cx, cz] of sgCoords) {
      // Stepped Umpak Base Tier 1 (Lebar bawah)
      this.addBox(group, 0.68, 0.16, 0.68, cx, plinthH + 0.08, cz, plinthMat);
      // Stepped Umpak Base Tier 2 (Atas)
      this.addBox(group, 0.50, 0.14, 0.50, cx, plinthH + 0.23, cz, plinthMat);
      // Soko Guru Teak Pillar resting on Umpak
      this.addCylinder(group, 0.18, 0.18, h * 1.05, cx, plinthH + 0.30 + (h * 1.05) * 0.5, cz, teakMat);
      // Warm Uplight Glow at column base (2700K spot illumination)
      const uplight = TectonicComponents.buildColumnUplightGlow(0.26);
      uplight.position.set(cx, plinthH + 0.31, cz);
      group.add(uplight);
    }

    // Perimeter Colonnade (Soko Rowo) around the open Pendopo veranda + Uplight Glow
    const periCoords = [
      [-w * 0.45, -l * 0.45], [0, -l * 0.45], [w * 0.45, -l * 0.45],
      [-w * 0.45, l * 0.45], [0, l * 0.45], [w * 0.45, l * 0.45],
      [-w * 0.45, 0], [w * 0.45, 0]
    ];
    for (const [cx, cz] of periCoords) {
      this.addBox(group, 0.36, 0.12, 0.36, cx, plinthH + 0.06, cz, plinthMat);
      this.addCylinder(group, 0.12, 0.12, h * 0.8, cx, plinthH + 0.12 + (h * 0.8) * 0.5, cz, teakMat);
      const periUplight = TectonicComponents.buildColumnUplightGlow(0.18);
      periUplight.position.set(cx, plinthH + 0.13, cz);
      group.add(periUplight);
    }

    // True Tiered Joglo Roof: Broad lower Emper + Soaring center Brunjung
    const roofBaseY = plinthH + h * 0.8;
    const rw = w + 2.4;
    const rl = l + 2.4;

    // Dark Carved Lisplang Fascia Board Trim around lower eave
    const lisplangH = 0.22;
    const lisplangThick = 0.08;
    const carvedTeakMat = this.getMaterial('wood_slat', '#451a03');
    this.addBox(group, rw + 0.1, lisplangH, lisplangThick, 0, roofBaseY + lisplangH * 0.5, rl * 0.5, carvedTeakMat);
    this.addBox(group, rw + 0.1, lisplangH, lisplangThick, 0, roofBaseY + lisplangH * 0.5, -rl * 0.5, carvedTeakMat);
    this.addBox(group, lisplangThick, lisplangH, rl + 0.1, rw * 0.5, roofBaseY + lisplangH * 0.5, 0, carvedTeakMat);
    this.addBox(group, lisplangThick, lisplangH, rl + 0.1, -rw * 0.5, roofBaseY + lisplangH * 0.5, 0, carvedTeakMat);

    // Tier 1: Lower broad eave (Atap Emper, landai & lebar)
    const t1H = 1.1;
    const t1TopW = rw * 0.52;
    const t1TopL = rl * 0.52;
    const cone1 = new THREE.CylinderGeometry(t1TopW * 0.5, rw * 0.5, t1H, 4);
    cone1.rotateY(Math.PI * 0.25);
    cone1.translate(0, roofBaseY + t1H * 0.5, 0);
    const m1 = new THREE.Mesh(cone1, roofTileMat);
    m1.castShadow = true;
    group.add(m1);

    // Tier 2: Soaring Steep Brunjung Roof (curam & menjulang)
    const t2H = 3.2;
    const cone2 = new THREE.ConeGeometry(t1TopW * 0.55, t2H, 4);
    cone2.rotateY(Math.PI * 0.25);
    cone2.translate(0, roofBaseY + t1H + t2H * 0.5, 0);
    const m2 = new THREE.Mesh(cone2, roofTileMat);
    m2.castShadow = true;
    group.add(m2);

    // 3D Terracotta Ridge Caps (Bumbungan wuwungan bertingkat tegas)
    const ridgeCapMat = this.getMaterial('roof_tile', '#9a3412');
    const peakRidge = new THREE.Mesh(new THREE.BoxGeometry(t1TopW * 0.45, 0.28, 0.35), ridgeCapMat);
    peakRidge.position.set(0, roofBaseY + t1H + t2H + 0.1, 0);
    peakRidge.castShadow = true;
    group.add(peakRidge);

    // Golden Terracotta Ridge Crown Finial (Wuwungan mahkota)
    this.addBox(group, 0.45, 0.45, 1.4, 0, roofBaseY + t1H + t2H + 0.28, 0, this.getMaterial('plaster', '#d97706'));
  }

  // ==========================================================================
  // TROPICAL CAFE "KOPI & RASA" (Modern 1-Storey Cantilever Cafe)
  // Thin black steel fascia, dense vertical teak louvers, crystal clear glass
  // facade, illuminated 3D canopy sign "KOPI & RASA", barista coffee bar,
  // and warm 2700K pendant ceiling illumination.
  // ==========================================================================
  private static buildTropicalCafeKopiRasa(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.8;

    const blackSteelMat = this.getMaterial('dark_aluminum');
    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const floorWoodMat = this.getMaterial('wood', '#b45309');

    // Crystal Clear High-Transmission Glass (opacity 0.22, roughness 0.05, metalness 0.9)
    const ultraGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.9
    });

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);
    // Polished Teak Interior Flooring
    this.addBox(group, w - 0.2, 0.04, l - 0.2, 0, plinthH + 0.02, 0, floorWoodMat);

    // Rear Solid Wall with wood cladding
    this.addBox(group, w, h, 0.25, 0, plinthH + h * 0.5, -l * 0.5 + 0.125, teakMat);

    // Left & Right Side Walls wrapped in dense vertical teak timber louvers
    const sideLouverL = TectonicComponents.buildTimberLouverScreen(l - 0.6, h, 24, 0, true);
    sideLouverL.rotation.y = Math.PI * 0.5;
    sideLouverL.position.set(-w * 0.5 + 0.1, plinthH, 0);
    group.add(sideLouverL);

    const sideLouverR = TectonicComponents.buildTimberLouverScreen(l - 0.6, h, 24, 0, true);
    sideLouverR.rotation.y = -Math.PI * 0.5;
    sideLouverR.position.set(w * 0.5 - 0.1, plinthH, 0);
    group.add(sideLouverR);

    // Front Facade: High Crystal Clear Panoramic Glass
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, h - 0.2, 0.04), ultraGlassMat);
    frontGlass.position.set(0, plinthH + h * 0.5, l * 0.5 - 0.05);
    group.add(frontGlass);

    // Front Mullions (Minimal black steel structural frames)
    const frontMullions = TectonicComponents.buildMullionCurtainWall(w - 0.2, h, 4, 2, 0.12, blackSteelMat, ultraGlassMat);
    frontMullions.position.set(0, plinthH, l * 0.5);
    group.add(frontMullions);

    // Modern Cantilever Flat Roof with thin black steel fascia
    const roofOverhang = 2.0;
    const rw = w + 1.2;
    const rl = l + roofOverhang;
    const roofY = plinthH + h;
    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.18, rl), blackSteelMat);
    canopyMesh.position.set(0, roofY + 0.09, roofOverhang * 0.4);
    canopyMesh.castShadow = true;
    group.add(canopyMesh);

    // Cantilever Canopy Underside Teak Soffit
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(rw - 0.1, 0.03, rl - 0.1), teakMat);
    soffit.position.set(0, roofY - 0.015, roofOverhang * 0.4);
    group.add(soffit);

    // Illuminated 3D Signage on Front Canopy: "KOPI & RASA"
    const cafeSign = TectonicComponents.buildIlluminatedSign('KOPI & RASA', 'ARTISANAL TROPICAL ROASTERY', Math.min(rw * 0.5, 4.2), 0.75, 0.12);
    cafeSign.position.set(0, roofY + 0.42, l * 0.5 + roofOverhang * 0.85);
    group.add(cafeSign);

    // --- FULL INTERIOR VISIBLE FROM OUTSIDE ---
    // Central Barista Coffee Bar Counter
    const barW = Math.min(w * 0.45, 4.6);
    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(barW, 1.05, 1.4), this.getMaterial('wood_slat', '#451a03'));
    barCounter.position.set(0, plinthH + 0.525, 0);
    barCounter.castShadow = true;
    group.add(barCounter);

    // Espresso Machine & Coffee Grinder
    const espressoMat = this.getMaterial('metal', '#cbd5e1');
    const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.5), espressoMat);
    espresso.position.set(-barW * 0.25, plinthH + 1.3, 0);
    group.add(espresso);

    // Glass Pastry Case
    const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.55), ultraGlassMat);
    pastryCase.position.set(barW * 0.22, plinthH + 1.28, 0);
    group.add(pastryCase);

    // Bar Stools
    for (let s = -barW * 0.35; s <= barW * 0.35; s += 0.7) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.72, 12), blackSteelMat);
      stool.position.set(s, plinthH + 0.36, 1.1);
      group.add(stool);
    }

    // Cafe Tables and Chairs (Grid layout)
    const tablePositions = [
      [-w * 0.28, -l * 0.22],
      [-w * 0.28, l * 0.22],
      [w * 0.28, -l * 0.22],
      [w * 0.28, l * 0.22]
    ];
    for (const [tx, tz] of tablePositions) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 16), teakMat);
      table.position.set(tx, plinthH + 0.375, tz);
      table.castShadow = true;
      group.add(table);

      // 4 Chairs per table
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2;
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.42), blackSteelMat);
        chair.position.set(tx + Math.cos(ang) * 0.78, plinthH + 0.39, tz + Math.sin(ang) * 0.78);
        group.add(chair);
      }
    }

    // Warm 2700K Pendant Ceiling Lamps Grid
    const warmBulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    for (let px = -w * 0.3; px <= w * 0.3; px += w * 0.3) {
      for (let pz = -l * 0.3; pz <= l * 0.3; pz += l * 0.3) {
        // Pendant shade
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.22, 12), blackSteelMat);
        shade.position.set(px, roofY - 0.4, pz);
        group.add(shade);

        // Glowing bulb
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), warmBulbMat);
        bulb.position.set(px, roofY - 0.45, pz);
        group.add(bulb);
      }
    }
  }

  // ==========================================================================
  // INDUSTRIAL NOODLE RESTAURANT "MIE NUSANTARA" (Modern 2-Storey Industrial)
  // Exposed black steel I-beam frame, vertical louvers + 2-floor full glass,
  // external steel staircase to 2nd floor balcony with glass railing,
  // rooftop & edge planter boxes with cascading greenery, signage "MIE NUSANTARA"
  // + subtext "BOWLS • NOODLES • CULTURE", and fully illuminated dining halls.
  // ==========================================================================
  private static buildMieNusantaraRestaurant(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;
    const totalH = flH * 2;

    const darkIBeamMat = this.getMaterial('dark_aluminum');
    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const concreteMat = this.getMaterial('concrete', '#94a3b8');
    const floorWoodMat = this.getMaterial('wood', '#78350f');

    const ultraGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.85
    });

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);
    // Floor 1 slab
    this.addBox(group, w - 0.1, 0.05, l - 0.1, 0, plinthH + 0.025, 0, floorWoodMat);
    // Floor 2 structural slab
    this.addBox(group, w, 0.22, l, 0, plinthH + flH, 0, concreteMat);

    // 1. Structural Black Steel I-Beam Colonnade Frame (Floor 1 to Roof)
    const colSize = 0.28;
    const colsX = [-w * 0.5 + colSize * 0.5, 0, w * 0.5 - colSize * 0.5];
    const colsZ = [-l * 0.5 + colSize * 0.5, 0, l * 0.5 - colSize * 0.5];
    for (const cx of colsX) {
      for (const cz of colsZ) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(colSize, totalH, colSize), darkIBeamMat);
        col.position.set(cx, plinthH + totalH * 0.5, cz);
        col.castShadow = true;
        group.add(col);
      }
    }

    // 2. Horizontal Perimeter I-Beams (Floor 1 eave, Floor 2 balcony, Roof)
    const beamY1 = plinthH + flH;
    const beamY2 = plinthH + totalH;
    this.addBox(group, w + 0.2, 0.25, 0.25, 0, beamY1, l * 0.5, darkIBeamMat);
    this.addBox(group, w + 0.2, 0.25, 0.25, 0, beamY2, l * 0.5, darkIBeamMat);
    this.addBox(group, 0.25, 0.25, l + 0.2, -w * 0.5, beamY1, 0, darkIBeamMat);
    this.addBox(group, 0.25, 0.25, l + 0.2, w * 0.5, beamY1, 0, darkIBeamMat);

    // 3. Two-Storey Full-Height Panoramic Glass on Front
    const glassFl1 = TectonicComponents.buildMullionCurtainWall(w * 0.75, flH * 0.9, 5, 2, 0.12, darkIBeamMat, ultraGlassMat);
    glassFl1.position.set(-w * 0.1, plinthH, l * 0.5 + 0.02);
    group.add(glassFl1);

    const glassFl2 = TectonicComponents.buildMullionCurtainWall(w * 0.75, flH * 0.9, 5, 2, 0.12, darkIBeamMat, ultraGlassMat);
    glassFl2.position.set(-w * 0.1, plinthH + flH, l * 0.5 + 0.02);
    group.add(glassFl2);

    // 4. Vertical Teak Louver Sun-Shading Screen on Side Facades
    const louverSide = TectonicComponents.buildTimberLouverScreen(l * 0.8, totalH * 0.9, 20, 0, true);
    louverSide.rotation.y = Math.PI * 0.5;
    louverSide.position.set(-w * 0.5 + 0.05, plinthH, 0);
    group.add(louverSide);

    // 5. Floor 2 Balcony with Glass Railing & Black Handrail
    const balcW = w * 0.85;
    const balcD = 1.8;
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(balcW, balcD);
    balcony.position.set(-w * 0.06, plinthH + flH, l * 0.5 + balcD * 0.5);
    group.add(balcony);

    // 6. External Semi-Open Black Steel Staircase (Rising from Ground to Floor 2 Balcony)
    const stairH = flH;
    const stairRun = 4.8;
    const stairs = TectonicComponents.buildExternalSteelStaircase(stairH, 1.3, stairRun);
    stairs.position.set(w * 0.5 + 0.7, plinthH, l * 0.5 - stairRun * 0.5);
    group.add(stairs);

    // 7. Rooftop & Balcony Edge Planter Boxes with Lush Cascading Greenery
    const roofPlanterFront = TectonicComponents.buildRooftopPlanterBox(w * 0.85, 0.6, 0.55);
    roofPlanterFront.position.set(0, plinthH + totalH, l * 0.5);
    group.add(roofPlanterFront);

    const roofPlanterSide = TectonicComponents.buildRooftopPlanterBox(l * 0.7, 0.6, 0.55);
    roofPlanterSide.rotation.y = Math.PI * 0.5;
    roofPlanterSide.position.set(w * 0.5, plinthH + totalH, 0);
    group.add(roofPlanterSide);

    // 8. Architectural Signage on Upper Right Facade: "MIE NUSANTARA" + "BOWLS • NOODLES • CULTURE"
    const noodleSign = TectonicComponents.buildIlluminatedSign(
      'MIE NUSANTARA',
      'BOWLS • NOODLES • CULTURE',
      Math.min(w * 0.55, 4.4),
      1.1,
      0.14
    );
    noodleSign.position.set(w * 0.22, plinthH + totalH - 0.75, l * 0.5 + 0.12);
    group.add(noodleSign);

    // 9. Dining Halls Floor 1 and 2 filled with communal teak tables and warm lighting
    const diningMat = this.getMaterial('wood');
    const benchMat = this.getMaterial('dark_aluminum');

    // Communal Dining Tables on Floor 1
    for (let r = 0; r < 2; r++) {
      const tz = -l * 0.2 + r * 2.8;
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.75, 1.0), diningMat);
      tbl.position.set(-w * 0.1, plinthH + 0.375, tz);
      tbl.castShadow = true;
      group.add(tbl);

      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b1.position.set(-w * 0.1, plinthH + 0.225, tz - 0.75);
      group.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b2.position.set(-w * 0.1, plinthH + 0.225, tz + 0.75);
      group.add(b2);
    }

    // Communal Dining Tables on Floor 2
    for (let r = 0; r < 2; r++) {
      const tz = -l * 0.2 + r * 2.8;
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.75, 1.0), diningMat);
      tbl.position.set(-w * 0.1, plinthH + flH + 0.375, tz);
      tbl.castShadow = true;
      group.add(tbl);

      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b1.position.set(-w * 0.1, plinthH + flH + 0.225, tz - 0.75);
      group.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b2.position.set(-w * 0.1, plinthH + flH + 0.225, tz + 0.75);
      group.add(b2);
    }

    // Warm 2700K Ceiling Illumination Grids on both floors
    const warmBulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    for (let f = 0; f < 2; f++) {
      const ceilY = plinthH + (f + 1) * flH - 0.15;
      for (let px = -w * 0.3; px <= w * 0.2; px += w * 0.25) {
        for (let pz = -l * 0.3; pz <= l * 0.3; pz += l * 0.3) {
          const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.12), warmBulbMat);
          lightBar.position.set(px, ceilY, pz);
          group.add(lightBar);
        }
      }
    }

    // Modern Flat Roof with Parapet
    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + totalH, darkIBeamMat, concreteMat);
  }

  // ==========================================================================
  // 5. RUKO MODERN 3 LANTAI (Contemporary Urban Shophouse Malioboro Arcade)
  // Ground-floor pedestrian arcade setback (kaki lima), front support colonnade,
  // upper cantilevered volume with sun-shading louvers, and residential balcony
  // ==========================================================================
  private static buildModernShophouse(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const flCount = bld.floorCount || 3;
    const totalH = flH * flCount;
    const arcadeSetback = 2.4; // 2.4m covered walkway arcade (kaki lima)

    const plasterMat = this.getMaterial('plaster', '#f1f5f9');
    const concreteMat = this.getMaterial('concrete_board');
    const woodMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');

    // 1. Plinth & Ground Floor Arcade Slab
    const plinthH = 0.35;
    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);
    // Arcade walkway floor slab (Walkway paving under arcade)
    this.addBox(group, w, 0.05, arcadeSetback, 0, plinthH + 0.025, l * 0.5 - arcadeSetback * 0.5, concreteMat);

    // Pedestrian Sidewalk Apron (Connecting arcade seamlessly to street with tactile paving)
    const apronL = 4.0;
    const apronZ = l * 0.5 + apronL * 0.5;
    this.addBox(group, w + 0.4, 0.15, apronL, 0, 0.075, apronZ, concreteMat);
    // Tactile yellow guiding tile strip
    this.addBox(group, 0.45, 0.02, apronL, 0, 0.16, apronZ, this.getMaterial('plaster', '#f59e0b'));

    // 2. Hollow Walkable Shell for the 3-story Shophouse with 3.6m wide Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.6, 3.8, flCount, flH);

    // 3. Ground-Floor Arcade Colonnade (Kolom Penyangga Kaki Lima di Tepi Depan)
    const colZ = l * 0.5 - 0.25;
    const colW = 0.4;
    this.addBox(group, colW, flH, colW, -w * 0.42, plinthH + flH * 0.5, colZ, concreteMat);
    this.addBox(group, colW, flH, colW, w * 0.42, plinthH + flH * 0.5, colZ, concreteMat);
    if (w >= 8) {
      this.addBox(group, colW, flH, colW, 0, plinthH + flH * 0.5, colZ, concreteMat);
    }

    // 4. Commercial Mullion Glass Storefront at Ground Floor behind arcade
    const storefront = TectonicComponents.buildMullionCurtainWall(w * 0.85, flH * 0.8, 3, 2, 0.1);
    storefront.position.set(0, plinthH + flH * 0.1, l * 0.5 - arcadeSetback);
    group.add(storefront);

    // Commercial Signage Fascia Band above arcade entrance
    this.addBox(group, w + 0.2, 0.75, 0.3, 0, plinthH + flH - 0.2, l * 0.5 + 0.1, frameMat);

    // 5. Floor 2: Tropical Timber Louvers
    const louver2 = TectonicComponents.buildTimberLouverScreen(w * 0.8, flH * 0.7, 10, 25);
    louver2.position.set(0, plinthH + flH + flH * 0.15, l * 0.5 + 0.1);
    group.add(louver2);

    // 6. Floor 3: Glass Balcony with Planter Box
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.85, 1.4);
    balcony.position.set(0, plinthH + flH * 2, l * 0.5 + 0.7);
    group.add(balcony);

    // Floor 3 Overhead Sun-Shading Louver Pergola
    const pergolaY = plinthH + totalH - 0.15;
    for (let pz = -0.5; pz <= 0.2; pz += 0.3) {
      this.addBox(group, w * 0.8, 0.08, 0.12, 0, pergolaY, l * 0.5 + pz, woodMat);
    }

    // Modern Parapet Roof with Crisp Coping
    this.buildModernFlatRoofWithOverhang(group, w + 0.4, l + 0.4, plinthH + totalH, frameMat, concreteMat);

    // Rooftop AC Condenser unit and Solar PV frame
    const roofY = plinthH + totalH;
    this.addBox(group, 1.2, 0.8, 0.6, -w * 0.25, roofY + 0.4, -l * 0.2, frameMat);
    this.addBox(group, 2.4, 0.08, 1.6, w * 0.15, roofY + 0.45, -l * 0.15, this.getMaterial('plaster', '#0284c7'));
  }

  // ==========================================================================
  // 6. MINIMARKET LINGKUNGAN (Modern Architectural Retail Store)
  // Full-width glass curtain wall, dark composite fascia, illuminated canopy
  // ==========================================================================
  private static buildModernRetail(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.8;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial('plaster', '#e2e8f0');
    const frameMat = this.getMaterial('frame');
    const woodMat = this.getMaterial('wood_slat');
    const concreteMat = this.getMaterial('concrete_board');

    // Base Plinth
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, concreteMat);

    // Hollow Walkable Shell with 4.0m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 4.0, 4.0, 1, h);

    // Full Curtain Wall Glass Frontage
    const curtainWall = TectonicComponents.buildMullionCurtainWall(w * 0.88, h * 0.75, 4, 2, 0.1);
    curtainWall.position.set(0, plinthH + h * 0.12, l * 0.5 + 0.02);
    group.add(curtainWall);

    // Modern Architectural Fascia Band (Anthracite with warm teak accent stripe)
    this.addBox(group, w + 0.8, 1.1, 0.4, 0, plinthH + h + 0.2, l * 0.5 + 0.2, frameMat);
    this.addBox(group, w + 0.85, 0.22, 0.42, 0, plinthH + h - 0.25, l * 0.5 + 0.21, woodMat);

    // Cantilevered Glass Entry Canopy with Warm Wood Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(4.8, 2.5, 0.2);
    canopy.position.set(0, plinthH + 3.4, l * 0.5 + 1.25);
    group.add(canopy);

    // Modern Signage Totem in front
    const totem = TectonicComponents.buildModernSignageTotem('MINIMARKET', Math.min(2.0, w * 0.4), 4.5);
    totem.position.set(w * 0.42, 0, l * 0.5 + 3.2);
    group.add(totem);

    // Parapet flat roof
    this.buildModernFlatRoofWithOverhang(group, w + 0.4, l + 0.4, plinthH + h + 0.6, frameMat, concreteMat);
  }

  // ==========================================================================
  // 7. GEDUNG KANTOR MODERN (High-End Architectural Glass & Steel Tower)
  // Horizontal ribbon curtain walls, composite spandrels, rooftop terrace pergola
  // ==========================================================================
  private static buildModernOfficeTower(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.8;
    const flCount = bld.floorCount || 5;
    const totalH = flH * flCount;
    const plinthH = 0.4;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassRailMat = this.getMaterial('glass_balustrade');

    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, concreteMat);

    // Hollow Walkable Shell with 4.5m wide Double-Height Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, concreteMat, true, 4.5, 4.5, flCount, flH);

    // Core Solid Shaft (Elevator & service spine at rear)
    this.addBox(group, w * 0.35, totalH, l * 0.25, 0, plinthH + totalH * 0.5, -l * 0.32, concreteMat);

    // Full Mullion Curtain Wall ribbons per floor on front and back
    for (let f = 0; f < flCount; f++) {
      const flY = plinthH + f * flH;
      const winH = flH * 0.72;

      const frontWall = TectonicComponents.buildMullionCurtainWall(w * 0.88, winH, 4, 2, 0.08);
      frontWall.position.set(0, flY + flH * 0.15, l * 0.5 + 0.02);
      group.add(frontWall);

      const backWall = TectonicComponents.buildMullionCurtainWall(w * 0.88, winH, 4, 2, 0.08);
      backWall.position.set(0, flY + flH * 0.15, -l * 0.5 - 0.02);
      backWall.rotation.y = Math.PI;
      group.add(backWall);

      // Facade Fin accent
      const fin = TectonicComponents.buildFacadeFin(0.12, flH * 0.9, 0.6);
      fin.position.set(-w * 0.45, flY + flH * 0.5, l * 0.5 + 0.3);
      group.add(fin);
    }

    // Double-Height Grand Entrance Canopy with Warm Wood Soffit
    const canopyW = w * 0.6;
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(canopyW, 3.4, 0.25);
    canopy.position.set(0, plinthH + 4.2, l * 0.5 + 1.7);
    group.add(canopy);

    // Rooftop Executive Terrace with Metal Pergola & Planters
    const roofBaseY = plinthH + totalH;
    this.addBox(group, w, 0.35, l, 0, roofBaseY + 0.175, 0, concreteMat);
    // Perimeter glass parapet
    this.addBox(group, w, 1.1, 0.04, 0, roofBaseY + 0.9, l * 0.5 - 0.05, glassRailMat);
    this.addBox(group, w, 1.1, 0.04, 0, roofBaseY + 0.9, -l * 0.5 + 0.05, glassRailMat);

    // Architectural Pergola on roof
    for (let p = -w * 0.3; p <= w * 0.3; p += 1.4) {
      this.addBox(group, 0.12, 0.18, l * 0.55, p, roofBaseY + 2.6, 0, frameMat);
    }
  }

  // ==========================================================================
  // 8. APARTEMEN MENENGAH (Modern Urban Vertical Residence)
  // Articulated modular facade, individual recessed balconies, timber accents
  // ==========================================================================
  private static buildModernApartment(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const flCount = bld.floorCount || 4;
    const totalH = flH * flCount;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, concreteMat);

    // Hollow Walkable Shell with 4.0m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 4.0, 3.8, flCount, flH);

    // Balconies with Planters on every upper floor for multiple residential units
    const bays = 3;
    const baySpacing = w / bays;

    for (let f = 1; f < flCount; f++) {
      const flY = plinthH + f * flH;

      for (let b = 0; b < bays; b++) {
        const bayX = -w * 0.5 + baySpacing * (b + 0.5);
        const balcony = TectonicComponents.buildGlassBalconyWithPlanter(baySpacing * 0.8, 1.5);
        balcony.position.set(bayX, flY, l * 0.5 + 0.75);
        group.add(balcony);
      }
    }

    // Ground Floor Entrance Portico Canopy
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(4.5, 2.5, 0.2);
    canopy.position.set(0, plinthH + 3.4, l * 0.5 + 1.25);
    group.add(canopy);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // 9. MASJID TROPIS (Contemporary Tropical Mosque)
  // Perforated breeze-block screens, colonnade, ribbed emerald & brass dome
  // ==========================================================================
  private static buildModernMosque(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.5;
    const plinthH = 0.4;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const plinthMat = this.getMaterial('stone_plinth');

    this.addBox(group, w + 1.4, plinthH, l + 1.4, 0, plinthH * 0.5, 0, plinthMat);

    // Main Prayer Hall: Hollow Walkable Shell with 4.5m Grand Open Entrance Portal
    const hallW = w * 0.82;
    const hallL = l * 0.82;
    this.buildHollowPerimeterShell(group, hallW, h, hallL, plinthH, plasterMat, true, 4.5, 4.2, 1, h);

    // Perimeter Shade Colonnade (slender square columns with architrave)
    const colSpacing = 3.5;
    const halfW = w * 0.48;
    const halfL = l * 0.48;
    for (let x = -halfW; x <= halfW; x += colSpacing) {
      this.addCylinder(group, 0.16, 0.16, h, x, plinthH + h * 0.5, halfL, plasterMat);
      this.addCylinder(group, 0.16, 0.16, h, x, plinthH + h * 0.5, -halfL, plasterMat);
    }

    // Deep shade roof overhang above colonnade with warm wood soffit
    this.addBox(group, w + 0.8, 0.3, l + 0.8, 0, plinthH + h + 0.15, 0, plasterMat);

    // Perforated breeze-block / roster walls on sides for sacred daylight filtration
    const rosterLeft = TectonicComponents.buildPerforatedRosterWall(hallL * 0.6, h * 0.65);
    rosterLeft.rotation.y = Math.PI * 0.5;
    rosterLeft.position.set(-hallW * 0.5 - 0.05, plinthH + h * 0.18, 0);
    group.add(rosterLeft);

    const rosterRight = TectonicComponents.buildPerforatedRosterWall(hallL * 0.6, h * 0.65);
    rosterRight.rotation.y = -Math.PI * 0.5;
    rosterRight.position.set(hallW * 0.5 + 0.05, plinthH + h * 0.18, 0);
    group.add(rosterRight);

    // Grand Entrance Canopy
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(5.2, 2.8, 0.25);
    canopy.position.set(0, plinthH + 4.2, hallL * 0.5 + 1.4);
    group.add(canopy);

    // Soaring Modern Emerald & Brass Ribbed Dome
    const domeR = Math.min(w, l) * 0.35;
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x059669, // Emerald green
      roughness: 0.25,
      metalness: 0.55
    });
    const domeGeom = new THREE.SphereGeometry(domeR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    domeGeom.translate(0, plinthH + h + 0.3, 0);
    const domeMesh = new THREE.Mesh(domeGeom, domeMat);
    domeMesh.castShadow = true;
    group.add(domeMesh);

    // Crescent Brass Finial
    this.addCylinder(group, 0.06, 0.06, 1.8, 0, plinthH + h + 0.3 + domeR + 0.9, 0, this.getMaterial('plaster', '#fbbf24'));
  }

  // ==========================================================================
  // 10. SEKOLAH DASAR (Modern Tropical Campus)
  // Single-loaded open breezeway corridors, sun louvers, cheerful architectural accents
  // ==========================================================================
  private static buildModernSchool(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const totalH = flH * 2;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const concreteMat = this.getMaterial('concrete_board');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, concreteMat);

    // Classroom Wings: Hollow Walkable Shell with Open Portal
    this.buildHollowPerimeterShell(group, w * 0.75, totalH, l, plinthH, plasterMat, true, 3.6, 3.6, 2, flH);

    // Open Breezeway Corridors with Slender Pillars
    const colSpacing = 4.0;
    for (let z = -l * 0.45; z <= l * 0.45; z += colSpacing) {
      this.addCylinder(group, 0.14, 0.14, totalH, w * 0.42, plinthH + totalH * 0.5, z, frameMat);
    }
    // Floor 2 open corridor slab
    this.addBox(group, w * 0.35, 0.25, l, w * 0.32, plinthH + flH + 0.125, 0, concreteMat);
    this.addBox(group, 0.05, 1.1, l, w * 0.45, plinthH + flH + 0.75, 0, frameMat);

    // Sun Louvers on Classrooms
    const louverScreen = TectonicComponents.buildTimberLouverScreen(l * 0.7, flH * 0.6, 12, 30);
    louverScreen.rotation.y = Math.PI * 0.5;
    louverScreen.position.set(-w * 0.38, plinthH + flH + flH * 0.2, 0);
    group.add(louverScreen);

    // Wide Overhanging Eaves Roof
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernGableRoof(group, rw, rl, plinthH + totalH, 1.8, zincRoofMat);
  }

  // ==========================================================================
  // 11. PUSKESMAS (Modern Healthcare Center)
  // Emergency drop-off portico, clean hygienic white & sage massing, ribbon windows
  // ==========================================================================
  private static buildModernPuskesmas(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;
    const totalH = flH * 2;
    const plinthH = 0.35;

    const whiteMat = this.getMaterial('plaster', '#ffffff');
    const sageMat = this.getMaterial('plaster', '#d1fae5'); // Calm hygienic sage green
    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, concreteMat);

    // Main Medical Clinic: Hollow Walkable Shell with 4.0m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, whiteMat, true, 4.0, 4.0, 2, flH);

    // Sage Green Accent Block
    this.addBox(group, w * 0.45, totalH * 0.95, 0.25, -w * 0.25, plinthH + totalH * 0.475, l * 0.5 + 0.1, sageMat);

    // Covered Ambulance / Drop-Off Portico with Warm Wood Soffit & LED Lighting
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(5.5, 3.8, 0.25);
    canopy.position.set(w * 0.15, plinthH + 3.8, l * 0.5 + 1.9);
    group.add(canopy);

    // Column support for portico
    this.addCylinder(group, 0.14, 0.14, 3.8, w * 0.15 + 2.4, plinthH + 1.9, l * 0.5 + 3.6, frameMat);
    this.addCylinder(group, 0.14, 0.14, 3.8, w * 0.15 - 2.4, plinthH + 1.9, l * 0.5 + 3.6, frameMat);

    // Ribbon Curtain Wall
    const ribbonWall = TectonicComponents.buildMullionCurtainWall(w * 0.75, flH * 0.6, 4, 1, 0.08);
    ribbonWall.position.set(0, plinthH + flH + flH * 0.2, l * 0.5 + 0.02);
    group.add(ribbonWall);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, concreteMat);
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
    const flH = bld.floorHeight || 4.2;
    const flCount = bld.floorCount || 1;
    const totalH = flH * flCount;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const concreteMat = this.getMaterial('concrete_board');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);

    // Hollow Walkable Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.2, 3.8, flCount, flH);

    // Modern Entrance Canopy
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.8, 2.2, 0.18);
    canopy.position.set(0, plinthH + 3.2, l * 0.5 + 1.1);
    group.add(canopy);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, concreteMat);
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

  // ==========================================================================
  // PARAMETRIC ARCHETYPE DISPATCHER & COMPOSERS
  // ==========================================================================
  private static buildByArchetype(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const archetype = item?.archetype || 'standard';

    switch (archetype) {
      case 'gacoan_industrial_hall':
        this.buildGacoanIndustrialHall(group, bld, item);
        break;
      case 'burger_drivethru':
        this.buildBurgerDriveThru(group, bld, item);
        break;
      case 'cafe_glasshouse':
        this.buildCafeGlasshouse(group, bld, item);
        break;
      case 'cafe_rooftop':
        this.buildCafeRooftop(group, bld, item);
        break;
      case 'cafe_container':
        this.buildCafeContainer(group, bld, item);
        break;
      case 'cafe_courtyard':
        this.buildCafeCourtyard(group, bld, item);
        break;
      case 'mall_atrium':
        this.buildMallAtrium(group, bld, item);
        break;
      case 'mall_open_plaza':
        this.buildMallOpenPlaza(group, bld, item);
        break;
      case 'courtyard_block':
        this.buildCourtyardBlock(group, bld, item);
        break;
      case 'podium_tower':
        this.buildPodiumTower(group, bld, item);
        break;
      case 'arcade_shophouse':
        this.buildArcadeShophouse(group, bld, item);
        break;
      case 'pendopo_open':
        this.buildPendopoOpen(group, bld, item);
        break;
      case 'stilted_house':
        this.buildStiltedHouse(group, bld, item);
        break;
      case 'transit_canopy':
        this.buildTransitCanopy(group, bld, item);
        break;
      case 'standard':
      default:
        this.buildParametricStandardBuilding(group, bld, item);
        break;
    }
  }

  // 1. GACOAN INDUSTRIAL HALL (Double-Volume Exposed Steel Hall, Asymmetric Roof, Facade Fins)
  private static buildGacoanIndustrialHall(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.5;

    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('zinc_roof');
    const yellowMat = this.getMaterial('plaster', '#eab308');
    const redMat = this.getMaterial('plaster', '#ef4444');
    const darkWallMat = this.getMaterial('plaster', '#1e293b');
    const woodMat = this.getMaterial('wood');

    // 1. Raised Stone Plinth Base
    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Perimeter Structural Steel Columns (Double-height industrial frame)
    const colSize = 0.28;
    const colCountX = Math.max(4, Math.round(w / 4));
    const colCountZ = Math.max(4, Math.round(l / 4));
    const stepX = (w - colSize) / (colCountX - 1);
    const stepZ = (l - colSize) / (colCountZ - 1);

    for (let ix = 0; ix < colCountX; ix++) {
      const cx = -w * 0.5 + colSize * 0.5 + ix * stepX;
      this.addBox(group, colSize, h, colSize, cx, plinthH + h * 0.5, -l * 0.5 + colSize * 0.5, frameMat);
      this.addBox(group, colSize, h, colSize, cx, plinthH + h * 0.5, l * 0.5 - colSize * 0.5, frameMat);
    }
    for (let iz = 1; iz < colCountZ - 1; iz++) {
      const cz = -l * 0.5 + colSize * 0.5 + iz * stepZ;
      this.addBox(group, colSize, h, colSize, -w * 0.5 + colSize * 0.5, plinthH + h * 0.5, cz, frameMat);
      this.addBox(group, colSize, h, colSize, w * 0.5 - colSize * 0.5, plinthH + h * 0.5, cz, frameMat);
    }

    // 3. Lower 1.2m Masonry Half-Wall with wide open 4.5m portal in front
    const wallH = 1.2;
    const portalW = 4.5;
    const sideWallW = (w - portalW) * 0.5;
    this.addBox(group, sideWallW, wallH, 0.2, -w * 0.5 + sideWallW * 0.5, plinthH + wallH * 0.5, l * 0.5, darkWallMat);
    this.addBox(group, sideWallW, wallH, 0.2, w * 0.5 - sideWallW * 0.5, plinthH + wallH * 0.5, l * 0.5, darkWallMat);
    this.addBox(group, w, wallH, 0.2, 0, plinthH + wallH * 0.5, -l * 0.5, darkWallMat);
    this.addBox(group, 0.2, wallH, l, -w * 0.5, plinthH + wallH * 0.5, 0, darkWallMat);
    this.addBox(group, 0.2, wallH, l, w * 0.5, plinthH + wallH * 0.5, 0, darkWallMat);

    // 4. Bold Yellow & Red Accent Fascia Ribbon
    const fasciaY = plinthH + h - 0.4;
    this.addBox(group, w + 0.6, 0.45, 0.2, 0, fasciaY, l * 0.5 + 0.05, yellowMat);
    this.addBox(group, w + 0.6, 0.45, 0.2, 0, fasciaY, -l * 0.5 - 0.05, yellowMat);
    this.addBox(group, 0.2, 0.45, l + 0.6, -w * 0.5 - 0.05, fasciaY, 0, yellowMat);
    this.addBox(group, 0.2, 0.45, l + 0.6, w * 0.5 + 0.05, fasciaY, 0, yellowMat);
    this.addBox(group, w + 0.62, 0.16, 0.22, 0, fasciaY - 0.26, l * 0.5 + 0.06, redMat);

    // 5. Dynamic Architectural Facade Fins (Gold & Red angled fins)
    const fin1 = TectonicComponents.buildFacadeFin(h * 0.85, 1.0, 0.08, 15, '#eab308');
    fin1.position.set(-w * 0.46, plinthH + 0.2, l * 0.5 + 0.1);
    group.add(fin1);
    const fin2 = TectonicComponents.buildFacadeFin(h * 0.85, 1.0, 0.08, -15, '#ef4444');
    fin2.position.set(w * 0.46, plinthH + 0.2, l * 0.5 + 0.1);
    group.add(fin2);

    // 6. Monolithic Architectural Signage Totem
    const totem = TectonicComponents.buildModernSignageTotem('MIE GACOAN', 5.5, 2.0, '#eab308');
    totem.position.set(-w * 0.5 - 2.8, 0, l * 0.5 + 2.0);
    group.add(totem);

    // 7. Courier / Driver Pickup Canopy with Wood Soffit on Side
    const pickupCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.4, 4.5, 0.2);
    pickupCanopy.position.set(-w * 0.5 - 1.7, plinthH + 3.4, 0);
    group.add(pickupCanopy);

    // 8. Outdoor Umbrella Dining Area on Front Terrace
    const tableCount = Math.min(5, Math.max(3, Math.floor(w / 4)));
    const tableSpacing = (w - 2.0) / tableCount;
    for (let t = 0; t < tableCount; t++) {
      const tx = -w * 0.5 + 1.5 + t * tableSpacing;
      const tz = l * 0.5 + 2.2;
      this.addCylinder(group, 0.04, 0.04, 0.8, tx, plinthH + 0.4, tz, frameMat);
      this.addCylinder(group, 0.65, 0.65, 0.05, tx, plinthH + 0.8, tz, woodMat);
      this.addCylinder(group, 0.03, 0.03, 2.4, tx, plinthH + 1.2, tz, frameMat);
      const umbrellaColor = t % 2 === 0 ? yellowMat : redMat;
      this.addCylinder(group, 0.05, 1.35, 0.35, tx, plinthH + 2.3, tz, umbrellaColor);
    }

    // 9. Broad Asymmetric Shed Roof (Overhang 2.0m)
    const rw = w + 2.8;
    const rl = l + 2.8;
    this.buildShedRoof(group, rw, rl, plinthH + h, 2.0, roofMat);
  }

  // 2. BURGER DRIVE-THRU (Mid-Century Modern Diner, Sweeping Canopy, Glass Curtain Wall)
  private static buildBurgerDriveThru(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.0;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const asphaltMat = this.getMaterial('asphalt');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.25;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Drive-Thru Asphalt Lane looping along right side (+X) and rear (-Z)
    const laneW = 3.8;
    this.addBox(group, laneW, 0.03, l + 5.0, w * 0.5 + laneW * 0.55, 0.015, 0, asphaltMat);
    this.addBox(group, w + laneW * 1.5, 0.03, laneW, 0, 0.015, -l * 0.5 - laneW * 0.5, asphaltMat);

    // 2. Hollow Walkable Shell with 3.6m Open Walk-Through Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 3.6, 3.6, 1, h);

    // 3. Sweeping Cantilever Canopy with Warm Wood Soffit & LED Glow Strip
    const dinerCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.75, 3.2, 0.22);
    dinerCanopy.position.set(0, plinthH + h * 0.88, l * 0.5 + 1.6);
    group.add(dinerCanopy);

    // 4. Floor-to-Ceiling Panoramic Mullion Glass Curtain Wall
    const curtainWall = TectonicComponents.buildMullionCurtainWall(w * 0.55, h * 0.65, 4, 2);
    curtainWall.position.set(-w * 0.2, plinthH, l * 0.5 + 0.02);
    group.add(curtainWall);

    // 5. Drive-Thru Service Window (+X wall)
    const winY = plinthH + 1.3;
    this.createWindowAssembly(group, 2.0, 1.5, w * 0.5 + 0.02, winY, 0, frameMat, glassMat, false, false);

    // 6. Cantilevered Service Canopy over Drive-Thru Window
    const serviceCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.6, 2.2, 0.18);
    serviceCanopy.position.set(w * 0.5 + 1.1, plinthH + 3.0, 0);
    group.add(serviceCanopy);

    // 7. Architectural Drive-Thru Signage Totem
    const driveThruTotem = TectonicComponents.buildModernSignageTotem('BURGER DRIVE THRU', 4.5, 1.8, '#f97316');
    driveThruTotem.position.set(w * 0.5 + laneW + 0.6, 0, -l * 0.2);
    group.add(driveThruTotem);

    // 8. Tropical Planter Box
    this.createPlanterBox(group, w * 0.45, 0.55, 0.65, -w * 0.2, plinthH + 0.28, l * 0.5 + 0.6);

    // 9. Modern Parapet Roof
    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + h, frameMat, this.getMaterial('concrete_board'));
  }

  // 3. CAFE GLASSHOUSE (Black Mullion Curtain Walls, Timber Screens, Hollow Shell)
  private static buildCafeGlasshouse(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.2;

    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('metal');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Perimeter Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, frameMat, true, 3.2, 3.8, 1, h);

    // 2. 3D Mullion Curtain Walls on Front & Side Facades
    const frontCurtain = TectonicComponents.buildMullionCurtainWall(w * 0.55, h * 0.85, 4, 3);
    frontCurtain.position.set(-w * 0.2, plinthH, l * 0.5 + 0.05);
    group.add(frontCurtain);

    const sideCurtain = TectonicComponents.buildMullionCurtainWall(l * 0.7, h * 0.85, 5, 3);
    sideCurtain.rotation.y = Math.PI * 0.5;
    sideCurtain.position.set(w * 0.5 + 0.05, plinthH, 0);
    group.add(sideCurtain);

    // 3. Timber Louver Screens for Sun Shading
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.35, h * 0.75, 8, 20);
    louver.position.set(w * 0.28, plinthH + h * 0.1, l * 0.5 + 0.1);
    group.add(louver);

    // 4. Cantilevered Entry Canopy with Warm Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.4, 2.0, 0.18);
    canopy.position.set(0, plinthH + 3.6, l * 0.5 + 1.0);
    group.add(canopy);

    // 5. Tropical Planters
    this.createPlanterBox(group, w * 0.35, 0.55, 0.65, -w * 0.28, plinthH + 0.28, l * 0.5 + 0.5);
    this.createPlanterBox(group, w * 0.35, 0.55, 0.65, w * 0.28, plinthH + 0.28, l * 0.5 + 0.5);

    // 6. High-Pitched Modern Gable Roof
    const rw = w + 1.4;
    const rl = l + 1.4;
    this.buildModernGableRoof(group, rw, rl, plinthH + h, 2.0, roofMat);
  }

  // 4. CAFE ROOFTOP (Multi-Level Mezzanine, Pergola Terrace, Glass Balcony with Planters)
  private static buildCafeRooftop(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.0;
    const totalH = h * 2;

    const plasterMat = this.getMaterial('plaster', '#f1f5f9');
    const woodMat = this.getMaterial('wood_slat');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Multi-Level Shell with 3.4m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.4, 3.8, 2, h);

    // 2. Large Front Curtain Wall
    const curtain = TectonicComponents.buildMullionCurtainWall(w * 0.7, h * 0.75, 5, 2);
    curtain.position.set(0, plinthH, l * 0.5 + 0.02);
    group.add(curtain);

    // 3. Rooftop Glass Balcony with Hanging Planter
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.85, 2.0);
    balcony.position.set(0, plinthH + h, l * 0.5 + 1.0);
    group.add(balcony);

    // 4. Teak Timber Rooftop Pergola
    const pergW = w * 0.75;
    const pergL = l * 0.45;
    const pergH = 3.0;
    const pergY = plinthH + h;
    const pergZ = l * 0.2;
    this.addBox(group, 0.15, pergH, 0.15, -pergW * 0.5, pergY + pergH * 0.5, pergZ - pergL * 0.5, woodMat);
    this.addBox(group, 0.15, pergH, 0.15, pergW * 0.5, pergY + pergH * 0.5, pergZ - pergL * 0.5, woodMat);
    this.addBox(group, 0.15, pergH, 0.15, -pergW * 0.5, pergY + pergH * 0.5, pergZ + pergL * 0.5, woodMat);
    this.addBox(group, 0.15, pergH, 0.15, pergW * 0.5, pergY + pergH * 0.5, pergZ + pergL * 0.5, woodMat);
    for (let r = 0; r < 6; r++) {
      const rz = pergZ - pergL * 0.5 + (r / 5) * pergL;
      this.addBox(group, pergW + 0.5, 0.18, 0.08, 0, pergY + pergH + 0.09, rz, woodMat);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l * 0.55 + 0.8, plinthH + totalH, frameMat, this.getMaterial('concrete_board'));
  }

  // 5. CAFE CONTAINER (Articulated Industrial Steel Modules, Open Portals, Louvers)
  private static buildCafeContainer(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;

    const cyanMat = this.getMaterial('plaster', '#0284c7');
    const darkMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const padSize = 0.8;
    this.addBox(group, padSize, 0.35, padSize, -w * 0.35, 0.175, -l * 0.35, plinthMat);
    this.addBox(group, padSize, 0.35, padSize, w * 0.35, 0.175, -l * 0.35, plinthMat);
    this.addBox(group, padSize, 0.35, padSize, -w * 0.35, 0.175, l * 0.35, plinthMat);
    this.addBox(group, padSize, 0.35, padSize, w * 0.35, 0.175, l * 0.35, plinthMat);

    // Ground Container (Hollow shell with open portal)
    const cW = Math.max(3.2, w * 0.55);
    const cL = l * 0.85;
    this.buildHollowPerimeterShell(group, cW, flH, cL, 0.35, cyanMat, true, 2.8, 3.2, 1, flH);

    // Upper Container (Shifted left -X, cantilevered forward)
    const c2X = -w * 0.15;
    const c2Y = 0.35 + flH;
    const c2Z = l * 0.08;
    this.buildHollowPerimeterShell(group, cW, flH, cL, c2Y, darkMat, true, 2.8, 3.2, 1, flH);

    // Timber Louver Screen on Upper Container
    const louver = TectonicComponents.buildTimberLouverScreen(cW * 0.7, flH * 0.7, 8, 20);
    louver.position.set(c2X, c2Y + flH * 0.15, c2Z + cL * 0.5 + 0.05);
    group.add(louver);

    // Exterior Industrial Steel Stairway
    const stairX = -w * 0.45;
    const stairSteps = 12;
    for (let s = 0; s < stairSteps; s++) {
      const sy = 0.35 + (s / stairSteps) * flH;
      const sz = -cL * 0.4 + (s / stairSteps) * cL * 0.8;
      this.addBox(group, 0.9, 0.06, 0.32, stairX, sy, sz, darkMat);
    }
  }

  // 6. CAFE COURTYARD (Reflecting Pool, Breeze Blocks, Open Colonnade Verandah)
  private static buildCafeCourtyard(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.0;

    const woodMat = this.getMaterial('wood');
    const plinthMat = this.getMaterial('stone_plinth');
    const waterMat = this.getMaterial('water');
    const roofMat = this.getMaterial('clay_tile');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow L-Shaped Pavilion Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l * 0.5, plinthH, woodMat, true, 3.2, 3.6, 1, h);

    // 2. Perforated Roster Breeze-Block Screen along courtyard edge
    const roster = TectonicComponents.buildPerforatedRosterWall(w * 0.5, h * 0.8);
    roster.position.set(-w * 0.22, plinthH + 0.2, l * 0.1);
    group.add(roster);

    // 3. Central Reflecting Water Pond in Courtyard
    const pondW = w * 0.4;
    const pondL = l * 0.35;
    const pondZ = l * 0.25;
    this.addBox(group, pondW, 0.08, pondL, w * 0.2, plinthH + 0.04, pondZ, waterMat);
    this.addBox(group, pondW + 0.3, 0.12, pondL + 0.3, w * 0.2, plinthH + 0.06, pondZ, plinthMat);

    // 4. Modern Hip Roof with Overhang
    this.buildModernHipRoof(group, w + 1.8, l * 0.5 + 1.8, plinthH + h, 2.0, roofMat);
  }

  // 7. MALL ATRIUM (Multi-Level Central Void Atrium, Space-Frame Skylight Vault, Escalators, Grand 6m Portal)
  private static buildMallAtrium(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 5.8;
    const floors = Math.max(3, bld.floorCount || 4);
    const totalH = flH * floors;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.4;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Grand Hollow Multi-Floor Shell with 6.0m Wide Open Portal (4.5m High)
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, concreteMat, true, 6.0, 4.5, floors, flH);

    // 2. Grand Entrance Drop-Off Vehicular Canopy with Warm Wood Soffit
    const dropW = w * 0.45;
    const dropL = 5.5;
    const dropCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(dropW, dropL, 0.32);
    dropCanopy.position.set(0, plinthH + 4.8, l * 0.5 + dropL * 0.5);
    group.add(dropCanopy);

    // Drop-off portico structural columns
    this.addCylinder(group, 0.22, 0.22, 4.8, -dropW * 0.42, plinthH + 2.4, l * 0.5 + dropL * 0.85, frameMat);
    this.addCylinder(group, 0.22, 0.22, 4.8, dropW * 0.42, plinthH + 2.4, l * 0.5 + dropL * 0.85, frameMat);

    // 3. Multi-Storey 3D Mullion Glass Curtain Walls on Facade
    for (let f = 0; f < floors; f++) {
      const fy = plinthH + f * flH;
      const curtain = TectonicComponents.buildMullionCurtainWall(w * 0.8, flH * 0.75, 8, 3);
      curtain.position.set(0, fy, l * 0.5 + 0.05);
      group.add(curtain);
    }

    // 4. Central Multi-Level Void Atrium with Space-Frame Skylight Vault & Crossed Escalators
    const skyW = w * 0.42;
    const skyL = l * 0.42;
    const skylight = TectonicComponents.buildAtriumSkylightVault(skyW, skyL, 3.6);
    skylight.position.set(0, plinthH + totalH, 0);
    group.add(skylight);

    // Atrium skybridges & crossed escalators on intermediate floors
    for (let f = 1; f < floors; f++) {
      const by = plinthH + f * flH;
      // Skybridge crossing the atrium void
      this.addBox(group, skyW, 0.28, 2.6, 0, by + 0.14, 0, frameMat);
      this.addBox(group, skyW, 0.9, 0.04, 0, by + 0.72, 1.3, glassMat);
      this.addBox(group, skyW, 0.9, 0.04, 0, by + 0.72, -1.3, glassMat);

      // Escalator inclined trusses crossing the void
      const dir = f % 2 === 0 ? 1 : -1;
      const escGeom = new THREE.BoxGeometry(1.4, 0.25, skyL * 0.75);
      escGeom.rotateX(dir * 0.45);
      escGeom.translate(dir * 2.2, by - flH * 0.5, 0);
      const escMesh = new THREE.Mesh(escGeom, frameMat);
      group.add(escMesh);
    }

    // 5. Modern Flat Roof with Parapet & Coping
    this.buildModernFlatRoofWithOverhang(group, w + 1.2, l + 1.2, plinthH + totalH, frameMat, concreteMat);
  }

  // 8. MALL OPEN PLAZA (Split Retail Wings, Central Promenade, Double Skybridges, Green Planters)
  private static buildMallOpenPlaza(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 5.4;
    const floors = Math.max(2, bld.floorCount || 3);
    const totalH = flH * floors;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.35;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // Promenade width
    const promW = 6.0;
    const wingW = (w - promW) * 0.5;

    // West Wing (Hollow Shell with 3.6m open portal)
    this.buildHollowPerimeterShell(group, wingW, totalH, l, plinthH, concreteMat, true, 3.6, 4.0, floors, flH);
    // East Wing (Hollow Shell with 3.6m open portal)
    this.buildHollowPerimeterShell(group, wingW, totalH, l, plinthH, concreteMat, true, 3.6, 4.0, floors, flH);

    // Central Pedestrian Promenade Paving
    this.addBox(group, promW, 0.05, l, 0, plinthH + 0.025, 0, this.getMaterial('paving'));

    // Skybridges crossing the promenade
    for (let f = 1; f < floors; f++) {
      const bridgeY = plinthH + f * flH;
      this.addBox(group, promW + 0.4, 0.3, 3.6, 0, bridgeY + 0.15, 0, frameMat);
      this.addBox(group, promW + 0.4, 0.9, 0.04, 0, bridgeY + 0.75, 1.8, glassMat);
      this.addBox(group, promW + 0.4, 0.9, 0.04, 0, bridgeY + 0.75, -1.8, glassMat);
    }

    // Glass Balconies with Sky Planters on each floor
    for (let f = 1; f < floors; f++) {
      const balcY = plinthH + f * flH;
      const balc1 = TectonicComponents.buildGlassBalconyWithPlanter(wingW * 0.6, 1.8);
      balc1.position.set(-w * 0.5 + wingW * 0.5, balcY, l * 0.5 + 0.9);
      group.add(balc1);

      const balc2 = TectonicComponents.buildGlassBalconyWithPlanter(wingW * 0.6, 1.8);
      balc2.position.set(w * 0.5 - wingW * 0.5, balcY, l * 0.5 + 0.9);
      group.add(balc2);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + totalH, frameMat, concreteMat);
  }

  // 9. COURTYARD BLOCK (Residential/Kos Courtyard, Hollow Perimeter, Planter Balconies)
  private static buildCourtyardBlock(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const floors = Math.max(2, bld.floorCount || 3);
    const totalH = flH * floors;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('clay_tile');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // Hollow Perimeter Shell with 3.4m Open Portal into Inner Courtyard
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.4, 3.8, floors, flH);

    // Glass Balconies with Sky Planters on each floor
    for (let f = 1; f < floors; f++) {
      const fy = plinthH + f * flH;
      const balc = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.45, 1.8);
      balc.position.set(0, fy, l * 0.5 + 0.9);
      group.add(balc);
    }

    // Timber Louver Screen for courtyard privacy
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.4, totalH * 0.8, 12, 25);
    louver.position.set(-w * 0.25, plinthH + totalH * 0.1, l * 0.5 + 0.05);
    group.add(louver);

    this.buildModernHipRoof(group, w + 1.4, l + 1.4, plinthH + totalH, 2.2, roofMat);
  }

  // 10. PODIUM TOWER (Grand Canopy, Articulated Glass Tower, Hollow Podiums)
  private static buildPodiumTower(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.8;
    const floors = Math.max(3, bld.floorCount || 4);

    const concreteMat = this.getMaterial('concrete');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.4;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    const podiumFloors = Math.min(2, Math.max(1, Math.floor(floors / 2)));
    const podiumH = flH * podiumFloors;

    // Hollow Podium Base with Grand 4.5m Open Portal
    this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, concreteMat, true, 4.5, 4.2, podiumFloors, flH);

    // Grand Entrance Cantilever Canopy with Warm Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.55, 3.2, 0.25);
    canopy.position.set(0, plinthH + 4.0, l * 0.5 + 1.6);
    group.add(canopy);

    const towerFloors = floors - podiumFloors;
    if (towerFloors > 0) {
      const towerW = w * 0.75;
      const towerL = l * 0.75;
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      // Hollow Upper Tower Shell
      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, concreteMat, false, 3.0, 3.0, towerFloors, flH);

      // Ribbon Curtain Wall Panels on Tower Facades
      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const curtain = TectonicComponents.buildMullionCurtainWall(towerW * 0.8, flH * 0.7, 6, 2);
        curtain.position.set(0, tfY, towerL * 0.5 + 0.05);
        group.add(curtain);
      }

      this.buildModernFlatRoofWithOverhang(group, towerW + 0.8, towerL + 0.8, towerBaseY + towerH, frameMat, concreteMat);
    } else {
      this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + podiumH, frameMat, concreteMat);
    }
  }

  // 11. ARCADE SHOPHOUSE (Pedestrian Arcade Colonnade, Open Storefront, Upper Balconies)
  private static buildArcadeShophouse(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;
    const floors = Math.max(2, bld.floorCount || 2);
    const totalH = flH * floors;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // Hollow Multi-Floor Shell with 3.8m Open Storefront Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.8, 3.8, floors, flH);

    // Front Arcade Colonnade (Covered walkway columns)
    const colSize = 0.28;
    const colCount = Math.max(2, Math.round(w / 3.5));
    const stepX = (w - colSize) / (colCount - 1);
    for (let c = 0; c < colCount; c++) {
      const cx = -w * 0.5 + colSize * 0.5 + c * stepX;
      this.addBox(group, colSize, flH, colSize, cx, plinthH + flH * 0.5, l * 0.5 + 1.2, frameMat);
    }

    // Arcade Overhang Canopy with Warm Wood Soffit
    const arcadeCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(w, 1.8, 0.22);
    arcadeCanopy.position.set(0, plinthH + flH, l * 0.5 + 0.9);
    group.add(arcadeCanopy);

    // Upper Floor Balconies with Planters
    for (let f = 1; f < floors; f++) {
      const fy = plinthH + f * flH;
      const balc = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.7, 1.6);
      balc.position.set(0, fy, l * 0.5 + 0.8);
      group.add(balc);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, plasterMat);
  }

  // 12. PENDOPO OPEN (Saka Guru Pillars, Stepped Umpak Stones, Open Verandah)
  private static buildPendopoOpen(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.5;

    const woodMat = this.getMaterial('wood');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('clay_tile');

    const plinthH = 0.5;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // Central Soko Guru Master Pillars with Stepped Umpak Stones
    const sgW = w * 0.38;
    const sgL = l * 0.38;
    const sgColSize = 0.32;
    const umpakSize = 0.52;
    const umpakH = 0.35;

    const corners = [
      [-sgW * 0.5, -sgL * 0.5],
      [sgW * 0.5, -sgL * 0.5],
      [-sgW * 0.5, sgL * 0.5],
      [sgW * 0.5, sgL * 0.5]
    ];

    for (const [cx, cz] of corners) {
      this.addBox(group, umpakSize, umpakH, umpakSize, cx, plinthH + umpakH * 0.5, cz, plinthMat);
      this.addBox(group, sgColSize, h - umpakH, sgColSize, cx, plinthH + umpakH + (h - umpakH) * 0.5, cz, woodMat);
    }

    // Perimeter Colonnade
    const perimSize = 0.2;
    const colsX = Math.max(3, Math.round(w / 3.5));
    const colsZ = Math.max(3, Math.round(l / 3.5));
    const stepX = (w - perimSize) / (colsX - 1);
    const stepZ = (l - perimSize) / (colsZ - 1);

    for (let ix = 0; ix < colsX; ix++) {
      const px = -w * 0.5 + perimSize * 0.5 + ix * stepX;
      this.addBox(group, perimSize, h * 0.85, perimSize, px, plinthH + (h * 0.85) * 0.5, -l * 0.5 + perimSize * 0.5, woodMat);
      this.addBox(group, perimSize, h * 0.85, perimSize, px, plinthH + (h * 0.85) * 0.5, l * 0.5 - perimSize * 0.5, woodMat);
    }
    for (let iz = 1; iz < colsZ - 1; iz++) {
      const pz = -l * 0.5 + perimSize * 0.5 + iz * stepZ;
      this.addBox(group, perimSize, h * 0.85, perimSize, -w * 0.5 + perimSize * 0.5, plinthH + (h * 0.85) * 0.5, pz, woodMat);
      this.addBox(group, perimSize, h * 0.85, perimSize, w * 0.5 - perimSize * 0.5, plinthH + (h * 0.85) * 0.5, pz, woodMat);
    }

    const rw = w + 2.4;
    const rl = l + 2.4;
    this.buildModernHipRoof(group, rw, rl, plinthH + h * 0.85, 2.4, roofMat);
  }

  // 13. STILTED HOUSE (Tropical Timber Stilt House with Elevated Porch)
  private static buildStiltedHouse(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.2;

    const woodMat = this.getMaterial('wood');
    const darkWoodMat = this.getMaterial('wood_slat');
    const roofMat = this.getMaterial('clay_tile');
    const plinthMat = this.getMaterial('stone_plinth');

    const stiltH = 1.8;
    const stiltSize = 0.25;
    const colsX = Math.max(3, Math.round(w / 3));
    const colsZ = Math.max(3, Math.round(l / 3));
    const stepX = (w - stiltSize) / (colsX - 1);
    const stepZ = (l - stiltSize) / (colsZ - 1);

    for (let ix = 0; ix < colsX; ix++) {
      for (let iz = 0; iz < colsZ; iz++) {
        const sx = -w * 0.5 + stiltSize * 0.5 + ix * stepX;
        const sz = -l * 0.5 + stiltSize * 0.5 + iz * stepZ;
        this.addBox(group, 0.45, 0.25, 0.45, sx, 0.125, sz, plinthMat);
        this.addBox(group, stiltSize, stiltH - 0.25, stiltSize, sx, 0.25 + (stiltH - 0.25) * 0.5, sz, woodMat);
      }
    }

    const floorY = stiltH;
    this.addBox(group, w + 0.3, 0.25, l + 0.3, 0, floorY + 0.125, 0, woodMat);

    // Hollow shell on stilts with 2.8m open entrance portal
    this.buildHollowPerimeterShell(group, w, h, l, floorY + 0.25, darkWoodMat, true, 2.8, 3.2, 1, h);

    // Access stairs
    const stairSteps = 10;
    for (let s = 0; s < stairSteps; s++) {
      const sy = (s / stairSteps) * stiltH;
      const sz = l * 0.5 + 0.2 + (s / stairSteps) * 2.0;
      this.addBox(group, 1.2, 0.12, 0.35, w * 0.3, sy + 0.06, sz, woodMat);
    }

    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernGableRoof(group, rw, rl, floorY + 0.25 + h, 2.2, roofMat);
  }

  // 14. TRANSIT CANOPY (Glass Vaulted Sheltered Transit Platform)
  private static buildTransitCanopy(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.5;

    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const plinthMat = this.getMaterial('stone_plinth');
    const yellowMat = this.getMaterial('plaster', '#eab308');
    const woodMat = this.getMaterial('wood');

    const platH = 0.45;
    this.addBox(group, w, platH, l, 0, platH * 0.5, 0, plinthMat);
    this.addBox(group, 0.5, 0.03, l, w * 0.5 - 0.25, platH + 0.015, 0, yellowMat);

    const pylonCount = Math.max(2, Math.round(l / 4.5));
    const stepZ = (l - 2.5) / (pylonCount - 1);
    for (let p = 0; p < pylonCount; p++) {
      const pz = -l * 0.5 + 1.25 + p * stepZ;
      this.addBox(group, 0.25, h, 0.25, -w * 0.2, platH + h * 0.5, pz, frameMat);
      this.addBox(group, w * 0.95, 0.18, 0.25, 0, platH + h, pz, frameMat);
    }

    // Glass Roof Vault
    const rw = w + 1.2;
    const rl = l + 0.8;
    this.addBox(group, rw, 0.1, rl, 0, platH + h + 0.05, 0, glassMat);
    this.addBox(group, rw + 0.1, 0.14, 0.12, 0, platH + h + 0.05, rl * 0.5, frameMat);
    this.addBox(group, rw + 0.1, 0.14, 0.12, 0, platH + h + 0.05, -rl * 0.5, frameMat);

    // Platform benches & timetable display
    this.addBox(group, 0.6, 0.48, l * 0.4, -w * 0.2, platH + 0.24, 0, woodMat);
    this.addBox(group, 0.12, 2.0, 1.0, -w * 0.35, platH + 1.0, -l * 0.35, frameMat);
  }

  // 15. PARAMETRIC STANDARD BUILDING (Enterable Hollow Shell, Modern Cantilever Canopy, Balconies)
  private static buildParametricStandardBuilding(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const floors = Math.max(1, bld.floorCount || 1);
    const totalH = flH * floors;

    const plasterMat = this.getMaterial(bld.wallMaterial || item?.defaultWallMaterial || 'plaster', bld.wallColor || item?.defaultWallColor);
    const concreteMat = this.getMaterial('concrete_board');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const roofMat = this.getMaterial(bld.roofMaterial || item?.defaultRoofMaterial || 'metal');

    const plinthH = 0.35;
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Walkable Shell with 3.6m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.6, 3.6, floors, flH);

    // 2. Cantilevered Entrance Canopy with Warm Wood Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(Math.min(w * 0.6, 4.5), 2.2, 0.18);
    canopy.position.set(0, plinthH + 3.4, l * 0.5 + 1.1);
    group.add(canopy);

    // 3. Modern Window Assemblies on each floor
    for (let f = 0; f < floors; f++) {
      const fy = plinthH + f * flH + flH * 0.5;
      this.createWindowAssembly(group, w * 0.65, flH * 0.55, 0, fy, l * 0.5 + 0.02, frameMat, glassMat, f === 0);
    }

    // 4. Cantilevered Glass Balconies with Hanging Planters on upper floors
    for (let f = 1; f < floors; f++) {
      const fy = plinthH + f * flH;
      const balcony = TectonicComponents.buildGlassBalconyWithPlanter(Math.min(w * 0.5, 4.0), 1.6);
      balcony.position.set(0, fy, l * 0.5 + 0.8);
      group.add(balcony);
    }

    const roofStyle = item?.roofStyle || 'flat_parapet';
    const overhang = bld.roofOverhang || item?.defaultOverhang || 1.2;
    const rw = w + overhang * 2;
    const rl = l + overhang * 2;
    const roofBaseY = plinthH + totalH;

    switch (roofStyle) {
      case 'sawtooth':
        this.buildSawtoothRoof(group, rw, rl, roofBaseY, 1.8, 3, roofMat, glassMat);
        break;
      case 'arched_vault':
        this.buildArchedVaultRoof(group, rw, rl, roofBaseY, 2.2, roofMat);
        break;
      case 'shed_industrial':
        this.buildShedRoof(group, rw, rl, roofBaseY, 1.6, roofMat);
        break;
      case 'butterfly':
        this.buildButterflyRoof(group, rw, rl, roofBaseY, 1.4, roofMat);
        break;
      case 'gable':
        this.buildModernGableRoof(group, rw, rl, roofBaseY, 1.8, roofMat);
        break;
      case 'hip':
      case 'joglo':
        this.buildModernHipRoof(group, rw, rl, roofBaseY, 2.0, roofMat);
        break;
      case 'flat_parapet':
      default:
        this.buildModernFlatRoofWithOverhang(group, rw, rl, roofBaseY, frameMat, concreteMat);
        break;
    }
  }

  // Roof Builders
  private static buildShedRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    const slopeLen = Math.hypot(rl, roofH);
    const angle = Math.atan2(roofH, rl);
    this.addBox(group, rw, 0.15, slopeLen, 0, baseY + roofH * 0.5 + 0.1, 0, roofMat, -angle);
  }

  private static buildSawtoothRoof(
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

  private static buildArchedVaultRoof(
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

  private static buildButterflyRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    const halfW = rw * 0.5;
    const slopeLen = Math.hypot(halfW, roofH);
    const angle = Math.atan2(roofH, halfW);

    this.addBox(group, slopeLen, 0.14, rl, -halfW * 0.5, baseY + roofH * 0.5, 0, roofMat, 0, 0, angle);
    this.addBox(group, slopeLen, 0.14, rl, halfW * 0.5, baseY + roofH * 0.5, 0, roofMat, 0, 0, -angle);
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
    mat: THREE.Material,
    rotX: number = 0,
    rotY: number = 0,
    rotZ: number = 0
  ): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);
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
